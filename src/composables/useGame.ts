import { computed, reactive } from 'vue'
import type { HostMood, Phase, Player, Popup, PopupTone, Prize, Question, Sector } from '../types'
import {
  countOccurrences,
  isComplete,
  normalizeLetter,
  normalizeWord,
  pickQuestions,
  remainingLetters,
  rollLuckBonus,
  scoreLetter,
  settleRound,
  shuffle,
  wordsMatch,
} from '../game/engine'
import { QUESTIONS } from '../game/questions'
import { CONSOLATION_PRIZE, PRIZES, SUPER_PRIZE } from '../game/prizes'
import { KEY_BONUS, SECTORS } from '../game/wheelSectors'
import { pickPhrase, type PhraseKey } from '../game/phrases'
import { BOT_PERSONAS, useBot } from './useBot'
import { playSound } from './useSound'
import { useStorage } from './useStorage'
import { emitFx } from '../three/effects'

export const ROUNDS = 3
const SUPER_BONUS = 3000

/** Мост к компоненту барабана: запускает вращение и возвращает индекс выпавшего сектора */
export const wheelBridge: { spin: ((forcedSector?: number) => Promise<number>) | null } = { spin: null }

/** Отладочные параметры (используются только из dev-хука) */
export const debug: { forceSector: number | null } = { forceSector: null }
/** Масштаб времени пауз и вращения (1 — обычная скорость) */
export const timing = { scale: 1 }

interface GameState {
  phase: Phase
  players: Player[]
  current: number
  roundIndex: number
  rounds: Question[]
  question: Question | null
  guessed: string[]
  sector: Sector | null
  prizeCandidate: Prize | null
  prizeOwner: number | null
  hintUsed: boolean
  hostMood: HostMood
  hostSay: string
  popup: Popup | null
  roundWinner: number | null
  roundEarned: number
  wonPrize: Prize | null
  lastBotLetter: string
  superQuestion: Question | null
  superGuessed: string[]
  superStep: 1 | 2
  superBusy: boolean
  superWon: boolean | null
  superRevealed: boolean
  chest: Prize[]
  finalScore: number
  isRecord: boolean
  winnerId: number | null
}

class Cancelled extends Error {}

function createGame() {
  const storage = useStorage()
  const rng = Math.random
  const bot = useBot(rng)

  const state = reactive<GameState>({
    phase: 'start',
    players: [],
    current: 0,
    roundIndex: 0,
    rounds: [],
    question: null,
    guessed: [],
    sector: null,
    prizeCandidate: null,
    prizeOwner: null,
    hintUsed: false,
    hostMood: 'idle',
    hostSay: pickPhrase('welcome'),
    popup: null,
    roundWinner: null,
    roundEarned: 0,
    wonPrize: null,
    lastBotLetter: '',
    superQuestion: null,
    superGuessed: [],
    superStep: 1,
    superBusy: false,
    superWon: null,
    superRevealed: false,
    chest: [],
    finalScore: 0,
    isRecord: false,
    winnerId: null,
  })

  /* ---------- служебное ---------- */

  let runId = 0
  let popupId = 0
  let popupTimer: ReturnType<typeof setTimeout> | undefined

  function sleep(ms: number): Promise<void> {
    const id = runId
    return new Promise((resolve, reject) => {
      setTimeout(() => (id === runId ? resolve() : reject(new Cancelled())), ms * timing.scale)
    })
  }

  async function alive<T>(p: Promise<T>): Promise<T> {
    const id = runId
    const v = await p
    if (id !== runId) throw new Cancelled()
    return v
  }

  function go(fn: () => Promise<void>): void {
    fn().catch((e: unknown) => {
      if (!(e instanceof Cancelled)) console.error(e)
    })
  }

  const cur = (): Player => state.players[state.current] as Player
  const human = (): Player => state.players[0] as Player
  const word = (): string => state.question?.answer ?? ''

  function say(key: PhraseKey, mood: HostMood): void {
    state.hostSay = pickPhrase(key)
    state.hostMood = mood
  }

  function popup(text: string, tone: PopupTone): void {
    clearTimeout(popupTimer)
    state.popup = { id: ++popupId, text, tone }
    popupTimer = setTimeout(() => {
      state.popup = null
    }, 1700 * timing.scale)
  }

  const revealWait = (count: number): number => count * 380 + 650

  /* ---------- старт игры ---------- */

  function startGame(name: string): void {
    runId++
    storage.saveName(name)
    const personas = BOT_PERSONAS
    state.players = [
      { id: 0, name: storage.name.value, avatar: 'you', isBot: false, skill: 1, persona: 'Это вы!', total: 0, roundScore: 0, prizes: [], keys: 0 },
      ...personas.map((p, i): Player => ({ id: i + 1, name: p.name, avatar: p.avatar, isBot: true, skill: p.skill, persona: p.persona, total: 0, roundScore: 0, prizes: [], keys: 0 })),
    ]
    state.rounds = pickQuestions(QUESTIONS, ROUNDS, rng)
    const used = state.rounds.map((q) => q.id)
    const superPool = QUESTIONS.filter((q) => {
      const n = normalizeWord(q.answer).length
      return n >= 6 && n <= 8 && !q.answer.includes(' ')
    })
    state.superQuestion = pickQuestions(superPool, 1, rng, used)[0] ?? null
    state.roundIndex = 0
    state.hintUsed = false
    state.superGuessed = []
    state.superStep = 1
    state.superBusy = false
    state.superWon = null
    state.superRevealed = false
    state.chest = []
    state.isRecord = false
    state.winnerId = null
    state.popup = null
    beginRoundIntro()
  }

  function restart(): void {
    startGame(storage.name.value)
  }

  function toStart(): void {
    runId++
    state.phase = 'start'
    state.popup = null
    say('welcome', 'happy')
  }

  function beginRoundIntro(): void {
    state.question = state.rounds[state.roundIndex] ?? null
    state.guessed = []
    state.sector = null
    state.prizeCandidate = null
    state.prizeOwner = null
    state.roundWinner = null
    state.wonPrize = null
    state.players.forEach((p) => (p.roundScore = 0))
    state.phase = 'roundIntro'
    say('roundStart', 'happy')
  }

  function startRound(): void {
    if (state.phase !== 'roundIntro') return
    state.current = state.roundIndex % state.players.length
    startTurn()
  }

  /* ---------- ход ---------- */

  function startTurn(): void {
    go(async () => {
      state.sector = null
      const p = cur()
      if (p.isBot) {
        state.phase = 'botThinking'
        say('botSpin', 'thinking')
        await sleep(1000)
        await spinWheel()
      } else {
        state.phase = 'awaitSpin'
        say('yourSpin', 'idle')
      }
    })
  }

  async function spinWheel(): Promise<void> {
    state.phase = 'spinning'
    const forced = debug.forceSector ?? undefined
    let idx: number
    if (wheelBridge.spin) {
      idx = await alive(wheelBridge.spin(forced))
    } else {
      await sleep(1500)
      idx = forced ?? Math.floor(rng() * SECTORS.length)
    }
    await afterSpin(idx)
  }

  /** Вращение запустил игрок (кнопка) */
  function humanSpin(): void {
    if (state.phase !== 'awaitSpin' || !wheelBridge.spin) return
    onUserSpin(wheelBridge.spin(debug.forceSector ?? undefined))
  }

  /** Вращение запустил игрок (кнопка или жест); p — промис с индексом сектора */
  function onUserSpin(p: Promise<number>): void {
    if (state.phase !== 'awaitSpin') return
    state.phase = 'spinning'
    go(async () => {
      const idx = await alive(p)
      await afterSpin(idx)
    })
  }

  async function afterSpin(idx: number): Promise<void> {
    const sector = SECTORS[idx] as Sector
    state.sector = sector
    const p = cur()
    await sleep(350)
    switch (sector.kind) {
      case 'bankrupt':
        p.roundScore = 0
        if (state.prizeOwner === p.id) clearPrize()
        state.hostMood = 'surprised'
        state.hostSay = pickPhrase('bankrupt')
        popup('Банкрот!', 'bad')
        emitFx('bankrupt')
        playSound('bankrupt')
        await sleep(1800)
        return passTurn()
      case 'zero':
        state.hostMood = 'sad'
        state.hostSay = pickPhrase('zero')
        popup('Ноль!', 'neutral')
        playSound('wrong')
        await sleep(1500)
        return passTurn()
      case 'key':
        p.roundScore += KEY_BONUS
        p.keys += 1
        say('key', 'happy')
        popup(`+${KEY_BONUS} и ключ`, 'good')
        playSound('coin')
        await sleep(1500)
        return promptAction()
      case 'luck': {
        const bonus = rollLuckBonus(rng)
        p.roundScore += bonus
        say('luck', 'happy')
        popup(`Удача! +${bonus}`, 'good')
        playSound('coin')
        await sleep(1500)
        return promptAction()
      }
      case 'plus':
        say('plus', 'surprised')
        popup('Плюс!', 'good')
        playSound('coin')
        if (p.isBot) {
          state.phase = 'botThinking'
          await sleep(1400)
          return applyLetter(bot.pickFreeLetter(word(), state.guessed))
        }
        state.phase = 'plusPick'
        return
      case 'prize':
        say('prize', 'surprised')
        popup('Приз!', 'good')
        playSound('coin')
        await sleep(1200)
        return promptAction()
      case 'double':
        say('double', 'surprised')
        popup('Удвоение ×2!', 'good')
        playSound('coin')
        await sleep(1200)
        return promptAction()
      default:
        state.hostMood = 'idle'
        return promptAction()
    }
  }

  async function promptAction(): Promise<void> {
    const p = cur()
    if (p.isBot) return botAct()
    state.phase = 'chooseLetter'
  }

  async function botAct(): Promise<void> {
    const p = cur()
    state.phase = 'botThinking'
    await sleep(1300)
    const action = bot.decide(word(), state.guessed, p.skill)
    if (action.kind === 'letter' && action.letter) {
      state.lastBotLetter = action.letter
      popup(`${p.name}: «${action.letter}»`, 'neutral')
      await sleep(900)
      return applyLetter(action.letter)
    }
    const text = action.kind === 'word' ? action.word : normalizeWord(word())
    popup(`${p.name}: слово «${text}»`, 'neutral')
    await sleep(1500)
    return applyWord(text)
  }

  async function applyLetter(raw: string): Promise<void> {
    const letter = normalizeLetter(raw)
    const p = cur()
    const sector = state.sector as Sector
    if (!letter || state.guessed.includes(letter)) return
    state.guessed.push(letter)
    const count = countOccurrences(word(), letter)
    if (count === 0) {
      state.phase = 'revealing'
      state.hostMood = 'sad'
      state.hostSay = pickPhrase('wrong')
      popup(`Буквы «${letter}» нет`, 'bad')
      playSound('wrong')
      await sleep(1500)
      return passTurn()
    }
    state.phase = 'revealing'
    say('correct', 'happy')
    playSound('correct')
    await sleep(revealWait(count))
    const pts = scoreLetter(sector, count)
    if (pts > 0) {
      p.roundScore += pts
      popup(`+${pts}`, 'good')
      playSound('coin')
      await sleep(900)
    }
    if (isComplete(word(), state.guessed)) return winRound(p)
    if (sector.kind === 'prize' && !state.prizeCandidate) return offerPrize(p)
    startTurn()
  }

  async function applyWord(text: string): Promise<void> {
    const p = cur()
    state.phase = 'revealing'
    if (wordsMatch(word(), text)) {
      const rest = remainingLetters(word(), state.guessed)
      state.guessed.push(...rest)
      say('correct', 'happy')
      playSound('correct')
      await sleep(revealWait(normalizeWord(word()).length))
      return winRound(p)
    }
    say('wordWrong', 'sad')
    popup('Неверное слово', 'bad')
    playSound('wrong')
    await sleep(1600)
    return passTurn()
  }

  function clearPrize(): void {
    state.prizeCandidate = null
    state.prizeOwner = null
  }

  async function offerPrize(p: Player): Promise<void> {
    const owned = new Set(p.prizes.map((x) => x.id))
    const options = PRIZES.filter((x) => !owned.has(x.id))
    state.prizeCandidate = shuffle(options.length ? options : PRIZES, rng)[0] ?? null
    state.prizeOwner = p.id
    say('prize', 'surprised')
    if (p.isBot) {
      state.phase = 'botThinking'
      await sleep(1400)
      if (rng() < 0.4) {
        takePrizeNow()
        return
      }
      popup(`${p.name} играет дальше`, 'neutral')
      await sleep(1100)
      return startTurn()
    }
    state.phase = 'prizeChoice'
  }

  function takePrizeNow(): void {
    const p = cur()
    const prize = state.prizeCandidate
    if (!prize) return
    p.prizes.push(prize)
    popup(`Приз: ${prize.title}`, 'good')
    playSound('fanfare')
    clearPrize()
    state.phase = 'passing'
    go(async () => {
      await sleep(1700)
      await passTurn()
    })
  }

  function takePrize(): void {
    if (state.phase !== 'prizeChoice') return
    takePrizeNow()
  }

  function continuePlaying(): void {
    if (state.phase !== 'prizeChoice') return
    popup('Играем дальше — приз за победу в туре!', 'neutral')
    startTurn()
  }

  async function passTurn(): Promise<void> {
    clearPrize()
    state.phase = 'passing'
    state.current = (state.current + 1) % state.players.length
    await sleep(500)
    startTurn()
  }

  /* ---------- действия игрока ---------- */

  function guessLetter(raw: string): void {
    if (state.phase !== 'chooseLetter') return
    const letter = normalizeLetter(raw)
    if (!letter || state.guessed.includes(letter)) return
    go(() => applyLetter(letter))
  }

  function pickPlusLetter(raw: string): void {
    if (state.phase !== 'plusPick') return
    const letter = normalizeLetter(raw)
    if (!letter || state.guessed.includes(letter) || countOccurrences(word(), letter) === 0) return
    go(() => applyLetter(letter))
  }

  function openWordInput(): void {
    if (state.phase === 'chooseLetter' && state.guessed.length > 0) state.phase = 'enterWord'
  }

  function closeWordInput(): void {
    if (state.phase === 'enterWord') state.phase = 'chooseLetter'
  }

  function guessWord(text: string): void {
    if (state.phase !== 'enterWord' && state.phase !== 'chooseLetter') return
    if (state.guessed.length === 0 || normalizeWord(text).length === 0) return
    go(() => applyWord(text))
  }

  const hintAvailable = computed(
    () =>
      state.phase === 'chooseLetter' &&
      !state.hintUsed &&
      remainingLetters(word(), state.guessed).length > 1,
  )

  function askHint(): void {
    if (!hintAvailable.value) return
    state.hintUsed = true
    const letter = shuffle(remainingLetters(word(), state.guessed), rng)[0]
    if (!letter) return
    go(async () => {
      state.guessed.push(letter)
      state.phase = 'revealing'
      say('hint', 'thinking')
      popup(`Друг подсказал: «${letter}»`, 'neutral')
      playSound('correct')
      await sleep(revealWait(countOccurrences(word(), letter)))
      state.phase = 'chooseLetter'
    })
  }

  /* ---------- конец тура ---------- */

  async function winRound(winner: Player): Promise<void> {
    state.phase = 'roundEnd'
    state.roundWinner = winner.id
    state.roundEarned = winner.roundScore
    const settled = settleRound(state.players, winner.id)
    settled.forEach((s, i) => {
      const p = state.players[i] as Player
      p.total = s.total
      p.roundScore = 0
    })
    if (state.prizeCandidate && state.prizeOwner === winner.id) {
      winner.prizes.push(state.prizeCandidate)
      state.wonPrize = state.prizeCandidate
    }
    clearPrize()
    state.hostMood = winner.isBot ? 'surprised' : 'happy'
    state.hostSay = pickPhrase('roundWin')
    playSound('fanfare')
    if (!winner.isBot) emitFx('fireworks')
    await sleep(4200)
    state.roundIndex++
    if (state.roundIndex < ROUNDS) return beginRoundIntro()
    afterMainRounds()
  }

  function afterMainRounds(): void {
    const leader = [...state.players].sort((a, b) => b.total - a.total || a.id - b.id)[0] as Player
    state.winnerId = leader.id
    if (!leader.isBot && state.superQuestion) {
      state.phase = 'superIntro'
      say('superIntro', 'happy')
      return
    }
    finish()
  }

  /* ---------- суперигра ---------- */

  function startSuper(): void {
    if (state.phase !== 'superIntro') return
    state.superGuessed = []
    state.superStep = 1
    state.phase = 'superPick'
  }

  function superConfirmLetters(letters: string[]): void {
    if (state.phase !== 'superPick' || state.superBusy || !state.superQuestion) return
    const fresh = [...new Set(letters.map(normalizeLetter))].filter((l) => l && !state.superGuessed.includes(l))
    if (fresh.length !== 3) return
    state.superGuessed.push(...fresh)
    state.superBusy = true
    const answer = state.superQuestion.answer
    const hits = fresh.reduce((n, l) => n + countOccurrences(answer, l), 0)
    state.hostMood = hits > 0 ? 'happy' : 'sad'
    state.hostSay = hits > 0 ? 'Есть открытия! Табло приоткрыло завесу.' : 'Ни одной буквы... Табло хранит секрет.'
    playSound(hits > 0 ? 'correct' : 'wrong')
    go(async () => {
      await sleep(revealWait(hits) + 400)
      state.superBusy = false
      if (state.superStep === 1) {
        state.superStep = 2
      } else {
        state.phase = 'superWord'
        state.hostMood = 'thinking'
        state.hostSay = 'Теперь одна попытка назвать слово целиком. Подумайте как следует!'
      }
    })
  }

  function superGuessWord(text: string): void {
    if (state.phase !== 'superWord' || !state.superQuestion || normalizeWord(text).length === 0) return
    const q = state.superQuestion
    const won = wordsMatch(q.answer, text)
    state.superWon = won
    state.superGuessed = [...new Set([...state.superGuessed, ...normalizeWord(q.answer).split('')])]
    state.superRevealed = true
    state.superBusy = true
    state.phase = 'superResult'
    if (won) {
      human().prizes.push(SUPER_PRIZE)
      emitFx('fireworks')
      say('superWin', 'happy')
      playSound('fanfare')
    } else {
      human().prizes.push(CONSOLATION_PRIZE)
      say('superLose', 'sad')
      playSound('wrong')
    }
    go(async () => {
      await sleep(revealWait(normalizeWord(q.answer).length))
      state.superBusy = false
    })
  }

  function finish(): void {
    const h = human()
    // шкатулки: по одному случайному призу на каждый выигранный ключ
    const chest: Prize[] = []
    const pool = shuffle(PRIZES, rng)
    for (let i = 0; i < h.keys; i++) chest.push(pool[i % pool.length] as Prize)
    state.chest = chest
    h.prizes.push(...chest)
    state.finalScore = h.total + (state.superWon ? SUPER_BONUS : 0)
    state.isRecord = storage.submitScore(state.finalScore)
    state.phase = 'gameOver'
    const w = state.players.find((p) => p.id === state.winnerId)
    if (w && !w.isBot) {
      say('finalHuman', 'happy')
      emitFx('fireworks')
    } else {
      say('finalBot', 'idle')
    }
  }

  return {
    state,
    storage,
    ROUNDS,
    SUPER_BONUS,
    hintAvailable,
    startGame,
    restart,
    toStart,
    startRound,
    humanSpin,
    onUserSpin,
    guessLetter,
    pickPlusLetter,
    openWordInput,
    closeWordInput,
    guessWord,
    takePrize,
    continuePlaying,
    askHint,
    startSuper,
    superConfirmLetters,
    superGuessWord,
    finish,
  }
}

const game = createGame()

export function useGame() {
  return game
}

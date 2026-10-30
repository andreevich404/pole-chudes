import type { Rng } from '../types'
import { LETTER_FREQ_ORDER, RU_ALPHABET, normalizeLetter, normalizeWord, openedMask } from './engine'

export type BotAction = { kind: 'letter'; letter: string } | { kind: 'word'; word: string }

interface BotContext {
  /** Загаданное слово — используется только для сравнения при попытке назвать слово целиком */
  word: string
  guessed: readonly string[]
  /** Умение бота 0..1 */
  skill: number
  rng: Rng
}

/** Бот видит только открытые буквы: порядок выбора — по частотности, с редкими промахами */
export function chooseBotLetter(guessed: readonly string[], skill: number, rng: Rng): string {
  const used = new Set(guessed.map(normalizeLetter))
  const free = RU_ALPHABET.filter((l) => !used.has(l))
  if (free.length === 0) return ''
  const sloppiness = 0.22 - skill * 0.16
  if (rng() < sloppiness) return free[Math.floor(rng() * free.length)] ?? ''
  const ordered = LETTER_FREQ_ORDER.filter((l) => !used.has(l))
  // чуть случайности среди трёх самых частых, чтобы боты не были предсказуемы
  const top = Math.min(ordered.length, 3)
  return ordered[Math.floor(rng() * top)] ?? free[0] ?? ''
}

/** Портит слово, подменяя одну букву: бот «ошибся» */
export function corruptWord(word: string, rng: Rng): string {
  const w = normalizeWord(word).split('')
  const i = Math.floor(rng() * w.length)
  const current = w[i]
  const alt = RU_ALPHABET.filter((l) => l !== current)
  w[i] = alt[Math.floor(rng() * alt.length)] ?? 'Ъ'
  return w.join('')
}

export function revealedRatio(word: string, guessed: readonly string[]): number {
  const mask = openedMask(word, guessed)
  return mask.length === 0 ? 0 : mask.filter(Boolean).length / mask.length
}

export function chooseBotAction({ word, guessed, skill, rng }: BotContext): BotAction {
  const ratio = revealedRatio(word, guessed)
  if (guessed.length >= 2 && ratio >= 0.6) {
    const wordChance = skill * (ratio - 0.35)
    if (rng() < wordChance) {
      const correct = rng() < 0.45 + 0.5 * ratio * skill + 0.05
      return { kind: 'word', word: correct ? normalizeWord(word) : corruptWord(word, rng) }
    }
  }
  const letter = chooseBotLetter(guessed, skill, rng)
  return { kind: 'letter', letter }
}

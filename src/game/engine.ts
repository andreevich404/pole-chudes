/**
 * Чистая игровая логика без зависимостей от Vue.
 * Углы барабана — в градусах, положительное направление — по часовой стрелке.
 * Сектор 0 при нулевом повороте находится сразу справа от указателя (указатель сверху).
 */
import type { Question, Rng, Sector, TabloLayout } from '../types'
import { LUCK_BONUSES } from './wheelSectors'

export const RU_ALPHABET: readonly string[] = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('')

/** Частотный порядок букв русского языка (от частых к редким) */
export const LETTER_FREQ_ORDER: readonly string[] = 'ОЕАИНТСРВЛКМДПУЯЫЬГЗБЧЙХЖШЮЦЩЭФЪ'.split('')

/* ---------- слова ---------- */

/** Верхний регистр, Ё→Е, только кириллица (пробелы и прочее убираются) */
export function normalizeWord(input: string): string {
  return input
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/[^А-Я]/g, '')
}

export function normalizeLetter(input: string): string {
  return normalizeWord(input).slice(0, 1)
}

export function wordsMatch(answer: string, guess: string): boolean {
  const g = normalizeWord(guess)
  return g.length > 0 && g === normalizeWord(answer)
}

export function countOccurrences(word: string, letter: string): number {
  const w = normalizeWord(word)
  const l = normalizeLetter(letter)
  if (!l) return 0
  let n = 0
  for (const ch of w) if (ch === l) n++
  return n
}

/** Маска открытых ячеек (по буквам слова без пробелов) */
export function openedMask(word: string, guessed: readonly string[]): boolean[] {
  const set = new Set(guessed.map(normalizeLetter))
  return normalizeWord(word)
    .split('')
    .map((ch) => set.has(ch))
}

export function isComplete(word: string, guessed: readonly string[]): boolean {
  const mask = openedMask(word, guessed)
  return mask.length > 0 && mask.every(Boolean)
}

/** Уникальные ещё не названные буквы слова (в порядке появления) */
export function remainingLetters(word: string, guessed: readonly string[]): string[] {
  const set = new Set(guessed.map(normalizeLetter))
  const out: string[] = []
  for (const ch of normalizeWord(word)) {
    if (!set.has(ch) && !out.includes(ch)) out.push(ch)
  }
  return out
}

/* ---------- барабан ---------- */

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** Индекс сектора под указателем при повороте барабана на angle градусов */
export function sectorIndexAtAngle(angle: number, count: number): number {
  const size = 360 / count
  const local = mod(-angle, 360)
  return Math.min(count - 1, Math.floor(local / size + 1e-9))
}

/** Угол в [0, 360), при котором точка сектора (доля fraction от его начала) под указателем */
export function angleForSector(index: number, count: number, fraction = 0.5): number {
  const size = 360 / count
  return mod(-(index + fraction) * size, 360)
}

/** Ближайший угол ≥ current + extraTurns·360, на котором под указателем нужный сектор */
export function targetAngleForSector(
  current: number,
  index: number,
  count: number,
  extraTurns: number,
  fraction = 0.5,
): number {
  const base = angleForSector(index, count, fraction)
  const min = current + extraTurns * 360
  const k = Math.ceil((min - base) / 360)
  return base + k * 360
}

/* ---------- очки ---------- */

export function scoreLetter(sector: Sector, occurrences: number): number {
  if (occurrences <= 0) return 0
  return sector.value * sector.multiplier * occurrences
}

export function rollLuckBonus(rng: Rng): number {
  return LUCK_BONUSES[Math.floor(rng() * LUCK_BONUSES.length)] ?? 100
}

interface Scorable {
  id: number
  total: number
  roundScore: number
}

/** Итоги тура: очки победителя переходят в общий счёт, у остальных сгорают */
export function settleRound<T extends Scorable>(players: readonly T[], winnerId: number): T[] {
  return players.map((p) => ({
    ...p,
    total: p.id === winnerId ? p.total + p.roundScore : p.total,
    roundScore: 0,
  }))
}

/* ---------- случайность ---------- */

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = arr[i] as T
    arr[i] = arr[j] as T
    arr[j] = tmp
  }
  return arr
}

/** Выбирает count разных вопросов, не входящих в excludeIds */
export function pickQuestions(
  pool: readonly Question[],
  count: number,
  rng: Rng,
  excludeIds: readonly number[] = [],
): Question[] {
  const banned = new Set(excludeIds)
  return shuffle(
    pool.filter((q) => !banned.has(q.id)),
    rng,
  ).slice(0, count)
}

/* ---------- табло ---------- */

/**
 * Раскладывает слово/фразу по строкам табло шириной cols.
 * Фразы переносятся по словам, слишком длинные слова — по символам.
 * Каждая строка центрируется, блок строк центрируется по вертикали в minRows строк.
 */
export function layoutWord(answer: string, cols: number, minRows: number): TabloLayout {
  const words = answer
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .split(/\s+/)
    .map((w) => w.replace(/[^А-Я]/g, ''))
    .filter(Boolean)

  const lines: number[][] = []
  let current: number[] = []
  let idx = 0
  const flush = (): void => {
    if (current.length) lines.push(current)
    current = []
  }

  for (const word of words) {
    const indices = Array.from({ length: word.length }, (_, i) => idx + i)
    idx += word.length
    if (word.length > cols) {
      flush()
      for (let i = 0; i < indices.length; i += cols) {
        current = indices.slice(i, i + cols)
        if (i + cols < indices.length) flush()
      }
      continue
    }
    const need = current.length === 0 ? word.length : current.length + 1 + word.length
    if (need > cols) flush()
    if (current.length > 0) current.push(-1)
    current.push(...indices)
  }
  flush()

  const rows: (number | null)[][] = lines.map((line) => {
    const left = Math.floor((cols - line.length) / 2)
    const cells: (number | null)[] = line.map((i) => (i < 0 ? null : i))
    return [...Array<null>(left).fill(null), ...cells, ...Array<null>(cols - left - line.length).fill(null)]
  })
  const empty = (): (number | null)[] => Array<null>(cols).fill(null)
  const missing = Math.max(0, minRows - rows.length)
  const top = Math.floor(missing / 2)
  const result = [
    ...Array.from({ length: top }, empty),
    ...rows,
    ...Array.from({ length: missing - top }, empty),
  ]
  return { cols, rows: result }
}

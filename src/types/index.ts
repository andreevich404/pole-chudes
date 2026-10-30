export type SectorKind =
  | 'points'
  | 'bankrupt'
  | 'zero'
  | 'plus'
  | 'prize'
  | 'key'
  | 'double'
  | 'luck'

export interface Sector {
  id: number
  kind: SectorKind
  /** Подпись на барабане */
  label: string
  /** Очки за каждое вхождение буквы */
  value: number
  /** Множитель очков за букву (удвоение) */
  multiplier: number
  color: string
  textColor: string
  /** Короткое пояснение для игрока */
  hint: string
}

export type AvatarKind = 'you' | 'robot' | 'granny'

export interface Prize {
  id: string
  title: string
  emoji: string
  description: string
}

export interface Player {
  id: number
  name: string
  avatar: AvatarKind
  isBot: boolean
  /** Вероятность «умного» хода бота, 0..1 */
  skill: number
  persona: string
  total: number
  roundScore: number
  prizes: Prize[]
  keys: number
}

export type Theme =
  | 'природа'
  | 'наука'
  | 'еда'
  | 'география'
  | 'кино'
  | 'айти'
  | 'культура'

export interface Question {
  id: number
  theme: Theme
  text: string
  /** Ответ в верхнем регистре, без Ё, пробелы допустимы для фраз */
  answer: string
}

export type HostMood = 'idle' | 'happy' | 'surprised' | 'sad' | 'thinking'

export type Phase =
  | 'start'
  | 'roundIntro'
  | 'awaitSpin'
  | 'spinning'
  | 'chooseLetter'
  | 'enterWord'
  | 'plusPick'
  | 'prizeChoice'
  | 'revealing'
  | 'botThinking'
  | 'passing'
  | 'roundEnd'
  | 'superIntro'
  | 'superPick'
  | 'superWord'
  | 'superResult'
  | 'gameOver'

export type PopupTone = 'good' | 'bad' | 'neutral'

export interface Popup {
  id: number
  text: string
  tone: PopupTone
}

export interface TabloLayout {
  cols: number
  /** Индексы символов слова (без пробелов) либо null для пустой ячейки */
  rows: (number | null)[][]
}

export type Rng = () => number

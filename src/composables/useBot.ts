import { chooseBotAction, type BotAction } from '../game/bot'
import { normalizeWord, remainingLetters, shuffle } from '../game/engine'
import type { AvatarKind, Rng } from '../types'

export interface BotPersona {
  name: string
  avatar: AvatarKind
  skill: number
  persona: string
}

export const BOT_PERSONAS: readonly BotPersona[] = [
  { name: 'Робот Вольт', avatar: 'robot', skill: 0.8, persona: 'Считает вероятности, но шуток не понимает' },
  { name: 'Бабушка Клава', avatar: 'granny', skill: 0.55, persona: 'Знает всё на свете и говорит, что думает' },
]

export function useBot(rng: Rng = Math.random) {
  function decide(word: string, guessed: readonly string[], skill: number): BotAction {
    return chooseBotAction({ word, guessed, skill, rng })
  }
  /** Для сектора «Плюс»: бот выбирает случайную закрытую букву табло */
  function pickFreeLetter(word: string, guessed: readonly string[]): string {
    return shuffle(remainingLetters(normalizeWord(word), guessed), rng)[0] ?? ''
  }
  return { decide, pickFreeLetter }
}

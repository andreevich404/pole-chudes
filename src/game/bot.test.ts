import { describe, expect, it } from 'vitest'
import { chooseBotAction, chooseBotLetter, corruptWord } from './bot'
import { mulberry32 } from './engine'

describe('бот', () => {
  it('не называет уже названные буквы', () => {
    const rng = mulberry32(3)
    const guessed: string[] = []
    for (let i = 0; i < 32; i++) {
      const l = chooseBotLetter(guessed, 0.7, rng)
      expect(l).not.toBe('')
      expect(guessed).not.toContain(l)
      guessed.push(l)
    }
    expect(chooseBotLetter(guessed, 0.7, rng)).toBe('')
  })

  it('сильный бот чаще начинает с частых букв', () => {
    const rng = mulberry32(5)
    const freq = new Set(['О', 'Е', 'А'])
    let hits = 0
    for (let i = 0; i < 200; i++) if (freq.has(chooseBotLetter([], 1, rng))) hits++
    expect(hits).toBeGreaterThan(150)
  })

  it('пока открыто мало букв, слово целиком не называет', () => {
    const rng = mulberry32(9)
    for (let i = 0; i < 50; i++) expect(chooseBotAction({ word: 'КОЛОБОК', guessed: ['К'], skill: 1, rng }).kind).toBe('letter')
  })

  it('при почти открытом слове иногда пытается назвать слово', () => {
    const rng = mulberry32(11)
    let words = 0
    for (let i = 0; i < 100; i++) if (chooseBotAction({ word: 'КОЛОБОК', guessed: ['К', 'О', 'Л', 'Б'].slice(0, 3), skill: 0.9, rng }).kind === 'word') words++
    expect(words).toBeGreaterThan(10)
  })

  it('corruptWord меняет слово', () => {
    expect(corruptWord('КОЛОБОК', mulberry32(2))).not.toBe('КОЛОБОК')
  })
})

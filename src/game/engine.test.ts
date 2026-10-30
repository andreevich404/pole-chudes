import { describe, expect, it } from 'vitest'
import {
  angleForSector,
  countOccurrences,
  isComplete,
  layoutWord,
  mulberry32,
  normalizeWord,
  openedMask,
  pickQuestions,
  remainingLetters,
  scoreLetter,
  sectorIndexAtAngle,
  settleRound,
  shuffle,
  targetAngleForSector,
  wordsMatch,
} from './engine'
import { SECTORS } from './wheelSectors'
import { QUESTIONS } from './questions'
import { PRIZES } from './prizes'

const N = SECTORS.length
const S = 360 / N

describe('барабан: сектор по углу', () => {
  it('при нулевом повороте под указателем сектор 0', () => {
    expect(sectorIndexAtAngle(0, N)).toBe(0)
    expect(sectorIndexAtAngle(S * 0.5, N)).toBe(N - 1)
  })

  it('поворот по часовой стрелке сдвигает сектора под указателем назад', () => {
    expect(sectorIndexAtAngle(S * 1.5, N)).toBe(N - 2)
    expect(sectorIndexAtAngle(S * 2.5, N)).toBe(N - 3)
  })

  it('учитывает полные обороты и отрицательные углы', () => {
    expect(sectorIndexAtAngle(360 * 7 + S * 1.5, N)).toBe(N - 2)
    expect(sectorIndexAtAngle(-S * 0.5, N)).toBe(0)
    expect(sectorIndexAtAngle(-360 * 3 - S * 3.5, N)).toBe(3)
  })

  it('angleForSector возвращает угол, при котором выбранный сектор под указателем', () => {
    for (let i = 0; i < N; i++) {
      expect(sectorIndexAtAngle(angleForSector(i, N), N)).toBe(i)
      expect(sectorIndexAtAngle(angleForSector(i, N, 0.1), N)).toBe(i)
      expect(sectorIndexAtAngle(angleForSector(i, N, 0.9), N)).toBe(i)
    }
  })

  it('targetAngleForSector даёт минимум нужное число оборотов вперёд', () => {
    const current = 123.4
    const target = targetAngleForSector(current, 5, N, 4)
    expect(sectorIndexAtAngle(target, N)).toBe(5)
    expect(target - current).toBeGreaterThanOrEqual(360 * 4)
    expect(target - current).toBeLessThan(360 * 5 + 1)
  })
})

describe('сектора барабана', () => {
  it('содержат все номиналы очков и особые сектора', () => {
    const values = SECTORS.filter((s) => s.kind === 'points').map((s) => s.value)
    for (const v of [100, 150, 200, 250, 300, 350, 400, 500, 600, 700, 800, 900, 1000]) {
      expect(values).toContain(v)
    }
    for (const kind of ['bankrupt', 'zero', 'plus', 'prize', 'key', 'double', 'luck'] as const) {
      expect(SECTORS.some((s) => s.kind === kind)).toBe(true)
    }
    expect(N).toBeGreaterThanOrEqual(20)
    expect(N).toBeLessThanOrEqual(22)
  })

  it('соседние сектора различаются по цвету', () => {
    for (let i = 0; i < N; i++) {
      expect(SECTORS[i]!.color).not.toBe(SECTORS[(i + 1) % N]!.color)
    }
  })
})

describe('нормализация Ё/Е', () => {
  it('приводит к верхнему регистру и заменяет Ё на Е', () => {
    expect(normalizeWord('ёжик')).toBe('ЕЖИК')
    expect(normalizeWord('Ёлка')).toBe('ЕЛКА')
    expect(normalizeWord('  чёрная дыра ')).toBe('ЧЕРНАЯДЫРА')
  })

  it('wordsMatch сравнивает без учёта регистра, Ё и пробелов', () => {
    expect(wordsMatch('ЁЖИК', 'ежик')).toBe(true)
    expect(wordsMatch('ЧЕРНАЯ ДЫРА', 'чёрная  дыра')).toBe(true)
    expect(wordsMatch('ЕЖИК', 'ЕЖ')).toBe(false)
    expect(wordsMatch('ЕЖИК', '')).toBe(false)
  })
})

describe('открытие букв', () => {
  const word = 'КОЛОБОК'
  it('считает вхождения', () => {
    expect(countOccurrences(word, 'О')).toBe(3)
    expect(countOccurrences(word, 'К')).toBe(2)
    expect(countOccurrences(word, 'Я')).toBe(0)
    expect(countOccurrences('ЁЖ', 'Е')).toBe(1)
  })

  it('строит маску открытых ячеек', () => {
    expect(openedMask(word, ['О'])).toEqual([false, true, false, true, false, true, false])
    expect(openedMask(word, [])).toEqual(Array(7).fill(false))
  })

  it('определяет полностью открытое слово и оставшиеся буквы', () => {
    expect(isComplete(word, ['К', 'О', 'Л', 'Б'])).toBe(true)
    expect(isComplete(word, ['К', 'О', 'Л'])).toBe(false)
    expect(remainingLetters(word, ['К'])).toEqual(['О', 'Л', 'Б'])
    expect(remainingLetters('ЧЕРНАЯ ДЫРА', [])).not.toContain(' ')
  })
})

describe('начисление очков', () => {
  const find = (kind: string) => SECTORS.find((s) => s.kind === kind)!
  it('очки сектора умножаются на число вхождений', () => {
    const s = SECTORS.find((x) => x.kind === 'points' && x.value === 300)!
    expect(scoreLetter(s, 3)).toBe(900)
    expect(scoreLetter(s, 0)).toBe(0)
  })

  it('удвоение удваивает очки за букву', () => {
    const d = find('double')
    expect(scoreLetter(d, 2)).toBe(d.value * 2 * 2)
  })

  it('плюс не даёт очков за букву', () => {
    expect(scoreLetter(find('plus'), 2)).toBe(0)
  })
})

describe('итоги тура и банкрот', () => {
  const players = [
    { id: 0, total: 100, roundScore: 700 },
    { id: 1, total: 400, roundScore: 900 },
    { id: 2, total: 0, roundScore: 0 },
  ]
  it('очки победителя переносятся в общий счёт, у остальных сгорают', () => {
    const res = settleRound(players, 0)
    expect(res.map((p) => p.total)).toEqual([800, 400, 0])
    expect(res.every((p) => p.roundScore === 0)).toBe(true)
  })

  it('не мутирует исходный массив', () => {
    settleRound(players, 1)
    expect(players[0]!.roundScore).toBe(700)
  })

  it('банкротство у игрока обнуляет только очки тура (общий счёт сохраняется)', () => {
    const bankrupt = SECTORS.find((s) => s.kind === 'bankrupt')!
    expect(bankrupt.value).toBe(0)
    const res = settleRound(players, 2)
    expect(res.map((p) => p.total)).toEqual([100, 400, 0])
  })
})

describe('выбор слов без повторов', () => {
  it('в базе 50+ вопросов с корректными ответами', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(50)
    for (const q of QUESTIONS) {
      const letters = normalizeWord(q.answer)
      expect(q.answer).toMatch(/^[А-Я ]+$/)
      expect(q.answer).not.toMatch(/Ё/)
      expect(letters.length, q.answer).toBeGreaterThanOrEqual(4)
      expect(letters.length, q.answer).toBeLessThanOrEqual(11)
      expect(q.text.length).toBeGreaterThan(10)
    }
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length)
    expect(new Set(QUESTIONS.map((q) => q.answer)).size).toBe(QUESTIONS.length)
  })

  it('есть слова длиной 6-8 для суперигры', () => {
    expect(QUESTIONS.filter((q) => { const n = normalizeWord(q.answer).length; return n >= 6 && n <= 8 && !q.answer.includes(' ') }).length).toBeGreaterThan(10)
  })

  it('pickQuestions не повторяет вопросы и учитывает исключения', () => {
    const rng = mulberry32(42)
    const picked = pickQuestions(QUESTIONS, 4, rng)
    expect(picked).toHaveLength(4)
    expect(new Set(picked.map((q) => q.id)).size).toBe(4)
    const more = pickQuestions(QUESTIONS, 10, rng, picked.map((q) => q.id))
    for (const q of more) expect(picked.map((p) => p.id)).not.toContain(q.id)
  })

  it('pickQuestions не падает, если вопросов меньше запрошенного', () => {
    expect(pickQuestions(QUESTIONS.slice(0, 2), 5, mulberry32(1))).toHaveLength(2)
  })

  it('перемешивание детерминировано при одинаковом seed и сохраняет элементы', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], mulberry32(7))
    const b = shuffle([1, 2, 3, 4, 5, 6], mulberry32(7))
    expect(a).toEqual(b)
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('призы уникальны', () => {
    expect(new Set(PRIZES.map((p) => p.id)).size).toBe(PRIZES.length)
    expect(PRIZES.length).toBeGreaterThanOrEqual(8)
  })
})

describe('раскладка слова по табло', () => {
  it('короткое слово помещается в одну строку и центрируется', () => {
    const l = layoutWord('КОТ', 8, 3)
    expect(l.rows).toHaveLength(3)
    const filled = l.rows.find((r) => r.some((c) => c !== null))!
    expect(filled.filter((c) => c !== null)).toEqual([0, 1, 2])
    expect(filled.indexOf(0)).toBe(2)
  })

  it('длинное слово переносится на несколько строк', () => {
    const l = layoutWord('ПРОГРАММИСТ', 8, 3)
    const used = l.rows.filter((r) => r.some((c) => c !== null))
    expect(used.length).toBe(2)
    expect(l.rows.flat().filter((c): c is number => c !== null)).toEqual(Array.from({ length: 11 }, (_, i) => i))
  })

  it('фразы переносятся по словам', () => {
    const l = layoutWord('ЧЕРНАЯ ДЫРА', 8, 3)
    const used = l.rows.filter((r) => r.some((c) => c !== null))
    expect(used).toHaveLength(2)
    expect(used[0]!.filter((c) => c !== null)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('все вопросы помещаются на табло 8x3 и 12x3', () => {
    for (const q of QUESTIONS) {
      for (const cols of [8, 12]) {
        const l = layoutWord(q.answer, cols, 3)
        expect(l.rows.length, q.answer).toBe(3)
        expect(l.rows.flat().filter((c) => c !== null)).toHaveLength(normalizeWord(q.answer).length)
      }
    }
  })
})

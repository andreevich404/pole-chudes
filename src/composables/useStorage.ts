import { ref } from 'vue'

const KEY = 'pole-tain:v1'

interface Profile {
  name: string
  best: number
}

const DEFAULT: Profile = { name: 'Игрок', best: 0 }

function read(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      const o = parsed as Record<string, unknown>
      return {
        name: typeof o.name === 'string' && o.name.trim() ? o.name.slice(0, 16) : DEFAULT.name,
        best: typeof o.best === 'number' && Number.isFinite(o.best) ? o.best : 0,
      }
    }
  } catch {
    /* localStorage недоступен или данные повреждены */
  }
  return { ...DEFAULT }
}

function write(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* приватный режим / переполнение — игнорируем */
  }
}

const initial = read()
const name = ref(initial.name)
const best = ref(initial.best)

export function useStorage() {
  function saveName(value: string): void {
    name.value = value.trim().slice(0, 16) || DEFAULT.name
    write({ name: name.value, best: best.value })
  }
  /** Возвращает true, если установлен новый рекорд */
  function submitScore(score: number): boolean {
    if (score > best.value) {
      best.value = score
      write({ name: name.value, best: best.value })
      return true
    }
    return false
  }
  return { name, best, saveName, submitScore }
}

/** Простая шина визуальных эффектов: игровая логика сообщает, слои отрисовки подписываются */
export type FxName = 'fireworks' | 'bankrupt'
type Listener = (name: FxName) => void

const listeners = new Set<Listener>()

export function onFx(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitFx(name: FxName): void {
  listeners.forEach((l) => l(name))
}

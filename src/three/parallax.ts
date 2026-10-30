/** Плавный параллакс от указателя мыши или гироскопа, значения в диапазоне -1..1 */
export interface Parallax {
  x: number
  y: number
  update: (dt: number) => void
  dispose: () => void
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

export function createParallax(enabled: boolean): Parallax {
  const p = { x: 0, y: 0 }
  const target = { x: 0, y: 0 }

  const onPointer = (e: PointerEvent): void => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1
    target.y = (e.clientY / window.innerHeight) * 2 - 1
  }
  const onOrient = (e: DeviceOrientationEvent): void => {
    if (e.gamma === null || e.beta === null) return
    target.x = clamp(e.gamma / 30, -1, 1)
    target.y = clamp((e.beta - 45) / 30, -1, 1)
  }

  if (enabled) {
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('deviceorientation', onOrient, { passive: true })
  }

  return {
    get x() {
      return p.x
    },
    get y() {
      return p.y
    },
    update(dt: number) {
      const k = 1 - Math.exp(-dt * 3)
      p.x += (target.x - p.x) * k
      p.y += (target.y - p.y) * k
    },
    dispose() {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('deviceorientation', onOrient)
    },
  }
}

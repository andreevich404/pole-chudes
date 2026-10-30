import { ref } from 'vue'

export type SoundName = 'tick' | 'correct' | 'wrong' | 'bankrupt' | 'fanfare' | 'flip' | 'coin'

const enabled = ref(false)
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.12,
  slideTo?: number,
): void {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g).connect(c.destination)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

export function playSound(name: SoundName): void {
  if (!enabled.value) return
  const c = getCtx()
  if (!c) return
  const t = c.currentTime
  switch (name) {
    case 'tick':
      tone(c, 1400, t, 0.03, 'square', 0.05)
      break
    case 'flip':
      tone(c, 520, t, 0.08, 'triangle', 0.08, 780)
      break
    case 'correct':
      tone(c, 660, t, 0.12, 'triangle')
      tone(c, 880, t + 0.1, 0.2, 'triangle')
      break
    case 'coin':
      tone(c, 988, t, 0.08, 'square', 0.06)
      tone(c, 1319, t + 0.08, 0.2, 'square', 0.06)
      break
    case 'wrong':
      tone(c, 220, t, 0.28, 'sawtooth', 0.09, 110)
      break
    case 'bankrupt':
      tone(c, 392, t, 0.18, 'sawtooth', 0.09)
      tone(c, 330, t + 0.18, 0.18, 'sawtooth', 0.09)
      tone(c, 262, t + 0.36, 0.18, 'sawtooth', 0.09)
      tone(c, 147, t + 0.54, 0.5, 'sawtooth', 0.1, 70)
      break
    case 'fanfare':
      ;[523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * 0.13, 0.25, 'square', 0.07))
      tone(c, 1047, t + 0.55, 0.6, 'triangle', 0.1)
      break
  }
}

export function useSound() {
  function toggle(): void {
    enabled.value = !enabled.value
    if (enabled.value) {
      getCtx()
      playSound('coin')
    }
  }
  return { enabled, toggle, play: playSound }
}

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

const props = defineProps<{ token: number }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const reduced = usePreferredReducedMotion()

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rot: number
  vr: number
  life: number
}

const COLORS = ['#fbbf24', '#f43f5e', '#38bdf8', '#4ade80', '#c084fc', '#fb923c', '#ffffff']
let raf = 0
let particles: Particle[] = []

function burst(): void {
  const el = canvas.value
  if (!el || reduced.value === 'reduce') return
  const w = (el.width = window.innerWidth)
  const h = (el.height = window.innerHeight)
  const ctx = el.getContext('2d')
  if (!ctx) return
  const spawn = (x: number, y: number, count: number, spread: number): void => {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * spread
      const v = 7 + Math.random() * 10
      particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        size: 6 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#fff',
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        life: 1,
      })
    }
  }
  spawn(w * 0.2, h * 0.85, 90, 1.2)
  spawn(w * 0.8, h * 0.85, 90, 1.2)
  spawn(w * 0.5, h * 0.6, 70, Math.PI * 1.6)
  cancelAnimationFrame(raf)
  const tick = (): void => {
    ctx.clearRect(0, 0, w, h)
    particles = particles.filter((p) => p.life > 0 && p.y < h + 40)
    for (const p of particles) {
      p.vy += 0.28
      p.vx *= 0.992
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      p.life -= 0.004
      ctx.save()
      ctx.globalAlpha = Math.min(1, p.life * 2)
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      ctx.restore()
    }
    if (particles.length > 0) raf = requestAnimationFrame(tick)
    else ctx.clearRect(0, 0, w, h)
  }
  raf = requestAnimationFrame(tick)
}

watch(() => props.token, (t) => t > 0 && burst())
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <canvas ref="canvas" class="pointer-events-none fixed inset-0 z-50 h-full w-full" aria-hidden="true" data-testid="confetti"></canvas>
</template>

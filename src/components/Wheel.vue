<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Motion, animate, useMotionValue } from 'motion-v'
import { usePreferredReducedMotion } from '@vueuse/core'
import { sectorIndexAtAngle, targetAngleForSector } from '../game/engine'
import { SECTORS } from '../game/wheelSectors'
import { playSound } from '../composables/useSound'
import { timing, wheelBridge } from '../composables/useGame'
import { onFx } from '../three/effects'
import { hasWebGL } from '../three/support'
import type { WheelScene } from '../three/wheelScene'
import WheelPointer from './WheelPointer.vue'

const props = defineProps<{ interactive: boolean }>()
const emit = defineEmits<{ userspin: [result: Promise<number>] }>()

const N = SECTORS.length
const SIZE = 360 / N
const C = 200
const R = 176

const angle = useMotionValue(0)
const pointerRot = useMotionValue(0)
const spinning = ref(false)
const highlighted = ref<number | null>(null)
const finalAngle = ref(0)
let discEl: HTMLElement | null = null
const canvas = ref<HTMLCanvasElement | null>(null)
/** true, когда 3D-сцена создана; иначе показывается SVG-барабан (запасной вариант) */
const use3d = ref(false)
const reduced = usePreferredReducedMotion()
let scene: WheelScene | null = null
let unmounted = false
let offFx: (() => void) | null = null
let lastIdx = sectorIndexAtAngle(0, N)

const stopTick = angle.on('change', (v: number) => {
  scene?.setAngle(v)
  const idx = sectorIndexAtAngle(v, N)
  if (idx === lastIdx) return
  lastIdx = idx
  playSound('tick')
  scene?.kick()
  animate(pointerRot, [-26, 0], { duration: 0.14, ease: 'easeOut' })
})

function polar(a: number, r: number): [number, number] {
  const rad = (a * Math.PI) / 180
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)]
}

const shapes = computed(() =>
  SECTORS.map((s, i) => {
    const [x0, y0] = polar(i * SIZE, R)
    const [x1, y1] = polar((i + 1) * SIZE, R)
    const mid = (i + 0.5) * SIZE
    const fontSize = s.label.length >= 5 ? 19 : s.label.length === 4 ? 27 : s.label.length === 3 ? 31 : 34
    return {
      s,
      path: `M${C} ${C} L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`,
      textTransform: `rotate(${(mid - 90).toFixed(2)} ${C} ${C})`,
      fontSize,
    }
  }),
)

const bulbs = Array.from({ length: 24 }, (_, i) => polar(i * 15, 188))

function runTo(target: number, durationSec: number): Promise<number> {
  spinning.value = true
  highlighted.value = null
  return new Promise((resolve) => {
    animate(angle, target, {
      duration: Math.max(0.05, durationSec * timing.scale),
      ease: [0.1, 0.62, 0.12, 1],
      onComplete: () => {
        spinning.value = false
        finalAngle.value = angle.get()
        const idx = sectorIndexAtAngle(angle.get(), N)
        highlighted.value = idx
        resolve(idx)
      },
    })
  })
}

function spin(forced?: number): Promise<number> {
  const current = angle.get()
  const turns = 5 + Math.floor(Math.random() * 3)
  const target =
    forced !== undefined
      ? targetAngleForSector(current, forced, N, turns, 0.2 + Math.random() * 0.6)
      : current + turns * 360 + Math.random() * 360
  return runTo(target, 4.6 + Math.random() * 1.4)
}

async function init3d(): Promise<void> {
  if (!hasWebGL() || !canvas.value) return
  try {
    // шрифт с кириллицей должен быть загружен до отрисовки подписей на текстуре
    await Promise.race([
      document.fonts.load("40px 'Russo One'", 'БАНКРОТ ПРИЗ'),
      new Promise((r) => setTimeout(r, 2000)),
    ])
    const { createWheelScene } = await import('../three/wheelScene')
    if (unmounted || !canvas.value) return
    scene = createWheelScene(canvas.value, { reduced: reduced.value === 'reduce' })
    if (scene) {
      scene.setAngle(angle.get())
      use3d.value = true
    }
  } catch {
    scene = null
    use3d.value = false
  }
}

onMounted(() => {
  wheelBridge.spin = spin
  offFx = onFx((n) => n === 'bankrupt' && scene?.shake())
  void init3d()
})
onBeforeUnmount(() => {
  unmounted = true
  offFx?.()
  scene?.dispose()
  scene = null
  stopTick()
  if (wheelBridge.spin === spin) wheelBridge.spin = null
})

/* ---------- жест: раскрутка перетаскиванием ---------- */
let dragging = false
let lastPointer = 0
let samples: { t: number; a: number }[] = []

function pointerAngle(e: PointerEvent): number {
  const r = (discEl as HTMLElement).getBoundingClientRect()
  return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI
}

function onDown(e: PointerEvent): void {
  if (!props.interactive || spinning.value) return
  discEl = e.currentTarget as HTMLElement
  dragging = true
  discEl.setPointerCapture(e.pointerId)
  lastPointer = pointerAngle(e)
  samples = [{ t: performance.now(), a: angle.get() }]
}

function onMove(e: PointerEvent): void {
  if (!dragging) return
  const a = pointerAngle(e)
  let d = a - lastPointer
  if (d > 180) d -= 360
  if (d < -180) d += 360
  lastPointer = a
  angle.set(angle.get() + d)
  const now = performance.now()
  samples.push({ t: now, a: angle.get() })
  while (samples.length > 2 && now - (samples[0] as { t: number }).t > 120) samples.shift()
}

function onUp(): void {
  if (!dragging) return
  dragging = false
  const first = samples[0]
  const last = samples[samples.length - 1]
  if (!first || !last || last.t === first.t) return
  const velocity = ((last.a - first.a) / (last.t - first.t)) * 1000 // град/с
  if (Math.abs(velocity) < 160) return
  const dist = Math.sign(velocity) * Math.min(3800, Math.max(1100, Math.abs(velocity) * 1.1))
  const duration = 3.4 + (Math.abs(dist) / 3800) * 2.4
  emit('userspin', runTo(angle.get() + dist, duration))
}
</script>

<template>
  <div class="wheel-size relative mx-auto aspect-square select-none" data-testid="wheel-wrap">
    <canvas
      ref="canvas"
      class="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500"
      :class="use3d ? 'opacity-100' : 'opacity-0'"
      aria-hidden="true"
      data-testid="wheel-3d"
      :data-ready="use3d"
    ></canvas>
    <WheelPointer v-if="!use3d" :rotation="pointerRot" />
    <Motion
      class="absolute rounded-full"
      :class="[use3d ? 'inset-[8%]' : 'inset-[2%]', interactive && !spinning ? 'cursor-grab' : '']"
      :style="{ rotate: angle, touchAction: interactive ? 'none' : 'auto' }"
      data-testid="wheel"
      :data-angle="finalAngle.toFixed(2)"
      :data-under="highlighted ?? ''"
      role="img"
      :aria-label="`Барабан, ${SECTORS.length} секторов`"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
      <svg v-if="!use3d" viewBox="0 0 400 400" class="block h-full w-full">
        <g v-for="(sh, i) in shapes" :key="i" :data-sector="i">
          <path
            :d="sh.path"
            :fill="sh.s.color"
            :stroke="highlighted === i ? '#fff' : 'rgba(255,255,255,0.65)'"
            :stroke-width="highlighted === i ? 5 : 1.500"
          />
          <g :transform="sh.textTransform">
            <text
              :x="C + R - 12"
              :y="C"
              text-anchor="end"
              dominant-baseline="central"
              :font-size="sh.fontSize"
              :fill="sh.s.textColor"
              font-family="'Russo One', 'Rubik', sans-serif"
              style="paint-order: stroke"
              :stroke="sh.s.textColor === '#ffffff' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.4)'"
              stroke-width="3"
              stroke-linejoin="round"
            >{{ sh.s.label }}</text>
          </g>
        </g>
      </svg>
    </Motion>
    <!-- неподвижный ободок с лампочками и втулка -->
    <svg v-if="!use3d" viewBox="0 0 400 400" class="pointer-events-none absolute inset-0 h-full w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]" aria-hidden="true">
      <circle cx="200" cy="200" r="188" fill="none" stroke="#fbbf24" stroke-width="22" />
      <circle cx="200" cy="200" r="198" fill="none" stroke="#7a4d00" stroke-width="3" />
      <circle cx="200" cy="200" r="177" fill="none" stroke="#7a4d00" stroke-width="3" />
      <circle
        v-for="(b, i) in bulbs"
        :key="i"
        :cx="b[0]"
        :cy="b[1]"
        r="5.500"
        fill="#fff6d1"
        class="wheel-bulb"
      />
      <circle cx="200" cy="200" r="36" fill="#fbbf24" stroke="#7a4d00" stroke-width="4" />
      <circle cx="200" cy="200" r="26" fill="#1a0b4a" />
      <path d="M200 182 L205 195 L219 195 L208 203 L212 217 L200 209 L188 217 L192 203 L181 195 L195 195Z" fill="#fbbf24" />
    </svg>
  </div>
</template>

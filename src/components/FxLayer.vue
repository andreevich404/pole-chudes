<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Motion } from 'motion-v'
import { usePreferredReducedMotion } from '@vueuse/core'
import { onFx } from '../three/effects'
import { hasWebGL } from '../three/support'
import type { FxScene } from '../three/fxScene'
import Confetti from './Confetti.vue'

const canvas = ref<HTMLCanvasElement | null>(null)
const visible = ref(false)
const flash = ref(0)
const fallbackToken = ref(0)
const reduced = usePreferredReducedMotion()

let scene: FxScene | null = null
let loading: Promise<void> | null = null
let failed = !hasWebGL()
let unmounted = false

async function ensureScene(): Promise<void> {
  if (scene || failed) return
  loading ??= (async () => {
    try {
      const { createFxScene } = await import('../three/fxScene')
      if (unmounted || !canvas.value) return
      scene = createFxScene(
        canvas.value,
        () => (visible.value = false),
        () => (visible.value = true),
      )
      if (!scene) failed = true
    } catch {
      failed = true
    }
  })()
  await loading
}

const off = ref<(() => void) | null>(null)

onMounted(() => {
  off.value = onFx(async (name) => {
    if (name === 'bankrupt') {
      if (reduced.value !== 'reduce') flash.value++
      return
    }
    if (reduced.value === 'reduce') return
    await ensureScene()
    if (scene) scene.fireworks()
    else fallbackToken.value++
  })
})

onBeforeUnmount(() => {
  unmounted = true
  off.value?.()
  scene?.dispose()
  scene = null
})
</script>

<template>
  <canvas
    ref="canvas"
    class="pointer-events-none fixed inset-0 z-50 h-full w-full"
    :class="visible ? 'opacity-100' : 'opacity-0'"
    aria-hidden="true"
    data-testid="fx-canvas"
  ></canvas>
  <!-- запасной вариант без WebGL: 2D-конфетти -->
  <Confetti :token="fallbackToken" />
  <!-- красная вспышка при «Банкроте» -->
  <Motion
    v-if="flash"
    :key="flash"
    class="pointer-events-none fixed inset-0 z-40 bg-red-600"
    :initial="{ opacity: 0.5 }"
    :animate="{ opacity: 0 }"
    :transition="{ duration: 0.55, ease: 'easeOut' }"
    aria-hidden="true"
    data-testid="flash"
  />
</template>

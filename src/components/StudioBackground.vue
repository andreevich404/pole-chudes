<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import { onFx } from '../three/effects'
import { hasWebGL } from '../three/support'
import type { StudioScene } from '../three/studioScene'

const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const reduced = usePreferredReducedMotion()

let scene: StudioScene | null = null
let unmounted = false
let offFx: (() => void) | null = null

onMounted(async () => {
  offFx = onFx((n) => n === 'bankrupt' && scene?.shake())
  if (!hasWebGL() || !canvas.value) return
  try {
    const { createStudioScene } = await import('../three/studioScene')
    if (unmounted || !canvas.value) return
    scene = createStudioScene(canvas.value, { reduced: reduced.value === 'reduce' })
    ready.value = scene !== null
  } catch {
    scene = null
  }
})

onBeforeUnmount(() => {
  unmounted = true
  offFx?.()
  scene?.dispose()
  scene = null
})
</script>

<template>
  <canvas
    ref="canvas"
    class="pointer-events-none fixed inset-0 z-0 h-full w-full transition-opacity duration-700"
    :class="ready ? 'opacity-100' : 'opacity-0'"
    aria-hidden="true"
    data-testid="studio-bg"
  ></canvas>
</template>

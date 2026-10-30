<script setup lang="ts">
import { Motion } from 'motion-v'
import type { MotionValue } from 'motion-v'

defineProps<{ rotation: MotionValue<number> }>()
</script>

<template>
  <Motion
    class="pointer-events-none absolute left-1/2 top-[-2%] z-10 w-[12%] -translate-x-1/2"
    :style="{ rotate: rotation, transformOrigin: '50% 18%' }"
    data-testid="pointer"
  >
    <svg viewBox="0 0 60 80" class="block w-full drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" aria-hidden="true">
      <path d="M30 78 L6 24 Q4 8 30 6 Q56 8 54 24Z" fill="#fff" stroke="#8a5400" stroke-width="4" stroke-linejoin="round" />
      <circle cx="30" cy="22" r="8" fill="#dc2626" stroke="#7f1d1d" stroke-width="2" />
    </svg>
  </Motion>
</template>

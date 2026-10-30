<script setup lang="ts">
import type { AvatarKind } from '../types'

defineProps<{ kind: AvatarKind }>()
</script>

<template>
  <svg viewBox="0 0 64 64" class="block h-full w-full" role="img" aria-hidden="true">
    <circle cx="32" cy="32" r="31" :fill="kind === 'you' ? '#38bdf8' : kind === 'robot' ? '#a78bfa' : '#fda4af'" />
    <!-- игрок: студент в кепке -->
    <g v-if="kind === 'you'">
      <path d="M12 64 Q14 46 32 46 Q50 46 52 64Z" fill="#0ea5e9" />
      <circle cx="32" cy="32" r="14" fill="#fcd9a8" />
      <path d="M17 29 Q17 15 32 15 Q47 15 47 29 Z" fill="#f59e0b" />
      <path d="M30 27 L56 27 Q56 31 47 31 L30 31Z" fill="#d97706" />
      <circle cx="26.500" cy="33" r="2" fill="#1a0b4a" />
      <circle cx="37.500" cy="33" r="2" fill="#1a0b4a" />
      <path d="M26 39 Q32 44 38 39" fill="none" stroke="#1a0b4a" stroke-width="2" stroke-linecap="round" />
    </g>
    <!-- робот -->
    <g v-else-if="kind === 'robot'">
      <line x1="32" y1="8" x2="32" y2="16" stroke="#312e81" stroke-width="2.500" />
      <circle cx="32" cy="7" r="3.500" fill="#fbbf24" />
      <rect x="15" y="16" width="34" height="28" rx="8" fill="#e0e7ff" stroke="#312e81" stroke-width="2.500" />
      <rect x="20" y="24" width="10" height="8" rx="3" fill="#22d3ee" />
      <rect x="34" y="24" width="10" height="8" rx="3" fill="#22d3ee" />
      <rect x="23" y="37" width="18" height="3.500" rx="1.700" fill="#312e81" />
      <path d="M14 64 Q16 50 32 50 Q48 50 50 64Z" fill="#6366f1" />
    </g>
    <!-- бабушка -->
    <g v-else>
      <path d="M12 64 Q14 47 32 47 Q50 47 52 64Z" fill="#be185d" />
      <circle cx="32" cy="13" r="6" fill="#d1d5db" />
      <circle cx="32" cy="32" r="14" fill="#fcd9a8" />
      <path d="M18 30 Q18 17 32 17 Q46 17 46 30 Q40 22 32 22 Q24 22 18 30Z" fill="#e5e7eb" />
      <circle cx="26.500" cy="33" r="4.500" fill="none" stroke="#1a0b4a" stroke-width="1.500" />
      <circle cx="37.500" cy="33" r="4.500" fill="none" stroke="#1a0b4a" stroke-width="1.500" />
      <line x1="31" y1="33" x2="33" y2="33" stroke="#1a0b4a" stroke-width="1.500" />
      <circle cx="26.500" cy="33" r="1.500" fill="#1a0b4a" />
      <circle cx="37.500" cy="33" r="1.500" fill="#1a0b4a" />
      <path d="M27 40 Q32 44 37 40" fill="none" stroke="#9f1239" stroke-width="2" stroke-linecap="round" />
    </g>
  </svg>
</template>

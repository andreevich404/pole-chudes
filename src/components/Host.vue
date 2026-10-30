<script setup lang="ts">
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { usePreferredReducedMotion } from '@vueuse/core'
import type { HostMood } from '../types'

const props = defineProps<{ mood: HostMood; text: string; compact?: boolean; stacked?: boolean }>()

const reduced = usePreferredReducedMotion()
const still = computed(() => reduced.value === 'reduce')

const armR = computed(() => ({ idle: -12, happy: -145, surprised: -50, sad: 6, thinking: -12 })[props.mood])
const armL = computed(() => ({ idle: 12, happy: 145, surprised: 50, sad: -6, thinking: 12 })[props.mood])
</script>

<template>
  <div class="flex gap-2" :class="stacked ? 'flex-col items-center' : 'items-end'" data-testid="host">
    <Motion
      class="shrink-0"
      :class="compact ? 'w-24' : stacked ? 'w-36' : 'w-28 lg:w-40'"
      :animate="still ? undefined : { y: [0, -4, 0] }"
      :transition="{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }"
    >
      <svg viewBox="-20 0 240 235" class="block w-full" role="img" :aria-label="`Ведущий Аркадий Блеск, настроение: ${mood}`">
        <!-- левая рука (слева на экране) -->
        <g class="host-arm" :style="{ transform: `rotate(${armL}deg)`, transformOrigin: '40px 152px' }">
          <path d="M40 152 L26 215 L46 218 L58 160Z" fill="#6d28d9" stroke="#3b0f8c" stroke-width="2" />
          <circle cx="36" cy="222" r="10" fill="#f6cf9b" stroke="#c9985a" stroke-width="1.500" />
        </g>
        <!-- правая рука -->
        <g class="host-arm" :style="{ transform: `rotate(${armR}deg)`, transformOrigin: '160px 152px' }">
          <path d="M160 152 L174 215 L154 218 L142 160Z" fill="#6d28d9" stroke="#3b0f8c" stroke-width="2" />
          <circle cx="164" cy="222" r="10" fill="#f6cf9b" stroke="#c9985a" stroke-width="1.500" />
        </g>
        <!-- пиджак -->
        <path d="M30 235 L40 152 Q100 126 160 152 L170 235Z" fill="#7c3aed" stroke="#3b0f8c" stroke-width="2" />
        <path d="M82 140 L100 200 L118 140Z" fill="#fff" />
        <path d="M70 142 L96 205 L58 235 L36 235 L44 160Z" fill="#5b21b6" />
        <path d="M130 142 L104 205 L142 235 L164 235 L156 160Z" fill="#5b21b6" />
        <!-- блёстки -->
        <path d="M56 195 l3 -7 l3 7 l-7 -3 l8 0z" fill="#fde68a" />
        <path d="M140 188 l3 -7 l3 7 l-7 -3 l8 0z" fill="#fde68a" />
        <path d="M120 222 l3 -7 l3 7 l-7 -3 l8 0z" fill="#fde68a" />
        <path d="M70 225 l2.500 -6 l2.500 6 l-6 -2.500 l7 0z" fill="#fde68a" />
        <!-- шея, голова -->
        <rect x="88" y="118" width="24" height="30" fill="#e8b97c" />
        <ellipse cx="61" cy="86" rx="7" ry="11" fill="#f1c48a" />
        <ellipse cx="139" cy="86" rx="7" ry="11" fill="#f1c48a" />
        <ellipse cx="100" cy="82" rx="39" ry="45" fill="#f6cf9b" />
        <!-- причёска -->
        <path d="M60 78 Q56 36 100 32 Q144 36 140 78 Q132 54 100 52 Q68 54 60 78Z" fill="#3a2414" />
        <path d="M70 46 Q88 36 110 40" fill="none" stroke="#7b5230" stroke-width="3" stroke-linecap="round" />
        <!-- брови -->
        <path v-if="mood === 'sad'" d="M70 66 L92 72 M130 66 L108 72" stroke="#3a2414" stroke-width="5" stroke-linecap="round" />
        <path v-else-if="mood === 'surprised'" d="M72 58 Q84 50 94 58 M106 58 Q116 50 128 58" fill="none" stroke="#3a2414" stroke-width="5" stroke-linecap="round" />
        <path v-else-if="mood === 'thinking'" d="M72 68 Q84 64 94 68 M106 58 Q116 50 128 58" fill="none" stroke="#3a2414" stroke-width="5" stroke-linecap="round" />
        <path v-else d="M72 66 Q84 60 94 66 M106 66 Q116 60 128 66" fill="none" stroke="#3a2414" stroke-width="5" stroke-linecap="round" />
        <!-- глаза -->
        <g v-if="mood === 'happy'">
          <path d="M74 82 Q84 70 94 82 M106 82 Q116 70 126 82" fill="none" stroke="#1a0b4a" stroke-width="4.500" stroke-linecap="round" />
        </g>
        <g v-else :class="still ? '' : 'host-blink'">
          <ellipse cx="84" cy="80" :rx="mood === 'surprised' ? 10 : 8" :ry="mood === 'surprised' ? 12 : 9" fill="#fff" stroke="#c9985a" />
          <ellipse cx="116" cy="80" :rx="mood === 'surprised' ? 10 : 8" :ry="mood === 'surprised' ? 12 : 9" fill="#fff" stroke="#c9985a" />
          <circle :cx="mood === 'thinking' ? 88 : 84" :cy="mood === 'sad' ? 85 : mood === 'thinking' ? 75 : 81" :r="mood === 'surprised' ? 3.500 : 4.500" fill="#1a0b4a" />
          <circle :cx="mood === 'thinking' ? 120 : 116" :cy="mood === 'sad' ? 85 : mood === 'thinking' ? 75 : 81" :r="mood === 'surprised' ? 3.500 : 4.500" fill="#1a0b4a" />
        </g>
        <!-- нос -->
        <ellipse cx="100" cy="97" rx="7" ry="6" fill="#e3a874" />
        <!-- рот -->
        <path v-if="mood === 'happy'" d="M86 118 Q100 142 114 118Z" fill="#7f1d1d" />
        <path v-if="mood === 'happy'" d="M92 128 Q100 134 108 128 Q100 124 92 128Z" fill="#fb7185" />
        <ellipse v-else-if="mood === 'surprised'" cx="100" cy="126" rx="7" ry="9" fill="#7f1d1d" />
        <path v-else-if="mood === 'sad'" d="M88 128 Q100 116 112 128" fill="none" stroke="#7f1d1d" stroke-width="4" stroke-linecap="round" />
        <path v-else-if="mood === 'thinking'" d="M92 124 L110 120" stroke="#7f1d1d" stroke-width="4" stroke-linecap="round" />
        <path v-else d="M88 120 Q100 130 112 120" fill="none" stroke="#7f1d1d" stroke-width="4" stroke-linecap="round" />
        <!-- усы -->
        <path d="M100 104 Q84 96 68 104 Q58 109 64 119 Q66 111 76 110 Q90 108 100 111 Q110 108 124 110 Q134 111 136 119 Q142 109 132 104 Q116 96 100 104Z" fill="#2b1a0b" />
        <!-- бабочка -->
        <path d="M100 150 L76 138 L76 162Z" fill="#e11d48" stroke="#7f0d2a" stroke-width="1.500" />
        <path d="M100 150 L124 138 L124 162Z" fill="#e11d48" stroke="#7f0d2a" stroke-width="1.500" />
        <circle cx="100" cy="150" r="6" fill="#be123c" stroke="#7f0d2a" stroke-width="1.500" />
      </svg>
    </Motion>
    <div
      class="relative min-w-0 rounded-2xl bg-white px-3 py-2 text-sm font-medium leading-snug text-[#1a0b4a] shadow-lg lg:text-base"
      data-testid="host-bubble"
      :style="stacked ? undefined : { marginBottom: '1.5rem', flex: 1 }"
      aria-live="polite"
    >
      <span class="absolute h-4 w-4 rotate-45 bg-white" :class="stacked ? '-top-2 left-1/2 -ml-2' : '-left-2 bottom-5'" aria-hidden="true"></span>
      <span class="relative">{{ text }}</span>
    </div>
  </div>
</template>

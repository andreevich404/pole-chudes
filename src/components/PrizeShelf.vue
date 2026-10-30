<script setup lang="ts">
import { Motion } from 'motion-v'
import type { Prize } from '../types'

defineProps<{ prizes: readonly Prize[] }>()
</script>

<template>
  <div data-testid="prize-shelf">
    <p v-if="prizes.length === 0" class="rounded-xl bg-black/25 p-4 text-center text-white/85">
      На витрине пусто — в следующий раз обязательно что-нибудь выиграете!
    </p>
    <ul v-else class="grid gap-3 sm:grid-cols-2">
      <Motion
        v-for="(p, i) in prizes"
        :key="`${p.id}-${i}`"
        as="li"
        class="flex items-center gap-3 rounded-xl border-2 border-gold/60 bg-black/25 p-3"
        :initial="{ opacity: 0, y: 20, scale: 0.9 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ delay: 0.15 * i, type: 'spring', stiffness: 260, damping: 20 }"
      >
        <span class="text-4xl" aria-hidden="true">{{ p.emoji }}</span>
        <span class="min-w-0">
          <span class="block font-semibold leading-tight">{{ p.title }}</span>
          <span class="block text-sm leading-snug text-white/80">{{ p.description }}</span>
        </span>
      </Motion>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Motion } from 'motion-v'
import type { Player } from '../types'
import PlayerAvatar from './PlayerAvatar.vue'

defineProps<{ player: Player; active: boolean }>()
</script>

<template>
  <Motion
    class="relative flex min-w-0 items-center gap-2 rounded-2xl border-2 px-2 py-2 sm:gap-3 sm:px-3"
    :class="active ? 'pulse-ring border-gold bg-[#4a2fc0]' : 'border-white/20 bg-[#2a1a80]/80'"
    :animate="{ scale: active ? 1.04 : 1 }"
    :transition="{ type: 'spring', stiffness: 300, damping: 18 }"
    :data-testid="`player-${player.id}`"
    :data-active="active"
  >
    <div class="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white/60 sm:h-14 sm:w-14">
      <PlayerAvatar :kind="player.avatar" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="truncate text-xs font-semibold leading-tight sm:text-sm">{{ player.name }}</div>
      <div class="font-display text-lg leading-tight text-gold sm:text-2xl" :data-testid="`total-${player.id}`">{{ player.total }}</div>
      <div class="truncate text-[11px] leading-tight text-white/85 sm:text-xs">
        тур: <b :data-testid="`round-${player.id}`">{{ player.roundScore }}</b>
        <span v-if="player.prizes.length" title="Призы"> · 🎁{{ player.prizes.length }}</span>
        <span v-if="player.keys" title="Ключи"> · 🗝️{{ player.keys }}</span>
      </div>
    </div>
  </Motion>
</template>

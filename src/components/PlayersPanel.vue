<script setup lang="ts">
import type { Player } from '../types'
import PlayerCard from './PlayerCard.vue'

defineProps<{ players: Player[]; current: number; vertical?: boolean }>()
</script>

<template>
  <div class="grid gap-2" :class="vertical ? 'grid-cols-1' : 'grid-cols-3'" data-testid="players">
    <PlayerCard v-for="p in players" :key="p.id" :player="p" :active="p.id === current" />
  </div>
</template>

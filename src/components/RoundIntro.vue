<script setup lang="ts">
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { ROUNDS, useGame } from '../composables/useGame'
import Host from './Host.vue'
import PlayerAvatar from './PlayerAvatar.vue'

const game = useGame()
const s = game.state

const max = computed(() => Math.max(1, ...s.players.map((p) => p.total)))
const first = computed(() => s.players[s.roundIndex % s.players.length])
</script>

<template>
  <main class="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-5 px-4 py-6" data-testid="round-intro">
    <Motion
      class="text-center"
      :initial="{ scale: 0.4, opacity: 0, rotate: -6 }"
      :animate="{ scale: 1, opacity: 1, rotate: 0 }"
      :transition="{ type: 'spring', stiffness: 220, damping: 14 }"
    >
      <div class="text-sm font-semibold uppercase tracking-widest text-gold">Тема: {{ s.question?.theme }}</div>
      <h1 class="title-gold text-5xl sm:text-7xl" data-testid="intro-title">Тур {{ s.roundIndex + 1 }}</h1>
      <div class="text-lg text-white/90">из {{ ROUNDS }}</div>
    </Motion>

    <section class="panel w-full p-4" aria-label="Счёт игроков">
      <h2 class="mb-3 font-display text-lg text-gold">Общий счёт</h2>
      <ul class="space-y-3">
        <Motion
          v-for="(p, i) in s.players"
          :key="p.id"
          as="li"
          class="flex items-center gap-3"
          :initial="{ opacity: 0, x: -30 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{ delay: 0.2 + i * 0.12 }"
        >
          <div class="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white/60"><PlayerAvatar :kind="p.avatar" /></div>
          <div class="min-w-0 flex-1">
            <div class="flex justify-between gap-2 text-sm font-semibold">
              <span class="truncate">{{ p.name }}</span>
              <span class="font-display text-gold">{{ p.total }}</span>
            </div>
            <div class="mt-1 h-3 overflow-hidden rounded-full bg-black/30">
              <Motion
                class="h-full rounded-full bg-gradient-to-r from-[#fde68a] to-[#f59e0b]"
                :initial="{ width: '0%' }"
                :animate="{ width: `${(p.total / max) * 100}%` }"
                :transition="{ delay: 0.5, duration: 0.9, ease: 'easeOut' }"
              />
            </div>
          </div>
        </Motion>
      </ul>
    </section>

    <p class="text-center text-white/90">Первым крутит барабан: <b class="text-gold">{{ first?.name }}</b></p>
    <div class="panel w-full p-2"><Host :mood="s.hostMood" :text="s.hostSay" /></div>

    <Motion :while-hover="{ scale: 1.04 }" :while-press="{ scale: 0.94 }">
      <button type="button" class="btn btn-gold px-10 text-xl" data-testid="start-round" @click="game.startRound()">Поехали!</button>
    </Motion>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { useGame } from '../composables/useGame'
import PlayerAvatar from './PlayerAvatar.vue'
import PrizeShelf from './PrizeShelf.vue'

const game = useGame()
const s = game.state

const winner = computed(() => s.players.find((p) => p.id === s.winnerId))
const human = computed(() => s.players[0])
const standings = computed(() => [...s.players].sort((a, b) => b.total - a.total || a.id - b.id))
const youWon = computed(() => winner.value?.isBot === false)
</script>

<template>
  <main class="intermission-screen mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-3 py-5 sm:px-5" data-testid="result-screen">
    <Motion
      class="text-center"
      :initial="{ scale: 0.5, opacity: 0 }"
      :animate="{ scale: 1, opacity: 1 }"
      :transition="{ type: 'spring', stiffness: 200, damping: 14 }"
    >
      <div class="text-sm font-semibold uppercase tracking-widest text-gold">{{ youWon ? 'Вы чемпион' : 'Игра окончена' }}</div>
      <h1 class="title-gold text-4xl sm:text-6xl" data-testid="winner">Победитель: {{ winner?.name }}</h1>
    </Motion>

    <section class="panel p-4" aria-label="Итоговый счёт">
      <h2 class="mb-3 font-display text-lg text-gold">Итоговый счёт</h2>
      <ol class="space-y-2">
        <li v-for="(p, i) in standings" :key="p.id" class="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2">
          <span class="w-6 text-center font-display text-xl text-gold">{{ i + 1 }}</span>
          <span class="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white/60"><PlayerAvatar :kind="p.avatar" /></span>
          <span class="min-w-0 flex-1 truncate font-semibold">{{ p.name }}</span>
          <span class="font-display text-xl text-gold" :data-testid="`final-${p.id}`">{{ p.total }}</span>
        </li>
      </ol>
      <p class="mt-3 text-sm text-white/90" data-testid="final-score">
        Ваш результат: <b class="text-gold">{{ s.finalScore }}</b>
        <span v-if="s.superWon"> (включая бонус суперигры +{{ game.SUPER_BONUS }})</span>
        <span v-if="s.isRecord" class="ml-2 rounded-full bg-gold px-2 py-0.5 font-bold text-[#2a1700]" data-testid="record-badge">Новый рекорд!</span>
      </p>
      <p v-if="s.superWon === null" class="mt-1 text-sm text-white/75">В суперигру проходит лидер. На этот раз это был не вы.</p>
    </section>

    <section class="panel p-4" aria-label="Ваши призы">
      <h2 class="mb-3 font-display text-lg text-gold">Призовая витрина</h2>
      <PrizeShelf :prizes="human?.prizes ?? []" />
      <p v-if="s.chest.length" class="mt-3 text-sm text-white/90">🗝️ Шкатулки по ключам открыты: {{ s.chest.map((p) => p.emoji).join(' ') }}</p>
    </section>

    <p class="intermission-host">«{{ s.hostSay }}»</p>

    <div class="flex flex-col gap-3 sm:flex-row">
      <Motion class="flex-1" :while-hover="{ scale: 1.03 }" :while-press="{ scale: 0.95 }">
        <button type="button" class="btn btn-gold w-full text-xl" data-testid="play-again" @click="game.restart()">Играть снова</button>
      </Motion>
      <button type="button" class="btn btn-ghost sm:w-56" data-testid="to-start" @click="game.toStart()">В главное меню</button>
    </div>
  </main>
</template>

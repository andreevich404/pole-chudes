<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Motion } from 'motion-v'
import { usePreferredReducedMotion } from '@vueuse/core'
import { useGame } from '../composables/useGame'
import { SECTORS } from '../game/wheelSectors'
import Host from './Host.vue'
import SoundToggle from './SoundToggle.vue'
import TabloCell from './TabloCell.vue'

const game = useGame()
const name = ref(game.storage.name.value)
const opened = ref(false)
const reduced = usePreferredReducedMotion()

const title = ['П', 'О', 'Л', 'Е', '', 'Т', 'А', 'Й', 'Н']

onMounted(() => {
  setTimeout(() => (opened.value = true), 250)
})

function play(): void {
  game.startGame(name.value)
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center gap-5 px-4 py-6" data-testid="start-screen">
    <div class="flex w-full justify-end"><SoundToggle /></div>

    <div class="w-full max-w-md">
      <div class="tablo-frame" aria-label="Поле тайн">
        <div class="tablo-grid" :style="{ '--cols': title.length }">
          <TabloCell
            v-for="(ch, i) in title"
            :key="i"
            :char="ch"
            :blank="ch === ''"
            :revealed="opened"
            :delay="i * 0.12"
            :pickable="false"
            :instant="reduced === 'reduce'"
          />
        </div>
      </div>
      <h1 class="sr-only">Поле тайн</h1>
      <p class="mt-4 text-center text-lg text-white/90">Игра со словами и барабаном — по мотивам классической игры</p>
    </div>

    <Motion
      class="panel w-full max-w-md p-4"
      :initial="{ opacity: 0, y: 30 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }"
    >
      <form class="flex flex-col gap-3" @submit.prevent="play">
        <label for="player-name" class="text-sm font-semibold">Как вас зовут?</label>
        <input
          id="player-name"
          v-model="name"
          class="text-input"
          type="text"
          maxlength="16"
          autocomplete="nickname"
          placeholder="Игрок"
          data-testid="name-input"
        />
        <Motion as="div" :while-hover="{ scale: 1.03 }" :while-press="{ scale: 0.95 }">
          <button type="submit" class="btn btn-gold w-full text-xl" data-testid="play-btn">Играть</button>
        </Motion>
        <p class="text-center text-sm text-white/85" data-testid="best-score">
          Рекорд: <b class="text-gold">{{ game.storage.best.value }}</b> очков
        </p>
      </form>
    </Motion>

    <div class="w-full max-w-md"><div class="panel p-2"><Host :mood="game.state.hostMood" :text="game.state.hostSay" /></div></div>

    <details class="panel w-full max-w-md p-4 text-sm leading-relaxed">
      <summary class="cursor-pointer font-display text-lg text-gold">Правила игры</summary>
      <ul class="mt-3 list-disc space-y-1.5 pl-5 text-white/95">
        <li>Играют трое: вы и два бота. Ходы по очереди, три тура и суперигра.</li>
        <li>В каждом туре дан вопрос и загадано слово. Крутите барабан, затем называйте букву или слово целиком.</li>
        <li>Верная буква открывается на табло — очки сектора умножаются на число вхождений, и вы крутите снова. Ошибка — ход переходит.</li>
        <li>Верно названное слово выигрывает тур: ваши очки тура уходят в общий счёт, у остальных сгорают.</li>
        <li>Лидер по сумме всех туров выходит в суперигру: 3 буквы, ещё 3 буквы и одна попытка на слово.</li>
      </ul>
      <p class="mt-3 font-semibold text-gold">Секторы барабана</p>
      <ul class="mt-1 space-y-1">
        <li><b>Числа</b> — очки за каждую открытую букву.</li>
        <li><b>Банкрот</b> — вы теряете очки тура, ход переходит.</li>
        <li><b>Ноль</b> — ход переходит.</li>
        <li><b>Плюс</b> — открываете любую букву на табло.</li>
        <li><b>Приз</b> — взять приз сразу (ход переходит) или играть дальше за победу.</li>
        <li><b>Ключ</b> — +500 очков и шкатулка с призом в финале.</li>
        <li><b>×2</b> — буква стоит вдвое дороже.</li>
        <li><b>Удача</b> — случайный бонус очков.</li>
      </ul>
      <p class="mt-3 text-white/70">Всего секторов на барабане: {{ SECTORS.length }}.</p>
    </details>
  </main>
</template>

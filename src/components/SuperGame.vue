<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Motion } from 'motion-v'
import { useGame } from '../composables/useGame'
import { normalizeWord } from '../game/engine'
import { SUPER_PRIZE } from '../game/prizes'
import Keyboard from './Keyboard.vue'
import SoundToggle from './SoundToggle.vue'
import Tablo from './Tablo.vue'

const game = useGame()
const s = game.state

const picked = ref<string[]>([])
const word = ref('')

const answer = computed(() => s.superQuestion?.answer ?? '')
const hits = computed(() => s.superGuessed.filter((l) => normalizeWord(answer.value).includes(l)))

watch(
  () => s.superStep,
  () => (picked.value = []),
)

function toggle(letter: string): void {
  if (s.superBusy) return
  const i = picked.value.indexOf(letter)
  if (i >= 0) picked.value.splice(i, 1)
  else if (picked.value.length < 3) picked.value.push(letter)
}

function confirm(): void {
  game.superConfirmLetters(picked.value)
}
</script>

<template>
  <main class="intermission-screen mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-3 py-4 sm:px-5" data-testid="super-game">
    <header class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <div class="font-display text-sm uppercase tracking-widest text-gold">Суперигра</div>
        <h1 class="text-base font-semibold leading-snug sm:text-xl" data-testid="super-question">{{ s.superQuestion?.text }}</h1>
      </div>
      <SoundToggle />
    </header>

    <Tablo :answer="answer" :guessed="s.superGuessed" />

    <section v-if="s.phase === 'superIntro'" class="panel flex flex-col items-center gap-3 p-4 text-center">
      <h2 class="title-gold text-3xl">Вы в финале!</h2>
      <p>Назовите 3 буквы — они откроются. Затем ещё 3 буквы. После этого у вас одна попытка назвать слово целиком.</p>
      <p>Главный приз: <b class="text-gold">{{ SUPER_PRIZE.emoji }} {{ SUPER_PRIZE.title }}</b></p>
      <Motion :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.94 }">
        <button type="button" class="btn btn-gold px-8 text-xl" data-testid="super-start" @click="game.startSuper()">Начать</button>
      </Motion>
    </section>

    <section v-if="s.phase === 'superPick'" class="panel flex flex-col gap-3 p-3">
      <p class="font-semibold" data-testid="super-step">Шаг {{ s.superStep }} из 2: выберите 3 буквы ({{ picked.length }}/3)</p>
      <Keyboard :used="s.superGuessed" :hits="hits" :selected="picked" :disabled="s.superBusy" @press="toggle" />
      <button type="button" class="btn btn-gold" :disabled="picked.length !== 3 || s.superBusy" data-testid="super-confirm" @click="confirm">
        Открыть буквы
      </button>
    </section>

    <section v-if="s.phase === 'superWord'" class="panel flex flex-col gap-3 p-3">
      <p class="font-semibold">Одна попытка! Назовите слово целиком.</p>
      <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="game.superGuessWord(word)">
        <input
          v-model="word"
          class="text-input"
          type="text"
          autocomplete="off"
          maxlength="24"
          placeholder="Ваше слово"
          aria-label="Слово целиком"
          data-testid="super-word-input"
        />
        <button type="submit" class="btn btn-green sm:w-48" :disabled="!normalizeWord(word)" data-testid="super-word-submit">Назвать</button>
      </form>
    </section>

    <section v-if="s.phase === 'superResult'" class="panel flex flex-col items-center gap-3 p-4 text-center" data-testid="super-result">
      <h2 class="title-gold text-3xl">{{ s.superWon ? 'Победа!' : 'Не угадали' }}</h2>
      <p>Слово было: <b class="text-gold">{{ answer }}</b></p>
      <p class="text-lg">
        {{ s.superWon ? SUPER_PRIZE.emoji : '🏅' }}
        <b>{{ s.superWon ? SUPER_PRIZE.title : 'Утешительный приз' }}</b>
      </p>
      <button type="button" class="btn btn-gold px-8 text-xl" :disabled="s.superBusy" data-testid="super-finish" @click="game.finish()">К итогам</button>
    </section>

    <p class="intermission-host">«{{ s.hostSay }}»</p>
  </main>
</template>

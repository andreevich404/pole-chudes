<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { AnimatePresence, Motion } from 'motion-v'
import { useGame } from '../composables/useGame'
import { normalizeWord, openedMask } from '../game/engine'
import Host from './Host.vue'
import Keyboard from './Keyboard.vue'
import PlayersPanel from './PlayersPanel.vue'
import SoundToggle from './SoundToggle.vue'
import Tablo from './Tablo.vue'
import Wheel from './Wheel.vue'

const game = useGame()
const desktop = useMediaQuery('(min-width: 1024px)')
const s = game.state

const answer = computed(() => s.question?.answer ?? '')
const hits = computed(() => s.guessed.filter((l) => normalizeWord(answer.value).includes(l)))
const current = computed(() => s.players[s.current])
const isHumanTurn = computed(() => current.value?.isBot === false)
const openCount = computed(() => openedMask(answer.value, s.guessed).filter(Boolean).length)

const wordInput = ref('')
const wordEl = ref<HTMLInputElement | null>(null)

watch(
  () => s.phase,
  async (p) => {
    if (p === 'enterWord') {
      wordInput.value = ''
      await nextTick()
      wordEl.value?.focus()
    }
  },
)

function submitWord(): void {
  game.guessWord(wordInput.value)
}

const status = computed(() => {
  const p = current.value
  if (!p) return ''
  switch (s.phase) {
    case 'awaitSpin':
      return 'Ваш ход: крутите барабан'
    case 'botThinking':
    case 'spinning':
      return p.isBot ? `Ход: ${p.name}` : 'Барабан вращается...'
    case 'chooseLetter':
      return 'Назовите букву или слово целиком'
    case 'plusPick':
      return 'Плюс! Нажмите на любую закрытую ячейку табло'
    case 'prizeChoice':
      return 'Приз на кону!'
    case 'revealing':
      return 'Открываем...'
    case 'passing':
      return 'Ход переходит...'
    default:
      return ''
  }
})

const roundWinner = computed(() => s.players.find((p) => p.id === s.roundWinner))
</script>

<template>
  <main class="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-3 pb-3 pt-3 sm:px-5" data-testid="game-screen">
    <!-- шапка -->
    <header class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-3 text-xs font-semibold uppercase tracking-wide text-gold sm:text-sm">
          <span data-testid="round-label">Тур {{ s.roundIndex + 1 }} из {{ game.ROUNDS }}</span>
          <span class="rounded-full bg-white/15 px-2 py-0.5 text-white">{{ s.question?.theme }}</span>
          <span class="text-white/80">Открыто: {{ openCount }}/{{ normalizeWord(answer).length }}</span>
        </div>
        <h1 class="mt-1 text-base font-semibold leading-snug sm:text-xl" data-testid="question">{{ s.question?.text }}</h1>
      </div>
      <SoundToggle />
    </header>

    <div class="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_340px] lg:gap-5">
      <!-- табло: сверху на всю ширину -->
      <div class="relative lg:col-span-3">
        <Tablo :answer="answer" :guessed="s.guessed" :pickable="s.phase === 'plusPick'" @pick="game.pickPlusLetter" />
        <AnimatePresence>
          <Motion
            v-if="s.phase === 'roundEnd'"
            key="roundend"
            class="absolute inset-x-2 top-1/2 z-20 -translate-y-1/2 rounded-2xl border-2 border-gold bg-[#1a0b4a]/95 p-3 text-center shadow-2xl sm:p-5"
            :initial="{ opacity: 0, scale: 0.7 }"
            :animate="{ opacity: 1, scale: 1 }"
            :exit="{ opacity: 0, scale: 0.8 }"
            data-testid="round-end"
          >
            <div class="title-gold text-xl sm:text-3xl">Слово: {{ answer }}</div>
            <div class="mt-1 text-sm sm:text-lg">
              Тур выигрывает <b class="text-gold">{{ roundWinner?.name }}</b>: +{{ s.roundEarned }}
            </div>
            <div v-if="s.wonPrize" class="mt-1 text-sm sm:text-base">{{ s.wonPrize.emoji }} Приз: {{ s.wonPrize.title }}</div>
          </Motion>
        </AnimatePresence>
      </div>

      <!-- левая колонка: игроки + ведущий -->
      <div class="order-2 flex flex-col gap-3 lg:order-none lg:row-start-2">
        <div class="hidden lg:block"><PlayersPanel :players="s.players" :current="s.current" vertical /></div>
        <div class="lg:hidden"><PlayersPanel :players="s.players" :current="s.current" /></div>
        <div class="panel p-2"><Host :mood="s.hostMood" :text="s.hostSay" :stacked="desktop" /></div>
      </div>

      <!-- центр: барабан -->
      <div class="order-3 relative lg:order-none lg:row-start-2">
        <Wheel :interactive="s.phase === 'awaitSpin'" @userspin="game.onUserSpin" />
        <div class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <AnimatePresence>
            <Motion
              v-if="s.popup"
              :key="s.popup.id"
              class="max-w-[85%] rounded-2xl border-4 px-4 py-2 text-center font-display text-2xl shadow-2xl sm:text-4xl"
              :class="{
                'border-[#bbf7d0] bg-[#15803d] text-white': s.popup.tone === 'good',
                'border-[#fecaca] bg-[#b91c1c] text-white': s.popup.tone === 'bad',
                'border-white bg-[#1a0b4a] text-white': s.popup.tone === 'neutral',
              }"
              :initial="{ opacity: 0, scale: 0.4, y: 30 }"
              :animate="
                s.popup.tone === 'bad'
                  ? { opacity: 1, scale: 1, y: 0, x: [0, -14, 14, -10, 10, -5, 0] }
                  : { opacity: 1, scale: [0.4, 1.15, 1], y: 0 }
              "
              :exit="{ opacity: 0, scale: 0.8, y: -30 }"
              :transition="{ duration: 0.55 }"
              data-testid="popup"
            >
              {{ s.popup.text }}
            </Motion>
          </AnimatePresence>
        </div>
      </div>

      <!-- правая колонка: панель управления -->
      <section
        class="panel sticky bottom-2 z-30 order-4 flex flex-col gap-3 p-3 lg:static lg:order-none lg:row-start-2 lg:self-start"
        data-testid="controls"
        :data-phase="s.phase"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold sm:text-base" data-testid="status" aria-live="polite">{{ status }}</p>
          <span
            v-if="s.sector"
            class="shrink-0 rounded-full px-3 py-1 text-sm font-bold"
            :style="{ background: s.sector.color, color: s.sector.textColor }"
            data-testid="sector-result"
            :title="s.sector.hint"
          >
            {{ s.sector.label }}
          </span>
        </div>
        <p v-if="s.sector && isHumanTurn && ['chooseLetter', 'plusPick', 'prizeChoice'].includes(s.phase)" class="text-sm text-white/85">
          {{ s.sector.hint }}
        </p>

        <button
          v-if="s.phase === 'awaitSpin'"
          type="button"
          class="btn btn-gold w-full text-xl"
          data-testid="spin-btn"
          @click="game.humanSpin()"
        >
          Крутить барабан
        </button>
        <p v-if="s.phase === 'awaitSpin'" class="text-center text-xs text-white/75">или раскрутите барабан движением пальца или мыши</p>

        <template v-if="s.phase === 'chooseLetter'">
          <Keyboard :used="s.guessed" :hits="hits" :disabled="false" @press="game.guessLetter" />
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="btn btn-ghost" :disabled="s.guessed.length === 0" data-testid="word-btn" @click="game.openWordInput()">
              Назвать слово
            </button>
            <button type="button" class="btn btn-ghost" :disabled="!game.hintAvailable.value" data-testid="hint-btn" @click="game.askHint()">
              Звонок другу {{ s.hintUsed ? '(0)' : '(1)' }}
            </button>
          </div>
          <p v-if="s.guessed.length === 0" class="text-xs text-white/70">Назвать слово можно после первой открытой буквы.</p>
        </template>

        <form v-if="s.phase === 'enterWord'" class="flex flex-col gap-2" @submit.prevent="submitWord">
          <label for="word-input" class="text-sm font-semibold">Слово целиком</label>
          <input
            id="word-input"
            ref="wordEl"
            v-model="wordInput"
            class="text-input"
            type="text"
            autocomplete="off"
            autocapitalize="characters"
            maxlength="24"
            placeholder="Введите слово"
            data-testid="word-input"
          />
          <div class="grid grid-cols-2 gap-2">
            <button type="submit" class="btn btn-green" :disabled="!normalizeWord(wordInput)" data-testid="word-submit">Назвать</button>
            <button type="button" class="btn btn-ghost" data-testid="word-cancel" @click="game.closeWordInput()">Назад</button>
          </div>
        </form>

        <template v-if="s.phase === 'prizeChoice' && s.prizeCandidate">
          <div class="flex items-center gap-3 rounded-xl bg-black/25 p-3">
            <span class="text-4xl" aria-hidden="true">{{ s.prizeCandidate.emoji }}</span>
            <div>
              <div class="font-semibold leading-tight">{{ s.prizeCandidate.title }}</div>
              <div class="text-sm text-white/80">{{ s.prizeCandidate.description }}</div>
            </div>
          </div>
          <button type="button" class="btn btn-gold" data-testid="take-prize" @click="game.takePrize()">Взять приз (ход перейдёт)</button>
          <button type="button" class="btn btn-ghost" data-testid="continue-game" @click="game.continuePlaying()">Продолжить игру (приз за победу)</button>
        </template>

        <p v-if="s.phase === 'plusPick'" class="rounded-xl bg-black/25 p-3 text-sm">Выбранная буква откроется везде, где она встречается. Очки за неё не начисляются.</p>
      </section>
    </div>
  </main>
</template>

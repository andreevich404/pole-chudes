<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { studio, type StudioView } from "../three/studioBridge";
import { useGame } from "../composables/useGame";
import { normalizeWord, openedMask } from "../game/engine";
import Keyboard from "./Keyboard.vue";
import Tablo from "./Tablo.vue";
import Wheel from "./Wheel.vue";
import SectorReadout from "./SectorReadout.vue";
import StudioViewport from "./StudioViewport.vue";

const game = useGame();
const views: { id: StudioView; label: string }[] = [
  { id: "wide", label: "Общий" },
  { id: "wheel", label: "Барабан" },
  { id: "board", label: "Табло" },
];
const s = game.state;

const answer = computed(() => s.question?.answer ?? "");
const hits = computed(() =>
  s.guessed.filter((l) => normalizeWord(answer.value).includes(l)),
);
const current = computed(() => s.players[s.current]);
const isHumanTurn = computed(() => current.value?.isBot === false);
const openCount = computed(
  () => openedMask(answer.value, s.guessed).filter(Boolean).length,
);

const wordInput = ref("");
const wordEl = ref<HTMLInputElement | null>(null);

watch(
  () => s.phase,
  async (p) => {
    if (p === "enterWord") {
      wordInput.value = "";
      await nextTick();
      wordEl.value?.focus();
    }
  },
);

function submitWord(): void {
  game.guessWord(wordInput.value);
}

const status = computed(() => {
  const p = current.value;
  if (!p) return "";
  switch (s.phase) {
    case "awaitSpin":
      return "Ваш ход: крутите барабан";
    case "botThinking":
    case "spinning":
      return p.isBot ? `Ход: ${p.name}` : "Барабан вращается...";
    case "chooseLetter":
      return "Назовите букву или слово целиком";
    case "plusPick":
      return "Плюс! Нажмите на любую закрытую ячейку табло";
    case "prizeChoice":
      return "Приз на кону!";
    case "revealing":
      return "Открываем...";
    case "passing":
      return "Ход переходит...";
    default:
      return "";
  }
});

const roundWinner = computed(() =>
  s.players.find((p) => p.id === s.roundWinner),
);
</script>

<template>
  <main class="game-studio" data-testid="game-screen">
    <p class="sr-only" aria-live="polite">
      Табло:
      {{
        Array.from(answer)
          .map((ch) =>
            s.guessed.includes(ch.toUpperCase().replace(/Ё/g, "Е"))
              ? ch
              : "закрытая буква",
          )
          .join(", ")
      }}
    </p>
    <header class="game-toolbar">
      <section class="question-strip">
        <div class="eyebrow">
          <span data-testid="round-label"
            >ТУР {{ s.roundIndex + 1 }} / {{ game.ROUNDS }}</span
          ><span class="question-category">{{ s.question?.theme }}</span
          ><span
            >{{ openCount }} / {{ normalizeWord(answer).length }} БУКВ</span
          >
        </div>
        <h1 data-testid="question">{{ s.question?.text }}</h1>
      </section>
      <nav class="camera-controls" aria-label="Ракурс камеры">
        <button
          :class="{ selected: studio.autoCamera }"
          :aria-pressed="studio.autoCamera"
          @click="studio.autoCamera = true"
        >
          Авто
        </button>
        <button
          v-for="v in views"
          :key="v.id"
          :class="{ selected: !studio.autoCamera && studio.view === v.id }"
          :aria-pressed="!studio.autoCamera && studio.view === v.id"
          @click="
            studio.autoCamera = false;
            studio.view = v.id;
          "
        >
          {{ v.label }}
        </button>
      </nav>
    </header>
    <div class="game-layout">
      <div class="game-stage-column">
        <StudioViewport :class="{ 'is-fallback': studio.failed }">
          <div v-if="studio.failed" class="fallback-wheel">
            <Wheel
              :interactive="s.phase === 'awaitSpin'"
              @userspin="game.onUserSpin"
            />
          </div>
          <div v-if="studio.failed" class="fallback-board">
            <Tablo
              :answer="answer"
              :guessed="s.guessed"
              :pickable="s.phase === 'plusPick'"
              @pick="game.pickPlusLetter"
            />
          </div>
          <div
            v-if="s.popup"
            class="studio-popup"
            :class="s.popup.tone"
            data-testid="popup"
            aria-live="polite"
          >
            {{ s.popup.text }}
          </div>
          <div
            v-if="s.phase === 'roundEnd'"
            class="round-result panel"
            data-testid="round-end"
          >
            <div class="eyebrow">СЛОВО ОТГАДАНО</div>
            <h2>{{ answer }}</h2>
            <p>{{ roundWinner?.name }} выигрывает тур · +{{ s.roundEarned }}</p>
          </div>
        </StudioViewport>
        <div class="contestants" aria-label="Игроки">
          <div
            v-for="(p, i) in s.players"
            :key="p.id"
            class="contestant"
            :class="{ active: s.current === i }"
          >
            <span class="contestant-number">0{{ i + 1 }}</span>
            <div>
              <span class="contestant-name"
                >{{ p.name }} <small v-if="!p.isBot">ВЫ</small></span
              ><span class="contestant-total">{{ p.total }} всего</span>
            </div>
            <b>{{ p.roundScore.toLocaleString("ru-RU") }}</b>
          </div>
        </div>
        <aside class="host-caption">
          <span class="eyebrow">ВЕДУЩИЙ</span>
          <p aria-live="polite">«{{ s.hostSay }}»</p>
        </aside>
      </div>
      <section
        class="game-controls panel"
        data-testid="controls"
        :data-phase="s.phase"
      >
        <SectorReadout
          v-if="studio.hasSpun && !studio.failed"
          data-testid="pointer-sector"
        />
        <div class="flex items-center justify-between gap-2">
          <p
            class="text-sm font-semibold sm:text-base"
            data-testid="status"
            aria-live="polite"
          >
            {{ status }}
          </p>
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
        <p
          v-if="
            s.sector &&
            isHumanTurn &&
            ['chooseLetter', 'plusPick', 'prizeChoice'].includes(s.phase)
          "
          class="text-sm text-white/85"
        >
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
        <p
          v-if="s.phase === 'awaitSpin'"
          class="text-center text-xs text-white/75"
        >
          или нажмите на барабан в студии
        </p>

        <template v-if="s.phase === 'chooseLetter'">
          <Keyboard
            :used="s.guessed"
            :hits="hits"
            :disabled="false"
            @press="game.guessLetter"
          />
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="btn btn-ghost"
              :disabled="s.guessed.length === 0"
              data-testid="word-btn"
              @click="game.openWordInput()"
            >
              Назвать слово
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              :disabled="!game.hintAvailable.value"
              data-testid="hint-btn"
              @click="game.askHint()"
            >
              Звонок другу {{ s.hintUsed ? "(0)" : "(1)" }}
            </button>
          </div>
          <p v-if="s.guessed.length === 0" class="text-xs text-white/70">
            Назвать слово можно после первой открытой буквы.
          </p>
        </template>

        <form
          v-if="s.phase === 'enterWord'"
          class="flex flex-col gap-2"
          @submit.prevent="submitWord"
        >
          <label for="word-input" class="text-sm font-semibold"
            >Слово целиком</label
          >
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
            <button
              type="submit"
              class="btn btn-green"
              :disabled="!normalizeWord(wordInput)"
              data-testid="word-submit"
            >
              Назвать
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              data-testid="word-cancel"
              @click="game.closeWordInput()"
            >
              Назад
            </button>
          </div>
        </form>

        <template v-if="s.phase === 'prizeChoice' && s.prizeCandidate">
          <div class="flex items-center gap-3 rounded-xl bg-black/25 p-3">
            <span class="text-4xl" aria-hidden="true">{{
              s.prizeCandidate.emoji
            }}</span>
            <div>
              <div class="font-semibold leading-tight">
                {{ s.prizeCandidate.title }}
              </div>
              <div class="text-sm text-white/80">
                {{ s.prizeCandidate.description }}
              </div>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-gold"
            data-testid="take-prize"
            @click="game.takePrize()"
          >
            Взять приз (ход перейдёт)
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            data-testid="continue-game"
            @click="game.continuePlaying()"
          >
            Продолжить игру (приз за победу)
          </button>
        </template>

        <div
          v-if="s.phase === 'plusPick'"
          class="tile-picks"
          aria-label="Выберите закрытую ячейку"
        >
          <template v-for="(ch, i) in Array.from(answer)" :key="i"
            ><button
              v-if="!s.guessed.includes(ch.toUpperCase().replace(/Ё/g, 'Е'))"
              :aria-label="`Открыть ячейку ${i + 1}`"
              @click="game.pickPlusLetter(ch)"
            >
              {{ i + 1 }}
            </button></template
          >
        </div>
        <p
          v-if="s.phase === 'plusPick'"
          class="rounded-xl bg-black/25 p-3 text-sm"
        >
          Выбранная буква откроется везде, где она встречается. Очки за неё не
          начисляются.
        </p>
      </section>
    </div>
  </main>
</template>

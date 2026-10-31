<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useGame } from "../composables/useGame";
import { studio } from "../three/studioBridge";
const game = useGame();
const name = ref(game.storage.name.value);
const rules = ref(false);
const closeButton = ref<HTMLButtonElement | null>(null);
const rulesButton = ref<HTMLButtonElement | null>(null);
watch(rules, async (open) => {
  await nextTick();
  if (open) closeButton.value?.focus();
  else rulesButton.value?.focus();
});
</script>

<template>
  <main class="welcome" data-testid="start-screen">
    <div class="welcome-copy">
      <div class="eyebrow">
        <span class="small-line"></span> ЛЕГЕНДАРНАЯ ТЕЛЕИГРА
      </div>
      <h1>ПОЛЕ<br /><span>ЧУДЕС</span><sup>3D</sup></h1>
      <p class="welcome-description">
        Знакомая игра. Настоящая атмосфера.<br />Ваше место за барабаном уже
        ждёт.
      </p>
      <form class="welcome-form" @submit.prevent="game.startGame(name)">
        <label for="player-name">КАК ВАС ПРЕДСТАВИТЬ?</label>
        <div class="name-field">
          <span aria-hidden="true">↳</span
          ><input
            id="player-name"
            v-model="name"
            maxlength="16"
            autocomplete="nickname"
            placeholder="Ваше имя"
            data-testid="name-input"
          />
        </div>
        <button
          class="btn btn-gold"
          type="submit"
          :disabled="!studio.ready && !studio.failed"
          data-testid="play-btn"
        >
          Войти в студию <span aria-hidden="true">↗</span>
        </button>
      </form>
      <div class="welcome-links">
        <button ref="rulesButton" @click="rules = true">
          Как играть <span>↗</span></button
        ><span class="best" data-testid="best-score"
          >Личный рекорд
          <b>{{ game.storage.best.value.toLocaleString("ru-RU") }}</b></span
        >
      </div>
    </div>
    <div class="set-caption">
      <span class="live-dot"></span
      >{{
        studio.ready
          ? "СТУДИЯ ГОТОВА К ЭФИРУ"
          : studio.failed
            ? "ОБЛЕГЧЁННЫЙ РЕЖИМ"
            : "ПОДГОТОВКА СТУДИИ…"
      }}<span class="caption-line"></span><span>01 / ОБЩИЙ ПЛАН</span>
    </div>
    <div v-if="rules" class="modal-backdrop" @click.self="rules = false">
      <section
        class="rules-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        @keydown.esc="rules = false"
        tabindex="-1"
      >
        <button
          ref="closeButton"
          class="close-dialog"
          aria-label="Закрыть правила"
          autofocus
          @click="rules = false"
        >
          ×
        </button>
        <div class="eyebrow">ПЕРЕД ЭФИРОМ</div>
        <h2 id="rules-title">Правила игры</h2>
        <p>
          Вы и два соперника. Три тура и суперигра. Крутите барабан, выбирайте
          буквы и разгадывайте слово по вопросу ведущего.
        </p>
        <p>
          Верная буква приносит очки сектора за каждое вхождение. Ошибка или
          «Ноль» передают ход, «Банкрот» обнуляет очки тура. «Плюс» позволяет
          открыть любую букву на табло.
        </p>
        <p>
          «Приз» — забрать подарок или играть дальше. «Ключ» даёт 500 очков и
          шкатулку, «×2» удваивает стоимость буквы, «Удача» приносит бонус.
        </p>
        <p>
          Победитель тура сохраняет набранные очки. Лидер трёх туров выходит в
          суперигру: два набора по три буквы и одна попытка назвать слово.
        </p>
        <button class="btn btn-gold" @click="rules = false">Всё понятно</button>
      </section>
    </div>
  </main>
</template>

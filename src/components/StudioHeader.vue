<script setup lang="ts">
import { ref } from "vue";
import SoundToggle from "./SoundToggle.vue";
import { useGame } from "../composables/useGame";
const game = useGame();
const fullscreen = ref(false);
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    fullscreen.value = Boolean(document.fullscreenElement);
  } catch {
    /* Browser may not expose fullscreen in an embedded preview. */
  }
}
</script>
<template>
  <header class="studio-header">
    <button
      class="wordmark"
      aria-label="Поле чудес — главная"
      @click="game.toStart()"
    >
      <span class="brand-icon">✳</span> ПОЛЕ ЧУДЕС<span class="brand-edition">
        / 3D EDITION</span
      >
    </button>
    <div class="header-right">
      <span class="on-air"><i></i> ПРЯМОЙ ЭФИР</span
      ><span class="header-divider"></span><SoundToggle /><button
        class="icon-button fullscreen-button"
        :aria-label="fullscreen ? 'Выйти из полного экрана' : 'Полный экран'"
        @click="toggleFullscreen"
      >
        ⛶
      </button>
    </div>
  </header>
</template>

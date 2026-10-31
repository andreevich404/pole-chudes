<script setup lang="ts">
import { computed } from "vue";
import { AnimatePresence, Motion } from "motion-v";
import { useGame } from "./composables/useGame";
import FxLayer from "./components/FxLayer.vue";
import StudioBackground from "./components/StudioBackground.vue";
import StudioHeader from "./components/StudioHeader.vue";
import GameScreen from "./components/GameScreen.vue";
import ResultScreen from "./components/ResultScreen.vue";
import RoundIntro from "./components/RoundIntro.vue";
import StartScreen from "./components/StartScreen.vue";
import SuperGame from "./components/SuperGame.vue";

const game = useGame();

type Screen = "start" | "intro" | "game" | "super" | "result";

const screen = computed<Screen>(() => {
  switch (game.state.phase) {
    case "start":
      return "start";
    case "roundIntro":
      return "intro";
    case "superIntro":
    case "superPick":
    case "superWord":
    case "superResult":
      return "super";
    case "gameOver":
      return "result";
    default:
      return "game";
  }
});

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 },
};
</script>

<template>
  <StudioBackground />
  <StudioHeader />
  <AnimatePresence mode="wait">
    <Motion
      v-if="screen === 'start'"
      key="start"
      class="screen-layer"
      v-bind="fade"
      ><StartScreen
    /></Motion>
    <Motion
      v-else-if="screen === 'intro'"
      key="intro"
      class="screen-layer"
      v-bind="fade"
      ><RoundIntro
    /></Motion>
    <Motion
      v-else-if="screen === 'super'"
      key="super"
      class="screen-layer"
      v-bind="fade"
      ><SuperGame
    /></Motion>
    <Motion
      v-else-if="screen === 'result'"
      key="result"
      class="screen-layer"
      v-bind="fade"
      ><ResultScreen
    /></Motion>
    <Motion v-else key="game" class="screen-layer" v-bind="fade"
      ><GameScreen
    /></Motion>
  </AnimatePresence>
  <FxLayer />
</template>

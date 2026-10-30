<script setup lang="ts">
import { computed } from 'vue'
import { AnimatePresence, Motion } from 'motion-v'
import { useGame } from './composables/useGame'
import FxLayer from './components/FxLayer.vue'
import StudioBackground from './components/StudioBackground.vue'
import GameScreen from './components/GameScreen.vue'
import ResultScreen from './components/ResultScreen.vue'
import RoundIntro from './components/RoundIntro.vue'
import StartScreen from './components/StartScreen.vue'
import SuperGame from './components/SuperGame.vue'

const game = useGame()

type Screen = 'start' | 'intro' | 'game' | 'super' | 'result'

const screen = computed<Screen>(() => {
  switch (game.state.phase) {
    case 'start':
      return 'start'
    case 'roundIntro':
      return 'intro'
    case 'superIntro':
    case 'superPick':
    case 'superWord':
    case 'superResult':
      return 'super'
    case 'gameOver':
      return 'result'
    default:
      return 'game'
  }
})

const fade = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
  transition: { duration: 0.3 },
}
</script>

<template>
  <StudioBackground />
  <AnimatePresence mode="wait">
    <Motion v-if="screen === 'start'" key="start" v-bind="fade"><StartScreen /></Motion>
    <Motion v-else-if="screen === 'intro'" key="intro" v-bind="fade"><RoundIntro /></Motion>
    <Motion v-else-if="screen === 'super'" key="super" v-bind="fade"><SuperGame /></Motion>
    <Motion v-else-if="screen === 'result'" key="result" v-bind="fade"><ResultScreen /></Motion>
    <Motion v-else key="game" v-bind="fade"><GameScreen /></Motion>
  </AnimatePresence>
  <FxLayer />
</template>

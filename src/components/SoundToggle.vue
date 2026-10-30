<script setup lang="ts">
import { useSound } from '../composables/useSound'

const { enabled, toggle } = useSound()
</script>

<template>
  <button
    type="button"
    class="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/50 bg-black/30 text-xl transition hover:bg-black/50 active:scale-90"
    :aria-pressed="enabled"
    :aria-label="enabled ? 'Выключить звук' : 'Включить звук'"
    :title="enabled ? 'Звук включён' : 'Звук выключен'"
    data-testid="sound-toggle"
    @click="toggle"
  >
    <span aria-hidden="true">{{ enabled ? '🔊' : '🔇' }}</span>
  </button>
</template>

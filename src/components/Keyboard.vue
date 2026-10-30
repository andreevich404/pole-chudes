<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { RU_ALPHABET, normalizeLetter } from '../game/engine'

const props = withDefaults(
  defineProps<{
    /** Уже названные буквы (заблокированы) */
    used: readonly string[]
    /** Названные буквы, которые есть в слове (подсвечены зелёным) */
    hits?: readonly string[]
    selected?: readonly string[]
    disabled?: boolean
  }>(),
  { hits: () => [], selected: () => [], disabled: false },
)
const emit = defineEmits<{ press: [letter: string] }>()

/** Физическая раскладка QWERTY → ЙЦУКЕН, чтобы играть без переключения языка */
const QWERTY: Record<string, string> = {
  KeyQ: 'Й', KeyW: 'Ц', KeyE: 'У', KeyR: 'К', KeyT: 'Е', KeyY: 'Н', KeyU: 'Г', KeyI: 'Ш', KeyO: 'Щ', KeyP: 'З',
  BracketLeft: 'Х', BracketRight: 'Ъ', KeyA: 'Ф', KeyS: 'Ы', KeyD: 'В', KeyF: 'А', KeyG: 'П', KeyH: 'Р', KeyJ: 'О',
  KeyK: 'Л', KeyL: 'Д', Semicolon: 'Ж', Quote: 'Э', KeyZ: 'Я', KeyX: 'Ч', KeyC: 'С', KeyV: 'М', KeyB: 'И', KeyN: 'Т',
  KeyM: 'Ь', Comma: 'Б', Period: 'Ю',
}

function status(letter: string): 'hit' | 'miss' | 'selected' | 'free' {
  if (props.used.includes(letter)) return props.hits.includes(letter) ? 'hit' : 'miss'
  if (props.selected.includes(letter)) return 'selected'
  return 'free'
}

function press(letter: string): void {
  if (props.disabled || props.used.includes(letter)) return
  emit('press', letter)
}

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (props.disabled || e.ctrlKey || e.metaKey || e.altKey) return
  const target = e.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  let letter = normalizeLetter(e.key)
  if (!letter) letter = QWERTY[e.code] ?? ''
  if (letter) press(letter)
})
</script>

<template>
  <div class="grid grid-cols-8 gap-1.5" role="group" aria-label="Экранная клавиатура" data-testid="keyboard">
    <button
      v-for="letter in RU_ALPHABET"
      :key="letter"
      type="button"
      class="key"
      :class="{
        'key-hit': status(letter) === 'hit',
        'key-miss': status(letter) === 'miss',
        'key-selected': status(letter) === 'selected',
      }"
      :disabled="disabled || used.includes(letter)"
      :data-testid="`key-${letter}`"
      :aria-label="`Буква ${letter}`"
      :aria-pressed="status(letter) === 'selected'"
      @click="press(letter)"
    >
      {{ letter }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery, usePreferredReducedMotion } from '@vueuse/core'
import { countOccurrences, layoutWord, normalizeWord } from '../game/engine'
import TabloCell from './TabloCell.vue'

const props = withDefaults(
  defineProps<{
    answer: string
    guessed: readonly string[]
    /** Можно ли кликать по закрытым ячейкам (сектор «Плюс») */
    pickable?: boolean
    rows?: number
  }>(),
  { pickable: false, rows: 3 },
)
const emit = defineEmits<{ pick: [letter: string] }>()

const wide = useMediaQuery('(min-width: 640px)')
const reduced = usePreferredReducedMotion()

const cols = computed(() => (wide.value ? 12 : 8))
const letters = computed(() => normalizeWord(props.answer))
const layout = computed(() => layoutWord(props.answer, cols.value, props.rows))

function isRevealed(index: number): boolean {
  const ch = letters.value[index]
  return ch !== undefined && props.guessed.includes(ch)
}

/** Порядковый номер вхождения буквы — ячейки одной буквы открываются по очереди */
function delayFor(index: number): number {
  const ch = letters.value[index] ?? ''
  return countOccurrences(letters.value.slice(0, index), ch) * 0.38
}

const hBulbs = computed(() => (wide.value ? 22 : 12))
const vBulbs = computed(() => (wide.value ? 7 : 6))
</script>

<template>
  <div class="tablo-frame" data-testid="tablo" :aria-label="`Табло: ${letters.length} букв, открыто ${guessed.length ? 'часть' : 'ни одной'}`">
    <div class="bulb-row h top" aria-hidden="true"><span v-for="n in hBulbs" :key="n" class="bulb"></span></div>
    <div class="bulb-row h bottom" aria-hidden="true"><span v-for="n in hBulbs" :key="n" class="bulb"></span></div>
    <div class="bulb-row v left" aria-hidden="true"><span v-for="n in vBulbs" :key="n" class="bulb"></span></div>
    <div class="bulb-row v right" aria-hidden="true"><span v-for="n in vBulbs" :key="n" class="bulb"></span></div>
    <div class="tablo-grid" :style="{ '--cols': layout.cols }">
      <template v-for="(row, r) in layout.rows" :key="r">
        <TabloCell
          v-for="(cell, c) in row"
          :key="`${r}-${c}`"
          :char="cell === null ? '' : (letters[cell] ?? '')"
          :blank="cell === null"
          :revealed="cell !== null && isRevealed(cell)"
          :delay="cell === null ? 0 : delayFor(cell)"
          :pickable="pickable && cell !== null"
          :instant="reduced === 'reduce'"
          :testid="cell === null ? undefined : `cell-${cell}`"
          @pick="cell !== null && emit('pick', letters[cell] ?? '')"
        />
      </template>
    </div>
  </div>
</template>

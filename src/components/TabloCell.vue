<script setup lang="ts">
import { Motion } from 'motion-v'

defineProps<{
  char: string
  revealed: boolean
  blank: boolean
  /** задержка переворота в секундах */
  delay: number
  pickable: boolean
  instant: boolean
  testid?: string
}>()
defineEmits<{ pick: [] }>()
</script>

<template>
  <div class="cell" :class="{ 'cell-pickable': pickable && !revealed }">
    <div v-if="blank" class="cell-blank"></div>
    <Motion
      v-else
      class="cell-inner"
      :initial="false"
      :animate="{ rotateY: revealed ? 180 : 0 }"
      :transition="{ duration: instant ? 0.01 : 0.65, delay: instant ? 0 : delay, ease: [0.4, 0.1, 0.2, 1] }"
    >
      <button
        type="button"
        class="cell-face cell-closed"
        :disabled="!pickable || revealed"
        :aria-label="revealed ? char : 'Закрытая ячейка'"
        :data-testid="testid"
        @click="$emit('pick')"
      ></button>
      <div class="cell-face cell-open" :data-revealed="revealed ? char : ''">{{ char }}</div>
    </Motion>
  </div>
</template>

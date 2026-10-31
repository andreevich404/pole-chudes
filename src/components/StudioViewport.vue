<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { studioMount } from "../three/studioBridge";

const element = ref<HTMLElement | null>(null);
onMounted(() => {
  studioMount.value = element.value;
});
onBeforeUnmount(() => {
  if (studioMount.value === element.value) studioMount.value = null;
});
</script>
<template>
  <section
    ref="element"
    class="studio-viewport"
    data-testid="studio-viewport"
    aria-label="Игровая сцена"
  >
    <slot />
  </section>
</template>

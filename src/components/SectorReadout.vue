<script setup lang="ts">
import { computed } from "vue";
import { studio } from "../three/studioBridge";
import { sectorIndexAtAngle } from "../game/engine";
import { SECTORS } from "../game/wheelSectors";
const sector = computed(
  () => SECTORS[sectorIndexAtAngle(studio.angle, SECTORS.length)]!,
);
</script>
<template>
  <aside class="sector-readout" :class="{ spinning: studio.spinning }">
    <span>{{ studio.spinning ? "ПОД УКАЗАТЕЛЕМ" : "ВЫПАЛ СЕКТОР" }}</span>
    <strong
      :style="{ color: sector.kind === 'bankrupt' ? '#f0a996' : '#f2d6a2' }"
      >{{ sector.label }}</strong
    >
    <small>{{ studio.spinning ? "Барабан вращается" : sector.hint }}</small>
  </aside>
</template>

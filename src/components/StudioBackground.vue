<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, watchEffect } from "vue";
import { usePreferredReducedMotion } from "@vueuse/core";
import { onFx } from "../three/effects";
import { hasWebGL } from "../three/support";
import { studio, studioMount } from "../three/studioBridge";
import { automaticView } from "../three/cameraDirector";
import { sectorIndexAtAngle, targetAngleForSector } from "../game/engine";
import { useGame, timing, wheelBridge } from "../composables/useGame";
import { SECTORS } from "../game/wheelSectors";
import { playSound } from "../composables/useSound";
import type { StudioScene } from "../three/studioScene";

const canvas = ref<HTMLCanvasElement | null>(null);
const reduced = usePreferredReducedMotion();
const game = useGame();
let scene: StudioScene | null = null,
  unmounted = false;
let offFx: (() => void) | null = null,
  stopWatch: (() => void) | null = null;
let frame = 0,
  finishSpin: ((idx: number) => void) | null = null;

watch(
  () => [game.state.phase, studio.spinning, studio.autoCamera] as const,
  ([phase, spinning, auto]) => {
    if (auto) studio.view = automaticView(phase, spinning);
  },
  { immediate: true, flush: "sync" },
);

function spin(forced?: number): Promise<number> {
  if (studio.spinning)
    return Promise.resolve(sectorIndexAtAngle(studio.angle, SECTORS.length));
  studio.spinning = true;
  studio.hasSpun = true;
  const from = studio.angle;
  const target = targetAngleForSector(
    from,
    forced ?? Math.floor(Math.random() * SECTORS.length),
    SECTORS.length,
    4,
    0.25 + Math.random() * 0.5,
  );
  const duration = Math.max(
    50,
    (reduced.value === "reduce" ? 450 : 6400) * timing.scale,
  );
  let elapsed = 0,
    lastTime = performance.now(),
    lastIdx = sectorIndexAtAngle(from, SECTORS.length);
  return new Promise((resolve) => {
    finishSpin = resolve;
    function tick(now: number) {
      // Pause with the page, preserving the deceleration curve on return.
      elapsed += Math.min(now - lastTime, 60);
      lastTime = now;
      const progress = Math.min(1, elapsed / duration);
      studio.angle = from + (target - from) * (1 - Math.pow(1 - progress, 4));
      scene?.setAngle(studio.angle);
      const idx = sectorIndexAtAngle(studio.angle, SECTORS.length);
      if (idx !== lastIdx) {
        playSound("tick");
        lastIdx = idx;
      }
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        studio.spinning = false;
        finishSpin = null;
        resolve(idx);
      }
    }
    frame = requestAnimationFrame(tick);
  });
}
watch(
  () => game.state.phase,
  (phase) => {
    if (phase === "roundIntro") studio.hasSpun = false;
    if (phase === "start") {
      studio.hasSpun = false;
      studio.autoCamera = true;
    }
    if (phase === "start" && studio.spinning) {
      cancelAnimationFrame(frame);
      studio.spinning = false;
      finishSpin?.(sectorIndexAtAngle(studio.angle, SECTORS.length));
      finishSpin = null;
    }
  },
);
function pick(e: PointerEvent) {
  const hit = scene?.pick(e.clientX, e.clientY);
  if (hit === "spin" && game.state.phase === "awaitSpin") game.humanSpin();
  else if (hit && hit !== "spin") game.pickPlusLetter(hit);
}
onMounted(async () => {
  if (!hasWebGL() || !canvas.value) {
    studio.failed = true;
    wheelBridge.spin = spin;
    return;
  }
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((r) => setTimeout(r, 1800)),
    ]);
    const { createStudioScene } = await import("../three/studioScene");
    if (unmounted || !canvas.value) return;
    scene = createStudioScene(canvas.value, {
      reduced: reduced.value === "reduce",
    });
    studio.ready = true;
    wheelBridge.spin = spin;
    offFx = onFx((n) => {
      if (n === "bankrupt") scene?.shake();
    });
    stopWatch = watchEffect(() => {
      const s = game.state;
      const superRound = s.phase.startsWith("super");
      scene?.update({
        answer:
          (superRound ? s.superQuestion?.answer : s.question?.answer) ?? "",
        guessed: [...(superRound ? s.superGuessed : s.guessed)],
        active: s.phase !== "start",
        current: s.current,
        players: s.players.map((p) => ({
          name: p.name,
          roundScore: p.roundScore,
        })),
        pickable: s.phase === "plusPick",
      });
      scene?.setView(studio.view);
    });
  } catch (error) {
    console.error("Не удалось создать 3D-студию", error);
    studio.failed = true;
    wheelBridge.spin = spin;
  }
});
onBeforeUnmount(() => {
  unmounted = true;
  cancelAnimationFrame(frame);
  finishSpin?.(sectorIndexAtAngle(studio.angle, SECTORS.length));
  studio.spinning = false;
  offFx?.();
  stopWatch?.();
  scene?.dispose();
  if (wheelBridge.spin === spin) wheelBridge.spin = null;
});
</script>

<template>
  <Teleport :to="studioMount ?? '#app'">
    <canvas
      ref="canvas"
      class="studio-canvas"
      :class="{ 'is-ready': studio.ready, 'is-contained': !!studioMount }"
      aria-label="Трёхмерная студия Поле чудес. Нажмите на барабан, чтобы вращать его."
      data-testid="studio-bg"
      :data-ready="studio.ready"
      :data-view="studio.view"
      :data-camera-mode="studio.autoCamera ? 'auto' : 'manual'"
      @pointerup="pick"
    />
  </Teleport>
  <div class="studio-vignette" aria-hidden="true"></div>
</template>

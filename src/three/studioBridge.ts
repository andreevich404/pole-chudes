import { reactive, shallowRef } from "vue";
import type { StudioView } from "./cameraDirector";
export type { StudioView } from "./cameraDirector";

// Teleport keeps the same canvas and WebGL context while moving it into the game grid.
export const studioMount = shallowRef<HTMLElement | null>(null);
export const studio = reactive({
  ready: false,
  failed: false,
  view: "wide" as StudioView,
  autoCamera: true,
  angle: 0,
  spinning: false,
  hasSpun: false,
});

import type { Phase } from "../types";

export type StudioView = "wide" | "wheel" | "board";

export function automaticView(phase: Phase, spinning: boolean): StudioView {
  if (spinning) return "wheel";
  switch (phase) {
    case "awaitSpin":
    case "spinning":
      return "wheel";
    case "chooseLetter":
    case "enterWord":
    case "plusPick":
    case "revealing":
    case "botThinking":
    case "roundEnd":
    case "superIntro":
    case "superPick":
    case "superWord":
    case "superResult":
      return "board";
    default:
      return "wide";
  }
}

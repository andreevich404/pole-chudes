import { describe, expect, it } from "vitest";
import { automaticView } from "./cameraDirector";

describe("automatic studio camera", () => {
  it("follows a full turn from wheel to board and back", () => {
    const phases = [
      "awaitSpin",
      "spinning",
      "chooseLetter",
      "enterWord",
      "revealing",
      "roundEnd",
      "passing",
    ] as const;
    expect(phases.map((phase) => automaticView(phase, false))).toEqual([
      "wheel",
      "wheel",
      "board",
      "board",
      "board",
      "board",
      "wide",
    ]);
  });
  it("keeps bot spins on the wheel until the disc stops", () => {
    expect(automaticView("botThinking", true)).toBe("wheel");
    expect(automaticView("botThinking", false)).toBe("board");
  });
  it("shows the board for free picks and every stage of the supergame", () => {
    for (const phase of [
      "plusPick",
      "superIntro",
      "superPick",
      "superWord",
      "superResult",
    ] as const) {
      expect(automaticView(phase, false)).toBe("board");
    }
  });
  it("opens on the wide shot and returns there for prizes and final results", () => {
    for (const phase of [
      "start",
      "roundIntro",
      "prizeChoice",
      "gameOver",
    ] as const) {
      expect(automaticView(phase, false)).toBe("wide");
    }
  });
});

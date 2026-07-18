/**
 * Drives the Director headlessly (no canvas, no rAF) by calling its private
 * scene/tick machinery, to verify dialogue choice behavior end to end.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { Director } from "../src/engine/Director";
import { useUIStore } from "../src/engine/store";
import { ericWeedSprayerStory } from "../src/stories/eric-weed-sprayer/story";

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeDirector(): any {
  return new Director(ericWeedSprayerStory) as any;
}

/** Advance the director's game clock, mimicking the rAF frame loop. */
function tick(d: any, ms: number, step = 50) {
  for (let t = 0; t < ms; t += step) {
    d.elapsed += step;
    d.tick(step);
  }
}

describe("dialogue choices", () => {
  beforeEach(() => {
    useUIStore.setState({
      phase: "loading",
      dialogue: null,
      countdown: null,
      ending: null,
    });
  });

  it("typewriter reveals, then tap advances lines, choices on last line", () => {
    const d = makeDirector();
    d.enterScene("door");
    tick(d, 100);
    expect(useUIStore.getState().dialogue!.revealed).toBe(false);
    d.tapDialogue(); // skip typewriter
    expect(useUIStore.getState().dialogue!.revealed).toBe(true);
    expect(useUIStore.getState().dialogue!.choices).toBeNull(); // line 1 of 2
    d.tapDialogue(); // next line
    d.tapDialogue(); // skip typewriter on line 2
    expect(useUIStore.getState().dialogue!.choices).toHaveLength(2);
  });

  it("auto-selects the default choice after autoChooseAfterMs", () => {
    const d = makeDirector();
    d.enterScene("door");
    d.tapDialogue();
    d.tapDialogue();
    d.tapDialogue(); // both lines fully revealed -> countdown arms
    tick(d, 9900);
    expect(d.sceneId).toBe("door");
    tick(d, 300);
    expect(d.sceneId).toBe("yard-1"); // default "yes" fired
  });

  it("tapping a choice cancels the countdown and navigates", () => {
    const d = makeDirector();
    d.enterScene("door");
    d.tapDialogue();
    d.tapDialogue();
    d.tapDialogue();
    tick(d, 3000);
    d.selectChoice("no");
    expect(d.sceneId).toBe("door-refused");
    expect(useUIStore.getState().countdown).toBeNull();
  });

  it("rapid double-selection is idempotent", () => {
    const d = makeDirector();
    d.enterScene("door");
    d.tapDialogue();
    d.tapDialogue();
    d.tapDialogue();
    d.selectChoice("no");
    const after = d.sceneId;
    d.selectChoice("yes"); // second tap must be ignored
    expect(d.sceneId).toBe(after);
  });

  it("ending fake choices show gag text without navigating", () => {
    const d = makeDirector();
    d.enterScene("bill");
    d.selectChoice("pay");
    const ending = useUIStore.getState().ending!;
    expect(ending.resultText).toMatch(/still owe/i);
    expect(d.sceneId).toBe("bill");
  });
});

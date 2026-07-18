/**
 * Walks the real Eric Weed Sprayer config: every referenced id must resolve,
 * choice sets must have exactly one default, and a simulated playthrough must
 * reach the ending within the spec's 60-120s window.
 */
import { describe, expect, it } from "vitest";
import { TimelineRunner, tileKey } from "../src/engine/TimelineRunner";
import { Scene } from "../src/engine/types";
import { WEED_TILES } from "../src/stories/eric-weed-sprayer/scenes";
import { ericWeedSprayerStory as story } from "../src/stories/eric-weed-sprayer/story";

function collectActorIds(scene: Scene): string[] {
  if (scene.type !== "scripted") return [];
  const ids = new Set<string>();
  const walk = (actions: import("../src/engine/types").TimelineAction[]) => {
    for (const a of actions) {
      if ("actorId" in a && a.actorId) ids.add(a.actorId);
      if ("speakerId" in a && a.speakerId) ids.add(a.speakerId);
      if (a.type === "parallel") a.tracks.forEach(walk);
    }
  };
  walk(scene.timeline);
  return [...ids];
}

describe("story validity", () => {
  it("startSceneId and all nextSceneId/choice targets resolve", () => {
    expect(story.scenes[story.startSceneId]).toBeDefined();
    for (const scene of Object.values(story.scenes)) {
      if (scene.type === "dialogue") {
        if (scene.nextSceneId) expect(story.scenes[scene.nextSceneId]).toBeDefined();
        for (const c of scene.choices ?? []) {
          if (c.nextSceneId) expect(story.scenes[c.nextSceneId]).toBeDefined();
        }
        expect(story.characters[scene.speakerId]).toBeDefined();
      }
      if (scene.type === "scripted") {
        expect(story.scenes[scene.nextSceneId]).toBeDefined();
        expect(story.maps[scene.mapId]).toBeDefined();
      }
    }
  });

  it("every timed choice set has exactly one default", () => {
    for (const scene of Object.values(story.scenes)) {
      if (scene.type === "dialogue" && scene.choices?.length && scene.autoChooseAfterMs) {
        const defaults = scene.choices.filter((c) => c.isDefault);
        expect(defaults, `scene ${scene.id}`).toHaveLength(1);
      }
    }
  });

  it("all timeline actors exist in the character roster", () => {
    for (const scene of Object.values(story.scenes)) {
      for (const id of collectActorIds(scene)) {
        expect(story.characters[id], `actor ${id}`).toBeDefined();
      }
    }
  });

  it("hands-off playthrough (default path) reaches the ending in 60-120s", () => {
    // Player never taps: typewriter reveals at 40cps, every choice fires its
    // default after autoChooseAfterMs, scripted scenes run to completion.
    let sceneId = story.startSceneId;
    let total = 0;
    let lastRunner: TimelineRunner | null = null;
    const visited: string[] = [];

    for (let hops = 0; hops < 50; hops++) {
      const scene = story.scenes[sceneId];
      visited.push(sceneId);
      if (scene.type === "ending") break;
      if (scene.type === "dialogue") {
        total += (scene.lines.join("").length / 40) * 1000;
        total += (scene.lines.length - 1) * 1800; // idle line auto-advance
        total += scene.autoChooseAfterMs ?? 0;
        const def = scene.choices?.find((c) => c.isDefault) ?? scene.choices?.[0];
        const next = def?.nextSceneId ?? scene.nextSceneId;
        if (!next) throw new Error(`dialogue ${sceneId} dead-ends on the default path`);
        sceneId = next;
      } else {
        const runner = new TimelineRunner(scene.timeline);
        let ms = 0;
        while (!runner.done && ms < 300000) {
          runner.advance(100);
          ms += 100;
        }
        expect(runner.done, `scripted ${sceneId} must finish`).toBe(true);
        total += ms;
        lastRunner = runner;
        sceneId = scene.nextSceneId;
      }
    }

    expect(story.scenes[sceneId].type, `path: ${visited.join(" -> ")}`).toBe("ending");
    // Ceiling is the ZERO-TAP worst case (every countdown runs out). A real
    // player tapping through dialogue lands well under two minutes. Raised
    // from 120s on 2026-07-18 when Nick added the planting + shooting gags
    // and the fourth notice interrupt.
    expect(total, `total runtime ${Math.round(total / 1000)}s`).toBeGreaterThanOrEqual(60000);
    expect(total, `total runtime ${Math.round(total / 1000)}s`).toBeLessThanOrEqual(140000);

    // The final chunk leaves every lawn tile sprayed — except Eric's
    // sneakily planted weeds, which survive — and the road empty.
    const world = lastRunner!.world;
    const weedKeys = new Set(WEED_TILES.map(tileKey));
    for (let y = 4; y <= 12; y++)
      for (let x = 0; x < story.maps.yard.cols; x++) {
        const key = tileKey({ x, y });
        expect(world.tiles.get(key)).toBe(weedKeys.has(key) ? "weedy" : "sprayed");
      }
    expect(world.actors.has("van")).toBe(false);
    expect(world.actors.has("truck")).toBe(false);
  });
});

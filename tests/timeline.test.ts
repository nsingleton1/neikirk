import { describe, expect, it } from "vitest";
import { TimelineRunner, tileKey } from "../src/engine/TimelineRunner";
import { TimelineAction } from "../src/engine/types";

describe("TimelineRunner", () => {
  it("consumes wait time exactly and cascades leftover budget", () => {
    const checkpoints: string[] = [];
    const r = new TimelineRunner(
      [
        { type: "wait", ms: 500 },
        { type: "checkpoint", id: "a" },
        { type: "wait", ms: 500 },
        { type: "checkpoint", id: "b" },
      ],
      { onCheckpoint: (id) => checkpoints.push(id) },
    );
    r.advance(499);
    expect(checkpoints).toEqual([]);
    r.advance(1);
    expect(checkpoints).toEqual(["a"]);
    // One big tick should cascade through the remaining wait and finish.
    r.advance(5000);
    expect(checkpoints).toEqual(["a", "b"]);
    expect(r.done).toBe(true);
  });

  it("moves an actor at the requested tiles/sec", () => {
    const r = new TimelineRunner([
      { type: "spawn", actorId: "x", at: { x: 0, y: 0 } },
      { type: "moveTo", actorId: "x", to: { x: 4, y: 0 }, speed: 2 },
    ]);
    r.advance(1000); // 2 tiles
    expect(r.world.actors.get("x")!.pos.x).toBeCloseTo(2, 5);
    expect(r.world.actors.get("x")!.facing).toBe("right");
    r.advance(1000);
    expect(r.world.actors.get("x")!.pos.x).toBeCloseTo(4, 5);
    expect(r.done).toBe(true);
  });

  it("follows multi-segment paths and updates facing per segment", () => {
    const r = new TimelineRunner([
      { type: "spawn", actorId: "x", at: { x: 0, y: 0 } },
      {
        type: "followPath",
        actorId: "x",
        path: [
          { x: 2, y: 0 },
          { x: 2, y: 2 },
        ],
        speed: 2,
      },
    ]);
    r.advance(1500); // 3 tiles of 4 total
    const a = r.world.actors.get("x")!;
    expect(a.pos.x).toBeCloseTo(2, 5);
    expect(a.pos.y).toBeCloseTo(1, 5);
    expect(a.facing).toBe("down");
  });

  it("parallel joins when ALL tracks finish", () => {
    const seen: string[] = [];
    const r = new TimelineRunner(
      [
        {
          type: "parallel",
          tracks: [[{ type: "wait", ms: 300 }], [{ type: "wait", ms: 900 }]],
        },
        { type: "checkpoint", id: "after" },
      ],
      { onCheckpoint: (id) => seen.push(id) },
    );
    r.advance(600);
    expect(seen).toEqual([]);
    r.advance(300);
    expect(seen).toEqual(["after"]);
  });

  it("sets tile states and expires emotes", () => {
    const r = new TimelineRunner([
      { type: "spawn", actorId: "x", at: { x: 0, y: 0 } },
      { type: "setTile", tile: { x: 3, y: 4 }, state: "sprayed" },
      { type: "emote", actorId: "x", emote: "z", durationMs: 1000 },
      { type: "wait", ms: 2000 },
    ]);
    r.advance(500);
    expect(r.world.tiles.get(tileKey({ x: 3, y: 4 }))).toBe("sprayed");
    expect(r.world.emotes).toHaveLength(1);
    r.advance(1000);
    expect(r.world.emotes).toHaveLength(0);
  });

  it("a huge single advance completes the whole timeline (fast-seek)", () => {
    const actions: TimelineAction[] = [
      { type: "spawn", actorId: "x", at: { x: 0, y: 0 } },
    ];
    for (let i = 0; i < 20; i++) {
      actions.push({ type: "moveTo", actorId: "x", to: { x: i % 5, y: 0 }, speed: 4 });
      actions.push({ type: "wait", ms: 250 });
    }
    const r = new TimelineRunner(actions);
    r.advance(10 * 60 * 1000);
    expect(r.done).toBe(true);
  });

  it("anim with duration restores the previous animation", () => {
    const r = new TimelineRunner([
      { type: "spawn", actorId: "x", at: { x: 0, y: 0 } },
      { type: "anim", actorId: "x", name: "spray", durationMs: 400 },
    ]);
    r.advance(200);
    expect(r.world.actors.get("x")!.anim).toBe("spray");
    r.advance(300);
    expect(r.world.actors.get("x")!.anim).toBe("idle");
  });
});

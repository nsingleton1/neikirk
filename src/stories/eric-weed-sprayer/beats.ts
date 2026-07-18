/**
 * Story-flavored beat builders. These expand the spec's high-level actions
 * (sprayTile, checkPhone, nap, vehicle confrontation...) into engine
 * primitives, keeping all story knowledge out of src/engine.
 */
import { TimelineAction, Vec } from "../../engine/types";
import { ROAD_Y, SIDEWALK_Y } from "./characters";

export const ERIC = "eric";

/** Walk to a lawn tile and spray it. */
export function sprayTile(tile: Vec): TimelineAction[] {
  return [
    { type: "moveTo", actorId: ERIC, to: tile, speed: 2.5 },
    { type: "face", actorId: ERIC, dir: "down" },
    { type: "anim", actorId: ERIC, name: "spray", durationMs: 1400 },
    { type: "setTile", tile, state: "sprayed" },
  ];
}

export function phoneCheck(ms: number, emote?: string): TimelineAction[] {
  const actions: TimelineAction[] = [];
  if (emote) {
    actions.push({
      type: "parallel",
      tracks: [
        [{ type: "anim", actorId: ERIC, name: "phone", durationMs: ms }],
        [
          { type: "wait", ms: 500 },
          { type: "emote", actorId: ERIC, emote, durationMs: ms - 700 },
        ],
      ],
    });
  } else {
    actions.push({ type: "anim", actorId: ERIC, name: "phone", durationMs: ms });
  }
  return actions;
}

export function sitAndScroll(ms: number, emote: string): TimelineAction[] {
  return [
    {
      type: "parallel",
      tracks: [
        [{ type: "anim", actorId: ERIC, name: "sit", durationMs: ms }],
        [
          { type: "wait", ms: 700 },
          { type: "emote", actorId: ERIC, emote, durationMs: ms - 900 },
        ],
      ],
    },
  ];
}

export function nap(ms: number, deep = false): TimelineAction[] {
  const zTrack: TimelineAction[] = [{ type: "wait", ms: 400 }];
  let t = 400;
  let n = 0;
  while (t + 1300 < ms) {
    zTrack.push({
      type: "emote",
      actorId: ERIC,
      emote: deep ? "ZZZ" : n % 2 === 0 ? "z" : "Zz",
      durationMs: 1200,
    });
    zTrack.push({ type: "wait", ms: 1300 });
    t += 1300;
    n++;
  }
  return [
    {
      type: "parallel",
      tracks: [[{ type: "anim", actorId: ERIC, name: "nap", durationMs: ms }], zTrack],
    },
  ];
}

export interface VisitOpts {
  vehicleId: string;
  driverId: string;
  /** Road x where the vehicle stops. */
  parkX: number;
  /** Where the driver stands to yell (usually just below Eric). */
  confrontAt: Vec;
  /** ms both parties spend arguing. */
  argueMs: number;
  bubbles?: string;
}

/**
 * A vehicle drives in, the driver gets out, both driver and Eric shake
 * fists / argue, the driver leaves, the vehicle drives off.
 * Used for both Nick's recurring red-van drive-bys (short argueMs) and
 * Schmidt's big yellow-truck blowup (long argueMs).
 */
export function vehicleConfrontation(o: VisitOpts): TimelineAction[] {
  const argue: TimelineAction[] = [
    {
      type: "parallel",
      tracks: [
        [
          { type: "anim", actorId: o.driverId, name: "argue" },
          { type: "shake", actorId: o.driverId, durationMs: o.argueMs },
          { type: "stopAnim", actorId: o.driverId },
        ],
        [
          { type: "face", actorId: ERIC, dir: "down" },
          { type: "wait", ms: 400 },
          { type: "anim", actorId: ERIC, name: "argue" },
          { type: "shake", actorId: ERIC, durationMs: o.argueMs - 400 },
          { type: "stopAnim", actorId: ERIC },
        ],
        o.bubbles
          ? [
              { type: "wait", ms: 600 },
              {
                type: "speechBubble",
                actorId: o.driverId,
                symbols: o.bubbles,
                durationMs: 1600,
              },
              { type: "wait", ms: 1800 },
              {
                type: "speechBubble",
                actorId: ERIC,
                symbols: o.bubbles.split("").reverse().join(""),
                durationMs: 1600,
              },
            ]
          : [],
      ],
    },
  ];
  return [
    // vehicle rolls in
    { type: "spawn", actorId: o.vehicleId, at: { x: -2, y: ROAD_Y }, facing: "right", anim: "drive" },
    {
      type: "parallel",
      tracks: [
        [{ type: "moveTo", actorId: o.vehicleId, to: { x: o.parkX, y: ROAD_Y }, speed: 6 }],
        [{ type: "anim", actorId: ERIC, name: "idle" }],
      ],
    },
    { type: "anim", actorId: o.vehicleId, name: "idle" },
    // driver hops out and marches up
    { type: "spawn", actorId: o.driverId, at: { x: o.parkX, y: SIDEWALK_Y } },
    { type: "moveTo", actorId: o.driverId, to: o.confrontAt, speed: 3.5 },
    { type: "face", actorId: o.driverId, dir: "up" },
    ...argue,
    // driver stomps back, vehicle leaves
    { type: "moveTo", actorId: o.driverId, to: { x: o.parkX, y: SIDEWALK_Y }, speed: 3.5 },
    { type: "despawn", actorId: o.driverId },
    { type: "anim", actorId: o.vehicleId, name: "drive" },
    { type: "moveTo", actorId: o.vehicleId, to: { x: 12, y: ROAD_Y }, speed: 8 },
    { type: "despawn", actorId: o.vehicleId },
  ];
}

/** Instantly mark a rectangular block of lawn as sprayed (post-timeskip). */
export function sprayAll(x0: number, y0: number, x1: number, y1: number): TimelineAction[] {
  const actions: TimelineAction[] = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      actions.push({ type: "setTile", tile: { x, y }, state: "sprayed" });
  return actions;
}

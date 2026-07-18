import { DialogueScene, Scene, TimelineAction, Vec } from "../../engine/types";
import { urls } from "./assets";
import {
  ERIC,
  nap,
  plantWeeds,
  sprayAll,
  sprayTile,
  vehicleConfrontation,
} from "./beats";

/**
 * The yard story is split into chunks so Stardew-style "notice" prompts can
 * interrupt it: [yard chunk] -> "You notice Erik ..." [Y/N] -> Eric's
 * conman excuse (portrait dialogue) -> next chunk. World state carries
 * across chunks by re-seeding: each chunk spawns Eric where the last one
 * left him and re-marks the tiles sprayed so far.
 */

// Tiles sprayed on-screen, cumulative per chunk boundary.
const CHUNK1_TILES: Vec[] = [{ x: 2, y: 5 }];
const CHUNK2_TILES: Vec[] = [...CHUNK1_TILES, { x: 4, y: 6 }];
const CHUNK3_TILES: Vec[] = [...CHUNK2_TILES, { x: 6, y: 5 }];

/** Tiles where Eric sneakily plants NEW weeds. The FIRST one happens right
 * away — it's the first thing the player catches him doing. They all
 * survive the final time-skip spray. */
const WEEDS_1: Vec[] = [{ x: 3, y: 6 }];
export const WEED_TILES: Vec[] = [...WEEDS_1, { x: 5, y: 5 }, { x: 6, y: 7 }];

/** Where Schmidt's drive-by shots land — clear MISSES beside Eric. The pocks
 * stay in the lawn until the final time-skip "fixes" everything but the weeds. */
const POCK_TILES: Vec[] = [
  { x: 7, y: 6 },
  { x: 5, y: 6 },
];

const carry = (tiles: Vec[]): TimelineAction[] =>
  tiles.map((tile) => ({ type: "setTile", tile, state: "sprayed" }));

const carryWeeds = (tiles: Vec[] = WEED_TILES): TimelineAction[] =>
  tiles.map((tile) => ({ type: "setTile", tile, state: "weedy" }));

/** Chunk 1 (SHORT): one tile of real work, then he's immediately caught
 * planting a weed — the first notice of the game. */
const yard1: TimelineAction[] = [
  { type: "spawn", actorId: ERIC, at: { x: 4.5, y: 4 }, facing: "down" },
  { type: "showDialogue", speakerId: ERIC, text: "Alright. Time to get to work.", durationMs: 1600 },
  { type: "checkpoint", id: "work-started" },
  ...sprayTile({ x: 2, y: 5 }),
  ...plantWeeds(WEEDS_1),
  { type: "anim", actorId: ERIC, name: "plant" },
];

/** Chunk 2: real work, a nap, the van confrontation, then the tree. */
const yard2: TimelineAction[] = [
  ...carry(CHUNK1_TILES),
  ...carryWeeds(WEEDS_1),
  { type: "spawn", actorId: ERIC, at: { x: 3, y: 6 }, facing: "down" },
  { type: "checkpoint", id: "van-1" },
  ...sprayTile({ x: 4, y: 6 }),
  ...nap(1500),
  ...vehicleConfrontation({
    vehicleId: "van",
    driverId: "nick",
    parkX: 4,
    confrontAt: { x: 4, y: 7 },
    argueMs: 2000,
    bubbles: "#?!*",
  }),
  // wanders to the tree...
  { type: "moveTo", actorId: ERIC, to: { x: 7, y: 6 }, speed: 3 },
  { type: "face", actorId: ERIC, dir: "right" },
  { type: "anim", actorId: ERIC, name: "pee", durationMs: 900 },
  { type: "anim", actorId: ERIC, name: "pee" },
];

/** Chunk 3: more "work" and planting, the truck argument + drive-by,
 * straight into a nap. */
const yard3: TimelineAction[] = [
  ...carry(CHUNK2_TILES),
  ...carryWeeds(WEEDS_1),
  { type: "spawn", actorId: ERIC, at: { x: 7, y: 6 }, facing: "left" },
  { type: "checkpoint", id: "truck" },
  ...sprayTile({ x: 6, y: 5 }),
  ...plantWeeds([{ x: 5, y: 5 }, { x: 6, y: 7 }]),
  ...vehicleConfrontation({
    vehicleId: "truck",
    driverId: "schmidt",
    parkX: 6,
    confrontAt: { x: 6, y: 8.6 },
    argueMs: 2000,
    bubbles: "#?!*",
    driveByShots: { missTiles: POCK_TILES },
  }),
  { type: "moveTo", actorId: ERIC, to: { x: 4, y: 8 }, speed: 3 },
  ...nap(1600),
  { type: "emote", actorId: ERIC, emote: "ZZZ", durationMs: 2000 },
  { type: "anim", actorId: ERIC, name: "nap" },
];

/** Chunk 4: fancy car, one last tile, the deep nap, and the time skip. */
const yard4: TimelineAction[] = [
  ...carry(CHUNK3_TILES),
  ...carryWeeds(),
  ...POCK_TILES.map((tile): TimelineAction => ({ type: "setTile", tile, state: "pock" })),
  { type: "spawn", actorId: ERIC, at: { x: 4, y: 8 }, facing: "down" },
  { type: "checkpoint", id: "fancy-car" },
  ...vehicleConfrontation({
    vehicleId: "fancycar",
    driverId: "fancy",
    parkX: 5,
    confrontAt: { x: 4, y: 9 },
    argueMs: 2000,
    bubbles: "$#!*",
  }),
  ...sprayTile({ x: 6, y: 9 }),
  ...nap(1800, true),
  { type: "checkpoint", id: "final-stretch" },
  { type: "showDialogue", speakerId: ERIC, text: "Whew. Hard day's work.", durationMs: 1600 },
  { type: "timeSkip", label: "6 HOURS LATER...", durationMs: 1800 },
  ...sprayAll(0, 4, 9, 12),
  ...carryWeeds(), // his planted weeds survive the "finished" lawn
  { type: "moveTo", actorId: ERIC, to: { x: 4.5, y: 12 }, speed: 3 },
  { type: "face", actorId: ERIC, dir: "down" },
  { type: "showDialogue", speakerId: ERIC, text: "All done. I'll send you the bill.", durationMs: 2000 },
  { type: "wait", ms: 400 },
];

/** "You notice Erik ..." interrupt prompt. Saying something is the default. */
function notice(id: string, text: string, excuseSceneId: string, nextChunkId: string): DialogueScene {
  return {
    id,
    type: "dialogue",
    speakerId: "you",
    lines: [`${text} Should you say something?`],
    choices: [
      { id: "yes", label: "SAY SOMETHING", nextSceneId: excuseSceneId, isDefault: true },
      { id: "no", label: "LET IT SLIDE", nextSceneId: nextChunkId },
    ],
    autoChooseAfterMs: 3000,
  };
}

/** Eric YELLS at you for daring to ask. Always the angry portrait. */
function excuse(id: string, lines: string[], nextChunkId: string): DialogueScene {
  return {
    id,
    type: "dialogue",
    speakerId: ERIC,
    expression: "annoyed",
    backgroundUrl: urls.doorBg,
    lines,
    choices: [{ id: "ok", label: "SORRY I ASKED", nextSceneId: nextChunkId, isDefault: true }],
    autoChooseAfterMs: 3000,
  };
}

const scripted = (id: string, timeline: TimelineAction[], nextSceneId: string): Scene => ({
  id,
  type: "scripted",
  mapId: "yard",
  timeline,
  nextSceneId,
});

export const scenes: Record<string, Scene> = {
  door: {
    id: "door",
    type: "dialogue",
    speakerId: ERIC,
    expression: "default",
    backgroundUrl: urls.doorBg,
    lines: ["Hello, my name is Erik.", "May I spray your weeds?"],
    choices: [
      { id: "yes", label: "YES, PLEASE", nextSceneId: "yard-1", isDefault: true },
      { id: "no", label: "ABSOLUTELY NOT", nextSceneId: "door-refused" },
    ],
    autoChooseAfterMs: 10000,
  },
  "door-refused": {
    id: "door-refused",
    type: "dialogue",
    speakerId: ERIC,
    expression: "annoyed",
    backgroundUrl: urls.doorBg,
    lines: [
      "DON'T spray the weeds?! DON'T?!",
      "Look at this lawn. It's a DISASTER.",
      "I'm spraying the weeds ANYWAY.",
    ],
    choices: [{ id: "wait", label: "WAIT, NO—", nextSceneId: "yard-1", isDefault: true }],
    autoChooseAfterMs: 4000,
  },

  "yard-1": scripted("yard-1", yard1, "notice-plant"),
  "notice-plant": notice(
    "notice-plant",
    "You notice Erik planting NEW weeds in your lawn.",
    "excuse-plant",
    "yard-2",
  ),
  "excuse-plant": excuse(
    "excuse-plant",
    [
      "PLANTING weeds?! I REMOVE weeds. It is LITERALLY my job.",
      "Those weeds were always there. NOBODY else sees these 'new weeds.'",
    ],
    "yard-2",
  ),

  "yard-2": scripted("yard-2", yard2, "notice-pee"),
  "notice-pee": notice(
    "notice-pee",
    "You notice Erik peeing on your tree.",
    "excuse-pee",
    "yard-3",
  ),
  "excuse-pee": excuse(
    "excuse-pee",
    [
      "Peeing? On a TREE? Do you HEAR yourself right now?",
      "There isn't even a tree over there. I'm worried about you.",
    ],
    "yard-3",
  ),

  "yard-3": scripted("yard-3", yard3, "notice-nap"),
  "notice-nap": notice(
    "notice-nap",
    "You notice Erik napping in your flower bed.",
    "excuse-nap",
    "yard-4",
  ),
  "excuse-nap": excuse(
    "excuse-nap",
    [
      "NAPPING?! There were no z's. Nobody saw any z's.",
      "Frankly it's weird how long you've been watching me.",
    ],
    "yard-4",
  ),

  "yard-4": scripted("yard-4", yard4, "bill"),

  bill: {
    id: "bill",
    type: "ending",
    headline: "YOU OWE ERIK $10,000.",
    subtext: "The weeds have been sprayed.",
    fakeChoices: [
      {
        id: "pay",
        label: "PAY NOW",
        resultText: "Payment failed. You still owe Erik $10,000.",
      },
      {
        id: "dispute",
        label: "DISPUTE CHARGE",
        resultText: "Dispute denied. You now also owe Erik $10,000 in legal fees.",
      },
    ],
    showRestart: true,
    showShare: true,
  },
};

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
 * interrupt it: [yard chunk] -> "You notice Eric ..." [Y/N] -> Eric's
 * conman excuse (portrait dialogue) -> next chunk. World state carries
 * across chunks by re-seeding: each chunk spawns Eric where the last one
 * left him and re-marks the tiles sprayed so far.
 */

// Tiles sprayed on-screen, cumulative per chunk boundary.
const CHUNK1_TILES: Vec[] = [
  { x: 2, y: 5 },
  { x: 4, y: 6 },
];
const CHUNK2_TILES: Vec[] = [...CHUNK1_TILES, { x: 6, y: 5 }];
const CHUNK3_TILES: Vec[] = [...CHUNK2_TILES, { x: 3, y: 8 }];

/** Tiles where Eric sneakily plants NEW weeds — it's the running gag, so he
 * does it in every chunk. They all survive the final time-skip spray. */
const WEEDS_1: Vec[] = [{ x: 3, y: 6 }];
const WEEDS_2: Vec[] = [...WEEDS_1, { x: 5, y: 5 }];
export const WEED_TILES: Vec[] = [...WEEDS_2, { x: 5, y: 7 }, { x: 6, y: 7 }];

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

/** Chunk 1: gets to work, first naps, van drive-by #1, then... the tree. */
const yard1: TimelineAction[] = [
  { type: "spawn", actorId: ERIC, at: { x: 4.5, y: 4 }, facing: "down" },
  { type: "showDialogue", speakerId: ERIC, text: "Alright. Time to get to work.", durationMs: 1800 },
  { type: "checkpoint", id: "work-started" },
  ...sprayTile({ x: 2, y: 5 }),
  ...plantWeeds(WEEDS_1),
  ...sprayTile({ x: 4, y: 6 }),
  ...nap(1700),
  { type: "checkpoint", id: "van-1" },
  ...vehicleConfrontation({
    vehicleId: "van",
    driverId: "nick",
    parkX: 4,
    confrontAt: { x: 4, y: 7 },
    argueMs: 1800,
  }),
  // wanders to the tree...
  { type: "moveTo", actorId: ERIC, to: { x: 7, y: 6 }, speed: 2.5 },
  { type: "face", actorId: ERIC, dir: "right" },
  { type: "anim", actorId: ERIC, name: "pee", durationMs: 900 },
  { type: "anim", actorId: ERIC, name: "pee" },
];

/** Chunk 2: back to "work", plants another, naps, then the mailbox. */
const yard2: TimelineAction[] = [
  ...carry(CHUNK1_TILES),
  ...carryWeeds(WEEDS_1),
  { type: "spawn", actorId: ERIC, at: { x: 7, y: 6 }, facing: "left" },
  { type: "checkpoint", id: "chunk-2" },
  ...sprayTile({ x: 6, y: 5 }),
  ...plantWeeds([{ x: 5, y: 5 }]),
  ...nap(1700),
  { type: "moveTo", actorId: ERIC, to: { x: 8.6, y: 12 }, speed: 2.8 },
  { type: "face", actorId: ERIC, dir: "down" },
  { type: "anim", actorId: ERIC, name: "phone", durationMs: 1000 }, // rummaging
  { type: "anim", actorId: ERIC, name: "phone" },
];

/** Chunk 2b: the big planting operation — two at once, caught in the act. */
const yard2b: TimelineAction[] = [
  ...carry(CHUNK2_TILES),
  ...carryWeeds(WEEDS_2),
  { type: "spawn", actorId: ERIC, at: { x: 8.6, y: 12 }, facing: "down" },
  { type: "checkpoint", id: "planting" },
  { type: "moveTo", actorId: ERIC, to: { x: 5.5, y: 8 }, speed: 2.8 },
  ...plantWeeds([{ x: 5, y: 7 }, { x: 6, y: 7 }]),
  { type: "anim", actorId: ERIC, name: "plant" },
];

/** Chunk 3: the big yellow-truck argument, a spray, straight into a nap. */
const yard3: TimelineAction[] = [
  ...carry(CHUNK2_TILES),
  ...carryWeeds(),
  { type: "spawn", actorId: ERIC, at: { x: 6, y: 7 }, facing: "down" },
  { type: "checkpoint", id: "truck" },
  ...vehicleConfrontation({
    vehicleId: "truck",
    driverId: "schmidt",
    parkX: 6,
    confrontAt: { x: 6, y: 8.6 },
    argueMs: 2400,
    bubbles: "#?!*",
    driveByShots: { missTiles: POCK_TILES },
  }),
  { type: "showDialogue", speakerId: ERIC, text: "Some people, huh.", durationMs: 1200 },
  ...sprayTile({ x: 3, y: 8 }),
  ...nap(1800),
  { type: "anim", actorId: ERIC, name: "nap" },
];

/** Chunk 4: van #2, one last tile, the deep nap, and the time skip. */
const yard4: TimelineAction[] = [
  ...carry(CHUNK3_TILES),
  ...carryWeeds(),
  ...POCK_TILES.map((tile): TimelineAction => ({ type: "setTile", tile, state: "pock" })),
  { type: "spawn", actorId: ERIC, at: { x: 3, y: 8 }, facing: "down" },
  { type: "checkpoint", id: "van-2" },
  ...vehicleConfrontation({
    vehicleId: "van",
    driverId: "nick",
    parkX: 5,
    confrontAt: { x: 4, y: 9 },
    argueMs: 2200,
    bubbles: "!!",
  }),
  ...sprayTile({ x: 6, y: 9 }),
  ...nap(2000, true),
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

/** "You notice Eric ..." interrupt prompt. Saying something is the default. */
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
    autoChooseAfterMs: 3400,
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
    autoChooseAfterMs: 3400,
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
    lines: ["Hello, my name is Eric.", "May I spray your weeds?"],
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
    lines: ["...", "I'll take that as a yes."],
    choices: [{ id: "sigh", label: "*sigh*", nextSceneId: "yard-1", isDefault: true }],
    autoChooseAfterMs: 6000,
  },

  "yard-1": scripted("yard-1", yard1, "notice-pee"),
  "notice-pee": notice(
    "notice-pee",
    "You notice Eric peeing on your tree.",
    "excuse-pee",
    "yard-2",
  ),
  "excuse-pee": excuse(
    "excuse-pee",
    ["EXCUSE ME?! That is a nitrogen-rich PRE-TREATMENT!", "I cannot BELIEVE you would even ask me that!"],
    "yard-2",
  ),

  "yard-2": scripted("yard-2", yard2, "notice-mail"),
  "notice-mail": notice(
    "notice-mail",
    "You notice Eric going through your mail.",
    "excuse-mail",
    "yard-2b",
  ),
  "excuse-mail": excuse(
    "excuse-mail",
    ["Oh, NOW you have questions?!", "I am looking for COUPONS! For YOU! You're welcome!!"],
    "yard-2b",
  ),

  "yard-2b": scripted("yard-2b", yard2b, "notice-plant"),
  "notice-plant": notice(
    "notice-plant",
    "You notice Eric planting NEW weeds in your lawn.",
    "excuse-plant",
    "yard-3",
  ),
  "excuse-plant": excuse(
    "excuse-plant",
    ["THOSE ARE DECOY WEEDS!! They lure out the REAL weeds!", "This is ADVANCED LAWN SCIENCE and you are RUINING it!"],
    "yard-3",
  ),

  "yard-3": scripted("yard-3", yard3, "notice-nap"),
  "notice-nap": notice(
    "notice-nap",
    "You notice Eric napping in your flower bed.",
    "excuse-nap",
    "yard-4",
  ),
  "excuse-nap": excuse(
    "excuse-nap",
    ["I was NOT SLEEPING! I was LISTENING to the LAWN!", "The AUDACITY. The weeds FEAR a rested man!!"],
    "yard-4",
  ),

  "yard-4": scripted("yard-4", yard4, "bill"),

  bill: {
    id: "bill",
    type: "ending",
    headline: "YOU OWE ERIC $10,000.",
    subtext: "The weeds have been sprayed.",
    fakeChoices: [
      {
        id: "pay",
        label: "PAY NOW",
        resultText: "Payment failed. You still owe Eric $10,000.",
      },
      {
        id: "dispute",
        label: "DISPUTE CHARGE",
        resultText: "Dispute denied. You now also owe Eric $10,000 in legal fees.",
      },
    ],
    showRestart: true,
    showShare: true,
  },
};

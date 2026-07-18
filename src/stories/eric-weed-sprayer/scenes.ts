import { DialogueScene, Scene, TimelineAction, Vec } from "../../engine/types";
import { urls } from "./assets";
import {
  ERIC,
  nap,
  phoneCheck,
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

const carry = (tiles: Vec[]): TimelineAction[] =>
  tiles.map((tile) => ({ type: "setTile", tile, state: "sprayed" }));

/** Chunk 1: gets to work, first naps, van drive-by #1, then... the tree. */
const yard1: TimelineAction[] = [
  { type: "spawn", actorId: ERIC, at: { x: 4.5, y: 4 }, facing: "down" },
  { type: "showDialogue", speakerId: ERIC, text: "Alright. Time to get to work.", durationMs: 1800 },
  { type: "checkpoint", id: "work-started" },
  ...sprayTile({ x: 2, y: 5 }),
  ...phoneCheck(1300),
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

/** Chunk 2: back to "work", another nap, then the mailbox. */
const yard2: TimelineAction[] = [
  ...carry(CHUNK1_TILES),
  { type: "spawn", actorId: ERIC, at: { x: 7, y: 6 }, facing: "left" },
  { type: "checkpoint", id: "chunk-2" },
  ...sprayTile({ x: 6, y: 5 }),
  ...phoneCheck(2000, "..."),
  ...nap(1700),
  { type: "moveTo", actorId: ERIC, to: { x: 8.6, y: 12 }, speed: 2.8 },
  { type: "face", actorId: ERIC, dir: "down" },
  { type: "anim", actorId: ERIC, name: "phone", durationMs: 1000 }, // rummaging
  { type: "anim", actorId: ERIC, name: "phone" },
];

/** Chunk 3: the big yellow-truck argument, a spray, straight into a nap. */
const yard3: TimelineAction[] = [
  ...carry(CHUNK2_TILES),
  { type: "spawn", actorId: ERIC, at: { x: 8.6, y: 12 }, facing: "down" },
  { type: "checkpoint", id: "truck" },
  ...vehicleConfrontation({
    vehicleId: "truck",
    driverId: "schmidt",
    parkX: 7,
    confrontAt: { x: 7.6, y: 12 },
    argueMs: 3200,
    bubbles: "#?!*",
  }),
  { type: "showDialogue", speakerId: ERIC, text: "Some people, huh.", durationMs: 1200 },
  ...sprayTile({ x: 3, y: 8 }),
  ...nap(1800),
  { type: "anim", actorId: ERIC, name: "nap" },
];

/** Chunk 4: van #2, one last tile, the deep nap, and the time skip. */
const yard4: TimelineAction[] = [
  ...carry(CHUNK3_TILES),
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
    lines: [text, "Should you say something?"],
    choices: [
      { id: "yes", label: "SAY SOMETHING", nextSceneId: excuseSceneId, isDefault: true },
      { id: "no", label: "LET IT SLIDE", nextSceneId: nextChunkId },
    ],
    autoChooseAfterMs: 4000,
  };
}

/** Eric's portrait-dialogue con. He lies his way out of everything. */
function excuse(
  id: string,
  expression: string,
  lines: string[],
  nextChunkId: string,
): DialogueScene {
  return {
    id,
    type: "dialogue",
    speakerId: ERIC,
    expression,
    backgroundUrl: urls.doorBg,
    lines,
    choices: [{ id: "ok", label: "...OKAY?", nextSceneId: nextChunkId, isDefault: true }],
    autoChooseAfterMs: 4000,
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
    "default",
    ["Whoa, whoa. This is a nitrogen-rich pre-treatment.", "Very expensive. You're welcome."],
    "yard-2",
  ),

  "yard-2": scripted("yard-2", yard2, "notice-mail"),
  "notice-mail": notice(
    "notice-mail",
    "You notice Eric going through your mail.",
    "excuse-mail",
    "yard-3",
  ),
  "excuse-mail": excuse(
    "excuse-mail",
    "annoyed",
    ["Relax. I'm checking for coupons.", "For YOU. Weed control is a team effort."],
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
    "tired",
    ["I was NOT sleeping. I was listening to the lawn.", "The weeds fear a rested man."],
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

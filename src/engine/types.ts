/**
 * Engine-generic story schema. No story-specific content (names, jokes,
 * dollar amounts) may appear in this file or any other src/engine file.
 */

export type Direction = "up" | "down" | "left" | "right";

export interface Vec {
  x: number;
  y: number;
}

export interface AnimationDef {
  /** Frame indices into the sheet, left-to-right top-to-bottom. */
  frames: number[];
  fps: number;
  loop?: boolean;
}

export interface SpriteSheetDef {
  url: string;
  frameW: number;
  frameH: number;
  animations: Record<string, AnimationDef>;
}

export interface CharacterDef {
  name: string;
  /** expression id -> portrait image url */
  portraits?: Record<string, string>;
  sprite?: SpriteSheetDef;
}

export interface MapDef {
  cols: number;
  rows: number;
  tileSize: number;
  /** Background image spanning cols*tileSize x rows*tileSize. */
  backgroundUrl: string;
  /** tile state id -> overlay image url (drawn on top of a tile). */
  tileOverlays?: Record<string, string>;
}

export interface Choice {
  id: string;
  label: string;
  nextSceneId?: string;
  isDefault?: boolean;
  /** For fake choices on ending screens: gag text shown instead of navigating. */
  resultText?: string;
}

export interface DialogueScene {
  id: string;
  type: "dialogue";
  speakerId: string;
  expression?: string;
  backgroundUrl?: string;
  lines: string[];
  choices?: Choice[];
  /** Countdown starts once the final line is fully revealed. */
  autoChooseAfterMs?: number;
  /** Used when there are no choices (tap through to next scene). */
  nextSceneId?: string;
}

export interface ScriptedScene {
  id: string;
  type: "scripted";
  mapId: string;
  timeline: TimelineAction[];
  nextSceneId: string;
}

export interface EndingScene {
  id: string;
  type: "ending";
  headline: string;
  subtext?: string;
  fakeChoices?: Choice[];
  showRestart: boolean;
  showShare?: boolean;
}

export type Scene = DialogueScene | ScriptedScene | EndingScene;

export type TimelineAction =
  | { type: "spawn"; actorId: string; at: Vec; facing?: Direction; anim?: string }
  | { type: "despawn"; actorId: string }
  | { type: "moveTo"; actorId: string; to: Vec; speed?: number }
  | { type: "followPath"; actorId: string; path: Vec[]; speed?: number }
  | { type: "face"; actorId: string; dir: Direction }
  | { type: "anim"; actorId: string; name: string; durationMs?: number }
  | { type: "stopAnim"; actorId: string }
  | { type: "wait"; ms: number }
  | { type: "setTile"; tile: Vec; state: string }
  | { type: "emote"; actorId: string; emote: string; durationMs: number }
  | { type: "speechBubble"; actorId: string; symbols: string; durationMs: number }
  | { type: "showDialogue"; speakerId: string; text: string; durationMs?: number }
  | { type: "checkpoint"; id: string }
  | { type: "timeSkip"; label?: string; durationMs: number }
  | { type: "shake"; actorId: string; durationMs: number }
  | { type: "parallel"; tracks: TimelineAction[][] };

export interface StoryConfig {
  id: string;
  /** Bump to invalidate old saved checkpoints. */
  version: number;
  title: string;
  startSceneId: string;
  characters: Record<string, CharacterDef>;
  maps: Record<string, MapDef>;
  scenes: Record<string, Scene>;
  share?: { title: string; text: string };
}

/** Default movement speed in tiles per second when an action omits `speed`. */
export const DEFAULT_MOVE_SPEED = 3;

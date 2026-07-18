import { create } from "zustand";
import { Choice } from "./types";

export type UIPhase =
  | "loading"
  | "dialogue"
  | "scripted"
  | "ending"
  | "error";

export interface DialogueUIState {
  speakerName: string;
  portraitUrl: string | null;
  /** Full text of the current line; the typewriter reveals it. */
  text: string;
  /** True once the typewriter has fully revealed the text. */
  revealed: boolean;
  choices: Choice[] | null;
  isLastLine: boolean;
  backgroundUrl: string | null;
}

export interface CountdownUIState {
  /** Game-clock ms when the countdown started. */
  startedAt: number;
  durationMs: number;
  /** Remaining fraction 0..1, updated by the Director each frame. */
  remaining: number;
}

export interface EndingUIState {
  headline: string;
  subtext: string | null;
  fakeChoices: Choice[];
  showRestart: boolean;
  showShare: boolean;
  /** Gag text after tapping a fake choice. */
  resultText: string | null;
}

export interface OverlayDialogueUI {
  speakerName: string;
  text: string;
}

export interface DebugUIState {
  sceneId: string;
  timelineMs: number;
  speed: number;
}

export interface UIState {
  phase: UIPhase;
  loadProgress: number;
  dialogue: DialogueUIState | null;
  countdown: CountdownUIState | null;
  ending: EndingUIState | null;
  /** Small dialogue strip over the scripted scene. */
  overlayDialogue: OverlayDialogueUI | null;
  timeSkipLabel: string | null;
  paused: boolean;
  rotateBlocked: boolean;
  errorMessage: string | null;
  debug: DebugUIState;
}

export const useUIStore = create<UIState>(() => ({
  phase: "loading",
  loadProgress: 0,
  dialogue: null,
  countdown: null,
  ending: null,
  overlayDialogue: null,
  timeSkipLabel: null,
  paused: false,
  rotateBlocked: false,
  errorMessage: null,
  debug: { sceneId: "", timelineMs: 0, speed: 1 },
}));

/** The Director writes via this; components only read via useUIStore selectors. */
export const setUI = (partial: Partial<UIState>) => useUIStore.setState(partial);

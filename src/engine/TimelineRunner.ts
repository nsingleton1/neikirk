import {
  DEFAULT_MOVE_SPEED,
  Direction,
  TimelineAction,
  Vec,
} from "./types";

export interface ActorState {
  id: string;
  pos: Vec;
  facing: Direction;
  anim: string | null;
  /** Timeline time (ms) at which the current anim started. */
  animStartedAt: number;
  visible: boolean;
}

export interface TransientMarker {
  actorId: string;
  text: string;
  until: number;
}

export interface WorldState {
  /** Timeline-local elapsed ms. */
  now: number;
  actors: Map<string, ActorState>;
  /** "x,y" -> tile state id */
  tiles: Map<string, string>;
  emotes: TransientMarker[];
  bubbles: TransientMarker[];
  overlayDialogue: { speakerId: string; text: string } | null;
  timeSkip: { label: string; until: number } | null;
  /** actorId -> shake end time */
  shakes: Map<string, number>;
}

export interface RunnerEvents {
  onCheckpoint?: (id: string) => void;
}

export const tileKey = (t: Vec) => `${t.x},${t.y}`;

function createWorld(): WorldState {
  return {
    now: 0,
    actors: new Map(),
    tiles: new Map(),
    emotes: [],
    bubbles: [],
    overlayDialogue: null,
    timeSkip: null,
    shakes: new Map(),
  };
}

function dirBetween(from: Vec, to: Vec): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}

/** Blocking in-flight action state. */
type Active =
  | { kind: "wait"; remaining: number }
  | {
      kind: "move";
      actorId: string;
      waypoints: Vec[];
      segment: number;
      speed: number;
      prevAnim: string | null;
    }
  | { kind: "animFor"; actorId: string; remaining: number; prevAnim: string | null }
  | { kind: "shake"; actorId: string; remaining: number }
  | { kind: "dialogue"; remaining: number }
  | { kind: "timeSkip"; remaining: number }
  | { kind: "parallel"; tracks: TrackRunner[] };

/**
 * Executes one sequential list of actions. `advance` consumes up to `dt` ms
 * and returns the unconsumed remainder (cascading through as many actions as
 * the budget covers), so large dt values fast-forward correctly.
 */
class TrackRunner {
  private index = 0;
  private active: Active | null = null;

  constructor(
    private actions: TimelineAction[],
    private world: WorldState,
    private events: RunnerEvents,
  ) {}

  get done(): boolean {
    return this.active === null && this.index >= this.actions.length;
  }

  advance(dt: number): number {
    let budget = dt;
    // Guard: instant actions consume no time, so cap iterations defensively.
    let guard = 100000;
    while (guard-- > 0) {
      if (this.active) {
        budget = this.progressActive(budget);
        if (this.active) return 0; // budget exhausted mid-action
      }
      if (this.index >= this.actions.length) return budget;
      const action = this.actions[this.index++];
      this.begin(action);
    }
    throw new Error("TimelineRunner: runaway loop (instant-action cycle?)");
  }

  private setAnim(actorId: string, anim: string | null) {
    const a = this.world.actors.get(actorId);
    if (!a) return;
    a.anim = anim;
    a.animStartedAt = this.world.now;
  }

  private begin(action: TimelineAction): void {
    const w = this.world;
    switch (action.type) {
      case "spawn":
        w.actors.set(action.actorId, {
          id: action.actorId,
          pos: { ...action.at },
          facing: action.facing ?? "down",
          anim: action.anim ?? "idle",
          animStartedAt: w.now,
          visible: true,
        });
        return;
      case "despawn":
        w.actors.delete(action.actorId);
        return;
      case "face": {
        const a = w.actors.get(action.actorId);
        if (a) a.facing = action.dir;
        return;
      }
      case "setTile":
        w.tiles.set(tileKey(action.tile), action.state);
        return;
      case "checkpoint":
        this.events.onCheckpoint?.(action.id);
        return;
      case "emote":
        w.emotes.push({
          actorId: action.actorId,
          text: action.emote,
          until: w.now + action.durationMs,
        });
        return;
      case "speechBubble":
        w.bubbles.push({
          actorId: action.actorId,
          text: action.symbols,
          until: w.now + action.durationMs,
        });
        return;
      case "stopAnim":
        this.setAnim(action.actorId, "idle");
        return;
      case "anim": {
        const prev = w.actors.get(action.actorId)?.anim ?? null;
        this.setAnim(action.actorId, action.name);
        if (action.durationMs !== undefined) {
          this.active = {
            kind: "animFor",
            actorId: action.actorId,
            remaining: action.durationMs,
            prevAnim: prev,
          };
        }
        return;
      }
      case "wait":
        this.active = { kind: "wait", remaining: action.ms };
        return;
      case "shake": {
        w.shakes.set(action.actorId, w.now + action.durationMs);
        this.active = { kind: "shake", actorId: action.actorId, remaining: action.durationMs };
        return;
      }
      case "showDialogue":
        w.overlayDialogue = { speakerId: action.speakerId, text: action.text };
        this.active = { kind: "dialogue", remaining: action.durationMs ?? 2200 };
        return;
      case "timeSkip":
        w.timeSkip = { label: action.label ?? "LATER...", until: w.now + action.durationMs };
        this.active = { kind: "timeSkip", remaining: action.durationMs };
        return;
      case "moveTo":
      case "followPath": {
        const a = w.actors.get(action.actorId);
        if (!a) return; // moving a missing actor is a no-op, not a crash
        const path = action.type === "moveTo" ? [action.to] : action.path;
        const prev = a.anim;
        const sheetHint = "walk";
        this.setAnim(action.actorId, sheetHint);
        this.active = {
          kind: "move",
          actorId: action.actorId,
          waypoints: path.map((p) => ({ ...p })),
          segment: 0,
          speed: action.speed ?? DEFAULT_MOVE_SPEED,
          prevAnim: prev,
        };
        return;
      }
      case "parallel":
        this.active = {
          kind: "parallel",
          tracks: action.tracks.map((t) => new TrackRunner(t, w, this.events)),
        };
        return;
    }
  }

  /** Returns leftover budget; clears this.active when the action completes. */
  private progressActive(budget: number): number {
    const act = this.active!;
    const w = this.world;
    switch (act.kind) {
      case "wait":
      case "animFor":
      case "shake":
      case "dialogue":
      case "timeSkip": {
        const used = Math.min(budget, act.remaining);
        act.remaining -= used;
        if (act.remaining <= 0) {
          if (act.kind === "animFor") this.setAnim(act.actorId, act.prevAnim ?? "idle");
          if (act.kind === "dialogue") w.overlayDialogue = null;
          this.active = null;
        }
        return budget - used;
      }
      case "move": {
        const a = w.actors.get(act.actorId);
        if (!a) {
          this.active = null;
          return budget;
        }
        let remainingTiles = (budget / 1000) * act.speed;
        let usedTiles = 0;
        while (act.segment < act.waypoints.length && remainingTiles > 0) {
          const target = act.waypoints[act.segment];
          const dx = target.x - a.pos.x;
          const dy = target.y - a.pos.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1e-6) {
            act.segment++;
            continue;
          }
          a.facing = dirBetween(a.pos, target);
          const step = Math.min(dist, remainingTiles);
          a.pos.x += (dx / dist) * step;
          a.pos.y += (dy / dist) * step;
          remainingTiles -= step;
          usedTiles += step;
          if (step >= dist - 1e-9) act.segment++;
        }
        if (act.segment >= act.waypoints.length) {
          this.setAnim(act.actorId, act.prevAnim === "walk" ? "idle" : act.prevAnim ?? "idle");
          this.active = null;
        }
        const usedMs = (usedTiles / act.speed) * 1000;
        return Math.max(0, budget - usedMs);
      }
      case "parallel": {
        // All tracks share the same time budget; the parallel block finishes
        // when every track is done. Leftover = min leftover across tracks.
        let minLeftover = budget;
        for (const t of act.tracks) {
          const left = t.advance(budget);
          minLeftover = Math.min(minLeftover, left);
        }
        if (act.tracks.every((t) => t.done)) {
          this.active = null;
          return minLeftover;
        }
        return 0;
      }
    }
  }
}

export class TimelineRunner {
  readonly world: WorldState;
  private root: TrackRunner;

  constructor(actions: TimelineAction[], events: RunnerEvents = {}) {
    this.world = createWorld();
    this.root = new TrackRunner(actions, this.world, events);
  }

  get done(): boolean {
    return this.root.done;
  }

  /** Advance timeline time by dt ms (already speed-scaled by the caller). */
  advance(dt: number): void {
    if (this.done) return;
    this.world.now += dt;
    this.root.advance(dt);
    this.expireTransients();
  }

  private expireTransients(): void {
    const w = this.world;
    w.emotes = w.emotes.filter((e) => e.until > w.now);
    w.bubbles = w.bubbles.filter((b) => b.until > w.now);
    if (w.timeSkip && w.timeSkip.until <= w.now) w.timeSkip = null;
  }
}

import { AssetLoader } from "./AssetLoader";
import { SceneRenderer } from "./SceneRenderer";
import { TimelineRunner } from "./TimelineRunner";
import { clearCheckpoint, loadCheckpoint, saveCheckpoint } from "./storage";
import { setUI, useUIStore } from "./store";
import { DialogueScene, Scene, ScriptedScene, StoryConfig } from "./types";

const TYPEWRITER_CPS = 40;
const DT_CLAMP_MS = 100;
/** Non-final dialogue lines auto-advance this long after fully revealing,
 * so an idle player is never stuck before a choice's countdown can arm. */
const LINE_AUTO_ADVANCE_MS = 1800;

interface DialogueRuntime {
  scene: DialogueScene;
  lineIndex: number;
  /** Game-clock ms when the current line started revealing. */
  revealStart: number;
  revealed: boolean;
  /** Game-clock ms when the current line finished revealing. */
  revealedAt: number | null;
  countdownStart: number | null;
  resolved: boolean;
}

export class Director {
  readonly assets = new AssetLoader();
  private elapsed = 0; // game-clock ms (speed-scaled, pause-frozen)
  private speed = 1;
  private paused = false;
  private rotateBlocked = false;
  private rafId: number | null = null;
  private lastTs: number | null = null;

  private sceneId = "";
  private dialogue: DialogueRuntime | null = null;
  private runner: TimelineRunner | null = null;
  private renderer: SceneRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private lastCheckpointId: string | undefined;
  private reducedMotion =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(private story: StoryConfig) {}

  // ---------- lifecycle ----------

  async start(): Promise<void> {
    try {
      // Never block the first scene on images: dialogue text renders
      // immediately and the portrait pops in when its PNG arrives.
      this.assets.preload(this.criticalAssetUrls());
      this.assets.preload(this.allAssetUrls());
      this.installListeners();
      const save = loadCheckpoint(this.story.id, this.story.version);
      const resumeScene = save && this.story.scenes[save.sceneId] ? save.sceneId : null;
      this.enterScene(resumeScene ?? this.story.startSceneId, save?.checkpointId);
      this.loop();
    } catch (err) {
      setUI({
        phase: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.rebuildRenderer();
  }

  detachCanvas(): void {
    this.canvas = null;
    this.renderer = null;
  }

  resizeCanvas(cssW: number, cssH: number): void {
    this.renderer?.fitTo(cssW, cssH);
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  // ---------- public UI entry points ----------

  tapDialogue(): void {
    const d = this.dialogue;
    if (!d || d.resolved) return;
    if (!d.revealed) {
      d.revealed = true;
      d.revealedAt = this.elapsed;
      this.pushDialogueUI();
      this.maybeStartCountdown();
      return;
    }
    if (d.lineIndex < d.scene.lines.length - 1) {
      this.advanceLine();
      return;
    }
    // Last line fully shown: with choices, wait for a choice tap; without,
    // tap advances.
    if (!d.scene.choices?.length) {
      d.resolved = true;
      if (d.scene.nextSceneId) this.enterScene(d.scene.nextSceneId);
    }
  }

  selectChoice(choiceId: string): void {
    const scene = this.currentScene();
    if (scene.type === "dialogue") {
      const d = this.dialogue;
      if (!d || d.resolved) return;
      const choice = d.scene.choices?.find((c) => c.id === choiceId);
      if (!choice) return;
      d.resolved = true;
      setUI({ countdown: null });
      if (choice.nextSceneId) this.enterScene(choice.nextSceneId);
      return;
    }
    if (scene.type === "ending") {
      const choice = scene.fakeChoices?.find((c) => c.id === choiceId);
      if (!choice) return;
      if (choice.resultText) {
        const ending = useUIStore.getState().ending;
        if (ending) setUI({ ending: { ...ending, resultText: choice.resultText } });
      }
    }
  }

  restart(): void {
    clearCheckpoint(this.story.id);
    this.enterScene(this.story.startSceneId);
  }

  setSpeed(s: number): void {
    this.speed = s;
    setUI({ debug: { ...useUIStore.getState().debug, speed: s } });
  }

  skipScene(): void {
    const scene = this.currentScene();
    const next =
      scene.type === "scripted"
        ? scene.nextSceneId
        : scene.type === "dialogue"
          ? (scene.choices?.find((c) => c.isDefault) ?? scene.choices?.[0])
              ?.nextSceneId ?? scene.nextSceneId
          : undefined;
    if (next) this.enterScene(next);
  }

  restartScene(): void {
    this.enterScene(this.sceneId);
  }

  // ---------- scene machinery ----------

  private currentScene(): Scene {
    return this.story.scenes[this.sceneId];
  }

  private enterScene(sceneId: string, seekCheckpointId?: string): void {
    const scene = this.story.scenes[sceneId];
    if (!scene) {
      setUI({ phase: "error", errorMessage: `Unknown scene: ${sceneId}` });
      return;
    }
    this.sceneId = sceneId;
    this.dialogue = null;
    this.runner = null;
    this.lastCheckpointId = undefined;
    setUI({
      dialogue: null,
      countdown: null,
      ending: null,
      overlayDialogue: null,
      timeSkipLabel: null,
      debug: { ...useUIStore.getState().debug, sceneId },
    });

    if (scene.type !== "ending") {
      saveCheckpoint({ storyId: this.story.id, version: this.story.version, sceneId });
    }

    switch (scene.type) {
      case "dialogue": {
        this.dialogue = {
          scene,
          lineIndex: 0,
          revealStart: this.elapsed,
          revealed: this.reducedMotion,
          revealedAt: this.reducedMotion ? this.elapsed : null,
          countdownStart: null,
          resolved: false,
        };
        setUI({ phase: "dialogue" });
        this.pushDialogueUI();
        return;
      }
      case "scripted": {
        this.runner = new TimelineRunner(scene.timeline, {
          onCheckpoint: (id) => {
            this.lastCheckpointId = id;
            saveCheckpoint({
              storyId: this.story.id,
              version: this.story.version,
              sceneId,
              checkpointId: id,
            });
          },
        });
        this.rebuildRenderer();
        if (seekCheckpointId) this.seekTo(seekCheckpointId);
        setUI({ phase: "scripted" });
        return;
      }
      case "ending": {
        clearCheckpoint(this.story.id);
        setUI({
          phase: "ending",
          ending: {
            headline: scene.headline,
            subtext: scene.subtext ?? null,
            fakeChoices: scene.fakeChoices ?? [],
            showRestart: scene.showRestart,
            showShare: scene.showShare ?? false,
            resultText: null,
          },
        });
        return;
      }
    }
  }

  /** Fast-forward the fresh runner until the named checkpoint fires. If the
   * checkpoint no longer exists (stale save), restart the scene cleanly
   * instead of leaving a fully fast-forwarded runner that would skip it. */
  private seekTo(checkpointId: string): void {
    const scene = this.currentScene();
    if (scene.type !== "scripted") return;
    let reached = false;
    let guard = 20000;
    while (!reached && !this.runner!.done && guard-- > 0) {
      this.runner!.advance(50);
      if (this.lastCheckpointId === checkpointId) reached = true;
    }
    if (!reached) {
      this.runner = new TimelineRunner(scene.timeline, {
        onCheckpoint: (id) => {
          this.lastCheckpointId = id;
          saveCheckpoint({
            storyId: this.story.id,
            version: this.story.version,
            sceneId: this.sceneId,
            checkpointId: id,
          });
        },
      });
    }
  }

  private rebuildRenderer(): void {
    const scene = this.story.scenes[this.sceneId];
    if (!this.canvas || !scene || scene.type !== "scripted") return;
    const map = this.story.maps[scene.mapId];
    this.renderer = new SceneRenderer(
      this.canvas,
      map,
      this.story.characters,
      this.assets,
    );
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) this.renderer.fitTo(rect.width, rect.height);
  }

  // ---------- frame loop ----------

  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.frame);
  };

  private frame = (ts: number): void => {
    const rawDt = this.lastTs === null ? 16 : ts - this.lastTs;
    this.lastTs = ts;
    const dt = Math.min(rawDt, DT_CLAMP_MS) * this.speed;
    if (!this.paused && !this.rotateBlocked) {
      this.elapsed += dt;
      this.tick(dt);
    }
    this.loop();
  };

  private tick(dt: number): void {
    const scene = this.currentScene();
    if (!scene) return;
    if (scene.type === "dialogue") this.tickDialogue();
    else if (scene.type === "scripted") this.tickScripted(dt, scene);
    setUI({
      debug: {
        ...useUIStore.getState().debug,
        timelineMs: Math.round(this.runner?.world.now ?? this.elapsed),
      },
    });
  }

  private advanceLine(): void {
    const d = this.dialogue!;
    d.lineIndex++;
    d.revealStart = this.elapsed;
    d.revealed = this.reducedMotion;
    d.revealedAt = this.reducedMotion ? this.elapsed : null;
    this.pushDialogueUI();
  }

  private tickDialogue(): void {
    const d = this.dialogue;
    if (!d || d.resolved) return;
    if (!d.revealed) {
      const text = d.scene.lines[d.lineIndex];
      const shown = Math.floor(((this.elapsed - d.revealStart) / 1000) * TYPEWRITER_CPS);
      if (shown >= text.length) {
        d.revealed = true;
        d.revealedAt = this.elapsed;
        this.maybeStartCountdown();
      }
      this.pushDialogueUI();
      return;
    }
    // Idle players are never stuck: non-final lines advance on their own.
    if (
      d.lineIndex < d.scene.lines.length - 1 &&
      d.revealedAt !== null &&
      this.elapsed - d.revealedAt >= LINE_AUTO_ADVANCE_MS
    ) {
      this.advanceLine();
      return;
    }
    this.maybeStartCountdown();
    if (d.countdownStart !== null && d.scene.autoChooseAfterMs) {
      const total = d.scene.autoChooseAfterMs;
      const left = Math.max(0, total - (this.elapsed - d.countdownStart));
      const remaining = Math.round((left / total) * 100) / 100;
      const cd = useUIStore.getState().countdown;
      if (!cd || cd.remaining !== remaining) {
        setUI({
          countdown: { startedAt: d.countdownStart, durationMs: total, remaining },
        });
      }
      if (left <= 0) {
        const def =
          d.scene.choices?.find((c) => c.isDefault) ?? d.scene.choices?.[0];
        if (def) this.selectChoice(def.id);
      }
    }
  }

  private maybeStartCountdown(): void {
    const d = this.dialogue;
    if (!d || d.countdownStart !== null) return;
    const isLastLine = d.lineIndex === d.scene.lines.length - 1;
    if (d.revealed && isLastLine && d.scene.choices?.length && d.scene.autoChooseAfterMs) {
      d.countdownStart = this.elapsed;
    }
  }

  private pushDialogueUI(): void {
    const d = this.dialogue;
    if (!d) return;
    const speaker = this.story.characters[d.scene.speakerId];
    const text = d.scene.lines[d.lineIndex];
    const shownChars = d.revealed
      ? text.length
      : Math.min(
          text.length,
          Math.floor(((this.elapsed - d.revealStart) / 1000) * TYPEWRITER_CPS),
        );
    const isLastLine = d.lineIndex === d.scene.lines.length - 1;
    setUI({
      dialogue: {
        speakerName: speaker?.name ?? d.scene.speakerId,
        portraitUrl: speaker?.portraits?.[d.scene.expression ?? "default"] ?? null,
        text: text.slice(0, shownChars),
        revealed: d.revealed,
        choices: d.revealed && isLastLine ? d.scene.choices ?? null : null,
        isLastLine,
        backgroundUrl: d.scene.backgroundUrl ?? null,
      },
    });
  }

  private tickScripted(dt: number, scene: ScriptedScene): void {
    const runner = this.runner;
    if (!runner) return;
    runner.advance(dt);
    const w = runner.world;
    const state = useUIStore.getState();
    const overlay = w.overlayDialogue
      ? {
          speakerName:
            this.story.characters[w.overlayDialogue.speakerId]?.name ??
            w.overlayDialogue.speakerId,
          text: w.overlayDialogue.text,
        }
      : null;
    if (
      (state.overlayDialogue?.text ?? null) !== (overlay?.text ?? null) ||
      (state.timeSkipLabel ?? null) !== (w.timeSkip?.label ?? null)
    ) {
      setUI({ overlayDialogue: overlay, timeSkipLabel: w.timeSkip?.label ?? null });
    }
    this.renderer?.render(w);
    if (runner.done) this.enterScene(scene.nextSceneId);
  }

  // ---------- environment listeners ----------

  private installListeners(): void {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        this.paused = document.hidden;
        setUI({ paused: this.paused });
      });
      window.addEventListener("pagehide", () => {
        // Checkpoint already saved incrementally; nothing else to flush.
      });
    }
    if (typeof matchMedia !== "undefined") {
      const mq = matchMedia("(orientation: portrait)");
      const apply = () => {
        this.rotateBlocked = !mq.matches;
        setUI({ rotateBlocked: this.rotateBlocked });
      };
      mq.addEventListener?.("change", apply);
      apply();
    }
  }

  // ---------- asset staging ----------

  private criticalAssetUrls(): string[] {
    const start = this.story.scenes[this.story.startSceneId];
    const urls: string[] = [];
    if (start?.type === "dialogue") {
      if (start.backgroundUrl) urls.push(start.backgroundUrl);
      const speaker = this.story.characters[start.speakerId];
      if (speaker?.portraits) urls.push(...Object.values(speaker.portraits));
    }
    return urls;
  }

  private allAssetUrls(): string[] {
    const urls: string[] = [];
    for (const c of Object.values(this.story.characters)) {
      if (c.portraits) urls.push(...Object.values(c.portraits));
      if (c.sprite) urls.push(c.sprite.url);
    }
    for (const m of Object.values(this.story.maps)) {
      urls.push(m.backgroundUrl);
      if (m.tileOverlays) urls.push(...Object.values(m.tileOverlays));
    }
    for (const s of Object.values(this.story.scenes)) {
      if (s.type === "dialogue" && s.backgroundUrl) urls.push(s.backgroundUrl);
    }
    return urls;
  }

  /** Ensure a scripted scene's assets are present before it plays. */
  async ensureSceneAssets(sceneId: string): Promise<void> {
    const scene = this.story.scenes[sceneId];
    if (scene?.type !== "scripted") return;
    const map = this.story.maps[scene.mapId];
    const urls = [map.backgroundUrl, ...Object.values(map.tileOverlays ?? {})];
    for (const c of Object.values(this.story.characters)) {
      if (c.sprite) urls.push(c.sprite.url);
    }
    await this.assets.loadAll(urls);
  }
}

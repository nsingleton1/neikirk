# Eric Weed Sprayer

A mobile-first, portrait-only, browser pixel-art joke game. Eric offers to
spray your weeds. He works very, very slowly. You owe him $10,000.

Built as a **reusable story engine** + swappable story content: a new
friend-group story is new config and PNGs, not new code.

**Play:** https://nsingleton1.github.io/neikirk/

## Setup & run

```bash
npm install
npm run dev        # http://localhost:5173/neikirk/  (debug panel enabled)
npm test           # vitest: engine, choices, storage, full-playthrough
npm run build      # typecheck + production bundle in dist/
npm run gen:art    # regenerate placeholder pixel art into public/assets/
```

Deploys automatically to GitHub Pages on every push to `main`
(`.github/workflows/deploy.yml` — tests must pass first). One-time repo
setting: Settings → Pages → Source = **GitHub Actions**.

## How it's put together

```
src/engine/    reusable, story-agnostic:
  types.ts        story/scene/timeline schema (the content contract)
  Director.ts     master game clock, scene lifecycle, pause/rotate/speed
  TimelineRunner  sequential interpreter w/ parallel tracks; big-dt fast-seek
  SceneRenderer   canvas: native-res draw, integer-scale nearest-neighbor blit
  storage.ts      localStorage checkpoint save/resume (24h TTL)
src/ui/        React overlays: dialogue box, choices, countdown, ending,
               rotate overlay, DEV-only debug panel (skip / 2x / 4x)
src/stories/eric-weed-sprayer/
  story.ts        StoryConfig root (id, version, start scene)
  characters.ts   cast + map defs
  assets.ts       asset URLs + sprite-sheet frame layouts
  beats.ts        story beats -> engine primitives (sprayTile, nap, visits)
  scenes.ts       the actual script: yard chunks, notices, excuses, ending
```

The yard is several scripted chunks with Stardew-style interrupts between
them: *"You notice Eric peeing on your tree. Should you say something?"* —
saying something gets you Eric's portrait dialogue where he lies his way out.
World state carries across chunks by re-seeding (each chunk re-marks tiles
sprayed so far and spawns Eric where he left off).

## Editing content (no engine changes needed)

- **Dialogue / jokes / pacing:** `src/stories/eric-weed-sprayer/scenes.ts`.
  Every duration, notice, excuse line, and choice label lives there.
  `tests/story-validity.test.ts` enforces the hands-off playthrough stays
  within 60–120s — run `npm test` after pacing edits.
- **Cast & vehicles:** `characters.ts`. Actors are just characters with
  sprite sheets; vehicles are actors too.
- **Timed choices:** any dialogue scene's `autoChooseAfterMs` + exactly one
  `isDefault: true` choice.

## Replacing placeholder art with real art

All art is flat PNGs in `public/assets/`, loaded by URL — overwrite a file
1:1 and you're done. Sheet layouts (documented in `assets.ts`):

- `characters/*.png` — 8 columns of 16×24 frames:
  idle(0-1) walk(2-3) spray(4-5) phone(6-7) sit(8-9) nap(10-11) argue(12-13) pee(14-15)
- `vehicles/*.png` — two 40×24 side-profile frames, facing right (engine
  mirrors for leftward travel)
- `portraits/eric-*.png` — 64×64, one per expression (smirk/annoyed/tired/phone)
- `maps/yard.png` — 160×256 (10×16 tiles of 16px); `maps/tile-sprayed.png`
  16×16 overlay stamped on treated tiles
- `ui/door-bg.png` — 180×320 dialogue backdrop

If your sheet layout differs, adjust the frame indices in `assets.ts` only.

## Adding a whole new story

1. Copy `src/stories/eric-weed-sprayer/` to `src/stories/<your-story>/`.
2. Swap the import in `src/App.tsx` to your story's `StoryConfig`.
3. Add your PNGs under `public/assets/` and point `assets.ts` at them.
4. Bump `version` in `story.ts` whenever scene ids change (invalidates saves).

No `src/engine/` file mentions Eric, weeds, vans, or dollar amounts — if you
find yourself editing the engine for content, put it in `beats.ts` instead.

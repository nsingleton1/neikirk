import { useEffect, useMemo } from "react";
import { Director } from "./engine/Director";
import { useUIStore } from "./engine/store";
import { ericWeedSprayerStory } from "./stories/eric-weed-sprayer/story";
import { DebugPanel } from "./ui/DebugPanel";
import { DialogueView } from "./ui/DialogueBox";
import { EndingScreen } from "./ui/EndingScreen";
import { GameCanvas } from "./ui/GameCanvas";
import { LoadingScreen } from "./ui/LoadingScreen";
import { RotateOverlay } from "./ui/RotateOverlay";
import { TimeSkipCard } from "./ui/TimeSkipCard";

export function App() {
  const director = useMemo(() => new Director(ericWeedSprayerStory), []);
  const phase = useUIStore((s) => s.phase);
  const rotateBlocked = useUIStore((s) => s.rotateBlocked);
  const errorMessage = useUIStore((s) => s.errorMessage);

  useEffect(() => {
    void director.start();
    return () => director.destroy();
  }, [director]);

  return (
    <div className="game-frame">
      {phase === "loading" && <LoadingScreen />}
      {phase === "dialogue" && <DialogueView director={director} />}
      {phase === "scripted" && <GameCanvas director={director} />}
      {phase === "ending" && <EndingScreen director={director} story={ericWeedSprayerStory} />}
      {phase === "error" && (
        <div className="overlay-full">
          <div style={{ fontSize: 40 }}>x_x</div>
          <div>Something broke. {errorMessage}</div>
          <button className="retro" onClick={() => location.reload()}>
            RELOAD
          </button>
        </div>
      )}
      <TimeSkipCard />
      {rotateBlocked && <RotateOverlay />}
      {import.meta.env.DEV && <DebugPanel director={director} />}
    </div>
  );
}

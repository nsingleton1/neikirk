import { Director } from "../engine/Director";
import { useUIStore } from "../engine/store";

export function DebugPanel({ director }: { director: Director }) {
  const debug = useUIStore((s) => s.debug);
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(4px + var(--safe-top))",
        left: 4,
        zIndex: 60,
        background: "#000000aa",
        color: "#0f0",
        fontSize: 11,
        padding: 6,
        borderRadius: 4,
        display: "flex",
        gap: 6,
        alignItems: "center",
        fontFamily: "monospace",
      }}
    >
      <span>
        {debug.sceneId} t={Math.round(debug.timelineMs / 100) / 10}s x{debug.speed}
      </span>
      <button onClick={() => director.setSpeed(debug.speed >= 4 ? 1 : debug.speed * 2)}>
        spd
      </button>
      <button onClick={() => director.skipScene()}>skip</button>
      <button onClick={() => director.restartScene()}>rst</button>
    </div>
  );
}

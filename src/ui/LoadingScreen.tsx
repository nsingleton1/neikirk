import { useUIStore } from "../engine/store";

export function LoadingScreen() {
  const progress = useUIStore((s) => s.loadProgress);
  return (
    <div className="overlay-full">
      <div style={{ fontSize: 24, fontWeight: "bold", letterSpacing: 2 }}>
        LOADING
      </div>
      <div
        style={{
          width: 200,
          height: 14,
          border: "3px solid var(--ui-border)",
          background: "#000",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(progress * 100)}%`,
            background: "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}

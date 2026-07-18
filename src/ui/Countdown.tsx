import { useUIStore } from "../engine/store";

export function Countdown() {
  const countdown = useUIStore((s) => s.countdown);
  if (!countdown) return null;
  return (
    <div
      aria-hidden
      style={{
        height: 8,
        border: "2px solid var(--ui-border)",
        borderRadius: 3,
        background: "#00000066",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${countdown.remaining * 100}%`,
          background: "var(--accent)",
        }}
      />
    </div>
  );
}

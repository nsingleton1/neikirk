import { useUIStore } from "../engine/store";

export function TimeSkipCard() {
  const label = useUIStore((s) => s.timeSkipLabel);
  if (!label) return null;
  return (
    <div className="overlay-full" style={{ background: "#000000dd", zIndex: 40 }}>
      <div
        style={{
          fontSize: 26,
          fontWeight: "bold",
          letterSpacing: 3,
          color: "#f4ecd8",
        }}
      >
        {label}
      </div>
    </div>
  );
}

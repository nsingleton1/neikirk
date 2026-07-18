import { useEffect, useRef } from "react";
import { Director } from "../engine/Director";
import { useUIStore } from "../engine/store";

export function GameCanvas({ director }: { director: Director }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const overlay = useUIStore((s) => s.overlayDialogue);

  useEffect(() => {
    const canvas = canvasRef.current!;
    director.attachCanvas(canvas);
    const wrap = wrapRef.current!;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      director.resizeCanvas(r.width, r.height);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      director.detachCanvas();
    };
  }, [director]);

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <canvas ref={canvasRef} className="pixel" />
      {overlay && (
        <div
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            bottom: "calc(12px + var(--safe-bottom))",
            background: "var(--ui-bg)",
            border: "3px solid var(--ui-border)",
            borderRadius: 6,
            padding: 10,
            color: "var(--ui-text)",
            fontSize: 16,
          }}
        >
          <span style={{ color: "var(--accent)", fontWeight: "bold" }}>
            {overlay.speakerName}:{" "}
          </span>
          {overlay.text}
        </div>
      )}
    </div>
  );
}

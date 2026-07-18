import { Director } from "../engine/Director";
import { useUIStore } from "../engine/store";
import { ChoiceButtons } from "./ChoiceButtons";
import { Countdown } from "./Countdown";

export function DialogueView({ director }: { director: Director }) {
  const dialogue = useUIStore((s) => s.dialogue);
  if (!dialogue) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        backgroundImage: dialogue.backgroundUrl
          ? `url(${dialogue.backgroundUrl})`
          : undefined,
        backgroundColor: "#2b3a4f",
        backgroundSize: "cover",
        backgroundPosition: "center",
        imageRendering: "pixelated",
      }}
      onPointerDown={() => director.tapDialogue()}
    >
      <div
        style={{
          margin: "0 10px",
          marginBottom: "calc(12px + var(--safe-bottom))",
          background: "var(--ui-bg)",
          border: "3px solid var(--ui-border)",
          borderRadius: 6,
          boxShadow: "0 5px 0 #000",
          padding: 14,
          color: "var(--ui-text)",
          minHeight: 150,
          display: "flex",
          gap: 12,
        }}
      >
        {dialogue.portraitUrl && (
          <img
            src={dialogue.portraitUrl}
            alt={dialogue.speakerName}
            className="pixel"
            style={{
              width: 88,
              height: 88,
              imageRendering: "pixelated",
              border: "2px solid var(--ui-border)",
              background: "#1a2433",
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ color: "var(--accent)", fontWeight: "bold", marginBottom: 6 }}>
            {dialogue.speakerName}
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.45, flex: 1 }}>
            {dialogue.text}
            {!dialogue.revealed && <span className="cursor">▌</span>}
          </div>
          {dialogue.revealed && !dialogue.choices && (
            <div style={{ textAlign: "right", opacity: 0.7, fontSize: 14 }}>▼ tap</div>
          )}
        </div>
      </div>
      {dialogue.choices && (
        <div
          style={{
            padding: "0 10px",
            paddingBottom: "calc(12px + var(--safe-bottom))",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Countdown />
          <ChoiceButtons
            choices={dialogue.choices}
            onSelect={(id) => director.selectChoice(id)}
          />
        </div>
      )}
    </div>
  );
}

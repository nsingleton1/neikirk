import { Director } from "../engine/Director";
import { useUIStore } from "../engine/store";
import { StoryConfig } from "../engine/types";
import { ChoiceButtons } from "./ChoiceButtons";

async function share(story: StoryConfig): Promise<void> {
  const url = location.href.split("#")[0].split("?")[0];
  const data = {
    title: story.share?.title ?? story.title,
    text: story.share?.text ?? story.title,
    url,
  };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
  } catch {
    /* user cancelled — fall through to clipboard */
  }
  try {
    await navigator.clipboard.writeText(url);
    alert("Link copied!");
  } catch {
    prompt("Copy this link:", url);
  }
}

export function EndingScreen({
  director,
  story,
}: {
  director: Director;
  story: StoryConfig;
}) {
  const ending = useUIStore((s) => s.ending);
  if (!ending) return null;

  return (
    <div className="overlay-full" style={{ background: "#14100c", gap: 20 }}>
      <div
        style={{
          fontSize: 30,
          fontWeight: "bold",
          color: "#ffd23f",
          textShadow: "3px 3px 0 #000",
          lineHeight: 1.3,
        }}
      >
        {ending.headline}
      </div>
      {ending.subtext && !ending.resultText && (
        <div style={{ fontSize: 17, opacity: 0.85 }}>{ending.subtext}</div>
      )}
      {ending.resultText && (
        <div style={{ fontSize: 17, color: "#ff6b6b" }}>{ending.resultText}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
        {ending.fakeChoices.length > 0 && (
          <ChoiceButtons
            choices={ending.fakeChoices}
            onSelect={(id) => director.selectChoice(id)}
          />
        )}
        {ending.showShare && (
          <button className="retro" onClick={() => void share(story)}>
            SHARE THIS
          </button>
        )}
        {ending.showRestart && (
          <button className="retro" onClick={() => director.restart()}>
            PLAY AGAIN
          </button>
        )}
      </div>
    </div>
  );
}

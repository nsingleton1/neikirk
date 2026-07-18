import { Choice } from "../engine/types";

export function ChoiceButtons({
  choices,
  onSelect,
}: {
  choices: Choice[];
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {choices.map((c) => (
        <button
          key={c.id}
          className="retro"
          style={{ width: "100%", fontSize: 20 }}
          onClick={() => onSelect(c.id)}
        >
          {c.label}
        </button>
      ))}
    </>
  );
}

import { describe, expect, it } from "vitest";
import {
  KVStore,
  clearCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
} from "../src/engine/storage";

function memStore(): KVStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

describe("storage", () => {
  it("round-trips a checkpoint", () => {
    const s = memStore();
    saveCheckpoint(
      { storyId: "st", version: 1, sceneId: "yard", checkpointId: "cp" },
      1000,
      s,
    );
    const rec = loadCheckpoint("st", 1, 2000, s);
    expect(rec?.sceneId).toBe("yard");
    expect(rec?.checkpointId).toBe("cp");
  });

  it("expires after 24h TTL", () => {
    const s = memStore();
    saveCheckpoint({ storyId: "st", version: 1, sceneId: "yard" }, 0, s);
    expect(loadCheckpoint("st", 1, 24 * 3600 * 1000 - 1, s)).not.toBeNull();
    expect(loadCheckpoint("st", 1, 24 * 3600 * 1000 + 1, s)).toBeNull();
  });

  it("invalidates on version bump", () => {
    const s = memStore();
    saveCheckpoint({ storyId: "st", version: 1, sceneId: "yard" }, 0, s);
    expect(loadCheckpoint("st", 2, 1000, s)).toBeNull();
  });

  it("clears", () => {
    const s = memStore();
    saveCheckpoint({ storyId: "st", version: 1, sceneId: "yard" }, 0, s);
    clearCheckpoint("st", s);
    expect(loadCheckpoint("st", 1, 1000, s)).toBeNull();
  });

  it("survives corrupt JSON", () => {
    const s = memStore();
    s.setItem("story-save:st", "{not json");
    expect(loadCheckpoint("st", 1, 0, s)).toBeNull();
  });
});

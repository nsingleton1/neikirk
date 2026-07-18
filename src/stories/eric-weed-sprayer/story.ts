import { StoryConfig } from "../../engine/types";
import { characters, maps } from "./characters";
import { scenes } from "./scenes";

export const ericWeedSprayerStory: StoryConfig = {
  id: "eric-weed-sprayer",
  // Bump on any scene-graph/checkpoint change: invalidates saved progress
  // from older layouts so resume can't jump into a rearranged story.
  version: 2,
  title: "Erik Weed Sprayer",
  startSceneId: "door",
  characters,
  maps,
  scenes,
  share: {
    title: "Erik Weed Sprayer",
    text: "Erik sprayed my weeds. It did not go well.",
  },
};

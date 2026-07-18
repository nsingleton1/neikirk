import { StoryConfig } from "../../engine/types";
import { characters, maps } from "./characters";
import { scenes } from "./scenes";

export const ericWeedSprayerStory: StoryConfig = {
  id: "eric-weed-sprayer",
  version: 1,
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

import { StoryConfig } from "../../engine/types";
import { characters, maps } from "./characters";
import { scenes } from "./scenes";

export const ericWeedSprayerStory: StoryConfig = {
  id: "eric-weed-sprayer",
  version: 1,
  title: "Eric Weed Sprayer",
  startSceneId: "door",
  characters,
  maps,
  scenes,
  share: {
    title: "Eric Weed Sprayer",
    text: "Eric sprayed my weeds. It did not go well.",
  },
};

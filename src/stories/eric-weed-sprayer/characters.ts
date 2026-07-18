import { CharacterDef, MapDef } from "../../engine/types";
import { personSheet, urls, vehicleSheet } from "./assets";

export const characters: Record<string, CharacterDef> = {
  eric: {
    name: "Eric",
    portraits: {
      default: urls.ericPortraitSmirk,
      annoyed: urls.ericPortraitAnnoyed,
      tired: urls.ericPortraitTired,
      phone: urls.ericPortraitPhone,
    },
    sprite: personSheet(urls.ericSheet),
  },
  you: {
    // The homeowner — used as the "speaker" for notice prompts. No portrait.
    name: "YOU",
  },
  schmidt: {
    name: "Schmidt",
    sprite: personSheet(urls.schmidtSheet),
  },
  nick: {
    name: "Nick",
    sprite: personSheet(urls.nickSheet),
  },
  truck: {
    name: "Yellow Truck",
    sprite: vehicleSheet(urls.truckSheet),
  },
  van: {
    name: "Red Van",
    sprite: vehicleSheet(urls.vanSheet),
  },
};

/**
 * Yard: 10x16 tiles of 16px. House rows 0-3, sprayable lawn rows 4-12,
 * sidewalk row 13, road rows 14-15 (vehicles travel at y=14).
 */
export const maps: Record<string, MapDef> = {
  yard: {
    cols: 10,
    rows: 16,
    tileSize: 16,
    backgroundUrl: urls.yardMap,
    tileOverlays: {
      sprayed: urls.tileSprayed,
      weedy: urls.tileWeeds,
      pock: urls.tilePock,
    },
  },
};

export const ROAD_Y = 14;
export const SIDEWALK_Y = 13;

/**
 * Asset manifest + sprite-sheet layouts for the Eric Weed Sprayer story.
 * To swap in real art: replace the PNGs in public/assets/ with files of the
 * same dimensions and frame layout. Only edit this file if the layout differs.
 *
 * Character sheets: 8 columns of 16x24 frames, poses in this order:
 *   0-1 idle | 2-3 walk | 4-5 spray | 6-7 phone | 8-9 sit | 10-11 nap | 12-13 argue | 14-15 pee | 16-17 plant | 18-19 shoot
 * Vehicle sheets: 2 frames of 40x24 (drive bounce), side profile facing right.
 */
import { SpriteSheetDef } from "../../engine/types";

const BASE = import.meta.env.BASE_URL + "assets";

export const urls = {
  ericPortraitSmirk: `${BASE}/portraits/eric-smirk.png`,
  ericPortraitAnnoyed: `${BASE}/portraits/eric-annoyed.png`,
  ericPortraitTired: `${BASE}/portraits/eric-tired.png`,
  ericPortraitPhone: `${BASE}/portraits/eric-phone.png`,
  ericSheet: `${BASE}/characters/eric.png`,
  schmidtSheet: `${BASE}/characters/schmidt.png`,
  nickSheet: `${BASE}/characters/nick.png`,
  fancySheet: `${BASE}/characters/fancy.png`,
  cartGuySheet: `${BASE}/characters/cartguy.png`,
  cartSheet: `${BASE}/vehicles/cart.png`,
  truckSheet: `${BASE}/vehicles/truck-yellow.png`,
  vanSheet: `${BASE}/vehicles/van-red.png`,
  fancyCarSheet: `${BASE}/vehicles/car-fancy.png`,
  yardMap: `${BASE}/maps/yard.png`,
  tileSprayed: `${BASE}/maps/tile-sprayed.png`,
  tileWeeds: `${BASE}/maps/tile-weeds.png`,
  tilePock: `${BASE}/maps/tile-pock.png`,
  doorBg: `${BASE}/ui/door-bg.png`,
};

export function personSheet(url: string): SpriteSheetDef {
  return {
    url,
    frameW: 16,
    frameH: 24,
    animations: {
      idle: { frames: [0, 1], fps: 2 },
      walk: { frames: [2, 3], fps: 6 },
      spray: { frames: [4, 5], fps: 4 },
      phone: { frames: [6, 7], fps: 3 },
      sit: { frames: [8, 9], fps: 2.5 },
      nap: { frames: [10, 11], fps: 1.2 },
      argue: { frames: [12, 13], fps: 6 },
      pee: { frames: [14, 15], fps: 3 },
      plant: { frames: [16, 17], fps: 2.5 },
      shoot: { frames: [18, 19], fps: 6 },
    },
  };
}

export function cartSheet(url: string): SpriteSheetDef {
  return {
    url,
    frameW: 24,
    frameH: 20,
    animations: {
      idle: { frames: [0], fps: 1 },
      // "walk" so the wheels jiggle while the engine moves it
      walk: { frames: [0, 1], fps: 6 },
    },
  };
}

export function vehicleSheet(url: string): SpriteSheetDef {
  return {
    url,
    frameW: 40,
    frameH: 24,
    animations: {
      idle: { frames: [0], fps: 1 },
      drive: { frames: [0, 1], fps: 8 },
    },
  };
}

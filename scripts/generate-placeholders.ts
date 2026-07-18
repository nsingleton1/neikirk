/**
 * Generates all placeholder pixel-art PNGs into public/assets/.
 * Run: npm run gen:art
 *
 * Real art can replace any of these files 1:1 (same dimensions / sheet
 * layout) without touching code. Sheet layouts are documented in
 * src/stories/eric-weed-sprayer/assets.ts.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { PNG } from "pngjs";

const OUT = path.join(process.cwd(), "public", "assets");

type RGBA = [number, number, number, number];
const C = (hex: string, a = 255): RGBA => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  a,
];

// ---- palette ----
const SKIN = C("#e8b48a");
const SKIN_SHADE = C("#c9946b");
const BEARD = C("#5d4a3a");
const BEARD_GRAY = C("#9a8d80");
const BEARD_GRAY_LIGHT = C("#b5aa9e");
const BEANIE = C("#22262b");
const BEANIE_FOLD = C("#33383f");
const JACKET = C("#2f3a44");
const JACKET_LIGHT = C("#3d4a56");
const PANTS = C("#3a3f45");
const BOOTS = C("#241d16");
const WHITE = C("#f4ecd8");
const BLACK = C("#14100c");
const PHONE_GLOW = C("#9fd8ff");
const PHONE_BODY = C("#1a1d22");
const SPRAY_TANK = C("#b8433a");
const SPRAY_MIST = C("#cfe9d4", 200);
const GRASS = C("#4f8f3e");
const GRASS_DARK = C("#447a35");
const WEED = C("#2f5c27");
const WEED_FLOWER = C("#d9c94a");
const SPRAYED = C("#79c465");
const SPRAYED_DARK = C("#68ad57");
const DROPLET = C("#bfe6ff");
const ROAD = C("#565a5e");
const ROAD_LINE = C("#d9d15a");
const SIDEWALK = C("#a8a294");
const HOUSE_WALL = C("#c8b48e");
const HOUSE_ROOF = C("#7a4a3a");
const DOOR = C("#6b4a2f");
const TRUCK_YELLOW = C("#e8c832");
const TRUCK_YELLOW_DARK = C("#c4a51e");
const VAN_RED = C("#c9302c");
const VAN_RED_DARK = C("#a02420");
const TRIM_BLACK = C("#26262a");
const GLASS = C("#aac8d8");
const TIRE = C("#1c1c20");
const HUB = C("#8a8a92");

class Img {
  png: PNG;
  constructor(
    public w: number,
    public h: number,
  ) {
    this.png = new PNG({ width: w, height: h });
  }
  px(x: number, y: number, c: RGBA) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (this.w * Math.floor(y) + Math.floor(x)) << 2;
    this.png.data[i] = c[0];
    this.png.data[i + 1] = c[1];
    this.png.data[i + 2] = c[2];
    this.png.data[i + 3] = c[3];
  }
  rect(x: number, y: number, w: number, h: number, c: RGBA) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
  }
  outline(x: number, y: number, w: number, h: number, c: RGBA) {
    for (let xx = x; xx < x + w; xx++) {
      this.px(xx, y, c);
      this.px(xx, y + h - 1, c);
    }
    for (let yy = y; yy < y + h; yy++) {
      this.px(x, yy, c);
      this.px(x + w - 1, yy, c);
    }
  }
  save(rel: string) {
    const file = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PNG.sync.write(this.png));
    console.log("wrote", rel, `${this.w}x${this.h}`);
  }
}

// =====================================================================
// Character sheet framework: 16x24 frames laid out in an 8-column grid.
// =====================================================================
const FW = 16;
const FH = 24;

interface CharStyle {
  hat: RGBA | null;
  hatFold?: RGBA;
  hair?: RGBA;
  beard: RGBA | null;
  beardGray?: boolean;
  jacket: RGBA;
  jacketLight: RGBA;
  pants: RGBA;
  heavyset: boolean;
}

const ERIC_STYLE: CharStyle = {
  hat: BEANIE,
  hatFold: BEANIE_FOLD,
  beard: BEARD,
  beardGray: true,
  jacket: JACKET,
  jacketLight: JACKET_LIGHT,
  pants: PANTS,
  heavyset: true,
};

const SCHMIDT_STYLE: CharStyle = {
  hat: null,
  hair: C("#7a5a3a"),
  beard: null,
  jacket: C("#7a3030"),
  jacketLight: C("#8f3d3d"),
  pants: C("#3d4a68"),
  heavyset: false,
};

const NICK_STYLE: CharStyle = {
  hat: C("#3a5a8a"), // ball cap
  hatFold: C("#4a6a9a"),
  beard: C("#4a3a2a"),
  jacket: C("#4a6a4a"),
  jacketLight: C("#5a7a5a"),
  pants: C("#4a4540"),
  heavyset: false,
};

type Pose =
  | "idle0"
  | "idle1"
  | "walk0"
  | "walk1"
  | "spray0"
  | "spray1"
  | "phone0"
  | "phone1"
  | "sit0"
  | "sit1"
  | "nap0"
  | "nap1"
  | "argue0"
  | "argue1"
  | "pee0"
  | "pee1"
  | "plant0"
  | "plant1"
  | "shoot0"
  | "shoot1";

const GUN_METAL = C("#3a3a42");
const MUZZLE = C("#ffe066");

const PEE_BLUE = C("#7ec8e8");

/** Draw one standing-body frame at (ox,oy). Down/front facing, generic. */
function drawChar(img: Img, ox: number, oy: number, s: CharStyle, pose: Pose) {
  const bodyW = s.heavyset ? 12 : 10;
  const bx = ox + Math.floor((FW - bodyW) / 2);

  if (pose.startsWith("nap")) {
    // Lying horizontally near the bottom of the cell, head at left.
    const gy = oy + FH - 8;
    const rise = pose === "nap1" ? -1 : 0;
    // body
    img.rect(ox + 5, gy + rise, 10, 6 - rise, s.jacket);
    img.rect(ox + 6, gy + rise, 8, 2, s.jacketLight);
    // head
    img.rect(ox + 1, gy - 1, 5, 6, SKIN);
    if (s.beard) img.rect(ox + 1, gy + 2, 5, 3, s.beard);
    if (s.hat) img.rect(ox + 1, gy - 2, 5, 2, s.hat);
    // closed eyes
    img.px(ox + 3, gy + 1, BLACK);
    img.px(ox + 5, gy + 1, BLACK);
    // boots
    img.rect(ox + 14, gy + rise + 1, 2, 4 - rise, BOOTS);
    return;
  }

  const sitting = pose.startsWith("sit");
  const crouch = pose.startsWith("plant") ? 3 : 0;
  const bob = pose === "idle1" || pose === "walk1" ? 1 : 0;
  const headY = oy + (sitting ? 6 : 1) + bob + crouch;

  // --- head (8 wide) ---
  const hx = ox + 4;
  img.rect(hx, headY + 1, 8, 6, SKIN);
  img.rect(hx, headY + 5, 1, 2, SKIN_SHADE);
  // hat or hair
  if (s.hat) {
    img.rect(hx - 1, headY - 1, 10, 2, s.hat);
    img.rect(hx - 1, headY + 1, 10, 1, s.hatFold ?? s.hat);
  } else if (s.hair) {
    img.rect(hx, headY - 1, 8, 2, s.hair);
  }
  // beard covering jaw
  if (s.beard) {
    img.rect(hx, headY + 4, 8, 3, s.beard);
    if (s.beardGray) {
      img.px(hx + 1, headY + 5, BEARD_GRAY);
      img.px(hx + 6, headY + 4, BEARD_GRAY);
      img.px(hx + 4, headY + 6, BEARD_GRAY);
      img.px(hx + 2, headY + 4, BEARD_GRAY);
      img.px(hx + 7, headY + 6, BEARD_GRAY_LIGHT);
      img.px(hx + 0, headY + 6, BEARD_GRAY_LIGHT);
    }
    // grin gap
    img.rect(hx + 3, headY + 5, 2, 1, WHITE);
  }
  // eyes (looking down when on phone)
  const eyeY = headY + (pose.startsWith("phone") || sitting ? 3.5 : 3);
  if (pose.startsWith("argue")) {
    // angry brows
    img.px(hx + 2, eyeY - 1, BLACK);
    img.px(hx + 5, eyeY - 1, BLACK);
  }
  img.px(hx + 2, eyeY, BLACK);
  img.px(hx + 5, eyeY, BLACK);

  // --- body ---
  const bodyY = headY + 7;
  const bodyH = sitting ? 6 : crouch ? 6 : 8;
  img.rect(bx, bodyY, bodyW, bodyH, s.jacket);
  img.rect(bx + 1, bodyY, bodyW - 2, 2, s.jacketLight);
  // zipper
  img.rect(ox + FW / 2, bodyY, 1, bodyH, TRIM_BLACK);

  // --- legs ---
  if (sitting) {
    // legs forward
    img.rect(bx, bodyY + bodyH, bodyW, 2, s.pants);
    img.rect(bx - 1, bodyY + bodyH + 1, 2, 2, BOOTS);
    img.rect(bx + bodyW - 1, bodyY + bodyH + 1, 2, 2, BOOTS);
  } else {
    const stride = pose === "walk1" ? 1 : 0;
    const legH = crouch ? 3 : 5 - bob;
    img.rect(bx + 1, bodyY + bodyH, 3, legH, s.pants);
    img.rect(bx + bodyW - 4, bodyY + bodyH, 3, legH, s.pants);
    img.rect(bx + 1 - stride, bodyY + bodyH + legH, 3, 2, BOOTS);
    img.rect(bx + bodyW - 4 + stride, bodyY + bodyH + legH, 3, 2, BOOTS);
  }

  // --- arms & props ---
  const armY = bodyY + 1;
  switch (pose) {
    case "spray0":
    case "spray1": {
      // backpack tank on left, right arm extended with wand
      img.rect(bx - 2, armY, 2, 5, SPRAY_TANK);
      img.rect(bx + bodyW, armY + 2, 4, 2, s.jacket); // extended arm
      img.rect(bx + bodyW + 4, armY + 2, 3, 1, TRIM_BLACK); // wand
      if (pose === "spray1") {
        img.px(bx + bodyW + 8, armY + 1, SPRAY_MIST);
        img.px(bx + bodyW + 8, armY + 3, SPRAY_MIST);
        img.px(bx + bodyW + 9, armY + 2, SPRAY_MIST);
      }
      break;
    }
    case "phone0":
    case "phone1":
    case "sit0":
    case "sit1": {
      // both hands in front holding phone
      img.rect(bx + 2, armY + 3, bodyW - 4, 2, s.jacketLight);
      img.rect(ox + FW / 2 - 1, armY + 2, 3, 3, PHONE_BODY);
      if (pose === "phone1" || pose === "sit1")
        img.px(ox + FW / 2, armY + 3, PHONE_GLOW);
      break;
    }
    case "argue0": {
      // both fists raised
      img.rect(bx - 2, armY - 3, 2, 3, s.jacket);
      img.rect(bx + bodyW, armY - 3, 2, 3, s.jacket);
      img.rect(bx - 2, armY - 5, 2, 2, SKIN);
      img.rect(bx + bodyW, armY - 5, 2, 2, SKIN);
      break;
    }
    case "argue1": {
      // fists pumped down mid-shake
      img.rect(bx - 2, armY - 1, 2, 3, s.jacket);
      img.rect(bx + bodyW, armY - 1, 2, 3, s.jacket);
      img.rect(bx - 2, armY - 3, 2, 2, SKIN);
      img.rect(bx + bodyW, armY - 3, 2, 2, SKIN);
      break;
    }
    case "pee0":
    case "pee1": {
      // facing right, hands together in front, arc toward the tree
      img.rect(bx + bodyW - 1, armY + 3, 3, 2, s.jacket);
      const wob = pose === "pee1" ? 1 : 0;
      img.px(bx + bodyW + 3, armY + 4 + wob, PEE_BLUE);
      img.px(bx + bodyW + 4, armY + 5 + wob, PEE_BLUE);
      img.px(bx + bodyW + 5, armY + 7, PEE_BLUE);
      img.px(bx + bodyW + 5, armY + 9, PEE_BLUE);
      if (pose === "pee1") img.px(bx + bodyW + 6, armY + 10, PEE_BLUE);
      break;
    }
    case "plant0":
    case "plant1": {
      // crouched, arm reaching to the ground, planting a visible seedling
      img.rect(bx - 1, armY, 1, 3, s.jacket);
      img.rect(bx + bodyW, armY + 1, 2, 4, s.jacket); // arm reaching down
      img.rect(bx + bodyW + 1, armY + 5, 2, 3, SKIN); // hand at the dirt
      // dirt mound
      img.rect(bx + bodyW + 1, oy + FH - 2, 4, 1, C("#6b4a2f"));
      if (pose === "plant0") {
        // seedling held in hand on the way down
        img.px(bx + bodyW + 2, armY + 3, WEED);
        img.px(bx + bodyW + 3, armY + 4, WEED);
      } else {
        // the freshly planted weed, big and proud
        img.px(bx + bodyW + 2, oy + FH - 3, WEED);
        img.px(bx + bodyW + 1, oy + FH - 4, WEED);
        img.px(bx + bodyW + 3, oy + FH - 4, WEED);
        img.px(bx + bodyW + 2, oy + FH - 5, WEED);
        img.px(bx + bodyW + 2, oy + FH - 6, WEED_FLOWER);
      }
      break;
    }
    case "shoot0":
    case "shoot1": {
      // both arms up holding a long cartoon shotgun; frame 1 = big flash
      img.rect(bx + bodyW, armY, 3, 2, s.jacket); // upper arm
      img.rect(bx - 1, armY + 1, 2, 2, s.jacket); // support arm across
      img.rect(bx + bodyW - 2, armY - 1, 2, 2, C("#6b4a2f")); // wood stock
      img.rect(bx + bodyW, armY - 1, 7, 2, GUN_METAL); // long barrel
      if (pose === "shoot1") {
        // starburst muzzle flash
        img.px(bx + bodyW + 7, armY - 3, MUZZLE);
        img.rect(bx + bodyW + 7, armY - 2, 2, 1, MUZZLE);
        img.rect(bx + bodyW + 7, armY - 1, 3, 2, WHITE);
        img.rect(bx + bodyW + 7, armY + 1, 2, 1, MUZZLE);
        img.px(bx + bodyW + 7, armY + 2, MUZZLE);
        img.px(bx + bodyW + 9, armY - 2, MUZZLE);
        img.px(bx + bodyW + 9, armY + 1, MUZZLE);
      }
      break;
    }
    default: {
      // arms at sides
      img.rect(bx - 1, armY, 1, 5, s.jacket);
      img.rect(bx + bodyW, armY, 1, 5, s.jacket);
    }
  }
}

const POSES: Pose[] = [
  "idle0",
  "idle1",
  "walk0",
  "walk1",
  "spray0",
  "spray1",
  "phone0",
  "phone1",
  "sit0",
  "sit1",
  "nap0",
  "nap1",
  "argue0",
  "argue1",
  "pee0",
  "pee1",
  "plant0",
  "plant1",
  "shoot0",
  "shoot1",
];

function makeCharSheet(file: string, style: CharStyle) {
  const cols = 8;
  const rows = Math.ceil(POSES.length / cols);
  const img = new Img(cols * FW, rows * FH);
  POSES.forEach((pose, i) => {
    drawChar(img, (i % cols) * FW, Math.floor(i / cols) * FH, style, pose);
  });
  img.save(file);
}

// =====================================================================
// Vehicles: side-profile sheets, 2 frames of 40x24 side by side.
// =====================================================================
const VW = 40;
const VH = 24;

function drawWheel(img: Img, x: number, y: number, frame: number) {
  img.rect(x, y, 6, 6, TIRE);
  img.px(x + 2 + (frame % 2), y + 2, HUB);
  img.px(x + 3 - (frame % 2), y + 3, HUB);
}

function drawTruck(img: Img, ox: number, frame: number) {
  const bounce = frame === 1 ? -1 : 0;
  const y = 4 + bounce;
  // bed (left) + cab (right) — faces right
  img.rect(ox + 2, y + 8, 20, 8, TRUCK_YELLOW); // bed side
  img.rect(ox + 2, y + 6, 20, 2, TRUCK_YELLOW_DARK); // bed rail
  img.rect(ox + 22, y + 2, 12, 14, TRUCK_YELLOW); // cab
  img.rect(ox + 24, y + 3, 8, 5, GLASS); // cab window
  img.rect(ox + 34, y + 8, 4, 8, TRUCK_YELLOW); // hood
  img.rect(ox + 34, y + 8, 4, 2, TRUCK_YELLOW_DARK);
  img.px(ox + 37, y + 12, WHITE); // headlight
  img.rect(ox + 2, y + 15, 36, 1, TRIM_BLACK); // rocker line
  drawWheel(img, ox + 6, 18, frame);
  drawWheel(img, ox + 28, 18, frame);
}

function drawVan(img: Img, ox: number, frame: number) {
  const bounce = frame === 1 ? -1 : 0;
  const y = 3 + bounce;
  // 1993 Trans Sport: one-box wedge — long sloped nose, tall glass.
  // Body silhouette (faces right)
  img.rect(ox + 2, y + 6, 30, 12, VAN_RED); // main box
  // wedge nose: step the front edge down-right
  img.rect(ox + 32, y + 8, 3, 10, VAN_RED);
  img.rect(ox + 35, y + 11, 3, 7, VAN_RED);
  img.px(ox + 37, y + 13, WHITE); // headlight
  // huge raked windshield + side glass band
  img.rect(ox + 6, y + 3, 22, 4, GLASS);
  img.rect(ox + 28, y + 4, 5, 5, GLASS); // windshield slope
  img.px(ox + 33, y + 8, GLASS);
  // dark roof + roof rack
  img.rect(ox + 4, y + 1, 22, 2, TRIM_BLACK);
  img.px(ox + 7, y, TRIM_BLACK);
  img.px(ox + 15, y, TRIM_BLACK);
  img.px(ox + 23, y, TRIM_BLACK);
  // black lower trim
  img.rect(ox + 2, y + 15, 34, 3, TRIM_BLACK);
  img.rect(ox + 2, y + 14, 34, 1, VAN_RED_DARK);
  drawWheel(img, ox + 7, 18, frame);
  drawWheel(img, ox + 27, 18, frame);
}

function makeVehicleSheet(file: string, draw: (img: Img, ox: number, f: number) => void) {
  const img = new Img(VW * 2, VH);
  draw(img, 0, 0);
  draw(img, VW, 1);
  img.save(file);
}

// =====================================================================
// Yard map: 10 cols x 16 rows of 16px tiles = 160x256.
// Layout: house rows 0-3, lawn rows 4-12, sidewalk row 13, road rows 14-15.
// =====================================================================
function makeYardMap() {
  const ts = 16;
  const cols = 10;
  const rows = 16;
  const img = new Img(cols * ts, rows * ts);

  // lawn base
  for (let y = 0; y < rows * ts; y++)
    for (let x = 0; x < cols * ts; x++)
      img.px(x, y, (x + y) % 2 === 0 ? GRASS : GRASS_DARK);

  // house band (rows 0-3)
  img.rect(0, 0, cols * ts, 2 * ts, HOUSE_ROOF);
  for (let x = 0; x < cols * ts; x += 4) img.rect(x, 8, 2, 2, C("#6b3f30"));
  img.rect(0, 2 * ts, cols * ts, 2 * ts, HOUSE_WALL);
  // door + windows
  img.rect(4 * ts + 4, 2 * ts + 6, 24, 26, DOOR);
  img.px(4 * ts + 8, 2 * ts + 20, WEED_FLOWER); // knob
  for (const wx of [1, 7]) {
    img.rect(wx * ts + 2, 2 * ts + 8, 20, 14, GLASS);
    img.outline(wx * ts + 2, 2 * ts + 8, 20, 14, TRIM_BLACK);
  }

  // lawn grid lines (rows 4-12) so tiles read as squares
  for (let gy = 4; gy <= 13; gy++)
    for (let x = 0; x < cols * ts; x++) img.px(x, gy * ts, C("#3f6f31"));
  for (let gx = 0; gx <= cols; gx++)
    for (let y = 4 * ts; y < 13 * ts; y++) img.px(gx * ts, y, C("#3f6f31"));

  // weed tufts scattered on unsprayed lawn (deterministic pattern)
  for (let gy = 4; gy < 13; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if ((gx * 7 + gy * 13) % 3 === 0) {
        const cx = gx * ts + 5 + ((gx * 3 + gy) % 6);
        const cy = gy * ts + 5 + ((gx + gy * 5) % 6);
        img.px(cx, cy, WEED);
        img.px(cx - 1, cy + 1, WEED);
        img.px(cx + 1, cy + 1, WEED);
        img.px(cx, cy - 1, WEED_FLOWER);
      }
    }
  }

  // the tree (right side of the lawn, around tile 8,6)
  const TRUNK = C("#5a3a24");
  const LEAF = C("#2e5b2a");
  const LEAF_LIGHT = C("#3f7a38");
  const tcx = 8 * ts + 8;
  const tcy = 5 * ts + 8;
  for (let dy = -14; dy <= 10; dy++) {
    for (let dx = -13; dx <= 13; dx++) {
      if (dx * dx + dy * dy * 1.4 < 160) {
        img.px(tcx + dx, tcy + dy, (dx + dy) % 3 === 0 ? LEAF_LIGHT : LEAF);
      }
    }
  }
  img.rect(tcx - 2, tcy + 8, 5, 14, TRUNK);
  img.rect(tcx - 3, tcy + 18, 7, 4, TRUNK);

  // mailbox at the road end of the walk (tile 9,13)
  img.rect(9 * ts + 6, 13 * ts - 6, 2, 10, TRUNK); // post
  img.rect(9 * ts + 3, 13 * ts - 12, 9, 6, C("#4a5a8a")); // box
  img.px(9 * ts + 12, 13 * ts - 11, C("#d94a3a")); // flag

  // sidewalk row 13
  img.rect(0, 13 * ts, cols * ts, ts, SIDEWALK);
  for (let x = 0; x < cols * ts; x += ts) img.rect(x, 13 * ts, 1, ts, C("#8f8a7d"));

  // road rows 14-15
  img.rect(0, 14 * ts, cols * ts, 2 * ts, ROAD);
  for (let x = 4; x < cols * ts; x += 16) img.rect(x, 15 * ts - 1, 8, 2, ROAD_LINE);

  img.save("maps/yard.png");
}

function makeWeedyOverlay() {
  // Freshly PLANTED weeds — denser and healthier than the natural tufts.
  const img = new Img(16, 16);
  for (const [cx, cy] of [
    [4, 5],
    [11, 4],
    [7, 10],
    [12, 12],
    [3, 12],
  ] as const) {
    img.px(cx, cy, WEED);
    img.px(cx - 1, cy + 1, WEED);
    img.px(cx + 1, cy + 1, WEED);
    img.px(cx - 1, cy - 1, WEED);
    img.px(cx + 1, cy - 1, WEED);
    img.px(cx, cy - 2, WEED_FLOWER);
  }
  img.save("maps/tile-weeds.png");
}

function makeSprayedOverlay() {
  const img = new Img(16, 16);
  for (let y = 1; y < 16; y++)
    for (let x = 1; x < 16; x++)
      img.px(x, y, (x + y) % 2 === 0 ? SPRAYED : SPRAYED_DARK);
  // sparkle droplets
  img.px(4, 5, DROPLET);
  img.px(11, 4, DROPLET);
  img.px(7, 11, DROPLET);
  img.px(12, 12, DROPLET);
  img.save("maps/tile-sprayed.png");
}

// =====================================================================
// Eric portraits 64x64: smirk / annoyed / tired / phone.
// =====================================================================
type Expression = "smirk" | "annoyed" | "tired" | "phone";

function makePortrait(expr: Expression) {
  const img = new Img(64, 64);
  // background
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) img.px(x, y, C(y < 40 ? "#8db4c8" : "#5a7d5a"));

  const tilt = expr === "phone" ? 4 : 0; // head tilts down toward phone

  // shoulders / jacket
  img.rect(6, 50, 52, 14, JACKET);
  img.rect(8, 50, 48, 3, JACKET_LIGHT);
  img.rect(30, 50, 3, 14, TRIM_BLACK);

  // neck + face
  img.rect(24, 40 + tilt, 16, 10, SKIN_SHADE);
  img.rect(16, 14 + tilt, 32, 30, SKIN);
  img.rect(16, 14 + tilt, 2, 30, SKIN_SHADE);

  // beanie
  img.rect(13, 6 + tilt, 38, 10, BEANIE);
  img.rect(13, 14 + tilt, 38, 3, BEANIE_FOLD);
  img.rect(13, 17 + tilt, 38, 1, BEANIE);

  // full beard: cheeks + chin
  img.rect(16, 30 + tilt, 32, 14, BEARD);
  img.rect(14, 28 + tilt, 4, 10, BEARD);
  img.rect(46, 28 + tilt, 4, 10, BEARD);
  // heavy salt-and-pepper: gray streaks + flecks throughout
  for (const [gx, gy, len] of [
    [20, 33, 3],
    [27, 40, 2],
    [36, 31, 3],
    [43, 38, 2],
    [31, 43, 3],
    [17, 37, 2],
    [23, 31, 2],
    [40, 42, 3],
    [34, 36, 2],
    [19, 41, 2],
    [45, 33, 2],
    [29, 33, 2],
    [37, 41, 2],
    [15, 31, 2],
    [47, 30, 2],
  ] as const) {
    for (let i = 0; i < len; i++) img.px(gx + i, gy + tilt, BEARD_GRAY);
  }
  // bright silver chin streak
  img.rect(29, 41 + tilt, 2, 3, BEARD_GRAY_LIGHT);
  img.rect(34, 42 + tilt, 2, 2, BEARD_GRAY_LIGHT);
  img.px(25, 42 + tilt, BEARD_GRAY_LIGHT);
  img.px(39, 40 + tilt, BEARD_GRAY_LIGHT);

  // mouth (inside beard)
  if (expr === "smirk") {
    // big lopsided grin
    img.rect(24, 35 + tilt, 14, 3, WHITE);
    img.rect(38, 34 + tilt, 3, 3, WHITE);
    img.px(41, 33 + tilt, BEARD);
  } else if (expr === "annoyed") {
    img.rect(26, 36 + tilt, 12, 2, C("#8a5a4a"));
  } else if (expr === "tired") {
    img.rect(27, 36 + tilt, 10, 2, C("#8a5a4a"));
    img.rect(29, 38 + tilt, 6, 2, C("#5a3a30")); // yawn
  } else {
    img.rect(26, 36 + tilt, 10, 2, WHITE); // slack half-grin
  }

  // eyes
  const eyeY = 24 + tilt;
  const drawEye = (x: number) => {
    if (expr === "tired") {
      img.rect(x, eyeY + 2, 6, 2, BLACK); // droopy slits
      img.rect(x, eyeY + 4, 6, 1, C("#b08a7a")); // eye bags
    } else if (expr === "phone") {
      img.rect(x, eyeY + 2, 6, 2, BLACK); // looking down
    } else {
      img.rect(x, eyeY, 5, 4, WHITE);
      img.rect(x + (expr === "smirk" ? 3 : 2), eyeY + 1, 2, 3, BLACK);
    }
  };
  drawEye(21);
  drawEye(37);

  // brows
  if (expr === "annoyed") {
    img.rect(20, eyeY - 4, 7, 2, BEARD);
    img.rect(37, eyeY - 4, 7, 2, BEARD);
    img.px(26, eyeY - 3, BEARD);
    img.px(37, eyeY - 3, BEARD);
  } else if (expr === "smirk") {
    img.rect(20, eyeY - 5, 7, 2, BEARD);
    img.rect(37, eyeY - 6, 7, 2, BEARD); // one raised
  }

  // phone held up in frame corner
  if (expr === "phone") {
    img.rect(44, 46, 12, 18, PHONE_BODY);
    img.rect(46, 48, 8, 12, PHONE_GLOW);
  }

  // nose
  img.rect(30, 28 + tilt, 4, 3, SKIN_SHADE);

  img.save(`portraits/eric-${expr}.png`);
}

// =====================================================================
// Front-door dialogue background 180x320 (blurry-simple porch).
// =====================================================================
function makeDoorBackground() {
  const img = new Img(180, 320);
  for (let y = 0; y < 320; y++)
    for (let x = 0; x < 180; x++) img.px(x, y, C(y < 230 ? "#c8b48e" : "#8a8474"));
  // siding lines
  for (let y = 0; y < 230; y += 12) img.rect(0, y, 180, 1, C("#b09c78"));
  // door
  img.rect(50, 60, 80, 190, DOOR);
  img.outline(50, 60, 80, 190, C("#4a3220"));
  img.rect(58, 70, 64, 60, C("#7a5636"));
  img.outline(58, 70, 64, 60, C("#4a3220"));
  img.rect(58, 145, 64, 80, C("#7a5636"));
  img.outline(58, 145, 64, 80, C("#4a3220"));
  img.rect(118, 155, 6, 12, WEED_FLOWER); // handle
  // porch light
  img.rect(150, 80, 12, 16, C("#3a3a3a"));
  img.rect(153, 84, 6, 8, C("#ffe9a0"));
  // welcome mat
  img.rect(60, 260, 60, 20, C("#7a4a3a"));
  img.outline(60, 260, 60, 20, C("#5a3226"));
  img.save("ui/door-bg.png");
}

// ---- run ----
fs.mkdirSync(OUT, { recursive: true });
makeCharSheet("characters/eric.png", ERIC_STYLE);
makeCharSheet("characters/schmidt.png", SCHMIDT_STYLE);
makeCharSheet("characters/nick.png", NICK_STYLE);
makeVehicleSheet("vehicles/truck-yellow.png", drawTruck);
makeVehicleSheet("vehicles/van-red.png", drawVan);
makeYardMap();
makeSprayedOverlay();
makeWeedyOverlay();
for (const e of ["smirk", "annoyed", "tired", "phone"] as Expression[]) makePortrait(e);
makeDoorBackground();
console.log("done");

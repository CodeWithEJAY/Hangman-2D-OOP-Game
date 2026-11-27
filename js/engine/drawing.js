
import { ctx, camera } from "./canvas.js";

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_Y,
  TRUCK_X
} from "../constants.js";

import { PLATS } from "../data/world.js";
import { BOSS } from "../data/npcs.js";

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;

const GY = GROUND_Y;
const TX = TRUCK_X;

const readColor = color => {
  if (color.startsWith("#")) {
    const hex = color.slice(1);

    return [0, 2, 4].map(
      index => parseInt(hex.slice(index, index + 2), 16)
    );
  }

  return (color.match(/\d+/g) || ["0", "0", "0"])
    .slice(0, 3)
    .map(Number);
};

const blendColor = (day, night, amount) => {
  const a = readColor(day);
  const b = readColor(night);

  const result = a.map((value, i) =>
    Math.round(value + (b[i] - value) * amount)
  );

  return `rgb(${result.join(",")})`;
};

const smoothStep = (start, end, value) => {
  const t = Math.max(
    0,
    Math.min(1, (value - start) / (end - start))
  );

  return t * t * (3 - 2 * t);
};

const getDayCycle = time => {
  const cycleDuration = 200;

  const progress =
    ((time % cycleDuration) + cycleDuration) %
    cycleDuration / cycleDuration;

  const sunset =
    smoothStep(0.24, 0.32, progress) *
    (1 - smoothStep(0.40, 0.47, progress));

  const night =
    smoothStep(0.43, 0.52, progress) *
    (1 - smoothStep(0.70, 0.82, progress));

  const sunrise =
    smoothStep(0.68, 0.78, progress) *
    (1 - smoothStep(0.82, 0.91, progress));

  return { sunset, night, sunrise };
};

const px = x => Math.round(x - camera.x);

const rc = (x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};

const drawSky = (time, night = 0, sunset = 0, sunrise = 0) => {
  const dayColors = [
    "#a9d3ff",
    "#9ccaf9",
    "#8fc0f4",
    "#84b6ef",
    "#79acea"
  ];

  const sunsetColors = [
    "#f8b18d",
    "#f29a91",
    "#df8298",
    "#b66b91",
    "#815477"
  ];

  const sunriseColors = [
    "#eab0bc",
    "#e9a4b5",
    "#d28da9",
    "#a27caa",
    "#77749e"
  ];

  const nightColors = [
    "#11182f",
    "#17213e",
    "#1c294b",
    "#233154",
    "#29385d"
  ];

  dayColors.forEach((color, i) => {
    let finalColor = blendColor(
      color,
      sunsetColors[i],
      sunset
    );

    finalColor = blendColor(
      finalColor,
      sunriseColors[i],
      sunrise
    );

    finalColor = blendColor(
      finalColor,
      nightColors[i],
      night
    );

    rc(0, i * 76, W, 76, finalColor);
  });

  const twilight = Math.max(sunset, sunrise);

  if (twilight > 0.01) {
    ctx.save();
    ctx.globalAlpha = twilight;
    ctx.fillStyle = "#ffd18c";
    ctx.beginPath();
    ctx.arc(W - 115, 205, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 1 - night * 0.8;

  const cloudColor = blendColor(
    "#f1f7ff",
    "#efb2aa",
    twilight
  );

  const cloudShade = blendColor(
    "#cfe3fb",
    "#d58a9b",
    twilight
  );

  for (let i = 0; i < 7; i++) {
    const x =
      ((i * 430 - camera.x * 0.15 + time * 8) %
        (W + 260) +
        W +
        260) %
        (W + 260) -
      130;

    const y = 34 + (i % 3) * 38;

    rc(x, y, 90, 16, cloudColor);
    rc(x + 16, y - 12, 44, 14, cloudColor);
    rc(x + 8, y + 16, 70, 6, cloudShade);
    rc(x + 22, y - 9, 12, 3, "#ffffff");
    rc(x + 48, y + 2, 18, 3, "#ffffff");
  }

  ctx.restore();

  if (night > 0) {
    ctx.save();

    for (let i = 0; i < 38; i++) {
      const x = (i * 113 + 29) % W;
      const y = (i * 47 + 17) % 190;
      const size = i % 5 === 0 ? 3 : 2;
      const alpha = 0.55 + Math.sin(time * 2 + i) * 0.25;

      ctx.globalAlpha = night * alpha;
      rc(x, y, size, size, "#fff4c2");
    }

    ctx.globalAlpha = night;
    ctx.fillStyle = "#fff1bd";
    ctx.beginPath();
    ctx.arc(W - 105, 58, 19, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#192443";
    ctx.beginPath();
    ctx.arc(W - 96, 50, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

const drawBirds = (time, night = 0) => {
  if (night >= 0.95) return;

  const birdColor = blendColor(
    "#435b78",
    "#343650",
    night
  );

  const birdHighlight = blendColor(
    "#7895b1",
    "#55516d",
    night
  );

  ctx.save();
  ctx.globalAlpha = 0.85 * (1 - night);

  for (let group = 0; group < 3; group++) {
    const travel = time * 18;
    const range = W + 120;

    const groupX =
      ((group * 310 + travel - camera.x * 0.12) % range +
        range) % range - 60;

    const groupY = 75 + group * 25;

    for (let bird = 0; bird < 3; bird++) {
      const x = Math.round(groupX + bird * 13);

      const y = Math.round(
        groupY + bird * 3 + Math.sin(time * 2 + bird) * 2
      );

      const wingsUp = Math.sin(time * 7 + group + bird) > 0;

      if (wingsUp) {
        rc(x, y - 3, 3, 3, birdHighlight);
        rc(x + 3, y, 3, 2, birdColor);
        rc(x + 6, y - 3, 3, 3, birdHighlight);
      } else {
        rc(x, y, 3, 2, birdHighlight);
        rc(x + 3, y - 2, 3, 3, birdColor);
        rc(x + 6, y, 3, 2, birdHighlight);
      }
    }
  }

  ctx.restore();
};

const drawBuildings = (night = 0, sunset = 0, sunrise = 0) => {
  const firstBuilding = Math.floor((camera.x * 0.3) / 140);
  const twilight = Math.max(sunset, sunrise);

  let buildingColor = blendColor(
    "#cfe3fb",
    "#e49a91",
    twilight
  );

  buildingColor = blendColor(
    buildingColor,
    "#202b4a",
    night
  );

  let roofColor = blendColor(
    "#e3eeff",
    "#c77b88",
    twilight
  );

  roofColor = blendColor(
    roofColor,
    "#384463",
    night
  );

  let windowColor = blendColor(
    "#e3eeff",
    "#ffc27d",
    twilight
  );

  windowColor = blendColor(
    windowColor,
    "#ffda86",
    night
  );

  for (let i = firstBuilding - 1; i < firstBuilding + 8; i++) {
    const bx = i * 140 - camera.x * 0.3;
    const h = 70 + (((i * 37) % 5 + 5) % 5) * 20;
    const w = 70 + (((i * 53) % 3 + 3) % 3) * 20;

    rc(bx, GY - h, w, h, buildingColor);
    rc(bx, GY - h, w, 4, roofColor);

    for (let row = 14; row < h - 10; row += 22) {
      for (let col = 10; col < w - 12; col += 20) {
        rc(
          bx + col,
          GY - h + row,
          8,
          10,
          windowColor
        );
      }
    }
  }
};

const TREE_PLACEMENTS = [
  { x: 360, scale: 0.92, type: 0 },
  { x: 820, scale: 1.05, type: 1 },
  { x: 1280, scale: 0.88, type: 2 },
  { x: 1800, scale: 1.08, type: 0 },
  { x: 2050, scale: 0.85, type: 1 },
  { x: 2500, scale: 1.02, type: 2 },
  { x: 3170, scale: 1.08, type: 0 },
  { x: 3830, scale: 0.92, type: 1 },
  { x: 4480, scale: 1.05, type: 2 }
];

const BUSH_PLACEMENTS = [
  { x: 330, scale: 0.78, type: 0 },
  { x: 425, scale: 1.05, type: 1 },
  { x: 790, scale: 0.90, type: 1 },
  { x: 870, scale: 0.72, type: 0 },
  { x: 1235, scale: 0.80, type: 0 },
  { x: 1310, scale: 1.12, type: 1 },
  { x: 1760, scale: 1.05, type: 1 },
  { x: 1840, scale: 0.70, type: 0 },
  { x: 2010, scale: 0.72, type: 0 },
  { x: 2090, scale: 0.80, type: 1 },
  { x: 2460, scale: 0.85, type: 1 },
  { x: 2550, scale: 1.05, type: 0 },
  { x: 3130, scale: 0.90, type: 0 },
  { x: 3220, scale: 0.78, type: 1 },
  { x: 3790, scale: 0.75, type: 1 },
  { x: 3880, scale: 1.00, type: 0 },
  { x: 4440, scale: 0.82, type: 0 },
  { x: 4530, scale: 1.10, type: 1 }
];

const FLOWER_PATCHES = [
  { x: 285, count: 3, color: 0 },
  { x: 760, count: 3, color: 1 },
  { x: 1180, count: 3, color: 2 },
  { x: 1700, count: 2, color: 0 },
  { x: 2390, count: 3, color: 1 },
  { x: 2780, count: 2, color: 2 },
  { x: 3090, count: 3, color: 0 },
  { x: 3740, count: 3, color: 1 },
  { x: 4390, count: 3, color: 2 },
  { x: 4960, count: 2, color: 0 }
];

const drawTrees = (night = 0) => {
  const trunk = blendColor("#7a4a2b", "#57404a", night);
  const trunkHighlight = blendColor("#a76a3c", "#765568", night);

  const leafDark = blendColor("#287537", "#24483c", night);
  const leafMid = blendColor("#3f9f3a", "#315b43", night);
  const leafLight = blendColor("#58b847", "#42734a", night);
  const leafHighlight = blendColor("#8be05a", "#72996a", night);

  const shadow = blendColor("#4c743d", "#293d3c", night);

  TREE_PLACEMENTS.forEach(tree => {
    const sx = px(tree.x);

    if (sx < -120 || sx > W + 120) return;

    ctx.save();
    ctx.translate(sx, GY);
    ctx.scale(tree.scale, tree.scale);

    rc(12, -3, 42, 4, shadow);

    rc(23, -66, 12, 66, trunk);
    rc(26, -64, 3, 61, trunkHighlight);

    rc(17, -64, 11, 9, trunk);
    rc(32, -76, 14, 8, trunk);

    if (tree.type === 0) {
      rc(2, -94, 58, 34, leafDark);
      rc(7, -108, 48, 34, leafMid);
      rc(14, -121, 35, 27, leafLight);

      rc(12, -113, 13, 6, leafHighlight);
      rc(33, -116, 11, 5, leafHighlight);

      rc(1, -86, 12, 8, leafMid);
      rc(48, -91, 12, 9, leafDark);
      rc(24, -100, 5, 4, leafDark);
    }

    if (tree.type === 1) {
      rc(25, -132, 10, 21, leafDark);

      rc(18, -117, 25, 22, leafMid);
      rc(11, -100, 39, 23, leafDark);
      rc(4, -81, 53, 21, leafMid);

      rc(21, -126, 7, 7, leafHighlight);
      rc(17, -110, 9, 5, leafHighlight);
      rc(34, -96, 8, 5, leafHighlight);
      rc(12, -78, 12, 5, leafLight);
    }

    if (tree.type === 2) {
      rc(2, -96, 58, 36, leafDark);
      rc(7, -112, 48, 32, leafMid);
      rc(16, -127, 30, 26, leafLight);

      rc(-2, -89, 15, 15, leafMid);
      rc(47, -91, 15, 15, leafDark);

      rc(14, -119, 12, 6, leafHighlight);
      rc(36, -111, 10, 5, leafHighlight);
      rc(5, -96, 9, 5, leafHighlight);
      rc(45, -99, 7, 5, leafMid);
    }

    ctx.restore();
  });
};

const drawBushes = (night = 0) => {
  const dark = blendColor("#328638", "#24483c", night);
  const base = blendColor("#4fae3a", "#315c42", night);
  const light = blendColor("#5cc247", "#497b4d", night);
  const highlight = blendColor("#8be05a", "#72996a", night);

  BUSH_PLACEMENTS.forEach(bush => {
    const sx = px(bush.x);

    if (sx < -70 || sx > W + 70) return;

    ctx.save();
    ctx.translate(sx, GY);
    ctx.scale(bush.scale, bush.scale);

    rc(-2, -3, 45, 4, dark);

    if (bush.type === 0) {
      rc(1, -11, 17, 12, dark);
      rc(6, -18, 20, 16, base);
      rc(20, -14, 20, 13, dark);
      rc(25, -19, 15, 13, light);

      rc(10, -16, 8, 4, highlight);
      rc(28, -17, 6, 3, highlight);
      rc(2, -9, 7, 3, base);
    }

    if (bush.type === 1) {
      rc(0, -10, 43, 10, dark);

      rc(5, -17, 17, 14, base);
      rc(15, -22, 19, 17, light);
      rc(28, -16, 17, 13, base);

      rc(10, -16, 7, 4, highlight);
      rc(23, -20, 7, 4, highlight);
      rc(35, -13, 5, 3, light);
    }

    ctx.restore();
  });
};

const drawFlowers = (night = 0) => {
  const stem = blendColor("#3f9f3a", "#315441", night);
  const leaf = blendColor("#69c441", "#315b43", night);

  const palettes = [
    ["#ff9ac1", "#ffd166"],
    ["#fff0cf", "#ff9ac1"],
    ["#c5a5ff", "#ffd166"]
  ];

  FLOWER_PATCHES.forEach(patch => {
    for (let i = 0; i < patch.count; i++) {
      const flowerX = px(patch.x + i * 11);

      if (flowerX < -12 || flowerX > W + 12) continue;

      const flowerColor = palettes[patch.color][
        i % palettes[patch.color].length
      ];

      const flowerY = GY - 15 - (i % 2) * 3;

      rc(flowerX, GY - 10, 2, 10, stem);
      rc(flowerX - 4, GY - 7, 5, 2, leaf);
      rc(flowerX + 2, GY - 5, 5, 2, leaf);

      rc(flowerX - 3, flowerY + 2, 3, 3, flowerColor);
      rc(flowerX + 2, flowerY + 2, 3, 3, flowerColor);
      rc(flowerX, flowerY - 1, 3, 3, flowerColor);
      rc(flowerX, flowerY + 5, 3, 2, flowerColor);

      rc(flowerX, flowerY + 2, 3, 3, "#ffd166");
    }
  });
};

const drawGround = (night = 0) => {
  const grass = blendColor("#69c441", "#315440", night);
  const grassLight = blendColor("#8be05a", "#577b59", night);
  const dirt = blendColor("#a2593c", "#49394a", night);
  const dirtDark = blendColor("#8e4a30", "#352f42", night);
  const dirtLight = blendColor("#c27a50", "#685064", night);

  rc(0, GY, W, 10, grass);
  rc(0, GY, W, 3, grassLight);
  rc(0, GY + 10, W, H, dirt);

  for (let row = 0; row < 4; row++) {
    for (
      let sx = -(camera.x % 20) - 20;
      sx < W;
      sx += 20
    ) {
      const i = Math.floor((sx + camera.x) / 20);
      const offset = (i + row) % 4 < 2 ? 0 : 7;

      rc(
        sx,
        GY + 26 + row * 26 + offset,
        20,
        6,
        dirtDark
      );

      if ((i + row) % 3 === 0) {
        rc(
          sx + 5,
          GY + 17 + row * 26 + offset,
          3,
          2,
          dirtLight
        );
      }
    }
  }

  for (let i = 0; i < 35; i++) {
    const sx = px(i * 57 + 21);

    if (sx < -5 || sx > W + 5) continue;

    if (i % 3 === 0) {
      rc(sx, GY + 44 + (i % 4) * 22, 3, 2, dirtLight);
    }
  }
};

const drawGrassDetails = (night = 0) => {
  const grass = blendColor("#4b9c42", "#315b47", night);
  const light = blendColor("#8bdc61", "#72996a", night);

  const firstSection = Math.floor(camera.x / 78);

  for (
    let i = firstSection - 1;
    i <= firstSection + Math.ceil(W / 78) + 1;
    i++
  ) {
    const worldX = i * 78 + 24;
    const sx = px(worldX);

    if (sx < -10 || sx > W + 10) continue;

    const height = i % 3 === 0 ? 4 : 3;

    rc(sx, GY - height, 2, height, grass);

    if (i % 2 === 0) {
      rc(sx + 3, GY - 4, 2, 4, light);
    }

    if (i % 4 === 0) {
      rc(sx + 6, GY - 2, 2, 2, grass);
    }
  }
};

const drawStreetLights = (
  night = 0,
  sunset = 0,
  sunrise = 0,
  time = 0,
  bossAwakening = 0
) => {
  const baseLightLevel = Math.max(
    night,
    sunset * 0.65,
    sunrise * 0.65
  );

  const firstLamp = Math.floor((camera.x - 300) / 620);

  const pole = blendColor("#665b5a", "#39394e", night);
  const poleHighlight = blendColor("#a28a76", "#62546a", night);
  const frame = blendColor("#514b55", "#33334a", night);

  for (let i = firstLamp; i < firstLamp + 4; i++) {
    const worldX = i * 620 + 300;
    const sx = px(worldX);

    if (sx < -35 || sx > W + 35) continue;

    const top = GY - 82;

    const flickerWave = Math.sin(time * 19 + i * 4.7);
    const flickerNoise = Math.sin(time * 37 + i * 8.3);

    const flicker =
      flickerWave > -0.15 && flickerNoise > -0.55
        ? 1
        : 0.08;

    const effectiveFlicker =
      1 - bossAwakening + bossAwakening * flicker;

    const lightLevel = baseLightLevel * effectiveFlicker;

    if (lightLevel > 0.02) {
      ctx.save();
      ctx.globalAlpha = lightLevel * 0.10;

      rc(sx - 13, top - 11, 33, 30, "#ffd88a");
      rc(sx - 7, top - 17, 21, 43, "#ffd88a");

      ctx.restore();
    }

    rc(sx, top + 10, 5, 72, pole);
    rc(sx + 1, top + 11, 2, 68, poleHighlight);
    rc(sx - 5, GY - 3, 15, 4, frame);
    rc(sx - 3, top + 7, 11, 4, frame);
    rc(sx + 5, top + 1, 5, 8, frame);
    rc(sx + 7, top - 2, 16, 4, pole);
    rc(sx + 13, top - 10, 16, 13, frame);

    rc(
      sx + 16,
      top - 7,
      10,
      7,
      blendColor("#b9d5d7", "#ffd77d", lightLevel)
    );

    rc(sx + 12, top - 11, 18, 3, frame);
    rc(sx + 13, top + 1, 16, 3, frame);

    if (lightLevel > 0.04) {
      ctx.save();
      ctx.globalAlpha = lightLevel;
      rc(sx + 19, top - 5, 3, 3, "#fff2b5");
      ctx.restore();
    }
  }
};

const drawBreezeGrass = (time, night = 0) => {
  const dark = blendColor("#46983d", "#315441", night);
  const mid = blendColor("#62b94b", "#477b52", night);
  const light = blendColor("#8be05a", "#72996a", night);

  const firstSection = Math.floor(camera.x / 145);

  ctx.save();

  for (
    let i = firstSection - 1;
    i <= firstSection + Math.ceil(W / 145) + 1;
    i++
  ) {
    const worldX = i * 145 + 65;
    const sx = px(worldX);

    if (sx < -15 || sx > W + 15) continue;

    const sway = Math.sin(time * 1.3 + i * 1.7);
    const lean = Math.round(sway * 1.5);

    rc(sx, GY - 4, 2, 4, dark);
    rc(sx + 3 + lean, GY - 6, 2, 6, mid);

    if (i % 2 === 0) {
      rc(sx + 6 + lean, GY - 3, 2, 3, light);
    }
  }

  ctx.restore();
};

const drawFloatingPollen = (
  time,
  night = 0,
  twilight = 0
) => {
  const visibility =
    (1 - night * 0.75) *
    (0.22 + twilight * 0.48);

  if (visibility <= 0.02) return;

  ctx.save();

  for (let i = 0; i < 20; i++) {
    const span = W + 70;

    const rawX =
      i * 149 +
      time * (4 + (i % 3) * 1.8) -
      camera.x * 0.08;

    const x = ((rawX % span) + span) % span - 35;

    const y =
      80 +
      (i * 43) % Math.max(80, GY - 110) +
      Math.sin(time * 0.8 + i * 2.1) * 12;

    const alpha =
      visibility *
      (0.45 + (Math.sin(time * 1.3 + i) + 1) * 0.18);

    ctx.globalAlpha = alpha;

    const size = i % 4 === 0 ? 3 : 2;

    rc(x, y, size, size, i % 3 === 0 ? "#fff2be" : "#f7edca");

    if (i % 5 === 0) {
      rc(x - 2, y + 1, 2, 1, "#fff8df");
      rc(x + size, y + 1, 2, 1, "#fff8df");
    }
  }

  ctx.restore();
};

const drawDriftingLeaves = (
  time,
  night = 0,
  twilight = 0
) => {
  const leafColor = blendColor(
    "#d69b55",
    "#9b6b79",
    night
  );

  const leafHighlight = blendColor(
    "#f4c36e",
    "#c18a8d",
    night
  );

  const visibility =
    (1 - night * 0.35) *
    (0.32 + twilight * 0.25);

  if (visibility <= 0.02) return;

  ctx.save();
  ctx.globalAlpha = visibility;

  for (let i = 0; i < 8; i++) {
    const span = W + 100;

    const rawX =
      i * 173 +
      time * (11 + (i % 3) * 3) -
      camera.x * 0.18;

    const x = ((rawX % span) + span) % span - 50;

    const y =
      125 +
      (i * 47) % Math.max(80, GY - 130) +
      Math.sin(time * 1.3 + i * 2) * 17;

    const rotation = Math.sin(time * 0.9 + i * 1.7) * 0.45;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(rotation);

    rc(-4, -2, 8, 4, leafColor);
    rc(-2, -4, 4, 2, leafHighlight);
    rc(-1, -1, 4, 2, leafHighlight);
    rc(-1, -1, 2, 5, leafColor);

    ctx.restore();
  }

  ctx.restore();
};

const drawFireflies = (
  time,
  night = 0,
  bossAwakening = 0
) => {
  if (night <= 0.02) return;

  const atmosphere = Math.max(
    0,
    Math.min(1, night)
  );

  const calmFactor = 1 - bossAwakening * 0.9;

  if (calmFactor <= 0.02) return;

  ctx.save();

  for (let i = 0; i < 54; i++) {
    const worldX = 180 + i * 174 + (i * 47) % 53;
    const screenBaseX = worldX - camera.x;

    if (screenBaseX < -30 || screenBaseX > W + 30) {
      continue;
    }

    const phase = i * 2.17;
    const pulse = (Math.sin(time * 1.8 + phase) + 1) / 2;

    const blink =
      smoothStep(0.08, 0.38, pulse) *
      (1 - smoothStep(0.82, 0.98, pulse));

    const alpha =
      atmosphere *
      calmFactor *
      (0.12 + blink * 0.7);

    const driftX =
      Math.sin(time * 0.55 + phase) * 10;

    const driftY =
      Math.sin(time * 1.25 + phase * 1.4) * 5;

    const x = Math.round(screenBaseX + driftX);

    const y = Math.round(
      GY - 32 - ((i * 41) % 128) + driftY
    );

    ctx.save();

    ctx.globalAlpha = alpha * 0.42;

    const glow = ctx.createRadialGradient(
      x + 1,
      y + 1,
      1,
      x + 1,
      y + 1,
      12
    );

    glow.addColorStop(0, "rgba(255, 229, 132, 0.72)");
    glow.addColorStop(0.35, "rgba(210, 218, 102, 0.25)");
    glow.addColorStop(1, "rgba(210, 218, 102, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(x - 11, y - 11, 24, 24);

    ctx.globalAlpha = alpha;

    rc(x, y, 3, 3, "#f6ed9c");

    if (blink > 0.65) {
      rc(x - 2, y + 1, 2, 2, "#d7e99a");
      rc(x + 3, y - 1, 2, 2, "#fff5c3");
    }

    ctx.restore();
  }

  ctx.restore();
};

const drawNightMoths = (
  time,
  night = 0
) => {
  if (night <= 0.25) return;

  const firstLamp = Math.floor((camera.x - 300) / 620);

  ctx.save();
  ctx.globalAlpha = night * 0.48;

  for (let i = firstLamp; i < firstLamp + 5; i++) {
    const lampWorldX = i * 620 + 300;
    const screenX = px(lampWorldX);

    if (screenX < -70 || screenX > W + 70) continue;

    const centerY = GY - 89;
    const angle = time * 1.4 + i * 2.6;

    const x = screenX + 22 + Math.cos(angle) * 15;
    const y = centerY + Math.sin(angle * 1.3) * 12;

    const wingsUp = Math.sin(time * 11 + i) > 0;

    if (wingsUp) {
      rc(x - 4, y - 2, 4, 3, "#e8d9b2");
      rc(x + 2, y - 2, 4, 3, "#e8d9b2");
    } else {
      rc(x - 3, y - 3, 3, 5, "#e8d9b2");
      rc(x + 2, y - 3, 3, 5, "#e8d9b2");
    }

    rc(x, y - 1, 3, 4, "#b9a58a");
  }

  ctx.restore();
};

const drawNightBats = (
  time,
  night = 0,
  bossAwakening = 0
) => {
  if (night <= 0.32) return;

  const visibility = night * (1 - bossAwakening * 0.8);

  if (visibility <= 0.02) return;

  const batColor = blendColor(
    "#344057",
    "#191c32",
    night
  );

  ctx.save();
  ctx.globalAlpha = visibility * 0.68;

  for (let i = 0; i < 3; i++) {
    const span = W + 100;

    const rawX =
      i * 230 +
      time * (17 + i * 4) -
      camera.x * 0.12;

    const x = ((rawX % span) + span) % span - 50;

    const y =
      66 +
      i * 37 +
      Math.sin(time * 1.7 + i * 2) * 8;

    const wingsUp = Math.sin(time * 9 + i * 2.5) > 0;

    if (wingsUp) {
      rc(x - 9, y - 5, 4, 5, batColor);
      rc(x - 5, y - 2, 4, 3, batColor);
      rc(x + 1, y - 2, 4, 3, batColor);
      rc(x + 5, y - 5, 4, 5, batColor);
    } else {
      rc(x - 9, y - 1, 4, 3, batColor);
      rc(x - 5, y - 3, 4, 3, batColor);
      rc(x + 1, y - 3, 4, 3, batColor);
      rc(x + 5, y - 1, 4, 3, batColor);
    }

    rc(x - 2, y - 1, 6, 4, batColor);
    rc(x, y - 3, 2, 2, batColor);
  }

  ctx.restore();
};

const drawPlatformFlowers = (sx, y, w, index, night) => {
  const stem = blendColor("#3f9f3a", "#315441", night);
  const leaf = blendColor("#69c441", "#315b43", night);

  const flowerColors = [
    "#ff9ac1",
    "#ffd166",
    "#ffffff",
    "#c5a5ff",
    "#ff8a78"
  ];

  const flowerCount = w >= 130 ? 2 : 1;

  for (let i = 0; i < flowerCount; i++) {
    const flowerX = i === 0
      ? sx + 15
      : sx + w - 22;

    const flowerColor = flowerColors[
      (index + i * 2) % flowerColors.length
    ];

    const flowerY = y - 18 - ((index + i) % 2) * 3;

    rc(flowerX, y - 6, 2, 7, stem);
    rc(flowerX - 4, y - 5, 4, 2, leaf);
    rc(flowerX + 2, y - 3, 4, 2, leaf);

    rc(flowerX - 3, flowerY + 2, 3, 3, flowerColor);
    rc(flowerX + 2, flowerY + 2, 3, 3, flowerColor);
    rc(flowerX, flowerY - 1, 3, 3, flowerColor);
    rc(flowerX, flowerY + 5, 3, 2, flowerColor);
    rc(flowerX, flowerY + 2, 3, 3, "#ffd166");
  }
};

const drawPlatformGrassTufts = (sx, y, w, night) => {
  const dark = blendColor("#328638", "#24483c", night);
  const mid = blendColor("#4fae3a", "#315b43", night);
  const light = blendColor("#8be05a", "#72996a", night);

  const positions = [
    sx + 7,
    sx + w - 12
  ];

  positions.forEach((x, index) => {
    if (index === 0) {
      rc(x, y - 5, 2, 5, dark);
      rc(x + 3, y - 8, 2, 8, mid);
      rc(x + 6, y - 4, 2, 4, light);
    } else {
      rc(x, y - 4, 2, 4, light);
      rc(x + 3, y - 9, 2, 9, mid);
      rc(x + 6, y - 5, 2, 5, dark);
    }
  });
};

const drawPlatformDecorations = (night = 0) => {
  PLATS.forEach((platform, index) => {
    const sx = px(platform.x);

    if (sx < -200 || sx > W) return;

    const surfaceY = platform.y - 6;

    drawPlatformGrassTufts(
      sx,
      surfaceY,
      platform.w,
      night
    );

    drawPlatformFlowers(
      sx,
      surfaceY,
      platform.w,
      index,
      night
    );
  });
};

const drawPlatforms = () => {
  PLATS.forEach(platform => {
    const sx = px(platform.x);

    if (sx < -200 || sx > W) return;

    rc(sx, platform.y, platform.w, 16, "#a2593c");
    rc(sx, platform.y + 8, platform.w, 5, "#8e4a30");
    rc(sx, platform.y - 6, platform.w, 8, "#69c441");
    rc(sx, platform.y - 6, platform.w, 3, "#8be05a");
    rc(sx, platform.y + 3, platform.w, 2, "#b96e4a");
  });
};

const drawTruck = (night = 0) => {
  const tx = px(TX);

  if (tx < -220 || tx > W + 20) return;

  rc(tx, GY - 92, 180, 84, "#f4f8ff");
  rc(tx, GY - 92, 180, 6, "#cfe3fb");
  rc(tx, GY - 30, 180, 14, "#7aa3e8");

  for (let i = 0; i < 9; i++) {
    rc(
      tx + i * 20,
      GY - 110,
      20,
      16,
      i % 2 ? "#fff" : "#ff6f9c"
    );
  }

  rc(tx + 40, GY - 82, 100, 44, "#2a3a8a");

  ctx.fillStyle = "#e8434f";
  ctx.font = '700 15px "Pixelify Sans", monospace';
  ctx.textAlign = "left";
  ctx.fillText("CANDY SHOP", tx + 46, GY - 64);

  rc(tx + 36, GY - 48, 108, 8, "#c98a52");
  rc(tx + 36, GY - 48, 108, 3, "#e8b07a");

  [28, 140].forEach(offset => {
    rc(tx + offset, GY - 18, 24, 24, "#2b2f3a");
    rc(tx + offset + 7, GY - 11, 10, 10, "#b8c4d6");
  });

  if (night > 0.2) {
    ctx.save();
    ctx.globalAlpha = night * 0.35;
    rc(tx + 45, GY - 78, 86, 3, "#ffd166");
    ctx.restore();
  }
};

const drawCoins = (coins, time) => {
  coins.forEach(coin => {
    if (coin.collected || coin.got) return;

    const sx = px(coin.x);

    if (sx < -20 || sx > W + 20) return;

    const y =
      coin.y + Math.round(Math.sin(time * 4 + coin.x) * 3);

    const colors = [
      "#ff6f9c",
      "#5fe0b0",
      "#ffd166",
      "#7fc8ff"
    ];

    const color = colors[Math.floor(coin.x / 9) % 4];

    rc(sx - 14, y - 3, 6, 6, color);
    rc(sx + 8, y - 3, 6, 6, color);
    rc(sx - 8, y - 7, 16, 14, color);
    rc(sx - 4, y - 7, 3, 14, "#fff");
    rc(sx - 8, y - 7, 16, 3, "rgba(255,255,255,.45)");
  });
};

const drawBossAtmosphere = (time, intensity = 0) => {
  if (intensity <= 0) return;

  const strength = Math.max(0, Math.min(1, intensity));
  const bossX = px(BOSS.x);

  ctx.save();

  ctx.globalAlpha = strength * 0.16;
  rc(0, 0, W, H, "#171124");

  if (bossX > -220 && bossX < W + 220) {
    const pulse = 0.75 + Math.sin(time * 2.2) * 0.15;

    const glow = ctx.createRadialGradient(
      bossX,
      GY - 48,
      8,
      bossX,
      GY - 48,
      190
    );

    glow.addColorStop(
      0,
      `rgba(126, 35, 61, ${0.24 * strength * pulse})`
    );

    glow.addColorStop(
      0.55,
      `rgba(90, 29, 57, ${0.12 * strength})`
    );

    glow.addColorStop(1, "rgba(50, 20, 48, 0)");

    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;

    ctx.fillRect(
      bossX - 190,
      GY - 220,
      380,
      220
    );
  }

  ctx.globalAlpha = strength * 0.09;

  for (let i = 0; i < 6; i++) {
    const width = 55 + (i % 3) * 35;

    const x =
      ((time * (9 + i * 2) + i * 137) %
        (W + width)) - width;

    const y = GY - 94 + i * 13;

    rc(x, y, width, 3, "#ad7185");
  }

  const glitchWave = Math.sin(time * 4.8);

  if (glitchWave > 0.82) {
    ctx.globalAlpha = strength * 0.18;

    const lineY = Math.floor((time * 113) % H);

    rc(0, lineY, W, 2, "#e65a73");
  }

  ctx.globalAlpha = strength * 0.28;

  for (let i = 0; i < 13; i++) {
    const speed = 12 + (i % 4) * 9;

    const x = (
      i * 127 + Math.floor(time * speed)
    ) % W;

    const y = 35 + (i * 43) % 190;

    if (i % 3 === 0) {
      rc(x, y, 5, 2, "#e65a73");
    } else {
      rc(x, y, 2, 2, "#b9a3c9");
    }
  }

  ctx.restore();
};

const drawTownBanner = (night = 0) => {
  const x = px(100);
  const y = GY;

  const wood = blendColor("#76503a", "#393348", night);
  const woodLight = blendColor("#a87950", "#62516a", night);
  const cloth = blendColor("#b98b9c", "#66536e", night);
  const clothLight = blendColor("#d6a5ad", "#89708c", night);
  const faded = blendColor("#806b77", "#51465f", night);
  const textColor = blendColor("#65515c", "#c0a0ad", night);

  rc(x + 3, y - 145, 7, 145, wood);
  rc(x + 5, y - 143, 2, 140, woodLight);

  rc(x + 153, y - 145, 7, 145, wood);
  rc(x + 155, y - 143, 2, 140, woodLight);

  rc(x - 1, y - 148, 15, 5, woodLight);
  rc(x + 150, y - 148, 15, 5, woodLight);

  rc(x + 8, y - 146, 147, 5, wood);
  rc(x + 12, y - 145, 136, 2, woodLight);

  rc(x + 12, y - 140, 136, 30, cloth);
  rc(x + 12, y - 140, 136, 4, clothLight);
  rc(x + 12, y - 136, 5, 21, faded);

  rc(x + 20, y - 110, 18, 7, cloth);
  rc(x + 38, y - 110, 12, 4, clothLight);
  rc(x + 50, y - 110, 17, 7, cloth);
  rc(x + 67, y - 110, 11, 4, faded);
  rc(x + 78, y - 110, 20, 7, cloth);
  rc(x + 98, y - 110, 13, 4, clothLight);
  rc(x + 111, y - 110, 18, 7, cloth);
  rc(x + 129, y - 110, 19, 4, faded);

  rc(x + 18, y - 132, 5, 15, faded);
  rc(x + 23, y - 132, 4, 5, clothLight);
  rc(x + 35, y - 137, 3, 10, faded);

  rc(x + 85, y - 140, 4, 12, faded);
  rc(x + 89, y - 140, 3, 5, clothLight);

  rc(x + 112, y - 137, 5, 18, faded);
  rc(x + 117, y - 137, 3, 5, clothLight);

  rc(x + 137, y - 140, 11, 4, cloth);
  rc(x + 140, y - 136, 8, 10, faded);
  rc(x + 143, y - 126, 5, 8, cloth);

  rc(x + 45, y - 132, 3, 3, faded);
  rc(x + 48, y - 129, 3, 3, faded);
  rc(x + 51, y - 126, 3, 3, faded);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 14px "Pixelify Sans", monospace';
  ctx.textAlign = "center";
  ctx.fillText("TOWN", x + 80, y - 119);

  rc(x + 3, y - 42, 7, 4, woodLight);
  rc(x + 153, y - 3, 13, 3, wood);
  rc(x - 2, y - 3, 16, 3, wood);

  rc(x + 158, y - 145, 5, 17, wood);
  rc(x + 158, y - 128, 3, 8, woodLight);
};


const drawNPCDecorations = (
  night = 0,
  time = 0,
  bossAwakening = 0
) => {
  const wood = blendColor("#a87950", "#66546a", night);
  const woodLight = blendColor("#c39463", "#81708a", night);
  const woodDark = blendColor("#76503a", "#51445c", night);

  const green = blendColor("#4fae3a", "#315b43", night);
  const greenLight = blendColor("#8be05a", "#72996a", night);

  const gold = blendColor("#ffd166", "#bda16f", night);
  const cream = blendColor("#f5e8c5", "#b3a6ad", night);

  const stone = blendColor("#8994a8", "#51516e", night);
  const stoneLight = blendColor("#b3c0d5", "#77708c", night);

  const place = x => px(x);

  const drawCrate = (worldX, width = 25, height = 19) => {
    const x = place(worldX);

    rc(x, GY - height + 2, width, height - 2, wood);
    rc(x + 2, GY - height, width - 4, 3, woodLight);
    rc(x + 4, GY - height + 5, width - 8, 2, woodDark);
    rc(x + 5, GY - height + 8, 2, height - 12, woodLight);
    rc(x + width - 7, GY - height + 8, 2, height - 12, woodLight);
  };

  const drawBarrel = worldX => {
    const x = place(worldX);

    rc(x + 3, GY - 22, 20, 21, woodDark);
    rc(x + 5, GY - 21, 16, 18, wood);
    rc(x + 7, GY - 21, 3, 18, woodLight);
    rc(x + 5, GY - 17, 16, 3, woodLight);
    rc(x + 5, GY - 7, 16, 3, woodLight);
    rc(x + 14, GY - 19, 4, 13, woodDark);
  };

  const drawPawPrint = (worldX, yOffset = 0) => {
    const x = place(worldX);
    const color = blendColor("#956c52", "#66536a", night);

    rc(x + 2, GY - 8 + yOffset, 4, 4, color);
    rc(x - 1, GY - 13 + yOffset, 3, 3, color);
    rc(x + 3, GY - 15 + yOffset, 3, 3, color);
    rc(x + 7, GY - 13 + yOffset, 3, 3, color);
    rc(x + 10, GY - 9 + yOffset, 3, 3, color);
  };

  const drawPotion = (worldX, color) => {
    const x = place(worldX);
    const liquid = blendColor(color, "#51496d", night * 0.35);

    rc(x + 3, GY - 24, 7, 3, woodDark);
    rc(x + 4, GY - 22, 5, 5, "#c5b89d");
    rc(x + 2, GY - 17, 9, 11, stone);
    rc(x + 4, GY - 15, 5, 8, liquid);
    rc(x + 4, GY - 20, 5, 3, cream);
    rc(x + 6, GY - 14, 2, 3, "#fff0cf");
  };

  const drawCrystal = (worldX, height, color, phase = 0) => {
    const x = place(worldX);
    const pulse = 0.55 + Math.sin(time * 2 + phase) * 0.2;

    const crystalColor = blendColor(
      color,
      "#55516d",
      night * 0.3
    );

    ctx.save();
    ctx.globalAlpha = 0.13 + pulse * 0.11;

    const glow = ctx.createRadialGradient(
      x + 7,
      GY - height / 2,
      2,
      x + 7,
      GY - height / 2,
      height * 0.65
    );

    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(100, 80, 180, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(
      x - height / 2,
      GY - height,
      height * 1.5,
      height
    );

    ctx.restore();

    rc(x + 5, GY - height, 7, height, crystalColor);
    rc(x + 2, GY - height + 9, 4, height - 14, crystalColor);
    rc(x + 5, GY - height, 7, 9, color);
    rc(x + 8, GY - height + 5, 4, height - 12, color);
    rc(x + 5, GY - height + 10, 2, 5, "#e8dafa");
  };

  const drawLuigiDetails = () => {
    drawPawPrint(530);
    drawPawPrint(550, -5);

    const x = place(515);

    rc(x, GY - 7, 21, 7, stone);
    rc(x + 3, GY - 11, 15, 5, stoneLight);
    rc(x + 5, GY - 9, 4, 2, cream);
    rc(x + 9, GY - 8, 3, 2, "#c8d2dc");
  };

  const drawBirdPerch = () => {
    const x = place(970);

    rc(x + 17, GY - 54, 5, 54, woodDark);
    rc(x + 19, GY - 51, 2, 49, woodLight);

    rc(x - 2, GY - 49, 44, 4, woodDark);
    rc(x + 1, GY - 48, 38, 2, woodLight);

    rc(x + 24, GY - 55, 17, 7, wood);
    rc(x + 26, GY - 59, 12, 5, woodLight);

    rc(x + 6, GY - 41, 12, 9, "#e3b85c");
    rc(x + 8, GY - 39, 8, 5, "#f8d57f");

    rc(x + 5, GY - 53, 8, 8, "#6e9cce");
    rc(x + 6, GY - 57, 6, 5, "#7fc8ff");
    rc(x + 12, GY - 52, 4, 3, "#ffd166");
    rc(x + 8, GY - 51, 2, 2, "#fff");
  };

  const drawCandyStand = () => {
    const x = place(1450);

    rc(x, GY - 29, 52, 5, woodDark);
    rc(x + 3, GY - 27, 46, 3, woodLight);

    rc(x + 5, GY - 24, 5, 24, wood);
    rc(x + 42, GY - 24, 5, 24, wood);

    const jars = [
      { x: 8, color: "#ff6f9c" },
      { x: 22, color: "#5fe0b0" },
      { x: 36, color: "#ffd166" }
    ];

    jars.forEach(jar => {
      rc(x + jar.x, GY - 43, 10, 13, stone);
      rc(x + jar.x + 2, GY - 41, 6, 9, jar.color);
      rc(x + jar.x + 3, GY - 45, 4, 3, cream);
      rc(x + jar.x + 3, GY - 39, 2, 2, "#fff");
    });

    rc(x + 16, GY - 54, 22, 3, woodDark);
    rc(x + 18, GY - 52, 18, 2, "#ff9ac1");
    rc(x + 24, GY - 59, 6, 8, "#ffd166");
    rc(x + 22, GY - 61, 10, 3, "#ff9ac1");
  };

  const drawBeehive = () => {
    const x = place(2135);

    rc(x + 3, GY - 3, 37, 3, woodDark);
    rc(x + 11, GY - 30, 23, 30, "#d7a653");
    rc(x + 8, GY - 25, 29, 8, "#e6b65f");
    rc(x + 11, GY - 18, 23, 8, "#bd8545");
    rc(x + 14, GY - 11, 17, 8, "#e5b45c");

    rc(x + 9, GY - 31, 27, 4, wood);
    rc(x + 16, GY - 37, 13, 7, "#e6b65f");
    rc(x + 20, GY - 41, 5, 5, "#d59c4f");

    rc(x + 20, GY - 8, 5, 4, woodDark);
    rc(x + 3, GY - 2, 36, 2, woodLight);

    rc(x + 45, GY - 2, 15, 2, wood);
    rc(x + 46, GY - 9, 12, 8, "#dca75e");
  };

  const drawBeeSwarm = () => {
    const beeColor = blendColor("#ffd166", "#c9a66d", night);

    [
      [2200, 86],
      [2217, 72],
      [2250, 92],
      [2185, 65]
    ].forEach(([worldX, y], index) => {
      const x = place(worldX) + Math.sin(time * 2 + index) * 3;
      const bob = Math.sin(time * 3 + index * 2) * 2;

      rc(x, y + bob, 5, 3, beeColor);
      rc(x + 5, y + bob, 2, 3, woodDark);
      rc(x + 1, y - 2 + bob, 3, 2, "#eff4ed");
    });
  };

  const drawRobotWorkbench = () => {
    const x = place(2805);

    rc(x, GY - 27, 66, 6, woodDark);
    rc(x + 3, GY - 25, 60, 3, woodLight);

    rc(x + 5, GY - 21, 6, 21, wood);
    rc(x + 55, GY - 21, 6, 21, wood);

    rc(x + 12, GY - 40, 18, 12, stone);
    rc(x + 14, GY - 38, 14, 8, stoneLight);
    rc(x + 17, GY - 35, 3, 3, "#5fe0b0");
    rc(x + 23, GY - 35, 3, 3, "#7fc8ff");

    rc(x + 37, GY - 39, 17, 11, wood);
    rc(x + 39, GY - 37, 13, 7, "#bdc9d9");
    rc(x + 42, GY - 35, 7, 3, "#667b98");

    rc(x + 4, GY - 31, 5, 4, "#ffd166");
    rc(x + 60, GY - 35, 8, 3, "#7fc8ff");
  };

  const drawGear = worldX => {
    const x = place(worldX);

    rc(x + 4, GY - 15, 12, 12, "#b8c4d6");
    rc(x + 1, GY - 11, 18, 4, "#b8c4d6");
    rc(x + 8, GY - 18, 4, 18, "#b8c4d6");

    rc(x + 7, GY - 12, 6, 6, "#536486");
    rc(x + 9, GY - 10, 2, 2, "#ffd166");
  };

  const drawFishingProps = () => {
    const x = place(3450);

    drawCrate(3450, 27, 19);
    drawBarrel(3490);

    rc(x + 36, GY - 27, 13, 5, stone);
    rc(x + 38, GY - 25, 9, 3, "#7fc8ff");
    rc(x + 40, GY - 30, 4, 4, cream);

    rc(x + 52, GY - 59, 3, 3, woodDark);
    rc(x + 53, GY - 62, 3, 5, wood);
    rc(x + 54, GY - 67, 3, 6, woodLight);
    rc(x + 56, GY - 72, 3, 6, woodLight);
    rc(x + 58, GY - 75, 3, 5, woodDark);

    rc(x + 59, GY - 70, 1, 39, "#c8d9e8");
    rc(x + 57, GY - 31, 4, 2, "#ffd166");
    rc(x + 57, GY - 29, 2, 5, "#c8d9e8");

    rc(x + 62, GY - 9, 8, 3, "#7fc8ff");
    rc(x + 68, GY - 11, 4, 2, "#b9e8f7");
  };

 const drawWizardDecor = () => {
  const x = place(4055);

  const purple = blendColor("#a78acb", "#6b6389", night);
  const purpleLight = blendColor("#d1b5ed", "#9183aa", night);
  const blue = blendColor("#7fc8df", "#527c9a", night);

  const mushroom = blendColor("#b28bd5", "#77658d", night);

  const tableY = GY - 27;

  rc(x + 5, tableY, 68, 4, wood);
  rc(x + 8, tableY + 3, 4, 24, woodDark);
  rc(x + 65, tableY + 3, 4, 24, woodDark);
  rc(x + 9, tableY + 4, 2, 21, woodLight);
  rc(x + 66, tableY + 4, 2, 21, woodLight);

  rc(x + 14, GY - 31, 48, 4, purple);
  rc(x + 17, GY - 32, 41, 2, purpleLight);

  rc(x + 18, GY - 37, 17, 6, woodDark);
  rc(x + 20, GY - 36, 13, 4, cream);
  rc(x + 22, GY - 36, 8, 2, purple);

  rc(x + 42, GY - 40, 13, 9, woodLight);
  rc(x + 44, GY - 38, 9, 5, "#8f76b6");
  rc(x + 46, GY - 37, 5, 2, "#e9d7f5");

  rc(x + 8, GY - 43, 4, 12, woodDark);
  rc(x + 5, GY - 45, 10, 3, woodLight);

  rc(x + 6, GY - 51, 3, 7, green);
  rc(x + 10, GY - 54, 3, 10, greenLight);
  rc(x + 13, GY - 49, 3, 6, green);

  rc(x + 6, GY - 55, 3, 3, "#d0a8e5");
  rc(x + 10, GY - 58, 3, 3, "#d0a8e5");

  const drawHerbPot = (potX, color) => {
    rc(potX + 3, GY - 13, 14, 12, woodDark);
    rc(potX + 5, GY - 12, 10, 9, color);
    rc(potX + 4, GY - 14, 12, 3, woodLight);

    rc(potX + 9, GY - 22, 2, 9, green);
    rc(potX + 5, GY - 21, 5, 3, greenLight);
    rc(potX + 11, GY - 25, 6, 4, green);
    rc(potX + 7, GY - 27, 4, 4, greenLight);
  };

  drawHerbPot(4070, "#b47b68");
  drawHerbPot(4130, "#8d78a9");

  const drawMushroom = (mushX, size, color) => {
    const mushroomX = place(mushX);

    rc(mushroomX + 4, GY - size, 5, size - 3, cream);
    rc(mushroomX, GY - size - 4, 13, 5, color);
    rc(mushroomX + 2, GY - size - 7, 8, 4, color);

    rc(mushroomX + 3, GY - size - 3, 2, 2, "#fff0cf");
    rc(mushroomX + 9, GY - size - 5, 2, 2, "#fff0cf");
  };

  drawMushroom(4140, 15, mushroom);
  drawMushroom(4160, 11, blue);
  drawMushroom(4120, 9, "#cf9bc7");

  rc(x + 83, GY - 5, 3, 5, green);
  rc(x + 79, GY - 12, 7, 8, purple);
  rc(x + 77, GY - 14, 11, 4, purpleLight);
  rc(x + 81, GY - 18, 4, 5, "#e9d7f5");

  const sparklePositions = [
    [4095, GY - 76],
    [4120, GY - 91],
    [4150, GY - 68],
    [4108, GY - 62]
  ];

  sparklePositions.forEach(([worldX, y], index) => {
    const sparkleX = place(worldX);
    const pulse = Math.sin(time * 2.2 + index * 1.7);
    const size = pulse > 0.25 ? 3 : 2;

    ctx.save();
    ctx.globalAlpha = 0.55 + (pulse + 1) * 0.18;

    rc(sparkleX, y, size, size, "#fff0cf");

    if (size === 3) {
      rc(sparkleX - 2, y + 1, 2, 1, purpleLight);
      rc(sparkleX + 3, y + 1, 2, 1, purpleLight);
    }

    ctx.restore();
  });
};

  const drawPumpkin = worldX => {
    const x = place(worldX);

    const orange = blendColor("#e99b45", "#a97962", night);
    const orangeLight = blendColor("#f4ba65", "#bd9670", night);

    rc(x + 3, GY - 15, 18, 13, orange);
    rc(x, GY - 12, 24, 9, orange);
    rc(x + 5, GY - 18, 14, 5, orangeLight);

    rc(x + 8, GY - 14, 3, 10, orangeLight);
    rc(x + 14, GY - 14, 3, 10, wood);
    rc(x + 11, GY - 20, 3, 5, green);

    rc(x + 5, GY - 8, 3, 3, "#f6ca7b");
  };

  const drawCropPatch = worldX => {
    const x = place(worldX);

    rc(x, GY - 2, 49, 2, woodDark);

    for (let i = 0; i < 3; i++) {
      const cropX = x + 5 + i * 15;

      rc(cropX, GY - 13, 2, 13, green);

      rc(cropX - 4, GY - 13, 5, 4, greenLight);
      rc(cropX + 2, GY - 18, 5, 4, greenLight);

      rc(cropX, GY - 20, 3, 3, gold);
      rc(cropX - 2, GY - 23, 3, 3, gold);
    }
  };

  const drawWateringCan = worldX => {
    const x = place(worldX);

    const can = blendColor("#7fc8d8", "#526b82", night);
    const highlight = blendColor("#b9e8ed", "#8099a5", night);

    rc(x + 4, GY - 17, 19, 13, can);
    rc(x + 7, GY - 20, 13, 4, highlight);
    rc(x + 8, GY - 13, 12, 7, can);

    rc(x + 19, GY - 14, 12, 3, can);
    rc(x + 28, GY - 17, 5, 6, highlight);

    rc(x + 5, GY - 17, 3, 8, highlight);

    rc(x + 2, GY - 15, 5, 3, can);
    rc(x + 1, GY - 12, 3, 7, can);
  };

  const drawHarvestBasket = worldX => {
    const x = place(worldX);

    rc(x + 2, GY - 14, 26, 13, wood);
    rc(x + 4, GY - 12, 22, 9, woodLight);

    rc(x + 4, GY - 17, 7, 7, "#e99b45");
    rc(x + 12, GY - 20, 7, 10, "#e99b45");
    rc(x + 20, GY - 16, 6, 6, "#d98c49");

    rc(x + 5, GY - 19, 3, 4, green);
    rc(x + 13, GY - 22, 3, 4, greenLight);
    rc(x + 21, GY - 18, 3, 4, green);
  };

  const drawFarmerDecor = () => {
    drawHarvestBasket(4680);
    drawPumpkin(4715);
    drawPumpkin(4745);

    drawCropPatch(4780);
    drawCropPatch(4835);

    drawWateringCan(4895);
    drawBarrel(4940);

    drawCrate(4980, 30, 19);
    drawPumpkin(5015);
  };

  const drawBossRuins = () => {
    const intensity = Math.max(night, bossAwakening);
    const darkStone = blendColor("#55516d", "#24243f", intensity);
    const purpleStone = blendColor("#786184", "#392a50", intensity);
    const crystal = blendColor("#a75b86", "#613254", intensity);

    [5100, 5360].forEach((worldX, index) => {
      const x = place(worldX);
      const height = index === 0 ? 62 : 82;

      rc(x, GY - height, 24, height, darkStone);
      rc(x + 4, GY - height + 5, 16, height - 5, purpleStone);
      rc(x - 2, GY - height - 4, 28, 7, darkStone);

      rc(x + 7, GY - 21, 3, 11, crystal);
      rc(x + 14, GY - 35, 4, 14, crystal);

      rc(x + 7, GY - height + 17, 3, 12, stone);
      rc(x + 12, GY - height + 29, 4, 8, stone);
    });

    const x = place(5165);

    rc(x, GY - 5, 45, 5, darkStone);
    rc(x + 5, GY - 16, 8, 12, purpleStone);
    rc(x + 14, GY - 24, 8, 20, crystal);
    rc(x + 26, GY - 13, 9, 9, purpleStone);
  };

  drawLuigiDetails();
  drawBirdPerch();
  drawCandyStand();

  drawBeehive();
  drawBeeSwarm();

  drawRobotWorkbench();
  drawGear(2785);
  drawGear(2875);

  drawFishingProps();

  drawWizardDecor();
  drawFarmerDecor();

  drawBossRuins();
};



export const drawEnvironment = ({
  coins = [],
  time = 0,
  night = 0,
  bossAwakening = 0
} = {}) => {
  const cycle = getDayCycle(time);

  const currentNight = Math.max(
    night,
    cycle.night,
    bossAwakening * 0.78
  );

  const twilight = Math.max(
    cycle.sunset,
    cycle.sunrise
  );

  const birdDarkness = Math.max(
    currentNight,
    bossAwakening
  );

  drawSky(
    time,
    currentNight,
    cycle.sunset,
    cycle.sunrise
  );

  drawBirds(time, birdDarkness);

  drawBuildings(
    currentNight,
    cycle.sunset,
    cycle.sunrise
  );

  drawTrees(currentNight);
  drawBushes(currentNight);
  drawFlowers(currentNight);

  drawGround(currentNight);

  drawNPCDecorations(
    currentNight,
    time,
    bossAwakening
  );

  drawTownBanner(currentNight);
  drawGrassDetails(currentNight);

  drawBreezeGrass(time, currentNight);

  drawStreetLights(
    currentNight,
    cycle.sunset,
    cycle.sunrise,
    time,
    bossAwakening
  );

  drawPlatforms();
  drawPlatformDecorations(currentNight);
  drawTruck(currentNight);
  drawCoins(coins, time);

  drawBossAtmosphere(time, bossAwakening);

  drawFloatingPollen(
    time,
    currentNight,
    twilight
  );

  drawDriftingLeaves(
    time,
    currentNight,
    twilight
  );

  drawNightBats(
    time,
    currentNight,
    bossAwakening
  );

  drawNightMoths(
    time,
    currentNight * (1 - bossAwakening)
  );

  const fireflyLevel = Math.max(
    currentNight,
    twilight * 0.32
  );

  drawFireflies(
    time,
    fireflyLevel,
    bossAwakening
  );

  ctx.textAlign = "left";
}; 
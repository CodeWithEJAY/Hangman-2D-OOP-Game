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

const drawTrees = (night = 0) => {
  const trunk = blendColor("#7a4a2b", "#57404a", night);
  const trunkHighlight = blendColor("#a76a3c", "#765568", night);
  const leafDark = blendColor("#328638", "#24483c", night);
  const leafMid = blendColor("#3f9f3a", "#315b43", night);
  const leafLight = blendColor("#4fae3a", "#42734a", night);
  const leafHighlight = blendColor("#7be05a", "#72996a", night);

  for (let i = 0; i < 22; i++) {
    const sx = px(250 + i * 520);

    if (sx < -120 || sx > W + 120) continue;

    rc(sx + 20, GY - 60, 10, 60, trunk);
    rc(sx + 22, GY - 58, 3, 55, trunkHighlight);

    rc(sx - 4, GY - 92, 58, 34, leafDark);
    rc(sx - 4, GY - 92, 58, 31, leafMid);

    rc(sx + 6, GY - 116, 38, 28, leafLight);
    rc(sx + 10, GY - 110, 12, 6, leafHighlight);
    rc(sx + 30, GY - 105, 7, 4, leafHighlight);

    rc(sx + 2, GY - 84, 7, 5, leafHighlight);
    rc(sx + 25, GY - 94, 4, 3, leafDark);
    rc(sx + 42, GY - 88, 5, 3, leafDark);
    rc(sx + 17, GY - 79, 4, 3, leafDark);
  }
};

const drawBushes = (night = 0) => {
  const base = blendColor("#4fae3a", "#315c42", night);
  const dark = blendColor("#328638", "#24483c", night);
  const light = blendColor("#5cc247", "#497b4d", night);
  const highlight = blendColor("#8be05a", "#72996a", night);

  for (let i = 0; i < 40; i++) {
    const sx = px(80 + i * 190);

    if (sx < -60 || sx > W + 60 || i % 3 === 2) continue;

    rc(sx, GY - 14, 36, 14, dark);
    rc(sx + 2, GY - 14, 32, 12, base);
    rc(sx + 6, GY - 22, 24, 10, light);
    rc(sx + 10, GY - 20, 6, 4, highlight);
    rc(sx + 23, GY - 17, 5, 3, dark);
    rc(sx + 2, GY - 9, 6, 4, dark);
  }
};

const drawFlowers = (night = 0) => {
  const stem = blendColor("#3f9f3a", "#315441", night);

  for (let i = 0; i < 62; i++) {
    const sx = px(60 + i * 97);

    if (sx < -10 || sx > W + 10 || i % 4) continue;

    const color = i % 8 ? "#ff9ac1" : "#ffd166";

    rc(sx, GY - 12, 2, 12, stem);
    rc(sx, GY - 17, 2, 3, color);
    rc(sx - 3, GY - 16, 8, 6, color);
    rc(sx, GY - 15, 2, 2, "#fff");
  }
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
  const grass = blendColor("#3f9f3a", "#315441", night);
  const light = blendColor("#8be05a", "#72996a", night);

  for (let i = 0; i < 90; i++) {
    const sx = px(i * 31 + 13);

    if (sx < -10 || sx > W + 10) continue;

    if (i % 4 === 0) {
      rc(sx, GY - 5, 2, 5, grass);
      rc(sx + 3, GY - 4, 2, 4, grass);
      rc(sx + 1, GY - 7, 2, 2, light);
    } else if (i % 4 === 1) {
      rc(sx, GY - 3, 2, 3, light);
    }
  }
};

/* ---------- STREET LIGHTS ---------- */

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

/* ---------- AMBIENT ENVIRONMENT EFFECTS ---------- */

const drawBreezeGrass = (time, night = 0) => {
  const dark = blendColor("#328638", "#24483c", night);
  const mid = blendColor("#4fae3a", "#315b43", night);
  const light = blendColor("#8be05a", "#72996a", night);

  ctx.save();

  for (let i = 0; i < 72; i++) {
    const worldX = i * 37 + 17;
    const sx = px(worldX);

    if (sx < -15 || sx > W + 15) continue;

    const sway = Math.sin(time * 1.4 + i * 0.85);
    const secondSway = Math.sin(time * 1.1 + i * 1.3);

    const lean = Math.round(sway * 3);
    const baseY = GY;

    rc(sx, baseY - 5, 2, 5, dark);
    rc(sx + 3 + lean, baseY - 8 + Math.round(secondSway), 2, 8, mid);
    rc(sx + 6 + lean, baseY - 4, 2, 4, light);

    if (i % 3 === 0) {
      rc(sx + 2 + lean, baseY - 10 + Math.round(secondSway), 2, 2, light);
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

/* ---------- PLATFORM DECORATIONS ---------- */

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

/* ---------- BOSS ARRIVAL ATMOSPHERE ---------- */

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
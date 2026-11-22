import { ctx, camera } from "./canvas.js";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_Y,
  TRUCK_X
} from "../constants.js";
import { PLATS } from "../data/world.js";

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
    const x = 250 + i * 520;
    const sx = px(x);

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
    const x = 80 + i * 190;
    const sx = px(x);

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
    const x = 60 + i * 97;
    const sx = px(x);

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

const drawStreetLights = (night = 0, sunset = 0, sunrise = 0) => {
  const lightLevel = Math.max(
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
    rc(sx + 16, top - 7, 10, 7, blendColor(
      "#b9d5d7",
      "#ffd77d",
      lightLevel
    ));

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

export const drawEnvironment = ({
  coins = [],
  time = 0,
  night = 0
} = {}) => {
  const cycle = getDayCycle(time);

  const currentNight = Math.max(
    night,
    cycle.night
  );

  drawSky(
    time,
    currentNight,
    cycle.sunset,
    cycle.sunrise
  );

  drawBirds(time, currentNight);

  drawBuildings(
    currentNight,
    cycle.sunset,
    cycle.sunrise
  );

  drawTrees(currentNight);
  drawBushes(currentNight);
  drawFlowers(currentNight);
  drawGround(currentNight);
  drawGrassDetails(currentNight);

  drawStreetLights(
    currentNight,
    cycle.sunset,
    cycle.sunrise
  );

  drawPlatforms();
  drawTruck(currentNight);
  drawCoins(coins, time);

  ctx.textAlign = "left";
};
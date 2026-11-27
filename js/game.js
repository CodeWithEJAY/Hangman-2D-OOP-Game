// important function are startQuest, completeQuest, renderQuest, closeQuest and such for initialization
// some funtions are helper for other funtions
import { setInputMode } from "./systems/input.js";
import {
  submitLeaderboardScore,
  fetchLeaderboard,
  downloadLeaderboard
} from "./systems/leaderboard.js";



import {
  GROUND_Y,
  INITIAL_HEARTS,
  INITIAL_SCORE,
  CANVAS_WIDTH,
   WORLD_WIDTH
} from "./constants.js";

import { NPCS, BOSS } from "./data/npcs.js";
import { PLATS } from "./data/world.js";

import { Round } from "./logic/round.js";
import { calculateQuestScore } from "./logic/scoring.js";

import {
  initializeProgression,
  completeNPCQuest,
  failNPCQuest,
  areAllQuestsComplete,
  getQuestProgress,
  advanceNPCChallenge,
  getRequiredRounds
} from "./logic/progression.js";

import {
  updatePlayer,
  createPlayer
} from "./systems/physics.js";

import {
  inputState,
  initializeInput
} from "./systems/input.js";

import {
  initializeCanvas,
  updateCamera,
  camera
} from "./engine/canvas.js";

import { drawEnvironment } from "./engine/drawing.js";

import {
  drawPlayer,
  drawNPCs,
  hankSVG,
  bossSVG,
  poseHank,
  MOOD
} from "./engine/characters.js";

import { drawCaptives } from "./engine/captives.js";
import {
  updateFX,
  drawFX,
  burst
} from "./engine/effects.js";

import {
  loadSettings,
  loadBestScore,
  saveBestScore,
  saveSettings
} from "./systems/storage.js";
import {
  unlockAudio,
  setSoundEnabled,
  playCorrectSound,
  playWrongSound,
  playCoinSound,
  playQuestCompleteSound,
  playGameOverSound,
  playBossEntranceSound,
  playBossLandSound,
  playBossDialogueSound,
  playBossHintSound,
  playHankAttackSound,
  playBossDamageSound,
  playBossAttackSound,
  playBossDefeatSound,
  playDialogueBlip,
  startBossMusic,
  stopBossMusic,
  startGameMusic,
  resumeGameMusic,
  stopGameMusic,
  startMenuMusic,
  startQuestMusic,
  playQuestComplete
} from "./systems/audio.js";

import { QUEST_ITEMS } from "./data/items.js";

export const game = {
  mode: "menu",
  player: null,
  playerName: "",
  coinPickups: [],
  inventory: [],
  score: INITIAL_SCORE,
  candies: 0,
  keys: 0,
  hearts: INITIAL_HEARTS,
  completed: 0,
  elapsedTime: 0,
  bestScore: 0,
  settings: {},
  activeNPC: null,
 boss: {
  unlocked: false,
  hp: BOSS.maxHP,
  maxHP: BOSS.maxHP,
  round: null,
  timeLeft: BOSS.timeLimit,
  timer: null,
  active: false,
  defeated: false,
  revealed: false,
  revealStartedAt: null,
  revealCutsceneActive: false,
  landingSoundPlayed: false,
cameraPanFrom: null,
cameraPanTarget: null
}
};


const showMenu = () => {
  closeDialogue(true);

  game.mode = "menu";
  game.activeNPC = null;

  showScreen("menu");

  setVisible("hud", false);
  setVisible("hud2", false);
  setVisible("pauseBtn", false);

  const bestText = getElement("bestTxt");

  if (bestText) {
    bestText.textContent = pad(game.bestScore, 6);
  }
};

const completedNPCNames = new Set();
const npcIntroSeen = new Set();

const FIXED_NPC_NAMES = new Set(["Zed", "Finn"]);
let originalNPCPositions = null;

const shuffleArray = array => {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

const createNonIdentityShuffle = entries => {
  if (entries.length < 2) return [...entries];

  let shuffled = shuffleArray(entries);
  let attempts = 0;

  while (
    attempts < 100 &&
    shuffled.some(
      (entry, index) => entry.ownerName === entries[index].ownerName
    )
  ) {
    shuffled = shuffleArray(entries);
    attempts++;
  }

  if (
    shuffled.some(
      (entry, index) => entry.ownerName === entries[index].ownerName
    )
  ) {
    shuffled = entries.slice(1).concat(entries[0]);
  }

  return shuffled;
};

const randomizeNPCPositions = () => {
  if (!Array.isArray(NPCS) || NPCS.length < 2) return;

  // Capture the original Java-loaded positions once.
  if (!originalNPCPositions) {
    originalNPCPositions = new Map(
      NPCS.map(npc => [npc.name, npc.x])
    );
  }

  const movableNPCs = NPCS.filter(
    npc => !FIXED_NPC_NAMES.has(npc.name)
  );

  if (movableNPCs.length < 2) return;

  const originalPositions = movableNPCs.map(npc => ({
    ownerName: npc.name,
    x: originalNPCPositions.get(npc.name)
  }));

  const shuffledPositions =
    createNonIdentityShuffle(originalPositions);

  movableNPCs.forEach((npc, index) => {
    npc.x = shuffledPositions[index].x;
  });

  console.table(
    NPCS.map(npc => ({
      NPC: npc.name,
      Position: npc.x,
      Fixed: FIXED_NPC_NAMES.has(npc.name)
    }))
  );
};

let inventoryExpanded = false;
let inventoryModalKeyHandler = null;

const hasQuestItem = npc => {
  const requirements = npc.requiresItems || [];

  return requirements.every(item =>
    game.inventory.includes(item)
  );
};

const grantQuestItem = itemId => {
  const item = QUEST_ITEMS[itemId];

  if (!item || game.inventory.includes(itemId)) {
    return null;
  }

  game.inventory.push(itemId);

  return item;
};



const getQuestDialogue = (npc, hasSeenIntro = false) => {
  if (npc.state === 2 || completedNPCNames.has(npc.name)) {
    return [npc.done || "Thank you for helping me!"];
  }

  if (npc.failed) {
    return ["Hank's back on the rope! Try a fresh word?"];
  }

  if (npc.round) {
    return ["Ready to get back to Hank?"];
  }

  if (!npc.requiresItems?.length) {
    return [npc.intro];
  }

  if (!hasQuestItem(npc)) {
    return hasSeenIntro
      ? [npc.lockedDialogue || "I still need something before we can continue."]
      : [npc.intro, npc.lockedDialogue || "I still need something before we can continue."];
  }

  return hasSeenIntro
    ? [npc.readyDialogue || "Wonderful! Let's get started!"]
    : [npc.intro, npc.readyDialogue || "Wonderful! Let's get started!"];
};

const splitDialoguePages = (dialogueElement, messages, maxLines = 2) => {
  const textElement =
    dialogueElement.querySelector(".txt") || dialogueElement;

  const textStyle = window.getComputedStyle(textElement);
  const boxRect = dialogueElement.getBoundingClientRect();
  const boxStyle = window.getComputedStyle(dialogueElement);

  let width = boxRect.width -
    parseFloat(boxStyle.paddingLeft) -
    parseFloat(boxStyle.paddingRight);

  let parent = textElement.parentElement;

  while (parent && dialogueElement.contains(parent)) {
    const rect = parent.getBoundingClientRect();
    const style = window.getComputedStyle(parent);

    if (
      rect.width > 100 &&
      ["block", "flex", "grid"].includes(style.display)
    ) {
      width = Math.min(width, rect.width -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight));
      break;
    }

    if (parent === dialogueElement) break;
    parent = parent.parentElement;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  ctx.font = textStyle.font || 
    `${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;

  const letterSpacing =
    textStyle.letterSpacing === "normal"
      ? 0
      : parseFloat(textStyle.letterSpacing) || 0;

  const measure = text =>
    ctx.measureText(text).width +
    Math.max(0, text.length - 1) * letterSpacing;

  const pages = [];
  let currentLines = [];

  const addLine = line => {
    currentLines.push(line);

    if (currentLines.length === maxLines) {
      pages.push(currentLines.join("\n"));
      currentLines = [];
    }
  };

  for (const message of messages) {
    if (!message) continue;

    const paragraphs = String(message).split("\n");

    for (const paragraph of paragraphs) {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      let currentLine = "";

      for (const word of words) {
        const candidate = currentLine
          ? `${currentLine} ${word}`
          : word;

        if (measure(candidate) <= width) {
          currentLine = candidate;
          continue;
        }

        if (currentLine) {
          addLine(currentLine);
          currentLine = "";
        }

        if (measure(word) <= width) {
          currentLine = word;
          continue;
        }

        let part = "";

        for (const char of word) {
          if (measure(part + char) > width && part) {
            addLine(part);
            part = char;
          } else {
            part += char;
          }
        }

        currentLine = part;
      }

      if (currentLine) addLine(currentLine);
    }
  }

  if (currentLines.length) {
    pages.push(currentLines.join("\n"));
  }

  return pages.length ? pages : [""];
};
const renderInventoryHUD = () => {
  const hud = getElement("inventoryHUD");

  if (!hud) return;

  const gameScreen = hud.closest(".game-screen");

  gameScreen?.querySelector(".bag-modal-overlay")?.remove();

  if (inventoryModalKeyHandler) {
    document.removeEventListener("keydown", inventoryModalKeyHandler, true);
    inventoryModalKeyHandler = null;
  }

  hud.replaceChildren();

  const inventory = game.inventory || [];

  hud.hidden = game.mode !== "play";

  if (hud.hidden) {
    inventoryExpanded = false;
    return;
  }

  const items = inventory
    .map(itemId => ({
      id: itemId,
      item: QUEST_ITEMS[itemId]
    }))
    .filter(entry => entry.item);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "inventory-toggle";
  toggle.setAttribute("aria-expanded", String(inventoryExpanded));
  toggle.setAttribute("aria-haspopup", "dialog");
  toggle.title = "Open item bag";

  const icon = document.createElement("span");
  icon.textContent = "🎒";

  const label = document.createElement("span");
  label.textContent = "KEY ITEMS";

  const count = document.createElement("span");
  count.className = "inventory-count";
  count.textContent = items.length;

  toggle.append(icon, label, count);
  hud.appendChild(toggle);

  toggle.addEventListener("click", () => {
    inventoryExpanded = !inventoryExpanded;
    renderInventoryHUD();
  });

  if (!inventoryExpanded) return;

  const overlay = document.createElement("div");
  overlay.className = "bag-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "bag-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "bagModalTitle");

  const header = document.createElement("div");
  header.className = "bag-modal-header";

  const heading = document.createElement("div");
  heading.className = "bag-modal-heading";

  const bagIcon = document.createElement("span");
  bagIcon.className = "bag-modal-icon";
  bagIcon.textContent = "🎒";

  const titleGroup = document.createElement("div");

  const title = document.createElement("h2");
  title.id = "bagModalTitle";
  title.textContent = "ITEM BAG";

  const subtitle = document.createElement("span");
  subtitle.textContent = "COLLECTED ITEMS";

  titleGroup.append(title, subtitle);
  heading.append(bagIcon, titleGroup);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "bag-modal-close";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close inventory");

  header.append(heading, closeButton);

  const divider = document.createElement("div");
  divider.className = "bag-modal-divider";

  const sectionLabel = document.createElement("div");
  sectionLabel.className = "bag-modal-section-label";
  sectionLabel.textContent = "KEY ITEMS";

  const grid = document.createElement("div");
  grid.className = "bag-modal-grid";

  const slotCount = Math.max(
    12,
    Math.ceil(items.length / 4) * 4
  );

  for (let i = 0; i < slotCount; i++) {
    const entry = items[i];

    const slot = document.createElement("div");
    slot.className = `bag-modal-slot ${entry ? "is-filled" : "is-empty"}`;

    if (entry) {
      const itemIcon = document.createElement("span");
      itemIcon.className = "bag-modal-slot-icon";
      itemIcon.textContent = entry.item.icon;

      const itemName = document.createElement("span");
      itemName.className = "bag-modal-slot-name";
      itemName.textContent = entry.item.name;

      slot.title = entry.item.name;
      slot.append(itemIcon, itemName);
    } else {
      const emptyMark = document.createElement("span");
      emptyMark.className = "bag-modal-empty-mark";
      emptyMark.textContent = "·";

      slot.appendChild(emptyMark);
    }

    grid.appendChild(slot);
  }

  const footer = document.createElement("div");
  footer.className = "bag-modal-footer";

  const itemCount = document.createElement("span");
  itemCount.textContent = items.length === 0
    ? "NO ITEMS COLLECTED"
    : `${items.length} ITEMS COLLECTED`;

  const closeHint = document.createElement("span");
  closeHint.textContent = "ESC TO CLOSE";

  footer.append(itemCount, closeHint);

  modal.append(header, divider, sectionLabel, grid, footer);
  overlay.appendChild(modal);

  const closeBag = () => {
    inventoryExpanded = false;

    if (inventoryModalKeyHandler) {
      document.removeEventListener("keydown", inventoryModalKeyHandler, true);
      inventoryModalKeyHandler = null;
    }

    overlay.remove();

    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  };

  closeButton.addEventListener("click", closeBag);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      closeBag();
    }
  });

  inventoryModalKeyHandler = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeBag();
    }
  };

  document.addEventListener("keydown", inventoryModalKeyHandler, true);

  (gameScreen || document.body).appendChild(overlay);

  closeButton.focus();
};

const showLeaderboard = async () => {
  closeDialogue(true);

  game.mode = "leaderboard";
  showScreen("leaderboard");

  const podium = getElement("leaderboardPodium");
  const list = getElement("leaderboardList");

  if (!podium || !list) return;

  podium.textContent = "LOADING RECORDS...";
  list.replaceChildren();

  try {
    const entries = await fetchLeaderboard();

    podium.replaceChildren();
    list.replaceChildren();

    if (!entries.length) {
      podium.textContent = "NO RECORDS YET. BE THE FIRST HERO!";
      return;
    }

    const podiumOrder = [
      { index: 1, medal: "🥈" },
      { index: 0, medal: "🥇" },
      { index: 2, medal: "🥉" }
    ];

    podiumOrder.forEach(({ index, medal }) => {
      const entry = entries[index];

      if (!entry) return;

      const rank = index + 1;

      const place = document.createElement("div");
      place.className = `podium-place rank-${rank}`;

      const medalElement = document.createElement("div");
      medalElement.className = "podium-medal";
      medalElement.textContent = medal;

      const name = document.createElement("div");
      name.className = "podium-name";
      name.textContent = entry.name;

      const score = document.createElement("div");
      score.className = "podium-score";
      score.textContent = Number(entry.score).toLocaleString();

      const bar = document.createElement("div");
      bar.className = "podium-bar";
      bar.textContent = rank;

      place.append(medalElement, name, score, bar);
      podium.appendChild(place);
    });

    entries.slice(3).forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "leaderboard-row";

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = `#${index + 4}`;

      const name = document.createElement("span");
      name.className = "leaderboard-name";
      name.textContent = entry.name;

      const score = document.createElement("strong");
      score.className = "leaderboard-score";
      score.textContent = Number(entry.score).toLocaleString();

      row.append(rank, name, score);
      list.appendChild(row);
    });

  } catch (error) {
    console.error("Leaderboard loading failed:", error);

    podium.textContent = "";
    list.textContent = "LEADERBOARD UNAVAILABLE.";
  }
};


const startBossQuest = () => {
  if (
    !game.boss.unlocked ||
    game.boss.defeated ||
    game.boss.active
  ) return;
  clearQuestResult();
  closeDialogue();

  game.boss.active = true;
  game.boss.hp = BOSS.maxHP;

  game.activeNPC = BOSS;
  game.mode = "boss";
  document.body.classList.add("boss-fight-active");
  setInputMode("guess");

  const art = getElement("gameArt");

  if (art) {
    art.innerHTML = hankSVG();
    poseHank(art, 0, MOOD[0]);
  }

  const display = getElement("bossDisplay");

  if (display) {
    display.innerHTML = `
      <div class="boss-side-info">
        <strong>THE HANGMAN KING</strong>

        <div class="boss-health-track">
          <div id="bossHPFill"></div>
        </div>

        <span id="bossHPText">${BOSS.maxHP} / ${BOSS.maxHP} HP</span>
        <span id="bossTimerText">40 SECONDS</span>
      </div>

      <div class="boss-side-art">
        ${bossSVG()}
      </div>
    `;

    display.hidden = false;
  }

  getElement("gameStage")?.classList.add("boss-fight-layout");
  getElement("quest")?.classList.add("boss-mode-quest");

  showScreen("quest");
  closeDialogue(true);
    startBossMusic();
  startBossRound();
};

const startBossRound = () => {
  if (!game.boss.active || game.mode !== "boss") return;

  game.boss.round = Round.make(BOSS);
  game.boss.round.hintsUsed = 0;
  Round.s = game.boss.round;

  startBossTimer();
  renderQuest();
};

const startBossTimer = () => {
  clearInterval(game.boss.timer);

  game.boss.timeLeft = BOSS.timeLimit;

  game.boss.timer = window.setInterval(() => {
    if (game.mode !== "boss" || !game.boss.active) {
      clearInterval(game.boss.timer);
      game.boss.timer = null;
      return;
    }

    game.boss.timeLeft--;

    renderQuest();

    if (game.boss.timeLeft <= 0) {
      bossTimeout();
    }
  }, 1000);
};

const bossRoundWon = () => {
  clearInterval(game.boss.timer);
  game.boss.timer = null;

  clearTimeout(successTimer);
  successTimer = null;

  game.boss.hp--;
  playHankAttackSound();
playBossDamageSound();

  bossDamageAnimation();

  renderQuest();

  if (game.boss.hp <= 0) {
    defeatBoss();
    return;
  }

  showToast(`BOSS DAMAGED! ${game.boss.hp}/${BOSS.maxHP} HP`);

  window.setTimeout(() => {
    if (game.mode === "boss" && game.boss.active) {
      startBossRound();
    }
  }, 1200);
};
const bossTimeout = () => {
  clearInterval(game.boss.timer);
  game.boss.timer = null;

  game.hearts = Math.max(0, game.hearts - 1);
  playBossAttackSound();

  showToast("THE HANGMAN KING ATTACKS! -1 HEART");
  updateHUD();

  const art = getElement("gameArt");

  if (game.hearts <= 0) {
    game.boss.active = false;

    if (art) {
      poseHank(art, 6, "dead", "dead");
    }

    window.setTimeout(() => {
      endGame(false);
    }, 1300);

    return;
  }

  if (art) {
    poseHank(art, 6, "panic", "hurt");
  }

  window.setTimeout(() => {
    if (game.mode === "boss" && game.boss.active) {
      startBossRound();
    }
  }, 1000);
};

const defeatBoss = () => {
  clearInterval(game.boss.timer);
  game.boss.timer = null;

  game.boss.hp = 0;
  game.boss.active = false;
  game.boss.defeated = true;
  playBossDefeatSound();
  playQuestCompleteSound();


  game.activeNPC = null;
  game.boss.round = null;
  Round.s = null;

  showToast("THE HANGMAN KING HAS FALLEN!");

  endGame(true);
};
let animationFrame = null;
let previousTime = 0;
let questFinishTimer = null;

const dialogue = {
  npc: null,
  typingTimer: null,
  typing: false,
  bossIntroActive: false,
  bossIntroIndex: 0
};


const getElement = id => document.getElementById(id);

const setVisible = (id, visible) => {
  const element = getElement(id);

  if (element) {
    element.hidden = !visible;
  }
};

const showScreen = screenId => {
  ["menu","name", "tut", "set", "pause", "quest", "leaderboard", "end", "credits"].forEach(id => {
    const element = getElement(id);

    if (!element) return;

    element.classList.toggle("active", id === screenId);
    element.hidden = id !== screenId;
  });
};

const createCoins = () => {
  const coins = [];

  for (let i = 0; i < 38; i++) {
    coins.push({
      x: 260 + i * 128 + (i % 3) * 14,
      y: GROUND_Y - 26 - (i % 5 === 0 ? 44 : 0),
      collected: false
    });
  }

  PLATS.forEach(platform => {
    for (let i = 0; i < 3; i++) {
      coins.push({
        x: platform.x + platform.w / 2 + (i - 1) * 34,
        y: platform.y - 28,
        collected: false
      });
    }
  });

  return coins;
};

const pad = (number, length = 2) => {
  return String(Math.max(0, Math.round(number))).padStart(length, "0");
};


const updateHUD = () => {
  const progress = getQuestProgress();
  const seconds = Math.floor(game.elapsedTime);

  const values = {
    hC: pad(game.candies, 2),
    hK: game.keys,
    hT: `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`,
    hS: pad(game.score + game.candies * 10, 6),
    hH: game.hearts
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = getElement(id);

    if (element) {
      element.textContent = value;
    }
  });

  const trackerTitle = getElement("questTrackerTitle");
  const trackerObjective = getElement("questTrackerObjective");
  const trackerCount = getElement("questTrackerCount");
  const bar = getElement("bar");

  if (game.boss.unlocked) {
    if (trackerTitle) {
      trackerTitle.textContent = "DEFEAT THE HANGMAN KING";
    }

    if (trackerObjective) {
      trackerObjective.textContent = game.mode === "boss"
        ? "Solve the King's words before time runs out."
        : game.boss.defeated
          ? "The village is safe. Your adventure is complete."
          : "All villagers are free. Reach the end of the map.";
    }
  } else {
    if (trackerTitle) {
      trackerTitle.textContent = "FREE THE VILLAGERS";
    }

    if (trackerObjective) {
      trackerObjective.textContent =
        "Help the villagers and restore the town.";
    }
  }

  if (trackerCount) {
    trackerCount.textContent =
      `${progress.completed}/${progress.total}`;
  }

  if (bar) {
    bar.replaceChildren();

    bar.setAttribute(
      "aria-label",
      `${progress.completed} of ${progress.total} villagers helped`
    );

    for (let i = 0; i < progress.total; i++) {
      const segment = document.createElement("i");

      if (i < progress.completed) {
        segment.classList.add("on");
      }

      bar.appendChild(segment);
    }
  }

  const questLog = getElement("questLog");

  if (questLog) {
    const completedSignature = NPCS
      .map(npc => completedNPCNames.has(npc.name) ? "1" : "0")
      .join("");

    const activeName = game.activeNPC?.name || "";

    const bossStatus = game.boss.defeated
      ? "complete"
      : game.boss.unlocked
        ? game.mode === "boss" ? "active" : "pending"
        : "hidden";

    const signature = [
      completedSignature,
      activeName,
      bossStatus
    ].join("|");

    if (questLog.dataset.signature !== signature) {
      const heading = document.createElement("div");
      heading.className = "quest-log-heading";

      const headingTitle = document.createElement("span");
      headingTitle.className = "quest-log-heading-title";
      headingTitle.textContent = "QUEST LOG";

      const headingCount = document.createElement("span");
      headingCount.className = "quest-log-heading-count";
      headingCount.textContent =
        `${progress.completed}/${progress.total}`;

      heading.append(headingTitle, headingCount);

      const list = document.createElement("div");
      list.className = "quest-log-list";

      NPCS.forEach(npc => {
        const completed = completedNPCNames.has(npc.name);
        const active = !completed && activeName === npc.name;

        const entry = document.createElement("div");
        entry.className = "quest-log-entry";

        if (completed) {
          entry.classList.add("is-complete");
        } else if (active) {
          entry.classList.add("is-active");
        }

        const icon = document.createElement("span");
        icon.className = "quest-log-icon";
        icon.textContent = completed ? "✓" : active ? "●" : "○";

        const info = document.createElement("div");
        info.className = "quest-log-info";

        const name = document.createElement("span");
        name.className = "quest-log-name";
        name.textContent = npc.name.toUpperCase();

        const goal = document.createElement("span");
        goal.className = "quest-log-goal";
        goal.textContent = npc.goal;

        const status = document.createElement("span");
        status.className = "quest-log-status";
        status.textContent = completed
          ? "DONE"
          : active
            ? "ACTIVE"
            : "OPEN";

        info.append(name, goal);
        entry.append(icon, info, status);
        list.appendChild(entry);
      });

      if (game.boss.unlocked) {
        const entry = document.createElement("div");
        entry.className = "quest-log-entry";

        const completed = game.boss.defeated;
        const active = !completed && game.mode === "boss";

        if (completed) {
          entry.classList.add("is-complete");
        } else if (active) {
          entry.classList.add("is-active");
        }

        const icon = document.createElement("span");
        icon.className = "quest-log-icon";
        icon.textContent = completed ? "✓" : active ? "●" : "○";

        const info = document.createElement("div");
        info.className = "quest-log-info";

        const name = document.createElement("span");
        name.className = "quest-log-name";
        name.textContent = "THE HANGMAN KING";

        const goal = document.createElement("span");
        goal.className = "quest-log-goal";
        goal.textContent = "Defeat the Hangman King";

        const status = document.createElement("span");
        status.className = "quest-log-status";
        status.textContent = completed
          ? "DONE"
          : active
            ? "ACTIVE"
            : "OPEN";

        info.append(name, goal);
        entry.append(icon, info, status);
        list.appendChild(entry);
      }

      questLog.replaceChildren(heading, list);
      questLog.dataset.signature = signature;
    }
  }
}

const showToast = message => {
  const toast = getElement("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.hidden = false;
  toast.style.display = "block";

  window.clearTimeout(showToast.timeout);

  showToast.timeout = window.setTimeout(() => {
    toast.hidden = true;
    toast.style.display = "none";
  }, 2200);
};

/* ---------- DIALOGUE ---------- */

const say = (element, message) => {
  if (!element) return;

  window.clearInterval(dialogue.typingTimer);

  const textElement = element.querySelector(".txt");
  if (!textElement) return;

  let index = 0;
  let soundCounter = 0;

  const isBoss = dialogue.npc === BOSS;

  dialogue.typing = true;
  textElement.textContent = "";

  const updateInstruction = () => {
    const instruction = element.querySelector("i");

    if (!instruction) return;

    if (dialogue.bossIntroActive) {
      const lastLine =
        dialogue.bossIntroIndex >= BOSS.introLines.length - 1;

      instruction.textContent = dialogue.typing
        ? "THE KING IS SPEAKING..."
        : lastLine
          ? "E · BEGIN THE BATTLE"
          : "E · CONTINUE";

      return;
    }

    const lastMessage =
      dialogue.messageIndex >= dialogue.messages.length - 1;

    instruction.textContent = dialogue.typing
      ? "SPEAKING..."
      : lastMessage
        ? dialogue.afterSequence === "startQuest"
          ? "E · TAKE THE QUEST"
          : "E · CLOSE"
        : "E · CONTINUE";
  };

  const finishTyping = () => {
    window.clearInterval(dialogue.typingTimer);
    dialogue.typingTimer = null;
    dialogue.typing = false;
    textElement.textContent = message;
    updateInstruction();
  };

  if (!message.length) {
    finishTyping();
    return;
  }

  dialogue.typingTimer = window.setInterval(() => {
    const character = message[index];

    textElement.textContent = message.slice(0, ++index);

    if (/[a-z0-9]/i.test(character)) {
      soundCounter++;

      const interval = isBoss ? 3 : 2;

      if (soundCounter % interval === 0) {
        playDialogueBlip(isBoss, character);
      }
    }

    if (index >= message.length) {
      finishTyping();
    }
  }, 35);

  updateInstruction();
};
const openNPCQuestDialogue = npc => {
  let messages = [];
  let action = "close";

  if (completedNPCNames.has(npc.name)) {
    messages = [npc.done || "Thank you for helping me!"];
  } else if (!npc.requiresItems?.length) {
    messages = [npc.intro];
    action = "startQuest";
  } else if (!hasQuestItem(npc)) {
    messages = [
      npc.intro,
      npc.lockedDialogue || npc.requiredDialogue || "I still need an item before we can continue."
    ];
  } else {
    messages = [
      npc.intro,
      npc.readyDialogue || "Wonderful! Let's get started!"
    ];
    action = "startQuest";
  }

  openDialogue(npc, messages, action);
};
const openDialogue = (npc, messages, afterSequence = "close") => {
  const element = getElement("dlg");
  if (!element) return;

  element.style.display = "block";
  element.hidden = false;

  dialogue.npc = npc;

  dialogue.messages = splitDialoguePages(
    element,
    Array.isArray(messages) ? messages : [messages],
    2
  );

  dialogue.messageIndex = 0;
  dialogue.afterSequence = afterSequence;

  const name = element.querySelector("b");

  if (name) {
    name.textContent = npc.name;
  }

  say(element, dialogue.messages[0]);
};
const advanceNPCDialogue = () => {
  if (!dialogue.npc || dialogue.npc === BOSS) return;

  if (dialogue.typing) return;

  if (dialogue.messageIndex < dialogue.messages.length - 1) {
    dialogue.messageIndex++;

    say(
      getElement("dlg"),
      dialogue.messages[dialogue.messageIndex]
    );

    return;
  }

  const npc = dialogue.npc;
  const action = dialogue.afterSequence;

  closeDialogue(true);

  if (action === "startQuest") {
    startQuest(npc);
  }
};

const closeDialogue = (force = false) => {
  if (
    !force &&
    (
      dialogue.bossIntroActive ||
      (dialogue.npc && dialogue.typing)
    )
  ) return;

  window.clearInterval(dialogue.typingTimer);

  dialogue.typingTimer = null;
  dialogue.typing = false;
  dialogue.npc = null;
  dialogue.bossIntroActive = false;
  dialogue.bossIntroIndex = 0;
  dialogue.messages = [];
  dialogue.messageIndex = 0;
  dialogue.afterSequence = "close";

  const element = getElement("dlg");

  if (element) {
    element.style.display = "none";
    element.hidden = true;
  }
};

const openBossIntro = () => {
  dialogue.bossIntroActive = true;
  dialogue.bossIntroIndex = 0;
playBossDialogueSound();
  openDialogue(BOSS, BOSS.introLines[0]);

  const element = getElement("dlg");
  const instruction = element?.querySelector("i");

  if (instruction) {
    instruction.textContent = "THE KING IS SPEAKING...";
  }
};

const advanceBossIntro = () => {
  if (!dialogue.bossIntroActive || dialogue.typing) return;

  const lastLine =
    dialogue.bossIntroIndex >= BOSS.introLines.length - 1;

  if (!lastLine) {
    dialogue.bossIntroIndex++;
  playBossDialogueSound();
    const element = getElement("dlg");

    say(
      element,
      BOSS.introLines[dialogue.bossIntroIndex]
    );

    return;
  }

  dialogue.bossIntroActive = false;
  closeDialogue(true);
  startBossQuest();
};

const getNearestNPC = () => {
  if (!game.player) return null;

  const playerCenter =
    game.player.x + game.player.width / 2;

  let nearest = null;
  let nearestDistance = 80;

  NPCS.forEach(npc => {
    const distance = Math.abs(playerCenter - npc.x);

    if (distance < nearestDistance) {
      nearest = npc;
      nearestDistance = distance;
    }
  });

  if (game.boss.unlocked && !game.boss.defeated) {
    const distance = Math.abs(playerCenter - BOSS.x);

    if (distance < 115 && distance < nearestDistance) {
      nearest = BOSS;
    }
  }

  return nearest;
};
const interact = () => {
  if (game.mode !== "play") return;

  if (dialogue.bossIntroActive) {
    advanceBossIntro();
    return;
  }

  const npc = getNearestNPC();

  if (!npc) {
    closeDialogue();
    showToast("There is nobody nearby.");
    return;
  }

  if (npc === BOSS) {
    openBossIntro();
    return;
  }

  if (dialogue.npc === npc) {
    advanceNPCDialogue();
    return;
  }

  if (dialogue.npc) {
    closeDialogue(true);
  }

  const isCompleted =
    npc.state === 2 ||
    completedNPCNames.has(npc.name);

  let action = "close";

  if (
    !isCompleted &&
    (npc.failed || npc.round || hasQuestItem(npc))
  ) {
    action = "startQuest";
  }

  const hasSeenIntro = npcIntroSeen.has(npc.name);
  const messages = getQuestDialogue(npc, hasSeenIntro);

  npcIntroSeen.add(npc.name);

  openDialogue(npc, messages, action);
};

const updateDialogueDistance = () => {
  if (!dialogue.npc || !game.player) return;

  if (dialogue.typing || dialogue.bossIntroActive) return;

  const playerCenter =
    game.player.x + game.player.width / 2;

  if (Math.abs(dialogue.npc.x - playerCenter) > 130) {
    closeDialogue();
  }
};

let feedbackRoundId = "";
let feedbackGuessCount = 0;
let resultRoundId = "";
let resultTimer = null;
let successTimer = null;
let resultOverlay = null;
const renderQuest = () => {
  const npc = game.activeNPC;

  if (!npc || !Round.s) return;

  const who = getElement("qWho");
  const category = getElement("qCategory");
  const clue = getElement("qClue");
  const word = getElement("word");
  const keys = getElement("keys");
  const candy = getElement("qCandy");
  const hintButton = getElement("hintBtn");

  const roundId = `${npc.name}:${Round.s.word}`;
  const guessedLetters = Round.s.guessed || [];

  if (
    roundId !== feedbackRoundId ||
    guessedLetters.length < feedbackGuessCount
  ) {
    clearTimeout(resultTimer);
    resultTimer = null;

    resultOverlay?.remove();
    resultOverlay = null;

    feedbackRoundId = roundId;
    feedbackGuessCount = 0;
    resultRoundId = "";
  }

  const isBoss = npc === BOSS;

  if (who) {
    who.textContent = isBoss
      ? `${BOSS.name} · ${game.boss.hp}/${BOSS.maxHP} HP`
      : npc.goal || npc.name;
  }

  if (category) {
    category.textContent = Round.s.category || npc.cat || "UNKNOWN";
  }

  if (clue) {
    clue.textContent = Round.s.clue || "No clue available.";
  }

  if (isBoss) {
    const hpFill = getElement("bossHPFill");
    const hpText = getElement("bossHPText");
    const timerText = getElement("bossTimerText");

    if (hpFill) {
      hpFill.style.width =
        `${(game.boss.hp / BOSS.maxHP) * 100}%`;
    }

    if (hpText) {
      hpText.textContent =
        `${game.boss.hp} / ${BOSS.maxHP} HP`;
    }

    if (timerText) {
      timerText.textContent =
        `${Math.max(0, game.boss.timeLeft)} SECONDS`;
    }
  }

  if (candy) {
    candy.textContent = game.candies;
  }

  const won = Round.won();
  const lost = Round.lost();

  if (guessedLetters.length > feedbackGuessCount) {
    const letter = guessedLetters[guessedLetters.length - 1];

    const correct = Round.s.word
      .toLowerCase()
      .includes(letter.toLowerCase());

    const correctLines = [
      "Nice one!",
      "Okay, okay, I see you.",
      "Correct! I'm almost impressed.",
      "Yes! Keep going!"
    ];

    const wrongLines = [
      "Wrong! But hey, I got a head.",
      "Nope! That's another piece!",
      "An arm?! Anyone going to help me?",
      "Two arms. I can still wave goodbye!",
      "A leg! This is getting ridiculous."
    ];

    let feedback;

    if (lost) {
      feedback = "Tell my mom I wasn't scared. I was very scared.";
    } else if (correct) {
      feedback = correctLines[
        (guessedLetters.length - 1) % correctLines.length
      ];
    } else {
      feedback = wrongLines[
        Math.min(Round.s.misses - 1, wrongLines.length - 1)
      ];
    }

    const bubble = getElement("bubble");
    const bubbleText = bubble?.querySelector(".txt");

    if (bubble && bubbleText) {
      bubbleText.textContent = feedback;
      bubble.style.display = "block";
    }

    feedbackGuessCount = guessedLetters.length;
  }

  if (word) {
    word.innerHTML = "";

    [...Round.s.word].forEach(letter => {
      const slot = document.createElement("span");
      const guessed = guessedLetters.includes(letter);

      const revealedByBoss =
        isBoss &&
        guessed &&
        Round.s.revealedLetter === letter;

      slot.className =
        `letter-slot${lost && !guessed ? " lost" : ""}`;

      if (revealedByBoss) {
        slot.classList.add("hint-revealed");
      }

      slot.textContent =
        guessed || lost ? letter.toUpperCase() : "";

      word.appendChild(slot);
    });
  }

  if (keys) {
    keys.innerHTML = "";

    ["qwertyuiop", "asdfghjkl", "zxcvbnm"].forEach(row => {
      const rowElement = document.createElement("div");
      rowElement.className = "keyboard-row";

      [...row].forEach(letter => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "keyboard-key";
        button.dataset.letter = letter;
        button.textContent = letter;

        const guessed = guessedLetters.includes(letter);

        button.disabled = guessed || Round.over();

        if (guessed) {
          button.classList.add(
            Round.s.word.includes(letter) ? "hit" : "miss"
          );
        }

        rowElement.appendChild(button);
      });

      keys.appendChild(rowElement);
    });
  }

  if (hintButton) {
    if (isBoss) {
      const hintAvailable = (Round.s.hintsUsed || 0) < 1;

      hintButton.textContent = hintAvailable
        ? "REVEAL ONE LETTER · FREE"
        : "HINT ALREADY USED";

      hintButton.disabled =
        Round.over() ||
        Round.hidden().length <= 1 ||
        !hintAvailable;
    } else {
      const canPay = game.candies >= 5;

      hintButton.textContent = canPay
        ? "Free hint (-15 candies)"
        : "Cheat code (costs 1 try)";

      hintButton.disabled =
        Round.over() ||
        Round.hidden().length <= 1 ||
        (!canPay && Round.triesLeft() <= 1);
    }
  }

  const art = getElement("gameArt");

  const hankState = isBoss
    ? won
      ? "attack"
      : lost
        ? "dead"
        : ""
    : won
      ? "free"
      : lost
        ? "dead"
        : "";

  poseHank(
    art,
    won ? 6 : Round.s.misses,
    won ? "happy" : MOOD[Round.s.misses],
    hankState
  );

  if (lost && game.mode === "quest" && resultRoundId !== roundId) {
    resultRoundId = roundId;

    resultTimer = setTimeout(() => {
      if (
        game.mode !== "quest" ||
        game.activeNPC !== npc
      ) return;

      const quest = getElement("quest");

      if (!quest) return;

      if (game.hearts <= 0) {
        endGame(false);
        return;
      }

      if (resultOverlay) return;

      const overlay = document.createElement("div");
      overlay.className = "hangman-result-overlay";

      const panel = document.createElement("div");
      panel.className = "hangman-result";

      const title = document.createElement("h2");
      title.textContent = won ? "HANK IS FREE!" : "GAME OVER";

      const message = document.createElement("p");
      message.textContent = won
        ? (npc.free || "You successfully freed Hank!")
        : "Oh no! Hank ran out of luck. Better luck next time!";

      const actions = document.createElement("div");
      actions.className = "hangman-result-actions";

      if (game.hearts <= 0) {
        const retryButton = document.createElement("button");

        retryButton.type = "button";
        retryButton.textContent = "Retry Game";

        retryButton.addEventListener("click", () => {
          clearQuestResult();
          startNewGame();
        });

        actions.appendChild(retryButton);
      } else {
        const townButton = document.createElement("button");

        townButton.type = "button";
        townButton.textContent = "Return to Town";

        townButton.addEventListener("click", () => {
          closeQuest();
        });

        actions.appendChild(townButton);
      }

      panel.append(title, message, actions);
      overlay.appendChild(panel);
      quest.appendChild(overlay);

      resultOverlay = overlay;
    }, 1300);
  }
};

const completeQuest = () => {
  const npc = game.activeNPC;

  if (!npc || !Round.s) return;

  const points = calculateQuestScore(Round.triesLeft());
  const requiredRounds = getRequiredRounds(npc);

  const npcQuestComplete = advanceNPCChallenge(npc);
  console.log(
  `[QUEST PROGRESS] ${npc.name}: ${npc.roundsCompleted}/${requiredRounds}`,"Complete:",npcQuestComplete);

  game.score += points;

  clearTimeout(successTimer);
  successTimer = null;

  if (!npcQuestComplete) {
    npc.failed = false;
    npc.round = null;

    clearQuestResult();

    npc.round = Round.make(npc);
    Round.s = npc.round;

    game.activeNPC = npc;
    game.mode = "quest";

    setInputMode("guess");

    showToast(
      `${npc.name}: Challenge ${npc.roundsCompleted}/${requiredRounds} complete! Get ready for the next one!`
    );

    renderQuest();
    updateHUD();

    return;
  }

  npc.ft = performance.now() / 1000;

  completeNPCQuest(npc);
  playQuestComplete();
  completedNPCNames.add(npc.name);

  const rewardItem = grantQuestItem(npc.rewardItem);

  const allQuestsDone = areAllQuestsComplete();

  if (allQuestsDone) {
    game.boss.unlocked = true;
  }

  game.keys++;
  game.completed++;
  game.candies += 5;

  playQuestCompleteSound();

  burst(
    npc.x + (npc.bx || 40),
    npc.by || GROUND_Y - 35,
    "#ff6f9c",
    24
  );

  const itemMessage = rewardItem
    ? ` RECEIVED ${rewardItem.icon} ${rewardItem.name}!`
    : "";

  showToast(
    `${npc.free} +${points} points +5 candies +1 key.${itemMessage}`
  );

  npc.round = null;
  npc.failed = false;

  clearQuestResult();

  Round.s = null;
  game.activeNPC = null;
  game.mode = "play";

  setInputMode("world");

  resumeGameMusic();

  renderInventoryHUD();

  showScreen(null);
  updateHUD();

  window.setTimeout(() => {
    if (game.mode === "play") {
      openDialogue(npc, npc.done);
    }
  }, 300);

  if (allQuestsDone) {
    window.setTimeout(() => {
      if (game.boss.unlocked && !game.boss.defeated) {
        showToast(
          "THE HANGMAN KING HAS APPEARED! GO TO THE END OF THE MAP!"
        );
      }
    }, 2300);
  }
};
const clearQuestResult = () => {
  if (resultTimer !== null) {
    clearTimeout(resultTimer);
    resultTimer = null;
  }

  if (successTimer !== null) {
    clearTimeout(successTimer);
    successTimer = null;
  }

  resultOverlay?.remove();
  resultOverlay = null;

  feedbackRoundId = "";
  feedbackGuessCount = 0;
  resultRoundId = "";

  const bubble = getElement("bubble");

  if (bubble) {
    bubble.style.display = "none";

    const text = bubble.querySelector(".txt");
    if (text) text.textContent = "";
  }
};

const startQuest = (npc, fresh = false) => {
  if (
    completedNPCNames.has(npc.name) ||
    !hasQuestItem(npc)
  ) {
    return;
  }
  if (npc.state === 2) {
    openDialogue(npc, npc.done);
    return;
  }

  clearQuestResult();
  closeDialogue();

  if (fresh || !npc.round) {
    npc.round = Round.make(npc);
  }

  game.activeNPC = npc;
  Round.s = npc.round;
  npc.failed = false;
  game.mode = "quest";

  setInputMode("guess");
  startQuestMusic();


  const art = getElement("gameArt");

  if (art) {
const bossDisplay = getElement("bossDisplay");

if (bossDisplay) {
  bossDisplay.hidden = true;
  bossDisplay.innerHTML = "";
}

getElement("gameStage")?.classList.remove("boss-fight-layout");
getElement("quest")?.classList.remove("boss-mode-quest");
art.innerHTML = hankSVG();
    poseHank(
      art,
      0,
      MOOD[0]
    );
  }

  showScreen("quest");
  renderQuest();
};

const closeQuest = () => {
  if (game.mode !== "quest") return;

  const npc = game.activeNPC;

  if (npc && Round.s && Round.lost()) {
    npc.round = null;
  }

  clearQuestResult();

  game.mode = "play";
  setInputMode("world");

  game.activeNPC = null;
  Round.s = null;

  resumeGameMusic();

  showScreen(null);
  updateHUD();

  if (game.hearts <= 0) {
    endGame(false);
  }
};


const failQuest = () => {
  const npc = game.activeNPC;

  if (!npc || npc.failed) return;

  npc.failed = true;

  game.hearts = Math.max(0, game.hearts - 1);

  failNPCQuest(npc);
  playGameOverSound();

  showToast(npc.fail || "You ran out of tries!");

  updateHUD();
};
const handleGuess = letter => {
  unlockAudio();
  const isBoss = game.mode === "boss";

  if (
    (game.mode !== "quest" && !isBoss) ||
    !Round.s ||
    Round.over()
  ) return;

  if (!/^[a-z]$/i.test(letter)) return;

  const result = Round.guess(letter.toLowerCase());

  if (result === "repeat") return;

  if (result === "hit") {
    playCorrectSound();
  } else {
    playWrongSound();
  }

  if (Round.won()) {
    renderQuest();

    clearTimeout(successTimer);

    const winningRound = Round.s;
    const winningNPC = game.activeNPC;

    successTimer = window.setTimeout(() => {
      successTimer = null;

      if (
        Round.s !== winningRound ||
        !Round.won()
      ) return;

      if (isBoss && game.mode === "boss" && game.boss.active) {
        bossRoundWon();
        return;
      }

      if (
        game.mode === "quest" &&
        game.activeNPC === winningNPC &&
        winningNPC
      ) {
        completeQuest();
      }
    }, isBoss ? 1200 : 2500);

    return;
  }

  if (Round.lost()) {
    renderQuest();

    if (isBoss) {
      bossTimeout();
    } else {
      failQuest();
    }

    return;
  }

  renderQuest();
};
const useHint = () => {
  const isBoss = game.mode === "boss";

  if (
    (game.mode !== "quest" && !isBoss) ||
    !Round.s
  ) return;

  if (isBoss) {
  if ((Round.s.hintsUsed || 0) >= 1) {
       showToast("You already used your free hint!");
       playBossHintSound();
      return;
    }

    const letter = Round.hint(true);

    if (!letter) return;
      Round.s.hintsUsed++;
      Round.s.revealedLetter = letter;


  showToast("THE HANGMAN KING REVEALED A LETTER!");

    renderQuest();

    if (Round.won()) {
      bossRoundWon();
    } else if (game.boss.timeLeft <= 0) {
      bossTimeout();
    }

    return;
  }

  const canPay = game.candies >= 15;
  const letter = Round.hint(canPay);

  if (!letter) {
    showToast("No hint available!");
    return;
  }

  if (canPay) {
    game.candies -= 15;
  } else {
    playWrongSound();
  }

  renderQuest();
  updateHUD();

  if (Round.won()) {
    completeQuest();
  } else if (Round.lost()) {
    failQuest();
  }
};


/* ---------- GAME FLOW ---------- */
const showNameEntry = () => {
  closeDialogue(true);

  game.mode = "name";
  game.playerName = "";

  const input = getElement("playerNameInput");
  const error = getElement("nameError");

  if (input) input.value = "";
  if (error) error.textContent = "";

  showScreen("name");

  window.setTimeout(() => input?.focus(), 100);
};
const confirmPlayerName = () => {
  const input = getElement("playerNameInput");
  const error = getElement("nameError");

  const name = input?.value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 16);

  if (!name) {
    if (error) error.textContent = "PLEASE ENTER YOUR NAME!";
    return;
  }

  game.playerName = name;

  localStorage.setItem("hangmanPlayerName", name);

  startTutorial();
};

function setTutorialPage(page) {
    const pages = document.querySelectorAll(
        "#tut [data-tutorial-page]"
    );

    pages.forEach((element, index) => {
        element.hidden = index !== page;
    });
}

function setupTutorialNavigation() {
    const tutorial = getElement("tut");

    if (!tutorial || tutorial.dataset.navigationReady) return;

    tutorial.dataset.navigationReady = "true";

    tutorial.addEventListener("click", event => {
        const button = event.target.closest("[data-tutorial-nav]");

        if (!button) return;

        if (button.dataset.tutorialNav === "next") {
            setTutorialPage(1);
        }

        if (button.dataset.tutorialNav === "previous") {
            setTutorialPage(0);
        }
    });
}

const startTutorial = () => {
    game.mode = "tutorial";

    setupTutorialNavigation();
    setTutorialPage(0);

    showScreen("tut");
};

let openingTransitionTimers = [];
let openingTransitionOverlay = null;

const clearOpeningTransition = () => {
  openingTransitionTimers.forEach(timer => {
    window.clearTimeout(timer);
  });

  openingTransitionTimers = [];

  if (openingTransitionOverlay) {
    openingTransitionOverlay.remove();
    openingTransitionOverlay = null;
  }

  const canvas = document.querySelector("canvas");

  if (canvas) {
    canvas.classList.remove("opening-screen-shake");
  }

  delete document.body.dataset.introDialogue;
  delete document.body.dataset.introDialogueReady;
};

const startOpeningSequence = () => {
  clearOpeningTransition();

  const canvas = document.querySelector("canvas");

  const overlay = document.createElement("div");
  overlay.className = "opening-transition";

  document.body.appendChild(overlay);

  openingTransitionOverlay = overlay;

  document.body.dataset.introDialogue = "true";

  openingTransitionTimers.push(
    window.setTimeout(() => {
      overlay.classList.add("is-flashing");

      if (canvas) {
        canvas.classList.remove("opening-screen-shake");
        canvas.classList.add("opening-screen-shake");
      }
    }, 260)
  );

  openingTransitionTimers.push(
    window.setTimeout(() => {
      overlay.classList.add("is-revealing");
    }, 490)
  );

  openingTransitionTimers.push(
    window.setTimeout(() => {
      if (openingTransitionOverlay === overlay) {
        overlay.remove();
        openingTransitionOverlay = null;
      }

      if (canvas) {
        canvas.classList.remove("opening-screen-shake");
      }

      openingTransitionTimers = [];

      openDialogue(
        { name: "HANK" },
        [
        "I've been on the road for a long time. Seen plenty of towns and strange places along the way.",
        "But that light in the woods caught my eye. Figured I'd take a closer look.",
        "Then it flashed... and the woods were gone. Now there's a town here I don't recognize.",
        "Someone around here might know what happened. Guess there's only one way to find out."
        ],
        "close"
      );

      document.body.dataset.introDialogueReady = "true";
    }, 2400)
  );
};

const startNewGame = () => {
  clearOpeningTransition();
  window.clearTimeout(questFinishTimer);

  document.body.classList.remove("boss-fight-active");

  // Randomize NPC positions before starting the new game.
  // randomizeNPCPositions();

  initializeProgression();

  game.player = createPlayer();
  game.player.vx = 0;
  game.player.vy = 0;

  game.coinPickups = createCoins();

  game.score = INITIAL_SCORE;
  game.candies = 0;
  game.keys = 0;
  game.hearts = INITIAL_HEARTS;
  game.completed = 0;
  game.elapsedTime = 0;
  game.activeNPC = null;
  game.inventory = [];

  clearInterval(game.boss.timer);

  game.boss.unlocked = false;
  game.boss.hp = BOSS.maxHP;
  game.boss.round = null;
  game.boss.timeLeft = BOSS.timeLimit;
  game.boss.timer = null;
  game.boss.active = false;
  game.boss.defeated = false;
  game.boss.revealed = false;
  game.boss.revealStartedAt = null;
  game.boss.revealCutsceneActive = false;
  game.boss.cameraPanFrom = null;
  game.boss.landingSoundPlayed = false;
  game.boss.cameraPanTarget = null;

  stopBossMusic();
  startGameMusic();

  npcIntroSeen.clear();
  completedNPCNames.clear();

  game.mode = "play";

  renderInventoryHUD();
  setInputMode("world");

  Round.s = null;

  closeDialogue();
  showScreen(null);

  setVisible("hud", true);
  setVisible("hud2", true);
  setVisible("pauseBtn", true);

  updateCamera(game.player);
  updateHUD();

  startOpeningSequence();
  
};

const pauseGame = () => {
  if (game.mode === "play") {
    closeDialogue();
    game.mode = "pause";
    showScreen("pause");
  } else if (game.mode === "pause") {
    game.mode = "play";
    showScreen(null);
  }
};
const endGame = victory => {
  if (game.mode === "end" || game.mode === "credits") return;

  document.body.classList.remove("boss-fight-active");

  if (!victory) {
    playGameOverSound();
  }

  game.mode = "end";

  stopBossMusic();

  clearInterval(game.boss.timer);
  game.boss.timer = null;
  game.boss.active = false;

  closeDialogue();

  const levelScore = game.score + game.candies * 10;

  const timeBonus = Math.max(
    0,
    Math.round((900 - game.elapsedTime * 3) / 5) * 5
  );

  const stars = victory
    ? game.hearts >= 3 ? 3
      : game.hearts === 2 ? 2 : 1
    : 0;

  const starBonus = stars * 140;

  const total = victory
    ? levelScore + timeBonus + starBonus
    : levelScore;

  game.score = total;

  submitLeaderboardScore(
    game.playerName || "Player",
    total
  ).catch(error => {
    console.error("Leaderboard save failed:", error);
  });

  if (total > game.bestScore) {
    saveBestScore(total);
    game.bestScore = total;
  }

  const seconds = Math.floor(game.elapsedTime);

  const formattedTime =
    `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

  const end = getElement("end");

  if (!end) return;

  const starHTML = [0, 1, 2].map(index => `
    <span class="result-star ${index < stars ? "on" : ""}">★</span>
  `).join("");

  end.innerHTML = `
    <div class="result-card">

      <div class="result-ribbon">
        <span>${victory ? "★ TOWN SAVED ★" : "GAME OVER"}</span>
        <span>${victory ? "VICTORY!" : "TRY AGAIN"}</span>
      </div>

      <h2>${victory ? "YOU SAVED THE TOWN!" : "HANK'S LAST STAND"}</h2>

      <div class="result-star-container">
        ${starHTML}
      </div>

      <div class="result-stats">

        <div>
          <span>FINAL SCORE</span>
          <b id="resultScore">${pad(total, 6)}</b>
        </div>

        <div>
          <span>CANDIES COLLECTED</span>
          <b id="resultCoins">${game.candies}</b>
        </div>

        <div>
          <span>TIME</span>
          <b id="resultTime">${formattedTime}</b>
        </div>

        <div>
          <span>QUESTS COMPLETED</span>
          <b>${game.completed}/8</b>
        </div>

        <div>
          <span>HEARTS REMAINING</span>
          <b>${game.hearts}</b>
        </div>

        ${victory ? `
          <div>
            <span>TIME BONUS</span>
            <b>+${timeBonus}</b>
          </div>

          <div>
            <span>STAR BONUS</span>
            <b>+${starBonus}</b>
          </div>
        ` : ""}

      </div>

      <div class="result-buttons">
        ${victory ? `
          <button
            class="result-button"
            type="button"
            id="resultContinue"
          >
            CONTINUE →
          </button>
        ` : `
          <button
            class="result-button"
            type="button"
            id="resultRetry"
          >
            TRY AGAIN
          </button>
        `}
      </div>

    </div>
  `;

  if (victory) {
    getElement("resultContinue").addEventListener("click", startCredits);
  } else {
    getElement("resultRetry").addEventListener("click", startNewGame);
  }

  showScreen("end");

  stopGameMusic();
  stopBossMusic();
};


const returnToCreditsMenu = () => {
  if (game.mode !== "credits") return;

  if (creditsWatchFrame !== null) {
    cancelAnimationFrame(creditsWatchFrame);
    creditsWatchFrame = null;
  }

  closeDialogue(true);

  game.mode = "menu";
  game.activeNPC = null;
  Round.s = null;

  showScreen("menu");

  setVisible("hud", false);
  setVisible("hud2", false);
  setVisible("pauseBtn", false);

  const bestText = getElement("bestTxt");

  if (bestText) {
    bestText.textContent = pad(game.bestScore, 6);
  }
};

let creditsWatchFrame = null;
const startCredits = () => {
  if (game.mode !== "end" || !game.boss.defeated) return;

  const roll = getElement("creditsRoll");
  const finale = getElement("creditsFinale");
  const skipButton = getElement("creditsSkip");
  const menuButton = getElement("creditsMenu");

  if (!roll || !finale || !skipButton || !menuButton) {
    console.error("Credits screen elements are missing.");
    return;
  }

  if (creditsWatchFrame !== null) {
    cancelAnimationFrame(creditsWatchFrame);
    creditsWatchFrame = null;
  }

  closeDialogue(true);

  game.mode = "credits";

  stopGameMusic();
  stopBossMusic();

  setVisible("hud", false);
  setVisible("hud2", false);
  setVisible("pauseBtn", false);

  showScreen("credits");

  roll.hidden = false;
  finale.hidden = true;
  skipButton.hidden = false;

  skipButton.onclick = finishCredits;

  menuButton.onclick = () => {
    if (game.mode !== "credits") return;
    showMenu();
  };

  roll.onanimationend = event => {
    if (
      event.target === roll &&
      event.animationName === "credits-scroll"
    ) {
      finishCredits();
    }
  };

  roll.style.animation = "none";
  void roll.offsetHeight;
  roll.style.animation = "";

  const checkCreditsEnd = () => {
    if (game.mode !== "credits" || roll.hidden) {
      creditsWatchFrame = null;
      return;
    }

    const lastSection = roll.querySelector(".credits-ending");

    if (
      lastSection &&
      lastSection.getBoundingClientRect().bottom <= 0
    ) {
      finishCredits();
      return;
    }

    creditsWatchFrame = requestAnimationFrame(checkCreditsEnd);
  };

  creditsWatchFrame = requestAnimationFrame(checkCreditsEnd);
};
const finishCredits = () => {
  if (game.mode !== "credits") return;

  if (creditsWatchFrame !== null) {
    cancelAnimationFrame(creditsWatchFrame);
    creditsWatchFrame = null;
  }

  const roll = getElement("creditsRoll");
  const finale = getElement("creditsFinale");
  const skipButton = getElement("creditsSkip");

  if (roll) {
    roll.hidden = true;
    roll.onanimationend = null;
  }

  if (skipButton) {
    skipButton.hidden = true;
  }

  if (finale) {
    finale.hidden = false;
  }
};
const isIntroDialogueActive = () => {
  return document.body.dataset.introDialogue === "true";
};

const finishIntroDialogue = () => {
  closeDialogue(true);

  delete document.body.dataset.introDialogue;
  delete document.body.dataset.introDialogueReady;

  setVisible("pauseBtn", true);
};

const advanceIntroDialogue = () => {
  if (!isIntroDialogueActive()) return;

  if (document.body.dataset.introDialogueReady !== "true") {
    return;
  }

  const element = getElement("dlg");

  if (!element || element.hidden) {
    finishIntroDialogue();
    return;
  }

  const textElement = element.querySelector(".txt");
  const instruction = element.querySelector("i");

  if (dialogue.typing) {
    window.clearInterval(dialogue.typingTimer);

    dialogue.typingTimer = null;
    dialogue.typing = false;

    textElement.textContent =
      dialogue.messages[dialogue.messageIndex];

    const lastMessage =
      dialogue.messageIndex >= dialogue.messages.length - 1;

    if (instruction) {
      instruction.textContent = lastMessage
        ? "E · CLOSE"
        : "E · CONTINUE";
    }

    return;
  }

  if (dialogue.messageIndex < dialogue.messages.length - 1) {
    dialogue.messageIndex++;

    say(
      element,
      dialogue.messages[dialogue.messageIndex]
    );

    return;
  }

  finishIntroDialogue();
};
/* ---------- ACTIONS ---------- */
const handleAction = action => {
  if (game.mode === "credits") {
    if (action === "skipCredits") {
      finishCredits();
    }

    if (action === "creditsMenu") {
      returnToCreditsMenu();
    }

    return;
  }

  if (
    action === "escape" &&
    (
      game.mode === "boss" ||
      game.boss.active ||
      game.activeNPC === BOSS
    )
  ) {
    return;
  }

  unlockAudio();

  if (isIntroDialogueActive()) {
    if (action === "interact") {
      advanceIntroDialogue();
    }

    return;
  }

  switch (action) {
    case "start":
      showNameEntry();
      break;

    case "nameContinue":
      confirmPlayerName();
      break;

    case "nameBack":
      showMenu();
      break;

    case "go":
    case "retry":
      startNewGame();
      break;

    case "interact":
      interact();
      break;

    case "leaderboard":
      showLeaderboard();
      break;

    case "leaderboardBack":
      showMenu();
      break;

    case "leaderboardExport":
      downloadLeaderboard();
      break;

    case "skipCredits":
      finishCredits();
      break;

    case "creditsMenu":
      showMenu();
      break;

    case "later":
      if (game.mode === "quest" && Round.s && !Round.over()) {
        closeQuest();
      } else {
        closeDialogue();
      }
      break;

    case "pause":
      pauseGame();
      break;

    case "resume":
      if (game.mode === "pause") {
        game.mode = "play";
        showScreen(null);
      }
      break;

    case "escape":
      if (dialogue.npc) {
        closeDialogue();
      } else if (game.mode === "quest") {
        closeQuest();
      } else if (game.mode === "pause") {
        pauseGame();
      } else if (game.mode === "play") {
        pauseGame();
      } else {
        showMenu();
      }
      break;

    case "back":
    case "quit":
      showMenu();
      break;

    case "settings":
      game.mode = "settings";
      showScreen("set");
      break;

    case "tsound":
      setSoundEnabled(true);
      showToast("SOUND IS ALWAYS ON!");
      break;

    case "tscan":
      game.settings.scan = !game.settings.scan;

      document.body.classList.toggle(
        "noscan",
        !game.settings.scan
      );

      saveSettings(game.settings);
      break;

    case "tcalm":
      game.settings.calm = !game.settings.calm;

      document.body.classList.toggle(
        "calm",
        game.settings.calm
      );

      saveSettings(game.settings);
      break;

    case "hint":
      useHint();
      break;

    case "next":
      startNewGame();
      break;
  }
};
/* ---------- UPDATE AND DRAW ---------- */

const updateGame = deltaTime => {
  if (game.mode !== "play" || !game.player) return;
if (
  game.boss.revealCutsceneActive ||
  dialogue.bossIntroActive ||
  (dialogue.npc && dialogue.typing)
) {
  updateFX(deltaTime);
  return;
}
  if (dialogue.bossIntroActive) {
    updateFX(deltaTime);
    return;
  }

  game.elapsedTime += deltaTime / 1000;

  updatePlayer(
    game.player,
    inputState,
    deltaTime,
    game.coinPickups,
    () => {
      game.candies++;
      playCoinSound();
      updateHUD();
    }
  );

  updateCamera(game.player);
  updateDialogueDistance();
  updateFX(deltaTime);

  updateHUD();
};

const renderGame = time => {
  const initialBossScreenX = BOSS.x - camera.x;

  const bossVisible =
    game.boss.unlocked &&
    !game.boss.defeated &&
    initialBossScreenX > 80 &&
    initialBossScreenX < CANVAS_WIDTH - 80;

  if (bossVisible && !game.boss.revealed) {
    game.boss.revealed = true;
    game.boss.revealStartedAt = time;
    game.boss.revealCutsceneActive = true;
    game.boss.landingSoundPlayed = false;

    playBossEntranceSound();

    game.boss.cameraPanFrom = camera.x;

    const maxCameraX = Math.max(
      0,
      WORLD_WIDTH - CANVAS_WIDTH
    );

    game.boss.cameraPanTarget = Math.max(
      0,
      Math.min(
        maxCameraX,
        BOSS.x - CANVAS_WIDTH * 0.62
      )
    );
  }

  const revealElapsed =
    game.boss.revealStartedAt === null
      ? 0
      : Math.max(0, time - game.boss.revealStartedAt);

  if (
    game.boss.revealed &&
    game.boss.cameraPanFrom !== null &&
    revealElapsed < 2800 &&
    !game.boss.landingSoundPlayed
  ) {
    const progress = Math.min(1, revealElapsed / 1300);
    const eased = progress * progress * (3 - 2 * progress);

    game.boss.landingSoundPlayed = true;
    playBossLandSound();

    camera.x =
      game.boss.cameraPanFrom +
      (game.boss.cameraPanTarget - game.boss.cameraPanFrom) * eased;
  }

  if (game.boss.revealed && revealElapsed >= 2800) {
    game.boss.revealCutsceneActive = false;
  }

  const bossEntryProgress = game.boss.revealed
    ? Math.min(1, revealElapsed / 1500)
    : 0;

  const bossAwakening =
    game.boss.revealed && !game.boss.defeated
      ? Math.min(1, revealElapsed / 1800)
      : 0;

  drawEnvironment({
    coins: game.coinPickups,
    time: time / 1000,
    bossAwakening
  });

  drawCaptives(time / 1000);

  drawNPCs(
    game.player,
    game.mode,
    Boolean(dialogue.npc),
    game.boss.unlocked,
    game.boss.defeated,
    bossEntryProgress
  );

  if (game.player) {
    drawPlayer(game.player);
  }

  drawFX();
};

const gameLoop = time => {
  animationFrame = requestAnimationFrame(gameLoop);

  const deltaTime = previousTime
    ? Math.min(time - previousTime, 50)
    : 16;

  previousTime = time;

  updateGame(deltaTime);
  renderGame(time);
};
/* ---------- EVENT CONNECTION ---------- */

const connectEvents = () => {
  document.addEventListener("gameaction", event => {
    handleAction(event.detail.action);
  });

  document.addEventListener("gameletter", event => {
    handleGuess(event.detail.letter);
  });

  const hintButton = getElement("hintBtn");

  if (hintButton && !hintButton.hasAttribute("data-act")) {
    hintButton.addEventListener("click", useHint);
  }

  document.addEventListener("click", event => {
    const key = event.target.closest(".key, .keyboard-key");

    if (key && key.dataset.letter) {
      handleGuess(key.dataset.letter);
    }
  });
};


export const initializeGame = () => {
  game.boss.hp = BOSS.maxHP;
  game.boss.maxHP = BOSS.maxHP;
  game.boss.timeLeft = BOSS.timeLimit;
  setSoundEnabled(true);
  initializeCanvas();
  initializeProgression();
  startMenuMusic()
  initializeInput();

  const menuArt = getElement("menuArt");

  if (menuArt) {
    menuArt.innerHTML = hankSVG();
    poseHank(menuArt, 6, "cool");
  }

game.settings = loadSettings() || {};
game.bestScore = loadBestScore();

setSoundEnabled(true);
  document.body.classList.toggle(
    "noscan",
    !game.settings.scan
  );

  document.body.classList.toggle(
    "calm",
    game.settings.calm
  );

  connectEvents();

  const bestText = getElement("bestTxt");

  if (bestText) {
    bestText.textContent = pad(game.bestScore, 6);
  }

  setVisible("hud", false);
  setVisible("hud2", false);
  setVisible("pauseBtn", false);

  showScreen("menu");

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }

  previousTime = 0;
  animationFrame = requestAnimationFrame(gameLoop);

  console.log("Game controller initialized.");
};
const bossDamageAnimation = () => {
  const boss = getElement("bossCharacter");
  const label = getElement("bossHitLabel");

  if (!boss) return;

  boss.classList.remove("hit");
  void boss.offsetWidth;
  boss.classList.add("hit");

  if (label) {
    label.textContent = "-1 HP";
    label.classList.remove("show");

    void label.offsetWidth;
    label.classList.add("show");
  }

  const impact = document.createElement("div");
  impact.className = "boss-impact";
  impact.innerHTML = "<i></i>".repeat(8);

  boss.appendChild(impact);

  window.setTimeout(() => {
    impact.remove();
    boss.classList.remove("hit");
  }, 700);
};


// this is for testing the game i did not go for other file 
//since this is the main js file that is getting fetched hassle 

export function testStartBossFight() {
  const npcNames = [
    "Luigi",
    "Jasmine",
    "Zed",
    "Erickson",
    "Gino",
    "Finn",
    "Zara",
    "Farmer Joe"
  ];

  completedNPCNames.clear();

  npcNames.forEach(name => {
    completedNPCNames.add(name);
  });

  game.completed = npcNames.length;

  if (game.boss.timer) {
    clearInterval(game.boss.timer);
  }

  game.boss.unlocked = true;
  game.boss.defeated = false;
  game.boss.active = false;
  game.boss.hp = game.boss.maxHP;
  game.boss.round = null;
  game.boss.timer = null;
  game.boss.revealed = false;
  game.boss.revealCutsceneActive = false;
  game.boss.roundTransitioning = false;

  startBossQuest();
}

window.testBossFight = testStartBossFight;




export function testCompleteAllQuests() {
  if (!game.player) {
    console.warn("Start a new game before running this test.");
    return;
  }

  closeDialogue(true);
  clearQuestResult();

  clearInterval(game.boss.timer);
  game.boss.timer = null;

  NPCS.forEach(npc => {
    completeNPCQuest(npc);
    completedNPCNames.add(npc.name);

    if (npc.rewardItem) {
      grantQuestItem(npc.rewardItem);
    }
  });

  game.completed = NPCS.length;
  game.keys = NPCS.length;

  game.activeNPC = null;
  game.mode = "play";
  Round.s = null;

  game.boss.unlocked = areAllQuestsComplete();
  game.boss.defeated = false;
  game.boss.active = false;
  game.boss.hp = BOSS.maxHP;
  game.boss.round = null;
  game.boss.revealed = false;
  game.boss.revealStartedAt = null;
  game.boss.revealCutsceneActive = false;
  game.boss.landingSoundPlayed = false;
  game.boss.cameraPanFrom = null;
  game.boss.cameraPanTarget = null;

  setInputMode("world");
  resumeGameMusic();

  renderInventoryHUD();
  showScreen(null);
  updateHUD();

  showToast("ALL NPC QUESTS COMPLETED! THE HANGMAN KING IS UNLOCKED!");

  console.log("Quest test completed:", getQuestProgress());
}

window.testCompleteAllQuests = testCompleteAllQuests;


export function testVictoryEnding() {
  clearInterval(game.boss.timer);
  game.boss.timer = null;

  clearTimeout(questFinishTimer);
  clearQuestResult();
  closeDialogue(true);

  game.mode = "play";
  game.activeNPC = null;
  game.completed = NPCS.length;
  game.hearts = 3;
  game.candies = 35;
  game.score = 2500;
  game.elapsedTime = 125;

  game.boss.unlocked = true;
  game.boss.defeated = true;
  game.boss.active = false;
  game.boss.hp = 0;
  game.boss.round = null;
  game.boss.revealed = false;
  game.boss.revealCutsceneActive = false;
  game.boss.revealStartedAt = null;
  game.boss.landingSoundPlayed = false;
  game.boss.cameraPanFrom = null;
  game.boss.cameraPanTarget = null;

  Round.s = null;

  setInputMode("world");

  const previousName = game.playerName;
  game.playerName = "VICTORY TEST";

  endGame(true);

  game.playerName = previousName;

  console.log("Victory ending test started.");
}

window.testVictoryEnding = testVictoryEnding;

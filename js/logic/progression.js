// manages the player progress through the 8 will be (10) NPCs quest, keeps track fo which NPC have been done, etc or the game iscomplete
import { NPCS } from "../data/npcs.js";
import { Run } from "./round.js";

const NPC_ROUND_REQUIREMENTS = {
  "Luigi": 5,
  "Jasmine": 5,
  "Zed": 5,
  "Erickson": 5,
  "Gino": 5,
  "Finn": 7,
  "Zara": 5,
  "Farmer Joe": 5
};

export const getRequiredRounds = npc => {
  return NPC_ROUND_REQUIREMENTS[npc.name] || 1;
};

export const advanceNPCChallenge = npc => {
  const required = getRequiredRounds(npc);

  npc.roundsCompleted = Math.min(
    (npc.roundsCompleted || 0) + 1,
    required
  );

  return npc.roundsCompleted >= required;
};

export const initializeProgression = () => {
  NPCS.forEach(npc => {
    npc.state = 0;
    npc.round = null;
    npc.failed = false;
    npc.roundsCompleted = 0;
  });

  Run.level = 1;
  Run.carry = 0;
  Run.used = [];
};

export const completeNPCQuest = npc => {
  npc.state = 2;
  npc.round = null;
  npc.failed = false;
  npc.roundsCompleted = getRequiredRounds(npc);
};

export const failNPCQuest = npc => {
  npc.round = null;
  npc.failed = true;
};

export const getCompletedQuests = () => {
  return NPCS.filter(npc => npc.state === 2).length;
};

export const getRemainingQuests = () => {
  return NPCS.filter(npc => npc.state !== 2).length;
};

export const areAllQuestsComplete = () => {
  return getCompletedQuests() === NPCS.length;
};

export const getQuestProgress = () => {
  return {
    completed: getCompletedQuests(),
    remaining: getRemainingQuests(),
    total: NPCS.length
  };
};
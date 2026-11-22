// npcs attributr, will be possibly replaced by oop java fetch
/**
  for context of this variable name ok
  x - is the NPC horizontal position
  cat - categroy used to select the Hangman word
  lo and hi  - minimum and max word lengths
  pal - character appearance customization
  goal,free,fail, intro, done - quest dialogue and description, just the string for commnucation depending on situation
  bx and by - captive position offset
 */

import { GROUND_Y } from "../constants.js";


export const NPCS = [
  {
    name: "Luigi",
    x: 600,
    requiresItems: [],
    rewardItem: "pocket-knife",
    cat: "Animal",
    lo: 5,
    hi: 6,
    pal: {
      s: "#f1c08a",
      t: "#5fe0b0",
      p: "#7a5230",
      h: "spiky",
      c: "#5a3418"
    },
    goal: "Unleash Biscuit the dog",
    free: "Biscuit is loose! Woof!",
    fail: "The knot tightened… −1 heart",
    bx: 70,
    by: GROUND_Y - 30,
    intro: "Oh no! Biscuit's leash is caught in a nasty knot. Can you help me free this little troublemaker?",
    done: "Biscuit is free! I found this Pocket Knife near the post. Take it, you might need it!"
  },

  {
    name: "Jasmine",
    x: 1040,
    requiresItems: ["brass-key"],
    rewardItem: "bait-recipe",
    lockedDialogue: "I need a spare Brass Key to open it. Farmer Joe found an old one in his field. Could you ask him, sweetie?",
    readyDialogue: "You found the Brass Key! Wonderful! Let's get Polly out of there!",
    cat: "Place",
    lo: 6,
    hi: 7,
    pal: {
      s: "#ffd3a1",
      t: "#d98ad1",
      p: "#6b4fa0",
      h: "bun",
      c: "#eeeeee",
      a: "glasses"
    },
    goal: "Open Polly the parrot's cage",
    free: "Polly is flying free!",
    fail: "The lock stayed shut… −1 heart",
    bx: 70,
    by: GROUND_Y - 70,
    intro: "Oh dear! Polly is trapped in her cage, and I've lost the spare key! How will I get her out?",
    done: "Polly is free! Here, take my Bait Recipe. It helped my husband catch some rare fish!"
  },

  {
    name: "Zed",
    x: 1540,
    fy: 344,
    requiresItems: ["machine-oil"],
    rewardItem: "old-compass",
    lockedDialogue: "The pulley needs Machine Oil to loosen up. Zara might have some in her workshop. Could you get it for me?",
    readyDialogue: "Machine Oil! Perfect! Let's get that Mega Swirl down!",
    cat: "Food",
    lo: 7,
    hi: 9,
    pal: {
      s: "#e8b07a",
      t: "#ffffff",
      p: "#2a45c9",
      h: "cap",
      c: "#ff9ac1",
      a: "stache"
    },
    goal: "Lower the Mega Swirl lollipop",
    free: "The Mega Swirl is back on the counter!",
    fail: "The rope held… −1 heart",
    bx: 40,
    by: GROUND_Y - 66,
    intro: "My Mega Swirl is stuck up there! The pulley is jammed, and I can't bring it down!",
    done: "My Mega Swirl is back! Take this Old Compass. It helped me navigate when I was a sailor!"
  },

  {
    name: "Erickson",
    x: 2230,
    requiresItems: ["bee-smoker"],
    rewardItem: "iron-gear",
    lockedDialogue: "A Bee Smoker would calm the swarm long enough to retrieve my honey. Finn might have one. Could you ask him?",
    readyDialogue: "Grr! A Bee Smoker! Now those bees won't bother me. Let's get that honey!",
    cat: "Animal",
    lo: 8,
    hi: 9,
    pal: {
      s: "#8a5a35",
      t: "#a8703d",
      p: "#6e4526",
      h: "ears",
      c: "#6e4526"
    },
    goal: "Get the honey jar down",
    free: "The honey jar is down! The bees are thrilled.",
    fail: "The jar didn't budge… −1 heart",
    bx: 50,
    by: GROUND_Y - 30,
    intro: "Grr! My honey jar is stuck in that tree, and angry bees are guarding it. I can't get near!",
    done: "Honey secured! Take this spare Iron Gear from my broken extractor. Rex-9 might need it!"
  },

  {
    name: "Gino",
    x: 2910,
    requiresItems: ["iron-gear"],
    rewardItem: "power-cell",
    lockedDialogue: "BEEP. Bit needs an Iron Gear for repairs. Erickson may have a spare from his honey extractor. Please retrieve one.",
    readyDialogue: "BEEP. Iron Gear detected! Repairs can begin. Let's get Bit running again!",
    cat: "Arcade",
    lo: 8,
    hi: 10,
    pal: {
      s: "#b8c4d6",
      t: "#5b6b8a",
      p: "#3a4560",
      h: "robot",
      c: "#ff6f7d"
    },
    goal: "Reboot robot pal Bit",
    free: "Bit is online and dancing!",
    fail: "Reboot failed… −1 heart",
    bx: 70,
    by: GROUND_Y - 30,
    intro: "BEEP. My friend Bit has stopped working! His motor is damaged, and I cannot repair it without a replacement part.",
    done: "BEEP. Bit is back online! Take this charged Power Cell. It might power the old town gate!"
  },

  {
    name: "Finn",
    x: 3560,
    requiresItems: ["bait-recipe", "old-compass"],
    rewardItem: "bee-smoker",
    lockedDialogue: "I'll need a Bait Recipe from Granny Mae and an Old Compass from Zed to catch it. Could you collect both?",
    readyDialogue: "You've got both! Excellent! Let's prepare the bait and track down that Golden Fish!",
    cat: "Sea",
    lo: 6,
    hi: 8,
    pal: {
      s: "#e8b07a",
      t: "#2a9bd1",
      p: "#3a4560",
      h: "fisher",
      c: "#ffd23c",
      a: "beard"
    },
    goal: "Reel in the Golden Fish",
    free: "The Golden Fish is on the dock!",
    fail: "The line snapped… −1 heart",
    bx: 70,
    by: GROUND_Y - 30,
    intro: "Ahoy! A giant fish has taken my fishing line! I think it's the legendary Golden Fish, but I need a way to track and lure it!",
    done: "What a catch! I also found this Bee Smoker in the supply crate. Bruno could use it!"
  },

  {
    name: "Zara",
    x: 4180,
    requiresItems: ["pocket-knife"],
    rewardItem: "machine-oil",
    lockedDialogue: "A Pocket Knife could clear the roots blocking my cauldron's air vent. Luigi might have one. Could you bring it here?",
    readyDialogue: "A Pocket Knife! Perfect! Let's clear this vent and get the cauldron burning again!",
    cat: "Magic",
    lo: 6,
    hi: 9,
    pal: {
      s: "#ffd3a1",
      t: "#6b3fb0",
      p: "#3b2470",
      h: "wizard",
      c: "#6b3fb0",
      a: "beard"
    },
    goal: "Wake the sleeping cauldron",
    free: "The cauldron is bubbling happily!",
    fail: "The spell fizzled… −1 heart",
    bx: 70,
    by: GROUND_Y - 30,
    intro: "My cauldron has gone cold! Dried roots are blocking its air vent, and I can't clear them by hand!",
    done: "The cauldron is working again! Take this Machine Oil. It should help someone repair an old mechanism!"
  },

  {
    name: "Farmer Joe",
    x: 4820,
    requiresItems: ["pocket-knife"],
    rewardItem: "brass-key",
    lockedDialogue: "I need a Pocket Knife to cut through these stubborn vines. Luigi might have one. Could you borrow it for me?",
    readyDialogue: "Howdy! Just what I needed! Let's cut through those vines and free my prize pumpkin!",
    cat: "Farm",
    lo: 6,
    hi: 9,
    pal: {
      s: "#e8b07a",
      t: "#c9394a",
      p: "#2a45c9",
      h: "straw",
      c: "#f2d27a"
    },
    goal: "Free the Giant Pumpkin",
    free: "The Giant Pumpkin rolled free!",
    fail: "The vines held tight… −1 heart",
    bx: 70,
    by: GROUND_Y - 30,
    intro: "Howdy! My prize pumpkin is trapped in some stubborn vines. I can't pull them apart!",
    done: "Pumpkin's free! I found this old Brass Key buried near the vines. Maybe someone needs it!"
  }
];


export const BOSS = {
  name: "The Hangman King",
  x: 5250,
  fy: 290,
  cat: "Boss",
  lo: 5,
  hi: 8,
  pal: {
    s: "#b8c9ff",
    t: "#30234b",
    p: "#171326",
    h: "coder",
    c: "#67e8f9"
  },
  hp: 10,
  maxHP: 10,
  timeLimit: 50,
introLines: [
  "Wait... You're not one of them, are you?",
  "An outsider... Finally, someone new.",
  "This town wasn't always like this. Its people were once real, but now they're merely recreations trapped in an endless time loop.",
  "I've spent years protecting them while searching for the one responsible.",
  "I've tried to keep their lives as normal as possible, but I can't protect them forever.",
  "And then you arrived. Perhaps you're the one I've been waiting for.",
  "But I can't entrust their lives to just anyone.",
  "I need you to prove yourself. Face me in battle and show me you're worthy of my trust.",
  "If you succeed, I'll leave this town in your care while I hunt down the one behind all this.",
  "I need to know they'll be safe in your hands.",
  "Now then, little hero... show me what you've got."
],
  clue: "The final word",
  free: "The Hangman King has fallen!",
  done: "You already defeated me..."
};

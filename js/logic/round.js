
import { WORDS } from "../data/words.js";
import { pick } from "../data/dialogue.js";
import { MAX_MISSES } from "../constants.js";
import { startQuestMusic } from "../systems/audio.js";

export const Run = {
  level: 1,
  carry: 0,
  used: []
};

export const Round = {
  s: null,

  make(n) {
    const bonus = n.cat === "Boss" ? 0 : Run.level - 1;

    const fits = word =>
      word[0] === n.cat &&
      !Run.used.includes(word[1]);

    let pool = WORDS.filter(
      word =>
        fits(word) &&
        word[1].length >= n.lo + bonus &&
        word[1].length <= n.hi + bonus
    );

    if (!pool.length) {
      pool = WORDS.filter(fits);
    }

    if (!pool.length) {
      Run.used = [];
      pool = WORDS.filter(word => word[0] === n.cat);
    }

    if (!pool.length) {
      throw new Error(
        `No words available for category: ${n.cat}`
      );
    }

    const selected = pick(pool);

    Run.used.push(selected[1]);

    if (n.cat !== "Boss") {
      startQuestMusic();
    }

    this.s = {
      category: selected[0],
      clue: selected[2] || n.clue || "No clue available.",
      word: selected[1],
      guessed: [],
      misses: 0,
      emergencyHintUsed: false
    };

    return this.s;
  },

  triesLeft() {
    return MAX_MISSES - this.s.misses;
  },

  hidden() {
    return [...new Set(this.s.word)].filter(
      letter => !this.s.guessed.includes(letter)
    );
  },

  guess(letter) {
    if (this.s.guessed.includes(letter)) {
      return "repeat";
    }

    this.s.guessed.push(letter);

    if (this.s.word.includes(letter)) {
      return "hit";
    }

    this.s.misses++;
    return "miss";
  },

  hint(free) {
    const hiddenLetters = this.hidden();

    if (hiddenLetters.length <= 1) {
      return null;
    }

    if (
      !free &&
      (
        this.s.emergencyHintUsed ||
        this.triesLeft() <= 1
      )
    ) {
      return null;
    }

    const letter = pick(hiddenLetters);

    this.s.guessed.push(letter);

    if (!free) {
      this.s.emergencyHintUsed = true;
      this.s.misses++;
    }

    return letter;
  },

  won() {
    return this.hidden().length === 0;
  },

  lost() {
    return this.s.misses >= MAX_MISSES;
  },

  over() {
    return this.won() || this.lost();
  }
};

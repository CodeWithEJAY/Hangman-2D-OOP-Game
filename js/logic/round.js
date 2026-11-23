import { WORDS } from "../data/words.js";
import { pick } from "../data/dialogue.js";
import { MAX_MISSES } from "../constants.js";

const validWords = Array.isArray(WORDS)
  ? WORDS.filter(
      word =>
        Array.isArray(word) &&
        typeof word[0] === "string" &&
        typeof word[1] === "string" &&
        word[1].trim().length > 0
    )
  : [];

if (validWords.length !== WORDS.length) {
  console.warn(
    `Invalid word entries detected: ${WORDS.length - validWords.length} entries were ignored. Check data/words.js.`
  );
}

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

    let pool = validWords.filter(
      word =>
        fits(word) &&
        word[1].length >= n.lo + bonus &&
        word[1].length <= n.hi + bonus
    );

    if (!pool.length) {
      pool = validWords.filter(fits);
    }

    if (!pool.length) {
      Run.used = [];
      pool = validWords.filter(
        word => word[0] === n.cat
      );
    }

    if (!pool.length) {
      throw new Error(
        `No valid words available for category: ${n.cat}. Check data/words.js.`
      );
    }

    const selected = pick(pool);

    if (!selected) {
      throw new Error(
        `Could not select a word for category: ${n.cat}.`
      );
    }

    Run.used.push(selected[1]);

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
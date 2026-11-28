export const inputState = {
  left: false,
  right: false,
  jump: false
};

let inputMode = "world";

export const setInputMode = mode => {
  inputMode = mode;
  pressedKeys.clear();
  updateInputState();
};

const pressedKeys = new Set();

const keyMap = {
  ArrowLeft: "left",
  a: "left",
  A: "left",

  ArrowRight: "right",
  d: "right",
  D: "right",

  ArrowUp: "jump",
  w: "jump",
  W: "jump",
  " ": "jump"
};

const dispatchAction = action => {
  document.dispatchEvent(
    new CustomEvent("gameaction", {
      detail: { action }
    })
  );
};

const dispatchLetter = letter => {
  document.dispatchEvent(
    new CustomEvent("gameletter", {
      detail: {
        letter: letter.toLowerCase()
      }
    })
  );
};

const isTypingTarget = target => {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.matches("input, textarea, select") ||
    target.isContentEditable
  );
};

const isIntroDialogueActive = () => {
  return document.body.dataset.introDialogue === "true";
};

const isBossVictoryDialogueActive = () => {
  return document.body.dataset.bossVictoryDialogue === "true";
};

const updateInputState = () => {
  if (isBossVictoryDialogueActive()) {
    pressedKeys.clear();

    inputState.left = false;
    inputState.right = false;
    inputState.jump = false;

    return;
  }

  inputState.left = [...pressedKeys].some(
    key => keyMap[key] === "left"
  );

  inputState.right = [...pressedKeys].some(
    key => keyMap[key] === "right"
  );

  inputState.jump = [...pressedKeys].some(
    key => keyMap[key] === "jump"
  );
};

const finishIntroDialogue = () => {
  closeDialogue(true);

  delete document.body.dataset.introDialogue;

  pressedKeys.clear();
  updateInputState();

  setVisible("pauseBtn", true);
};

const advanceIntroDialogue = () => {
  if (!isIntroDialogueActive()) return;

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

const handleKeyDown = event => {
  const key = event.key;

  if (
    key === "Escape" &&
    document.body.classList.contains("boss-fight-active")
  ) {
    event.preventDefault();
    return;
  }

  if (isTypingTarget(event.target)) {
    return;
  }

  if (isIntroDialogueActive()) {
    event.preventDefault();

    if (
      !event.repeat &&
      (key.toLowerCase() === "e" || key === "Enter")
    ) {
      dispatchAction("interact");
    }

    return;
  }

  if (isBossVictoryDialogueActive()) {
    event.preventDefault();

    if (
      event.repeat ||
      (key.toLowerCase() !== "e" && key !== "Enter")
    ) {
      return;
    }

    if (
      document.body.dataset.bossVictoryTyping === "true" ||
      document.body.dataset.bossVictoryFinalLine === "true"
    ) {
      return;
    }

    dispatchAction("interact");
    return;
  }

  if (inputMode === "guess" && /^[a-zA-Z]$/.test(key)) {
    if (!event.repeat) {
      dispatchLetter(key);
    }

    return;
  }

  if (
    key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === "ArrowUp" ||
    key === " " ||
    key === "a" ||
    key === "A" ||
    key === "d" ||
    key === "D" ||
    key === "w" ||
    key === "W"
  ) {
    event.preventDefault();

    pressedKeys.add(key);
    updateInputState();

    return;
  }

  if (event.repeat) return;

  if (/^[a-zA-Z]$/.test(key)) {
    if (key.toLowerCase() === "e") {
      dispatchAction("interact");
      return;
    }

    dispatchLetter(key);
    return;
  }

  switch (key) {
    case "Enter":
      dispatchAction("interact");
      break;

    case "Escape":
      dispatchAction("escape");
      break;

    case "p":
    case "P":
      dispatchAction("pause");
      break;
  }
};

const handleKeyUp = event => {
  pressedKeys.delete(event.key);
  updateInputState();
};

const handleWindowBlur = () => {
  pressedKeys.clear();
  updateInputState();
};

const handlePointerDown = event => {
  const control = event.target.closest("[data-k]");

  if (!control) return;

  event.preventDefault();

  const direction = control.dataset.k;

  if (isBossVictoryDialogueActive()) {
    if (
      direction === "e" &&
      document.body.dataset.bossVictoryTyping !== "true" &&
      document.body.dataset.bossVictoryFinalLine !== "true"
    ) {
      dispatchAction("interact");
    }

    return;
  }

  if (isIntroDialogueActive()) {
    if (direction === "e") {
      dispatchAction("interact");
    }

    return;
  }

  if (direction === "e") {
    dispatchAction("interact");
    return;
  }

  if (
    direction === "left" ||
    direction === "right" ||
    direction === "jump"
  ) {
    pressedKeys.add(`touch-${direction}`);
    updateInputState();
  }
};
const handlePointerUp = event => {
  const control = event.target.closest("[data-k]");

  if (!control) return;

  event.preventDefault();

  const direction = control.dataset.k;

  if (
    direction === "left" ||
    direction === "right" ||
    direction === "jump"
  ) {
    pressedKeys.delete(`touch-${direction}`);
    updateInputState();
  }
};

const handleButtonClick = event => {
  if (isIntroDialogueActive()) {
    const actionButton = event.target.closest("[data-act]");

    if (actionButton?.dataset.act === "interact") {
      advanceIntroDialogue();
    }

    return;
  }

  if (isBossVictoryDialogueActive()) {
    const actionButton = event.target.closest("[data-act]");

    if (actionButton?.dataset.act === "interact") {
      dispatchAction("interact");
    }

    return;
  }

  const actionButton = event.target.closest("[data-act]");

  if (actionButton) {
    dispatchAction(actionButton.dataset.act);
    return;
  }

  const letterButton = event.target.closest(
    ".key, .keyboard-key"
  );

  if (letterButton && letterButton.dataset.letter) {
    dispatchLetter(letterButton.dataset.letter);
  }
};

export const initializeInput = () => {
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  window.addEventListener(
    "blur",
    handleWindowBlur
  );

  document.addEventListener(
    "pointerdown",
    handlePointerDown
  );

  document.addEventListener(
    "pointerup",
    handlePointerUp
  );

  document.addEventListener(
    "pointercancel",
    handlePointerUp
  );

  document.addEventListener(
    "click",
    handleButtonClick
  );
};

export const initGame = initializeInput;

export const destroyInput = () => {
  document.removeEventListener(
    "keydown",
    handleKeyDown
  );

  document.removeEventListener(
    "keyup",
    handleKeyUp
  );

  window.removeEventListener(
    "blur",
    handleWindowBlur
  );

  document.removeEventListener(
    "pointerdown",
    handlePointerDown
  );

  document.removeEventListener(
    "pointerup",
    handlePointerUp
  );

  document.removeEventListener(
    "pointercancel",
    handlePointerUp
  );

  document.removeEventListener(
    "click",
    handleButtonClick
  );

  pressedKeys.clear();
  updateInputState();
};
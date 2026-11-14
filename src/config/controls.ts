/** Tunables for the character / boat controllers and the camera. */
export const CONTROLS = {
  player: {
    walkSpeed: 4.2,
    runSpeed: 6.5,
    acceleration: 18,
    deceleration: 22,
    turnSpeed: 12,
    jumpVelocity: 6.2,
    gravity: -18,
    radius: 0.42,
    height: 1.6,
    /** Max slope delta per step the controller will "step up" smoothly. */
    stepSmoothing: 10,
  },
  boat: {
    maxSpeed: 7,
    acceleration: 3.2,
    drag: 0.9,
    turnSpeed: 1.25,
    radius: 1.6,
  },
  camera: {
    distance: 6.5,
    minDistance: 3,
    maxDistance: 10,
    height: 1.4,
    pitch: 0.32,
    minPitch: -0.15,
    maxPitch: 1.1,
    mouseSensitivity: 0.0032,
    touchSensitivity: 0.0045,
    followLerp: 6,
    rotateLerp: 10,
    fov: 50,
  },
  interaction: {
    radius: 2.6,
    key: "KeyE",
  },
} as const;

export const KEYBINDINGS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  jump: ["Space"],
  run: ["ShiftLeft", "ShiftRight"],
  interact: ["KeyE", "Enter"],
  inventory: ["KeyI", "Tab"],
  pause: ["Escape", "KeyP"],
  skip: ["Space", "Enter", "Escape"],
} as const;

export type Action = keyof typeof KEYBINDINGS;

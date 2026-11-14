/**
 * Named world positions shared by environment components, scene logic and
 * cinematic timelines. Keeping them in one place means the camera always
 * knows where the portal / tree / gift really is.
 */

export type Vec3 = [number, number, number];

export const SKY_ISLAND = {
  radius: 15,
  spawn: [0, 0, 4] as Vec3,
  marker: [0, 0, -7.5] as Vec3,
  envelopeLanding: [2.2, 0, -5.5] as Vec3,
  lights: [
    [-9.5, 0, -1.5],
    [8.5, 0, 3.5],
    [-3.5, 0, 9],
  ] as Vec3[],
  portal: [0, 0, -12.5] as Vec3,
  tree: [6.5, 0, -7] as Vec3,
  crystals: [
    [-7, 0, -8],
    [10, 0, -3],
    [-11, 0, 4],
    [4, 0, 10],
  ] as Vec3[],
};

export const GARDEN = {
  halfSize: 26,
  spawn: [0, 0, 22] as Vec3,
  pavilion: [0, 0, 0] as Vec3,
  flowers: [
    [-14, 0, 7],
    [12.5, 0, -9],
    [-8, 0, -15],
    [17, 0, 9],
    [-19, 0, -4],
  ] as Vec3[],
  polaroidRadius: 5.2,
  polaroidHeight: 1.85,
  memoryTree: [0, 0, -19] as Vec3,
  treeOffer: [0, 0, -14.5] as Vec3,
};

export const OCEAN = {
  pierStart: [0, 0, 3] as Vec3,
  pierEnd: [0, 0, -8] as Vec3,
  pierWidth: 3.2,
  pierHeight: 0.7,
  boatMoor: [0, 0, -10.5] as Vec3,
  marker: [0, 0, -62] as Vec3,
  bottles: [
    [-28, 0, -82],
    [34, 0, -104],
    [-6, 0, -134],
  ] as Vec3[],
  shrine: [0, 0, -172] as Vec3,
  boundsCenter: [0, 0, -90] as Vec3,
  boundsRadius: 200,
  moonDirection: [-0.35, 0.45, -0.82] as Vec3,
};

export const CASTLE = {
  halfSize: 24,
  spawn: [0, 0, 26] as Vec3,
  gate: [0, 0, -17] as Vec3,
  facadeZ: -20,
  keys: [
    [-18, 0, -6], // beside the west tower
    [12, 0, 9], // fountain rim
    [19, 0, -13], // east garden steps
  ] as Vec3[],
  fountain: [12, 0, 9] as Vec3,
  chamberCenter: [0, 0, -30] as Vec3,
  chamberHalf: { w: 11, d: 8 },
  pedestals: [
    [-5.5, 0, -30],
    [0, 0, -33],
    [5.5, 0, -30],
  ] as Vec3[],
  innerDoor: [0, 0, -38] as Vec3,
  heartRoom: [0, 0, -50] as Vec3,
  heartRoomRadius: 10,
  heart: [0, 2.6, -52] as Vec3,
};

export const FINAL = {
  spawn: [0, 0, 30] as Vec3,
  waypoints: [
    [0, 0, 16],
    [-7, 0, 1],
    [5, 0, -13],
  ] as Vec3[],
  summit: [0, 0, -27] as Vec3,
  summitRadius: 9,
  gift: [0, 0, -30] as Vec3,
  /** Platform islands (x, z, radius). */
  islands: [
    { x: 0, z: 30, r: 7 },
    { x: 0, z: 16, r: 5 },
    { x: -7, z: 1, r: 5.5 },
    { x: 5, z: -13, r: 5.5 },
    { x: 0, z: -27, r: 9 },
  ],
};

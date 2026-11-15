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
  /** Half extent inside the hedges (the garden is 88 m across). */
  halfSize: 44,
  /** South gate; the stream and its main bridge lie between here and the pavilion. */
  spawn: [0, 0, 38] as Vec3,
  pavilion: [0, 0, 0] as Vec3,
  /** The five flowers are spread over the meadows, the mound and the lawns. */
  flowers: [
    [-26, 0, 6], // west meadow
    [27, 0, -4], // east meadow
    [-14, 0, -24], // path to the willow grove
    [24, 0, 28], // south-east lawn by the hedge nook
    [-32, 0, 28], // top of the south-west hill
  ] as Vec3[],
  polaroidRadius: 5.2,
  polaroidHeight: 1.85,
  memoryTree: [0, 0, -30] as Vec3,
  treeOffer: [0, 0, -24.5] as Vec3,
  /** Optional keepsakes tucked into the hidden corners. */
  secrets: [
    [37, 0, 33], // inside the hedge nook
    [0, 0, -40.5], // behind the Memory Tree
    [-40, 0, -8], // far west, behind the rocks
  ] as Vec3[],
  /** Quiet places that play a line of memory the first time they are found. */
  memorySpots: {
    grove: [-28, 0, -28] as Vec3,
    knoll: [31, 0, -31] as Vec3,
  },
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
  /** Half extent of the grounds (ground mesh / scatter bounds). */
  halfSize: 70,
  /** Forest clearing south of the moat. */
  spawn: [0, 0, 54] as Vec3,
  /** Objective marker in front of the sealed keep gate. */
  gate: [0, 0, -23] as Vec3,
  /** Centre of the always-open outer gatehouse. */
  outerGate: [0, 0, 33] as Vec3,
  /** Keep facade (the sealed gate sits in it). */
  facadeZ: -27,
  keys: [
    [-18, 0, 11.5], // inside the west parterre, by the ring statue
    [20, 0, 17], // east of the fountain plaza
    [20, 0, -11.5], // inside the east shrine
  ] as Vec3[],
  fountain: [14, 0, 8] as Vec3,
  chamberCenter: [0, 0, -38] as Vec3,
  chamberHalf: { w: 13, d: 9 },
  pedestals: [
    [-6, 0, -38],
    [0, 0, -42],
    [6, 0, -38],
  ] as Vec3[],
  innerDoor: [0, 0, -47] as Vec3,
  heartRoom: [0, 0, -61] as Vec3,
  heartRoomRadius: 12,
  heart: [0, 2.6, -63] as Vec3,
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

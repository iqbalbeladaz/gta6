// Neon Shores — tuning constants for the city, the player, vehicles and the law.
// One place for every number the rest of the game reads, so the feel can be tuned here.

export const WORLD = {
  width: 3400,
  height: 2600,
  block: 420,          // city grid pitch: one block + one road
  road: 118,           // road width in world units
  beachX: 2980,        // east of this line the city gives way to sand and sea
};

export const PLAYER = {
  radius: 13,
  walkSpeed: 168,
  sprintSpeed: 262,
  health: 100,
  punchRange: 34,
  punchDamage: 34,
};

export const CAR = {
  radius: 21,
  accel: 340,
  brake: 520,
  reverseMax: 120,
  drag: 0.86,
  grip: 7.5,
  health: 100,
};

// Top speed and paint for each driveable model in the city.
export const CAR_MODELS = [
  { name: 'Marlin Sedan',    topSpeed: 335, accel: 1.0,  colors: ['#3f8ef7', '#c0c6ce', '#37424e', '#7a1f1f'] },
  { name: 'Caiman Coupe',    topSpeed: 395, accel: 1.18, colors: ['#e33d5b', '#ffb02e', '#22262b', '#f2f2f2'] },
  { name: 'Sunray Cabrio',   topSpeed: 372, accel: 1.1,  colors: ['#ffd23e', '#ff7a1a', '#19c2a6'] },
  { name: 'Palmetto Pickup', topSpeed: 305, accel: 0.92, colors: ['#5d7a4a', '#8a6d3b', '#4a5a6a'] },
  { name: 'Dune Taxi',       topSpeed: 330, accel: 1.0,  colors: ['#ffc61a'] },
  { name: 'Harbor Van',      topSpeed: 285, accel: 0.85, colors: ['#d8d8d8', '#7fb2d9', '#c96f2e'] },
];

export const WANTED = {
  maxStars: 5,
  decaySeconds: 26,      // hidden time needed for one star to cool off
  bustSeconds: 2.6,      // time a close, slow police stop needs to bust the player
  policePerStar: 2,      // cruisers the city fields per star
};

export const MISSION_REWARD = [250, 600, 900, 1200, 2000];
export const SAVE_KEY = 'neon-shores-save-v1';

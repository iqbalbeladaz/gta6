// The story of Neon Shores, told in five missions. Dario Venn, a wheelman who
// quit the life, owes the Marlin Syndicate one last week of work. Rosa Marlin
// holds his brother's debt — every job pays a piece of it back. Original
// people, an original city, original trouble. Each job is a chain of short
// stages, so the objective line on the HUD always knows what happens next.

import { MISSION_REWARD } from './config.js';
import { PLACES } from './world.js';

export const STORY_INTRO = [
  'Neon Shores, 2026. Dario Venn swore he was done driving for other people.',
  "Then Rosa Marlin bought his brother's debt — and Rosa always collects.",
  'Five jobs. One week. Then the Venn family walks free. Probably.',
];

// Each mission has a title, a giver, a briefing line and a list of stages.
// A stage asks the player to reach a place, get into or steal a specific car,
// or lose the law — optionally against a timer, and often attracting a wanted
// level of its own while it runs.
export const MISSIONS = [
  {
    title: 'First Wheels',
    giver: 'Rosa Marlin',
    brief: "Rosa: \"You still owe me a driver, Dario. Get off the sidewalk, take a car — any car — and come to my diner. Come hungry, leave rich — or don't come at all.\"",
    stages: [
      { type: 'enterCar', text: 'Get in a car' },
      { type: 'goto', place: 'diner', text: "Drive to Rosa's Diner" },
    ],
  },
  {
    title: 'Package Run',
    giver: 'Rosa Marlin',
    brief: "Rosa: \"A crate came in at the Harbor Docks. No manifest, no questions. Bring it to the Motel Coral before the tide — and before anyone official notices.\"",
    stages: [
      { type: 'goto', place: 'docks', text: 'Pick up the crate at the Harbor Docks', wanted: 1 },
      { type: 'goto', place: 'motel', text: 'Deliver the crate to the Motel Coral', timer: 150, wanted: 1 },
    ],
  },
  {
    title: 'The Gold Sunray',
    giver: 'Rosa Marlin',
    brief: "Rosa: \"A guest at the Miramar is behind on a very large bill. His gold Sunray Cabrio is the payment. Take it, shake the law, and park it in Venn's Garage.\"",
    stages: [
      { type: 'goto', place: 'hotel', text: 'Reach the Miramar Beach Hotel' },
      { type: 'stealModel', model: 'Sunray Cabrio', text: 'Steal the gold Sunray Cabrio', wanted: 2 },
      { type: 'loseCops', text: 'Lose the police' },
      { type: 'goto', place: 'garage', text: "Park the Sunray in Venn's Garage" },
    ],
  },
  {
    title: 'The Night Ledger',
    giver: 'Rosa Marlin',
    brief: "Rosa: \"My bookkeeper hid three pages of the ledger around the city before he vanished. Collect all three tonight. The police know the pages matter — expect company.\"",
    stages: [
      { type: 'goto', place: 'police', text: 'Collect ledger page 1 — Shores PD steps', wanted: 2 },
      { type: 'goto', place: 'diner', text: "Collect ledger page 2 — behind Rosa's Diner", wanted: 2 },
      { type: 'goto', place: 'motel', text: 'Collect ledger page 3 — Motel Coral roof sign', wanted: 2 },
      { type: 'goto', place: 'garage', text: "Bring the ledger to Venn's Garage" },
    ],
  },
  {
    title: 'Final Tide',
    giver: 'Dario Venn',
    brief: "Dario: \"The ledger buys our freedom — if it reaches the boat at the Neon Pier before dawn patrol. One last drive, Venn. Make it count.\"",
    stages: [
      { type: 'goto', place: 'pier', text: 'Reach the boat at the Neon Pier', timer: 120, wanted: 3 },
      { type: 'loseCops', text: 'Lose the police before you board' },
      { type: 'goto', place: 'pier', text: 'Board the boat — end the week free' },
    ],
  },
];

export function createMissionState(saved) {
  return {
    index: saved?.mission ?? 0,      // next mission to run
    active: null,                    // { mission, stage } while a job is running
    stageTimer: 0,
    done: (saved?.mission ?? 0) >= MISSIONS.length,
    totalEarned: saved?.totalEarned ?? 0,
  };
}

export function currentStage(state) {
  if (!state.active) return null;
  return state.active.mission.stages[state.active.stage];
}

export function startMission(state) {
  if (state.done || state.active) return null;
  const mission = MISSIONS[state.index];
  state.active = { mission, stage: 0 };
  state.stageTimer = mission.stages[0].timer ?? 0;
  return mission;
}

export function advanceStage(state) {
  if (!state.active) return 'none';
  const mission = state.active.mission;
  state.active.stage += 1;
  if (state.active.stage >= mission.stages.length) {
    const reward = MISSION_REWARD[state.index] ?? 250;
    state.totalEarned += reward;
    state.index += 1;
    state.active = null;
    state.stageTimer = 0;
    state.done = state.index >= MISSIONS.length;
    return 'missionComplete';
  }
  state.stageTimer = mission.stages[state.active.stage].timer ?? 0;
  return 'stage';
}

// Where the current objective points, in world coordinates (or null when the
// stage has no fixed place, like losing the law).
export function objectiveTarget(state, playerCar) {
  const stage = currentStage(state);
  if (!stage) return null;
  if (stage.type === 'goto' || stage.type === 'loseCops') {
    if (stage.type === 'loseCops') return null;
    return PLACES[stage.place];
  }
  if (stage.type === 'stealModel') return PLACES.hotel;
  if (stage.type === 'enterCar') return playerCar ?? null;
  return null;
}

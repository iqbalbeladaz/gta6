// The city of Neon Shores: a sun-soaked coastal grid generated from a seed.
// A regular road network, city blocks with named pastel buildings, palm trees
// and street lights, then sand, a pier and the sea down the east shore — plus
// the named places the story visits and the collision the whole game shares.

import { WORLD } from './config.js';
import { pick, range } from './random.js';

const BUILDING_STYLES = [
  { wall: '#e8b4a0', roof: '#b96a4e', trim: '#fff1e2' },
  { wall: '#a8d8e8', roof: '#5d8aa8', trim: '#eafcff' },
  { wall: '#f2d492', roof: '#c1913c', trim: '#fff6da' },
  { wall: '#c9b8e8', roof: '#7a63a8', trim: '#f4efff' },
  { wall: '#9fd6b5', roof: '#4e7d5f', trim: '#eafff1' },
  { wall: '#f0f0f2', roof: '#8a8f98', trim: '#ffd23e' },
  { wall: '#e89fb5', roof: '#a84e6d', trim: '#ffeef4' },
];

const BLOCK_NAMES = [
  'Marlin Hotel', 'Casa Azul', 'The Pelican', 'Solana Suites', 'Cafe Brisa', 'Tide Arcade',
  'Palma Mall', 'Hotel Miramar', 'Neon Gym', 'Banco del Sol', 'Marina Offices', 'The Flamingo',
  'Coco Flats', 'Vista Tower', 'Surf Shop Ola', 'Clinica Vida', 'Estrella Cinema', 'Puerto Lofts',
];

// Key story locations, each placed on a real corner of the grid.
export const PLACES = {
  diner:   { x: 640,  y: 560,  name: "Rosa's Diner",        color: '#ff5d7a' },
  docks:   { x: 2760, y: 2080, name: 'Harbor Docks',        color: '#ffb02e' },
  motel:   { x: 640,  y: 1820, name: 'Motel Coral',         color: '#19c2a6' },
  hotel:   { x: 2760, y: 640,  name: 'Miramar Beach Hotel', color: '#ffd23e' },
  garage:  { x: 1480, y: 1400, name: "Venn's Garage",       color: '#3f8ef7' },
  pier:    { x: 3180, y: 1400, name: 'Neon Pier',           color: '#c77dff' },
  hospital:{ x: 1060, y: 2240, name: 'Clinica Vida',        color: '#ffffff' },
  police:  { x: 1900, y: 560,  name: 'Shores PD',           color: '#7fb2d9' },
};

export function roadCenter(index) {
  return index * WORLD.block + WORLD.block / 2;
}

// Is a point on a road (in either direction) rather than inside a block?
export function onRoad(x, y) {
  if (x >= WORLD.beachX - 60) return false;
  const mx = ((x % WORLD.block) + WORLD.block) % WORLD.block;
  const my = ((y % WORLD.block) + WORLD.block) % WORLD.block;
  const half = WORLD.road / 2;
  const mid = WORLD.block / 2;
  return Math.abs(mx - mid) < half || Math.abs(my - mid) < half;
}

export function createWorld(random) {
  const buildings = [];
  const trees = [];
  const lights = [];
  const shells = [];   // hidden collectibles: golden neon shells
  const cols = Math.floor(WORLD.width / WORLD.block);
  const rows = Math.floor(WORLD.height / WORLD.block);

  for (let cx = 0; cx < cols; cx += 1) {
    for (let cy = 0; cy < rows; cy += 1) {
      const bx = cx * WORLD.block + WORLD.road / 2 + 14;
      const by = cy * WORLD.block + WORLD.road / 2 + 14;
      const bw = WORLD.block - WORLD.road - 28;
      const bh = WORLD.block - WORLD.road - 28;
      if (bx > WORLD.beachX - 200) continue; // shore blocks stay sand and palms
      // One large building per block, or two smaller ones side by side.
      const split = random() > 0.45;
      const style = pick(random, BUILDING_STYLES);
      const name = pick(random, BLOCK_NAMES);
      if (split) {
        buildings.push({ x: bx, y: by, w: bw * 0.46, h: bh, floors: 2 + Math.floor(random() * 6), ...style, name });
        buildings.push({ x: bx + bw * 0.54, y: by, w: bw * 0.46, h: bh * (0.55 + random() * 0.4), floors: 2 + Math.floor(random() * 5), ...pick(random, BUILDING_STYLES), name: '' });
      } else {
        buildings.push({ x: bx + bw * 0.08, y: by + bh * 0.08, w: bw * 0.84, h: bh * 0.84, floors: 3 + Math.floor(random() * 8), ...style, name });
      }
      // Palms and street lights scattered around the block.
      for (let i = 0; i < 3; i += 1) {
        trees.push({ x: bx + random() * bw, y: by - 8, s: range(random, 0.8, 1.25) });
        lights.push({ x: bx - 10, y: by + random() * bh });
      }
    }
  }
  // A loose line of palms along the beach.
  for (let i = 0; i < 26; i += 1) {
    trees.push({ x: range(random, WORLD.beachX - 40, WORLD.beachX + 130), y: random() * WORLD.height, s: range(random, 0.9, 1.4) });
  }
  // Ten golden shells hidden on the roads, waiting to be collected.
  for (let i = 0; i < 10; i += 1) {
    let x = 0; let y = 0; let tries = 0;
    do { x = range(random, 200, WORLD.beachX - 200); y = range(random, 200, WORLD.height - 200); tries += 1; }
    while (!onRoad(x, y) && tries < 20);
    shells.push({ x, y, taken: false, bob: random() * 6.28 });
  }

  const colliders = buildings.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h }));
  return { buildings, trees, lights, shells, colliders };
}

// Push a circular entity out of every building rectangle and clamp it to the
// world edge. Sets entity.hitWall when a building stopped it, which the
// driving code reads to score crash damage.
export function collide(world, entity, radius) {
  for (const b of world.colliders) {
    const nearX = Math.max(b.x, Math.min(entity.x, b.x + b.w));
    const nearY = Math.max(b.y, Math.min(entity.y, b.y + b.h));
    const dx = entity.x - nearX;
    const dy = entity.y - nearY;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 < 0.01) { entity.x = b.x - radius; continue; }
      const d = Math.sqrt(d2);
      entity.x = nearX + (dx / d) * radius;
      entity.y = nearY + (dy / d) * radius;
      entity.hitWall = true;
    }
  }
  entity.x = Math.max(radius, Math.min(WORLD.width - radius, entity.x));
  entity.y = Math.max(radius, Math.min(WORLD.height - radius, entity.y));
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

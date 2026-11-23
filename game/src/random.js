// A small seeded random source (mulberry32), deterministic by design: a given
// seed always builds the same city, deals the same traffic and poses the same
// screenshot scenes, so renders and playtests are perfectly reproducible.
// Nothing in the game ever calls Math.random, which keeps that promise airtight.

export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(random, list) {
  return list[Math.floor(random() * list.length) % list.length];
}

export function range(random, low, high) {
  return low + random() * (high - low);
}

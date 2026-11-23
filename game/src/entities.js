// The living city: traffic that drives the road grid and queues behind each
// other, pedestrians who stroll the sidewalks, scatter from danger and
// witness crimes, and the Shores PD cruisers that hunt the player when the
// stars climb. Traffic obeys the grid and the car ahead of it — nobody here
// drives through anybody else if they can possibly help it.

import { CAR_MODELS, WANTED, WORLD } from './config.js';
import { pick, range } from './random.js';
import { collide, distance, onRoad, roadCenter } from './world.js';

let nextId = 1;

export function makeCar(random, x, y, modelIndex) {
  const model = CAR_MODELS[modelIndex ?? Math.floor(random() * CAR_MODELS.length)];
  return {
    id: nextId++, kind: 'car', model, name: model.name,
    x, y, angle: pick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]),
    speed: 0, health: 100, color: pick(random, model.colors),
    driver: true, police: false, parked: false, taxi: model.name === 'Dune Taxi',
    steerVis: 0, sirenPhase: random() * 6.28,
  };
}

export function makePoliceCar(random, x, y) {
  const car = makeCar(random, x, y, 0);
  car.police = true;
  car.name = 'Shores PD Cruiser';
  car.color = '#eef2f5';
  car.model = { name: 'Shores PD Cruiser', topSpeed: 385, accel: 1.12, colors: ['#eef2f5'] };
  return car;
}

export function makePed(random, x, y) {
  return {
    id: nextId++, kind: 'ped', x, y, angle: random() * 6.28,
    speed: 0, health: 100, state: 'walk', panic: 0,
    shirt: pick(random, ['#ff5d7a', '#ffd23e', '#19c2a6', '#3f8ef7', '#f2f2f2', '#ff7a1a', '#c77dff']),
    skin: pick(random, ['#8a5a3b', '#c98a5a', '#5d3a22', '#e8b08a', '#6e4525']),
    tx: x, ty: y, retarget: random() * 4, down: 0,
  };
}

// Spawn traffic on roads near a focus point, with some cars parked at curbs.
export function spawnTraffic(random, cars, focus, count) {
  let placed = 0; let tries = 0;
  while (placed < count && tries < count * 30) {
    tries += 1;
    const x = focus.x + range(random, -900, 900);
    const y = focus.y + range(random, -700, 700);
    if (x < 60 || y < 60 || x > WORLD.beachX - 80 || y > WORLD.height - 60) continue;
    if (!onRoad(x, y)) continue;
    if (cars.some((c) => Math.hypot(c.x - x, c.y - y) < 90)) continue;
    const car = makeCar(random, x, y);
    // Snap the car onto a lane: horizontal or vertical road, right-hand side.
    const mx = ((x % WORLD.block) + WORLD.block) % WORLD.block;
    if (Math.abs(mx - WORLD.block / 2) < WORLD.road / 2) {
      car.x = Math.floor(x / WORLD.block) * WORLD.block + WORLD.block / 2 + 26;
      car.angle = random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
      if (car.angle < 0) car.x -= 52;
    } else {
      car.y = Math.floor(y / WORLD.block) * WORLD.block + WORLD.block / 2 + 26;
      car.angle = random() > 0.5 ? 0 : Math.PI;
      if (car.angle !== 0) car.y -= 52;
    }
    car.parked = random() < 0.3;
    if (car.parked) { car.driver = false; car.speed = 0; }
    cars.push(car);
    placed += 1;
  }
}

export function spawnPeds(random, peds, focus, count) {
  let placed = 0; let tries = 0;
  while (placed < count && tries < count * 30) {
    tries += 1;
    const x = focus.x + range(random, -800, 800);
    const y = focus.y + range(random, -600, 600);
    if (x < 40 || y < 40 || x > WORLD.width - 40 || y > WORLD.height - 40) continue;
    if (onRoad(x, y)) continue;
    peds.push(makePed(random, x, y));
    placed += 1;
  }
}

// Traffic AI: follow the lane at a relaxed pace, slow for whatever is ahead,
// and sometimes turn at an intersection centre onto a new street.
export function updateTrafficCar(random, world, car, dt, traffic, playerPos) {
  if (car.parked || !car.driver || (playerPos && car === playerPos.car)) return;
  const aheadX = car.x + Math.cos(car.angle) * 64;
  const aheadY = car.y + Math.sin(car.angle) * 64;
  let blocked = false;
  for (const other of traffic) {
    if (other !== car && Math.hypot(other.x - aheadX, other.y - aheadY) < 42) { blocked = true; break; }
  }
  if (!blocked && playerPos && Math.hypot(playerPos.x - aheadX, playerPos.y - aheadY) < 40) blocked = true;
  const target = blocked ? 0 : car.model.topSpeed * 0.42;
  car.speed += Math.max(-260 * dt, Math.min(150 * dt, target - car.speed));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  collide(world, car, 20);

  // Near an intersection centre, occasionally pick a new heading on the grid.
  const gx = Math.round((car.x - WORLD.block / 2) / WORLD.block);
  const gy = Math.round((car.y - WORLD.block / 2) / WORLD.block);
  const cx = roadCenter(gx); const cy = roadCenter(gy);
  if (Math.hypot(car.x - cx, car.y - cy) < 16 && random() < 0.012) {
    const turns = [0, Math.PI / 2, Math.PI, -Math.PI / 2].filter((a) => Math.abs(angleDiff(a, car.angle)) > 0.1);
    car.angle = pick(random, turns);
    // Settle into the right-hand lane for the new heading.
    car.x = cx + Math.cos(car.angle + Math.PI / 2) * 0 + Math.sin(car.angle) * 26 * (car.angle === Math.PI ? -1 : 1) * 0;
    if (car.angle === 0) car.y = cy + 26;
    if (car.angle === Math.PI) car.y = cy - 26;
    if (car.angle === Math.PI / 2) car.x = cx + 26;
    if (car.angle === -Math.PI / 2) car.x = cx - 26;
  }
  if (car.x > WORLD.beachX - 70) { car.angle = Math.PI; car.y -= 0; }
}

export function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Police AI: steer at where the target is heading, not just where it is, and
// reverse out when a bad approach angle leaves the cruiser nose-first in a jam.
export function updatePoliceCar(world, car, dt, target) {
  const lead = 0.45;
  const tx = target.x + (target.vx || 0) * lead;
  const ty = target.y + (target.vy || 0) * lead;
  const want = Math.atan2(ty - car.y, tx - car.x);
  const diff = angleDiff(want, car.angle);
  car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff * 3.2));
  const dist = Math.hypot(target.x - car.x, target.y - car.y);
  const top = car.model.topSpeed * (dist > 500 ? 1.02 : 0.86);
  const accel = 300 * car.model.accel;
  if (Math.abs(diff) > 2.4 && dist < 120) {
    car.speed = Math.max(-90, car.speed - 300 * dt); // reverse out of a bad angle
  } else {
    car.speed = Math.min(top, car.speed + accel * dt);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const before = car.hitWall;
  collide(world, car, 20);
  if (car.hitWall && !before) car.speed *= 0.4;
  car.sirenPhase += dt * 9;
}

// Keep the police fleet sized to the wanted level, spawning out of view.
export function syncPolice(random, police, wanted, focus) {
  const want = wanted * WANTED.policePerStar;
  while (police.length < want) {
    const angle = random() * Math.PI * 2;
    const x = Math.max(50, Math.min(WORLD.width - 50, focus.x + Math.cos(angle) * 780));
    const y = Math.max(50, Math.min(WORLD.height - 50, focus.y + Math.sin(angle) * 620));
    police.push(makePoliceCar(random, x, y));
  }
  while (police.length > want) police.pop();
}

// Pedestrians stroll between sidewalk points; danger nearby makes them run.
export function updatePed(random, world, ped, dt, danger) {
  if (ped.down > 0) { ped.down -= dt; return; }
  if (danger && Math.hypot(danger.x - ped.x, danger.y - ped.y) < 190) ped.panic = 2.2;
  if (ped.panic > 0) ped.panic -= dt;
  ped.retarget -= dt;
  if (ped.retarget <= 0 || Math.hypot(ped.tx - ped.x, ped.ty - ped.y) < 12) {
    ped.retarget = range(random, 2.5, 6);
    if (ped.panic > 0 && danger) {
      ped.tx = ped.x + (ped.x - danger.x) * 2.2;
      ped.ty = ped.y + (ped.y - danger.y) * 2.2;
    } else {
      ped.tx = ped.x + range(random, -260, 260);
      ped.ty = ped.y + range(random, -260, 260);
    }
    ped.tx = Math.max(24, Math.min(WORLD.width - 24, ped.tx));
    ped.ty = Math.max(24, Math.min(WORLD.height - 24, ped.ty));
  }
  const want = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
  ped.angle += Math.max(-6 * dt, Math.min(6 * dt, angleDiff(want, ped.angle) * 6));
  const speed = ped.panic > 0 ? 215 : 62;
  ped.x += Math.cos(ped.angle) * speed * dt;
  ped.y += Math.sin(ped.angle) * speed * dt;
  if (onRoad(ped.x, ped.y) && ped.panic <= 0) {
    // Step back toward the sidewalk rather than stroll down the carriageway.
    ped.x -= Math.cos(ped.angle) * speed * dt * 1.6;
    ped.y -= Math.sin(ped.angle) * speed * dt * 1.6;
    ped.retarget = 0;
  }
  collide(world, ped, 11);
}

export function nearestCar(cars, pos, maxDist) {
  let best = null; let bestD = maxDist;
  for (const car of cars) {
    const d = distance(car, pos);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

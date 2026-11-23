// Deterministic screenshot scenes, posed by the game's own code so the kit's
// shots.json captures real renders: ?shot=start|play|chase|end&seed=1
// - start: the title screen over the waking city
// - play:  on foot beside a coupe, first mission objective on the HUD
// - chase: three stars, cruisers on the player's tail, mid-story
// - end:   mission complete at the pier at golden hour

import { PLACES } from './world.js';
import { makeCar, makePoliceCar } from './entities.js';
import { startMission } from './missions.js';

export function applyShot(game, name, random) {
  const p = game.player;
  game.shotMode = true;
  if (name === 'start') {
    game.state = 'menu';
    p.x = 1480; p.y = 1400;
    game.camera.x = p.x - 640; game.camera.y = p.y - 360; game.camera.init = true;
    return;
  }
  game.state = 'playing';
  if (name === 'play') {
    p.x = 700; p.y = 660;
    const coupe = makeCar(random, 770, 700, 1);
    coupe.angle = 0.4;
    game.cars.push(coupe);
    startMission(game.missions);
    game.missions.active.stage = 1; // driving to the diner
    game.refreshObjective();
    game.camera.x = p.x - 620; game.camera.y = p.y - 340; game.camera.init = true;
    return;
  }
  if (name === 'chase') {
    const car = makeCar(random, 1520, 1470, 1);
    car.color = '#e33d5b';
    car.angle = 0; car.speed = 260;
    game.cars.push(car);
    p.car = car; p.x = car.x; p.y = car.y; p.hasGun = true; p.ammo = 42; p.money = 2740;
    game.missions.index = 2;
    startMission(game.missions);
    game.missions.active.stage = 2; // lose the cops
    game.wanted = 3;
    game.refreshObjective();
    const spots = [[1330, 1400, 0.3], [1360, 1560, -0.25], [1700, 1330, 0.9]];
    for (const [x, y, a] of spots) {
      const cop = makePoliceCar(random, x, y);
      cop.angle = a; cop.speed = 230;
      game.police.push(cop);
    }
    game.camera.x = p.x - 560; game.camera.y = p.y - 320; game.camera.init = true; game.camera.zoom = 0.82;
    return;
  }
  // end: the gold Sunray delivered, golden hour at the pier.
  game.timeOfDay = 0.86;
  const gold = makeCar(random, PLACES.pier.x - 150, PLACES.pier.y + 120, 2);
  gold.color = '#ffd23e';
  gold.angle = -0.4;
  gold.parked = true;
  gold.driver = false;
  game.cars.push(gold);
  game.goldCar = gold;
  p.x = PLACES.pier.x - 90; p.y = PLACES.pier.y + 150; p.money = 6120; p.hasGun = true; p.ammo = 60;
  game.missions.index = 5; game.missions.done = true;
  game.banner = { title: 'MISSION COMPLETE — FINAL TIDE', text: 'The Venn family walks free. +$2,000', ttl: 999 };
  game.toast = { text: 'Story complete — Neon Shores is yours. Free roam!', ttl: 999 };
  game.camera.x = p.x - 620; game.camera.y = p.y - 330; game.camera.init = true;
}

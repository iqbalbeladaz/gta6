// Neon Shores — main loop and game state. An original open-world crime game:
// explore a coastal city on foot and by car, steal rides, run Rosa Marlin's
// five jobs, collect the golden shells, work taxi fares, and keep one step
// ahead of the Shores PD. Keyboard and mouse; progress saves in the browser.

import { SAVE_KEY, WANTED } from './config.js';
import { createRandom } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { PLACES, createWorld, distance } from './world.js';
import { nearestCar, spawnPeds, spawnTraffic, syncPolice, updatePed, updatePoliceCar, updateTrafficCar, makeCar } from './entities.js';
import { MISSIONS, STORY_INTRO, advanceStage, createMissionState, currentStage, objectiveTarget, startMission } from './missions.js';
import { createPlayer, enterCar, exitCar, updateDriving, updateOnFoot } from './player.js';
import { createCamera, drawCar, drawHUD, drawPed, drawWorld, updateCamera } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const view = { w: 1280, h: 720 };
function resize() {
  view.w = canvas.width = innerWidth;
  view.h = canvas.height = innerHeight;
}
addEventListener('resize', resize);
resize();

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 2026);
const random = createRandom(seed);
const input = createInput(canvas);
const audio = createAudio();

function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
const saved = params.has('shot') ? null : loadSave();

const game = {
  state: 'menu',
  world: createWorld(createRandom(seed)),
  player: createPlayer(saved),
  missions: createMissionState(saved),
  cars: [],
  peds: [],
  police: [],
  camera: createCamera(),
  wanted: 0,
  hideTimer: 0,
  bustMeter: 0,
  elapsed: 0,
  timeOfDay: 0.18,
  day: saved?.day ?? 1,
  banner: null,
  toast: null,
  prompt: '',
  objectiveText: '',
  objectivePos: null,
  shellsFound: saved?.shellsFound ?? 0,
  fare: null,
  goldCar: null,
  garageAmmoAt: 0,
  shotMode: false,
  saveTimer: 0,
};
if (saved?.shells) for (const i of saved.shells) if (game.world.shells[i]) game.world.shells[i].taken = true;

spawnTraffic(random, game.cars, game.player, 16);
spawnPeds(random, game.peds, game.player, 20);

function saveGame() {
  if (game.shotMode) return;
  const shells = game.world.shells.map((s, i) => (s.taken ? i : -1)).filter((i) => i >= 0);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: Math.floor(game.player.money), health: 100, hasGun: game.player.hasGun,
      ammo: game.player.ammo, mission: game.missions.index, totalEarned: game.missions.totalEarned,
      shells, shellsFound: game.shellsFound, day: game.day,
    }));
  } catch { /* private mode: play on without saving */ }
}

function setBanner(title, text, ttl = 4.5) { game.banner = { title, text, ttl }; }
function setToast(text, ttl = 3.2) { game.toast = { text, ttl }; }

function addWanted(stars, reason) {
  const before = game.wanted;
  game.wanted = Math.min(WANTED.maxStars, Math.max(game.wanted, stars));
  if (game.wanted > before) {
    game.hideTimer = 0;
    setToast('★ Wanted level ' + game.wanted + (reason ? ' — ' + reason : ''));
    audio.siren(true, 0);
  }
}
function crime(stars, reason) {
  // A crime counts double if a cruiser or a crowd actually sees it.
  const seen = game.police.some((c) => distance(c, game.player) < 340)
    || game.peds.some((p) => p.down <= 0 && distance(p, game.player) < 150);
  addWanted(seen ? stars + 1 : stars, reason);
}

const MISSION_START_PLACE = ['diner', 'diner', 'diner', 'diner', 'garage'];
game.refreshObjective = function refreshObjective() {
  const stage = currentStage(game.missions);
  if (stage) {
    game.objectiveText = stage.text;
    game.objectivePos = objectiveTarget(game.missions, nearestCar(game.cars, game.player, 400));
    if (stage.type === 'enterCar') game.objectivePos = null;
    if (stage.type === 'loseCops') game.objectiveText = stage.text + ' — break line of sight and stay hidden';
    return;
  }
  if (game.missions.done) {
    game.objectiveText = game.fare ? 'Taxi fare: ' + game.fare.label : 'Free roam — taxi fares, shells and sunsets. Story complete!';
    game.objectivePos = game.fare?.pos ?? null;
    return;
  }
  const mission = MISSIONS[game.missions.index];
  const place = PLACES[MISSION_START_PLACE[game.missions.index]];
  game.objectiveText = 'New job: "' + mission.title + '" — meet at ' + place.name + ' [E]';
  game.objectivePos = place;
};

function beginMission() {
  const mission = startMission(game.missions);
  if (!mission) return;
  setBanner('MISSION — ' + mission.title.toUpperCase(), mission.giver);
  setToast(mission.brief, 7);
  statusEl.textContent = mission.brief;
  audio.mission();
  if (game.missions.index === 2 && !game.goldCar) {
    game.goldCar = makeCar(random, PLACES.hotel.x + 30, PLACES.hotel.y + 46, 2);
    game.goldCar.color = '#ffd23e';
    game.goldCar.parked = true;
    game.goldCar.driver = false;
    game.cars.push(game.goldCar);
  }
  applyStageWanted();
  game.refreshObjective();
}
function applyStageWanted() {
  const stage = currentStage(game.missions);
  if (stage?.wanted) addWanted(stage.wanted, 'the job draws heat');
}
function completeStage() {
  audio.pickup();
  const result = advanceStage(game.missions);
  if (result === 'missionComplete') {
    const idx = game.missions.index - 1;
    const reward = [250, 600, 900, 1200, 2000][idx] ?? 250;
    game.player.money += reward;
    setBanner('MISSION COMPLETE', '"' + MISSIONS[idx].title + '"  +$' + reward);
    audio.cash();
    if (idx === 1 && !game.player.hasGun) {
      game.player.hasGun = true;
      game.player.ammo = 48;
      setToast("Rosa left you a pistol in the glovebox. Mouse aims, click fires.", 6);
    }
    if (game.missions.done) setToast('STORY COMPLETE — the Venn family walks free. Free roam unlocked!', 7);
    saveGame();
  } else if (result === 'stage') {
    setToast('Objective updated');
    applyStageWanted();
  }
  game.refreshObjective();
}
function failMission(reason) {
  game.missions.active = null;
  game.missions.stageTimer = 0;
  setBanner('MISSION FAILED', reason);
  audio.fail();
  game.refreshObjective();
}

function respawn(at) {
  game.player.health = 100;
  game.player.car = null;
  game.player.x = at.x + 30;
  game.player.y = at.y + 40;
  game.wanted = 0;
  game.bustMeter = 0;
  game.police.length = 0;
}

function attack() {
  const p = game.player;
  if (p.car) return;
  const aim = Math.atan2(
    (input.mouse.y / game.camera.zoom + game.camera.y) - p.y,
    (input.mouse.x / game.camera.zoom + game.camera.x) - p.x,
  );
  p.angle = aim;
  if (p.hasGun && p.ammo > 0 && p.shootCooldown <= 0) {
    p.shootCooldown = 0.22;
    p.ammo -= 1;
    p.fireAnim = 0.09;
    audio.shoot();
    crime(2, 'shots fired');
    // Hitscan along the aim line.
    let best = null; let bestD = 430;
    for (const ped of game.peds) {
      const d = distance(ped, p);
      if (d < bestD && Math.abs(angleDelta(Math.atan2(ped.y - p.y, ped.x - p.x), aim)) < 0.16) { best = ped; bestD = d; }
    }
    for (const car of [...game.cars, ...game.police]) {
      const d = distance(car, p);
      if (d < bestD && Math.abs(angleDelta(Math.atan2(car.y - p.y, car.x - p.x), aim)) < 0.22) { best = car; bestD = d; }
    }
    if (best?.kind === 'ped') { best.down = 4; best.health -= 60; }
    if (best?.kind === 'car') { best.health -= 22; if (best.police) addWanted(3, 'you shot at the PD'); }
    game.muzzle = { x: p.x + Math.cos(aim) * 20, y: p.y + Math.sin(aim) * 20, angle: aim, ttl: 0.07, range: best ? bestD : 430 };
  } else if (p.punchCooldown <= 0) {
    p.punchCooldown = 0.34;
    p.fireAnim = 0.12;
    audio.punch();
    for (const ped of game.peds) {
      if (distance(ped, p) < 36) { ped.down = 2.5; ped.health -= 34; crime(1, 'assault'); }
    }
  }
}
function angleDelta(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function checkMissionStage() {
  const stage = currentStage(game.missions);
  if (!stage) return;
  const p = game.player;
  if (stage.type === 'enterCar' && p.car) completeStage();
  else if (stage.type === 'goto' && distance(p, PLACES[stage.place]) < 78) completeStage();
  else if (stage.type === 'stealModel' && p.car && p.car.name.includes(stage.model)) completeStage();
  else if (stage.type === 'loseCops' && game.wanted === 0) completeStage();
}

function update(dt) {
  game.elapsed += dt;
  game.timeOfDay += dt / 480;
  if (game.timeOfDay >= 1) { game.timeOfDay = 0; game.day += 1; }
  const p = game.player;
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.shootCooldown > 0) p.shootCooldown -= dt;
  if (p.fireAnim > 0) p.fireAnim -= dt;
  if (game.muzzle && (game.muzzle.ttl -= dt) <= 0) game.muzzle = null;
  if (game.banner && (game.banner.ttl -= dt) <= 0) game.banner = null;
  if (game.toast && (game.toast.ttl -= dt) <= 0) game.toast = null;

  if (game.state !== 'playing') return;

  // Mission timer.
  if (game.missions.active && game.missions.stageTimer > 0) {
    game.missions.stageTimer -= dt;
    if (game.missions.stageTimer <= 0) failMission('Out of time. The job is still on the board — try again.');
  }

  // Player movement and cars.
  let crash = 0;
  if (p.car) {
    crash = updateDriving(game.world, p, input, dt);
    if (crash > 0.15) { audio.crash(crash); if (crash > 0.45) crime(1, 'reckless driving'); }
    if (input.hit('f', 'e')) { exitCar(p, audio); }
  } else {
    updateOnFoot(game.world, p, input, dt);
    const near = nearestCar(game.cars, p, 46);
    game.prompt = near ? '[F] ' + (near.driver ? 'Steal the ' : 'Take the ') + near.name : '';
    if (near && input.hit('f', 'e')) {
      const wasDriven = near.driver;
      enterCar(p, near, audio);
      if (wasDriven || near === game.goldCar) crime(1, 'grand theft auto');
      game.prompt = '';
      checkMissionStage();
    } else if (!game.missions.active && !game.missions.done) {
      const place = PLACES[MISSION_START_PLACE[game.missions.index]];
      if (distance(p, place) < 92) {
        game.prompt = '[E] Start job: "' + MISSIONS[game.missions.index].title + '"';
        if (input.hit('e')) beginMission();
      }
    }
    if (input.mouse.clicked) attack();
  }
  if (p.car) game.prompt = '[F] Get out · Space handbrake · WASD drive';

  // World life around the player.
  for (const car of game.cars) updateTrafficCar(random, game.world, car, dt, game.cars, p.car ? null : p);
  syncPolice(random, game.police, game.wanted, p);
  for (const cop of game.police) updatePoliceCar(game.world, cop, dt, p);
  audio.siren(game.police.length > 0 && distance(game.police[0], p) < 700, dt);
  audio.engine(p.car ? p.car.speed / p.car.model.topSpeed : 0, !!p.car);

  // Car-to-car bumps and running the world over.
  const allCars = [...game.cars, ...game.police];
  for (const car of allCars) {
    for (const other of allCars) {
      if (other === car) continue;
      const d = distance(car, other);
      if (d > 0 && d < 40) {
        const push = (40 - d) / 2;
        const nx = (car.x - other.x) / d; const ny = (car.y - other.y) / d;
        car.x += nx * push; car.y += ny * push;
        if (car === p.car || other === p.car) {
          const rel = Math.abs((car.speed || 0) - (other.speed || 0));
          if (rel > 130) { audio.crash(0.5); p.health -= 2; }
          car.speed *= 0.82; other.speed *= 0.82;
        }
      }
    }
    if (p.car && car !== p.car && distance(car, p) < 30 && Math.abs(p.car.speed) > 60) { /* near miss */ }
  }
  for (const ped of game.peds) {
    updatePed(random, game.world, ped, dt, (p.car && Math.abs(p.car.speed) > 150) || p.fireAnim > 0 ? p : null);
    if (p.car && Math.abs(p.car.speed) > 70 && distance(ped, p) < 27 && ped.down <= 0) {
      ped.down = 4; ped.health -= 55;
      p.health -= 1.5;
      crime(2, 'hit and run');
      audio.crash(0.4);
    }
  }
  // Keep the neighbourhood populated, retire the far side of town.
  game.cars = game.cars.filter((c) => c === p.car || c === game.goldCar || distance(c, p) < 1500);
  game.peds = game.peds.filter((ped) => distance(ped, p) < 1300);
  if (game.cars.length < 15) spawnTraffic(random, game.cars, p, 4);
  if (game.peds.length < 20) spawnPeds(random, game.peds, p, 5);

  // Wanted decay and the bust meter.
  const nearestCop = game.police.length ? Math.min(...game.police.map((c) => distance(c, p))) : 9999;
  if (game.wanted > 0 && nearestCop > 430) {
    game.hideTimer += dt;
    if (game.hideTimer > WANTED.decaySeconds) {
      game.wanted -= 1;
      game.hideTimer = 0;
      setToast(game.wanted === 0 ? 'You lost the law.' : 'Heat cooling — ' + game.wanted + ' star' + (game.wanted > 1 ? 's' : ''));
      checkMissionStage();
    }
  } else game.hideTimer = 0;
  const slowOrFoot = !p.car || Math.abs(p.car.speed) < 26;
  if (game.wanted > 0 && nearestCop < 78 && slowOrFoot) {
    game.bustMeter += dt / WANTED.bustSeconds;
    if (game.bustMeter >= 1) {
      p.money = Math.max(0, p.money - Math.floor(p.money * 0.15) - 50);
      setBanner('BUSTED', 'The Shores PD impounds your ride and fines you. Walk it off.');
      audio.fail();
      respawn(PLACES.police);
      return;
    }
  } else game.bustMeter = Math.max(0, game.bustMeter - dt * 1.6);

  // Pickups: shells, the garage ammo top-up, and taxi fares.
  for (const shell of game.world.shells) {
    if (!shell.taken && distance(shell, p) < 30) {
      shell.taken = true;
      game.shellsFound += 1;
      p.money += 75;
      setToast('Neon Shell ' + game.shellsFound + '/' + game.world.shells.length + '  +$75');
      audio.pickup();
      saveGame();
    }
  }
  if (distance(p, PLACES.garage) < 90 && game.elapsed - game.garageAmmoAt > 60 && p.hasGun && p.ammo < 96) {
    game.garageAmmoAt = game.elapsed;
    p.ammo = Math.min(96, p.ammo + 24);
    p.health = Math.min(100, p.health + 25);
    setToast("Venn's Garage: patched up, +24 rounds");
    audio.heal();
  }
  if (p.car?.taxi && !game.fare) {
    const farePed = game.peds.find((ped) => ped.down <= 0 && distance(ped, p) < 60);
    if (farePed) {
      const dests = Object.values(PLACES);
      const dest = dests[Math.floor(random() * dests.length)];
      game.fare = { pos: dest, label: 'drop-off at ' + dest.name, pay: 90 + Math.round(distance(farePed, dest) / 9) };
      farePed.down = 99999; // rides along, off the street
      setToast('Fare picked up — ' + dest.name);
      game.refreshObjective();
    }
  }
  if (game.fare && distance(p, game.fare.pos) < 80) {
    p.money += game.fare.pay;
    setToast('Fare paid +$' + game.fare.pay);
    audio.cash();
    game.fare = null;
    game.refreshObjective();
  }

  checkMissionStage();
  game.refreshObjective();

  // Death.
  if (p.health <= 0) {
    p.money = Math.max(0, p.money - 200);
    setBanner('WASTED', 'Clinica Vida patches you up for $200. The week goes on.');
    audio.fail();
    respawn(PLACES.hospital);
  }

  game.saveTimer += dt;
  if (game.saveTimer > 10) { game.saveTimer = 0; saveGame(); }
  updateCamera(game.camera, p, dt, view);
}

function drawMenu() {
  drawWorld(ctx, game, view);
  for (const car of game.cars) drawCar(ctx, car, game.camera);
  ctx.fillStyle = 'rgba(6,10,24,0.55)';
  ctx.fillRect(0, 0, view.w, view.h);
  const cx = view.w / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('NEON SHORES', cx, view.h * 0.3);
  ctx.fillStyle = '#ff5d7a';
  ctx.font = 'bold 25px system-ui, sans-serif';
  ctx.fillText('An open-world crime story in one coastal city', cx, view.h * 0.3 + 44);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '17px system-ui, sans-serif';
  STORY_INTRO.forEach((line, i) => ctx.fillText(line, cx, view.h * 0.44 + i * 25));
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText(saved ? '[ ENTER ]  Continue — Day ' + (saved.day ?? 1) + ', $' + (saved.money ?? 0) : '[ ENTER ]  New game', cx, view.h * 0.62);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('WASD move / drive · F enter & steal cars · Shift sprint · Space handbrake / drift', cx, view.h * 0.7);
  ctx.fillText('Mouse aim · Click punch & shoot · P pause · M mute-free procedural sound, no files', cx, view.h * 0.7 + 24);
  ctx.fillText('Five story jobs, taxi fares, ten golden shells, and the whole Shores PD to outrun.', cx, view.h * 0.7 + 48);
  ctx.textAlign = 'left';
}

function draw() {
  if (game.state === 'menu') { drawMenu(); return; }
  drawWorld(ctx, game, view);
  for (const car of game.cars) drawCar(ctx, car, game.camera);
  for (const cop of game.police) drawCar(ctx, cop, game.camera);
  for (const ped of game.peds) if (ped.down < 9000) drawPed(ctx, ped, game.camera, false);
  const p = game.player;
  if (!p.car) drawPed(ctx, p, game.camera, true);
  if (p.fireAnim > 0 && !p.car) {
    ctx.save();
    ctx.translate((p.x - game.camera.x) * game.camera.zoom, (p.y - game.camera.y) * game.camera.zoom);
    ctx.scale(game.camera.zoom, game.camera.zoom);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.hasGun ? '#ffd23e' : 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(24, 0, p.hasGun ? 6 : 4, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  if (game.muzzle) {
    ctx.save();
    ctx.translate((game.muzzle.x - game.camera.x) * game.camera.zoom, (game.muzzle.y - game.camera.y) * game.camera.zoom);
    ctx.scale(game.camera.zoom, game.camera.zoom);
    ctx.rotate(game.muzzle.angle);
    ctx.strokeStyle = 'rgba(255,210,62,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(game.muzzle.range, 0); ctx.stroke();
    ctx.restore();
  }
  drawHUD(ctx, game, view);
  if (game.state === 'paused') {
    ctx.fillStyle = 'rgba(6,10,24,0.6)';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', view.w / 2, view.h / 2 - 20);
    ctx.font = '17px system-ui';
    ctx.fillText('P resume · Progress saves automatically · Story: ' + game.missions.index + ' of 5 jobs done', view.w / 2, view.h / 2 + 22);
    ctx.textAlign = 'left';
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (input.hit('enter') && game.state === 'menu') { audio.unlock(); game.state = 'playing'; game.refreshObjective(); }
  if (input.hit('p') && game.state === 'playing') game.state = 'paused';
  else if (input.hit('p') && game.state === 'paused') game.state = 'playing';
  if (game.state !== 'paused') update(dt);
  draw();
  input.endFrame();
  if (!game.shotMode) requestAnimationFrame(frame);
}

const shot = params.get('shot');
if (shot) {
  applyShot(game, shot, createRandom(seed + 5));
  // Pose the street life for the still, then render a few frames and hold.
  for (let i = 0; i < 40; i += 1) update(1 / 30);
  game.state = shot === 'start' ? 'menu' : 'playing';
  if (shot === 'start') game.state = 'menu';
  draw();
  window.__shotReady = true;
  setInterval(draw, 500);
} else {
  game.refreshObjective();
  requestAnimationFrame(frame);
}

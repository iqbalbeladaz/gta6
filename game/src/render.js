// Rendering: the sun-soaked city drawn from a smooth chase camera, stylised
// cars and people, daylight that warms toward evening and turns lamps and
// headlights on at dusk, and the full HUD — health and cash, wanted stars,
// the mission banner and objective line, a speedometer and a live minimap
// that tracks the police, the traffic and the current objective.

import { WORLD } from './config.js';
import { PLACES } from './world.js';

export function createCamera() {
  return { x: 0, y: 0, zoom: 1 };
}

export function updateCamera(camera, target, dt, view) {
  const wantZoom = target.car ? 0.82 : 1.0;
  camera.zoom += (wantZoom - camera.zoom) * Math.min(1, dt * 2.4);
  const lead = target.car ? 0.22 : 0.1;
  const tx = target.x + (target.vx || 0) * lead - view.w / 2 / camera.zoom;
  const ty = target.y + (target.vy || 0) * lead - view.h / 2 / camera.zoom;
  const k = Math.min(1, dt * 4.2);
  if (camera.init !== true) { camera.x = tx; camera.y = ty; camera.init = true; }
  camera.x += (tx - camera.x) * k;
  camera.y += (ty - camera.y) * k;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawWorld(ctx, game, view) {
  const { world, camera } = game;
  const t = game.timeOfDay; // 0..1 across the day
  const warm = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
  ctx.fillStyle = '#79c7e8';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  const x0 = camera.x - 60, y0 = camera.y - 60;
  const x1 = camera.x + view.w / camera.zoom + 60, y1 = camera.y + view.h / camera.zoom + 60;

  // Ground base: grass, then sand, then the sea down the east shore.
  ctx.fillStyle = '#57b06a';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = '#f4d98c';
  ctx.fillRect(WORLD.beachX, y0, WORLD.width - WORLD.beachX, y1 - y0);
  ctx.fillStyle = '#2e9fd8';
  ctx.fillRect(WORLD.beachX + 210, y0, WORLD.width - WORLD.beachX, y1 - y0);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let y = 60; y < WORLD.height; y += 130) {
    ctx.fillRect(WORLD.beachX + 196 + Math.sin(y * 0.05 + game.elapsed) * 7, y, 26, 5);
  }
  // The pier, reaching out over the water.
  ctx.fillStyle = '#8a6d4b';
  ctx.fillRect(WORLD.beachX + 40, PLACES.pier.y - 26, 230, 52);
  ctx.fillStyle = '#6e5638';
  for (let x = WORLD.beachX + 52; x < WORLD.beachX + 260; x += 34) ctx.fillRect(x, PLACES.pier.y - 30, 6, 60);

  // Block pavement under the buildings, so blocks read as city, not lawn.
  ctx.fillStyle = '#d9cfae';
  for (let bx = 0; bx < WORLD.beachX - 100; bx += WORLD.block) {
    for (let by = 0; by < WORLD.height; by += WORLD.block) {
      ctx.fillRect(bx + WORLD.road / 2, by + WORLD.road / 2, WORLD.block - WORLD.road, WORLD.block - WORLD.road);
    }
  }
  ctx.fillStyle = '#cabd9c';
  for (let bx = 0; bx < WORLD.beachX - 100; bx += WORLD.block) {
    for (let by = 0; by < WORLD.height; by += WORLD.block) {
      ctx.fillRect(bx + WORLD.road / 2 + 16, by + WORLD.road / 2 + 16, WORLD.block - WORLD.road - 32, WORLD.block - WORLD.road - 32);
    }
  }

  // Roads: asphalt strips with sidewalks and dashed centre lines. The grid
  // stops at the shore — there are no streets in the sea.
  ctx.fillStyle = '#cfc4a5';
  for (let i = 0; i <= Math.floor(WORLD.width / WORLD.block); i += 1) {
    const cx = i * WORLD.block + WORLD.block / 2;
    if (cx < WORLD.beachX + 40) ctx.fillRect(cx - WORLD.road / 2 - 9, 0, WORLD.road + 18, WORLD.height);
    const cy = i * WORLD.block + WORLD.block / 2;
    if (cy < WORLD.height + WORLD.block) ctx.fillRect(0, cy - WORLD.road / 2 - 9, WORLD.beachX + 215, WORLD.road + 18);
  }
  ctx.fillStyle = '#3d4149';
  for (let i = 0; i <= Math.floor(WORLD.width / WORLD.block); i += 1) {
    const cx = i * WORLD.block + WORLD.block / 2;
    if (cx < WORLD.beachX + 40) ctx.fillRect(cx - WORLD.road / 2, 0, WORLD.road, WORLD.height);
    const cy = i * WORLD.block + WORLD.block / 2;
    if (cy < WORLD.height + WORLD.block) ctx.fillRect(0, cy - WORLD.road / 2, WORLD.beachX + 215, WORLD.road);
  }
  ctx.strokeStyle = '#f7d54d';
  ctx.lineWidth = 4;
  ctx.setLineDash([26, 30]);
  for (let i = 0; i <= Math.floor(WORLD.width / WORLD.block); i += 1) {
    const cx = i * WORLD.block + WORLD.block / 2;
    if (cx < WORLD.beachX + 40) { ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, WORLD.height); ctx.stroke(); }
    const cy = i * WORLD.block + WORLD.block / 2;
    if (cy < WORLD.height + WORLD.block) { ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(WORLD.beachX + 215, cy); ctx.stroke(); }
  }
  ctx.setLineDash([]);

  // Buildings: a drop shadow, pastel walls, a roof inset, a grid of windows
  // and the block's name lettered across the roof.
  for (const b of world.buildings) {
    if (b.x + b.w < x0 || b.y + b.h < y0 || b.x > x1 || b.y > y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 9, b.y + 12, b.w, b.h);
    ctx.fillStyle = b.wall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const cols = Math.max(2, Math.floor(b.w / 34));
    const rowsW = Math.max(2, Math.floor(b.h / 30));
    for (let ix = 0; ix < cols; ix += 1) for (let iy = 0; iy < rowsW; iy += 1) {
      if ((ix * 7 + iy * 13 + b.floors) % 3 !== 0) ctx.fillRect(b.x + 13 + ix * 30, b.y + 12 + iy * 27, 13, 9);
    }
    if (b.name) {
      ctx.fillStyle = b.trim;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
  }

  // Place markers: a soft glowing disc and a name over each story location.
  for (const key of Object.keys(PLACES)) {
    const p = PLACES[key];
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.24 + Math.sin(game.elapsed * 3) * 0.06;
    ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, 6.29); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#10222e';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x, p.y - 50);
  }

  // Palm trees: a leaning trunk and a crown of curved fronds.
  for (const tree of world.trees) {
    if (tree.x < x0 || tree.y < y0 || tree.x > x1 || tree.y > y1) continue;
    ctx.strokeStyle = '#7a5a38';
    ctx.lineWidth = 5 * tree.s;
    ctx.beginPath(); ctx.moveTo(tree.x, tree.y); ctx.lineTo(tree.x + 4, tree.y - 13 * tree.s); ctx.stroke();
    ctx.strokeStyle = '#2f9e57';
    ctx.lineWidth = 4 * tree.s;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * 6.28 + 0.4;
      ctx.beginPath();
      ctx.moveTo(tree.x + 4, tree.y - 13 * tree.s);
      ctx.quadraticCurveTo(tree.x + 4 + Math.cos(a) * 15 * tree.s, tree.y - 20 * tree.s, tree.x + 4 + Math.cos(a) * 24 * tree.s, tree.y - 10 * tree.s);
      ctx.stroke();
    }
  }
  // Street lights: a small lamp dot by day, wrapped in a warm glow halo
  // once dusk settles (timeOfDay past 0.62, fading in over the next stretch).
  const lampGlow = duskStrength(game.timeOfDay);
  for (const l of world.lights) {
    if (l.x < x0 || l.y < y0 || l.x > x1 || l.y > y1) continue;
    if (lampGlow > 0) {
      const halo = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, 30);
      halo.addColorStop(0, `rgba(255,214,120,${0.5 * lampGlow})`);
      halo.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(l.x, l.y, 30, 0, 6.29); ctx.fill();
    }
    ctx.fillStyle = '#ffe9a3';
    ctx.beginPath(); ctx.arc(l.x, l.y, 4, 0, 6.29); ctx.fill();
  }

  // Golden shells (the collectibles), bobbing gently.
  for (const s of world.shells) {
    if (s.taken) continue;
    const bob = Math.sin(game.elapsed * 2.4 + s.bob) * 4;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(s.x, s.y + bob, 10, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#c1913c';
    ctx.beginPath(); ctx.arc(s.x, s.y + bob, 5, 0, 6.29); ctx.fill();
  }

  // Objective beacon: a pillar of light standing on the current target.
  const target = game.objectivePos;
  if (target) {
    const pulse = 26 + Math.sin(game.elapsed * 4) * 5;
    const grad = ctx.createLinearGradient(target.x, target.y - 340, target.x, target.y);
    grad.addColorStop(0, 'rgba(255,210,62,0)');
    grad.addColorStop(1, 'rgba(255,210,62,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(target.x - 15, target.y - 340, 30, 340);
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(target.x, target.y, pulse, 0, 6.29); ctx.stroke();
  }
  ctx.restore();

  // A warm evening wash over everything as the day ages.
  if (warm > 0.55) {
    ctx.fillStyle = `rgba(255,122,26,${(warm - 0.55) * 0.22})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

// How far dusk has settled, 0 (full daylight) to 1 (evening): the fade starts
// at timeOfDay 0.62 and completes a short stretch of the day later.
export function duskStrength(timeOfDay) {
  return Math.max(0, Math.min(1, (timeOfDay - 0.62) / 0.13));
}

export function drawCar(ctx, car, camera, dusk = 0) {
  ctx.save();
  ctx.translate((car.x - camera.x) * camera.zoom, (car.y - camera.y) * camera.zoom);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.rotate(car.angle);
  // Headlights after dusk: a soft cone spilling ahead of the front bumper,
  // drawn under the body so the car sits in its own pool of light.
  if (dusk > 0) {
    const beam = ctx.createLinearGradient(24, 0, 118, 0);
    beam.addColorStop(0, `rgba(255,242,190,${0.38 * dusk})`);
    beam.addColorStop(1, 'rgba(255,242,190,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(24, -7);
    ctx.lineTo(118, -32);
    ctx.lineTo(118, 32);
    ctx.lineTo(24, 7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, -24, -11, 52, 26, 8); ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, -26, -13, 52, 26, 8); ctx.fill();
  ctx.fillStyle = 'rgba(15,25,35,0.9)';
  roundRect(ctx, -6, -10, 19, 20, 5); ctx.fill();   // cabin glass
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  roundRect(ctx, 14, -10, 6, 20, 3); ctx.fill();    // windshield shine
  if (dusk > 0) {
    ctx.fillStyle = '#fff6c9';
    ctx.beginPath(); ctx.arc(25, -8, 2.6, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(25, 8, 2.6, 0, 6.29); ctx.fill();
  }
  ctx.fillStyle = '#15181c';
  for (const [wx, wy] of [[-17, -14], [15, -14], [-17, 11], [15, 11]]) {
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(car.steerVis ? car.steerVis * 0.4 : 0); ctx.fillRect(-5, -2.5, 10, 5); ctx.restore();
  }
  if (car.taxi) { ctx.fillStyle = '#10222e'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 2, 3); }
  if (car.police) {
    ctx.fillStyle = '#1c4d8f';
    roundRect(ctx, -14, -13, 27, 26, 6); ctx.fill();
    ctx.fillStyle = '#10222e'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PD', 0, 3);
    const phase = Math.sin(car.sirenPhase) > 0;
    ctx.fillStyle = phase ? '#ff3b30' : '#3fa9f5';
    ctx.beginPath(); ctx.arc(-2, 0, 5.5, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(-2, 0, 2.2, 0, 6.29); ctx.fill();
  }
  if (car.smoking) {
    ctx.fillStyle = 'rgba(60,60,60,0.5)';
    ctx.beginPath(); ctx.arc(24, 0, 9 + Math.sin(car.x) * 2, 0, 6.29); ctx.fill();
  }
  ctx.restore();
}

export function drawPed(ctx, ped, camera, isPlayer) {
  ctx.save();
  ctx.translate((ped.x - camera.x) * camera.zoom, (ped.y - camera.y) * camera.zoom);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 3, 11, 6, 0, 0, 6.29); ctx.fill();
  ctx.rotate(ped.angle);
  ctx.fillStyle = isPlayer ? '#10222e' : ped.shirt;
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, 6.29); ctx.fill();
  ctx.fillStyle = isPlayer ? '#ffd23e' : ped.skin;
  ctx.beginPath(); ctx.arc(3.5, 0, 5.4, 0, 6.29); ctx.fill();
  if (isPlayer) {
    ctx.fillStyle = '#ff5d7a';
    ctx.fillRect(-9, -10, 7, 20);
  }
  ctx.restore();
  if (ped.panic > 0) {
    ctx.save();
    ctx.translate((ped.x - camera.x) * camera.zoom, (ped.y - 22) * camera.zoom);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, 0);
    ctx.restore();
  }
}

function star(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i / 10) * 6.283 - Math.PI / 2;
    const px = x + Math.cos(a) * rad; const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) { ctx.fillStyle = '#ffd23e'; ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,210,62,0.75)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

export function drawMinimap(ctx, game, x, y, size) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,18,28,0.82)';
  roundRect(ctx, x, y, size, size * 0.78, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.rect(x + 4, y + 4, size - 8, size * 0.78 - 8); ctx.clip();
  const sx = (size - 8) / WORLD.width;
  const sy = (size * 0.78 - 8) / WORLD.height;
  ctx.fillStyle = '#2e9fd8';
  ctx.fillRect(x + 4 + WORLD.beachX * sx, y + 4, (WORLD.width - WORLD.beachX) * sx, size);
  ctx.fillStyle = '#57b06a';
  ctx.fillRect(x + 4, y + 4, WORLD.beachX * sx, size * 0.78 - 8);
  ctx.strokeStyle = 'rgba(30,34,40,0.85)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i += 1) {
    ctx.beginPath(); ctx.moveTo(x + 4 + i * WORLD.block * sx, y + 4); ctx.lineTo(x + 4 + i * WORLD.block * sx, y + size * 0.78 - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4, y + 4 + i * WORLD.block * sy); ctx.lineTo(x + size - 4, y + 4 + i * WORLD.block * sy); ctx.stroke();
  }
  const dot = (wx, wy, color, r) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + 4 + wx * sx, y + 4 + wy * sy, r, 0, 6.29); ctx.fill(); };
  if (game.objectivePos) dot(game.objectivePos.x, game.objectivePos.y, '#ffd23e', 5);
  for (const c of game.police) dot(c.x, c.y, '#3fa9f5', 3);
  for (const c of game.cars) if (c === game.player.car) continue; else dot(c.x, c.y, 'rgba(255,255,255,0.5)', 2);
  const p = game.player;
  ctx.save();
  ctx.translate(x + 4 + p.x * sx, y + 4 + p.y * sy);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ff5d7a';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.4); ctx.lineTo(-5, 4.4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 11px system-ui';
  ctx.fillText('NEON SHORES', x + 10, y + size * 0.78 - 8);
}

export function drawHUD(ctx, game, view) {
  const p = game.player;
  // Top-left: portrait chip, health and armor bars, and the cash readout.
  ctx.fillStyle = 'rgba(8,18,28,0.78)';
  roundRect(ctx, 16, 16, 252, 86, 12); ctx.fill();
  ctx.fillStyle = '#ff5d7a';
  ctx.beginPath(); ctx.arc(48, 59, 24, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#10222e';
  ctx.font = 'bold 21px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('DV', 48, 67);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffb3c0'; ctx.font = 'bold 13px system-ui';
  ctx.fillText('DARIO VENN', 82, 40);
  ctx.fillStyle = '#3a1512'; roundRect(ctx, 82, 48, 168, 11, 5); ctx.fill();
  ctx.fillStyle = '#ff4757'; roundRect(ctx, 82, 48, 168 * Math.max(0, p.health) / 100, 11, 5); ctx.fill();
  ctx.fillStyle = '#12303f'; roundRect(ctx, 82, 64, 168, 8, 4); ctx.fill();
  ctx.fillStyle = '#3fa9f5'; roundRect(ctx, 82, 64, 168 * Math.max(0, p.armor) / 100, 8, 4); ctx.fill();
  ctx.fillStyle = '#7dff9a'; ctx.font = 'bold 17px system-ui';
  ctx.fillText('$' + Math.floor(p.money).toLocaleString('en-US'), 82, 94);

  // Top-right: the wanted stars and the day clock.
  ctx.fillStyle = 'rgba(8,18,28,0.78)';
  roundRect(ctx, view.w - 236, 16, 220, 62, 12); ctx.fill();
  for (let i = 0; i < 5; i += 1) star(ctx, view.w - 196 + i * 38, 42, 14, i < game.wanted);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
  const hour = 8 + Math.floor(game.timeOfDay * 14);
  ctx.fillText('DAY ' + game.day + '  ·  ' + String(hour).padStart(2, '0') + ':00', view.w - 126, 68);
  ctx.textAlign = 'left';

  if (game.bustMeter > 0.02 && !p.car) {
    ctx.fillStyle = 'rgba(8,18,28,0.8)';
    roundRect(ctx, view.w / 2 - 130, 96, 260, 30, 9); ctx.fill();
    ctx.fillStyle = '#3fa9f5';
    roundRect(ctx, view.w / 2 - 122, 104, 244 * game.bustMeter, 14, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('BUSTED METER — RUN OR DRIVE!', view.w / 2, 88);
    ctx.textAlign = 'left';
  }

  // Mission banner, top centre, while news is fresh.
  if (game.banner) {
    const b = game.banner;
    ctx.globalAlpha = Math.min(1, b.ttl);
    ctx.fillStyle = 'rgba(8,18,28,0.85)';
    roundRect(ctx, view.w / 2 - 330, 22, 660, 66, 12); ctx.fill();
    ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(b.title, view.w / 2, 48);
    ctx.fillStyle = '#fff'; ctx.font = '15px system-ui';
    ctx.fillText(b.text, view.w / 2, 72);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  // Objective line, bottom centre, with distance and any running timer.
  if (game.objectiveText) {
    ctx.fillStyle = 'rgba(8,18,28,0.8)';
    roundRect(ctx, view.w / 2 - 300, view.h - 118, 600, 40, 10); ctx.fill();
    ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    let line = '◆ ' + game.objectiveText;
    if (game.objectivePos) line += '  ·  ' + Math.round(Math.hypot(game.objectivePos.x - p.x, game.objectivePos.y - p.y)) + 'm';
    if (game.missions.stageTimer > 0) line += '  ·  ' + Math.ceil(game.missions.stageTimer) + 's';
    ctx.fillText(line, view.w / 2, view.h - 92);
    ctx.textAlign = 'left';
  }

  drawMinimap(ctx, game, 16, view.h - 196, 218);

  // Bottom-right: speed and the weapon in hand.
  ctx.fillStyle = 'rgba(8,18,28,0.78)';
  roundRect(ctx, view.w - 218, view.h - 108, 202, 92, 12); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center';
  const kmh = p.car ? Math.round(Math.abs(p.car.speed) * 0.62) : 0;
  ctx.fillText(p.car ? kmh + '' : '—', view.w - 152, view.h - 66);
  ctx.font = '11px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(p.car ? 'KM/H · ' + p.car.name : 'ON FOOT', view.w - 152, view.h - 46);
  ctx.fillText(p.hasGun ? 'PISTOL · ' + p.ammo + ' RDS' : 'FISTS', view.w - 152, view.h - 28);
  ctx.textAlign = 'left';

  // Context prompt ("press F…") and the centre toast line.
  if (game.prompt) {
    ctx.fillStyle = 'rgba(8,18,28,0.85)';
    roundRect(ctx, view.w / 2 - 170, view.h - 168, 340, 34, 9); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(game.prompt, view.w / 2, view.h - 146);
    ctx.textAlign = 'left';
  }
  if (game.toast) {
    ctx.globalAlpha = Math.min(1, game.toast.ttl);
    ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 19px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(game.toast.text, view.w / 2, view.h - 190);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  // Collectibles counter, just above the minimap.
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 13px system-ui';
  ctx.fillText('◉ Neon Shells ' + game.shellsFound + ' / ' + game.world.shells.length, 16, view.h - 206);
}

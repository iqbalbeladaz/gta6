// The player: Dario Venn on foot and behind the wheel — movement, driving
// physics, entering and stealing cars, fists and the pistol, health and cash.

import { CAR, PLAYER, WORLD } from './config.js';
import { collide } from './world.js';

export function createPlayer(saved) {
  return {
    x: 560, y: 700, vx: 0, vy: 0, angle: -Math.PI / 2,
    health: saved?.health ?? 100,
    armor: 0,
    money: saved?.money ?? 120,
    car: null,               // the car being driven, or null on foot
    hasGun: saved?.hasGun ?? false,
    ammo: saved?.ammo ?? 0,
    punchCooldown: 0,
    shootCooldown: 0,
    fireAnim: 0,
    dead: false,
  };
}

// On-foot movement with a sprint, plus building collision.
export function updateOnFoot(world, player, input, dt) {
  const axis = input.axis();
  const sprint = input.down('shift');
  const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(axis.x, axis.y) || 1;
  const moving = axis.x !== 0 || axis.y !== 0;
  player.vx = moving ? (axis.x / len) * speed : 0;
  player.vy = moving ? (axis.y / len) * speed : 0;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  if (moving) player.angle = Math.atan2(axis.y, axis.x);
  player.moving = moving;
  collide(world, player, PLAYER.radius);
}

// Driving: arcade physics — throttle, brake/reverse, steering that scales
// with speed, handbrake drift, and damage when the world pushes back.
export function updateDriving(world, player, input, dt) {
  const car = player.car;
  if (!car) return 0;
  const model = car.model;
  const up = input.down('w', 'arrowup');
  const downKey = input.down('s', 'arrowdown');
  const left = input.down('a', 'arrowleft');
  const right = input.down('d', 'arrowright');
  const handbrake = input.down(' ');

  if (up) car.speed += CAR.accel * model.accel * dt * (handbrake ? 0.4 : 1);
  if (downKey) {
    if (car.speed > 24) car.speed -= CAR.brake * dt;
    else car.speed = Math.max(-CAR.reverseMax, car.speed - CAR.accel * 0.7 * dt);
  }
  const dragBase = handbrake ? 0.35 : CAR.drag;
  car.speed -= car.speed * dragBase * dt;
  if (!up && !downKey) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 26 * dt);
  car.speed = Math.max(-CAR.reverseMax, Math.min(model.topSpeed, car.speed));

  const steerInput = (right ? 1 : 0) - (left ? 1 : 0);
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 120) * (handbrake ? 1.5 : 1);
  car.angle += steerInput * steerAuthority * CAR.grip * 0.32 * dt * Math.sign(car.speed || 1);
  car.steerVis = steerInput;

  const beforeX = car.x; const beforeY = car.y;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.hitWall = false;
  collide(world, car, CAR.radius);
  let crash = 0;
  if (car.hitWall) {
    const impact = Math.abs(car.speed);
    if (impact > 90) {
      crash = Math.min(1, impact / 320);
      car.health -= impact * 0.055;
      player.health -= impact * 0.012;
    }
    car.speed *= -0.22;
    car.x = beforeX + Math.cos(car.angle) * car.speed * dt;
    car.y = beforeY + Math.sin(car.angle) * car.speed * dt;
  }
  player.x = car.x; player.y = car.y;
  player.vx = Math.cos(car.angle) * car.speed;
  player.vy = Math.sin(car.angle) * car.speed;
  player.angle = car.angle;
  if (car.health <= 0) { car.health = 0; car.speed = 0; car.smoking = true; }
  return crash;
}

export function enterCar(player, car, audio) {
  player.car = car;
  car.driver = true;
  car.parked = false;
  player.x = car.x; player.y = car.y;
  audio.door();
}

export function exitCar(player, audio) {
  const car = player.car;
  if (!car) return;
  car.speed = 0;
  player.x = car.x + Math.cos(car.angle - Math.PI / 2) * 34;
  player.y = car.y + Math.sin(car.angle - Math.PI / 2) * 34;
  player.x = Math.max(16, Math.min(WORLD.width - 16, player.x));
  player.y = Math.max(16, Math.min(WORLD.height - 16, player.y));
  player.car = null;
  audio.door();
}

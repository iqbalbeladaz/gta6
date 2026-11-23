# gta6

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/iqbalbeladaz/gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/iqbalbeladaz/gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Shores** — an original open-world crime game that runs entirely in the browser, no build step and no network. Explore a sun-soaked coastal city on foot and by car: steal and drive six car models in live traffic, run Rosa Marlin's five story jobs for the Marlin Syndicate, work taxi fares, hunt ten golden Neon Shells, fight with fists and a pistol, and manage a five-star wanted level while the Shores PD hunts you down. Full HUD with a live minimap, health and cash, a day cycle that warms into golden hour, procedural WebAudio sound (engine, sirens, gunfire — no audio files), busted/wasted respawns, and automatic progress saving in the browser.

Play it with keyboard and mouse: WASD to move and drive, F to enter or steal a car, Shift to sprint, Space for the handbrake, mouse to aim, click to punch or shoot, P to pause.

The game is plain static files under `game/` (ES modules split by job: world, entities, missions, player, render, audio, input, shots), handed in by `main.ts`, which copies `game/` and `screenshots/` to the output and writes the dossier with the vendored make.fun library.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in desktop Chrome
# to bundle the entry instead: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

Entered on [make.fun](https://make.fun/?ref=y51jyd2c&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards

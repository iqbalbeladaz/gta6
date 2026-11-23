// Keyboard and mouse input: a held-key set for movement, an edge-triggered
// press set for one-shot actions, and the mouse position in screen space for
// aiming and for the menu. Presses are cleared once per frame by endFrame().

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!held.has(key)) pressed.add(key);
    held.add(key);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  });
  addEventListener('keyup', (event) => held.delete(event.key.toLowerCase()));
  addEventListener('blur', () => { held.clear(); mouse.down = false; });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) { mouse.down = true; mouse.clicked = true; }
  });
  addEventListener('mouseup', (event) => {
    if (event.button === 0) mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    mouse,
    down: (...keys) => keys.some((key) => held.has(key)),
    hit: (...keys) => keys.some((key) => pressed.has(key)),
    axis() {
      const x = (held.has('d') || held.has('arrowright') ? 1 : 0) - (held.has('a') || held.has('arrowleft') ? 1 : 0);
      const y = (held.has('s') || held.has('arrowdown') ? 1 : 0) - (held.has('w') || held.has('arrowup') ? 1 : 0);
      return { x, y };
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}

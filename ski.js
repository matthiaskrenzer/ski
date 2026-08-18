// ASCII SKI — C64-style (for Udo May-Jung) — v2
(() => {
  const screen = document.getElementById('screen');

  // Grid
  const COLS = 41;
  const ROWS = 24;
  let buffer = [];

  // Player
  const SKIER = '@';         // Spielerzeichen
  const START_X = Math.floor(COLS/2);
  const START_Y = ROWS - 3;  // bisher fix, jetzt variabel
  let px = START_X;
  let py = START_Y;          // Vorwärts/Rückwärts = Y ändern

  // Obstacles
  const EMPTY = ' ';
  const SNOW  = '.';
  const TREE1 = 'Y';
  const TREE2 = 'A';
  const ROCK  = 'o';
  const POLE  = '|';

  // Game state
  let running = false, paused = false, crashed = false;
  let score = 0, gates = 0, speedLevel = 1;
  const BASE_FPS = 6;                  // langsamer Start
  let tickInterval = 1000/BASE_FPS;
  let acc = 0, last = 0;

  // Gate generation
  let nextGateIn = randInt(6, 12);
  const GATE_MIN = 6, GATE_MAX = 10;

  // UI
  const elScore = document.getElementById('score');
  const elGates = document.getElementById('gates');
  const elSpeed = document.getElementById('speed');
  const overlay = document.getElementById('overlay');

  function reset(){
    buffer = Array.from({length:ROWS}, ()=> EMPTY.repeat(COLS));
    px = START_X;
    py = START_Y;
    score = 0; gates = 0; speedLevel = 1;
    tickInterval = 1000/BASE_FPS;
    running = false; paused=false; crashed=false;
    setOverlay('PRESS ENTER', true);
    render();
    updateHUD();
  }

  function updateHUD(){
    elScore.textContent = `SCORE: ${score}`;
    elGates.textContent = `GATES: ${gates}`;
    elSpeed.textContent = `SPEED: ${speedLevel}`;
  }

  function setOverlay(title, show){
    if (title) overlay.querySelector('.title').textContent = title;
    overlay.classList.toggle('is-wipeout', Boolean(show && title && /WIPEOUT/i.test(title)));
    overlay.style.display = show ? 'grid' : 'none';
  }

  function randInt(a,b){ return (a + Math.floor(Math.random()*(b-a+1))); }

  function generateRow(){
    // Base snow
    let row = Array.from({length:COLS}, () => (Math.random() < 0.06 ? SNOW : EMPTY));

    // Occasionally trees/rocks
    for (let i=0;i<randInt(0,1);i++){
      const x = randInt(1, COLS-2);
      const ch = Math.random() < 0.55 ? (Math.random()<0.5?TREE1:TREE2) : ROCK;
      row[x] = ch;
    }

    // Gate?
    if (--nextGateIn <= 0){
      const width = randInt(GATE_MIN, GATE_MAX);
      const left = randInt(1, COLS - width - 2);
      const right = left + width;
      row[left] = POLE; row[right] = POLE;
      for (let x=left+1; x<right; x++){
        if (row[x] === EMPTY && Math.random()<0.16) row[x] = SNOW;
      }
      nextGateIn = randInt(7, 14);
      row.__gate = {left, right};
    }
    return row.join('');
  }

  function collide(ch){
    return (ch===TREE1 || ch===TREE2 || ch===ROCK || ch===POLE);
  }

  function step(){
    // Scroll: add new row on top, drop last
    const newRow = generateRow();
    buffer.pop();
    buffer.unshift(newRow);

    // Check collision at player position (row y=py)
    const row = buffer[py];
    const ch = row[px];
    if (collide(ch)){
      crashed = true; running=false; paused=false;
      setOverlay('WIPEOUT — ENTER', true);
      render(true);
      return;
    }

    // Passed a gate?
    const l = row.indexOf(POLE);
    const r = l>=0 ? row.indexOf(POLE, l+1) : -1;
    if (l>=0 && r>l){
      if (px > l && px < r){
        score += 2; gates += 1;
      }
    }else{
      score += 1;
    }

    // Speed up gentler every 10 points
    if (score > 0 && score % 10 === 0){
      speedLevel += 1;
      tickInterval = Math.max(90, Math.floor(tickInterval * 0.95));
    }

    updateHUD();
  }

  function render(showCrash=false){
    const lines = buffer.map((line, y) => {
      if (y === py){
        return line.slice(0, px) + (showCrash? 'X' : SKIER) + line.slice(px+1);
      }
      return line;
    });
    screen.textContent = lines.join('\n').replace(/\\s+$/gm, '');
  }

  function loop(ts){
    const dt = ts - last; last = ts;
    if (running && !paused){
      acc += dt;
      while (acc >= tickInterval){
        step();
        acc -= tickInterval;
      }
      render();
    }
    requestAnimationFrame(loop);
  }

  // Input
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter'){
      if (!running){
        running = true; crashed=false; setOverlay('', false);
      }
      e.preventDefault(); return;
    }
    if (e.key === 'p' || e.key === 'P'){
      if (running){ paused = !paused; setOverlay(paused?'PAUSE — ENTER':'' , paused); }
      e.preventDefault(); return;
    }
    if (e.key === 'r' || e.key === 'R'){
      reset(); e.preventDefault(); return;
    }
    if (!running || paused) return;

    if (e.key === 'ArrowLeft' || e.key==='a' || e.key==='A'){
      px = Math.max(0, px - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key==='d' || e.key==='D'){
      px = Math.min(COLS-1, px + 1);
      e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key==='w' || e.key==='W'){      // rückwärts (weiter oben = mehr Reaktionszeit)
      py = Math.max(2, py - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key==='s' || e.key==='S'){    // vorwärts (weiter unten = weniger Reaktionszeit)
      py = Math.min(ROWS-2, py + 1);
      e.preventDefault();
    }
  });

  function nudge(dx, dy){
    if (!running || paused) return;
    if (dx) px = Math.max(0, Math.min(COLS - 1, px + dx));
    if (dy) py = Math.max(2, Math.min(ROWS - 2, py + dy));
  }

  const dpad = document.querySelector('.dpad');
  if (dpad) {
    dpad.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dir]');
      if (!btn) return;
      const d = btn.getAttribute('data-dir');
      if (d === 'left') nudge(-1, 0);
      if (d === 'right') nudge(1, 0);
      if (d === 'up') nudge(0, -1);
      if (d === 'down') nudge(0, 1);
    });
  }

  let sx = 0, sy = 0;
  screen.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
  }, { passive: true });
  screen.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -8) nudge(-1, 0); else if (dx > 8) nudge(1, 0);
    } else {
      if (dy < -8) nudge(0, -1); else if (dy > 8) nudge(0, 1);
    }
  }, { passive: true });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
    });
  }
  const installBtn = document.getElementById('installBtn');
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.hidden = true;
    });
  }
  window.addEventListener('appinstalled', () => { if (installBtn) installBtn.hidden = true; });

  // Init
  reset();
  requestAnimationFrame(loop);
})();

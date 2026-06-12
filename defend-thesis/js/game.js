/* ===== 保卫论文 Defend Your Thesis — 主游戏逻辑 ===== */
(() => {
  'use strict';

  const W = 960, H = 600;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const t = I18N.t;

  // ---------- 数值设定 ----------
  const CHARACTERS = {
    phd:     { emoji: '🧑‍🎓', speed: 230, fireRate: 6,   damage: 14, bulletSpeed: 520, maxHp: 100 },
    wizard:  { emoji: '🧙',   speed: 205, fireRate: 11,  damage: 8,  bulletSpeed: 560, maxHp: 90 },
    postdoc: { emoji: '🧑‍🔬', speed: 300, fireRate: 3.5, damage: 26, bulletSpeed: 480, maxHp: 110 },
  };

  const ENEMY_TYPES = {
    bug:      { hp: 18,  speed: 95, r: 13, dmg: 6,  score: 10,  emoji: '🐛' },
    deadline: { hp: 60,  speed: 36, r: 17, dmg: 16, score: 25,  emoji: '⏰' },
    reviewer: { hp: 45,  speed: 60, r: 16, dmg: 8,  score: 40,  emoji: '🤓', range: 240, fireCd: 2.4 },
    splitter: { hp: 52,  speed: 52, r: 18, dmg: 12, score: 30,  emoji: '📋' },
    boss:     { hp: 350, speed: 26, r: 34, dmg: 40, score: 300, emoji: '🧐', fireCd: 2.0, spawnCd: 7 },
  };

  const PICKUP_TABLE = [
    { type: 'coffee', emoji: '☕', w: 28 },
    { type: 'cite',   emoji: '📚', w: 24 },
    { type: 'tape',   emoji: '🩹', w: 22 },
    { type: 'spread', emoji: '🔥', w: 14 },
    { type: 'idea',   emoji: '💡', w: 12 },
  ];

  // 波次间可选强化（每波结束三选一）
  const UPGRADES = [
    { id: 'dmg',       emoji: '🔪', apply: () => { G.up.dmgMul *= 1.30; } },
    { id: 'rate',      emoji: '⚡', apply: () => { G.up.rateMul *= 1.25; } },
    { id: 'speed',     emoji: '👟', apply: () => { G.up.speedMul *= 1.15; } },
    { id: 'multishot', emoji: '🎯', apply: () => { G.up.projectiles += 1; } },
    { id: 'pierce',    emoji: '💥', apply: () => { G.up.pierce += 1; } },
    { id: 'thesis',    emoji: '📚', apply: () => { G.thesis.max += 25; G.thesis.hp = Math.min(G.thesis.max, G.thesis.hp + 25); } },
    { id: 'hp',        emoji: '🛡️', apply: () => { G.player.maxHp += 25; G.player.hp += 25; } },
    { id: 'repair',    emoji: '🩹', apply: () => { G.thesis.hp = G.thesis.max; } },
  ];
  const UPG_EMOJI = Object.fromEntries(UPGRADES.map(u => [u.id, u.emoji]));

  const MILESTONES = [500, 1500, 3000, 6000];

  // ---------- 游戏状态 ----------
  const G = {
    state: 'menu',           // menu | playing | upgrade | paused | gameover
    charId: null, char: null,
    player: null,
    thesis: null,
    enemies: [], bullets: [], enemyBullets: [], pickups: [], particles: [], texts: [],
    wave: 0, spawnQueue: [], spawnTimer: 0, spawnInterval: 1.5,
    waveActive: false, intermission: 0,
    score: 0, best: +(localStorage.getItem('dyt_best') || 0),
    time: 0, kills: 0, bossCount: 0,
    buffs: { coffee: 0, cite: 0, spread: 0 },
    up: { dmgMul: 1, rateMul: 1, speedMul: 1, projectiles: 1, pierce: 0 },
    upgradesTaken: [],
    combo: 0, comboTimer: 0, bestCombo: 0,
    banner: null,            // { text, t }
    shake: 0, flash: 0, muzzle: 0,
    milestonesHit: new Set(),
    stars: [], floaters: [],
    clock: 0,
  };

  // ---------- 输入 ----------
  const keys = {};
  const mouse = { x: W / 2, y: H / 2, down: false };

  function canvasPos(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (H / r.height) };
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;   // 聊天输入时不响应游戏按键
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === 'p' || k === 'escape') togglePause();
    if (k === 'm') doToggleMute();
  });
  document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  canvas.addEventListener('mousemove', (e) => { const p = canvasPos(e); mouse.x = p.x; mouse.y = p.y; });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mouse.down = true; SFX.init(); } });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => { if (G.state === 'playing') pauseGame(); });

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const overlays = {
    menu: $('overlay-menu'), pause: $('overlay-pause'),
    upgrade: $('overlay-upgrade'), gameover: $('overlay-gameover'),
  };
  const hud = $('hud');

  function showOnly(name) {
    for (const k in overlays) overlays[k].classList.toggle('hidden', k !== name);
    hud.classList.toggle('hidden', !(name === null));
  }

  // ---------- 工具 ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function edgeSpawn() {
    const side = Math.floor(Math.random() * 4), m = 40;
    if (side === 0) return { x: Math.random() * W, y: -m };
    if (side === 1) return { x: W + m, y: Math.random() * H };
    if (side === 2) return { x: Math.random() * W, y: H + m };
    return { x: -m, y: Math.random() * H };
  }

  function banner(text) { G.banner = { text, t: 2.2 }; }
  function addText(x, y, text, color = '#fff') { G.texts.push({ x, y, text, color, life: 1.1 }); }
  function burst(x, y, color, n = 10, spd = 160) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(spd * 0.3, spd);
      G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.6), maxLife: 0.6, color, size: rand(2, 5) });
    }
  }
  function comboMult() { return 1 + Math.min(Math.floor(G.combo / 8), 6) * 0.5; }   // x1 → x4

  function addScore(n) {
    G.score = Math.max(0, G.score + n);
    if (G.score > G.best) { G.best = G.score; localStorage.setItem('dyt_best', G.best); }
    for (const m of MILESTONES) {
      if (G.score >= m && !G.milestonesHit.has(m)) {
        G.milestonesHit.add(m);
        Advisor.event('milestone', { score: m });
      }
    }
  }

  // ---------- 背景星空（菜单也会动） ----------
  function initBackground() {
    G.stars = [];
    for (let i = 0; i < 80; i++) G.stars.push({ x: Math.random() * W, y: Math.random() * H, r: rand(0.5, 2), s: rand(6, 24), tw: Math.random() * 6.28 });
    G.floaters = [];
    const set = ['📄', '✏️', '📑', '📐'];
    for (let i = 0; i < 9; i++) G.floaters.push({
      x: Math.random() * W, y: Math.random() * H, vy: rand(8, 20), vx: rand(-6, 6),
      emoji: set[Math.floor(Math.random() * set.length)], rot: Math.random() * 6.28, vr: rand(-0.5, 0.5),
      size: rand(14, 24), alpha: rand(0.04, 0.1),
    });
  }
  function updateBackground(dt) {
    for (const s of G.stars) { s.y -= s.s * dt; if (s.y < -2) { s.y = H + 2; s.x = Math.random() * W; } }
    for (const f of G.floaters) {
      f.y -= f.vy * dt; f.x += f.vx * dt; f.rot += f.vr * dt;
      if (f.y < -30) { f.y = H + 30; f.x = Math.random() * W; }
      if (f.x < -30) f.x = W + 30; else if (f.x > W + 30) f.x = -30;
    }
  }

  // ---------- 游戏流程 ----------
  function startGame(charId) {
    G.charId = charId;
    G.char = CHARACTERS[charId];
    G.player = {
      x: W / 2, y: H / 2 + 110, r: 16,
      hp: G.char.maxHp, maxHp: G.char.maxHp,
      fireCd: 0, inv: 0, lastHurt: -99, dead: false, respawn: 0,
    };
    G.thesis = { x: W / 2, y: H / 2 - 20, r: 38, hp: 100, max: 100 };
    G.enemies = []; G.bullets = []; G.enemyBullets = []; G.pickups = []; G.particles = []; G.texts = [];
    G.wave = 0; G.spawnQueue = []; G.waveActive = false; G.intermission = 2;
    G.score = 0; G.time = 0; G.kills = 0; G.bossCount = 0;
    G.buffs = { coffee: 0, cite: 0, spread: 0 };
    G.up = { dmgMul: 1, rateMul: 1, speedMul: 1, projectiles: 1, pierce: 0 };
    G.upgradesTaken = [];
    G.combo = 0; G.comboTimer = 0; G.bestCombo = 0;
    G.banner = null; G.shake = 0; G.flash = 0; G.muzzle = 0;
    G.milestonesHit = new Set();
    G.state = 'playing';
    $('hud-player-ico').textContent = G.char.emoji;
    showOnly(null);
    Advisor.event('start', { charId });
  }

  function toMenu() {
    G.state = 'menu';
    showOnly('menu');
    $('menu-best').textContent = G.best;
  }

  function pauseGame() {
    if (G.state !== 'playing') return;
    G.state = 'paused';
    overlays.pause.classList.remove('hidden');
  }
  function resumeGame() {
    if (G.state !== 'paused') return;
    G.state = 'playing';
    overlays.pause.classList.add('hidden');
  }
  function togglePause() {
    if (G.state === 'playing') pauseGame();
    else if (G.state === 'paused') resumeGame();
  }

  function gameOver() {
    G.state = 'gameover';
    SFX.gameover();
    const s = G.score;
    const degIdx = s < 600 ? 0 : s < 1500 ? 1 : s < 3000 ? 2 : s < 6000 ? 3 : 4;
    const degree = t('deg_' + degIdx);
    $('go-title').textContent = t('go_title');
    $('go-degree').textContent = t('go_degree', { deg: degree });
    $('go-stats').textContent = t('go_stats', { score: s, wave: G.wave, best: G.best }) + ' · ' + t('go_bestcombo', { n: G.bestCombo });
    const build = G.upgradesTaken.map(id => UPG_EMOJI[id]).join(' ');
    $('go-upgrades').textContent = build ? t('go_build') + build : '';
    $('go-roast').textContent = degIdx <= 1 ? t('roast_low') : degIdx <= 2 ? t('roast_mid') : t('roast_high');
    showOnly('gameover');
    Advisor.event('gameover', { score: s, wave: G.wave, degree });
  }

  // ---------- 强化选择 ----------
  function offerUpgrade() {
    const pool = UPGRADES.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const choices = pool.slice(0, 3);
    const wrap = $('upgrade-cards');
    wrap.innerHTML = '';
    for (const u of choices) {
      const card = document.createElement('div');
      card.className = 'upg-card';
      card.innerHTML = `<div class="upg-emoji">${u.emoji}</div><div class="upg-name"></div><div class="upg-desc"></div>`;
      card.querySelector('.upg-name').textContent = t('up_' + u.id + '_n');
      card.querySelector('.upg-desc').textContent = t('up_' + u.id + '_d');
      card.addEventListener('click', () => {
        if (G.state !== 'upgrade') return;
        SFX.pickup(); SFX.click();
        u.apply();
        G.upgradesTaken.push(u.id);
        overlays.upgrade.classList.add('hidden');
        G.state = 'playing';
        G.intermission = 1.4;
      }, { once: true });
      wrap.appendChild(card);
    }
    G.state = 'upgrade';
    overlays.upgrade.classList.remove('hidden');
    Advisor.event('upgrade');
  }

  // ---------- 波次 ----------
  function buildWave(n) {
    const q = [];
    let bugs = 4 + 2 * n;
    let deadlines = n >= 2 ? 1 + Math.floor(0.8 * (n - 2)) : 0;
    let reviewers = n >= 3 ? 1 + Math.floor(0.6 * (n - 3)) : 0;
    let splitters = n >= 4 ? 1 + Math.floor((n - 4) / 2) : 0;
    const hasBoss = n % 5 === 0;
    if (hasBoss) {
      bugs = Math.ceil(bugs / 2); deadlines = Math.ceil(deadlines / 2);
      reviewers = Math.ceil(reviewers / 2); splitters = Math.ceil(splitters / 2);
    }
    for (let i = 0; i < bugs; i++) q.push('bug');
    for (let i = 0; i < deadlines; i++) q.push('deadline');
    for (let i = 0; i < reviewers; i++) q.push('reviewer');
    for (let i = 0; i < splitters; i++) q.push('splitter');
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    if (hasBoss) q.unshift('boss');
    return q;
  }

  function spawnEnemy(type, x, y) {
    const d = ENEMY_TYPES[type];
    const pos = (x !== undefined) ? { x, y } : edgeSpawn();
    const e = {
      type, x: pos.x, y: pos.y, r: d.r,
      hp: d.hp, maxHp: d.hp, speed: d.speed * rand(0.85, 1.15),
      dmg: d.dmg, score: d.score, emoji: d.emoji,
      seed: Math.random() * 100,
      fireCd: (d.fireCd || 0) * rand(0.5, 1),
      spawnCd: d.spawnCd || 0,
      dead: false, noScore: false,
    };
    if (type === 'boss') {
      e.hp = e.maxHp = 350 + 170 * G.bossCount;
      e.speed = d.speed;
      G.bossCount++;
      banner(t('boss_banner'));
      SFX.boss();
      Advisor.event('boss');
    }
    G.enemies.push(e);
  }

  function updateWaveFlow(dt) {
    if (!G.waveActive) {
      G.intermission -= dt;
      if (G.intermission <= 0) {
        G.wave++;
        G.spawnQueue = buildWave(G.wave);
        G.spawnInterval = Math.max(0.45, 1.5 - 0.06 * G.wave);
        G.spawnTimer = 0;
        G.waveActive = true;
        banner(t('wave_banner', { n: G.wave }));
        SFX.wave();
        Advisor.event('wave', { n: G.wave });
      }
    } else if (G.spawnQueue.length > 0) {
      G.spawnTimer -= dt;
      if (G.spawnTimer <= 0) {
        spawnEnemy(G.spawnQueue.shift());
        G.spawnTimer = G.spawnInterval;
      }
    } else if (G.enemies.length === 0) {
      const bonus = 50 + 10 * G.wave;
      addScore(bonus);
      G.thesis.hp = Math.min(G.thesis.max, G.thesis.hp + 5);
      banner(t('wave_clear', { n: bonus }));
      Advisor.event('waveclear', { n: G.wave });
      G.waveActive = false;
      offerUpgrade();
    }
  }

  // ---------- 战斗 ----------
  function shoot() {
    const p = G.player;
    const rate = G.char.fireRate * G.up.rateMul * (G.buffs.coffee > 0 ? 1.4 : 1);
    p.fireCd = 1 / rate;
    const baseA = Math.atan2(mouse.y - p.y, mouse.x - p.x);
    const dmg = G.char.damage * G.up.dmgMul * (G.buffs.cite > 0 ? 2 : 1);
    const n = G.up.projectiles + (G.buffs.spread > 0 ? 2 : 0);
    const spread = 0.16;
    for (let i = 0; i < n; i++) {
      const off = n > 1 ? (i - (n - 1) / 2) * spread : 0;
      const a = baseA + off + rand(-0.02, 0.02);
      G.bullets.push({
        x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20,
        vx: Math.cos(a) * G.char.bulletSpeed, vy: Math.sin(a) * G.char.bulletSpeed,
        dmg, r: 4, pierce: G.up.pierce, hit: null, trail: [],
      });
    }
    G.muzzle = 0.06;
    SFX.shoot();
  }

  function fireEnemyBullet(e, angle, speed, dmg, emoji) {
    G.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg, r: 9, emoji });
  }

  function damageThesis(n) {
    const th = G.thesis;
    const before = th.hp;
    th.hp -= n;
    G.shake = Math.max(G.shake, 0.35);
    G.flash = Math.max(G.flash, 0.5);
    G.combo = 0; G.comboTimer = 0;
    SFX.thesisHurt();
    if (before > 50 && th.hp <= 50) Advisor.event('thesis50');
    if (before > 25 && th.hp <= 25) Advisor.event('thesis25');
    if (th.hp <= 0) { th.hp = 0; gameOver(); }
  }

  function hurtPlayer(n, fromX, fromY) {
    const p = G.player;
    if (p.dead || p.inv > 0) return;
    p.hp -= n;
    p.inv = 1;
    p.lastHurt = G.time;
    SFX.playerHurt();
    if (fromX !== undefined) {
      const a = Math.atan2(p.y - fromY, p.x - fromX);
      p.x = clamp(p.x + Math.cos(a) * 30, p.r, W - p.r);
      p.y = clamp(p.y + Math.sin(a) * 30, p.r, H - p.r);
    }
    if (p.hp <= 0) {
      p.dead = true;
      p.respawn = 2.5;
      G.combo = 0; G.comboTimer = 0;
      addScore(-50);
      burst(p.x, p.y, '#6fb7ff', 18, 220);
      addText(p.x, p.y - 30, '-50', '#ff6b6b');
      Advisor.event('death');
    }
  }

  function killEnemy(e) {
    if (!e.noScore) {
      G.combo++;
      G.comboTimer = 3.2;
      if (G.combo > G.bestCombo) G.bestCombo = G.combo;
      if (G.combo === 20) Advisor.event('combo', { n: 20 });
      const mult = comboMult();
      const pts = Math.round(e.score * mult);
      addScore(pts);
      addText(e.x, e.y - e.r - 6, '+' + pts, mult >= 2 ? '#ffd36b' : '#e8b44f');
    }
    G.kills++;
    burst(e.x, e.y, e.type === 'boss' ? '#ff6b6b' : '#e8b44f', e.type === 'boss' ? 40 : 10, e.type === 'boss' ? 320 : 160);
    SFX.kill();
    if (e.type === 'boss') {
      G.shake = Math.max(G.shake, 0.6);
      Advisor.event('bosskill');
      for (let i = 0; i < 3; i++) dropPickup(e.x + rand(-40, 40), e.y + rand(-40, 40), true);
    } else if (e.type === 'splitter' && !e.noScore) {
      for (let i = 0; i < 2; i++) spawnEnemy('bug', e.x + rand(-22, 22), e.y + rand(-22, 22));
      dropPickup(e.x, e.y, false);
    } else if (!e.noScore) {
      dropPickup(e.x, e.y, false);
    }
  }

  function dropPickup(x, y, force) {
    if (!force && Math.random() > 0.18) return;
    let r = Math.random() * 100, item = PICKUP_TABLE[0];
    for (const p of PICKUP_TABLE) { if (r < p.w) { item = p; break; } r -= p.w; }
    G.pickups.push({ x: clamp(x, 20, W - 20), y: clamp(y, 20, H - 20), type: item.type, emoji: item.emoji, life: 9, r: 14 });
  }

  function applyPickup(pk) {
    SFX.pickup();
    Advisor.event('pickup', { type: pk.type });
    switch (pk.type) {
      case 'coffee': G.buffs.coffee = 8; break;
      case 'cite':   G.buffs.cite = 10; break;
      case 'spread': G.buffs.spread = 5; break;
      case 'tape':
        G.thesis.hp = Math.min(G.thesis.max, G.thesis.hp + 20);
        addText(G.thesis.x, G.thesis.y - 56, '+20 📜', '#5ad08a');
        break;
      case 'idea': {
        SFX.explode();
        G.shake = Math.max(G.shake, 0.6);
        burst(pk.x, pk.y, '#fff3b0', 36, 420);
        for (const e of G.enemies) { e.hp -= 60; if (e.hp <= 0) e.dead = true; }
        break;
      }
    }
  }

  // ---------- 更新 ----------
  function update(dt) {
    G.time += dt;
    updateWaveFlow(dt);

    const p = G.player, th = G.thesis;

    // -- 玩家 --
    if (p.dead) {
      p.respawn -= dt;
      if (p.respawn <= 0) { p.dead = false; p.hp = p.maxHp; p.inv = 2; p.x = W / 2; p.y = H / 2 + 110; }
    } else {
      let dx = 0, dy = 0;
      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        const sp = G.char.speed * G.up.speedMul * (G.buffs.coffee > 0 ? 1.4 : 1);
        p.x = clamp(p.x + dx / len * sp * dt, p.r, W - p.r);
        p.y = clamp(p.y + dy / len * sp * dt, p.r, H - p.r);
      }
      p.inv = Math.max(0, p.inv - dt);
      if (G.time - p.lastHurt > 4 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 2 * dt);
      p.fireCd -= dt;
      if ((mouse.down || keys[' ']) && p.fireCd <= 0) shoot();
    }

    // -- Buff / 连击 / 特效计时 --
    G.buffs.coffee = Math.max(0, G.buffs.coffee - dt);
    G.buffs.cite = Math.max(0, G.buffs.cite - dt);
    G.buffs.spread = Math.max(0, G.buffs.spread - dt);
    if (G.combo > 0) { G.comboTimer -= dt; if (G.comboTimer <= 0) G.combo = 0; }
    G.flash = Math.max(0, G.flash - dt * 2.2);
    G.muzzle = Math.max(0, G.muzzle - dt);

    // -- 敌人 --
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = th.x - e.x, dy = th.y - e.y, d = Math.hypot(dx, dy) || 1;

      if (e.type === 'bug') {
        const a = Math.atan2(dy, dx) + Math.sin(G.time * 5 + e.seed) * 0.5;
        e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt;
      } else if (e.type === 'deadline') {
        const sp = e.speed + Math.max(0, 1 - d / 700) * 110;
        e.x += dx / d * sp * dt; e.y += dy / d * sp * dt;
      } else if (e.type === 'splitter') {
        e.x += dx / d * e.speed * dt; e.y += dy / d * e.speed * dt;
      } else if (e.type === 'reviewer') {
        if (d > ENEMY_TYPES.reviewer.range) {
          e.x += dx / d * e.speed * dt; e.y += dy / d * e.speed * dt;
        } else {
          e.x += (-dy / d) * e.speed * 0.5 * dt; e.y += (dx / d) * e.speed * 0.5 * dt;
          e.fireCd -= dt;
          if (e.fireCd <= 0) { e.fireCd = ENEMY_TYPES.reviewer.fireCd; fireEnemyBullet(e, Math.atan2(dy, dx), 160, e.dmg, '✉️'); }
        }
      } else if (e.type === 'boss') {
        e.x += dx / d * e.speed * dt; e.y += dy / d * e.speed * dt;
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          e.fireCd = ENEMY_TYPES.boss.fireCd;
          const base = Math.atan2(dy, dx);
          for (const o of [-0.35, 0, 0.35]) fireEnemyBullet(e, base + o, 150, 7, '❗');
        }
        e.spawnCd -= dt;
        if (e.spawnCd <= 0) {
          e.spawnCd = ENEMY_TYPES.boss.spawnCd;
          for (let i = 0; i < 2; i++) spawnEnemy('bug', e.x + rand(-50, 50), e.y + rand(-50, 50));
          addText(e.x, e.y - e.r - 14, t('minor_rev'), '#fff3b0');
        }
      }

      if (dist(e, th) < e.r + th.r) {
        damageThesis(e.dmg);
        burst(e.x, e.y, '#ff6b6b', 12, 200);
        e.dead = true; e.noScore = true;
        continue;
      }
      if (!p.dead && p.inv <= 0 && dist(e, p) < e.r + p.r) hurtPlayer(e.dmg, e.x, e.y);
    }

    // -- 玩家子弹 --
    for (const b of G.bullets) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 6) b.trail.shift();
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { b.gone = true; continue; }
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (b.hit && b.hit.has(e)) continue;
        if (dist(b, e) < b.r + e.r) {
          e.hp -= b.dmg;
          burst(b.x, b.y, '#f7d98c', 4, 90);
          SFX.hit();
          if (e.hp <= 0) e.dead = true;
          if (b.pierce > 0) { b.pierce--; (b.hit || (b.hit = new Set())).add(e); }
          else b.gone = true;
          break;
        }
      }
      if (b.gone) continue;
      for (const eb of G.enemyBullets) {
        if (eb.gone) continue;
        if (dist(b, eb) < b.r + eb.r) {
          eb.gone = true;
          burst(eb.x, eb.y, '#8cc6f7', 5, 110);
          addText(eb.x, eb.y - 10, '×', '#8cc6f7');
          if (b.pierce <= 0) b.gone = true;
          break;
        }
      }
    }

    // -- 敌方子弹 --
    for (const eb of G.enemyBullets) {
      if (eb.gone) continue;
      eb.x += eb.vx * dt; eb.y += eb.vy * dt;
      if (eb.x < -40 || eb.x > W + 40 || eb.y < -40 || eb.y > H + 40) { eb.gone = true; continue; }
      if (dist(eb, th) < eb.r + th.r) { damageThesis(eb.dmg); burst(eb.x, eb.y, '#ff6b6b', 6, 130); eb.gone = true; continue; }
      if (!p.dead && p.inv <= 0 && dist(eb, p) < eb.r + p.r) { hurtPlayer(eb.dmg, eb.x, eb.y); eb.gone = true; }
    }

    // -- 结算死亡 --
    for (const e of G.enemies) { if (e.dead && !e.counted) { e.counted = true; killEnemy(e); } }
    G.enemies = G.enemies.filter(e => !e.dead);
    G.bullets = G.bullets.filter(b => !b.gone);
    G.enemyBullets = G.enemyBullets.filter(b => !b.gone);

    // -- 道具 --
    for (const pk of G.pickups) {
      pk.life -= dt;
      if (pk.life <= 0) { pk.gone = true; continue; }
      if (!p.dead && dist(pk, p) < pk.r + p.r + 6) { applyPickup(pk); pk.gone = true; }
    }
    G.pickups = G.pickups.filter(pk => !pk.gone);

    // -- 粒子 / 飘字 / 横幅 / 震屏 --
    for (const pt of G.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.92; pt.vy *= 0.92; pt.life -= dt; }
    G.particles = G.particles.filter(pt => pt.life > 0);
    for (const tx of G.texts) { tx.y -= 36 * dt; tx.life -= dt; }
    G.texts = G.texts.filter(tx => tx.life > 0);
    if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
    G.shake = Math.max(0, G.shake - dt);

    updateHud();
  }

  function updateHud() {
    $('bar-thesis').style.width = (G.thesis.hp / G.thesis.max * 100) + '%';
    $('bar-player').style.width = (G.player.dead ? 0 : G.player.hp / G.player.maxHp * 100) + '%';
    $('hud-wave').textContent = G.wave;
    $('hud-score').textContent = G.score;
    $('hud-best').textContent = G.best;
    let html = '';
    if (G.buffs.coffee > 0) html += `<span class="buff-badge">☕ ${G.buffs.coffee.toFixed(0)}s</span>`;
    if (G.buffs.cite > 0) html += `<span class="buff-badge">📚 ${G.buffs.cite.toFixed(0)}s</span>`;
    if (G.buffs.spread > 0) html += `<span class="buff-badge">🔥 ${G.buffs.spread.toFixed(0)}s</span>`;
    $('buffs').innerHTML = html;
  }

  // ---------- 渲染 ----------
  function emoji(ch, x, y, size) {
    ctx.font = size + 'px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y);
  }

  function drawBackground() {
    ctx.fillStyle = '#10182b';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H);
    g.addColorStop(0, 'rgba(40,60,110,0.22)');
    g.addColorStop(1, 'rgba(16,24,43,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 星点
    for (const s of G.stars) {
      const tw = 0.5 + 0.5 * Math.sin(G.clock * 2 + s.tw);
      ctx.globalAlpha = 0.25 + 0.55 * tw;
      ctx.fillStyle = '#9fb4e0';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 漂浮的纸/笔
    for (const f of G.floaters) {
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      emoji(f.emoji, 0, 0, f.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // 网格
    ctx.strokeStyle = 'rgba(120,150,210,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  function render() {
    drawBackground();
    ctx.save();
    if (G.shake > 0) ctx.translate(rand(-1, 1) * G.shake * 12, rand(-1, 1) * G.shake * 12);
    if (G.thesis) {
      drawDesk(); drawPickups(); drawThesis(); drawEnemies(); drawPlayer(); drawBullets(); drawParticles(); drawTexts();
    }
    ctx.restore();
    if (G.flash > 0) drawFlash();
    drawBossBar();
    if (G.state === 'playing' || G.state === 'upgrade') drawCombo();
    drawBanner();
    if (G.state === 'playing') drawCrosshair();
  }

  function drawFlash() {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.78);
    g.addColorStop(0, 'rgba(255,60,60,0)');
    g.addColorStop(1, `rgba(255,40,40,${0.55 * G.flash})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawDesk() {
    const th = G.thesis;
    ctx.fillStyle = 'rgba(60,80,130,0.25)';
    ctx.beginPath(); ctx.arc(th.x, th.y, 72, 0, Math.PI * 2); ctx.fill();
  }

  function drawThesis() {
    const th = G.thesis;
    ctx.save();
    ctx.translate(th.x, th.y);
    for (let i = 2; i >= 0; i--) {
      ctx.save();
      ctx.rotate((i - 1) * 0.09);
      ctx.fillStyle = i === 0 ? '#f5efdc' : '#d8d2c0';
      ctx.fillRect(-26, -32 + i * 3, 52, 62);
      ctx.restore();
    }
    ctx.strokeStyle = '#9a917a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-17, -18 + i * 9); ctx.lineTo(17, -18 + i * 9); ctx.stroke(); }
    ctx.restore();
    emoji('🎓', th.x, th.y - 44, 26);
    const ratio = th.hp / th.max;
    ctx.beginPath();
    ctx.arc(th.x, th.y, 50, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = ratio > 0.5 ? '#5ad08a' : ratio > 0.25 ? '#e8b44f' : '#ff6b6b';
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (ratio <= 0.25) {
      ctx.beginPath();
      ctx.arc(th.x, th.y, 58 + Math.sin(G.time * 6) * 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,107,107,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const p = G.player;
    if (p.dead) {
      emoji('🪦', p.x, p.y, 30);
      ctx.fillStyle = '#93a0bd';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.respawn.toFixed(1) + 's', p.x, p.y + 28);
      return;
    }
    if (p.inv > 0 && Math.floor(G.time * 16) % 2 === 0) return;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 16, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    const a = Math.atan2(mouse.y - p.y, mouse.x - p.x);
    // 枪口闪光
    if (G.muzzle > 0) {
      ctx.save();
      ctx.globalAlpha = G.muzzle / 0.06;
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 28, p.y + Math.sin(a) * 28, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#e8b44f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(a) * 12, p.y + Math.sin(a) * 12);
    ctx.lineTo(p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26);
    ctx.stroke();
    emoji(G.char.emoji, p.x, p.y, 30);
  }

  function drawEnemies() {
    for (const e of G.enemies) {
      emoji(e.emoji, e.x, e.y, e.r * 2);
      if (e.hp < e.maxHp) {
        const w = e.r * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w, 4);
        ctx.fillStyle = e.type === 'boss' ? '#ff6b6b' : '#5ad08a';
        ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w * (e.hp / e.maxHp), 4);
      }
      if (e.type === 'boss') {
        ctx.fillStyle = '#ff9d9d';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Reviewer #2', e.x, e.y + e.r + 14);
      }
    }
  }

  function drawBullets() {
    for (const b of G.bullets) {
      if (b.trail.length > 1) {
        ctx.strokeStyle = 'rgba(247,217,140,0.30)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (const tp of b.trail) ctx.lineTo(tp.x, tp.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7d98c';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, Math.PI * 2); ctx.fill();
    }
    for (const eb of G.enemyBullets) emoji(eb.emoji, eb.x, eb.y, 18);
  }

  function drawPickups() {
    for (const pk of G.pickups) {
      if (pk.life < 2.5 && Math.floor(pk.life * 8) % 2 === 0) continue;
      ctx.fillStyle = 'rgba(232,180,79,0.15)';
      ctx.beginPath(); ctx.arc(pk.x, pk.y, 17 + Math.sin(G.time * 4) * 2, 0, Math.PI * 2); ctx.fill();
      emoji(pk.emoji, pk.x, pk.y, 22);
    }
  }

  function drawParticles() {
    for (const pt of G.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts() {
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    for (const tx of G.texts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, tx.life));
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawCombo() {
    if (G.combo < 4) return;
    const mult = comboMult();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, G.comboTimer / 1.2);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = mult >= 2.5 ? '#ff7b4f' : mult >= 1.5 ? '#ffaa4f' : '#e8b44f';
    ctx.fillText(`${G.combo} ${t('combo')}  ×${mult.toFixed(1)}`, W / 2, 96);
    ctx.restore();
  }

  function drawBanner() {
    if (!G.banner) return;
    const alpha = Math.min(1, G.banner.t / 0.5);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#e8b44f';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(G.banner.text, W / 2, H * 0.3);
    ctx.globalAlpha = 1;
  }

  function drawBossBar() {
    const boss = G.enemies.find(e => e.type === 'boss');
    if (!boss) return;
    const bw = 380, bx = (W - bw) / 2, by = 44;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx - 2, by - 2, bw + 4, 14);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(bx, by, bw * (boss.hp / boss.maxHp), 10);
    ctx.fillStyle = '#ffd2d2';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧐 Reviewer #2', W / 2, by - 8);
  }

  function drawCrosshair() {
    ctx.strokeStyle = 'rgba(232,180,79,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mouse.x - 12, mouse.y); ctx.lineTo(mouse.x - 5, mouse.y);
    ctx.moveTo(mouse.x + 5, mouse.y); ctx.lineTo(mouse.x + 12, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 12); ctx.lineTo(mouse.x, mouse.y - 5);
    ctx.moveTo(mouse.x, mouse.y + 5); ctx.lineTo(mouse.x, mouse.y + 12);
    ctx.stroke();
  }

  // ---------- 主循环 ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    G.clock = now / 1000;
    updateBackground(dt);
    if (G.state === 'playing') update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------- 绑定 UI ----------
  function doToggleMute() {
    SFX.init();
    const m = SFX.toggleMute();
    $('btn-mute').textContent = m ? '🔇' : '🔊';
  }

  document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => { SFX.init(); SFX.click(); startGame(card.dataset.char); });
  });
  $('btn-resume').addEventListener('click', resumeGame);
  $('btn-pause-menu').addEventListener('click', () => { overlays.pause.classList.add('hidden'); toMenu(); });
  $('btn-retry').addEventListener('click', () => { SFX.click(); startGame(G.charId); });
  $('btn-go-menu').addEventListener('click', toMenu);
  $('btn-lang').addEventListener('click', () => {
    const next = I18N.lang === 'zh' ? 'en' : 'zh';
    I18N.setLang(next);
    $('btn-lang').textContent = next === 'zh' ? 'EN' : '中文';
  });
  $('btn-mute').addEventListener('click', doToggleMute);

  // ---------- 启动 ----------
  initBackground();
  I18N.apply();
  $('btn-lang').textContent = I18N.lang === 'zh' ? 'EN' : '中文';
  $('btn-mute').textContent = SFX.muted ? '🔇' : '🔊';
  $('menu-best').textContent = G.best;
  Advisor.init({
    getState() {
      return {
        state: G.state, wave: G.wave, score: G.score,
        thesisHp: G.thesis ? Math.round(G.thesis.hp) : 0,
        playerHp: G.player ? Math.round(G.player.hp) : 0,
        char: G.charId, enemies: G.enemies.length,
        boss: G.enemies.some(e => e.type === 'boss'),
      };
    },
  });
  showOnly('menu');
  requestAnimationFrame(frame);
})();

/* Spectral Hunt — a first-person 3D ghost shooter for the Spooktacular Ghost tab.
 *
 * This is deliberately not a 2D DOM game. The graveyard is a real WebGL scene:
 * PBR ground, shadows, volumetric mist, ritual light, 22 ghost breeds built from
 * animated spectral shaders, three rotating Veil Sovereigns, relic builds,
 * weapon archetypes, active abilities, omens, particles, pickups, a first-person
 * weapon, sound and a full arcade loop. Three.js is vendored locally in
 * vendor/three.min.js so the GitHub Pages / Google Sites build stays offline-safe.
 */
(function () {
  'use strict';

  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || location.href;
  var BASE_DIR = SCRIPT_SRC.replace(/[?#].*$/, '').replace(/\/[^/]*$/, '/');
  if (BASE_DIR.charAt(BASE_DIR.length - 1) !== '/') BASE_DIR += '/';
  var THREE = window.THREE || null;
  var threeLoading = false;
  var threeWaiters = [];
  var TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- breeds */
  var TYPES = [
    { key: 'blinky', name: 'Blinky', color: 0xff4f9a, glow: 0xffb3d1, eye: 0x30001a, speed: 2.25, size: 1.00, hp: 1, points: 10, behavior: 'direct', variant: 'classic', trait: 'Fast, direct and very pleased with itself.' },
    { key: 'casper', name: 'Casper', color: 0x9b6bff, glow: 0xd8c7ff, eye: 0x1a0b30, speed: 1.20, size: 1.22, hp: 2, points: 18, behavior: 'drift', variant: 'classic', trait: 'A heavy old soul. Slow, but hard to disperse.' },
    { key: 'spooky', name: 'Spooky', color: 0x33ffc7, glow: 0x9effe3, eye: 0x062a20, speed: 2.65, size: 0.88, hp: 1, points: 14, behavior: 'zigzag', variant: 'classic', trait: 'Never drifts in a straight line.' },
    { key: 'phantom', name: 'Phantom', color: 0xffd166, glow: 0xffedb0, eye: 0x2a1500, speed: 1.65, size: 1.08, hp: 2, points: 24, behavior: 'teleport', variant: 'classic', trait: 'Blinks through the veil when you line up a shot.' },
    { key: 'wraith', name: 'Wraith', color: 0xff6a2a, glow: 0xffb07a, eye: 0x2a0800, speed: 2.40, size: 0.96, hp: 2, points: 25, behavior: 'strafe', variant: 'hood', trait: 'Circles its prey and strikes from the side.' },
    { key: 'specter', name: 'Specter', color: 0x59e6ff, glow: 0xb8f5ff, eye: 0x05262e, speed: 1.05, size: 1.42, hp: 3, points: 32, behavior: 'drift', variant: 'classic', trait: 'A huge, luminous presence. Worth three shots.' },
    { key: 'shade', name: 'Shade', color: 0x7dff6a, glow: 0xc9ffbd, eye: 0x082600, speed: 1.90, size: 1.00, hp: 2, points: 26, behavior: 'ambush', variant: 'hood', trait: 'Waits in the dark, then rushes the lamp.' },
    { key: 'banshee', name: 'Banshee', color: 0xff9f1c, glow: 0xffd39a, eye: 0x2a1000, speed: 2.15, size: 0.94, hp: 2, points: 28, behavior: 'zigzag', variant: 'witch', trait: 'Her wail bends the air around her.' },
    { key: 'pumpkin', name: 'Pumpkin', color: 0xff8c1a, glow: 0xffc46b, eye: 0x3a1400, speed: 1.55, size: 1.12, hp: 2, points: 36, behavior: 'direct', variant: 'pumpkin', trait: 'A jack-o\'-lantern with unfinished business.' },
    { key: 'imp', name: 'Imp', color: 0xd45bff, glow: 0xeba8ff, eye: 0x22002e, speed: 2.85, size: 0.90, hp: 1, points: 30, behavior: 'zigzag', variant: 'horns', trait: 'Small, rude, and impossible to catch still.' },
    { key: 'monarch', name: 'Monarch', color: 0xffd166, glow: 0xfff0b8, eye: 0x2a1500, speed: 1.25, size: 1.18, hp: 4, points: 48, behavior: 'orbit', variant: 'crown', trait: 'Rules the far side of the graveyard.' },
    { key: 'witch', name: 'Witch', color: 0x9d4edd, glow: 0xcd9bff, eye: 0x1a082a, speed: 1.75, size: 1.06, hp: 3, points: 44, behavior: 'orbit', variant: 'witch', trait: 'Weaves a slow, deliberate circle.' },
    { key: 'cyclops', name: 'Cyclops', color: 0x3ddc97, glow: 0x9dffd1, eye: 0x042a1a, speed: 1.35, size: 1.20, hp: 4, points: 46, behavior: 'direct', variant: 'cyclops', trait: 'One eye. No blind spot for you.' },
    { key: 'count', name: 'Count', color: 0xff3355, glow: 0xffa0b0, eye: 0x2a0008, speed: 2.30, size: 1.02, hp: 3, points: 50, behavior: 'dive', variant: 'vampire', trait: 'Dives when the moonlight touches him.' },
    { key: 'reaper', name: 'Reaper', color: 0xb8b8d0, glow: 0xd7d7ff, eye: 0x16162a, speed: 1.50, size: 1.26, hp: 5, points: 65, behavior: 'homing', variant: 'reaper', trait: 'A patient hunter with a very long memory.' },
    { key: 'dapper', name: 'Dapper', color: 0x6ee7ff, glow: 0xc1f7ff, eye: 0x06262e, speed: 1.65, size: 1.02, hp: 3, points: 42, behavior: 'orbit', variant: 'tophat', trait: 'Impeccably dressed. Impossibly rude.' },
    { key: 'mummy', name: 'Mummy', color: 0xe8d8a8, glow: 0xfff3c9, eye: 0x2a1d08, speed: 1.10, size: 1.18, hp: 6, points: 58, behavior: 'drift', variant: 'mummy', trait: 'Wrapped tight. Hits like a tombstone.' },
    { key: 'twinkle', name: 'Twinkle', color: 0xb388ff, glow: 0xe5d4ff, eye: 0x1a0830, speed: 2.55, size: 0.94, hp: 2, points: 52, behavior: 'zigzag', variant: 'star', trait: 'A starry little terror with a bright tail.' },
    { key: 'wisp', name: 'Wisp', color: 0x6ee7ff, glow: 0xc1f7ff, eye: 0x06262e, speed: 1.35, size: 1.02, hp: 2, points: 38, behavior: 'caster', variant: 'star', trait: 'Hangs back and spits cold soulfire from the dark.' },
    { key: 'bellwether', name: 'Bellwether', color: 0xff6a2a, glow: 0xffb07a, eye: 0x2a0800, speed: 1.20, size: 1.16, hp: 4, points: 58, behavior: 'summoner', variant: 'hood', trait: 'Rings a bell only the dead can hear. They always answer.' },
    { key: 'mender', name: 'Mender', color: 0x7dff6a, glow: 0xc9ffbd, eye: 0x082600, speed: 1.25, size: 1.06, hp: 3, points: 50, behavior: 'healer', variant: 'mummy', trait: 'Sews its kin back together with little green stitches.' },
    { key: 'ashling', name: 'Ashling', color: 0xff8c1a, glow: 0xffd18a, eye: 0x3a1400, speed: 1.90, size: 1.00, hp: 2, points: 44, behavior: 'bomber', variant: 'pumpkin', trait: 'Runs hot, gets close, and takes the graveyard with it.' }
  ];

  var BOSSES = [
    {
      key: 'hollowking', name: 'The Hollow King', color: 0x9b5cff, glow: 0xe3c7ff,
      eye: 0x10001f, speed: 0.95, size: 1.65, hp: 30, points: 500,
      behavior: 'homing', variant: 'crown', title: 'CROWN OF THE EMPTY THRONE'
    },
    {
      key: 'weepingwidow', name: 'The Weeping Widow', color: 0x59e6ff, glow: 0xc1f7ff,
      eye: 0x06262e, speed: 1.12, size: 1.62, hp: 38, points: 650,
      behavior: 'caster', variant: 'witch', title: 'HER TEARS FALL UPWARD'
    },
    {
      key: 'lanterneater', name: 'The Lantern Eater', color: 0xff8c1a, glow: 0xffd18a,
      eye: 0x2a1000, speed: 1.08, size: 1.72, hp: 46, points: 800,
      behavior: 'dive', variant: 'pumpkin', title: 'IT HUNGERS FOR THE LITTLE LIGHT'
    }
  ];
  var BOSS = BOSSES[0];

  /* Four relic arms with genuinely different shot patterns. */
  var WEAPONS = [
    {
      key: 'blaster', name: 'Soulfire Blaster', short: 'SOULFIRE', icon: '✦',
      color: 0x59e6ff, glow: 0xc9f7ff, cooldown: 175, shots: 1, damage: 1,
      speed: 48, spread: 0, life: 2.1, size: 1, pierce: 0, chain: 0,
      desc: 'Balanced spectral bolts. A clean, dependable rhythm.'
    },
    {
      key: 'scatter', name: 'Grave Scatter', short: 'SCATTER', icon: '⋔',
      color: 0xff9a3d, glow: 0xffd6a0, cooldown: 520, shots: 6, damage: 0.52,
      speed: 36, spread: 0.085, life: 1.05, size: 0.78, pierce: 0, chain: 0,
      desc: 'A close-range fan of burning grave dust. Delete whatever is in front of you.'
    },
    {
      key: 'arc', name: 'Storm Arc', short: 'STORM ARC', icon: '⌁',
      color: 0xb388ff, glow: 0xe5d4ff, cooldown: 300, shots: 1, damage: 0.95,
      speed: 46, spread: 0, life: 1.8, size: 0.92, pierce: 0, chain: 1,
      desc: 'Volatile soul lightning that leaps to a second ghost.'
    },
    {
      key: 'rail', name: 'Moon Rail', short: 'MOON RAIL', icon: '➶',
      color: 0xffd166, glow: 0xfff0b8, cooldown: 950, shots: 1, damage: 3.2,
      speed: 88, spread: 0, life: 1.6, size: 1.55, pierce: 4, chain: 0,
      desc: 'A slow, surgical lance of moonlight. Lines of ghosts disappear.'
    }
  ];

  /* Relics are drafted after every wave and stack for the whole run. */
  var BOONS = [
    { id: 'power', name: 'Grave Fury', icon: '✦', max: 5, tone: '#ff9a3d', desc: '+18% weapon damage.' },
    { id: 'haste', name: 'Dead Quick', icon: '↯', max: 5, tone: '#59e6ff', desc: '-8% fire interval.' },
    { id: 'split', name: 'Twin Wraiths', icon: '❖', max: 2, tone: '#b388ff', desc: '+1 bolt per shot.' },
    { id: 'pierce', name: 'Grave Piercer', icon: '➶', max: 3, tone: '#ffd166', desc: 'Bolts pierce +1 ghost.' },
    { id: 'crit', name: 'Cold Reading', icon: '◈', max: 5, tone: '#ff3355', desc: '+7% critical chance.' },
    { id: 'vitality', name: 'Borrowed Time', icon: '♥', max: 4, tone: '#ff6a8a', desc: '+15 max soul shield.' },
    { id: 'swift', name: 'Night Stride', icon: '⌁', max: 4, tone: '#33ffc7', desc: '+6% movement speed.' },
    { id: 'dash', name: 'Phase Step', icon: '➤', max: 4, tone: '#6ee7ff', desc: '-15% dash cooldown.' },
    { id: 'nova', name: 'Soul Bloom', icon: '✺', max: 4, tone: '#d45bff', desc: '-14% nova cooldown, +nova damage.' },
    { id: 'frost', name: 'Hollow Chill', icon: '❄', max: 2, tone: '#9be7ff', desc: 'Hits slow ghosts.' },
    { id: 'burn', name: 'Witchfire', icon: '🔥', max: 3, tone: '#ff8c1a', desc: 'Hits set ghosts burning.' },
    { id: 'leech', name: 'Siphon', icon: '☾', max: 3, tone: '#b8b8d0', desc: 'Heal when a ghost is dispelled.' },
    { id: 'greed', name: 'Grave Robber', icon: '$', max: 3, tone: '#ffd166', desc: '+15% souls from every kill.' },
    { id: 'magnet', name: 'Soul Tether', icon: '◎', max: 3, tone: '#59ffa8', desc: 'Soul pickups drift toward you from farther away.' }
  ];

  var OMENS = [
    { key: 'bloodmoon', name: 'BLOOD MOON', desc: 'Ghosts move faster. Souls burn brighter.', tone: '#ff4f6d', fog: 0x21060f, density: 0.032, speed: 1.16, score: 1.15 },
    { key: 'eclipse', name: 'ECLIPSE', desc: 'Critical strikes surge under the black sun.', tone: '#b388ff', fog: 0x07040f, density: 0.026, speed: 1, score: 1.1, crit: 0.15 },
    { key: 'soulrain', name: 'SOUL RAIN', desc: 'Soul harvests fall more often.', tone: '#59e6ff', fog: 0x07141a, density: 0.021, speed: 1, score: 1, pickup: 5 },
    { key: 'haunting', name: 'THE HAUNTING', desc: 'The mist thickens; the dead slow.', tone: '#9be7ff', fog: 0x0d1020, density: 0.045, speed: 0.9, score: 1.2 }
  ];

  var DEFAULT_SETTINGS = {
    sens: 1, invert: false, aimAssist: true, damageNumbers: true,
    shake: true, reducedMotion: false, quality: 'high'
  };
  var SETTINGS_KEY = 'spooky_spectral_settings';
  var ARMORY_KEY = 'spooky_spectral_weapon';

  var state = {
    box: null,
    root: null,
    ui: null,
    renderer: null,
    scene: null,
    camera: null,
    clock: null,
    mode: 'loading',
    started: false,
    threeReady: false,
    loadingThree: false,
    threeWaiters: [],
    raf: 0,
    lastNow: 0,
    time: 0,
    player: { x: 0, y: 1.68, z: 15, yaw: 0, pitch: 0, bob: 0, radius: 0.34 },
    keys: {},
    look: null,
    stick: null,
    firing: false,
    nextFire: 0,
    recoil: 0,
    muzzle: 0,
    shake: 0,
    ghosts: [],
    projectiles: [],
    enemyShots: [],
    beams: [],
    bursts: [],
    pickups: [],
    env: null,
    weapon: null,
    game: null,
    audio: null,
    muted: false,
    discovered: {},
    best: 0,
    hud: {},
    settings: null,
    armoryKey: 'blaster',
    radarCtx: null,
    radarAccum: 0,
    resizeObserver: null,
    toastTimer: 0,
    hintTimer: 0
  };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function choose(a) { return a[(Math.random() * a.length) | 0]; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function $(id) { return state.root ? state.root.querySelector('#' + id) : null; }
  function fmt(n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function loadFromStorage(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function saveToStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  /* --------------------------------------------------------- run helpers */
  function normalizeSettings(raw) {
    var out = {};
    for (var key in DEFAULT_SETTINGS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) out[key] = DEFAULT_SETTINGS[key];
    }
    if (raw && typeof raw === 'object') {
      if (typeof raw.sens === 'number' && isFinite(raw.sens)) out.sens = clamp(raw.sens, 0.5, 2);
      if (typeof raw.invert === 'boolean') out.invert = raw.invert;
      if (typeof raw.aimAssist === 'boolean') out.aimAssist = raw.aimAssist;
      if (typeof raw.damageNumbers === 'boolean') out.damageNumbers = raw.damageNumbers;
      if (typeof raw.shake === 'boolean') out.shake = raw.shake;
      if (typeof raw.reducedMotion === 'boolean') out.reducedMotion = raw.reducedMotion;
      if (raw.quality === 'low' || raw.quality === 'medium' || raw.quality === 'high') out.quality = raw.quality;
    }
    return out;
  }
  function setting(key) {
    return state.settings ? state.settings[key] : DEFAULT_SETTINGS[key];
  }
  function saveSettings() {
    saveToStorage(SETTINGS_KEY, state.settings);
    applySettings();
  }
  function applySettings() {
    if (!state.settings) return;
    if (state.ui && state.ui.stage) {
      state.ui.stage.classList.toggle('reduce-motion', !!state.settings.reducedMotion);
    }
    if (state.renderer && state.ui && state.ui.stage) {
      var coarse = state.ui.stage.classList.contains('touch');
      var q = state.settings.quality;
      var ratio = q === 'low' ? 1 : (q === 'medium' ? 1.25 : (coarse ? 1.45 : 1.65));
      state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ratio));
      resize();
    }
  }
  function weaponByKey(key) {
    for (var i = 0; i < WEAPONS.length; i++) if (WEAPONS[i].key === key) return WEAPONS[i];
    return WEAPONS[0];
  }
  function activeWeapon() {
    var key = (state.game && state.game.weaponKey) || state.armoryKey || 'blaster';
    return weaponByKey(key);
  }
  function boonRank(id) {
    return state.game && state.game.boons ? (state.game.boons[id] || 0) : 0;
  }
  function boonCount() {
    if (!state.game || !state.game.boons) return 0;
    var n = 0;
    for (var key in state.game.boons) if (state.game.boons[key] > 0) n += state.game.boons[key];
    return n;
  }
  function boonDamage() { return 1 + 0.18 * boonRank('power'); }
  function boonFireScale() { return Math.pow(0.92, boonRank('haste')); }
  function boonCrit() {
    var c = 0.04 + 0.07 * boonRank('crit');
    if (state.game && state.game.omen && state.game.omen.crit) c += state.game.omen.crit;
    return clamp(c, 0, 0.75);
  }
  function boonMoveScale() { return 1 + 0.06 * boonRank('swift'); }
  function boonDashScale() { return Math.pow(0.85, boonRank('dash')); }
  function boonNovaScale() { return Math.pow(0.86, boonRank('nova')); }
  function boonScoreScale() { return 1 + 0.15 * boonRank('greed'); }
  function boonPickupRadius() { return 4 + boonRank('magnet') * 1.7; }
  function formatClock(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(total / 60), s = total % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function relicMarkup() {
    var bits = [];
    BOONS.forEach(function (b) {
      var n = boonRank(b.id);
      if (n > 0) bits.push('<span style="--relic:' + b.tone + '">' + b.icon + ' ' + b.name + ' <b>' + n + '</b></span>');
    });
    return bits.length ? bits.join('') : '<span class="empty">NO RELICS CLAIMED</span>';
  }
  function runLineMarkup() {
    var g = state.game;
    if (!g) return '';
    var w = weaponByKey(g.weaponKey);
    return '<span>' + w.short + '</span><span>' + boonCount() + ' RELICS</span><span>' + (g.bosses || 0) + ' SOVEREIGNS</span><span>' + formatClock(nowMs() - g.startTime) + '</span>';
  }

  /* -------------------------------------------------------- three.js loader */
  function loadThree(cb) {
    if (window.THREE) { THREE = window.THREE; cb(true); return; }
    threeWaiters.push(cb);
    if (threeLoading) return;
    threeLoading = true;
    var s = document.createElement('script');
    s.src = BASE_DIR + 'vendor/three.min.js';
    s.async = true;
    s.onload = function () {
      THREE = window.THREE || null;
      threeLoading = false;
      var ok = !!THREE;
      var waiters = threeWaiters.slice();
      threeWaiters.length = 0;
      waiters.forEach(function (fn) { try { fn(ok); } catch (e) {} });
    };
    s.onerror = function () {
      threeLoading = false;
      var waiters = threeWaiters.slice();
      threeWaiters.length = 0;
      waiters.forEach(function (fn) { try { fn(false); } catch (e) {} });
    };
    document.head.appendChild(s);
  }

  /* --------------------------------------------------------------- host API */
  function build(box) {
    if (!box) return;
    state.box = box;
    if (!state.root) createShell();
    if (state.root.parentNode) state.root.parentNode.removeChild(state.root);
    box.appendChild(state.root);
    state.mode = state.renderer && state.game && state.game.active ? 'play' : 'idle';
    showStartIfIdle();
    resize();
    requestAnimationFrame(resize);
    if (window.THREE) {
      THREE = window.THREE;
      initScene();
      if (state.renderer) startLoop();
    } else {
      setLoading(true, 'Summoning the veil...');
      loadThree(function (ok) {
        if (!ok) {
          setLoading(false);
          showFatal('The 3D engine could not be loaded', 'vendor/three.min.js is missing or blocked. Check your connection and reload the page.');
          return;
        }
        if (!state.root || !state.root.parentNode) { setLoading(false); return; }
        initScene();
        if (state.renderer) startLoop();
        setLoading(false);
      });
    }
    return box;
  }

  function resetStick() {
    if (state.ui) {
      if (state.ui.stick) state.ui.stick.classList.remove('active');
      if (state.ui.knob) state.ui.knob.style.transform = '';
    }
    state.stick = null;
  }

  function commitBest() {
    if (state.game && state.game.score > state.best) {
      state.best = state.game.score;
      saveToStorage('spooky_spectral_best', state.best);
    }
    return state.best;
  }

  function startGame() {
    initAudio();
    commitBest();
    if (!state.renderer) {
      if (!window.THREE) {
        loadThree(function (ok) {
          if (!ok || !state.root || !state.root.parentNode) return;
          initScene(); startLoop(); startGame();
        });
      }
      return;
    }
    if (state.audio && state.audio.ctx && state.audio.ctx.state === 'suspended') {
      state.audio.ctx.resume();
    }
    state.player.x = 0;
    state.player.z = 15;
    if (state.camera) {
      state.camera.position.set(0, 1.68, 15);
      state.camera.rotation.set(0, 0, 0, 'YXZ');
    }
    var ui = state.ui;
    state.player.yaw = 0;
    state.player.pitch = 0;
    state.player.bob = 0;
    state.keys = {};
    state.firing = false;
    state.look = null;
    resetStick();
    state.nextFire = 0;
    state.recoil = 0;
    state.shake = 0;
    state.radarAccum = 0;
    state.projectiles.forEach(removeProjectile);
    state.projectiles.length = 0;
    state.enemyShots.forEach(removeEnemyShot);
    state.enemyShots.length = 0;
    clearBeams();
    state.pickups.forEach(removePickup);
    state.pickups.length = 0;
    clearGhosts();
    clearBursts();
    state.game = {
      active: true,
      score: 0,
      wave: 0,
      combo: 0,
      comboTimer: 0,
      kills: 0,
      shots: 0,
      hits: 0,
      health: 100,
      maxHealth: 100,
      toSpawn: 0,
      spawnTimer: 0,
      waveClearTimer: 0,
      intermission: 0,
      boss: null,
      bossPending: false,
      goldDrop: 0,
      bosses: 0,
      weaponKey: state.armoryKey || 'blaster',
      boons: {},
      omen: null,
      draftNext: 0,
      dashCd: 0,
      novaCd: 0,
      dashTime: 0,
      dashDir: { x: 0, z: -1 },
      invuln: 0,
      power: { rapid: 0, triple: 0, shield: 0 },
      startTime: nowMs()
    };
    ui.start.classList.remove('show');
    ui.over.classList.remove('show');
    ui.pauseOverlay.classList.remove('show');
    if (ui.draft) ui.draft.classList.remove('show');
    if (ui.settings) ui.settings.classList.remove('show');
    ui.hud.classList.add('playing');
    applyWeaponVisual();
    if (state.hintTimer) clearTimeout(state.hintTimer);
    ui.hint.style.opacity = '1';
    state.hintTimer = setTimeout(function () { if (state.ui) state.ui.hint.style.opacity = '0'; }, 6000);
    updateHUD(true);
    startWave(1);
    showToast('THE HUNT BEGINS', 2200);
    if (state.audio && state.audio.ctx && state.audio.ctx.state === 'suspended') state.audio.ctx.resume();
    state.mode = 'play';
  }

  function stopGame() {
    var ui = state.ui;
    commitBest();
    state.firing = false;
    state.keys = {};
    state.look = null;
    resetStick();
    if (state.game) {
      state.game.active = false;
      state.game.boss = null;
    }
    clearGhosts();
    clearBursts();
    state.projectiles.forEach(removeProjectile);
    state.projectiles.length = 0;
    state.enemyShots.forEach(removeEnemyShot);
    state.enemyShots.length = 0;
    clearBeams();
    state.pickups.forEach(removePickup);
    state.pickups.length = 0;
    state.mode = 'idle';
    if (state.hintTimer) { clearTimeout(state.hintTimer); state.hintTimer = 0; }
    if (ui) ui.hint.style.opacity = '0';
    if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
    state.lastNow = 0;
    if (state.audio && state.audio.ctx && state.audio.ctx.state === 'running') {
      try { state.audio.ctx.suspend(); } catch (e) {}
    }
    if (ui) {
      ui.hud.classList.remove('playing');
      ui.pauseOverlay.classList.remove('show');
      ui.over.classList.remove('show');
      if (ui.bestiary) ui.bestiary.classList.remove('show');
      if (ui.draft) ui.draft.classList.remove('show');
      if (ui.settings) ui.settings.classList.remove('show');
    }
    spawnIdleGhosts();
  }

  function startLoop() {
    if (state.raf || !state.renderer) return;
    state.lastNow = 0;
    state.raf = requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------------- shell */
  function createShell() {
    var root = el('div', 'gs3d-shell');
    root.innerHTML =
      '<div class="gs3d-stage" id="gs3dStage">' +
        '<canvas class="gs3d-canvas" id="gs3dCanvas"></canvas>' +
        '<div class="gs3d-grain"></div>' +
        '<div class="gs3d-vignette"></div>' +
        '<div class="gs3d-hud" id="gs3dHud">' +
          '<div class="gs3d-top">' +
            '<div class="gs3d-brand"><span class="gs3d-brand-mark">' +
              '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3C10 3 6 11 6 20v12c0 2 3 3 5 1 2-2 4 0 6 2 2 2 4 0 6-2 2-2 4 0 6 2 2 2 5 1 5-1V20C34 11 30 3 20 3Z" fill="#bca7ff" opacity=".9"/><circle cx="15" cy="19" r="3" fill="#130720"/><circle cx="25" cy="19" r="3" fill="#130720"/><ellipse cx="20" cy="27" rx="4" ry="2.5" fill="#130720" opacity=".8"/></svg>' +
              '</span><span><b>SPECTRAL HUNT</b><small>THE VEIL IS THIN</small></span></div>' +
            '<div class="gs3d-chips">' +
              '<div class="gs3d-chip score-chip"><small>SOULS</small><b id="gs3dScore">0</b></div>' +
              '<div class="gs3d-chip"><small>WAVE</small><b id="gs3dWave">1</b></div>' +
              '<div class="gs3d-chip combo-chip" id="gs3dComboChip"><small>COMBO</small><b id="gs3dCombo">x1</b></div>' +
              '<div class="gs3d-chip omen-chip" id="gs3dOmenChip"><small>OMEN</small><b id="gs3dOmen">—</b></div>' +
              '<div class="gs3d-chip"><small>KILLS</small><b id="gs3dBreed">0</b></div>' +
              '<button class="gs3d-icon-btn" id="gs3dSound" aria-label="Toggle sound">' +
                '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/><path d="M16 8c1.2 1.1 1.8 2.5 1.8 4s-.6 2.9-1.8 4M18.8 5.2c2 1.8 3.2 4.3 3.2 6.8s-1.2 5-3.2 6.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' +
              '</button>' +
              '<button class="gs3d-icon-btn" id="gs3dPause" aria-label="Pause">' +
                '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.3" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.3" fill="currentColor"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<button class="gs3d-weapon" id="gs3dWeapon" aria-label="Cycle spectral weapon"><small>RELIC ARM</small><b id="gs3dWeaponName">SOULFIRE</b></button>' +
          '<div class="gs3d-boss" id="gs3dBoss"><span id="gs3dBossName">THE HOLLOW KING</span><i><b id="gs3dBossFill"></b></i></div>' +
          '<div class="gs3d-radar-wrap" id="gs3dRadarWrap"><canvas class="gs3d-radar" id="gs3dRadar" width="200" height="200"></canvas><small>VEIL RADAR</small></div>' +
          '<div class="gs3d-reticle" id="gs3dReticle"><i></i><b></b><span></span></div>' +
          '<div class="gs3d-float-layer" id="gs3dFloatLayer"></div>' +
          '<div class="gs3d-toast" id="gs3dToast"></div>' +
          '<div class="gs3d-wave-banner" id="gs3dWaveBanner"><small>BLOOD MOON</small><strong>WAVE 1</strong><span>THE DEAD ARE RESTLESS</span></div>' +
          '<div class="gs3d-bottom">' +
            '<div class="gs3d-shield"><span>SOUL SHIELD <b id="gs3dShieldNum">100</b></span><i><b id="gs3dShieldFill"></b></i></div>' +
            '<div class="gs3d-power" id="gs3dPower"></div>' +
          '</div>' +
          '<div class="gs3d-abilities" id="gs3dAbilities">' +
            '<button class="gs3d-ability" id="gs3dDash" type="button" aria-label="Dash"><span>Q</span><small>DASH</small><b id="gs3dDashCd">READY</b></button>' +
            '<button class="gs3d-ability nova" id="gs3dNova" type="button" aria-label="Soul nova"><span>E</span><small>NOVA</small><b id="gs3dNovaCd">READY</b></button>' +
          '</div>' +
          '<div class="gs3d-hint" id="gs3dHint">WASD move &nbsp;·&nbsp; drag look &nbsp;·&nbsp; click / SPACE fire &nbsp;·&nbsp; Q dash &nbsp;·&nbsp; E nova &nbsp;·&nbsp; 1-4 arm</div>' +
          '<div class="gs3d-damage" id="gs3dDamage"></div>' +
          '<div class="gs3d-stick" id="gs3dStick"><i id="gs3dKnob"></i><small>MOVE</small></div>' +
          '<button class="gs3d-fire" id="gs3dFire" aria-label="Fire">' +
            '<span>FIRE</span><i></i>' +
          '</button>' +
        '</div>' +
        '<div class="gs3d-start show" id="gs3dStart">' +
          '<div class="gs3d-start-inner">' +
            '<div class="gs3d-sigil">' +
              '<span class="gs3d-sigil-ring"></span>' +
              '<svg viewBox="0 0 120 150" aria-hidden="true">' +
                '<defs><radialGradient id="gs3dSigilGlow" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#e8ddff" stop-opacity=".95"/><stop offset=".55" stop-color="#a26bff" stop-opacity=".55"/><stop offset="1" stop-color="#6d28a8" stop-opacity="0"/></radialGradient><linearGradient id="gs3dSigilBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#cdb9ff"/><stop offset="1" stop-color="#7d4dff" stop-opacity=".12"/></linearGradient></defs>' +
                '<ellipse cx="60" cy="68" rx="56" ry="64" fill="url(#gs3dSigilGlow)" opacity=".35"/>' +
                '<path d="M60 12C84 12 98 34 98 60v44c0 6-6 9-10 4-4-5-8 1-12 7-4 6-8 1-12-5-4-6-8-1-12 5-4 6-8 0-12-6-4-6-8 1-12 6-4 5-10 2-10-4V60C18 34 36 12 60 12Z" fill="url(#gs3dSigilBody)" stroke="#c7a8ff" stroke-width="1.5" stroke-opacity=".55"/>' +
                '<ellipse cx="44" cy="61" rx="7" ry="9" fill="#160a26"/><ellipse cx="76" cy="61" rx="7" ry="9" fill="#160a26"/>' +
                '<circle cx="44" cy="59" r="3" fill="#ffd166"/><circle cx="76" cy="59" r="3" fill="#ffd166"/>' +
                '<ellipse cx="60" cy="83" rx="6" ry="7" fill="#160a26" opacity=".8"/>' +
                '<path d="M30 106c8 9 16 13 30 13s22-4 30-13" fill="none" stroke="#d9c9ff" stroke-width="1.3" opacity=".55"/>' +
              '</svg>' +
            '</div>' +
            '<p class="gs3d-kicker">THE VEIL IS THIN</p>' +
            '<h2>SPECTRAL HUNT</h2>' +
            '<p class="gs3d-lede">Step into the graveyard with a relic arm, draft forbidden relics between waves, and dispel <b>22 ghost breeds</b> and three Veil Sovereigns. Every run is a different build.</p>' +
            '<div class="gs3d-feature-row"><span>22 BREEDS</span><span>14 RELICS</span><span>4 RELIC ARMS</span><span>OMENS</span></div>' +
            '<div class="gs3d-armory" id="gs3dArmory">' +
              '<div class="gs3d-armory-head"><span>CHOOSE YOUR RELIC ARM</span><b id="gs3dArmoryPick">SOULFIRE</b></div>' +
              '<div class="gs3d-armory-grid" id="gs3dArmoryGrid"></div>' +
            '</div>' +
            '<div class="gs3d-start-actions">' +
              '<button class="gs3d-primary" id="gs3dStartBtn"><span>ENTER THE GRAVEYARD</span><i>›</i></button>' +
              '<button class="gs3d-secondary" id="gs3dBestiaryBtn">BESTIARY <b id="gs3dBestiaryCount">0/22</b></button>' +
              '<button class="gs3d-secondary" id="gs3dSettingsBtn">SETTINGS</button>' +
            '</div>' +
            '<div class="gs3d-keyrow"><span><kbd>WASD</kbd> move</span><span><kbd>DRAG</kbd> look</span><span><kbd>CLICK</kbd> / <kbd>SPACE</kbd> fire</span><span><kbd>Q</kbd> dash</span><span><kbd>E</kbd> nova</span><span><kbd>1-4</kbd> relic arm</span><span><kbd>ESC</kbd> pause</span></div>' +
            '<p class="gs3d-best">BEST <b id="gs3dBest">0</b></p>' +
          '</div>' +
        '</div>' +
        '<div class="gs3d-over" id="gs3dPauseOverlay">' +
          '<div class="gs3d-over-card">' +
            '<p class="gs3d-kicker">THE HUNT HOLDS ITS BREATH</p>' +
            '<h2>PAUSED</h2>' +
            '<div class="gs3d-over-stats"><div><small>SOULS</small><b id="gs3dPauseScore">0</b></div><div><small>WAVE</small><b id="gs3dPauseWave">1</b></div><div><small>BREED</small><b id="gs3dPauseBreed">0</b></div></div>' +
            '<div class="gs3d-runline" id="gs3dPauseRun"></div>' +
            '<div class="gs3d-over-actions"><button class="gs3d-primary" id="gs3dResumeBtn">RESUME THE HUNT</button><button class="gs3d-secondary" id="gs3dPauseSettingsBtn">SETTINGS</button><button class="gs3d-secondary" id="gs3dQuitBtn">LEAVE GRAVEYARD</button></div>' +
            '<p class="gs3d-fineprint">Tip: relic drafts appear between waves. Stack a build, then spend it on a Sovereign.</p>' +
          '</div>' +
        '</div>' +
        '<div class="gs3d-over" id="gs3dOver">' +
          '<div class="gs3d-over-card">' +
            '<p class="gs3d-kicker">THE VEIL CLAIMS YOU</p>' +
            '<h2>DISPERSED</h2>' +
            '<div class="gs3d-over-stats"><div><small>SOULS</small><b id="gs3dOverScore">0</b></div><div><small>WAVE</small><b id="gs3dOverWave">1</b></div><div><small>ACCURACY</small><b id="gs3dOverAcc">0%</b></div></div>' +
            '<div class="gs3d-runline" id="gs3dOverRun"></div>' +
            '<p class="gs3d-over-best">BEST <b id="gs3dOverBest">0</b></p>' +
            '<div class="gs3d-over-actions"><button class="gs3d-primary" id="gs3dAgainBtn">HAUNT AGAIN</button><button class="gs3d-secondary" id="gs3dOverQuitBtn">LEAVE GRAVEYARD</button></div>' +
          '</div>' +
        '</div>' +
        '<div class="gs3d-module" id="gs3dBestiary">' +
          '<div class="gs3d-module-card">' +
            '<div class="gs3d-module-head"><div><p class="gs3d-kicker">FIELD NOTES</p><h2>THE BESTIARY</h2></div><button class="gs3d-icon-btn" id="gs3dBestiaryClose" aria-label="Close bestiary">✕</button></div>' +
            '<div class="gs3d-bestiary-grid" id="gs3dBestiaryGrid"></div>' +
            '<p class="gs3d-fineprint">Dispel a breed to record it. The three Veil Sovereigns keep their own book.</p>' +
          '</div>' +
        '</div>' +
        '<div class="gs3d-module gs3d-draft" id="gs3dDraft">' +
          '<div class="gs3d-module-card gs3d-draft-panel">' +
            '<p class="gs3d-kicker">WAVE CLEARED</p>' +
            '<h2>CLAIM A RELIC</h2>' +
            '<p class="gs3d-draft-sub">The veil offers three fragments. Choose one — it stacks for the rest of this run.</p>' +
            '<div class="gs3d-draft-grid" id="gs3dDraftCards"></div>' +
            '<div class="gs3d-draft-foot"><button class="gs3d-secondary" id="gs3dDraftSkip" type="button">TAKE NOTHING</button><span><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> to choose</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="gs3d-module" id="gs3dSettings">' +
          '<div class="gs3d-module-card gs3d-settings-card">' +
            '<div class="gs3d-module-head"><div><p class="gs3d-kicker">TUNING THE VEIL</p><h2>SETTINGS</h2></div><button class="gs3d-icon-btn" id="gs3dSettingsClose" aria-label="Close settings">✕</button></div>' +
            '<div class="gs3d-settings-grid">' +
              '<label class="gs3d-setting range-row"><span><b>LOOK SENSITIVITY</b><small>Mouse and touch camera speed</small></span><em id="gs3dSensVal">1.00×</em><input id="gs3dSens" type="range" min="0.5" max="2" step="0.05" value="1"></label>' +
              '<label class="gs3d-setting"><span><b>INVERT LOOK</b><small>Pull up to look down</small></span><input id="gs3dInvert" type="checkbox" class="gs3d-toggle"></label>' +
              '<label class="gs3d-setting"><span><b>AIM ASSIST</b><small>Gentle bolt magnetism</small></span><input id="gs3dAimAssist" type="checkbox" class="gs3d-toggle"></label>' +
              '<label class="gs3d-setting"><span><b>DAMAGE NUMBERS</b><small>Show hits and criticals</small></span><input id="gs3dDamageNumbers" type="checkbox" class="gs3d-toggle"></label>' +
              '<label class="gs3d-setting"><span><b>SCREEN SHAKE</b><small>Camera impact feedback</small></span><input id="gs3dShake" type="checkbox" class="gs3d-toggle"></label>' +
              '<label class="gs3d-setting"><span><b>REDUCED MOTION</b><small>Calmer overlays and ambience</small></span><input id="gs3dReducedMotion" type="checkbox" class="gs3d-toggle"></label>' +
              '<label class="gs3d-setting"><span><b>RENDER QUALITY</b><small>Lower this on older phones</small></span><select id="gs3dQuality" class="gs3d-select"><option value="low">LOW</option><option value="medium">MEDIUM</option><option value="high">HIGH</option></select></label>' +
            '</div>' +
            '<p class="gs3d-fineprint">Settings save automatically in this browser. Quality changes apply live.</p>' +
          '</div>' +
        '</div>' +
        '<div class="gs3d-loading" id="gs3dLoading"><div class="gs3d-load-ring"></div><span>Summoning the veil...</span></div>' +
        '<div class="gs3d-fatal" id="gs3dFatal"><div><h3>THE VEIL IS BLOCKED</h3><p id="gs3dFatalText"></p><button class="gs3d-primary" id="gs3dFatalReload">RELOAD THE GRAVEYARD</button></div></div>' +
      '</div>';
    state.root = root;
    state.settings = normalizeSettings(loadFromStorage(SETTINGS_KEY, DEFAULT_SETTINGS));
    var savedArm = loadFromStorage(ARMORY_KEY, 'blaster');
    state.armoryKey = weaponByKey(savedArm).key;
    cacheUI();
    try {
      state.radarCtx = state.ui.radar ? state.ui.radar.getContext('2d') : null;
    } catch (radarErr) {
      state.radarCtx = null;
    }
    renderArmory();
    fillSettingsUI();
    applySettings();
    bindUI();
    if (window.ResizeObserver) {
      state.resizeObserver = new ResizeObserver(function () { resize(); });
      state.resizeObserver.observe(state.ui.stage);
    }
    window.addEventListener('resize', resize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state.mode === 'play') pauseGame(true);
    });
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (coarse || ('ontouchstart' in window && !fine && (navigator.maxTouchPoints || 0) > 0)) {
      state.ui.stage.classList.add('touch');
    }
    state.best = +loadFromStorage('spooky_spectral_best', 0) || 0;
    var saved = loadFromStorage('spooky_spectral_bestiary', {});
    state.discovered = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    if (state.ui.best) state.ui.best.textContent = fmt(state.best);
  }

  function cacheUI() {
    var ids = ['Stage', 'Canvas', 'Hud', 'Score', 'Wave', 'Combo', 'ComboChip', 'Breed', 'Sound', 'Pause',
      'Boss', 'BossFill', 'BossName', 'Reticle', 'FloatLayer', 'Toast', 'WaveBanner', 'ShieldNum', 'ShieldFill', 'PauseOverlay',
      'Power', 'Hint', 'Damage', 'Stick', 'Knob', 'Fire', 'Start', 'StartBtn', 'BestiaryBtn',
      'BestiaryCount', 'Best', 'PauseScore', 'PauseWave', 'PauseBreed', 'ResumeBtn', 'QuitBtn', 'PauseRun',
      'Over', 'OverScore', 'OverWave', 'OverAcc', 'OverBest', 'AgainBtn', 'OverQuitBtn', 'OverRun',
      'Bestiary', 'BestiaryClose', 'BestiaryGrid', 'Loading', 'Fatal', 'FatalText', 'FatalReload',
      'Weapon', 'WeaponName', 'Omen', 'OmenChip', 'Radar', 'RadarWrap', 'Dash', 'DashCd', 'Nova', 'NovaCd',
      'Abilities', 'ArmoryGrid', 'ArmoryPick', 'SettingsBtn', 'PauseSettingsBtn', 'Settings', 'SettingsClose',
      'Sens', 'SensVal', 'Invert', 'AimAssist', 'DamageNumbers', 'Shake', 'ReducedMotion', 'Quality',
      'Draft', 'DraftCards', 'DraftSkip'];
    var ui = {};
    ids.forEach(function (id) { ui[id.charAt(0).toLowerCase() + id.slice(1)] = $('gs3d' + id); });
    state.ui = ui;
  }

  function hexColor(n) { return '#' + ('000000' + (n || 0).toString(16)).slice(-6); }

  function renderArmory() {
    var grid = state.ui && state.ui.armoryGrid;
    if (!grid) return;
    grid.innerHTML = WEAPONS.map(function (w) {
      return '<button class="gs3d-armory-card" type="button" data-weapon="' + w.key + '">' +
        '<i style="--arm:' + hexColor(w.color) + '">' + w.icon + '</i>' +
        '<span><b>' + w.name + '</b><small>' + w.desc + '</small></span>' +
        '</button>';
    }).join('');
    updateArmorySelection();
  }

  function updateArmorySelection() {
    var w = weaponByKey(state.armoryKey);
    if (state.ui && state.ui.armoryPick) state.ui.armoryPick.textContent = w.short;
    if (state.ui && state.ui.armoryGrid) {
      var cards = state.ui.armoryGrid.querySelectorAll('[data-weapon]');
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle('selected', cards[i].getAttribute('data-weapon') === w.key);
      }
    }
    if (state.ui && state.ui.weaponName) state.ui.weaponName.textContent = w.short;
  }

  function selectArmory(key) {
    state.armoryKey = weaponByKey(key).key;
    saveToStorage(ARMORY_KEY, state.armoryKey);
    updateArmorySelection();
    applyWeaponVisual();
    playSound('pickup');
  }

  function cycleWeapon() {
    var current = state.game && state.game.active ? state.game.weaponKey : state.armoryKey;
    var idx = 0;
    for (var i = 0; i < WEAPONS.length; i++) if (WEAPONS[i].key === current) idx = i;
    var next = WEAPONS[(idx + 1) % WEAPONS.length];
    if (state.game && state.game.active) switchWeapon(next.key);
    else selectArmory(next.key);
  }

  function switchWeapon(key) {
    if (!state.game || !state.game.active) { selectArmory(key); return; }
    var w = weaponByKey(key);
    state.game.weaponKey = w.key;
    state.armoryKey = w.key;
    saveToStorage(ARMORY_KEY, w.key);
    state.nextFire = 0;
    applyWeaponVisual();
    updateArmorySelection();
    updateHUD(true);
    showToast('RELIC ARM — ' + w.name.toUpperCase(), 1300);
    playSound('pickup');
  }

  function applyWeaponVisual() {
    if (!state.weapon) return;
    var w = activeWeapon();
    state.weapon.crystal.material.color.setHex(w.glow);
    state.weapon.crystal.material.emissive.setHex(w.color);
    state.weapon.muzzle.material.color.setHex(w.glow);
    state.weapon.light.color.setHex(w.color);
  }

  function bindAbilityButton(btn, fn) {
    if (!btn) return;
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
  }

  function fillSettingsUI() {
    var ui = state.ui, s = state.settings;
    if (!ui || !s) return;
    if (ui.sens) ui.sens.value = s.sens;
    if (ui.sensVal) ui.sensVal.textContent = s.sens.toFixed(2) + '×';
    if (ui.invert) ui.invert.checked = !!s.invert;
    if (ui.aimAssist) ui.aimAssist.checked = !!s.aimAssist;
    if (ui.damageNumbers) ui.damageNumbers.checked = !!s.damageNumbers;
    if (ui.shake) ui.shake.checked = !!s.shake;
    if (ui.reducedMotion) ui.reducedMotion.checked = !!s.reducedMotion;
    if (ui.quality) ui.quality.value = s.quality;
  }

  function bindSettingControls() {
    var ui = state.ui;
    if (!ui) return;
    if (ui.sens) {
      ui.sens.addEventListener('input', function () {
        state.settings.sens = clamp(parseFloat(ui.sens.value) || 1, 0.5, 2);
        if (ui.sensVal) ui.sensVal.textContent = state.settings.sens.toFixed(2) + '×';
        saveSettings();
      });
    }
    [
      ['invert', ui.invert], ['aimAssist', ui.aimAssist], ['damageNumbers', ui.damageNumbers],
      ['shake', ui.shake], ['reducedMotion', ui.reducedMotion]
    ].forEach(function (pair) {
      var input = pair[1];
      if (!input) return;
      input.addEventListener('change', function () {
        state.settings[pair[0]] = !!input.checked;
        saveSettings();
      });
    });
    if (ui.quality) {
      ui.quality.addEventListener('change', function () {
        state.settings.quality = ui.quality.value;
        saveSettings();
      });
    }
  }

  function openSettings() {
    if (!state.ui || !state.ui.settings) return;
    if (state.mode === 'play') pauseGame(true);
    fillSettingsUI();
    state.ui.settings.classList.add('show');
  }

  function closeSettings() {
    if (state.ui && state.ui.settings) state.ui.settings.classList.remove('show');
  }

  function bindUI() {
    var ui = state.ui;
    ui.startBtn.onclick = startGame;
    ui.againBtn.onclick = startGame;
    ui.pause.onclick = function () { pauseGame(true); };
    ui.resumeBtn.onclick = function () { pauseGame(false); };
    ui.quitBtn.onclick = function () { stopGame(); showStartIfIdle(); };
    ui.overQuitBtn.onclick = function () { stopGame(); showStartIfIdle(); };
    ui.sound.onclick = toggleSound;
    ui.bestiaryBtn.onclick = openBestiary;
    ui.bestiaryClose.onclick = closeBestiary;
    ui.settingsBtn.onclick = openSettings;
    ui.pauseSettingsBtn.onclick = openSettings;
    ui.settingsClose.onclick = closeSettings;
    ui.fatalReload.onclick = function () { location.reload(); };
    if (ui.weapon) ui.weapon.onclick = cycleWeapon;
    if (ui.armoryGrid) {
      ui.armoryGrid.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('[data-weapon]') : null;
        if (btn) selectArmory(btn.getAttribute('data-weapon'));
      });
    }
    if (ui.draft) {
      ui.draft.addEventListener('click', function (e) {
        var card = e.target && e.target.closest ? e.target.closest('[data-boon]') : null;
        if (card) chooseRelic(card.getAttribute('data-boon'));
      });
    }
    if (ui.draftSkip) ui.draftSkip.onclick = skipDraft;
    bindAbilityButton(ui.dash, dashAbility);
    bindAbilityButton(ui.nova, novaAbility);
    bindSettingControls();

    ui.fire.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      state.firing = true;
      fire();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
      ui.fire.addEventListener(evt, function () { state.firing = false; });
    });

    var stick = ui.stick, knob = ui.knob;
    var stickId = null, origin = null;
    stick.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      stickId = e.pointerId;
      origin = { x: e.clientX, y: e.clientY };
      stick.setPointerCapture(e.pointerId);
      stick.classList.add('active');
    });
    stick.addEventListener('pointermove', function (e) {
      if (e.pointerId !== stickId || !origin) return;
      e.preventDefault(); e.stopPropagation();
      var dx = e.clientX - origin.x, dy = e.clientY - origin.y;
      var len = Math.hypot(dx, dy) || 1;
      var max = 38;
      var cl = Math.min(1, len / max);
      var nx = dx / len * cl, ny = dy / len * cl;
      state.stick = { x: nx, y: -ny };
      knob.style.transform = 'translate(' + (nx * max) + 'px,' + (ny * max) + 'px)';
    });
    function endStick(e) {
      if (stickId !== null && e.pointerId !== stickId) return;
      stickId = null; origin = null; state.stick = null;
      stick.classList.remove('active');
      knob.style.transform = '';
    }
    stick.addEventListener('pointerup', endStick);
    stick.addEventListener('pointercancel', endStick);
    stick.addEventListener('pointerleave', endStick);

    var canvas = ui.canvas;
    canvas.addEventListener('pointerdown', function (e) {
      if (state.mode !== 'play') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      state.look = {
        id: e.pointerId, x: e.clientX, y: e.clientY,
        startX: e.clientX, startY: e.clientY,
        moved: 0, t: nowMs()
      };
      if (!state.ui.stage.classList.contains('touch')) { state.firing = true; fire(); }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!state.look || state.look.id !== e.pointerId) return;
      e.preventDefault();
      var dx = e.clientX - state.look.x, dy = e.clientY - state.look.y;
      var sens = setting('sens') || 1;
      var invert = setting('invert') ? 1 : -1;
      state.player.yaw -= dx * 0.0034 * sens;
      state.player.pitch = clamp(state.player.pitch + dy * 0.0030 * sens * invert, -1.25, 1.25);
      state.look.moved += Math.abs(dx) + Math.abs(dy);
      state.look.x = e.clientX;
      state.look.y = e.clientY;
    });
    function endLook(e) {
      if (!state.look || state.look.id !== e.pointerId) return;
      var quick = state.look.moved < 9 && nowMs() - state.look.t < 420;
      state.look = null;
      state.firing = false;
      if (quick && state.mode === 'play') fire();
    }
    canvas.addEventListener('pointerup', endLook);
    canvas.addEventListener('pointercancel', function () { state.look = null; state.firing = false; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('pointerup', function (e) {
      if (state.look && state.look.id === e.pointerId) { state.look = null; state.firing = false; }
    }, { passive: true });
    window.addEventListener('pointercancel', function (e) {
      if (state.look && state.look.id === e.pointerId) { state.look = null; state.firing = false; }
    }, { passive: true });
  }

  function showStartIfIdle() {
    if (!state.ui) return;
    if (state.mode === 'idle' || state.mode === 'loading') {
      state.mode = 'idle';
      state.ui.start.classList.add('show');
      state.ui.over.classList.remove('show');
      state.ui.pauseOverlay.classList.remove('show');
      if (state.ui.draft) state.ui.draft.classList.remove('show');
      if (state.ui.settings) state.ui.settings.classList.remove('show');
      state.ui.hud.classList.remove('playing');
      if (state.ui.best) state.ui.best.textContent = fmt(state.best);
      updateArmorySelection();
      updateBestiaryCount();
      if (state.renderer) {
        spawnIdleGhosts();
        startLoop();
      }
    }
  }

  function setLoading(on, text) {
    if (!state.ui || !state.ui.loading) return;
    state.ui.loading.classList.toggle('show', !!on);
    var span = state.ui.loading.querySelector('span');
    if (span && text) span.textContent = text;
  }

  function showFatal(title, text) {
    if (!state.ui) return;
    var fatal = state.ui.fatal;
    if (!fatal) return;
    var h = fatal.querySelector('h3');
    if (h && title) h.textContent = title;
    if (state.ui.fatalText && text) state.ui.fatalText.textContent = text;
    fatal.classList.add('show');
  }

  function updateBestiaryCount() {
    if (!state.ui || !state.ui.bestiaryCount) return;
    var n = 0;
    TYPES.forEach(function (t) { if (state.discovered[t.key]) n++; });
    state.ui.bestiaryCount.textContent = n + '/' + TYPES.length;
  }

  function openBestiary() {
    if (!state.ui) return;
    renderBestiary();
    state.ui.bestiary.classList.add('show');
  }
  function closeBestiary() {
    if (state.ui) state.ui.bestiary.classList.remove('show');
  }
  function renderBestiary() {
    var grid = state.ui.bestiaryGrid;
    if (!grid) return;
    grid.innerHTML = TYPES.map(function (t) {
      var got = !!state.discovered[t.key];
      var color = '#' + ('000000' + t.color.toString(16)).slice(-6);
      return '<div class="gs3d-beast' + (got ? ' got' : '') + '">' +
        '<i style="--beast:' + color + '"></i>' +
        '<div><b>' + (got ? t.name : '? ? ?') + '</b><small>' + (got ? t.trait : 'Dispel this breed to record it.') + '</small></div>' +
        '</div>';
    }).join('');
  }

  function onKeyDown(e) {
    if (!state.root || !state.root.isConnected) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    var k = e.key.toLowerCase();
    if (k === 'escape') {
      if (state.ui && state.ui.settings && state.ui.settings.classList.contains('show')) { closeSettings(); e.preventDefault(); return; }
      if (state.ui && state.ui.bestiary && state.ui.bestiary.classList.contains('show')) { closeBestiary(); e.preventDefault(); return; }
      if (state.mode === 'play') { pauseGame(true); e.preventDefault(); }
      else if (state.mode === 'paused') { pauseGame(false); e.preventDefault(); }
      return;
    }
    if (state.mode === 'draft') {
      if (k === '1' || k === '2' || k === '3') {
        var cards = state.ui.draftCards ? state.ui.draftCards.querySelectorAll('[data-boon]') : [];
        var pick = cards[parseInt(k, 10) - 1];
        if (pick) chooseRelic(pick.getAttribute('data-boon'));
        e.preventDefault();
      } else if (k === 'enter') {
        var first = state.ui.draftCards ? state.ui.draftCards.querySelector('[data-boon]') : null;
        if (first) chooseRelic(first.getAttribute('data-boon'));
        e.preventDefault();
      }
      return;
    }
    if (state.mode !== 'play') {
      if (k === 'enter') {
        if (state.ui && (state.ui.bestiary.classList.contains('show') || state.ui.settings.classList.contains('show'))) return;
        if (state.mode === 'paused') pauseGame(false);
        else if (state.mode === 'over' || state.mode === 'idle') startGame();
      }
      return;
    }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'q', 'e'].indexOf(k) >= 0) {
      e.preventDefault();
    }
    state.keys[k] = true;
    if (k === ' ') fire();
    if (k === 'q') dashAbility();
    if (k === 'e') novaAbility();
    if (k === '1' || k === '2' || k === '3' || k === '4') switchWeapon(WEAPONS[parseInt(k, 10) - 1].key);
    if (k === 'r') { pauseGame(false); startGame(); }
  }
  function onKeyUp(e) {
    state.keys[e.key.toLowerCase()] = false;
  }

  function resize() {
    if (!state.ui || !state.ui.stage || !state.renderer) return;
    var w = state.ui.stage.clientWidth || 800;
    var h = state.ui.stage.clientHeight || 540;
    state.renderer.setSize(w, h, false);
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
  }

  function pauseGame(on) {
    if (on) {
      if (state.mode !== 'play' || !state.game) return;
      state.mode = 'paused';
      state.firing = false;
      state.look = null;
      state.keys = {};
      resetStick();
      state.ui.pauseOverlay.classList.add('show');
      state.ui.pauseScore.textContent = fmt(state.game.score);
      state.ui.pauseWave.textContent = state.game.wave;
      state.ui.pauseBreed.textContent = state.game.kills;
      if (state.ui.pauseRun) {
        state.ui.pauseRun.innerHTML = runLineMarkup() +
          '<div class="gs3d-relics">' + relicMarkup() + '</div>';
      }
      if (state.audio && state.audio.ctx && state.audio.ctx.state === 'running') {
        try { state.audio.ctx.suspend(); } catch (e) {}
      }
    } else {
      if (state.mode !== 'paused') return;
      state.mode = 'play';
      state.ui.pauseOverlay.classList.remove('show');
      if (state.audio && state.audio.ctx && state.audio.ctx.state === 'suspended') {
        try { state.audio.ctx.resume(); } catch (e) {}
      }
    }
  }

  function gameOver() {
    if (!state.game) return;
    state.mode = 'over';
    state.firing = false;
    state.game.active = false;
    state.ui.hud.classList.remove('playing');
    var g = state.game;
    var best = commitBest();
    state.ui.overScore.textContent = fmt(g.score);
    state.ui.overWave.textContent = g.wave;
    state.ui.overAcc.textContent = (g.shots ? Math.round(Math.min(100, g.hits / g.shots * 100)) : 0) + '%';
    state.ui.overBest.textContent = fmt(best);
    if (state.ui.overRun) {
      state.ui.overRun.innerHTML = runLineMarkup() +
        '<div class="gs3d-relics">' + relicMarkup() + '</div>';
    }
    state.ui.over.classList.add('show');
    state.ui.boss.classList.remove('show');
    if (state.ui.draft) state.ui.draft.classList.remove('show');
    if (state.ui.settings) state.ui.settings.classList.remove('show');
    state.enemyShots.forEach(removeEnemyShot);
    state.enemyShots.length = 0;
    state.projectiles.forEach(removeProjectile);
    state.projectiles.length = 0;
    updateBestiaryCount();
    playSound('over');
  }

  function showToast(text, ms) {
    if (!state.ui || !state.ui.toast) return;
    var toast = state.ui.toast;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { toast.classList.remove('show'); }, ms || 1700);
  }

  function updateOmenChip(omen) {
    if (!state.ui || !state.ui.omenChip) return;
    state.ui.omenChip.classList.toggle('show', !!omen);
    if (omen) {
      state.ui.omen.textContent = omen.name;
      state.ui.omenChip.style.setProperty('--omen', omen.tone);
      state.ui.omenChip.title = omen.desc;
    }
  }

  function showWaveBanner(wave, omen) {
    var b = state.ui.waveBanner;
    if (!b) return;
    var bossDef = wave % 5 === 0 ? BOSSES[(Math.floor(wave / 5) - 1) % BOSSES.length] : null;
    b.querySelector('small').textContent = bossDef ? 'VEIL SOVEREIGN' : (omen ? 'OMEN OF THE VEIL' : 'BLOOD MOON');
    b.querySelector('strong').textContent = 'WAVE ' + wave;
    b.querySelector('span').textContent = bossDef ? bossDef.title : (omen ? omen.desc : choose([
      'THE DEAD ARE RESTLESS', 'THE MIST IS THIRSTY', 'SOMETHING IS WATCHING',
      'THE VEIL IS TORN', 'THE MOON IS BLEEDING', 'KEEP YOUR LAMP LIT'
    ]));
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    setTimeout(function () { b.classList.remove('show'); }, 2200);
  }

  function toggleSound() {
    state.muted = !state.muted;
    if (state.audio && state.audio.master) {
      state.audio.master.gain.setTargetAtTime(state.muted ? 0 : 0.18, state.audio.ctx.currentTime, 0.08);
    }
    if (state.ui && state.ui.sound) state.ui.sound.classList.toggle('muted', state.muted);
    if (!state.muted) initAudio();
  }

  /* ---------------------------------------------------------------- audio */
  function initAudio() {
    if (state.audio || state.muted) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      var ctx = new Ctx();
      var master = ctx.createGain();
      master.gain.value = 0.18;
      master.connect(ctx.destination);
      state.audio = { ctx: ctx, master: master, ambient: null };
      startAmbient();
    } catch (e) { state.audio = null; }
  }

  function startAmbient() {
    var a = state.audio;
    if (!a || a.ambient) return;
    var ctx = a.ctx;
    var bed = ctx.createGain();
    bed.gain.value = 0.12;
    bed.connect(a.master);

    var o1 = ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = 46;
    var g1 = ctx.createGain(); g1.gain.value = 0.25;
    o1.connect(g1); g1.connect(bed); o1.start();

    var o2 = ctx.createOscillator();
    o2.type = 'triangle'; o2.frequency.value = 69;
    var g2 = ctx.createGain(); g2.gain.value = 0.07;
    o2.connect(g2); g2.connect(bed); o2.start();

    var lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.09;
    var lfoGain = ctx.createGain(); lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain); lfoGain.connect(g1.gain); lfo.start();

    var noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    var data = noise.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.22;
    var src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    var filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 260; filter.Q.value = 1.2;
    var ng = ctx.createGain(); ng.gain.value = 0.09;
    src.connect(filter); filter.connect(ng); ng.connect(bed); src.start();
    a.ambient = { bed: bed, nodes: [o1, o2, lfo, src] };
  }

  function tone(freq, dur, type, vol, slide) {
    var a = state.audio;
    if (!a || state.muted) return;
    var ctx = a.ctx;
    var t0 = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur);
    g.gain.setValueAtTime(vol == null ? 0.12 : vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  function playSound(kind) {
    if (kind === 'shot') {
      tone(1200 + Math.random() * 260, 0.09, 'sawtooth', 0.07, 180);
      tone(520, 0.13, 'sine', 0.08, 90);
    } else if (kind === 'hit') {
      tone(190, 0.11, 'square', 0.08, 60);
      tone(1600 + Math.random() * 500, 0.06, 'triangle', 0.05, 700);
    } else if (kind === 'kill') {
      tone(720, 0.18, 'sine', 0.10, 220);
      tone(1080, 0.22, 'triangle', 0.06, 380);
    } else if (kind === 'damage') {
      tone(90, 0.35, 'sawtooth', 0.13, 42);
    } else if (kind === 'pickup') {
      [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, 0.18, 'sine', 0.08, f * 1.4); }, i * 55); });
    } else if (kind === 'over') {
      [220, 174, 138, 110].forEach(function (f, i) { setTimeout(function () { tone(f, 0.5, 'triangle', 0.1, f * 0.7); }, i * 180); });
    } else if (kind === 'wave') {
      tone(196, 0.5, 'sine', 0.09, 392);
      setTimeout(function () { tone(294, 0.6, 'sine', 0.08, 588); }, 180);
    } else if (kind === 'dash') {
      tone(880, 0.14, 'sawtooth', 0.055, 190);
      setTimeout(function () { tone(420, 0.1, 'sine', 0.045, 120); }, 45);
    } else if (kind === 'nova') {
      [196, 294, 392, 588].forEach(function (f, i) {
        setTimeout(function () { tone(f, 0.42, 'sine', 0.075, f * 1.8); }, i * 42);
      });
      tone(72, 0.55, 'triangle', 0.11, 44);
    }
  }


  /* ------------------------------------------------------------- textures */
  function makeCanvas(size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  function makeGroundTexture() {
    var size = 512, c = makeCanvas(size), x = c.getContext('2d');
    var g = x.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    g.addColorStop(0, '#2a1b39');
    g.addColorStop(0.55, '#1b1028');
    g.addColorStop(1, '#0d0716');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    for (var i = 0; i < 9000; i++) {
      var a = Math.random() * 0.16;
      x.fillStyle = 'rgba(' + (80 + Math.random() * 80 | 0) + ',' + (60 + Math.random() * 70 | 0) + ',' + (110 + Math.random() * 90 | 0) + ',' + a + ')';
      x.fillRect(Math.random() * size, Math.random() * size, Math.random() * 3 + 1, Math.random() * 2 + 1);
    }
    for (var j = 0; j < 70; j++) {
      x.beginPath();
      var sx = Math.random() * size, sy = Math.random() * size;
      x.moveTo(sx, sy);
      for (var k = 0; k < 4; k++) {
        sx += rand(-38, 38); sy += rand(-38, 38);
        x.lineTo(sx, sy);
      }
      x.strokeStyle = 'rgba(5,2,10,' + rand(0.25, 0.6) + ')';
      x.lineWidth = rand(0.6, 2.4);
      x.stroke();
    }
    for (var p = 0; p < 80; p++) {
      x.beginPath();
      var px = Math.random() * size, py = Math.random() * size;
      x.ellipse(px, py, rand(2, 8), rand(1, 4), rand(0, TAU), 0, TAU);
      x.fillStyle = 'rgba(140,120,180,' + rand(0.04, 0.14) + ')';
      x.fill();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  function makeGlowTexture() {
    var size = 128, c = makeCanvas(size), x = c.getContext('2d');
    var g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.16, 'rgba(255,255,255,.92)');
    g.addColorStop(0.44, 'rgba(255,255,255,.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeFogTexture() {
    var size = 256, c = makeCanvas(size), x = c.getContext('2d');
    var g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,.42)');
    g.addColorStop(0.38, 'rgba(255,255,255,.18)');
    g.addColorStop(0.72, 'rgba(255,255,255,.04)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    for (var i = 0; i < 18; i++) {
      x.beginPath();
      x.ellipse(rand(30, size - 30), rand(30, size - 30), rand(20, 80), rand(8, 28), rand(0, TAU), 0, TAU);
      x.fillStyle = 'rgba(255,255,255,' + rand(0.01, 0.045) + ')';
      x.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  function makeRitualTexture() {
    var size = 512, c = makeCanvas(size), x = c.getContext('2d');
    x.clearRect(0, 0, size, size);
    x.save();
    x.translate(size / 2, size / 2);
    x.strokeStyle = 'rgba(185,140,255,.85)';
    x.shadowColor = '#9b5cff';
    x.shadowBlur = 18;
    x.lineWidth = 3;
    [0.92, 0.72, 0.63].forEach(function (r) {
      x.beginPath(); x.arc(0, 0, size / 2 * r, 0, TAU); x.stroke();
    });
    x.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + i * TAU / 5 * 2;
      var px = Math.cos(a) * size * 0.33, py = Math.sin(a) * size * 0.33;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath(); x.stroke();
    x.shadowBlur = 8;
    x.fillStyle = 'rgba(200,170,255,.9)';
    x.font = 'bold 24px serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    var glyphs = ['☾', '✶', '☠', '⚰', '☾', '✶', '☠', '⚰', '☾', '✶', '☠', '⚰'];
    for (var j = 0; j < 12; j++) {
      var ang = j * TAU / 12;
      x.save();
      x.rotate(ang);
      x.translate(0, -size * 0.405);
      x.fillText(glyphs[j], 0, 0);
      x.restore();
    }
    x.restore();
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeNoiseTexture(size, base) {
    var c = makeCanvas(size || 128), x = c.getContext('2d');
    x.fillStyle = base || '#140b20'; x.fillRect(0, 0, c.width, c.height);
    for (var i = 0; i < 5000; i++) {
      x.fillStyle = 'rgba(255,255,255,' + rand(0.01, 0.055) + ')';
      x.fillRect(Math.random() * c.width, Math.random() * c.height, rand(1, 3), rand(1, 3));
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function seeded(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --------------------------------------------------------------- scene */
  function initScene() {
    if (state.renderer) { resize(); return; }
    if (!window.THREE) return;
    THREE = window.THREE;
    var canvas = state.ui.canvas;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (err) {
      setLoading(false);
      showFatal('WEBGL IS UNAVAILABLE', 'This graveyard needs WebGL. Turn on hardware acceleration in your browser and reload.');
      return;
    }
    var coarse = state.ui.stage.classList.contains('touch');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.35 : 1.65));
    renderer.setSize(state.ui.stage.clientWidth || 800, state.ui.stage.clientHeight || 540, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x07030f, 1);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07030f);
    scene.fog = new THREE.FogExp2(0x0b0618, 0.022);

    var camera = new THREE.PerspectiveCamera(72, 1, 0.08, 150);
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
    state.glowTex = makeGlowTexture();
    state.threeReady = true;
    state.rng = seeded(20261031);
    state.env = {
      moon: null, moonGlow: null, stars: null, stars2: null,
      fogPlanes: [], flames: [], glowSprites: [], trees: [], auroras: [],
      embers: null, embers2: null, wisps: [], ritual: null, ritualRing: null,
      pumpkins: [], candles: [], weaponsLight: null
    };

    applySettings();
    buildEnvironment();
    buildWeapon();
    state.player.x = 0; state.player.z = 15;
    state.player.yaw = 0; state.player.pitch = 0;
    state.mode = 'idle';
    spawnIdleGhosts();
    setLoading(false);
    updateHUD(true);
    updateBestiaryCount();
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      showToast('The veil flickered. Reload to re-enter the graveyard.', 5000);
    });
    canvas.addEventListener('webglcontextrestored', function () { location.reload(); });
    resize();
    startLoop();
  }

  function buildEnvironment() {
    var scene = state.scene;
    var coarse = state.ui.stage.classList.contains('touch');
    var env = state.env;
    var moonLight = new THREE.HemisphereLight(0x9280ff, 0x09040f, 0.62);
    scene.add(moonLight);

    var key = new THREE.DirectionalLight(0xc3d8ff, 1.15);
    key.position.set(-26, 42, -24);
    key.castShadow = true;
    key.shadow.mapSize.set(coarse ? 512 : 1024, coarse ? 512 : 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 110;
    key.shadow.camera.left = -34;
    key.shadow.camera.right = 34;
    key.shadow.camera.top = 34;
    key.shadow.camera.bottom = -34;
    key.shadow.bias = -0.0008;
    scene.add(key);
    scene.add(new THREE.AmbientLight(0x241238, 0.62));

    var orange = new THREE.PointLight(0xff6a12, 1.35, 16, 2);
    orange.position.set(0, 2.3, 2.5);
    scene.add(orange);
    var violet = new THREE.PointLight(0x8b5cf6, 1.2, 22, 2);
    violet.position.set(-4, 4.5, -5);
    scene.add(violet);

    /* Ground */
    var groundTex = makeGroundTexture();
    var bump = groundTex.clone();
    bump.needsUpdate = true;
    bump.encoding = THREE.LinearEncoding;
    var groundGeo = new THREE.PlaneGeometry(110, 110, 120, 120);
    groundGeo.rotateX(-Math.PI / 2);
    var gp = groundGeo.attributes.position;
    for (var i = 0; i < gp.count; i++) {
      var gx = gp.getX(i), gz = gp.getZ(i);
      var d = Math.sqrt(gx * gx + gz * gz);
      var bend = (Math.sin(gx * 0.42) * 0.12 + Math.cos(gz * 0.37) * 0.10 + Math.sin((gx + gz) * 0.19) * 0.16);
      gp.setY(i, bend * clamp((d - 4) / 13, 0, 1) - 0.03);
    }
    groundGeo.computeVertexNormals();
    var groundMat = new THREE.MeshStandardMaterial({
      map: groundTex, bumpMap: bump, bumpScale: 0.16,
      color: 0xb9a8d7, roughness: 0.94, metalness: 0.03
    });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);

    /* Grass tufts */
    var grassMat = new THREE.MeshStandardMaterial({ color: 0x38244d, roughness: 1, metalness: 0 });
    var grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 0.44, 3), grassMat, 1300);
    grass.frustumCulled = false;
    var dummy = new THREE.Object3D();
    for (var gi = 0; gi < 1300; gi++) {
      var ga = Math.random() * TAU, gr = rand(4, 38);
      dummy.position.set(Math.cos(ga) * gr, rand(0.08, 0.19), Math.sin(ga) * gr);
      dummy.rotation.set(rand(-0.2, 0.2), rand(0, TAU), rand(-0.25, 0.25));
      dummy.scale.set(rand(0.7, 1.5), rand(0.5, 1.6), rand(0.7, 1.5));
      dummy.updateMatrix();
      grass.setMatrixAt(gi, dummy.matrix);
    }
    grass.instanceMatrix.needsUpdate = true;
    scene.add(grass);

    /* Moon and stars */
    var moonMat = new THREE.MeshBasicMaterial({ color: 0xffefc9, fog: false });
    var moon = new THREE.Mesh(new THREE.SphereGeometry(4.6, 32, 24), moonMat);
    moon.position.set(-30, 39, -58);
    scene.add(moon);
    env.moon = moon;
    var moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0xffdcaa, transparent: true, opacity: 0.42,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    moonGlow.position.copy(moon.position);
    moonGlow.scale.set(32, 32, 1);
    scene.add(moonGlow);
    env.moonGlow = moonGlow;

    function starField(count, color, size, radius) {
      var pos = new Float32Array(count * 3);
      for (var s = 0; s < count; s++) {
        var theta = Math.random() * TAU;
        var phi = Math.acos(rand(0.15, 1));
        var r = radius;
        pos[s * 3] = Math.sin(phi) * Math.cos(theta) * r;
        pos[s * 3 + 1] = Math.abs(Math.cos(phi)) * r + 12;
        pos[s * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var mat = new THREE.PointsMaterial({
        color: color, size: size, map: makeGlowTexture(), transparent: true,
        opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false
      });
      var points = new THREE.Points(geo, mat);
      scene.add(points);
      return points;
    }
    env.stars = starField(1300, 0xcfc4ff, 0.3, 92);
    env.stars2 = starField(240, 0xffd58a, 0.5, 110);

    /* Aurora/veil ribbons */
    var fogTex = makeFogTexture();
    for (var ai = 0; ai < 4; ai++) {
      var aurora = new THREE.Mesh(
        new THREE.PlaneGeometry(94, 26),
        new THREE.MeshBasicMaterial({
          map: fogTex, color: ai % 2 ? 0x7b45ff : 0x2b9bff, transparent: true,
          opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
        })
      );
      aurora.position.set(rand(-16, 16), rand(17, 28), -48 - ai * 3);
      aurora.rotation.z = rand(-0.4, 0.4);
      aurora.userData.baseX = aurora.position.x;
      aurora.userData.phase = rand(0, TAU);
      scene.add(aurora);
      env.auroras.push(aurora);
    }

    /* Ritual circle */
    var ritual = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.MeshBasicMaterial({
        map: makeRitualTexture(), transparent: true, opacity: 0.66,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    ritual.rotation.x = -Math.PI / 2;
    ritual.position.y = 0.02;
    scene.add(ritual);
    env.ritual = ritual;

    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(4.62, 0.025, 6, 80),
      new THREE.MeshBasicMaterial({ color: 0xa875ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    scene.add(ring);
    env.ritualRing = ring;

    /* Grave props */
    var treeMat = new THREE.MeshStandardMaterial({ color: 0x160d21, roughness: 1, metalness: 0.03 });
    var treeMat2 = new THREE.MeshStandardMaterial({ color: 0x241530, roughness: 1, metalness: 0.02 });
    for (var ti = 0; ti < 12; ti++) {
      var ta = ti / 12 * TAU + rand(-0.12, 0.12);
      var tr = rand(15, 31);
      var tree = addTree(Math.cos(ta) * tr, Math.sin(ta) * tr, rand(0.75, 1.65), treeMat, treeMat2);
      env.trees.push(tree);
    }

    var stoneMat = new THREE.MeshStandardMaterial({ color: 0x45395c, roughness: 0.92, metalness: 0.03 });
    var stoneMat2 = new THREE.MeshStandardMaterial({ color: 0x2c2340, roughness: 0.96, metalness: 0.02 });
    for (var si = 0; si < 26; si++) {
      var sa = si / 26 * TAU + rand(-0.15, 0.15);
      var sr = rand(7, 25);
      addTombstone(Math.cos(sa) * sr, Math.sin(sa) * sr, rand(0, TAU), rand(0.72, 1.25), stoneMat, stoneMat2, si % 10 === 0);
    }

    addFence(stoneMat2);

    for (var pi = 0; pi < 9; pi++) {
      var pa = pi / 9 * TAU + rand(-0.18, 0.18);
      var pr = rand(5.5, 20);
      env.pumpkins.push(addPumpkin(Math.cos(pa) * pr, Math.sin(pa) * pr, rand(0.8, 1.25), pi < 4));
    }

    for (var ci = 0; ci < 6; ci++) {
      var ca = ci / 6 * TAU + rand(-0.2, 0.2);
      var cr = rand(4.4, 18);
      env.candles.push(addCandleCluster(Math.cos(ca) * cr, Math.sin(ca) * cr, ci < 2));
    }

    /* Ground mist */
    for (var fi = 0; fi < 7; fi++) {
      var fog = new THREE.Mesh(
        new THREE.PlaneGeometry(rand(38, 62), rand(38, 62)),
        new THREE.MeshBasicMaterial({
          map: fogTex, color: fi % 3 === 0 ? 0x6f43c9 : 0x6aa9d8, transparent: true,
          opacity: rand(0.05, 0.11), blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        })
      );
      fog.rotation.x = -Math.PI / 2;
      fog.rotation.z = rand(0, TAU);
      fog.position.set(rand(-12, 12), rand(0.18, 0.55), rand(-12, 12));
      fog.userData = { spin: rand(-0.02, 0.02), drift: rand(-0.12, 0.12), phase: rand(0, TAU), baseY: fog.position.y };
      scene.add(fog);
      env.fogPlanes.push(fog);
    }

    /* Embers */
    function emberField(count, size, ymin, ymax, opacity) {
      var pos = new Float32Array(count * 3);
      var col = new Float32Array(count * 3);
      for (var e = 0; e < count; e++) {
        var ea = Math.random() * TAU, er = Math.sqrt(Math.random()) * 30;
        pos[e * 3] = Math.cos(ea) * er;
        pos[e * 3 + 1] = rand(ymin, ymax);
        pos[e * 3 + 2] = Math.sin(ea) * er;
        var c = choose([[1, .48, .12], [.72, .36, 1], [.4, .85, 1], [1, .78, .25]]);
        col[e * 3] = c[0]; col[e * 3 + 1] = c[1]; col[e * 3 + 2] = c[2];
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      var m = new THREE.PointsMaterial({
        size: size, map: makeGlowTexture(), vertexColors: true, transparent: true,
        opacity: opacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      });
      var pts = new THREE.Points(g, m);
      scene.add(pts);
      return pts;
    }
    env.embers = emberField(620, 0.16, 0.4, 9, 0.7);
    env.embers2 = emberField(90, 0.28, 0.5, 3.2, 0.8);

    /* Wisps */
    for (var wi = 0; wi < 16; wi++) {
      var wisp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(), color: wi % 3 ? 0x8fe9ff : 0xffb15c, transparent: true,
        opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      wisp.scale.set(rand(0.2, 0.55), rand(0.2, 0.55), 1);
      wisp.position.set(rand(-22, 22), rand(0.6, 4.5), rand(-22, 22));
      wisp.userData = { phase: rand(0, TAU), speed: rand(0.2, 0.8), baseY: wisp.position.y };
      scene.add(wisp);
      env.wisps.push(wisp);
    }

    /* A faint moonbeam */
    var beam = new THREE.Mesh(
      new THREE.ConeGeometry(8, 46, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xbad5ff, transparent: true, opacity: 0.018, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    beam.position.set(-16, 22, -32);
    beam.rotation.z = -0.5;
    beam.rotation.x = -0.22;
    scene.add(beam);
  }

  function addTree(x, z, scale, mat, mat2) {
    var group = new THREE.Group();
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.36, 4.6, 7), mat);
    trunk.position.y = 2.3;
    trunk.castShadow = true; trunk.receiveShadow = true;
    group.add(trunk);
    var rng = seeded((x * 1000 + z * 77) | 0);
    var branchCount = 4 + (rng() * 3 | 0);
    for (var i = 0; i < branchCount; i++) {
      var len = 1.3 + rng() * 1.9;
      var b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.12, len, 5), i % 2 ? mat2 : mat);
      b.position.y = 1.4 + rng() * 2.9;
      b.rotation.z = (rng() - 0.5) * 1.7;
      b.rotation.y = rng() * TAU;
      b.position.x = Math.cos(b.rotation.y) * len * 0.32;
      b.position.z = Math.sin(b.rotation.y) * len * 0.32;
      b.castShadow = true;
      group.add(b);
      var twig = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.045, len * 0.62, 4), mat);
      twig.position.set(b.position.x * 1.6, b.position.y + len * 0.28, b.position.z * 1.6);
      twig.rotation.z = b.rotation.z + (rng() - 0.5) * 1.1;
      twig.rotation.y = b.rotation.y;
      twig.castShadow = true;
      group.add(twig);
    }
    var rootGeo = new THREE.ConeGeometry(0.08, 1.2, 4);
    for (var r = 0; r < 4; r++) {
      var root = new THREE.Mesh(rootGeo, mat);
      root.position.set(Math.cos(r * 1.57) * 0.3, 0.35, Math.sin(r * 1.57) * 0.3);
      root.rotation.z = Math.cos(r * 1.57) * 0.9;
      root.rotation.x = Math.sin(r * 1.57) * 0.9;
      group.add(root);
    }
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    state.scene.add(group);
    return group;
  }

  function addTombstone(x, z, rot, scale, mat, mat2, cross) {
    var group = new THREE.Group();
    var stone = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.24, 0.19), mat);
    stone.position.y = 0.64;
    stone.castShadow = true; stone.receiveShadow = true;
    group.add(stone);
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.19, 14, 1, false, 0, Math.PI), mat2);
    cap.rotation.z = Math.PI / 2;
    cap.position.y = 1.26;
    cap.castShadow = true;
    group.add(cap);
    if (cross) {
      var v = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.86, 0.10), mat2);
      v.position.set(0, 0.78, 0.11); v.castShadow = true; group.add(v);
      var h = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.10, 0.10), mat2);
      h.position.set(0, 0.94, 0.11); h.castShadow = true; group.add(h);
    } else {
      var sigil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 4, 12), mat2);
      sigil.position.set(0, 0.76, 0.105);
      group.add(sigil);
    }
    group.position.set(x, 0, z);
    group.rotation.y = rot;
    group.rotation.z = rand(-0.08, 0.08);
    group.rotation.x = rand(-0.06, 0.06);
    group.scale.setScalar(scale);
    state.scene.add(group);
    return group;
  }

  function addFence(mat) {
    var count = 48;
    var posts = [], rails = [];
    var postGeo = new THREE.BoxGeometry(0.09, 1.22, 0.09);
    var railGeo = new THREE.BoxGeometry(1, 0.05, 0.05);
    var dummy = new THREE.Object3D();
    for (var i = 0; i < count; i++) {
      if (i % 9 === 4) continue;
      var a = i / count * TAU;
      var x = Math.cos(a) * 27.2, z = Math.sin(a) * 27.2;
      posts.push({ x: x, z: z, rot: -a });
      if (i % 9 !== 3) {
        var nx = Math.cos((i + 1) / count * TAU) * 27.2;
        var nz = Math.sin((i + 1) / count * TAU) * 27.2;
        rails.push({
          x: (x + nx) / 2, z: (z + nz) / 2,
          len: Math.hypot(nx - x, nz - z),
          rot: -Math.atan2(nz - z, nx - x)
        });
      }
    }
    var postMesh = new THREE.InstancedMesh(postGeo, mat, posts.length);
    postMesh.frustumCulled = false;
    for (var p = 0; p < posts.length; p++) {
      dummy.position.set(posts[p].x, 0.61, posts[p].z);
      dummy.rotation.set(0, posts[p].rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      postMesh.setMatrixAt(p, dummy.matrix);
    }
    postMesh.instanceMatrix.needsUpdate = true;
    postMesh.castShadow = true;
    postMesh.receiveShadow = true;
    state.scene.add(postMesh);
    var railMesh = new THREE.InstancedMesh(railGeo, mat, rails.length);
    railMesh.frustumCulled = false;
    for (var r = 0; r < rails.length; r++) {
      dummy.position.set(rails[r].x, 0.88, rails[r].z);
      dummy.rotation.set(0, rails[r].rot, 0);
      dummy.scale.set(rails[r].len, 1, 1);
      dummy.updateMatrix();
      railMesh.setMatrixAt(r, dummy.matrix);
    }
    railMesh.instanceMatrix.needsUpdate = true;
    railMesh.castShadow = true;
    state.scene.add(railMesh);
    return postMesh;
  }

  function addPumpkin(x, z, scale, light) {
    var group = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: 0xff6a08, roughness: 0.76, metalness: 0.02, emissive: 0x3a0c00, emissiveIntensity: 0.65 });
    var mat2 = new THREE.MeshStandardMaterial({ color: 0xff9b23, roughness: 0.7, metalness: 0.02, emissive: 0x4a1000, emissiveIntensity: 0.8 });
    for (var i = 0; i < 8; i++) {
      var lobe = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), i % 2 ? mat : mat2);
      var a = i / 8 * TAU;
      lobe.position.set(Math.cos(a) * 0.22, 0.36, Math.sin(a) * 0.22);
      lobe.scale.set(0.55, 0.78, 0.55);
      lobe.castShadow = true; lobe.receiveShadow = true;
      group.add(lobe);
    }
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.28, 7), new THREE.MeshStandardMaterial({ color: 0x3b7a25, roughness: 0.9 }));
    stem.position.y = 0.77; stem.rotation.z = 0.18; group.add(stem);
    var glowMat = new THREE.MeshBasicMaterial({ color: 0xffcf4f });
    function tri(px, py, flip) {
      var shape = new THREE.Shape();
      shape.moveTo(-0.09, 0.08); shape.lineTo(0.09, 0.08); shape.lineTo(0, flip ? -0.09 : -0.11); shape.closePath();
      var m = new THREE.Mesh(new THREE.ShapeGeometry(shape), glowMat);
      m.position.set(px, py, 0.555);
      group.add(m);
    }
    tri(-0.19, 0.5, false); tri(0.19, 0.5, true);
    var mouth = new THREE.Shape();
    mouth.moveTo(-0.24, 0.29); mouth.lineTo(-0.14, 0.2); mouth.lineTo(-0.04, 0.29);
    mouth.lineTo(0.06, 0.2); mouth.lineTo(0.16, 0.29); mouth.lineTo(0.24, 0.2);
    mouth.lineTo(0.16, 0.12); mouth.lineTo(0.06, 0.18); mouth.lineTo(-0.04, 0.11);
    mouth.lineTo(-0.14, 0.17); mouth.lineTo(-0.24, 0.1); mouth.closePath();
    var mouthMesh = new THREE.Mesh(new THREE.ShapeGeometry(mouth), glowMat);
    mouthMesh.position.set(0, 0, 0.56);
    group.add(mouthMesh);
    if (light) {
      var pl = new THREE.PointLight(0xff7a12, 1.05, 7, 2);
      pl.position.set(0, 0.8, 0.4);
      group.add(pl);
      state.env.glowSprites.push(pl);
    }
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    group.rotation.y = rand(0, TAU);
    state.scene.add(group);
    return group;
  }

  function addCandleCluster(x, z, light) {
    var group = new THREE.Group();
    var wax = new THREE.MeshStandardMaterial({ color: 0xf2dfb5, roughness: 0.74, metalness: 0.02, emissive: 0x3a2608, emissiveIntensity: 0.35 });
    var flameMat = new THREE.SpriteMaterial({ map: makeGlowTexture(), color: 0xffb547, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    for (var i = 0; i < 3; i++) {
      var h = rand(0.35, 0.9);
      var candle = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, h, 12), wax);
      candle.position.set((i - 1) * 0.28, h / 2, rand(-0.12, 0.12));
      candle.castShadow = true;
      group.add(candle);
      var flame = new THREE.Sprite(flameMat.clone());
      flame.scale.set(0.22, 0.36, 1);
      flame.position.set(candle.position.x, h + 0.13, candle.position.z);
      group.add(flame);
      state.env.flames.push(flame);
    }
    var puddle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.035, 14), wax);
    puddle.position.y = 0.018;
    group.add(puddle);
    if (light) {
      var pl = new THREE.PointLight(0xffa33d, 0.85, 8, 2);
      pl.position.set(0, 1, 0);
      group.add(pl);
      state.env.glowSprites.push(pl);
    }
    group.position.set(x, 0, z);
    state.scene.add(group);
    return group;
  }

  /* --------------------------------------------------------- weapon + fx */
  function buildWeapon() {
    var camera = state.camera;
    var group = new THREE.Group();
    var metal = new THREE.MeshStandardMaterial({ color: 0x21172e, roughness: 0.28, metalness: 0.86 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x0c0714, roughness: 0.54, metalness: 0.62 });
    var glow = new THREE.MeshStandardMaterial({ color: 0x59e6ff, emissive: 0x1d9fbf, emissiveIntensity: 3.2, roughness: 0.15, metalness: 0.45 });
    var violetGlow = new THREE.MeshStandardMaterial({ color: 0xb27bff, emissive: 0x5b25bb, emissiveIntensity: 2.5, roughness: 0.2, metalness: 0.4 });

    var grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.32, 10), dark);
    grip.position.set(0, -0.13, 0.12);
    grip.rotation.x = 0.22;
    group.add(grip);

    var stock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.42), metal);
    stock.position.set(0, -0.01, -0.02);
    group.add(stock);

    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.78, 12), metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.08, -0.42);
    group.add(barrel);

    var shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.42, 12, 1, true), dark);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.08, -0.28);
    group.add(shroud);

    for (var i = 0; i < 3; i++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.014, 6, 20), i === 1 ? glow : violetGlow);
      ring.position.set(0, 0.08, -0.22 - i * 0.16);
      group.add(ring);
    }

    var crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), glow);
    crystal.position.set(0, 0.2, -0.18);
    crystal.scale.set(0.7, 1.8, 0.7);
    group.add(crystal);

    var prongL = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 5), violetGlow);
    prongL.position.set(-0.11, 0.18, -0.12); prongL.rotation.z = 0.65; group.add(prongL);
    var prongR = prongL.clone(); prongR.position.x = 0.11; prongR.rotation.z = -0.65; group.add(prongR);

    var muzzle = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0x9defff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    muzzle.position.set(0, 0.08, -0.83);
    muzzle.scale.set(0.9, 0.9, 1);
    group.add(muzzle);

    var muzzleLight = new THREE.PointLight(0x77e8ff, 0, 5, 2);
    muzzleLight.position.set(0, 0.08, -0.8);
    group.add(muzzleLight);

    group.position.set(0.34, -0.27, -0.62);
    group.rotation.set(0.02, -0.12, -0.035);
    camera.add(group);
    state.weapon = {
      group: group, baseX: 0.34, baseY: -0.27, baseZ: -0.62,
      muzzle: muzzle, light: muzzleLight, crystal: crystal, recoil: 0
    };
  }

  function spawnBurst(pos, color, count, speed, size) {
    var positions = new Float32Array(count * 3);
    var velocities = [];
    for (var i = 0; i < count; i++) {
      positions[i * 3] = pos.x + rand(-0.12, 0.12);
      positions[i * 3 + 1] = pos.y + rand(-0.12, 0.12);
      positions[i * 3 + 2] = pos.z + rand(-0.12, 0.12);
      var theta = Math.random() * TAU, phi = Math.acos(rand(-1, 1)), sp = rand(speed * 0.25, speed);
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * sp,
        Math.cos(phi) * sp * 0.85 + rand(0, 1.5),
        Math.sin(phi) * Math.sin(theta) * sp
      ));
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.PointsMaterial({
      color: color, size: size || 0.14, map: state.glowTex, transparent: true,
      opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    var points = new THREE.Points(geo, mat);
    state.scene.add(points);
    state.bursts.push({ points: points, velocities: velocities, life: rand(0.55, 1.2), max: 1.2 });
  }

  function clearBursts() {
    for (var i = 0; i < state.bursts.length; i++) {
      var b = state.bursts[i];
      if (!b || !b.points) continue;
      state.scene.remove(b.points);
      if (b.points.geometry) b.points.geometry.dispose();
      if (b.points.material) b.points.material.dispose();
    }
    state.bursts.length = 0;
  }

  function updateBursts(dt) {
    for (var i = state.bursts.length - 1; i >= 0; i--) {
      var b = state.bursts[i];
      b.life -= dt;
      if (b.life <= 0) {
        state.scene.remove(b.points);
        b.points.geometry.dispose();
        b.points.material.dispose();
        state.bursts.splice(i, 1);
        continue;
      }
      var p = b.points.geometry.attributes.position;
      for (var j = 0; j < b.velocities.length; j++) {
        var v = b.velocities[j];
        v.y -= 3.2 * dt;
        p.setXYZ(j, p.getX(j) + v.x * dt, p.getY(j) + v.y * dt, p.getZ(j) + v.z * dt);
      }
      p.needsUpdate = true;
      b.points.material.opacity = clamp(b.life / b.max, 0, 1);
    }
  }

  function spawnPickup(pos) {
    var group = new THREE.Group();
    var core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xff8c1a, emissiveIntensity: 2.6, roughness: 0.2, metalness: 0.5 })
    );
    group.add(core);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0xffb347, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    glow.scale.set(1.6, 1.6, 1);
    group.add(glow);
    var light = new THREE.PointLight(0xffb347, 0.9, 6, 2);
    group.add(light);
    group.position.copy(pos);
    state.scene.add(group);
    state.pickups.push({ group: group, core: core, life: 10, phase: rand(0, TAU) });
  }

  function removePickup(p) {
    if (!p || !p.group) return;
    state.scene.remove(p.group);
    p.group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }

  function updatePickups(dt, t) {
    for (var i = state.pickups.length - 1; i >= 0; i--) {
      var p = state.pickups[i];
      p.life -= dt;
      p.group.position.y = 0.7 + Math.sin(t * 2.2 + p.phase) * 0.18;
      p.core.rotation.y += dt * 1.8;
      p.core.rotation.x += dt * 0.9;
      var dist = Math.hypot(p.group.position.x - state.player.x, p.group.position.z - state.player.z);
      var magnetRadius = boonPickupRadius();
      if (dist < magnetRadius) {
        var dx = state.player.x - p.group.position.x, dz = state.player.z - p.group.position.z;
        p.group.position.x += dx * dt * 2.2;
        p.group.position.z += dz * dt * 2.2;
      }
      if (dist < 1.4) {
        if (state.game) {
          var soulKind = Math.random() < 0.5 ? 'triple' : 'rapid';
          state.game.power[soulKind] = 10;
          state.game.health = Math.min(state.game.maxHealth, state.game.health + 12);
          showToast(soulKind === 'triple' ? 'SOUL HARVEST — TRIPLE BOLT' : 'SOUL HARVEST — RAPID BOLT', 1700);
          updateHUD(true);
        }
        playSound('pickup');
        removePickup(p);
        state.pickups.splice(i, 1);
        continue;
      }
      if (p.life <= 0) {
        removePickup(p);
        state.pickups.splice(i, 1);
      }
    }
  }

  /* ------------------------------------------------------------- ghosts */
  var GHOST_PROFILE = null;
  function ghostProfile() {
    if (GHOST_PROFILE) return GHOST_PROFILE;
    GHOST_PROFILE = [
      new THREE.Vector2(0.02, 0.00),
      new THREE.Vector2(0.48, 0.04),
      new THREE.Vector2(0.58, 0.30),
      new THREE.Vector2(0.57, 0.70),
      new THREE.Vector2(0.49, 1.10),
      new THREE.Vector2(0.39, 1.42),
      new THREE.Vector2(0.27, 1.63),
      new THREE.Vector2(0.12, 1.76),
      new THREE.Vector2(0.00, 1.80)
    ];
    return GHOST_PROFILE;
  }

  function ghostMaterial(type) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(type.color) },
        uGlow: { value: new THREE.Color(type.glow) },
        uOpacity: { value: 0.88 },
        uPhase: { value: rand(0, TAU) }
      },
      vertexShader: [
        'uniform float uTime; uniform float uPhase;',
        'varying vec3 vNormal; varying vec3 vView; varying float vY;',
        'void main() {',
        '  vec3 p = position;',
        '  float lower = 1.0 - smoothstep(0.02, 1.55, p.y);',
        '  p.x += sin(uTime * 2.4 + p.y * 6.0 + uPhase) * 0.055 * lower;',
        '  p.z += cos(uTime * 1.7 + p.y * 5.2 + uPhase) * 0.045 * lower;',
        '  vY = p.y;',
        '  vNormal = normalize(normalMatrix * normal);',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  vView = normalize(-mv.xyz);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor; uniform vec3 uGlow; uniform float uOpacity; uniform float uTime;',
        'varying vec3 vNormal; varying vec3 vView; varying float vY;',
        'void main() {',
        '  float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.1);',
        '  float bands = 0.86 + 0.14 * sin(vY * 25.0 - uTime * 2.2);',
        '  float alpha = (0.15 + fres * 0.66) * uOpacity * bands;',
        '  vec3 col = mix(uColor * 0.48, uGlow * 1.45, fres) + vec3(0.32) * pow(fres, 4.0);',
        '  gl_FragColor = vec4(col, alpha);',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending
    });
  }

  function eyeMesh(type, x, y, z, r) {
    var group = new THREE.Group();
    var sclera = new THREE.Mesh(
      new THREE.SphereGeometry(r, 10, 8),
      new THREE.MeshBasicMaterial({ color: type.glow, toneMapped: false, fog: false })
    );
    sclera.position.set(0, 0, 0);
    group.add(sclera);
    var pupil = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.43, 8, 6),
      new THREE.MeshBasicMaterial({ color: type.eye, toneMapped: false, fog: false })
    );
    pupil.position.set(0, 0, r * 0.72);
    group.add(pupil);
    group.position.set(x, y, z);
    return group;
  }

  function makeFaceShape(points, color) {
    var shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    return new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({
      color: color, side: THREE.DoubleSide, toneMapped: false, fog: false,
      transparent: true, opacity: 0.92
    }));
  }

  function addHat(group, variant, type) {
    var dark = new THREE.MeshStandardMaterial({ color: 0x1b0d2b, roughness: 0.55, metalness: 0.25, emissive: 0x10041d, emissiveIntensity: 0.7 });
    if (variant === 'witch') {
      var brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.055, 24), dark);
      brim.position.y = 1.74; group.add(brim);
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.72, 18), dark);
      cone.position.set(0.04, 2.08, -0.01); cone.rotation.z = -0.15; group.add(cone);
      var band = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.026, 6, 20), new THREE.MeshStandardMaterial({ color: type.glow, emissive: type.color, emissiveIntensity: 1.4, roughness: 0.3 }));
      band.rotation.x = Math.PI / 2; band.position.y = 1.80; group.add(band);
    } else if (variant === 'tophat') {
      var tBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.045, 24), dark);
      tBrim.position.y = 1.73; group.add(tBrim);
      var top = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.30, 0.46, 18), dark);
      top.position.y = 1.98; group.add(top);
      var tBand = new THREE.Mesh(new THREE.CylinderGeometry(0.288, 0.302, 0.07, 18), new THREE.MeshStandardMaterial({ color: 0x9b5cff, emissive: 0x4a1a88, emissiveIntensity: 1.2, roughness: 0.4 }));
      tBand.position.y = 1.83; group.add(tBand);
    } else if (variant === 'crown') {
      var crownMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xff8c1a, emissiveIntensity: 1.2, metalness: 0.7, roughness: 0.28 });
      var base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.12, 12), crownMat);
      base.position.y = 1.79; group.add(base);
      for (var c = 0; c < 6; c++) {
        var spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 5), crownMat);
        var ca = c / 6 * TAU;
        spike.position.set(Math.cos(ca) * 0.27, 1.94, Math.sin(ca) * 0.27);
        group.add(spike);
      }
    } else if (variant === 'horns') {
      var hornMat = new THREE.MeshStandardMaterial({ color: 0x3a0d50, emissive: 0x8b1dff, emissiveIntensity: 0.7, roughness: 0.44 });
      var hl = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.42, 7), hornMat);
      hl.position.set(-0.26, 1.72, 0.02); hl.rotation.z = 0.48; group.add(hl);
      var hr = hl.clone(); hr.position.x = 0.26; hr.rotation.z = -0.48; group.add(hr);
    }
  }

  function addBodyDetails(group, type, variant) {
    if (variant === 'mummy') {
      var wrapMat = new THREE.MeshStandardMaterial({ color: 0xfff0c4, roughness: 0.92, metalness: 0, transparent: true, opacity: 0.48 });
      [0.34, 0.59, 0.86, 1.13, 1.38].forEach(function (y, i) {
        var ring = new THREE.Mesh(new THREE.TorusGeometry(0.54 - i * 0.045, 0.035, 5, 26), wrapMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        group.add(ring);
      });
    }
    if (variant === 'vampire') {
      var capeMat = new THREE.MeshStandardMaterial({ color: 0x4b031a, roughness: 0.8, metalness: 0.05, transparent: true, opacity: 0.36, side: THREE.DoubleSide });
      var cape = new THREE.Mesh(new THREE.ConeGeometry(0.63, 1.32, 18, 1, true), capeMat);
      cape.position.set(0, 0.62, -0.18);
      group.add(cape);
      var collar = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.06, 6, 18), new THREE.MeshStandardMaterial({ color: 0x9b1233, emissive: 0x3d0010, emissiveIntensity: 1.1, roughness: 0.5 }));
      collar.rotation.x = Math.PI / 2; collar.position.y = 1.33; group.add(collar);
      var fangMat = new THREE.MeshBasicMaterial({ color: 0xfff4d6 });
      [-0.1, 0.1].forEach(function (x) {
        var fang = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), fangMat);
        fang.position.set(x, 0.91, 0.48); fang.rotation.x = Math.PI; group.add(fang);
      });
    }
    if (variant === 'hood') {
      var shadeHood = new THREE.Mesh(new THREE.ConeGeometry(0.53, 0.76, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0x120a1c, roughness: 0.98, metalness: 0.02, side: THREE.DoubleSide, transparent: true, opacity: 0.42 }));
      shadeHood.position.y = 1.43; group.add(shadeHood);
    }
    if (variant === 'reaper') {
      var hoodMat = new THREE.MeshStandardMaterial({ color: 0x171020, roughness: 0.96, metalness: 0.04, side: THREE.DoubleSide, transparent: true, opacity: 0.52 });
      var hood = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.92, 18, 1, true), hoodMat);
      hood.position.y = 1.31; group.add(hood);
      var scytheMat = new THREE.MeshStandardMaterial({ color: 0x5b4a6e, roughness: 0.4, metalness: 0.8 });
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 2.2, 6), scytheMat);
      pole.position.set(0.66, 0.92, -0.05); pole.rotation.z = -0.14; group.add(pole);
      var blade = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.035, 4, 18, Math.PI * 1.3), scytheMat);
      blade.position.set(0.78, 1.97, -0.05); blade.rotation.set(Math.PI / 2, 0, -0.25); group.add(blade);
    }
    if (variant === 'star') {
      var antennaMat = new THREE.MeshStandardMaterial({ color: 0xffe28a, emissive: 0xffb347, emissiveIntensity: 1.8, roughness: 0.3 });
      var stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.36, 5), antennaMat);
      stalk.position.set(0, 1.92, 0); group.add(stalk);
      var star = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), antennaMat);
      star.position.set(0, 2.12, 0); group.add(star);
    }
    if (variant === 'pumpkin') {
      var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.075, 0.25, 7), new THREE.MeshStandardMaterial({ color: 0x3e7a2a, roughness: 0.85 }));
      stem.position.set(0, 1.82, 0); stem.rotation.z = 0.14; group.add(stem);
      var faceMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95, side: THREE.DoubleSide, toneMapped: false, fog: false });
      [-0.18, 0.18].forEach(function (x, i) {
        var tri = makeFaceShape([[-0.08, 0.08], [0.08, 0.08], [0, -0.1]], 0xffd166);
        tri.position.set(x, 1.23, 0.56);
        tri.rotation.z = i ? -0.18 : 0.18;
        group.add(tri);
      });
      var mouth = makeFaceShape([[-0.22, 0.13], [-0.13, 0.04], [-0.04, 0.12], [0.05, 0.04], [0.14, 0.12], [0.22, 0.03], [0.15, -0.08], [0.05, -0.02], [-0.04, -0.09], [-0.14, -0.03], [-0.22, -0.1]], 0xffd166);
      mouth.position.set(0, 0.98, 0.565); group.add(mouth);
    }
    if (variant === 'cyclops') {
      var eye = eyeMesh(type, 0, 1.28, 0.49, 0.18);
      group.add(eye);
      var brow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.04), new THREE.MeshBasicMaterial({ color: type.eye }));
      brow.position.set(0, 1.5, 0.48); brow.rotation.z = 0.1; group.add(brow);
    } else if (variant !== 'pumpkin') {
      [-0.145, 0.145].forEach(function (x) {
        group.add(eyeMesh(type, x, 1.28, 0.44, 0.078));
      });
      var mouth = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: type.eye, transparent: true, opacity: 0.8, toneMapped: false, fog: false }));
      mouth.position.set(0, 1.0, 0.53); mouth.scale.set(1.15, 0.38, 0.25); group.add(mouth);
    }
    addHat(group, variant, type);
  }

  function createGhost(type, isBoss) {
    var group = new THREE.Group();
    var size = type.size * (isBoss ? 1.65 : 1);
    var geo = new THREE.LatheGeometry(ghostProfile(), 32);
    var mat = ghostMaterial(type);
    var body = new THREE.Mesh(geo, mat);
    body.position.y = 0.06;
    body.renderOrder = 2;
    group.add(body);

    var aura = new THREE.Sprite(new THREE.SpriteMaterial({
      map: state.glowTex, color: type.glow, transparent: true, opacity: isBoss ? 0.5 : 0.32,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    aura.scale.set(2.9, 2.9, 1);
    aura.position.y = 0.93;
    group.add(aura);

    addBodyDetails(group, type, type.variant);
    if (isBoss) {
      var bossAura = new THREE.Sprite(new THREE.SpriteMaterial({
        map: state.glowTex, color: 0x7b2cff, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      bossAura.scale.set(6.4, 6.4, 1); bossAura.position.y = 1.15; group.add(bossAura);
    }
    group.scale.setScalar(size);
    state.scene.add(group);

    var trailGeo = new THREE.BufferGeometry();
    var trailPositions = new Float32Array(12 * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    var trailMat = new THREE.LineBasicMaterial({ color: type.glow, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
    var line = new THREE.Line(trailGeo, trailMat);
    line.frustumCulled = false;
    state.scene.add(line);

    return {
      group: group, body: body, material: mat, aura: aura, line: line, trail: [],
      type: type, size: size, hp: type.hp, maxHp: type.hp,
      phase: rand(0, TAU), age: 0, attackCd: 0, phaseTimer: rand(1.5, 4), hitFlash: 0,
      castCd: rand(1.4, 3.0), castTimer: 0, summonCd: rand(3.2, 6.0), healCd: rand(2.5, 4.5),
      fuse: 0, frostTimer: 0, burnTimer: 0, burnTick: 0, burnDps: 0,
      bossPhase: isBoss ? 1 : 0, speedBonus: 1,
      baseY: rand(1.2, 2.8) * (isBoss ? 1.22 : 1), x: 0, z: 0, alive: true,
      isBoss: !!isBoss, golden: false, ambient: false, visible: true
    };
  }

  function spawnGhost(type, isBoss, ambient) {
    var g = createGhost(type, isBoss);
    g.ambient = !!ambient;
    g.golden = !isBoss && !ambient && Math.random() < 0.035;
    if (g.golden) {
      g.material.uniforms.uColor.value.setHex(0xffd166);
      g.material.uniforms.uGlow.value.setHex(0xfff0a0);
      g.aura.material.color.setHex(0xffd166);
      g.aura.scale.set(3.8, 3.8, 1);
      g.hp = 2; g.maxHp = 2;
    }
    if (ambient) {
      var aa = rand(0, TAU), ar = rand(6, 15);
      g.x = Math.cos(aa) * ar; g.z = Math.sin(aa) * ar;
      g.baseY = rand(1.1, 3.1);
      g.group.scale.setScalar(g.size * 0.9);
    } else {
      var a = rand(0, TAU), r = rand(14, 24);
      g.x = state.player.x + Math.cos(a) * r;
      g.z = state.player.z + Math.sin(a) * r;
      var maxR = 26;
      var d = Math.hypot(g.x, g.z);
      if (d > maxR) { g.x *= maxR / d; g.z *= maxR / d; }
      g.baseY = isBoss ? 2.6 : rand(1.5, 3.3);
      spawnBurst(new THREE.Vector3(g.x, g.baseY + 1, g.z), type.glow, 12, 2.2, 0.12);
    }
    g.group.position.set(g.x, g.baseY, g.z);
    state.ghosts.push(g);
    return g;
  }

  function spawnIdleGhosts() {
    if (!state.scene || state.mode !== 'idle' || state.ghosts.length) return;
    var picks = [TYPES[0], TYPES[2], TYPES[5], TYPES[9], TYPES[10], TYPES[15]];
    picks.forEach(function (t, i) { spawnGhost(t, false, true); });
  }

  function disposeObject(root) {
    if (!root) return;
    root.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map && o.material.map !== state.glowTex) { /* shared/env textures are owned elsewhere */ }
        o.material.dispose();
      }
    });
  }

  function removeGhost(g) {
    if (!g) return;
    if (g.group) {
      state.scene.remove(g.group);
      disposeObject(g.group);
    }
    if (g.line) {
      state.scene.remove(g.line);
      g.line.geometry.dispose();
      g.line.material.dispose();
    }
    g.alive = false;
  }

  function clearGhosts() {
    for (var i = 0; i < state.ghosts.length; i++) removeGhost(state.ghosts[i]);
    state.ghosts.length = 0;
  }

  function updateGhost(g, dt, t) {
    if (!g.alive) return;
    var px = state.player.x, pz = state.player.z;
    var dx = px - g.x, dz = pz - g.z;
    var dist = Math.hypot(dx, dz) || 0.001;
    var nx = dx / dist, nz = dz / dist;
    g.age += dt;
    if (g.hitFlash > 0) {
      g.hitFlash = Math.max(0, g.hitFlash - dt);
      g.material.uniforms.uOpacity.value = 0.88 + 0.12 * (g.hitFlash / 0.12);
    }

    if (g.ambient) {
      var aa = g.phase + t * 0.10;
      var ar = 7 + (g.type.size * 2.6);
      g.x = Math.cos(aa) * ar;
      g.z = Math.sin(aa) * ar;
      g.group.position.set(g.x, g.baseY + Math.sin(t * 1.2 + g.phase) * 0.28, g.z);
      g.group.rotation.y = Math.atan2(state.camera.position.x - g.x, state.camera.position.z - g.z);
      g.material.uniforms.uTime.value = t;
      g.aura.material.opacity = 0.24 + Math.sin(t * 1.8 + g.phase) * 0.08;
      updateTrail(g);
      return;
    }

    var speed = g.type.speed * (1 + (state.game ? state.game.wave : 1) * 0.025) * (g.speedBonus || 1);
    if (g.isBoss) speed = g.type.speed * (1 + (state.game ? state.game.wave : 1) * 0.01) * (g.speedBonus || 1);
    if (state.game && state.game.omen && state.game.omen.speed) speed *= state.game.omen.speed;
    if (g.frostTimer > 0) { g.frostTimer -= dt; speed *= 0.56; }
    var strafe = 0, pull = 0;
    if (g.type.behavior === 'zigzag') strafe = Math.sin(t * 3.3 + g.phase) * 0.68;
    else if (g.type.behavior === 'strafe') strafe = Math.sin(t * 1.25 + g.phase) * 0.75;
    else if (g.type.behavior === 'orbit') {
      var desired = 8.5;
      var radial = (dist - desired) * 0.34;
      nx += (dx / dist) * radial;
      nz += (dz / dist) * radial;
      strafe = 0.9;
    } else if (g.type.behavior === 'caster') {
      var castDist = 11;
      var castRadial = clamp((dist - castDist) * 0.46, -1.35, 1.35);
      nx += (dx / dist) * castRadial;
      nz += (dz / dist) * castRadial;
      strafe = 0.46;
    } else if (g.type.behavior === 'summoner') {
      var summonDist = 9.5;
      var summonRadial = (dist - summonDist) * 0.35;
      nx += (dx / dist) * summonRadial;
      nz += (dz / dist) * summonRadial;
      strafe = 0.4;
    } else if (g.type.behavior === 'healer') {
      var healDist = 10.5;
      var healRadial = (dist - healDist) * 0.3;
      nx += (dx / dist) * healRadial;
      nz += (dz / dist) * healRadial;
      strafe = 0.3;
    } else if (g.type.behavior === 'bomber') {
      speed *= 1.16;
      if (dist < 3.2 && g.fuse <= 0) g.fuse = 0.72;
    } else if (g.type.behavior === 'ambush') {
      if (g.age < 2.4) { speed *= 0.22; strafe = Math.sin(t * 1.2 + g.phase) * 0.5; }
      else speed *= 1.45;
    } else if (g.type.behavior === 'dive') {
      if (dist < 12) speed *= 1.4;
      strafe = Math.sin(t * 2.2 + g.phase) * 0.35;
    } else if (g.type.behavior === 'homing') {
      speed *= 1 + Math.min(0.75, g.age * 0.06);
    } else if (g.type.behavior === 'teleport') {
      g.phaseTimer -= dt;
      if (g.phaseTimer <= 0 && dist > 5) {
        spawnBurst(new THREE.Vector3(g.x, g.baseY + 1, g.z), g.type.glow, 18, 3.2, 0.15);
        var na = rand(0, TAU), nr = rand(6, 9);
        g.x = clamp(px + Math.cos(na) * nr, -25, 25);
        g.z = clamp(pz + Math.sin(na) * nr, -25, 25);
        g.phaseTimer = rand(3.2, 5.0);
        spawnBurst(new THREE.Vector3(g.x, g.baseY + 1, g.z), g.type.glow, 18, 3.2, 0.15);
      }
    }
    var tangentX = -nz, tangentZ = nx;
    g.x += (nx * speed + tangentX * strafe * speed) * dt;
    g.z += (nz * speed + tangentZ * strafe * speed) * dt;
    g.x = clamp(g.x, -26.2, 26.2);
    g.z = clamp(g.z, -26.2, 26.2);

    if (g.golden) {
      g.baseY = 2.0 + Math.sin(t * 2.2 + g.phase) * 0.45;
      g.aura.scale.set(3.8 + Math.sin(t * 4 + g.phase) * 0.5, 3.8 + Math.sin(t * 4 + g.phase) * 0.5, 1);
    }
    g.group.position.set(g.x, g.baseY + Math.sin(t * 1.6 + g.phase) * 0.24, g.z);
    g.group.rotation.y = Math.atan2(dx, dz);
    g.material.uniforms.uTime.value = t;
    g.aura.material.opacity = (g.isBoss ? 0.46 : 0.30) + Math.sin(t * 2.2 + g.phase) * 0.07;
    if (g.golden) g.aura.material.opacity = 0.58 + Math.sin(t * 5 + g.phase) * 0.12;

    if (g.burnTimer > 0) {
      g.burnTimer -= dt;
      g.burnTick -= dt;
      if (g.burnTick <= 0) {
        g.burnTick = 0.48;
        damageGhost(g, g.burnDps, new THREE.Vector3(g.x, g.group.position.y + 1, g.z), { dot: true });
        if (!g.alive) return;
      }
    }

    var waveNo = state.game ? state.game.wave : 1;
    if (g.type.behavior === 'caster' || g.isBoss) {
      if (g.castTimer > 0) {
        g.castTimer -= dt;
        g.aura.material.opacity = 0.62 + Math.sin(t * 18) * 0.18;
        if (g.castTimer <= 0) {
          var burstCount = g.isBoss ? (g.bossPhase >= 3 ? 3 : (g.bossPhase >= 2 ? 2 : 1)) : 1;
          for (var cs = 0; cs < burstCount; cs++) {
            spawnEnemyShot(g, g.isBoss ? 8.4 : 7.4, g.isBoss ? 11 + waveNo * 0.55 : 7 + waveNo * 0.36,
              (cs - (burstCount - 1) / 2) * 0.06, g.isBoss && g.bossPhase >= 3);
          }
          spawnBurst(new THREE.Vector3(g.x, g.group.position.y + 1, g.z), g.type.color, 12, 2.2, 0.13);
        }
      } else {
        g.castCd -= dt;
        if (g.castCd <= 0) {
          g.castTimer = 0.4;
          g.castCd = g.isBoss ? Math.max(0.85, 2.35 - (g.bossPhase - 1) * 0.42) : rand(2.5, 3.9);
        }
      }
    }

    if (g.type.behavior === 'summoner') {
      g.summonCd -= dt;
      if (g.summonCd <= 0 && state.ghosts.length < 30) {
        g.summonCd = rand(5.0, 7.4);
        spawnAdds(g, 2);
      }
    }

    if (g.type.behavior === 'healer') {
      g.healCd -= dt;
      if (g.healCd <= 0) {
        g.healCd = rand(3.8, 5.4);
        var mended = 0;
        for (var hi = 0; hi < state.ghosts.length && mended < 3; hi++) {
          var ally = state.ghosts[hi];
          if (!ally || !ally.alive || ally === g) continue;
          if (Math.hypot(ally.x - g.x, ally.z - g.z) > 7 || ally.hp >= ally.maxHp) continue;
          ally.hp = Math.min(ally.maxHp, ally.hp + 1);
          spawnBurst(new THREE.Vector3(ally.x, ally.group.position.y + 1, ally.z), 0x7dff6a, 8, 1.6, 0.09);
          mended++;
        }
        if (mended) g.aura.material.opacity = 0.7;
      }
    }

    if (g.fuse > 0) {
      g.fuse -= dt;
      var fuseScale = 1 + Math.sin(t * 34) * 0.035;
      g.group.scale.setScalar(g.size * fuseScale);
      g.aura.material.opacity = 0.72 + Math.sin(t * 28) * 0.2;
      if (g.fuse <= 0 && g.alive) {
        spawnBurst(new THREE.Vector3(g.x, g.group.position.y + 0.8, g.z), 0xff8c1a, 70, 7, 0.2);
        spawnBurst(new THREE.Vector3(px, 1.1, pz), 0xff3355, 34, 5, 0.18);
        damagePlayer(Math.min(32, 9 + waveNo * 0.75));
        g.hp = 0;
        killGhost(g);
        return;
      }
    }

    if (g.attackCd > 0) g.attackCd -= dt;
    if (dist < 1.65 && g.attackCd <= 0) {
      g.attackCd = g.isBoss ? 0.8 : 1.35;
      damagePlayer(g.isBoss ? 22 : (7 + (state.game ? state.game.wave : 1) * 0.9));
      var push = g.isBoss ? 3.8 : 2.6;
      g.x -= nx * push;
      g.z -= nz * push;
      spawnBurst(new THREE.Vector3(px, 1.1, pz), 0xff2b55, 24, 4.2, 0.18);
    }
    updateTrail(g);
  }

  function updateTrail(g) {
    var pos = g.group.position;
    var centerY = pos.y + 0.95 * g.size;
    g.trail.unshift([pos.x, centerY, pos.z]);
    if (g.trail.length > 12) g.trail.pop();
    var arr = g.line.geometry.attributes.position;
    for (var i = 0; i < 12; i++) {
      var p = g.trail[Math.min(i, g.trail.length - 1)] || [pos.x, centerY, pos.z];
      arr.setXYZ(i, p[0], p[1], p[2]);
    }
    arr.needsUpdate = true;
    g.line.material.opacity = g.ambient ? 0.18 : 0.30;
  }

  function damageGhost(g, amount, at, opts) {
    if (!g || !g.alive || amount <= 0) return;
    opts = opts || {};
    var hitAt = at || new THREE.Vector3(g.x, g.group.position.y + 1, g.z);
    g.hp -= amount;
    g.material.uniforms.uOpacity.value = 1;
    g.hitFlash = 0.12;
    spawnBurst(hitAt, g.type.glow, opts.dot ? 4 : 10, opts.dot ? 1.3 : 2.6, opts.dot ? 0.08 : 0.10);
    playSound('hit');
    state.shake = Math.max(state.shake, opts.crit ? 0.12 : 0.06);
    if (setting('damageNumbers') && !opts.dot) {
      floatText((Math.round(amount * 10) / 10) + (opts.crit ? '!' : ''), hitAt, opts.crit ? 'gold' : 'dmg');
    }
    if (!opts.dot) {
      if (boonRank('frost') > 0) g.frostTimer = 1.4 + boonRank('frost') * 0.35;
      if (boonRank('burn') > 0 && g.burnTimer <= 0) {
        g.burnTimer = 2.0 + boonRank('burn') * 0.28;
        g.burnDps = 0.20 + boonRank('burn') * 0.15;
        g.burnTick = 0.2;
      }
    }
    var reticle = state.ui.reticle;
    if (reticle) {
      reticle.classList.remove('hit');
      void reticle.offsetWidth;
      reticle.classList.add('hit');
      setTimeout(function () { reticle.classList.remove('hit'); }, 100);
    }
    if (opts.chain && !opts.chained && g.alive) {
      chainLightning(g, hitAt, opts.chain, amount * 0.46);
    }
    if (g.hp <= 0) killGhost(g);
    else if (g.isBoss && g.hp > 0) {
      var ratio = g.hp / g.maxHp;
      if (ratio <= 0.66 && g.bossPhase === 1) bossPhase(g, 2);
      else if (ratio <= 0.33 && g.bossPhase === 2) bossPhase(g, 3);
      updateHUD();
    } else updateHUD();
  }

  function chainLightning(source, from, count, amount) {
    var visited = [source];
    var fromPos = from.clone();
    for (var link = 0; link < count; link++) {
      var best = null, bestDist = 9;
      for (var i = 0; i < state.ghosts.length; i++) {
        var other = state.ghosts[i];
        if (!other || !other.alive || visited.indexOf(other) >= 0) continue;
        var d = Math.hypot(other.x - fromPos.x, other.z - fromPos.z);
        if (d < bestDist) { bestDist = d; best = other; }
      }
      if (!best) break;
      var target = new THREE.Vector3(best.x, best.group.position.y + best.size * 0.95, best.z);
      spawnBeam(fromPos, target, 0xb388ff);
      damageGhost(best, amount, target, { chained: true });
      visited.push(best);
      fromPos = target;
      amount *= 0.7;
    }
  }

  function bossPhase(g, phase) {
    if (!g || !g.alive || g.bossPhase >= phase) return;
    g.bossPhase = phase;
    g.speedBonus = phase === 2 ? 1.16 : 1.34;
    g.castCd = 0.35;
    g.castTimer = 0;
    g.aura.material.color.setHex(phase === 3 ? 0xff3355 : g.type.glow);
    spawnBurst(new THREE.Vector3(g.x, g.group.position.y + 1.2, g.z), phase === 3 ? 0xff3355 : 0xffd166, 46, 5.5, 0.2);
    state.shake = 0.34;
    showToast(g.type.name.toUpperCase() + (phase === 2 ? ' BREAKS THE CROWN' : ' UNMAKES THE VEIL'), 2000);
    playSound('wave');
    spawnAdds(g, phase === 2 ? 1 : 3);
  }

  function spawnAdds(g, count) {
    if (!g || !state.game) return;
    for (var i = 0; i < count; i++) {
      if (state.ghosts.length >= 30) break;
      var type = choose([TYPES[0], TYPES[2], TYPES[9]]);
      var add = spawnGhost(type, false, false);
      add.x = clamp(g.x + rand(-3.2, 3.2), -24, 24);
      add.z = clamp(g.z + rand(-3.2, 3.2), -24, 24);
      add.baseY = rand(1.4, 2.7);
      add.group.position.set(add.x, add.baseY, add.z);
      add.hp = Math.max(1, Math.round(type.hp * 0.8));
      add.maxHp = add.hp;
      spawnBurst(new THREE.Vector3(add.x, add.baseY + 1, add.z), type.glow, 10, 2.0, 0.1);
    }
  }

  function killGhost(g) {
    if (!g.alive) return;
    var idx = state.ghosts.indexOf(g);
    if (idx >= 0) state.ghosts.splice(idx, 1);
    removeGhost(g);
    var game = state.game;
    if (!game) return;
    game.kills++;
    game.combo++;
    game.comboTimer = 2.6;
    var mult = 1 + Math.min(2.0, (game.combo - 1) * 0.08);
    var omenScore = game.omen && game.omen.score ? game.omen.score : 1;
    var points = Math.round(g.type.points * mult * (g.golden ? 5 : 1) * boonScoreScale() * omenScore);
    game.score += points;
    game.goldDrop++;
    if (boonRank('leech') > 0) {
      game.health = Math.min(game.maxHealth, game.health + 0.9 * boonRank('leech'));
      floatText('+HEAL', new THREE.Vector3(g.x, g.group.position.y + 1.2, g.z), 'heal');
    }
    if (g.golden) showToast('GOLDEN BREED DISPELED  ×5', 1600);
    if (g.isBoss) {
      game.score += 450;
      game.bosses = (game.bosses || 0) + 1;
      game.boss = null;
      game.health = Math.min(game.maxHealth, game.health + 24);
      showToast(g.type.name.toUpperCase() + ' FALLS', 2400);
      state.ui.boss.classList.remove('show');
      spawnPickup(new THREE.Vector3(g.x, 1, g.z));
      spawnPickup(new THREE.Vector3(g.x + 2, 1, g.z - 1));
      spawnPickup(new THREE.Vector3(g.x - 2, 1, g.z + 1));
      state.shake = 0.35;
    }
    var dropEvery = game.omen && game.omen.pickup ? game.omen.pickup : 9;
    if (!g.isBoss && game.goldDrop % dropEvery === 0) spawnPickup(new THREE.Vector3(g.x, 1, g.z));
    var c = new THREE.Vector3(g.x, g.group.position.y + 1.0, g.z);
    spawnBurst(c, g.type.glow, g.isBoss ? 95 : 34, g.isBoss ? 7 : 4.6, g.isBoss ? 0.28 : 0.18);
    floatText('+' + fmt(points), c, g.golden ? 'gold' : (g.isBoss ? 'boss' : ''));
    playSound(g.isBoss ? 'wave' : 'kill');
    state.discovered[g.type.key] = 1;
    saveToStorage('spooky_spectral_bestiary', state.discovered);
    updateBestiaryCount();
    updateHUD(true);
    if (game.toSpawn === 0 && state.ghosts.length === 0 && game.waveClearTimer <= 0 && !game.bossPending) beginWaveClear();
  }

  function beginWaveClear() {
    var game = state.game;
    if (!game || !game.active) return;
    game.waveClearTimer = 3.7;
    game.health = Math.min(game.maxHealth, game.health + 12);
    game.combo = Math.max(game.combo, 0);
    showToast('WAVE CLEAR — THE VEIL STIRS', 2200);
    playSound('wave');
    updateHUD(true);
  }

  function startWave(n) {
    var game = state.game;
    if (!game || !game.active) return;
    game.wave = n;
    game.waveClearTimer = 0;
    game.toSpawn = Math.min(20, 4 + n * 2);
    game.spawnTimer = 0.6;
    game.boss = null;
    game.bossPending = n % 5 === 0;
    game.bosses = game.bosses || 0;
    var omen = n > 1 && n % 3 === 0 ? choose(OMENS) : null;
    game.omen = omen;
    applyOmen(omen);
    updateOmenChip(omen);
    state.ui.boss.classList.remove('show');
    showWaveBanner(n, omen);
    playSound('wave');
    if (omen) setTimeout(function () { if (state.game === game && state.game.active) showToast(omen.name + ' — ' + omen.desc, 2600); }, 700);
    if (n % 5 === 0) {
      var token = game;
      var bossDef = BOSSES[(Math.floor(n / 5) - 1) % BOSSES.length];
      setTimeout(function () {
        if (!state.game || state.game !== token || !state.game.active || state.game.wave !== n) return;
        state.game.bossPending = false;
        var boss = spawnGhost(bossDef, true, false);
        boss.hp = bossDef.hp + n * 2.6;
        boss.maxHp = boss.hp;
        state.game.boss = boss;
        state.ui.boss.classList.add('show');
        state.ui.bossName.textContent = bossDef.name.toUpperCase();
        state.ui.bossFill.style.width = '100%';
        showToast(bossDef.name.toUpperCase() + ' HAS ENTERED THE GRAVEYARD', 2800);
        updateHUD(true);
      }, 900);
    }
    updateHUD(true);
  }

  function updateWaves(dt) {
    var game = state.game;
    if (!game || !game.active) return;
    if (game.toSpawn > 0) {
      game.spawnTimer -= dt;
      if (game.spawnTimer <= 0) {
        game.spawnTimer = rand(0.28, 0.55);
        game.toSpawn--;
        spawnGhost(choose(TYPES), false, false);
        updateHUD();
      }
    }
    if (game.waveClearTimer > 0) {
      game.waveClearTimer -= dt;
      if (game.waveClearTimer <= 0) {
        game.waveClearTimer = 0;
        openDraft(game.wave + 1);
      }
    }
  }

  function openDraft(nextWave) {
    var game = state.game;
    if (!game || !game.active) return;
    var pool = BOONS.filter(function (b) { return boonRank(b.id) < b.max; });
    if (!pool.length) { startWave(nextWave); return; }
    for (var i = pool.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    var picks = pool.slice(0, Math.min(3, pool.length));
    game.draftNext = nextWave;
    state.mode = 'draft';
    state.firing = false;
    state.keys = {};
    resetStick();
    if (state.ui.draftCards) {
      state.ui.draftCards.innerHTML = picks.map(function (b, idx) {
        var rank = boonRank(b.id);
        return '<button class="gs3d-draft-card" type="button" data-boon="' + b.id + '" style="--relic:' + b.tone + '">' +
          '<span class="gs3d-draft-key">' + (idx + 1) + '</span>' +
          '<i>' + b.icon + '</i>' +
          '<b>' + b.name + '</b>' +
          '<small>' + b.desc + '</small>' +
          '<em>RANK ' + rank + ' / ' + b.max + '</em>' +
          '</button>';
      }).join('');
    }
    if (state.ui.draft) state.ui.draft.classList.add('show');
    playSound('pickup');
  }

  function chooseRelic(id) {
    if (state.mode !== 'draft' || !state.game) return;
    var boon = null;
    for (var i = 0; i < BOONS.length; i++) if (BOONS[i].id === id) boon = BOONS[i];
    if (!boon) return;
    var game = state.game;
    game.boons[id] = (game.boons[id] || 0) + 1;
    if (id === 'vitality') {
      game.maxHealth += 15;
      game.health = Math.min(game.maxHealth, game.health + 15);
    }
    var next = game.draftNext || game.wave + 1;
    game.draftNext = 0;
    if (state.ui.draft) state.ui.draft.classList.remove('show');
    state.mode = 'play';
    showToast('RELIC CLAIMED — ' + boon.name.toUpperCase(), 1400);
    playSound('pickup');
    updateHUD(true);
    startWave(next);
  }

  function skipDraft() {
    if (state.mode !== 'draft' || !state.game) return;
    var next = state.game.draftNext || state.game.wave + 1;
    state.game.draftNext = 0;
    if (state.ui.draft) state.ui.draft.classList.remove('show');
    state.mode = 'play';
    startWave(next);
  }

  function applyOmen(omen) {
    if (!state.scene || !state.renderer) return;
    if (!omen) {
      state.scene.fog.color.setHex(0x0b0618);
      state.scene.fog.density = 0.022;
      state.renderer.setClearColor(0x07030f, 1);
      state.scene.background.setHex(0x07030f);
      return;
    }
    state.scene.fog.color.setHex(omen.fog);
    state.scene.fog.density = omen.density;
    state.renderer.setClearColor(omen.fog, 1);
    state.scene.background.setHex(omen.fog);
  }

  /* ----------------------------------------------------------- projectiles */
  function makeAimAssist(origin, dir) {
    if (!setting('aimAssist')) return dir;
    var best = null, bestDot = Math.cos(state.ui && state.ui.stage.classList.contains('touch') ? 0.20 : 0.135);
    var v = new THREE.Vector3();
    for (var i = 0; i < state.ghosts.length; i++) {
      var g = state.ghosts[i];
      if (!g.alive) continue;
      v.set(g.x - origin.x, (g.group.position.y + 0.95 * g.size) - origin.y, g.z - origin.z);
      var len = v.length();
      if (len < 0.4) continue;
      v.multiplyScalar(1 / len);
      var dot = v.dot(dir);
      if (dot > bestDot) { bestDot = dot; best = g; }
    }
    if (!best) return dir;
    var target = new THREE.Vector3(best.x, best.group.position.y + 0.95 * best.size, best.z).sub(origin).normalize();
    return dir.clone().lerp(target, 0.62).normalize();
  }

  function fire() {
    if (state.mode !== 'play' || !state.game || !state.game.active) return;
    var now = nowMs();
    if (now < state.nextFire) return;
    var game = state.game;
    var weapon = activeWeapon();
    var rapid = game.power.rapid > 0;
    state.nextFire = now + weapon.cooldown * (rapid ? 0.55 : 1) * boonFireScale();
    var origin = state.camera.position.clone();
    var dir = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion).normalize();
    dir = makeAimAssist(origin, dir);
    var shots = weapon.shots + boonRank('split');
    for (var i = 0; i < shots; i++) {
      var d = dir.clone();
      if (weapon.shots === 1 && shots > 1) {
        var side = new THREE.Vector3(1, 0, 0).applyQuaternion(state.camera.quaternion);
        d.add(side.multiplyScalar((i - (shots - 1) / 2) * 0.044)).normalize();
      } else if (weapon.shots > 1) {
        var pelletSide = new THREE.Vector3(1, 0, 0).applyQuaternion(state.camera.quaternion);
        var pelletUp = new THREE.Vector3(0, 1, 0).applyQuaternion(state.camera.quaternion);
        d.add(pelletSide.multiplyScalar(rand(-weapon.spread, weapon.spread)))
          .add(pelletUp.multiplyScalar(rand(-weapon.spread, weapon.spread)))
          .normalize();
      }
      spawnProjectile(origin.clone().addScaledVector(d, 0.64), d, weapon, {
        damage: weapon.damage,
        pierce: weapon.pierce + boonRank('pierce'),
        chain: weapon.chain
      });
    }
    game.shots += shots;
    state.recoil = 1;
    state.muzzle = 1;
    state.shake = Math.max(state.shake, rapid ? 0.025 : 0.045);
    if (state.ui.reticle) {
      state.ui.reticle.classList.remove('fire');
      void state.ui.reticle.offsetWidth;
      state.ui.reticle.classList.add('fire');
    }
    if (state.weapon) {
      state.weapon.muzzle.material.opacity = 1;
      state.weapon.muzzle.scale.set(1.1, 1.1, 1);
      state.weapon.light.intensity = 4;
    }
    playSound('shot');
  }

  function spawnProjectile(pos, dir, weapon, opts) {
    var group = new THREE.Group();
    var size = weapon.size || 1;
    var core = new THREE.Mesh(
      new THREE.SphereGeometry(0.07 * size, 10, 8),
      new THREE.MeshBasicMaterial({ color: weapon.glow, toneMapped: false, fog: false })
    );
    group.add(core);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: state.glowTex, color: weapon.color, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    glow.scale.set(0.8 * size, 0.8 * size, 1);
    group.add(glow);
    group.position.copy(pos);
    state.scene.add(group);

    var lineGeo = new THREE.BufferGeometry();
    var lp = new Float32Array(7 * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    var line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
      color: weapon.color, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    line.frustumCulled = false;
    state.scene.add(line);

    state.projectiles.push({
      group: group, glow: glow, line: line, dir: dir.clone(), life: weapon.life,
      speed: weapon.speed, trail: [], damage: opts.damage, pierce: opts.pierce,
      chain: opts.chain, color: weapon.color, hitGhosts: [], hitDone: false
    });
  }

  function removeProjectile(p) {
    if (!p) return;
    state.scene.remove(p.group);
    p.group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    state.scene.remove(p.line);
    p.line.geometry.dispose();
    p.line.material.dispose();
  }

  function updateProjectiles(dt) {
    for (var i = state.projectiles.length - 1; i >= 0; i--) {
      var p = state.projectiles[i];
      p.life -= dt;
      var prevX = p.group.position.x, prevY = p.group.position.y, prevZ = p.group.position.z;
      p.group.position.addScaledVector(p.dir, p.speed * dt);
      var pos = p.group.position;
      var segX = pos.x - prevX, segY = pos.y - prevY, segZ = pos.z - prevZ;
      var segLen2 = segX * segX + segY * segY + segZ * segZ;
      var arr = p.line.geometry.attributes.position;
      p.trail.unshift([pos.x, pos.y, pos.z]);
      if (p.trail.length > 7) p.trail.pop();
      for (var k = 0; k < 7; k++) {
        var tp = p.trail[Math.min(k, p.trail.length - 1)] || [pos.x, pos.y, pos.z];
        arr.setXYZ(k, tp[0], tp[1], tp[2]);
      }
      arr.needsUpdate = true;
      var hits = [];
      for (var j = 0; j < state.ghosts.length; j++) {
        var g = state.ghosts[j];
        if (!g.alive || p.hitGhosts.indexOf(g) >= 0) continue;
        var cy = g.group.position.y + 0.95 * g.size;
        var rr = (g.isBoss ? 1.25 : 0.55) * (g.size / g.type.size) + 0.18;
        var t = 0;
        if (segLen2 > 0.00001) {
          t = ((g.x - prevX) * segX + (cy - prevY) * segY + (g.z - prevZ) * segZ) / segLen2;
          t = clamp(t, 0, 1);
        }
        var dx = prevX + segX * t - g.x;
        var dy = prevY + segY * t - cy;
        var dz = prevZ + segZ * t - g.z;
        if (dx * dx + dy * dy + dz * dz < rr * rr) hits.push({ ghost: g, t: t, at: new THREE.Vector3(prevX + segX * t, prevY + segY * t, prevZ + segZ * t) });
      }
      hits.sort(function (a, b) { return a.t - b.t; });
      var consumed = false;
      for (var h = 0; h < hits.length; h++) {
        var target = hits[h].ghost;
        if (!target.alive || p.hitGhosts.indexOf(target) >= 0) continue;
        if (state.game && !p.hitDone) { state.game.hits++; p.hitDone = true; }
        p.hitGhosts.push(target);
        var crit = Math.random() < boonCrit();
        var dmg = p.damage * boonDamage() * (crit ? 2.2 : 1);
        damageGhost(target, dmg, hits[h].at, { crit: crit, chain: p.chain });
        if (p.pierce > 0) p.pierce--;
        else { consumed = true; break; }
      }
      if (consumed) {
        removeProjectile(p);
        state.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || pos.y < 0.05 || pos.y > 34 || Math.abs(pos.x) > 46 || Math.abs(pos.z) > 46) {
        if (p.life <= 0) spawnBurst(pos, p.color, 5, 1.2, 0.1);
        removeProjectile(p);
        state.projectiles.splice(i, 1);
      }
    }
  }

  /* ------------------------------------------------------- enemy soulfire */
  function spawnEnemyShot(g, speed, damage, spread, homing) {
    if (!state.scene || !g || !g.alive) return;
    var from = new THREE.Vector3(g.x, g.group.position.y + g.size * 0.95, g.z);
    var target = new THREE.Vector3(state.player.x, 1.18, state.player.z);
    var dir = target.sub(from).normalize();
    var side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    dir.add(side.multiplyScalar(spread || 0)).normalize();
    var group = new THREE.Group();
    var core = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 8, 6),
      new THREE.MeshBasicMaterial({ color: g.type.glow, toneMapped: false, fog: false })
    );
    group.add(core);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: state.glowTex, color: g.type.color, transparent: true, opacity: 0.82,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    glow.scale.set(1.4, 1.4, 1);
    group.add(glow);
    group.position.copy(from);
    state.scene.add(group);
    state.enemyShots.push({
      group: group, core: core, glow: glow, dir: dir, speed: speed,
      damage: damage, life: 5.2, homing: !!homing, phase: rand(0, TAU)
    });
  }

  function removeEnemyShot(shot) {
    if (!shot) return;
    state.scene.remove(shot.group);
    shot.group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }

  function updateEnemyShots(dt) {
    for (var i = state.enemyShots.length - 1; i >= 0; i--) {
      var shot = state.enemyShots[i];
      shot.life -= dt;
      if (shot.homing) {
        var want = new THREE.Vector3(state.player.x, 1.18, state.player.z).sub(shot.group.position).normalize();
        shot.dir.lerp(want, clamp(dt * 1.8, 0, 1)).normalize();
      }
      shot.group.position.addScaledVector(shot.dir, shot.speed * dt);
      shot.core.rotation.y += dt * 6;
      shot.core.rotation.x += dt * 4;
      shot.glow.material.opacity = 0.7 + Math.sin(state.time * 9 + shot.phase) * 0.2;
      var p = shot.group.position;
      var px = p.x - state.player.x, pz = p.z - state.player.z;
      if (p.y > 0.25 && p.y < 2.55 && px * px + pz * pz < 0.42) {
        damagePlayer(shot.damage);
        spawnBurst(p.clone(), 0xff3355, 18, 3.2, 0.14);
        removeEnemyShot(shot);
        state.enemyShots.splice(i, 1);
        continue;
      }
      if (shot.life <= 0 || p.y < 0.05 || p.y > 28 || Math.abs(p.x) > 42 || Math.abs(p.z) > 42) {
        spawnBurst(p.clone(), shot.glow.material.color.getHex(), 5, 1.4, 0.09);
        removeEnemyShot(shot);
        state.enemyShots.splice(i, 1);
      }
    }
  }

  /* ---------------------------------------------------------- soul beams */
  function spawnBeam(from, to, color) {
    if (!state.scene) return;
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      from.x, from.y, from.z, to.x, to.y, to.z
    ]), 3));
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: color || 0xb388ff, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    line.frustumCulled = false;
    state.scene.add(line);
    state.beams.push({ line: line, life: 0.18, max: 0.18 });
  }

  function updateBeams(dt) {
    for (var i = state.beams.length - 1; i >= 0; i--) {
      var beam = state.beams[i];
      beam.life -= dt;
      if (beam.life <= 0) {
        state.scene.remove(beam.line);
        beam.line.geometry.dispose();
        beam.line.material.dispose();
        state.beams.splice(i, 1);
      } else {
        beam.line.material.opacity = clamp(beam.life / beam.max, 0, 1) * 0.9;
      }
    }
  }

  function clearBeams() {
    for (var i = 0; i < state.beams.length; i++) {
      var beam = state.beams[i];
      if (!beam) continue;
      state.scene.remove(beam.line);
      beam.line.geometry.dispose();
      beam.line.material.dispose();
    }
    state.beams.length = 0;
  }

  function dashAbility() {
    var game = state.game;
    if (state.mode !== 'play' || !game || !game.active || game.dashCd > 0) return;
    var fw = (state.keys.w || state.keys.arrowup ? 1 : 0) - (state.keys.s || state.keys.arrowdown ? 1 : 0);
    var st = (state.keys.d ? 1 : 0) - (state.keys.a ? 1 : 0);
    if (state.stick) { fw += state.stick.y; st += state.stick.x; }
    var mx, mz;
    if (fw || st) {
      var sy = Math.sin(state.player.yaw), cy = Math.cos(state.player.yaw);
      mx = sy * fw + cy * st;
      mz = -cy * fw + sy * st;
    } else {
      mx = -Math.sin(state.player.yaw);
      mz = -Math.cos(state.player.yaw);
    }
    var len = Math.hypot(mx, mz) || 1;
    game.dashDir = { x: mx / len, z: mz / len };
    game.dashTime = 0.2;
    game.dashCd = 6 * boonDashScale();
    game.invuln = Math.max(game.invuln, 0.38);
    state.shake = 0.22;
    spawnBurst(new THREE.Vector3(state.player.x, 1.1, state.player.z), 0x6ee7ff, 26, 4.2, 0.16);
    playSound('dash');
    updateHUD(true);
  }

  function novaAbility() {
    var game = state.game;
    if (state.mode !== 'play' || !game || !game.active || game.novaCd > 0) return;
    game.novaCd = 18 * boonNovaScale();
    var radius = 8;
    var damage = (2.8 + 0.45 * boonRank('nova')) * boonDamage();
    var targets = state.ghosts.slice();
    for (var i = 0; i < targets.length; i++) {
      var g = targets[i];
      if (!g.alive) continue;
      if (Math.hypot(g.x - state.player.x, g.z - state.player.z) > radius) continue;
      var at = new THREE.Vector3(g.x, g.group.position.y + g.size * 0.95, g.z);
      spawnBeam(new THREE.Vector3(state.player.x, 1.2, state.player.z), at, 0xd45bff);
      damageGhost(g, damage, at, { crit: true });
    }
    for (var s = state.enemyShots.length - 1; s >= 0; s--) {
      var shot = state.enemyShots[s];
      if (Math.hypot(shot.group.position.x - state.player.x, shot.group.position.z - state.player.z) < radius) {
        spawnBurst(shot.group.position.clone(), 0xd45bff, 8, 2, 0.1);
        removeEnemyShot(shot);
        state.enemyShots.splice(s, 1);
      }
    }
    state.shake = 0.48;
    spawnBurst(new THREE.Vector3(state.player.x, 1.1, state.player.z), 0xd45bff, 70, 7, 0.22);
    spawnBurst(new THREE.Vector3(state.player.x, 0.4, state.player.z), 0xff8c1a, 34, 5, 0.2);
    showToast('SOUL NOVA', 1100);
    playSound('nova');
    updateHUD(true);
  }

  function updateAbilities(dt) {
    var game = state.game;
    if (!game) return;
    game.dashCd = Math.max(0, game.dashCd - dt);
    game.novaCd = Math.max(0, game.novaCd - dt);
    game.invuln = Math.max(0, game.invuln - dt);
  }

  function damagePlayer(amount) {
    var game = state.game;
    if (!game || !game.active) return;
    if (game.invuln > 0) {
      spawnBurst(new THREE.Vector3(state.player.x, 1.3, state.player.z), 0x6ee7ff, 8, 2, 0.1);
      return;
    }
    game.invuln = Math.max(game.invuln, 0.34);
    game.health -= amount;
    state.shake = Math.min(0.55, state.shake + 0.22);
    playSound('damage');
    if (state.ui.damage) {
      state.ui.damage.classList.remove('hit');
      void state.ui.damage.offsetWidth;
      state.ui.damage.classList.add('hit');
    }
    if (game.health <= 0) {
      game.health = 0;
      updateHUD(true);
      gameOver();
    } else {
      updateHUD(true);
    }
  }

  function updatePlayer(dt) {
    var p = state.player;
    var fw = (state.keys.w || state.keys.arrowup ? 1 : 0) - (state.keys.s || state.keys.arrowdown ? 1 : 0);
    var st = (state.keys.d ? 1 : 0) - (state.keys.a ? 1 : 0);
    if (state.stick) { fw += state.stick.y; st += state.stick.x; }
    var speed = (state.keys.shift ? 7.2 : 4.7) * boonMoveScale();
    var mx = 0, mz = 0;
    if (fw || st) {
      var sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
      mx = (sy * fw + cy * st);
      mz = (-cy * fw + sy * st);
      var ml = Math.hypot(mx, mz) || 1;
      mx /= ml; mz /= ml;
      p.x += mx * speed * dt;
      p.z += mz * speed * dt;
      p.bob += dt * (state.keys.shift ? 14 : 10);
    } else {
      p.bob += dt * 2.2;
    }
    var game = state.game;
    if (game && game.dashTime > 0) {
      p.x += game.dashDir.x * 25 * dt;
      p.z += game.dashDir.z * 25 * dt;
      game.dashTime = Math.max(0, game.dashTime - dt);
      p.bob += dt * 24;
    }
    var r = Math.hypot(p.x, p.z);
    if (r > 25.8) { p.x *= 25.8 / r; p.z *= 25.8 / r; }
    if (state.keys.arrowleft) p.yaw += 1.8 * dt;
    if (state.keys.arrowright) p.yaw -= 1.8 * dt;
    p.y = 1.68 + Math.sin(p.bob) * (fw || st ? 0.035 : 0.008);
    if (state.firing || state.keys[' ']) fire();
  }

  function updateWeapon(dt) {
    if (!state.weapon) return;
    var w = state.weapon, game = state.game;
    var moving = state.mode === 'play' && (state.keys.w || state.keys.a || state.keys.s || state.keys.d || state.stick);
    var swayX = moving ? Math.sin(state.player.bob * 0.5) * 0.007 : Math.sin(state.time * 1.1) * 0.003;
    var swayY = moving ? Math.cos(state.player.bob) * 0.006 : Math.cos(state.time * 0.9) * 0.003;
    w.group.position.x = w.baseX + swayX;
    w.group.position.y = w.baseY + swayY;
    w.group.position.z = w.baseZ + Math.max(0, state.recoil) * 0.12;
    w.group.rotation.x = 0.02 - Math.max(0, state.recoil) * 0.09;
    w.group.rotation.z = -0.035 + swayX * 0.8;
    if (w.crystal) w.crystal.rotation.z += dt * 1.4;
    if (w.crystal) w.crystal.material.emissiveIntensity = 2.6 + Math.sin(state.time * 3) * 0.5 + (game && game.power.triple > 0 ? 1.2 : 0);
    if (w.muzzle) {
      w.muzzle.material.opacity = Math.max(0, w.muzzle.material.opacity - dt * 8);
      var s = 0.7 + w.muzzle.material.opacity * 0.5;
      w.muzzle.scale.set(s, s, 1);
    }
    if (w.light) w.light.intensity = Math.max(0, w.light.intensity - dt * 22);
    state.recoil = Math.max(0, state.recoil - dt * 7);
  }

  /* ---------------------------------------------------------- environment */
  function updateEnvironment(dt, t) {
    var env = state.env;
    if (!env) return;
    if (env.moon) env.moon.rotation.y += dt * 0.012;
    if (env.moonGlow) {
      var ms = 30 + Math.sin(t * 0.7) * 2.4;
      env.moonGlow.scale.set(ms, ms, 1);
    }
    if (env.stars) env.stars.rotation.y += dt * 0.004;
    if (env.stars2) env.stars2.rotation.y -= dt * 0.006;
    for (var i = 0; i < env.auroras.length; i++) {
      var a = env.auroras[i];
      a.position.x = a.userData.baseX + Math.sin(t * 0.055 + a.userData.phase) * 8;
      a.material.opacity = 0.035 + Math.sin(t * 0.09 + a.userData.phase) * 0.018;
    }
    if (env.ritual) {
      env.ritual.rotation.z += dt * 0.018;
      env.ritual.material.opacity = 0.52 + Math.sin(t * 0.8) * 0.15;
    }
    if (env.ritualRing) env.ritualRing.rotation.z += dt * 0.05;
    for (var f = 0; f < env.fogPlanes.length; f++) {
      var fog = env.fogPlanes[f], d = fog.userData;
      fog.rotation.z += d.spin * dt;
      fog.position.x += d.drift * dt;
      if (fog.position.x > 17) fog.position.x = -17;
      if (fog.position.x < -17) fog.position.x = 17;
      fog.position.y = d.baseY + Math.sin(t * 0.2 + d.phase) * 0.16;
      fog.material.opacity = 0.055 + Math.abs(Math.sin(t * 0.13 + d.phase)) * 0.05;
    }
    for (var fl = 0; fl < env.flames.length; fl++) {
      var flame = env.flames[fl];
      var flick = 0.72 + Math.random() * 0.35;
      flame.scale.set(0.18 + flick * 0.09, 0.30 + flick * 0.16, 1);
      flame.material.opacity = 0.64 + Math.random() * 0.32;
    }
    for (var w = 0; w < env.wisps.length; w++) {
      var wisp = env.wisps[w], wd = wisp.userData;
      wisp.position.y = wd.baseY + Math.sin(t * wd.speed + wd.phase) * 0.65;
      wisp.position.x += Math.sin(t * 0.12 + wd.phase) * dt * 0.12;
      wisp.material.opacity = 0.28 + Math.sin(t * 2.0 + wd.phase) * 0.18;
    }
    if (env.embers) env.embers.rotation.y += dt * 0.018;
    if (env.embers2) env.embers2.rotation.y -= dt * 0.026;
    if (env.pumpkins) {
      for (var p = 0; p < env.pumpkins.length; p++) {
        var pump = env.pumpkins[p];
        pump.rotation.y += dt * 0.02;
      }
    }
  }

  function updateCamera(dt, t) {
    var camera = state.camera;
    if (!camera) return;
    if (state.mode === 'idle' || state.mode === 'loading' || state.mode === 'over') {
      var angle = t * 0.12;
      var radius = 14.5;
      camera.position.set(Math.sin(angle) * radius, 3.9 + Math.sin(t * 0.45) * 0.35, Math.cos(angle) * radius);
      camera.lookAt(0, 1.8, 0);
      camera.rotation.z = Math.sin(t * 0.12) * 0.012;
      return;
    }
    var p = state.player;
    var shakeAmt = setting('shake') ? state.shake : 0;
    var shakeX = (Math.random() - 0.5) * shakeAmt;
    var shakeY = (Math.random() - 0.5) * shakeAmt;
    camera.position.set(p.x + shakeX, p.y + shakeY, p.z);
    camera.rotation.set(p.pitch, p.yaw, Math.sin(p.bob * 0.5) * 0.003 + (Math.random() - 0.5) * shakeAmt * 0.08, 'YXZ');
    state.shake = Math.max(0, state.shake - dt * 1.6);
  }

  function updateHUD(force) {
    var game = state.game;
    if (!game || !state.ui) return;
    var h = state.hud;
    var mult = 1 + Math.min(2.0, Math.max(0, game.combo - 1) * 0.08);
    var left = state.ghosts.length + game.toSpawn;
    if (force || h.score !== game.score) { state.ui.score.textContent = fmt(game.score); h.score = game.score; }
    if (force || h.wave !== game.wave) { state.ui.wave.textContent = game.wave; h.wave = game.wave; }
    if (force || h.combo !== game.combo) {
      state.ui.combo.textContent = 'x' + mult.toFixed(1);
      state.ui.comboChip.classList.toggle('hot', game.combo > 0);
      h.combo = game.combo;
    }
    if (force || h.kills !== game.kills) { state.ui.breed.textContent = game.kills; h.kills = game.kills; }
    var weapon = activeWeapon();
    if (force || h.weapon !== weapon.key) {
      if (state.ui.weaponName) state.ui.weaponName.textContent = weapon.short;
      state.ui.weapon.title = weapon.name + ' — ' + weapon.desc;
      h.weapon = weapon.key;
    }
    var dashLabel = game.dashCd > 0 ? Math.ceil(game.dashCd) + 's' : 'READY';
    if (force || h.dash !== dashLabel) {
      if (state.ui.dashCd) state.ui.dashCd.textContent = dashLabel;
      if (state.ui.dash) state.ui.dash.classList.toggle('cooling', game.dashCd > 0);
      h.dash = dashLabel;
    }
    var novaLabel = game.novaCd > 0 ? Math.ceil(game.novaCd) + 's' : 'READY';
    if (force || h.nova !== novaLabel) {
      if (state.ui.novaCd) state.ui.novaCd.textContent = novaLabel;
      if (state.ui.nova) state.ui.nova.classList.toggle('cooling', game.novaCd > 0);
      h.nova = novaLabel;
    }
    if (force || h.health !== game.health) {
      var pct = clamp(game.health / game.maxHealth * 100, 0, 100);
      state.ui.shieldFill.style.width = pct + '%';
      state.ui.shieldNum.textContent = Math.ceil(game.health);
      var shieldWrap = state.ui.shieldFill.closest('.gs3d-shield');
      if (shieldWrap) shieldWrap.classList.toggle('low', pct < 32);
      h.health = game.health;
    }
    var powerKey = Math.ceil(game.power.rapid) + Math.ceil(game.power.triple);
    if (force || h.power !== powerKey) {
      var bits = [];
      if (game.power.rapid > 0) bits.push('<span>RAPID <b>' + Math.ceil(game.power.rapid) + 's</b></span>');
      if (game.power.triple > 0) bits.push('<span>TRIPLE <b>' + Math.ceil(game.power.triple) + 's</b></span>');
      state.ui.power.innerHTML = bits.join('');
      h.power = powerKey;
    }
    if (game.boss) {
      state.ui.bossFill.style.width = clamp(game.boss.hp / game.boss.maxHp * 100, 0, 100) + '%';
    }
  }

  function drawRadar() {
    var ctx = state.radarCtx;
    if (!ctx || !state.game) return;
    var size = 200, c = size / 2, scale = 3.35;
    var px = state.player.x, pz = state.player.z;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, c - 4, 0, TAU);
    ctx.clip();
    var bg = ctx.createRadialGradient(c, c, 4, c, c, c);
    bg.addColorStop(0, 'rgba(28,15,52,.82)');
    bg.addColorStop(1, 'rgba(5,2,12,.9)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(168,130,255,.16)';
    ctx.lineWidth = 1;
    for (var ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.arc(c, c, (c - 8) * ring / 3, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(168,130,255,.10)';
    ctx.beginPath(); ctx.moveTo(c, 8); ctx.lineTo(c, size - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, c); ctx.lineTo(size - 8, c); ctx.stroke();
    var sweep = (state.time * 0.7) % TAU;
    ctx.strokeStyle = 'rgba(89,230,255,.18)';
    ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.cos(sweep) * 94, c + Math.sin(sweep) * 94); ctx.stroke();

    for (var i = 0; i < state.ghosts.length; i++) {
      var g = state.ghosts[i];
      if (!g.alive) continue;
      var dx = (g.x - px) * scale, dz = (g.z - pz) * scale;
      if (dx * dx + dz * dz > 92 * 92) continue;
      var gx = c + dx, gy = c + dz;
      if (g.isBoss) {
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#d6a4ff';
        ctx.shadowColor = '#b45cff';
        ctx.shadowBlur = 10;
        ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.fillStyle = hexColor(g.golden ? 0xffd166 : g.type.color);
        ctx.globalAlpha = g.golden ? 1 : 0.8;
        ctx.arc(gx, gy, g.golden ? 3.1 : 2.2, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    for (var p = 0; p < state.pickups.length; p++) {
      var pick = state.pickups[p];
      var pdx = (pick.group.position.x - px) * scale, pdz = (pick.group.position.z - pz) * scale;
      if (pdx * pdx + pdz * pdz < 92 * 92) {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(c + pdx - 1.5, c + pdz - 1.5, 3, 3);
      }
    }
    ctx.fillStyle = '#ff3355';
    for (var s = 0; s < state.enemyShots.length; s++) {
      var shot = state.enemyShots[s];
      var sdx = (shot.group.position.x - px) * scale, sdz = (shot.group.position.z - pz) * scale;
      if (sdx * sdx + sdz * sdz < 92 * 92) {
        ctx.beginPath();
        ctx.arc(c + sdx, c + sdz, 1.6, 0, TAU);
        ctx.fill();
      }
    }
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(-state.player.yaw);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = '#f4eeff';
    ctx.shadowColor = '#9b5cff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
    ctx.restore();

    ctx.strokeStyle = 'rgba(192,156,255,.42)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c, c, c - 4, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(216,200,245,.55)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', c, 15);
  }

  function projectToScreen(pos) {
    if (!state.camera || !state.renderer) return { x: 0, y: 0 };
    var v = pos.clone().project(state.camera);
    var w = state.renderer.domElement.clientWidth || 800;
    var h = state.renderer.domElement.clientHeight || 540;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 };
  }

  function floatText(text, worldPos, cls) {
    if (!state.ui || !state.ui.floatLayer) return;
    var p = projectToScreen(worldPos);
    if (!p.visible) return;
    var span = el('span', 'gs3d-float ' + (cls || ''), text);
    span.style.left = p.x + 'px';
    span.style.top = p.y + 'px';
    state.ui.floatLayer.appendChild(span);
    setTimeout(function () { if (span.parentNode) span.parentNode.removeChild(span); }, 900);
  }

  /* ------------------------------------------------------------ game loop */
  function loop(now) {
    state.raf = requestAnimationFrame(loop);
    if (!state.renderer) return;
    if (!state.lastNow) state.lastNow = now;
    var dt = Math.min(0.05, (now - state.lastNow) / 1000);
    state.lastNow = now;
    state.time += dt;
    var t = state.time;
    updateEnvironment(dt, t);
    if (state.mode === 'play' && state.game && state.game.active) {
      updateAbilities(dt);
      updatePlayer(dt);
      updateWaves(dt);
      if (state.mode === 'play') {
        for (var i = 0; i < state.ghosts.length; i++) updateGhost(state.ghosts[i], dt, t);
        updateProjectiles(dt);
        updateEnemyShots(dt);
        updatePickups(dt, t);
        updateBursts(dt);
        var game = state.game;
        if (game.comboTimer > 0) {
          game.comboTimer -= dt;
          if (game.comboTimer <= 0) { game.combo = 0; updateHUD(true); }
        }
        game.power.rapid = Math.max(0, game.power.rapid - dt);
        game.power.triple = Math.max(0, game.power.triple - dt);
        game.power.shield = Math.max(0, game.power.shield - dt);
        if ((game.power.rapid + game.power.triple) > 0 && Math.floor(t * 2) % 2 === 0) updateHUD();
        updateHUD();
        if (t - state.radarAccum > 0.1) { state.radarAccum = t; drawRadar(); }
      }
    } else if (state.mode === 'idle') {
      for (var j = 0; j < state.ghosts.length; j++) updateGhost(state.ghosts[j], dt, t);
      updateBursts(dt);
      updatePickups(dt, t);
    } else {
      updateBursts(dt);
    }
    updateBeams(dt);
    updateWeapon(dt);
    updateCamera(dt, t);
    state.renderer.render(state.scene, state.camera);
  }

  window.SpookyGhostShooter = { build: build, start: startGame, stop: stopGame };
})();

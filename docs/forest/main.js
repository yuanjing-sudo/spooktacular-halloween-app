/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — main.js
 *  The conductor. Owns the game loop, the save file, achievements, the
 *  interaction resolver, gathering, photo mode and every moving part.
 *
 *  Load order (endless-forest.html):
 *    util -> mesh -> world -> renderer -> carrots -> campfires -> rabbits
 *    -> player -> atmosphere -> ui -> main
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  var SAVE_KEY = 'spooky_forest_save_v2';
  var SETTINGS_KEY = 'spooky_forest_settings_v2';
  var AUTOSAVE_SECONDS = 42;
  var DEFAULT_SEED = 20261031;

  /* ------------------------------------------------------------------ */
  /*  Achievements                                                       */
  /* ------------------------------------------------------------------ */
  var ACHIEVEMENTS = [
    {
      id: 'first-step', name: 'First Step', desc: 'Walk ten metres into the woods.',
      progress: function (g) { return U.clamp(g.player.distanceWalked / 10, 0, 1); }
    },
    {
      id: 'wanderer', name: 'Wanderer', desc: 'Walk one kilometre.',
      progress: function (g) { return U.clamp(g.player.distanceWalked / 1000, 0, 1); }
    },
    {
      id: 'pathfinder', name: 'Pathfinder', desc: 'Walk five kilometres through the trees.',
      progress: function (g) { return U.clamp(g.player.distanceWalked / 5000, 0, 1); }
    },
    {
      id: 'horizon', name: 'Beyond the Horizon', desc: 'Reach chunk 25 from the origin.',
      progress: function (g) { return U.clamp(Math.max(g.furthestChunk, g.furthestChunkZ) / 25, 0, 1); }
    },
    {
      id: 'deep-roots', name: 'Deep Roots', desc: 'Descend below Y = -4.',
      progress: function (g) { return g.player.position[1] < -4 ? 1 : 0; }
    },
    {
      id: 'skybound', name: 'Skybound', desc: 'Fly above Y = 40.',
      progress: function (g) { return U.clamp(g.player.position[1] / 40, 0, 1); }
    },
    {
      id: 'first-carrot', name: 'Pulled From the Earth', desc: 'Harvest your first carrot.',
      progress: function (g) { return U.clamp(g.carrots.totalHarvested, 0, 1); }
    },
    {
      id: 'gardener', name: 'Patient Gardener', desc: 'Harvest twenty-five carrots.',
      progress: function (g) { return U.clamp(g.carrots.totalHarvested / 25, 0, 1); }
    },
    {
      id: 'farmer', name: 'Seed Keeper', desc: 'Plant ten carrots of your own.',
      progress: function (g) { return U.clamp(g.stats.planted / 10, 0, 1); }
    },
    {
      id: 'moon-carrot', name: 'Moonlit Harvest', desc: 'Pull a luminous moon carrot.',
      progress: function (g) { return U.clamp(g.stats.moonCarrots, 0, 1); }
    },
    {
      id: 'first-rabbit', name: 'A Nervous Hello', desc: 'Meet a rabbit.',
      progress: function (g) { return U.clamp(g.rabbits.met, 0, 1); }
    },
    {
      id: 'whisperer', name: 'Rabbit Whisperer', desc: 'Meet ten different rabbits.',
      progress: function (g) { return U.clamp(g.rabbits.met / 10, 0, 1); }
    },
    {
      id: 'bonded', name: 'Bonded', desc: 'Earn a rabbit\'s trust completely.',
      progress: function (g) { return U.clamp(g.rabbits.tamedCount, 0, 1); }
    },
    {
      id: 'warren-friend', name: 'Friend of the Warren', desc: 'Bond with five rabbits.',
      progress: function (g) { return U.clamp(g.rabbits.tamedCount / 5, 0, 1); }
    },
    {
      id: 'firestarter', name: 'Firestarter', desc: 'Light a campfire.',
      progress: function (g) { return U.clamp(g.campfires.totalLit, 0, 1); }
    },
    {
      id: 'keeper', name: 'Keeper of the Flame', desc: 'Light ten campfires.',
      progress: function (g) { return U.clamp(g.campfires.totalLit / 10, 0, 1); }
    },
    {
      id: 'storyteller', name: 'Around the Fire', desc: 'Hear five campfire stories.',
      progress: function (g) { return U.clamp(g.stats.stories / 5, 0, 1); }
    },
    {
      id: 'sweet-tooth', name: 'Sweet Tooth', desc: 'Roast five marshmallows.',
      progress: function (g) { return U.clamp(g.stats.marshmallows / 5, 0, 1); }
    },
    {
      id: 'cook', name: 'Hearth Cook', desc: 'Cook three carrots over a fire.',
      progress: function (g) { return U.clamp(g.campfires.totalCooked / 3, 0, 1); }
    },
    {
      id: 'all-biomes', name: 'Five Weathers', desc: 'Visit all five forest biomes.',
      progress: function (g) { return U.clamp(Object.keys(g.stats.visited).length / 5, 0, 1); }
    },
    {
      id: 'blood-moon', name: 'Blood Moon', desc: 'Witness the blood moon rise.',
      progress: function (g) { return U.clamp(g.stats.bloodMoons, 0, 1); }
    },
    {
      id: 'photographer', name: 'Shutterbug', desc: 'Take a photograph.',
      progress: function (g) { return U.clamp(g.stats.photos, 0, 1); }
    },
    {
      id: 'survivor', name: 'Long Night', desc: 'Reach day five.',
      progress: function (g) { return U.clamp((g.atmosphere.day - 1) / 4, 0, 1); }
    },
    {
      id: 'woodcutter', name: 'Gatherer', desc: 'Gather thirty pieces of fallen wood.',
      progress: function (g) { return U.clamp(g.stats.woodGathered / 30, 0, 1); }
    }
  ];

  /* ------------------------------------------------------------------ */
  /*  Game                                                               */
  /* ------------------------------------------------------------------ */
  function Game() {
    this.canvas = root.document.getElementById('forest-canvas');
    if (!this.canvas) throw new Error('Missing #forest-canvas');

    this.settings = this._defaultSettings();
    this.world = new SF.World(DEFAULT_SEED);
    this.renderer = new SF.Renderer(this.canvas, {});
    this.player = new SF.Player(this.world, {
      onAction: this._onPlayerAction.bind(this),
      onStep: this._onStep.bind(this)
    });
    this.atmosphere = new SF.Atmosphere(this.world, {
      startHour: 17.4,
      dayLength: 720,
      quality: this.settings.quality,
      onEvent: this._onAtmosphereEvent.bind(this)
    });
    this.carrots = new SF.Carrots(this.world, { onEvent: this._onCarrotEvent.bind(this) });
    this.campfires = new SF.Campfires(this.world, { onEvent: this._onFireEvent.bind(this) });
    this.rabbits = new SF.Rabbits(this.world, { onEvent: this._onRabbitEvent.bind(this) });
    this.ui = new SF.UI(this);

    this.state = this._freshState();
    this.stats = this._freshStats();
    this.achievements = ACHIEVEMENTS;
    this.running = false;
    this.paused = false;
    this.preview = true;
    this.previewAngle = 0;
    this.lights = [];
    this.currentInteraction = null;
    this.furthestChunk = 0;
    this.furthestChunkZ = 0;
    this.lastFrame = 0;
    this.frameDt = 0;
    this.playTime = 0;
    this.autosaveClock = AUTOSAVE_SECONDS;
    this.interactionClock = 0;
    this.achievementClock = 0;
    this.gatherClock = 0;
    this.gatherables = [];
    this.gathered = {};
    this.builder = new SF.MeshBuilder(90000);
    this.photoRequest = false;
    this.started = false;
    this._lastSaveAt = 0;
    this._errorShown = false;
    this._loopBound = this._loop.bind(this);
    this._resizeBound = this._onResize.bind(this);
  }

  Game.prototype._defaultSettings = function () {
    var mobile = U.Device.isMobile || U.Device.isTouch;
    return {
      distance: mobile ? 5 : 7,
      quality: mobile ? 1 : 2,
      sensitivity: 1,
      invertY: false,
      reduceMotion: U.Device.reduceMotion,
      audio: true
    };
  };

  Game.prototype._freshState = function () {
    return {
      achievements: {},
      friends: {},
      storiesHeard: [],
      firstHearthLit: false,
      createdAt: Date.now()
    };
  };

  Game.prototype._freshStats = function () {
    return {
      playTime: 0,
      stories: 0,
      marshmallows: 0,
      photos: 0,
      woodGathered: 0,
      planted: 0,
      carrotsEaten: 0,
      moonCarrots: 0,
      bloodMoons: 0,
      interactions: 0,
      visited: {},
      deaths: 0,
      distance: 0
    };
  };

  /* ------------------------------------------------------------------ */
  /*  Boot                                                               */
  /* ------------------------------------------------------------------ */
  Game.prototype.init = function () {
    try {
      this.renderer.setDrawDistance(this.settings.distance);
      this.renderer.init();
    } catch (e) {
      this._fatal(e && e.message ? e.message : 'WebGL could not start.');
      return;
    }
    this.applySettings(this._loadSettings(), true);
    this.player.attach(this.canvas);
    root.addEventListener('resize', this._resizeBound, false);
    root.addEventListener('orientationchange', this._resizeBound, false);
    if (U.Device.isTouch && root.document.body) {
      root.document.body.classList.add('touch');
      if (U.Device.isMobile) root.document.body.classList.add('mobile');
    }
    if (this.settings.reduceMotion && root.document.body) {
      root.document.body.classList.add('reduce-motion');
    }

    this._primePreview();
    this._updateSaveButton();
    var loading = root.document.getElementById('loading');
    if (loading) {
      setTimeout(function () { loading.classList.add('hidden'); }, 180);
    }
    root.requestAnimationFrame(this._loopBound);
  };

  Game.prototype._loadSettings = function () {
    var stored = U.Storage.get(SETTINGS_KEY, null);
    if (!stored || typeof stored !== 'object') return {};
    return stored;
  };

  Game.prototype._onResize = function () {
    if (this.renderer && this.renderer.ready) this.renderer.resize();
  };

  Game.prototype._primePreview = function () {
    var spawn = this.world.findSpawn();
    this.player.reset(spawn);
    this.player.enabled = false;
    this.world.preload(spawn.x, spawn.z, Math.min(2, this.settings.distance));
    this.atmosphere.updateTime(0.0001);
    this.campfires.sync(spawn.x, spawn.z);
    this.carrots.sync(spawn.x, spawn.z);
    this.rabbits.sync(this.player);
    this.renderer.syncChunks(this.world);
    this.previewAngle = this.player.yaw;
  };

  Game.prototype._fatal = function (message) {
    this._errorShown = true;
    try {
      this.ui.showError(message);
    } catch (e) {
      var box = root.document.getElementById('error');
      var text = root.document.getElementById('error-text');
      if (box) box.classList.add('show');
      if (text) text.textContent = message;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  World lifecycle                                                    */
  /* ------------------------------------------------------------------ */
  Game.prototype.newWorld = function (seed, intro) {
    seed = (seed === undefined || seed === null) ? DEFAULT_SEED : (seed | 0);
    this.world.reset(seed);
    var spawn = this.world.findSpawn();
    this.carrots.reset();
    this.campfires.reset();
    this.rabbits.reset();
    this.atmosphere.reset({ startHour: 17.4 });
    this.player.reset(spawn);
    this.player.wood = 7;
    this.player.marshmallows = 3;
    this.player.enabled = false;
    this.state = this._freshState();
    this.stats = this._freshStats();
    this.furthestChunk = 0;
    this.furthestChunkZ = 0;
    this.playTime = 0;
    this.currentInteraction = null;
    this.gatherables = [];
    this.gathered = {};
    this.autosaveClock = AUTOSAVE_SECONDS;
    this.renderer.origin[0] = 0;
    this.renderer.origin[1] = 0;
    if (this.renderer.clearChunks) this.renderer.clearChunks();
    this.world.preload(spawn.x, spawn.z, Math.min(3, this.settings.distance));
    this.campfires.sync(spawn.x, spawn.z);
    this.carrots.sync(spawn.x, spawn.z);
    this.rabbits.sync(this.player);
    this.renderer.syncChunks(this.world);
    this.preview = false;
    this.started = true;
    this._evaluateAchievements();
    this.saveGame(false);
    if (intro) {
      this.ui.toast('🌲 Seed ' + seed + ' — the forest unfolds in every direction.', 'good', 4.2);
      this.ui.toast('🧭 Follow the warm glow to The First Hearth.', 'info', 4.8);
    }
  };

  Game.prototype.loadGame = function (seed) {
    var save = U.Storage.get(SAVE_KEY, null);
    if (!save || !save.seed) {
      this.newWorld(seed === undefined ? DEFAULT_SEED : seed, true);
      return false;
    }
    try {
      var worldSeed = save.seed | 0;
      this.world.reset(worldSeed);
      var spawn = this.world.findSpawn();
      this.carrots.reset();
      this.campfires.reset();
      this.rabbits.reset();
      this.atmosphere.reset({ startHour: 17.4 });
      this.state = save.state || this._freshState();
      if (!this.state.achievements) this.state.achievements = {};
      this.stats = save.stats || this._freshStats();
      this.stats.visited = this.stats.visited || {};
      this.furthestChunk = save.furthestChunk || 0;
      this.furthestChunkZ = save.furthestChunkZ || 0;
      this.playTime = save.playTime || 0;
      this.gathered = save.gathered || {};
      this.carrots.load(save.carrots);
      this.campfires.load(save.campfires);
      this.rabbits.load(save.rabbits);
      this.atmosphere.load(save.atmosphere);
      this.player.load(save.player, spawn);
      this.player.enabled = false;
      this.currentInteraction = null;
      this.autosaveClock = AUTOSAVE_SECONDS;
      this.renderer.origin[0] = 0;
      this.renderer.origin[1] = 0;
      if (this.renderer.clearChunks) this.renderer.clearChunks();
      this.world.preload(this.player.position[0], this.player.position[2], Math.min(2, this.settings.distance));
      this.campfires.sync(this.player.position[0], this.player.position[2]);
      this.carrots.sync(this.player.position[0], this.player.position[2]);
      this.rabbits.sync(this.player);
      this.renderer.syncChunks(this.world);
      this.preview = false;
      this.started = true;
      this.ui.toast('🕯️ Welcome back. Day ' + this.atmosphere.day + ', ' + this.atmosphere.timeString() + '.', 'good', 4);
      this._evaluateAchievements();
      return true;
    } catch (e) {
      if (root.console) console.warn('[forest] save load failed', e);
      this.newWorld(seed === undefined ? DEFAULT_SEED : seed, true);
      return false;
    }
  };

  Game.prototype._updateSaveButton = function () {
    var btn = root.document.getElementById('btn-continue');
    if (!btn) return;
    var save = U.Storage.get(SAVE_KEY, null);
    if (!save) {
      btn.disabled = true;
      btn.classList.add('disabled');
      btn.setAttribute('title', 'No journey saved yet');
    } else {
      btn.disabled = false;
      btn.classList.remove('disabled');
      btn.setAttribute('title', 'Seed ' + save.seed + ' · day ' + (save.atmosphere ? save.atmosphere.day : 1));
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Serialisation                                                      */
  /* ------------------------------------------------------------------ */
  Game.prototype.serialize = function () {
    return {
      version: 2,
      seed: this.world.seed,
      savedAt: Date.now(),
      player: this.player.serialize(),
      carrots: this.carrots.serialize(),
      campfires: this.campfires.serialize(),
      rabbits: this.rabbits.serialize(),
      atmosphere: this.atmosphere.serialize(),
      state: this.state,
      stats: this.stats,
      furthestChunk: this.furthestChunk,
      furthestChunkZ: this.furthestChunkZ,
      playTime: this.playTime,
      gathered: this.gathered
    };
  };

  Game.prototype.saveGame = function (manual) {
    if (!this.started) return false;
    try {
      var ok = U.Storage.set(SAVE_KEY, this.serialize());
      this._lastSaveAt = Date.now();
      this.autosaveClock = AUTOSAVE_SECONDS;
      if (manual) {
        if (ok) {
          this.ui.toast('💾 Forest remembered. Seed ' + this.world.seed + '.', 'good');
          U.Audio.chime();
        } else {
          this.ui.toast('⚠️ The forest could not be saved (storage full?).', 'warn', 5);
        }
      }
      this._updateSaveButton();
      return ok;
    } catch (e) {
      if (manual) this.ui.toast('⚠️ Save failed: ' + e.message, 'warn', 5);
      return false;
    }
  };

  Game.prototype._deleteSave = function () {
    U.Storage.remove(SAVE_KEY);
    this._updateSaveButton();
  };

  /* ------------------------------------------------------------------ */
  /*  Settings                                                           */
  /* ------------------------------------------------------------------ */
  Game.prototype.applySettings = function (patch, silent) {
    if (patch) {
      if (patch.distance !== undefined) this.settings.distance = U.clamp(patch.distance | 0, 3, 12);
      if (patch.quality !== undefined) this.settings.quality = U.clamp(patch.quality | 0, 0, 2);
      if (patch.sensitivity !== undefined) this.settings.sensitivity = U.clamp(parseFloat(patch.sensitivity) || 1, 0.35, 2.5);
      if (patch.invertY !== undefined) this.settings.invertY = !!patch.invertY;
      if (patch.reduceMotion !== undefined) this.settings.reduceMotion = !!patch.reduceMotion;
      if (patch.audio !== undefined) this.settings.audio = !!patch.audio;
    }

    if (this.renderer && this.renderer.ready) {
      this.renderer.setDrawDistance(this.settings.distance);
      var dpr = root.devicePixelRatio || 1;
      var scale = this.settings.quality >= 2 ? Math.min(2, dpr) :
        this.settings.quality >= 1 ? Math.min(1.5, dpr) : Math.min(1.1, dpr) * 0.8;
      this.renderer.setDpr(scale);
    }
    if (this.atmosphere) this.atmosphere.setQuality(this.settings.quality);
    if (this.rabbits) this.rabbits.setQuality(this.settings.quality);
    if (this.carrots) this.carrots.setQuality(this.settings.quality);
    if (this.player) {
      this.player.mouseSensitivity = 0.0022 * this.settings.sensitivity;
      this.player.touchSensitivity = 0.004 * this.settings.sensitivity;
      this.player.invertY = this.settings.invertY;
    }
    if (U.Device.isTouch) {
      if (root.document.body) {
        root.document.body.classList.toggle('reduce-motion', !!this.settings.reduceMotion);
        root.document.body.classList.toggle('high-quality', this.settings.quality >= 2);
      }
    } else if (root.document.body) {
      root.document.body.classList.toggle('reduce-motion', !!this.settings.reduceMotion);
      root.document.body.classList.toggle('high-quality', this.settings.quality >= 2);
    }
    U.Storage.set(SETTINGS_KEY, this.settings);
    if (!silent && this.ui) this.ui.toast('⚙️ Settings applied.', 'info', 1.8);
  };

  /* ------------------------------------------------------------------ */
  /*  Player actions (keyboard + touch proxy)                            */
  /* ------------------------------------------------------------------ */
  Game.prototype._onPlayerAction = function (action, value) {
    if (!this.running && action !== 'photo') return;
    if (action === 'interact') { this.interact(); return; }
    if (action === 'jump') { this.player.jumpQueued = true; return; }
    if (action === 'call') {
      var n = this.rabbits.callCompanions(this.player);
      this.ui.toast(n ? '🐇 ' + n + ' friend' + (n === 1 ? '' : 's') + ' come running.' : '🐇 No bonded rabbits are far enough away to call.', 'info', 2.6);
      return;
    }
    if (action === 'journal') { this.ui.openJournal(); return; }
    if (action === 'map') { this.ui.openJournal('stats'); return; }
    if (action === 'pause') { this.ui.pause(); return; }
    if (action === 'photo') {
      if (value) {
        this.ui.toast('📷 Photo mode — WASD to drift, Shift to accelerate, Esc to return.', 'info', 4);
        if (root.document.pointerLockElement) root.document.exitPointerLock();
      }
      return;
    }
    if (action === 'camera') {
      this.ui.toast(value === 'third' ? '🎥 Third person.' : '🎥 First person.', 'info', 1.4);
      return;
    }
    if (action === 'fly') {
      this.ui.toast(value ? '🕊️ Flight — Space up, C down, F to land.' : '🥾 Back on the ground.', 'info', 2);
      return;
    }
    if (action === 'slot') {
      if (value === 1) this.eatCarrot();
      else if (value === 2) this.plantCarrot();
      else if (value === 5) this.ui.openJournal();
      return;
    }
    if (action === 'hurt') {
      if (value > 0) this.ui.toast('🩸 The fall bites deep (-' + Math.round(value) + ').', 'warn', 2.4);
      return;
    }
    if (action === 'respawn') {
      this.stats.deaths++;
      this.ui.toast('🌫️ The forest sets you gently back at the clearing.', 'warn', 4);
      return;
    }
    if (action === 'splash') {
      this._splashParticles();
      return;
    }
  };

  Game.prototype._onStep = function (surface) {
    if (surface === 'water' && Math.random() < 0.3) this._splashParticles();
  };

  Game.prototype._splashParticles = function () {
    var p = this.player;
    for (var i = 0; i < 6; i++) {
      p.footParticles.push({
        x: p.position[0] + (Math.random() - 0.5) * 0.7,
        y: p.position[1] + 0.1,
        z: p.position[2] + (Math.random() - 0.5) * 0.7,
        vx: (Math.random() - 0.5) * 1.2, vy: 0.6 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 1.2,
        gravity: -4, life: 0.35 + Math.random() * 0.3, maxLife: 0.65,
        size: 0.12, alpha: 0.6, color: [0.55, 0.72, 0.82], additive: false
      });
    }
  };

  /* ------------------------------------------------------------------ */
  /*  System events                                                      */
  /* ------------------------------------------------------------------ */
  Game.prototype._onCarrotEvent = function (name, data) {
    if (name === 'carrot:harvest') {
      var amount = data && data.amount ? data.amount : 1;
      var glow = data && data.plant && data.plant.glow;
      if (glow) this.stats.moonCarrots++;
      this.stats.interactions++;
      this.ui.toast('🥕 +' + amount + (glow ? ' Moon Carrot' : ' Carrot') + ' · ' + this.carrots.count + ' in your pack', 'good', 2.6);
      this._evaluateAchievements();
    } else if (name === 'carrot:planted') {
      this.stats.planted++;
      this.ui.toast('🌱 A seed goes into the dark earth.', 'good', 2);
      this._evaluateAchievements();
    } else if (name === 'carrot:watered') {
      this.ui.toast('💧 Watered. It will grow twice as fast.', 'info', 2.2);
    } else if (name === 'carrot:eaten') {
      this.stats.carrotsEaten++;
      this._eatReward(10, 4, 'carrot');
    }
  };

  Game.prototype._onFireEvent = function (name, data) {
    if (name === 'fire:lit') {
      this.stats.interactions++;
      this.state.firstHearthLit = true;
      this.ui.toast('🔥 ' + (data && data.name ? data.name : 'The fire') + ' wakes up.', 'good', 3);
      this._award('firestarter');
      this._evaluateAchievements();
    } else if (name === 'fire:story') {
      this.stats.stories++;
      if (data && data.story) this.state.storiesHeard.push(data.story);
      this._evaluateAchievements();
    } else if (name === 'fire:marshmallow') {
      this.stats.marshmallows++;
      this._evaluateAchievements();
    } else if (name === 'fire:cook-ready') {
      this.ui.toast('🍠 The carrot is ready. Golden at the edges.', 'good', 2.4);
    } else if (name === 'fire:cook-burnt') {
      this.ui.toast('🥀 The carrot has gone black. Take it before it turns to coal.', 'warn', 3);
    } else if (name === 'fire:out') {
      this.ui.toast('💨 A fire goes out somewhere in the dark.', 'info', 2.5);
    } else if (name === 'fire:doused') {
      this.ui.toast('🌧️ Rain puts out a campfire.', 'warn', 2.5);
    }
  };

  Game.prototype._onRabbitEvent = function (name, rabbit) {
    if (name === 'rabbit:met') {
      this.stats.interactions++;
      if (this.rabbits.met <= 3) this.ui.toast('🐇 You meet ' + rabbit.name + ' in the undergrowth.', 'info', 2.6);
      this._evaluateAchievements();
    } else if (name === 'rabbit:tamed') {
      this.state.friends[rabbit.name] = { name: rabbit.name, palette: rabbit.palette.key, at: Date.now() };
      this.ui.toast('💛 ' + rabbit.name + ' is bonded to you.', 'good', 3.4);
      this._award('bonded');
      this._evaluateAchievements();
    }
  };

  Game.prototype._onAtmosphereEvent = function (name, data) {
    if (name === 'day') {
      this.ui.toast('☀️ Day ' + data + ' in the endless wood.', 'info', 3.5);
      this._evaluateAchievements();
    } else if (name === 'bloodmoon') {
      this.stats.bloodMoons++;
      this.ui.toast('🩸 The blood moon rises. Rabbits go quiet. The trees lean closer.', 'warn', 6);
      this._award('blood-moon');
    } else if (name === 'weather' && this.started) {
      if (data === 'storm') this.ui.toast('⛈️ A storm gathers over the pines.', 'info', 3);
      else if (data === 'snow') this.ui.toast('🌨️ Snow begins to fall.', 'info', 3);
      else if (data === 'leaves') this.ui.toast('🍂 A leaf storm scatters through the clearing.', 'info', 3);
    }
  };

  Game.prototype._award = function (id) {
    if (this.state.achievements[id]) return false;
    var found = null;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].id === id) { found = ACHIEVEMENTS[i]; break; }
    }
    if (!found) return false;
    this.state.achievements[id] = true;
    this.ui.toast('🏆 <b>' + U.esc(found.name) + '</b><br><span class="toast-sub">' + U.esc(found.desc) + '</span>', 'good', 4.6);
    U.Audio.chime();
    if (SF.bus) SF.bus.emit('achievement', found);
    return true;
  };

  Game.prototype._evaluateAchievements = function () {
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      if (this.state.achievements[a.id]) continue;
      var complete = false;
      if (a.progress) complete = a.progress(this) >= 0.999;
      if (complete) this._award(a.id);
    }
  };

  Game.prototype.achievementsUnlockedCount = function () {
    var n = 0;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (this.state.achievements[ACHIEVEMENTS[i].id]) n++;
    }
    return n;
  };

  /* ------------------------------------------------------------------ */
  /*  Interactions                                                       */
  /* ------------------------------------------------------------------ */
  Game.prototype._refreshGatherables = function () {
    var out = [];
    var px = this.player.position[0], pz = this.player.position[2];
    var far = 34;
    var self = this;
    this.world.forEachChunk(function (chunk) {
      if (Math.abs(chunk.ox + 8 - px) > far || Math.abs(chunk.oz + 8 - pz) > far) return;
      for (var i = 0; i < chunk.props.length; i++) {
        var p = chunk.props[i];
        if (p.kind !== 'log') continue;
        var key = 'log|' + p.x.toFixed(2) + '|' + p.z.toFixed(2) + '|' + Math.round(p.seed || 0);
        if (self.gathered[key]) continue;
        if (U.dist2(p.x, p.z, px, pz) > far * far) continue;
        out.push({ key: key, kind: 'log', x: p.x, y: p.y, z: p.z, seed: p.seed });
      }
    });
    this.gatherables = out;
  };

  Game.prototype._gatherInteraction = function () {
    if (!this.gatherables.length) return null;
    var px = this.player.position[0], py = this.player.position[1], pz = this.player.position[2];
    var best = null, bd = 3.4 * 3.4;
    for (var i = 0; i < this.gatherables.length; i++) {
      var g = this.gatherables[i];
      if (Math.abs(g.y - py) > 2.4) continue;
      var d = U.dist2(g.x, g.z, px, pz);
      if (d < bd) { bd = d; best = g; }
    }
    if (!best) return null;
    return {
      type: 'wood', label: 'Gather Fallen Wood',
      sub: '+2 wood · dry enough to burn', target: best, range: 3.4, priority: 2
    };
  };

  Game.prototype.updateInteraction = function () {
    var list = [];
    var fire = this.campfires.interaction(this.player, this.carrots);
    if (fire) list.push(fire);
    var rabbit = this.rabbits.interaction(this.player, this.carrots);
    if (rabbit) list.push(rabbit);
    var carrot = this.carrots.interaction(this.player);
    if (carrot) list.push(carrot);
    var wood = this._gatherInteraction();
    if (wood) list.push(wood);

    var best = null;
    for (var i = 0; i < list.length; i++) {
      if (!list[i]) continue;
      if (!best) { best = list[i]; continue; }
      // Campfires win ties because their menu is the deepest interaction.
      if (list[i].priority > best.priority) best = list[i];
      else if (list[i].priority === best.priority && best.type !== 'campfire' && list[i].type === 'campfire') best = list[i];
    }
    this.currentInteraction = best;
  };

  Game.prototype.interact = function () {
    if (!this.running || this.paused || !this.player.enabled || this.player.photoMode) return;
    this.updateInteraction();
    var inter = this.currentInteraction;
    if (!inter) {
      U.Audio.pop();
      this.ui.toast('Nothing close enough. The forest is listening anyway.', 'info', 1.8);
      return;
    }
    if (inter.type === 'campfire') {
      this.ui.openFireMenu(inter.target);
      return;
    }
    if (inter.type === 'rabbit') {
      var res = this.rabbits.interact(this.player, this.carrots);
      if (res && res.text) this.ui.toast(res.text, res.kind || 'good', 3.2);
      this.stats.interactions++;
      this._evaluateAchievements();
      this.updateInteraction();
      return;
    }
    if (inter.type === 'carrot' || inter.type === 'carrot-water') {
      var out = this.carrots.interact(this.player);
      if (out && out.watered) {
        this.ui.toast('💧 The sprout drinks. Growth doubled.', 'info', 2);
      }
      this.updateInteraction();
      return;
    }
    if (inter.type === 'wood') {
      this._gatherWood(inter.target);
      this.updateInteraction();
    }
  };

  Game.prototype._gatherWood = function (node) {
    if (!node || this.gathered[node.key]) return;
    this.gathered[node.key] = 1;
    this.player.wood += 2;
    this.stats.woodGathered += 2;
    this.stats.interactions++;
    U.Audio.pop();
    U.Audio.noise(0.12, 0.04, 1400);
    this.ui.toast('🪵 +2 wood · ' + this.player.wood + ' in your pack', 'good', 2.2);
    this._spawnWoodSparkle(node);
    this._evaluateAchievements();
  };

  Game.prototype._spawnWoodSparkle = function (node) {
    for (var i = 0; i < 5; i++) {
      this.player.footParticles.push({
        x: node.x + (Math.random() - 0.5) * 0.4,
        y: node.y + 0.2,
        z: node.z + (Math.random() - 0.5) * 0.4,
        vx: (Math.random() - 0.5) * 0.4, vy: 0.5 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.4,
        gravity: -1.2, life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
        size: 0.1, alpha: 0.7, color: [1.0, 0.72, 0.32], additive: true
      });
    }
  };

  Game.prototype.performFireAction = function (actionId) {
    var fire = this.currentInteraction && this.currentInteraction.type === 'campfire'
      ? this.currentInteraction.target : this.campfires.nearest(this.player, 4.6);
    if (!fire) { this.ui.toast('No campfire close enough.', 'warn', 2); return; }
    var result = this.campfires.perform(actionId, fire, {
      player: this.player, carrots: this.carrots, game: this
    });
    if (!result) return;
    if (result.story) {
      this.ui.showStory(result.story);
      this.ui.toast('📖 You listen until the fire settles.', 'good', 3);
    } else if (result.text) {
      this.ui.toast(result.text, result.kind || 'info', result.kind === 'warn' ? 3.4 : 3);
    }
    this.stats.interactions++;
    if (actionId === 'sit') this.stats.stories++;
    if (actionId === 'roast-marshmallow') this.stats.marshmallows++;
    if (actionId === 'warm') this._spawnWarmthParticles(fire);
    if (actionId === 'light') this._award('firestarter');
    this._evaluateAchievements();
    this.updateInteraction();
  };

  Game.prototype._spawnWarmthParticles = function (fire) {
    for (var i = 0; i < 8; i++) {
      this.player.footParticles.push({
        x: this.player.position[0] + (Math.random() - 0.5) * 0.9,
        y: this.player.position[1] + 0.5 + Math.random() * 0.7,
        z: this.player.position[2] + (Math.random() - 0.5) * 0.9,
        vx: 0, vy: 0.4 + Math.random() * 0.4, vz: 0,
        gravity: -0.2, life: 0.7 + Math.random() * 0.5, maxLife: 1.2,
        size: 0.12, alpha: 0.7, color: [1.0, 0.66, 0.28], additive: true
      });
    }
    if (fire) fire.glow = Math.min(1.4, fire.glow + 0.12);
  };

  Game.prototype.eatCarrot = function () {
    if (!this.running || this.paused) return;
    if (this.carrots.roasted > 0) {
      this.carrots.roasted--;
      this._eatReward(26, 10, 'roasted');
      this.ui.toast('🍠 Roasted carrot eaten. Warmth floods back.', 'good', 2.6);
      this._evaluateAchievements();
      return;
    }
    if (this.carrots.eat(1)) {
      this.ui.toast('🥕 Crunchy, cold and slightly haunted.', 'good', 2.2);
      this._evaluateAchievements();
    } else {
      this.ui.toast('No carrots in your pack.', 'warn', 2);
    }
  };

  Game.prototype._eatReward = function (warmth, health, kind) {
    this.player.warmth = Math.min(this.player.maxWarmth, this.player.warmth + warmth);
    this.player.health = Math.min(this.player.maxHealth, this.player.health + health);
    if (kind === 'roasted') this.stats.marshmallows += 0;
  };

  Game.prototype.plantCarrot = function () {
    if (!this.running || this.paused || !this.player.enabled) return;
    if (this.carrots.seeds <= 0) {
      this.ui.toast('No seeds left. Harvest wild carrots to find more.', 'warn', 2.6);
      return;
    }
    if (this.player.flying) {
      this.ui.toast('You cannot plant a carrot in the sky. Yet.', 'warn', 2.4);
      return;
    }
    var f = this.player.getForward();
    var x = this.player.position[0] + f[0] * 1.25;
    var z = this.player.position[2] + f[2] * 1.25;
    if (this.world.waterAt(x, z)) {
      this.ui.toast('The ground there is underwater.', 'warn', 2.2);
      return;
    }
    var y = this.world.heightAt(x, z);
    var plant = this.carrots.plantAt(x, y, z, this.player);
    if (plant) this.ui.toast('🌱 Planted. Water it with E to hurry it along.', 'good', 3);
  };

  /* ------------------------------------------------------------------ */
  /*  Photo mode                                                         */
  /* ------------------------------------------------------------------ */
  Game.prototype.requestCapture = function () {
    if (!this.running) return;
    this.photoRequest = true;
  };

  Game.prototype._capturePhoto = function () {
    this.photoRequest = false;
    try {
      var url = this.canvas.toDataURL('image/png');
      var name = 'spooky-forest-' + this.world.seed + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.png';
      var a = root.document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      root.document.body.appendChild(a);
      a.click();
      setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 1200);
      this.stats.photos++;
      this.ui.toast('📷 Photograph taken. If it did not download, long-press the image canvas.', 'good', 4);
      this._award('photographer');
      this._flashScreen();
      U.Audio.pop();
      this._evaluateAchievements();
    } catch (e) {
      this.ui.toast('📷 The camera failed: ' + e.message, 'warn', 4);
    }
  };

  Game.prototype._flashScreen = function () {
    var flash = root.document.getElementById('flash');
    if (!flash) return;
    flash.style.transition = 'none';
    flash.style.opacity = '0.85';
    setTimeout(function () {
      flash.style.transition = 'opacity 420ms ease-out';
      flash.style.opacity = '0';
    }, 30);
  };

  /* ------------------------------------------------------------------ */
  /*  Frame loop                                                         */
  /* ------------------------------------------------------------------ */
  Game.prototype._loop = function (now) {
    root.requestAnimationFrame(this._loopBound);
    var dt = this.lastFrame ? (now - this.lastFrame) / 1000 : 0.016;
    this.lastFrame = now;
    dt = U.clamp(dt, 0.001, 0.06);
    this.frameDt = dt;

    if (this.running) {
      if (this.paused) this._framePaused(dt, now);
      else this._framePlay(dt, now);
    } else {
      this._framePreview(dt, now);
    }
  };

  Game.prototype._framePreview = function (dt, now) {
    this.previewAngle += dt * 0.045;
    this.atmosphere.updateTime(dt * 0.12);
    this.player.yaw = this.previewAngle;
    var env = this.atmosphere.getEnv();
    this.world.streamAround(this.player.position[0], this.player.position[2], Math.min(4, this.settings.distance), 1);
    this.renderer.syncChunks(this.world);
    this.campfires.sync(this.player.position[0], this.player.position[2]);
    this.carrots.sync(this.player.position[0], this.player.position[2]);
    this.rabbits.sync(this.player);
    this._render(env, now, true);
    this.ui.update(this, dt);
  };

  Game.prototype._framePaused = function (dt, now) {
    var env = this.atmosphere.getEnv();
    this._render(env, now, true);
    this.ui.update(this, dt);
  };

  Game.prototype._framePlay = function (dt, now) {
    var player = this.player;
    this.playTime += dt;
    this.stats.playTime += dt;
    this.autosaveClock -= dt;

    var env = this.atmosphere.update(dt, player);
    player.update(dt, this.world, env, this.campfires);
    this.campfires.update(dt, this.atmosphere.time, player, env);
    this.carrots.update(dt, this.atmosphere.time, player);
    this.rabbits.update(dt, this.atmosphere.time, player, {
      env: env, carrots: this.carrots, campfires: this.campfires
    });

    // Vertical bounds: the world is tall, but not infinite in Y.
    if (player.position[1] < -16) {
      player.position[1] = -16;
      player.velocity[1] = Math.max(0, player.velocity[1]);
    }
    if (player.position[1] > 76) {
      player.position[1] = 76;
      player.velocity[1] = Math.min(0, player.velocity[1]);
    }

    // Streaming.
    var budget = this.settings.quality >= 2 ? 2 : 1;
    this.world.streamAround(player.position[0], player.position[2], this.settings.distance, budget);
    this.renderer.syncChunks(this.world);

    // Chart progress.
    var cx = Math.abs(this.world.chunkCoord(player.position[0]));
    var cz = Math.abs(this.world.chunkCoord(player.position[2]));
    if (cx > this.furthestChunk) this.furthestChunk = cx;
    if (cz > this.furthestChunkZ) this.furthestChunkZ = cz;
    if (player.biome) {
      this.stats.visited[player.biome.key] = (this.stats.visited[player.biome.key] || 0) + dt;
    }

    this.interactionClock -= dt;
    if (this.interactionClock <= 0) {
      this.interactionClock = 0.12;
      this.updateInteraction();
    }
    this.gatherClock -= dt;
    if (this.gatherClock <= 0) {
      this.gatherClock = 1.6;
      this._refreshGatherables();
    }
    this.achievementClock -= dt;
    if (this.achievementClock <= 0) {
      this.achievementClock = 2;
      this._evaluateAchievements();
    }

    if (this.autosaveClock <= 0) this.saveGame(false);

    this._render(env, now, false);
    this.ui.update(this, dt);
    if (this.photoRequest) this._capturePhoto();
  };

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                          */
  /* ------------------------------------------------------------------ */
  Game.prototype._collectLights = function (env) {
    var lights = this.lights;
    lights.length = 0;
    this.campfires.collectLights(this.player, lights);
    // Hand lantern: a soft moving pool of light around the keeper.
    var dark = env.night || env.rain > 0.5 || env.fog > 0.56;
    if (dark && !this.player.photoMode) {
      var p = this.player;
      lights.push({
        x: p.position[0] + Math.sin(p.yaw) * 0.45,
        y: p.position[1] + 1.25 + p.bob * 0.4,
        z: p.position[2] + Math.cos(p.yaw) * 0.45,
        radius: 4.8,
        color: [1.0, 0.64, 0.28],
        intensity: 0.55 + Math.sin(this.atmosphere.time * 2.3) * 0.045,
        lantern: true
      });
    }
    env.lights = lights;
    return lights;
  };

  Game.prototype._buildDynamic = function (time, env) {
    var b = this.builder;
    b.reset();
    this.player.build(b, time, env);
    this.carrots.build(b, this.player, time, this.settings.reduceMotion);
    this.campfires.build(b, time, this.player, this.settings.reduceMotion);
    this.rabbits.build(b, time, this.player, this.settings.reduceMotion);
    this._buildGatherMarkers(b, time);
    return b;
  };

  Game.prototype._buildGatherMarkers = function (b, time) {
    if (!this.gatherables.length) return;
    var px = this.player.position[0], pz = this.player.position[2];
    var pulse = 0.65 + Math.sin(time * 3.1) * 0.25;
    for (var i = 0; i < this.gatherables.length; i++) {
      var g = this.gatherables[i];
      if (U.dist2(g.x, g.z, px, pz) > 18 * 18) continue;
      if (this.gathered[g.key]) continue;
      var bob = Math.sin(time * 1.7 + g.x * 0.7 + g.z) * 0.07;
      b.push();
      b.translate(g.x, g.y + 0.46 + bob, g.z);
      b.sphere(0, 0, 0, 0.05, 5, 3, [1.0, 0.72, 0.3], pulse);
      b.star(0, 0.03, 0, 0.09, 4, 0.015, [1.0, 0.8, 0.4], pulse * 0.9);
      b.pop();
    }
  };

  Game.prototype._mergeParticles = function () {
    var out = [];
    var cap = this.settings.quality >= 2 ? 900 : this.settings.quality >= 1 ? 620 : 380;
    var groups = [this.campfires.particles, this.atmosphere.particles, this.rabbits.particles, this.player.footParticles];
    for (var g = 0; g < groups.length; g++) {
      var list = groups[g];
      for (var i = 0; i < list.length && out.length < cap; i++) {
        var p = list[i];
        if (p.alpha !== undefined && p.alpha <= 0.01) continue;
        out.push(p);
      }
    }
    return out;
  };

  Game.prototype._render = function (env, now, preview) {
    if (!this.renderer.ready) return;
    if (this.settings.reduceMotion) env.wind = Math.min(env.wind, 0.2);
    var camera;
    if (preview) {
      var p = this.player;
      camera = {
        eye: [p.position[0] - Math.sin(this.previewAngle) * 5.4, p.position[1] + 2.6, p.position[2] - Math.cos(this.previewAngle) * 5.4],
        yaw: this.previewAngle, pitch: -0.12, fov: 66
      };
    } else {
      camera = this.player.getCamera();
    }
    this._collectLights(env);
    this.renderer.begin(camera, env, now);
    this.renderer.drawSky();
    this.renderer.drawChunks(true);
    var b = this._buildDynamic(this.atmosphere.time, env);
    this.renderer.drawDynamic(b);
    this.renderer.drawChunks(false);
    this.renderer.drawParticles(this._mergeParticles());
    this.renderer.end(now);
  };

  /* ------------------------------------------------------------------ */
  /*  Debug helpers exposed for the curious                              */
  /* ------------------------------------------------------------------ */
  Game.prototype.teleport = function (x, y, z) {
    this.player.position = [x, y, z];
    this.player.velocity = [0, 0, 0];
    this.world.preload(x, z, Math.min(2, this.settings.distance));
    this.campfires.sync(x, z);
    this.carrots.sync(x, z);
    this.rabbits.sync(this.player);
    this.renderer.syncChunks(this.world);
    this.ui.toast('✨ Teleported to ' + x.toFixed(1) + ', ' + y.toFixed(1) + ', ' + z.toFixed(1), 'info', 2.4);
  };

  Game.prototype.setTime = function (hour) {
    this.atmosphere.timeOfDay = U.mod(hour, 24);
    this.atmosphere.updateTime(0.0001);
    this.ui.toast('🕯️ Time set to ' + this.atmosphere.timeString(), 'info', 2);
  };

  Game.prototype.spawnRabbitNear = function (name) {
    var p = this.player.position;
    var x = p[0] + (Math.random() - 0.5) * 4;
    var z = p[2] + (Math.random() - 0.5) * 4;
    var r = this.rabbits._spawnRabbit(x, this.world.heightAt(x, z), z, null, this.player, false);
    if (r && name) r.name = name;
    return r;
  };

  Game.prototype.give = function (what, amount) {
    amount = amount || 1;
    if (what === 'carrot') this.carrots.count += amount;
    else if (what === 'wood') this.player.wood += amount;
    else if (what === 'marshmallow') this.player.marshmallows += amount;
    else if (what === 'seed') this.carrots.seeds += amount;
    else if (what === 'roasted') this.carrots.roasted += amount;
    this.ui.toast('🎁 Debug: +' + amount + ' ' + what, 'info', 1.6);
  };

  Game.prototype.destroy = function () {
    this.running = false;
    root.removeEventListener('resize', this._resizeBound, false);
    root.removeEventListener('orientationchange', this._resizeBound, false);
  };

  /* ------------------------------------------------------------------ */
  /*  Boot                                                               */
  /* ------------------------------------------------------------------ */
  function boot() {
    try {
      var game = new Game();
      root.SpookyForestGame = game;
      game.init();
      if (SF.bus) {
        SF.bus.emit('game:ready', game);
      }
    } catch (e) {
      if (root.console) console.error('[forest] boot failed', e);
      var box = root.document.getElementById('error');
      var text = root.document.getElementById('error-text');
      if (box) box.classList.add('show');
      if (text) {
        text.textContent = (e && e.message ? e.message : 'The forest failed to grow.') +
          ' Try a browser with WebGL enabled, or reload the page.';
      }
      var loading = root.document.getElementById('loading');
      if (loading) loading.classList.add('hidden');
    }
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', boot, false);
  } else {
    boot();
  }

  SF.Game = Game;
  SF.ACHIEVEMENTS = ACHIEVEMENTS;
  SF.SAVE_KEY = SAVE_KEY;
})(typeof window !== 'undefined' ? window : globalThis);

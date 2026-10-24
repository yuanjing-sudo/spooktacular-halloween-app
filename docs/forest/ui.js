/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — ui.js
 *  Start screen, HUD, compass, minimap, campfire action menu, journal,
 *  achievements, settings, photo mode, touch controls and toasts.
 *  All DOM; no framework.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  function UI(game) {
    this.game = game;
    this.el = {};
    this.tab = 'rabbits';
    this.toastTimer = null;
    this.lastHud = 0;
    this.lastMap = 0;
    this.promptKey = null;
    this.debug = false;
    this.started = false;
    this.joystickId = null;
    this.lookId = null;
    this.lookLast = null;
    this.photo = false;
    this._build();
    this._bind();
  }

  UI.prototype._byId = function (id) { return root.document.getElementById(id); };

  UI.prototype._build = function () {
    var ids = [
      'forest-canvas', 'start-screen', 'seed-input', 'btn-start', 'btn-continue', 'btn-new-world',
      'hud', 'hud-coords', 'hud-biome', 'hud-clock', 'hud-day', 'hud-weather', 'hud-compass',
      'stat-carrots', 'stat-wood', 'stat-marshmallows', 'stat-rabbits', 'stat-fires',
      'fps', 'chunks', 'prompt', 'prompt-key', 'prompt-label', 'prompt-sub',
      'minimap', 'toasts', 'fire-menu', 'fire-title', 'fire-sub', 'fire-actions', 'fire-close',
      'journal', 'journal-tabs', 'journal-body', 'journal-close', 'journal-title',
      'settings', 'settings-close', 'settings-distance', 'settings-quality', 'settings-audio',
      'settings-sensitivity', 'settings-invert', 'settings-motion', 'settings-fps', 'settings-apply',
      'pause', 'btn-resume', 'btn-save', 'btn-settings', 'btn-journal', 'btn-new2', 'btn-pause',
      'photo-bar', 'photo-capture', 'photo-exit',
      'flash', 'vignette', 'frost', 'blood', 'cooking-hud', 'cooking-bar', 'cooking-label',
      'mobile-controls', 'joystick-base', 'joystick-knob', 'btn-e', 'btn-jump', 'btn-fly',
      'btn-run', 'btn-cam', 'loading', 'loading-text', 'error', 'error-text',
      'hotbar', 'story-popup', 'story-text', 'story-close', 'debug', 'crosshair',
      'btn-photo', 'btn-journal2', 'btn-map', 'btn-pause2', 'btn-sound', 'btn-help',
      'help', 'help-close', 'help-body'
    ];
    for (var i = 0; i < ids.length; i++) this.el[ids[i]] = this._byId(ids[i]);
    this.el.startScreen = this.el['start-screen'];
    this.el.journal = this.el.journal;
    this.ctx = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.setSeedFromURL();
  };

  UI.prototype.setSeedFromURL = function () {
    try {
      var params = new URLSearchParams(root.location.search);
      var seed = params.get('seed');
      if (!seed) {
        // Also accept #seed=12345 and bare numeric hashes.
        var hash = String(root.location.hash || '').replace(/^#/, '');
        if (hash) {
          var hp = new URLSearchParams(hash);
          seed = hp.get('seed') || (/^\d+$/.test(hash) ? hash : null);
        }
      }
      if (seed && this.el['seed-input']) this.el['seed-input'].value = seed;
    } catch (e) {}
  };

  /* ------------------------------------------------------------------ */
  /*  Binding                                                            */
  /* ------------------------------------------------------------------ */
  UI.prototype._bind = function () {
    var self = this;
    var g = this.game;

    function click(id, fn) {
      var node = self._byId(id);
      if (node) U.on(node, 'click', function (e) { e.preventDefault(); fn(e); });
    }

    click('btn-start', function () { self.start(false); });
    click('btn-continue', function () { self.start(true); });
    click('btn-new-world', function () { self.newWorld(); });
    click('btn-resume', function () { self.resume(); });
    click('btn-resume2', function () { self.resume(); });
    click('btn-save', function () { g.saveGame(true); });
    click('btn-settings', function () { self.openSettings(); });
    click('btn-journal', function () { self.openJournal(); });
    click('btn-journal2', function () { self.openJournal(); });
    click('btn-new2', function () { self.newWorld(); });
    click('btn-pause', function () { self.pause(); });
    click('btn-photo', function () { g.player.togglePhoto(); });
    click('btn-map', function () { self.openJournal('stats'); });
    click('btn-pause2', function () { self.pause(); });
    click('btn-sound', function () {
      var on = !U.Audio.enabled;
      U.Audio.setEnabled(on);
      U.Storage.set('spooky_forest_audio', on);
      self.toast(on ? '🔊 Sound on' : '🔇 Sound off', 'info');
    });
    click('btn-help', function () { self.showHelp(true); });
    click('help-close', function () { self.showHelp(false); });
    click('help-close2', function () { self.showHelp(false); });
    click('settings-apply', function () { self.closeSettings(); });
    click('journal-close', function () { self.closeJournal(); });
    click('settings-close', function () { self.closeSettings(); });
    click('fire-close', function () { self.closeFireMenu(); });
    click('story-close', function () { self.el['story-popup'].classList.remove('show'); });
    click('photo-capture', function () { g.requestCapture(); });
    click('photo-exit', function () { if (g.player.photoMode) g.player.togglePhoto(); });

    // Journal tabs.
    if (this.el['journal-tabs']) {
      this.el['journal-tabs'].addEventListener('click', function (e) {
        var btn = e.target.closest('[data-tab]');
        if (!btn) return;
        self.tab = btn.getAttribute('data-tab');
        self.renderJournal();
      });
    }

    // Fire menu actions.
    if (this.el['fire-actions']) {
      this.el['fire-actions'].addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn || btn.disabled) return;
        self.game.performFireAction(btn.getAttribute('data-action'));
        self.closeFireMenu();
      });
    }

    // Hotbar.
    if (this.el.hotbar) {
      this.el.hotbar.addEventListener('click', function (e) {
        var slot = e.target.closest('[data-slot]');
        if (!slot) return;
        var n = parseInt(slot.getAttribute('data-slot'), 10);
        if (n === 1) g.eatCarrot();
        else if (n === 2) g.plantCarrot();
        else if (n === 5) self.openJournal();
        else self.toast('Use E near the matching object.', 'info');
      });
    }

    // Settings controls.
    var dist = this.el['settings-distance'];
    if (dist) dist.addEventListener('change', function () { g.applySettings({ distance: parseInt(dist.value, 10) }); });
    var qual = this.el['settings-quality'];
    if (qual) qual.addEventListener('change', function () { g.applySettings({ quality: parseInt(qual.value, 10) }); });
    var audio = this.el['settings-audio'];
    if (audio) audio.addEventListener('change', function () { U.Audio.setEnabled(audio.checked); U.Storage.set('spooky_forest_audio', audio.checked); });
    var sens = this.el['settings-sensitivity'];
    if (sens) sens.addEventListener('input', function () { g.applySettings({ sensitivity: parseFloat(sens.value) }); });
    var inv = this.el['settings-invert'];
    if (inv) inv.addEventListener('change', function () { g.applySettings({ invertY: inv.checked }); });
    var motion = this.el['settings-motion'];
    if (motion) motion.addEventListener('change', function () { g.applySettings({ reduceMotion: motion.checked }); });
    var fpsToggle = this.el['settings-fps'];
    if (fpsToggle) fpsToggle.addEventListener('change', function () { self.debug = fpsToggle.checked; self.el.debug.style.display = self.debug ? 'block' : 'none'; });

    // Touch look on the canvas.
    var canvas = this.el['forest-canvas'];
    if (canvas) {
      canvas.addEventListener('touchstart', function (e) {
        if (!g.running || g.paused) return;
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (self.joystickId !== null) continue;
          if (t.clientX < root.innerWidth * 0.42) continue;
          self.lookId = t.identifier;
          self.lookLast = { x: t.clientX, y: t.clientY };
          break;
        }
      }, { passive: true });
      canvas.addEventListener('touchmove', function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier === self.lookId && self.lookLast) {
            g.player.touchLook(t.clientX - self.lookLast.x, t.clientY - self.lookLast.y);
            self.lookLast = { x: t.clientX, y: t.clientY };
          }
        }
      }, { passive: true });
      canvas.addEventListener('touchend', function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === self.lookId) { self.lookId = null; self.lookLast = null; }
        }
      }, { passive: true });
    }

    // Joystick.
    var base = this.el['joystick-base'];
    if (base) {
      var updateStick = function (t) {
        var rect = base.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var dx = (t.clientX - cx) / (rect.width / 2);
        var dy = (t.clientY - cy) / (rect.height / 2);
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1) { dx /= len; dy /= len; }
        g.player.setJoystick(dx, dy);
        if (self.el['joystick-knob']) {
          self.el['joystick-knob'].style.transform = 'translate(' + (dx * 30) + 'px,' + (dy * 30) + 'px)';
        }
      };
      base.addEventListener('touchstart', function (e) {
        e.preventDefault();
        var t = e.changedTouches[0];
        self.joystickId = t.identifier;
        updateStick(t);
      }, { passive: false });
      base.addEventListener('touchmove', function (e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === self.joystickId) updateStick(e.changedTouches[i]);
        }
      }, { passive: false });
      base.addEventListener('touchend', function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === self.joystickId) {
            self.joystickId = null;
            g.player.setJoystick(0, 0);
            if (self.el['joystick-knob']) self.el['joystick-knob'].style.transform = 'translate(0,0)';
          }
        }
      }, { passive: true });
    }

    function tap(id, fn) {
      var node = self._byId(id);
      if (!node) return;
      U.on(node, 'touchstart', function (e) { e.preventDefault(); fn(e); }, { passive: false });
      U.on(node, 'click', function (e) { e.preventDefault(); fn(e); });
    }
    tap('btn-e', function () { g.interact(); });
    tap('btn-jump', function () { g.player.trigger('jump'); });
    tap('btn-fly', function () { g.player.trigger('fly'); });
    tap('btn-run', function () { g.player.trigger('sprint'); });
    tap('btn-cam', function () { g.player.trigger('camera'); });

    // Prompt tap opens interaction (mobile friendly).
    if (this.el.prompt) {
      U.on(this.el.prompt, 'click', function () {
        if (g.currentInteraction && g.currentInteraction.type === 'campfire') self.openFireMenu(g.currentInteraction.target);
        else g.interact();
      });
    }

    // Visibility pause.
    U.on(root.document, 'visibilitychange', function () {
      if (root.document.hidden && g.running && !g.paused) self.pause();
    });

    // Escape closes overlays; player action handles pause. Add here too.
    U.on(root.document, 'keydown', function (e) {
      if (e.code === 'Escape') {
        if (self.isJournalOpen()) self.closeJournal();
        else if (self.isSettingsOpen()) self.closeSettings();
        else if (self.el['fire-menu'].classList.contains('show')) self.closeFireMenu();
      }
      if (e.code === 'F3') { e.preventDefault(); self.toggleDebug(); }
      if (e.code === 'KeyH' && g.running) self.showHelp(true);
    });

    // Audio preference.
    var soundPref = U.Storage.get('spooky_forest_audio', true);
    U.Audio.setEnabled(soundPref !== false);
    if (this.el['settings-audio']) this.el['settings-audio'].checked = soundPref !== false;
  };

  /* ------------------------------------------------------------------ */
  /*  Start / pause flow                                                 */
  /* ------------------------------------------------------------------ */
  UI.prototype.start = function (loadSave) {
    var seed = 20261031;
    if (this.el['seed-input']) {
      var raw = this.el['seed-input'].value.trim();
      if (raw) seed = parseInt(raw, 10) || hashString(raw);
    }
    this.el['start-screen'].classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    this.el.loading.classList.remove('hidden');
    this.started = true;
    var self = this;
    world_load_async(function () {
      if (loadSave) self.game.loadGame(seed);
      else self.game.newWorld(seed, true);
      setTimeout(function () {
        self.el.loading.classList.add('hidden');
        self.game.player.enabled = true;
        self.game.running = true;
        self.resume();
        self.showHelp(true);
        U.Audio.resume();
        U.Audio.chime();
      }, 150);
    });
  };

  UI.prototype.newWorld = function () {
    var self = this;
    if (!root.confirm('Abandon this forest and grow a new one? Your current save will be replaced.')) return;
    var seed = 20261031;
    if (this.el['seed-input'] && this.el['seed-input'].value.trim()) {
      seed = parseInt(this.el['seed-input'].value.trim(), 10) || hashString(this.el['seed-input'].value.trim());
    } else {
      seed = Math.floor(Math.random() * 2147483647);
    }
    this.el['start-screen'].classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    this.el.loading.classList.remove('hidden');
    this.game.newWorld(seed, true);
    setTimeout(function () {
      self.el.loading.classList.add('hidden');
      self.game.player.enabled = true;
      self.game.running = true;
      self.resume();
      self.toast('🌱 A new forest takes root. Seed ' + seed, 'good', 4);
    }, 220);
  };

  UI.prototype.pause = function () {
    if (!this.game.running) return;
    this.game.paused = true;
    this.game.player.enabled = false;
    this.el.pause.classList.add('show');
    if (root.document.pointerLockElement) root.document.exitPointerLock();
  };

  UI.prototype.resume = function () {
    this.game.paused = false;
    this.el.pause.classList.remove('show');
    this.el.journal.classList.remove('show');
    this.el.settings.classList.remove('show');
    if (this.game.running) this.game.player.enabled = true;
  };

  UI.prototype.isJournalOpen = function () { return this.el.journal.classList.contains('show'); };
  UI.prototype.isSettingsOpen = function () { return this.el.settings.classList.contains('show'); };

  UI.prototype.openSettings = function () {
    this.el.settings.classList.add('show');
    this.el.pause.classList.remove('show');
    var g = this.game;
    if (this.el['settings-distance']) this.el['settings-distance'].value = String(g.settings.distance);
    if (this.el['settings-quality']) this.el['settings-quality'].value = String(g.settings.quality);
    if (this.el['settings-sensitivity']) this.el['settings-sensitivity'].value = String(g.settings.sensitivity);
    if (this.el['settings-invert']) this.el['settings-invert'].checked = !!g.settings.invertY;
    if (this.el['settings-motion']) this.el['settings-motion'].checked = !!g.settings.reduceMotion;
  };

  UI.prototype.closeSettings = function () {
    this.el.settings.classList.remove('show');
    if (this.game.paused) this.el.pause.classList.add('show');
  };

  UI.prototype.openJournal = function (tab) {
    if (tab) this.tab = tab;
    this.el.journal.classList.add('show');
    this.el.pause.classList.remove('show');
    this.game.player.enabled = false;
    if (root.document.pointerLockElement) root.document.exitPointerLock();
    this.renderJournal();
  };

  UI.prototype.closeJournal = function () {
    this.el.journal.classList.remove('show');
    if (this.game.paused) this.el.pause.classList.add('show');
    else if (this.game.running && !this.isSettingsOpen() && !(this.el.help && this.el.help.classList.contains('show'))) {
      this.game.player.enabled = true;
    }
  };

  UI.prototype.openFireMenu = function (fire) {
    if (!fire) return;
    var actions = this.game.campfires.actions(fire, this.game.player, this.game.carrots);
    this.el['fire-title'].textContent = fire.name;
    this.el['fire-sub'].textContent = (fire.lit ? '🔥 Lit · ' + Math.round(fire.fuel * 100) + '% fuel' : 'Cold ashes') +
      (fire.home ? ' · your first hearth' : '');
    var box = this.el['fire-actions'];
    box.innerHTML = '';
    for (var i = 0; i < actions.length; i++) {
      var a = actions[i];
      var btn = U.el('button', 'fire-action' + (a.disabled ? ' disabled' : ''));
      btn.setAttribute('data-action', a.id);
      btn.disabled = !!a.disabled;
      btn.innerHTML = '<span class="fa-label">' + U.esc(a.label) + '</span><span class="fa-sub">' + U.esc(a.sub || '') + '</span>';
      box.appendChild(btn);
    }
    this.el['fire-menu'].classList.add('show');
    this.game.player.enabled = false;
    if (root.document.pointerLockElement) root.document.exitPointerLock();
    U.Audio.chime();
  };

  UI.prototype.closeFireMenu = function () {
    this.el['fire-menu'].classList.remove('show');
    if (this.game.running && !this.game.paused && !this.isJournalOpen() && !this.isSettingsOpen()) {
      this.game.player.enabled = true;
    }
  };

  UI.prototype.toggleDebug = function () {
    this.debug = !this.debug;
    this.el.debug.style.display = this.debug ? 'block' : 'none';
  };

  UI.prototype.showHelp = function (show) {
    if (!this.el.help) return;
    this.el.help.classList.toggle('show', !!show);
    if (show) {
      this.game.player.enabled = false;
      if (root.document.pointerLockElement) root.document.exitPointerLock();
    } else if (this.game.running && !this.game.paused) {
      this.game.player.enabled = true;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Frame update                                                       */
  /* ------------------------------------------------------------------ */
  UI.prototype.update = function (game, dt) {
    var now = performance.now();
    if (now - this.lastHud > 90) {
      this.lastHud = now;
      this.updateHud(game);
      this.updatePrompt(game);
      this.updateCooking(game);
      this.updateOverlays(game);
    }
    if (now - this.lastMap > 220) {
      this.lastMap = now;
      this.drawMinimap(game);
    }
    if (this.debug) this.updateDebug(game);
  };

  UI.prototype.updateHud = function (g) {
    var p = g.player;
    var pos = p.position;
    this.el['hud-coords'].textContent = 'X ' + pos[0].toFixed(1) + '  Y ' + pos[1].toFixed(1) + '  Z ' + pos[2].toFixed(1);
    var biome = g.world.biomeAt(pos[0], pos[2]);
    this.el['hud-biome'].textContent = biome.icon + ' ' + biome.name;
    this.el['hud-clock'].textContent = g.atmosphere.timeString();
    this.el['hud-day'].textContent = 'Day ' + g.atmosphere.day;
    this.el['hud-weather'].textContent = g.atmosphere.env.weatherIcon + ' ' + g.atmosphere.env.weatherName +
      (g.atmosphere.bloodMoon ? ' · BLOOD MOON' : '');
    // +Z is north and yaw 0 faces north, so the compass heading is just yaw.
    var deg = U.mod(p.yaw * 180 / Math.PI, 360);
    var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    var dir = dirs[Math.round(deg / 45) % 8];
    this.el['hud-compass'].textContent = dir + ' ' + Math.round(deg) + '°';

    this.el['stat-carrots'].textContent = g.carrots.count;
    this.el['stat-wood'].textContent = p.wood;
    this.el['stat-marshmallows'].textContent = p.marshmallows;
    this.el['stat-rabbits'].textContent = g.rabbits.tamedCount + '/' + g.rabbits.met;
    this.el['stat-fires'].textContent = g.campfires.totalLit;

    var stats = g.world.chunkStats();
    this.el.fps.textContent = g.renderer.info.fps + ' fps';
    this.el.chunks.textContent = stats.loaded + ' chunks';

    // Hotbar counts.
    var slots = this.el.hotbar ? this.el.hotbar.querySelectorAll('[data-slot]') : [];
    for (var i = 0; i < slots.length; i++) {
      var n = parseInt(slots[i].getAttribute('data-slot'), 10);
      var count = slots[i].querySelector('.slot-count');
      if (!count) continue;
      if (n === 1) count.textContent = g.carrots.count + (g.carrots.roasted ? ' +' + g.carrots.roasted + '🍠' : '');
      else if (n === 2) count.textContent = g.carrots.seeds;
      else if (n === 3) count.textContent = p.wood;
      else if (n === 4) count.textContent = p.marshmallows;
    }
  };

  UI.prototype.updatePrompt = function (g) {
    var inter = g.currentInteraction;
    if (!inter) {
      this.el.prompt.classList.remove('show');
      return;
    }
    this.el.prompt.classList.add('show');
    var key = inter.type === 'campfire' ? 'E · menu' : (U.Device.isTouch ? 'tap' : 'E');
    this.el['prompt-key'].textContent = key;
    this.el['prompt-label'].textContent = inter.label;
    this.el['prompt-sub'].textContent = inter.sub || '';
  };

  UI.prototype.updateCooking = function (g) {
    var fire = g.currentInteraction && g.currentInteraction.type === 'campfire' ? g.currentInteraction.target : null;
    if (!fire) {
      // Show cooking status for the nearest lit fire with food.
      var nearest = g.campfires.nearest(g.player, 8);
      if (nearest && nearest.cook && nearest.cook.state !== 'idle') fire = nearest;
    }
    if (!fire || !fire.cook || fire.cook.state === 'idle') {
      this.el['cooking-hud'].classList.remove('show');
      return;
    }
    this.el['cooking-hud'].classList.add('show');
    var pct = U.clamp((fire.cook.t / 3.1) * 100, 0, 100);
    this.el['cooking-bar'].style.width = pct + '%';
    this.el['cooking-bar'].className = fire.cook.state === 'burnt' ? 'burnt' : (fire.cook.state === 'ready' ? 'ready' : '');
    this.el['cooking-label'].textContent = fire.cook.state === 'cooking' ? 'Cooking carrot… ' + Math.ceil(3.1 - fire.cook.t) + 's' :
      (fire.cook.state === 'ready' ? 'Roasted carrot ready — press E' : 'Burnt. Press E to salvage.');
  };

  UI.prototype.updateOverlays = function (g) {
    if (this.el.flash) this.el.flash.style.opacity = String(Math.min(0.9, (g.atmosphere.env.flash || 0) * 0.85));
    if (this.el.blood) this.el.blood.classList.toggle('show', !!g.atmosphere.bloodMoon);
    var p = g.player;
    var hurt = (100 - p.health) / 100;
    var cold = (100 - p.warmth) / 100;
    if (this.el.vignette) {
      this.el.vignette.style.opacity = String(U.clamp(hurt * 0.7 + cold * 0.28, 0, 0.88));
      this.el.vignette.classList.toggle('cold', cold > 0.45 && hurt < 0.3);
    }
    if (this.el.frost) {
      var biome = g.world.biomeAt(p.position[0], p.position[2]);
      this.el.frost.style.opacity = biome.key === 'frost' ? String(U.clamp(0.08 + cold * 0.3, 0, 0.38)) : '0';
    }
    if (p.photoMode !== this.photo) {
      this.photo = p.photoMode;
      this.el['photo-bar'].classList.toggle('show', this.photo);
      this.el.hud.classList.toggle('hidden', this.photo);
      this.el['mobile-controls'].classList.toggle('hidden', this.photo);
      this.el.crosshair.classList.toggle('hidden', this.photo);
    }
  };

  UI.prototype.updateDebug = function (g) {
    var r = g.renderer.info;
    var s = g.world.chunkStats();
    this.el.debug.innerHTML = [
      '<b>FOREST DEBUG</b>',
      'fps ' + r.fps + ' · frame ' + r.frameMs.toFixed(1) + 'ms',
      'chunks ' + s.loaded + ' loaded · ' + s.generated + ' generated · ' + s.removed + ' evicted',
      'draw calls ' + r.calls + ' · verts ' + U.formatNumber(r.vertices + r.dynamicVerts),
      'particles ' + r.particles + ' · lights ' + (g.lights ? g.lights.length : 0),
      'rabbits ' + g.rabbits.rabbits.size + ' · fires ' + g.campfires.fires.size + ' · carrots ' + g.carrots.plants.size,
      'pos ' + g.player.position.map(function (v) { return v.toFixed(2); }).join(', '),
      'seed ' + g.world.seed + ' · quality ' + g.settings.quality + ' · distance ' + g.settings.distance
    ].join('<br>');
  };

  /* ------------------------------------------------------------------ */
  /*  Minimap                                                            */
  /* ------------------------------------------------------------------ */
  UI.prototype.drawMinimap = function (g) {
    if (!this.ctx) return;
    var c = this.ctx;
    var W = this.el.minimap.width, H = this.el.minimap.height;
    var px = g.player.position[0], pz = g.player.position[2];
    var range = 64;
    var scale = W / (range * 2);
    c.clearRect(0, 0, W, H);
    // Background.
    c.fillStyle = '#08060f';
    c.fillRect(0, 0, W, H);
    // Chunks. +Z is north, so the map is drawn with north up.
    g.world.forEachChunk(function (ch) {
      var x = (ch.ox + 8 - px) * scale + W / 2;
      var y = H / 2 - (ch.oz + 8 - pz) * scale;
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) return;
      var b = ch.biome;
      c.fillStyle = 'rgba(' + Math.round(b.ground[0] * 255) + ',' + Math.round(b.ground[1] * 255) + ',' + Math.round(b.ground[2] * 255) + ',0.8)';
      c.fillRect(x - 8 * scale, y - 8 * scale, 16 * scale, 16 * scale);
    });
    // Grid.
    c.strokeStyle = 'rgba(150,120,220,0.08)';
    c.lineWidth = 1;
    for (var i = 0; i <= 8; i++) {
      c.beginPath(); c.moveTo(i * W / 8, 0); c.lineTo(i * W / 8, H); c.stroke();
      c.beginPath(); c.moveTo(0, i * H / 8); c.lineTo(W, i * H / 8); c.stroke();
    }
    // Fires.
    g.campfires.fires.forEach(function (f) {
      var x = (f.x - px) * scale + W / 2, y = H / 2 - (f.z - pz) * scale;
      if (x < 0 || y < 0 || x > W || y > H) return;
      c.fillStyle = f.lit ? '#ff9f1c' : '#6b4a22';
      c.beginPath(); c.arc(x, y, 3, 0, 6.283); c.fill();
      if (f.lit) {
        c.strokeStyle = 'rgba(255,159,28,0.35)';
        c.beginPath(); c.arc(x, y, 6, 0, 6.283); c.stroke();
      }
    });
    // Burrows.
    g.rabbits.warrens.forEach(function (w) {
      var x = (w.x - px) * scale + W / 2, y = H / 2 - (w.z - pz) * scale;
      if (x < 0 || y < 0 || x > W || y > H) return;
      c.fillStyle = '#d9a6ff';
      c.beginPath(); c.arc(x, y, 2.2, 0, 6.283); c.fill();
    });
    // Carrot patches (approximate through live plants).
    g.carrots.plants.forEach(function (p) {
      if (p.harvested) return;
      var x = (p.x - px) * scale + W / 2, y = H / 2 - (p.z - pz) * scale;
      if (x < 1 || y < 1 || x > W - 1 || y > H - 1) return;
      c.fillStyle = p.stage >= 3 ? '#ffb347' : '#5db33c';
      c.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
    });
    // Rabbits.
    g.rabbits.rabbits.forEach(function (r) {
      var x = (r.x - px) * scale + W / 2, y = H / 2 - (r.z - pz) * scale;
      if (x < 0 || y < 0 || x > W || y > H) return;
      c.fillStyle = r.tamed ? '#ffd166' : '#f2e9ff';
      c.beginPath(); c.arc(x, y, 1.7, 0, 6.283); c.fill();
    });
    // Player arrow.
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(g.player.yaw);
    c.fillStyle = '#7dffb0';
    c.beginPath();
    c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(0, 3); c.lineTo(-5, 6);
    c.closePath(); c.fill();
    c.restore();
    // North.
    c.fillStyle = '#ffd166';
    c.font = 'bold 10px system-ui';
    c.fillText('N', W / 2 - 3, 11);
    c.strokeStyle = 'rgba(255,209,102,0.5)';
    c.strokeRect(0.5, 0.5, W - 1, H - 1);
  };

  /* ------------------------------------------------------------------ */
  /*  Journal                                                            */
  /* ------------------------------------------------------------------ */
  UI.prototype.renderJournal = function () {
    var g = this.game;
    var tabs = this.el['journal-tabs'];
    if (tabs) {
      var tabList = [
        ['rabbits', '🐇 Rabbits'], ['carrots', '🥕 Carrots'], ['campfires', '🔥 Campfires'],
        ['achievements', '🏆 Achievements'], ['stats', '🧭 Explorer'], ['world', '🌍 World']
      ];
      tabs.innerHTML = '';
      for (var i = 0; i < tabList.length; i++) {
        var b = U.el('button', 'jtab' + (this.tab === tabList[i][0] ? ' active' : ''));
        b.setAttribute('data-tab', tabList[i][0]);
        b.textContent = tabList[i][1];
        tabs.appendChild(b);
      }
    }
    var body = this.el['journal-body'];
    if (!body) return;
    if (this.tab === 'rabbits') body.innerHTML = this._journalRabbits(g);
    else if (this.tab === 'carrots') body.innerHTML = this._journalCarrots(g);
    else if (this.tab === 'campfires') body.innerHTML = this._journalFires(g);
    else if (this.tab === 'achievements') body.innerHTML = this._journalAchievements(g);
    else if (this.tab === 'stats') body.innerHTML = this._journalStats(g);
    else body.innerHTML = this._journalWorld(g);
  };

  UI.prototype._journalRabbits = function (g) {
    var met = [];
    g.rabbits.rabbits.forEach(function (r) { met.push(r); });
    met.sort(function (a, b) { return b.trust - a.trust; });
    var h = '<div class="jintro">Rabbits remember kindness. Feed them carrots or pet them slowly; at 72% trust they bond and follow you. At night they gather around lit campfires.</div>';
    h += '<div class="jgrid">';
    h += '<div class="jcard"><div class="jnum">' + g.rabbits.met + '</div><div class="jlabel">rabbits met</div></div>';
    h += '<div class="jcard"><div class="jnum">' + g.rabbits.tamedCount + '</div><div class="jlabel">bonded friends</div></div>';
    h += '<div class="jcard"><div class="jnum">' + g.rabbits.totalFed + '</div><div class="jlabel">carrots shared</div></div>';
    h += '<div class="jcard"><div class="jnum">' + g.rabbits.totalPetted + '</div><div class="jlabel">gentle pets</div></div>';
    h += '</div>';
    h += '<div class="jlist">';
    if (!met.length) h += '<div class="jempty">No rabbits nearby. Try the Misty Meadow or a warren at dawn.</div>';
    for (var i = 0; i < met.length; i++) {
      var r = met[i];
      var pct = Math.round(r.trust * 100);
      var pal = r.palette;
      h += '<div class="jrow">' +
        '<span class="jdot" style="background:' + U.rgbCss(pal.fur) + '"></span>' +
        '<span class="jname">' + U.esc(r.name) + (r.tamed ? ' 💛' : '') + '</span>' +
        '<span class="jtag">' + pal.name + (r.isKit ? ' kit' : '') + '</span>' +
        '<span class="jbar"><span style="width:' + pct + '%"></span></span>' +
        '<span class="jpct">' + pct + '%</span>' +
        '</div>';
    }
    h += '</div>';
    h += '<div class="jsection">Field notes</div><div class="jintro">Rabbits thump the ground to warn the warren. Kits stay close to their mother. Moonfurs have eyes that glow faintly after dark.</div>';
    return h;
  };

  UI.prototype._journalCarrots = function (g) {
    var c = g.carrots;
    var h = '<div class="jintro">Wild carrot patches hide in meadows and pumpkin hollows. Pull ripe roots with E, replant seeds, and water sprouts to double their growth.</div>';
    h += '<div class="jgrid">';
    h += '<div class="jcard"><div class="jnum">' + c.count + '</div><div class="jlabel">in your pack</div></div>';
    h += '<div class="jcard"><div class="jnum">' + c.seeds + '</div><div class="jlabel">seeds</div></div>';
    h += '<div class="jcard"><div class="jnum">' + c.totalHarvested + '</div><div class="jlabel">harvested</div></div>';
    h += '<div class="jcard"><div class="jnum">' + c.roasted + '</div><div class="jlabel">roasted</div></div>';
    h += '</div>';
    h += '<div class="jsection">Growth stages</div>';
    var names = SF.Carrots ? SF.Carrots.STAGE_NAMES : ['Sprout', 'Leafing', 'Rooting', 'Ripe'];
    for (var i = 0; i < names.length; i++) {
      h += '<div class="jrow"><span class="jtag">' + (i + 1) + '</span><span class="jname">' + names[i] + '</span><span class="jdesc">' +
        (i === 0 ? 'Two seed leaves. Water it.' : i === 1 ? 'Leaf fan forms; root begins.' : i === 2 ? 'Orange shoulder appears.' : 'Pull for 1–3 carrots. Moon carrots are luminous.') + '</span></div>';
    }
    h += '<div class="jsection">In the ground right now</div><div class="jlist">';
    var shown = 0;
    c.plants.forEach(function (p) {
      if (shown++ >= 40) return;
      h += '<div class="jrow"><span class="jdot" style="background:' + (p.glow ? '#ffd166' : '#e27a1f') + '"></span>' +
        '<span class="jname">' + (p.glow ? 'Moon Carrot' : 'Carrot') + (p.wild ? '' : ' (planted)') + '</span>' +
        '<span class="jtag">' + names[p.stage] + '</span>' +
        '<span class="jdesc">' + (p.watered ? 'watered' : 'dry') + '</span></div>';
    });
    if (!shown) h += '<div class="jempty">No carrots in range.</div>';
    h += '</div>';
    return h;
  };

  UI.prototype._journalFires = function (g) {
    var h = '<div class="jintro">Campfires are safe harbours. Add wood to keep them alive, cook carrots, roast marshmallows, and sit to hear the forest\'s stories. Rabbits gather at lit fires on cold nights.</div>';
    h += '<div class="jgrid">';
    h += '<div class="jcard"><div class="jnum">' + g.campfires.totalLit + '</div><div class="jlabel">fires lit</div></div>';
    h += '<div class="jcard"><div class="jnum">' + g.campfires.totalCooked + '</div><div class="jlabel">carrots cooked</div></div>';
    h += '<div class="jcard"><div class="jnum">' + g.campfires.totalMarshmallows + '</div><div class="jlabel">marshmallows</div></div>';
    h += '<div class="jcard"><div class="jnum">' + g.campfires.fires.size + '</div><div class="jlabel">in range</div></div>';
    h += '</div><div class="jlist">';
    g.campfires.fires.forEach(function (f) {
      h += '<div class="jrow"><span class="jdot" style="background:' + (f.lit ? '#ff9f1c' : '#5a4430') + '"></span>' +
        '<span class="jname">' + U.esc(f.name) + '</span>' +
        '<span class="jtag">' + (f.lit ? Math.round(f.fuel * 100) + '% fuel' : 'cold') + '</span>' +
        '<span class="jdesc">' + U.esc(f.variant) + ' · ' + f.stories + ' stories</span></div>';
    });
    if (!g.campfires.fires.size) h += '<div class="jempty">No campfires in range. Follow the warm glow.</div>';
    h += '</div>';
    h += '<div class="jsection">A story from the circle</div><div class="jstory">“' + U.esc(U.NAMES.story[(g.atmosphere.day + g.campfires.totalLit) % U.NAMES.story.length]) + '”</div>';
    return h;
  };

  UI.prototype._journalAchievements = function (g) {
    var h = '<div class="jintro">' + g.achievementsUnlockedCount() + ' of ' + g.achievements.length + ' secrets found.</div><div class="jlist">';
    for (var i = 0; i < g.achievements.length; i++) {
      var a = g.achievements[i];
      var done = !!g.state.achievements[a.id];
      var prog = a.progress ? Math.min(1, a.progress(g)) : (done ? 1 : 0);
      h += '<div class="jrow achievement' + (done ? ' done' : '') + '">' +
        '<span class="jdot" style="background:' + (done ? '#ffd166' : '#3a2a55') + '"></span>' +
        '<span class="jname">' + (done ? '🏆 ' : '🔒 ') + U.esc(a.name) + '</span>' +
        '<span class="jdesc">' + U.esc(a.desc) + '</span>' +
        '<span class="jbar"><span style="width:' + Math.round(prog * 100) + '%"></span></span></div>';
    }
    h += '</div>';
    return h;
  };

  UI.prototype._journalStats = function (g) {
    var p = g.player, s = g.world.chunkStats(), a = g.atmosphere;
    var rows = [
      ['Coordinates', 'X ' + p.position[0].toFixed(1) + ' · Y ' + p.position[1].toFixed(1) + ' · Z ' + p.position[2].toFixed(1)],
      ['Chunk', g.world.chunkCoord(p.position[0]) + ', ' + g.world.chunkCoord(p.position[2])],
      ['Biome', g.world.biomeAt(p.position[0], p.position[2]).name],
      ['Seed', String(g.world.seed)],
      ['Time', a.timeString() + ' · ' + a.phaseName() + ' · Day ' + a.day],
      ['Weather', a.env.weatherName + (a.bloodMoon ? ' (Blood Moon)' : '')],
      ['Distance walked', Math.round(p.distanceWalked) + ' m'],
      ['Chunks streamed', s.generated + ' generated / ' + s.loaded + ' loaded'],
      ['Furthest chunk', g.furthestChunk + ', ' + g.furthestChunkZ],
      ['Rabbits met', g.rabbits.met + ' (' + g.rabbits.tamedCount + ' bonded)'],
      ['Carrots harvested', String(g.carrots.totalHarvested)],
      ['Fires lit', String(g.campfires.totalLit)],
      ['Stories heard', String(g.stats.stories)],
      ['Marshmallows roasted', String(g.stats.marshmallows)],
      ['Runtime', Math.round(g.stats.playTime) + ' s']
    ];
    var h = '<div class="jlist">';
    for (var i = 0; i < rows.length; i++) {
      h += '<div class="jrow"><span class="jname">' + U.esc(rows[i][0]) + '</span><span class="jdesc mono">' + U.esc(rows[i][1]) + '</span></div>';
    }
    h += '</div>';
    return h;
  };

  UI.prototype._journalWorld = function (g) {
    var h = '<div class="jintro">The forest is generated in 16-metre chunks and streams around you. X and Z never end; Y reaches from the buried roots to the floating spirit isles. Fly with F to explore the vertical world.</div><div class="jgrid">';
    var biomes = SF.BIOME_LIST;
    for (var i = 0; i < biomes.length; i++) {
      var b = biomes[i];
      h += '<div class="jcard biome"><div class="jnum">' + b.icon + '</div><div class="jlabel">' + b.name + '</div>' +
        '<div class="jdesc">rabbits ×' + b.rabbitDensity.toFixed(1) + ' · carrots ' + Math.round(b.carrotChance * 100) + '%</div></div>';
    }
    h += '</div>';
    h += '<div class="jsection">Controls</div><div class="jcontrols">' +
      '<div><b>WASD</b> walk · <b>Shift</b> run · <b>Space</b> jump</div>' +
      '<div><b>E</b> interact · <b>Q</b> call rabbits · <b>F</b> fly</div>' +
      '<div><b>V</b> camera · <b>P</b> photo · <b>J</b> journal · <b>M</b> map</div>' +
      '<div><b>C</b> descend while flying · <b>R/X</b> fly up/down</div>' +
      '<div>Touch: left stick · drag right side to look · E / jump buttons</div></div>';
    h += '<div class="jsection">Secrets</div><div class="jintro">A blood moon sometimes rises. Moonfurs appear in old warrens. The oldest campfire remembers every name. Floating islands hide crystals and tiny trees.</div>';
    return h;
  };

  /* ------------------------------------------------------------------ */
  /*  Toasts, story, help, photo                                     */
  /* ------------------------------------------------------------------ */
  UI.prototype.toast = function (text, kind, duration) {
    if (!this.el.toasts) return;
    var t = U.el('div', 'toast ' + (kind || 'info'));
    t.innerHTML = text;
    this.el.toasts.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 420);
    }, (duration || 3.2) * 1000);
    while (this.el.toasts.children.length > 5) this.el.toasts.removeChild(this.el.toasts.firstChild);
  };

  UI.prototype.showStory = function (text) {
    if (!this.el['story-popup']) return;
    this.el['story-text'].textContent = text;
    this.el['story-popup'].classList.add('show');
    this.game.paused = true;
    this.game.player.enabled = false;
    var self = this;
    setTimeout(function () {
      if (!self.el['story-popup'].classList.contains('show')) return;
      self.el['story-popup'].classList.remove('show');
      if (self.game.running) { self.game.paused = false; self.game.player.enabled = true; }
    }, 6500);
  };

  UI.prototype.showError = function (message) {
    if (!this.el.error) return;
    this.el.error.classList.add('show');
    this.el['error-text'].textContent = message;
    this.el.loading.classList.add('hidden');
  };

  UI.prototype.showLoading = function (show, text) {
    if (!this.el.loading) return;
    this.el.loading.classList.toggle('hidden', !show);
    if (text) this.el['loading-text'].textContent = text;
  };

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */
  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h | 0;
  }

  function world_load_async(fn) {
    // Give the browser one frame to paint the loading overlay.
    if (root.requestAnimationFrame) root.requestAnimationFrame(function () { setTimeout(fn, 0); });
    else setTimeout(fn, 0);
  }

  SF.UI = UI;
  SF.hashString = hashString;
})(typeof window !== 'undefined' ? window : globalThis);

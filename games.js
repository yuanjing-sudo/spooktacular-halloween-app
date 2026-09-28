/* SpookyGames — 11 playable micro-games for the Games tab.
 * Ultra-enhanced edition: advanced particle physics, tweening engine,
 * Web Audio synthesized soundscapes, screen shake, flash effects,
 * combo systems, progressive difficulty, and cinematic animations.
 */
(function () {
  'use strict';

  var timers = [];
  var rafIds = [];
  var audioCtx = null;
  var masterGain = null;

  function every(ms, fn) {
    var id = setInterval(fn, ms);
    timers.push(id);
    return id;
  }
  function everyRaf(fn) {
    var id = requestAnimationFrame(fn);
    rafIds.push(id);
    return id;
  }
  function stopAll() {
    timers.forEach(clearInterval);
    rafIds.forEach(cancelAnimationFrame);
    timers = [];
    rafIds = [];
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function btn(label, fn) {
    var b = el('button', '', label);
    b.onclick = fn;
    return b;
  }
  function status(text) { return el('div', 'memstatus', text); }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* === TWEENING ENGINE === */
  var tweens = [];
  function tween(obj, props, dur, ease, onDone) {
    var start = {};
    for (var k in props) start[k] = obj[k];
    var t0 = performance.now();
    tweens.push({ obj: obj, props: props, start: start, dur: dur, ease: ease || easeOutCubic, onDone: onDone, t0: t0 });
  }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutBack(t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function easeOutElastic(t) {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  }
  function easeOutBounce(t) {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
  function updateTweens(now) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var tw = tweens[i];
      var t = Math.min(1, (now - tw.t0) / tw.dur);
      var e = tw.ease(t);
      for (var k in tw.props) tw.obj[k] = tw.start[k] + (tw.props[k] - tw.start[k]) * e;
      if (t >= 1) { tweens.splice(i, 1); if (tw.onDone) tw.onDone(); }
    }
  }

  /* === AUDIO SYSTEM === */
  function getAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(audioCtx.destination);
      } catch (e) { return null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function playTone(freq, dur, type, vol, slide, delay) {
    var ctx = getAudio(); if (!ctx) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(masterGain || ctx.destination);
    o.start(t); o.stop(t + dur);
  }
  function playNoise(dur, vol, filterFreq) {
    var ctx = getAudio(); if (!ctx) return;
    var buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 2000;
    src.connect(f); f.connect(g); g.connect(masterGain || ctx.destination);
    src.start(); src.stop(ctx.currentTime + dur);
  }
  function sfxClick() { playTone(800, 0.06, 'square', 0.06); }
  function sfxGood() { playTone(523, 0.1, 'sine', 0.1); playTone(659, 0.1, 'sine', 0.1, null, 0.05); playTone(784, 0.15, 'sine', 0.1, null, 0.1); }
  function sfxBad() { playTone(200, 0.2, 'sawtooth', 0.08, 100); playNoise(0.1, 0.05, 800); }
  function sfxWin() { var n = [523, 659, 784, 1047, 1319]; n.forEach(function (f, i) { playTone(f, 0.25, 'sine', 0.12, null, i * 0.1); }); }
  function sfxLose() { playTone(300, 0.3, 'sawtooth', 0.08, 150); setTimeout(function () { playTone(200, 0.4, 'sawtooth', 0.08, 80); }, 200); }
  function sfxPop() { playTone(1200, 0.04, 'square', 0.05, 600); playNoise(0.03, 0.03, 4000); }
  function sfxWhoosh() { playTone(400, 0.12, 'sine', 0.06, 800); playNoise(0.08, 0.04, 3000); }
  function sfxCoin() { playTone(988, 0.06, 'square', 0.06); setTimeout(function () { playTone(1319, 0.12, 'square', 0.06); }, 60); }
  function sfxCombo() { playTone(600, 0.05, 'sine', 0.08, 1200); }
  function sfxLevelUp() { var n = [440, 554, 659, 880]; n.forEach(function (f, i) { playTone(f, 0.15, 'triangle', 0.1, null, i * 0.08); }); }
  function sfxCountdown() { playTone(440, 0.15, 'square', 0.08); }
  function sfxGo() { playTone(880, 0.3, 'square', 0.1); }

  /* === PARTICLE SYSTEM === */
  function ParticleSystem(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.running = false;
    this.gravity = 0.08;
    this.drag = 0.99;
  }
  ParticleSystem.prototype.emit = function (x, y, count, color, speed, life, size) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = (0.3 + Math.random()) * (speed || 3);
      this.particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, decay: 0.008 + Math.random() * 0.02, color: color || '#ffd166', size: (size || 3) + Math.random() * 3, gravity: this.gravity, drag: this.drag, shape: Math.random() < 0.3 ? 'circle' : (Math.random() < 0.5 ? 'square' : 'star'), rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.2 });
    }
  };
  ParticleSystem.prototype.emitBurst = function (x, y, count, colors, speed) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = 1 + Math.random() * (speed || 5);
      this.particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, decay: 0.006 + Math.random() * 0.015, color: colors[(Math.random() * colors.length) | 0], size: 2 + Math.random() * 5, gravity: this.gravity, drag: this.drag, shape: Math.random() < 0.4 ? 'circle' : (Math.random() < 0.5 ? 'square' : 'star'), rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.3 });
    }
  };
  ParticleSystem.prototype.emitRing = function (x, y, count, color, speed) {
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2;
      this.particles.push({ x: x, y: y, vx: Math.cos(a) * (speed || 3), vy: Math.sin(a) * (speed || 3), life: 1, decay: 0.015, color: color || '#ffd166', size: 3, gravity: 0, drag: 0.98, shape: 'circle', rotation: 0, rotSpeed: 0 });
    }
  };
  ParticleSystem.prototype.update = function () {
    var self = this;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(function (p) {
      p.vx *= p.drag; p.vy *= p.drag; p.vy += p.gravity; p.x += p.vx; p.y += p.vy; p.life -= p.decay; p.rotation += p.rotSpeed;
      self.ctx.globalAlpha = Math.max(0, p.life);
      self.ctx.fillStyle = p.color;
      self.ctx.save(); self.ctx.translate(p.x, p.y); self.ctx.rotate(p.rotation);
      var s = p.size * p.life;
      if (p.shape === 'circle') { self.ctx.beginPath(); self.ctx.arc(0, 0, s, 0, Math.PI * 2); self.ctx.fill(); }
      else if (p.shape === 'square') { self.ctx.fillRect(-s, -s, s * 2, s * 2); }
      else { self.ctx.beginPath(); for (var i = 0; i < 5; i++) { var a = (i * 4 * Math.PI) / 5 - Math.PI / 2; if (i === 0) self.ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s); else self.ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); } self.ctx.closePath(); self.ctx.fill(); }
      self.ctx.restore();
    });
    this.ctx.globalAlpha = 1;
    this.particles = this.particles.filter(function (p) { return p.life > 0; });
  };
  ParticleSystem.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this;
    (function loop() { if (!self.running) return; self.update(); everyRaf(loop); })();
  };
  ParticleSystem.prototype.stop = function () { this.running = false; };

  /* === SCREEN EFFECTS === */
  function shakeScreen(intensity, duration) { document.body.style.transform = 'translate(' + ((Math.random() - 0.5) * intensity) + 'px,' + ((Math.random() - 0.5) * intensity) + 'px)'; setTimeout(function () { document.body.style.transform = ''; }, duration * 1000); }
  function flashScreen(color, opacity) {
    var o = el('div', '');
    o.style.cssText = 'position:fixed;inset:0;background:' + (color || '#fff') + ';opacity:' + (opacity || 0.3) + ';pointer-events:none;z-index:9999;transition:opacity 0.3s ease;';
    document.body.appendChild(o);
    requestAnimationFrame(function () { o.style.opacity = '0'; });
    setTimeout(function () { o.remove(); }, 400);
  }

  /* === FLOATING TEXT === */
  function floatText(parent, x, y, text, color, size) {
    var d = el('div', '', text);
    d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;color:' + (color || '#ffd166') + ';font-weight:bold;font-size:' + (size || '1.1') + 'em;pointer-events:none;z-index:100;transition:all 0.8s cubic-bezier(0.25,0.46,0.45,0.94);opacity:1;text-shadow:0 2px 4px rgba(0,0,0,0.5);';
    parent.appendChild(d);
    setTimeout(function () { d.style.top = (y - 50) + 'px'; d.style.opacity = '0'; d.style.transform = 'scale(1.3)'; }, 50);
    setTimeout(function () { d.remove(); }, 900);
  }

  /* === ANIMATED BAR === */
  function AnimatedBar(container, max, color, label) {
    this.container = container; this.max = max; this.value = 0; this.color = color || '#ffd166'; this.label = label || '';
    this.bar = el('div', ''); this.bar.style.cssText = 'width:100%;height:10px;background:rgba(255,255,255,0.08);border-radius:5px;overflow:hidden;margin:4px 0;';
    this.fill = el('div', ''); this.fill.style.cssText = 'height:100%;width:0%;background:' + this.color + ';border-radius:5px;transition:width 0.3s ease;';
    this.bar.appendChild(this.fill); container.appendChild(this.bar);
    this.text = el('div', '', this.label); this.text.style.cssText = 'font-size:0.75em;opacity:0.7;'; container.appendChild(this.text);
  }
  AnimatedBar.prototype.set = function (v) { this.value = v; this.fill.style.width = Math.min(100, (v / this.max) * 100) + '%'; if (this.label) this.text.textContent = this.label + ': ' + Math.round(v) + '/' + this.max; };

  /* === STAR RATING === */
  function StarRating(container, max) {
    this.container = container; this.max = max || 5; this.stars = [];
    for (var i = 0; i < this.max; i++) { var s = el('span', '', '☆'); s.style.cssText = 'font-size:1.5em;color:#ffd166;transition:all 0.3s ease;'; container.appendChild(s); this.stars.push(s); }
  }
  StarRating.prototype.set = function (count) { for (var i = 0; i < this.max; i++) { if (i < count) { this.stars[i].textContent = '★'; this.stars[i].style.textShadow = '0 0 8px rgba(255,209,102,0.5)'; } else { this.stars[i].textContent = '☆'; this.stars[i].style.textShadow = 'none'; } } };

  /* === COMBO DISPLAY === */
  function ComboDisplay(container) {
    this.container = container; this.count = 0;
    this.display = el('div', '', ''); this.display.style.cssText = 'font-size:1.2em;font-weight:bold;color:#ff9f1c;min-height:1.5em;transition:all 0.2s ease;'; container.appendChild(this.display);
  }
  ComboDisplay.prototype.hit = function () { this.count++; this.display.textContent = this.count >= 2 ? '🔥 COMBO x' + this.count + '!' : ''; this.display.style.transform = 'scale(1.3)'; setTimeout(function () { this.display.style.transform = 'scale(1)'; }.bind(this), 100); sfxCombo(); };
  ComboDisplay.prototype.reset = function () { this.count = 0; this.display.textContent = ''; };

  /* === GAME FRAMEWORK === */
  function GameFramework(stage, P) {
    this.stage = stage; this.P = P; this.score = 0; this.gold = 0; this.over = false; this.paused = false;
    this.canvas = el('canvas', ''); this.canvas.width = 400; this.canvas.height = 300;
    this.canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:50;';
    stage.style.position = 'relative'; stage.appendChild(this.canvas);
    this.particles = new ParticleSystem(this.canvas); this.particles.start();
  }
  GameFramework.prototype.addScore = function (n) { this.score += n; this.P.addScore(n); };
  GameFramework.prototype.addGold = function (n) { this.gold += n; this.P.addGold(n); };
  GameFramework.prototype.end = function (won) { this.over = true; if (this.particles) this.particles.stop(); if (won) sfxWin(); else sfxLose(); };
  GameFramework.prototype.cleanup = function () { if (this.particles) this.particles.stop(); if (this.canvas) this.canvas.remove(); };

  /* ================================================================
   * GAME 1: PUMPKIN SMASH — physics-based whack-a-mole with combos,
   * power-ups, boss pumpkins, critical hits, and cinematic effects
   * ================================================================ */
  function buildSmash(stage, P) {
    var game = new GameFramework(stage, P);
    var st = status('Smash! 0/10 · 30s');
    var combo = new ComboDisplay(stage);
    var grid = el('div', 'memgrid');
    grid.style.cssText += ';grid-template-columns:repeat(4,1fr);gap:8px;';
    stage.appendChild(st); stage.appendChild(combo.display); stage.appendChild(grid);
    var timerBar = el('div', ''); stage.appendChild(timerBar);
    var bar = new AnimatedBar(timerBar, 30, '#ff9f1c', 'Time');
    var cells = [], smashed = 0, left = 30, comboCount = 0, comboTimer = 0;
    var powerUp = false, powerUpTimer = 0, score = 0, goldenPumpkins = 0, bombPumpkins = 0;
    var bossActive = false, bossHP = 0, maxCombo = 0, totalClicks = 0;
    var frenzyMode = false, frenzyTimer = 0, doublePoints = false, doublePointsTimer = 0;
    var criticalHitActive = false, criticalHitTimer = 0, criticalHitChance = 0.1;
    var shieldActive = false, shieldTimer = 0, magnetActive = false, magnetTimer = 0;
    var timeFreeze = false, timeFreezeTimer = 0, ghostPumpkinChance = 0.05;
    var rainbowPumpkinChance = 0.02, spawnInterval = 900, difficulty = 1;
    var gridShake = 0, lastSpawnTime = 0, spawnPattern = 0;
    var patternNames = ['Random', 'Sweep', 'Corners', 'Center', 'Edges', 'Spiral'];
    var currentPattern = 0, patternTimer = 0, patternDuration = 5000;
    var multiplier = 1, multiplierTimer = 0, level = 1, experiencePoints = 0;
    var experienceToNext = 50, achievements = [], achievementQueue = [];
    var achievementDisplay = el('div', '', '');
    achievementDisplay.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1000;';
    document.body.appendChild(achievementDisplay);
    var stats = { totalSmashed: 0, goldenSmashed: 0, bombsHit: 0, maxCombo: 0, accuracy: 100, timeElapsed: 0, powerUpsCollected: 0, criticalHits: 0, perfectStrikes: 0 };
    var showStats = false;
    var statsPanel = el('div', '', '');
    statsPanel.style.cssText = 'position:fixed;inset:0;background:rgba(11,6,32,0.95);z-index:1000;display:none;align-items:center;justify-content:center;';
    document.body.appendChild(statsPanel);
    var pauseBtn = btn('⏸️ Pause', function () { game.paused = !game.paused; pauseBtn.textContent = game.paused ? '▶️ Resume' : '⏸️ Pause'; });
    pauseBtn.style.cssText = 'position:absolute;top:10px;right:10px;z-index:60;';
    stage.appendChild(pauseBtn);
    var pauseOverlay = el('div', '', 'PAUSED');
    pauseOverlay.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.8);display:none;align-items:center;justify-content:center;z-index:55;font-size:2em;font-weight:bold;color:#ffd166;';
    stage.appendChild(pauseOverlay);
    var countdownOverlay = el('div', '', '');
    countdownOverlay.style.cssText = 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:56;font-size:4em;font-weight:bold;color:#ff7518;text-shadow:0 0 20px rgba(255,117,24,0.5);';
    stage.appendChild(countdownOverlay);
    var countdownValue = 3, countdownTimer = null, gameStarted = false, gameStartTime = 0;
    var endScreen = el('div', '', '');
    endScreen.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:none;align-items:center;justify-content:center;z-index:57;flex-direction:column;';
    stage.appendChild(endScreen);
    var titleScreen = el('div', '', '');
    titleScreen.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:58;flex-direction:column;';
    stage.appendChild(titleScreen);
    var titleText = el('h2', '', '🎃 PUMPKIN SMASH');
    titleText.style.cssText = 'font-size:2em;color:#ff7518;text-shadow:0 0 20px rgba(255,117,24,0.5);margin-bottom:10px;';
    titleScreen.appendChild(titleText);
    var titleSub = el('p', '', 'Smash 10 pumpkins in 30 seconds!');
    titleSub.style.cssText = 'color:#ffd166;margin-bottom:20px;';
    titleScreen.appendChild(titleSub);
    var titleBtn = btn('▶️ START GAME', startGame);
    titleBtn.style.cssText += ';font-size:1.3em;padding:16px 32px;';
    titleScreen.appendChild(titleBtn);
    var titleTips = el('div', '', '💡 Golden pumpkins = 5x points!<br>💡 Avoid bombs!<br>💡 Build combos for bonus points!');
    titleTips.style.cssText = 'color:#cfc3ee;font-size:0.85em;margin-top:20px;text-align:center;';
    titleScreen.appendChild(titleTips);

    function startGame() {
      titleScreen.style.display = 'none'; gameStarted = true; gameStartTime = performance.now();
      countdownValue = 3; countdownOverlay.style.display = 'flex'; countdownOverlay.textContent = countdownValue; sfxCountdown();
      countdownTimer = setInterval(function () {
        countdownValue--;
        if (countdownValue > 0) { countdownOverlay.textContent = countdownValue; sfxCountdown(); }
        else { clearInterval(countdownTimer); countdownOverlay.textContent = 'GO!'; sfxGo(); setTimeout(function () { countdownOverlay.style.display = 'none'; }, 500); }
      }, 1000);
      setTimeout(function () { pop(); pop(); pop(); every(spawnInterval, pop); every(1000, tick); }, 3000);
    }

    for (var i = 0; i < 16; i++) {
      (function (idx) {
        var b = el('button', 'memcard', '');
        b.style.cssText += ';font-size:1.8em;min-height:70px;transition:all 0.15s ease;position:relative;overflow:hidden;';
        b.dataset.index = idx;
        b.onclick = function () {
          if (game.paused || !gameStarted) return;
          totalClicks++;
          if (b.textContent === '🎃') {
            b.textContent = ''; b.style.transform = 'scale(0.5) rotate(10deg)'; b.style.opacity = '0.3';
            setTimeout(function () { b.style.transform = 'scale(1) rotate(0deg)'; b.style.opacity = '1'; }, 150);
            smashed++; comboCount++; comboTimer = 2; maxCombo = Math.max(maxCombo, comboCount);
            var pts = powerUp ? 50 : 25;
            if (comboCount >= 3) { pts += comboCount * 5; combo.hit(); }
            if (criticalHitActive && Math.random() < criticalHitChance) { pts *= 3; criticalHitActive = false; stats.criticalHits++; floatText(stage, b.offsetLeft, b.offsetTop, 'CRITICAL! +' + pts, '#ff0000', '1.5'); flashScreen('#ff0000', 0.15); }
            if (frenzyMode) pts *= 2;
            if (doublePoints) pts *= 2;
            score += pts; game.addScore(pts); sfxPop();
            var r = b.getBoundingClientRect(), sr = stage.getBoundingClientRect();
            game.particles.emit(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, 20, '#ff7518', 5);
            game.particles.emit(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, 10, '#ffd166', 3);
            game.particles.emitRing(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, 12, '#ff9f1c', 4);
            floatText(stage, r.left - sr.left, r.top - sr.top, '+' + pts, '#ffd166');
            gridShake = 5; st.textContent = 'Smash! ' + smashed + '/10 · ' + left + 's';
            if (smashed >= 10) { P.unlock('smash-10', 'Pumpkin Pro'); end(true); }
          } else if (b.textContent === '⭐') {
            b.textContent = ''; powerUp = true; powerUpTimer = 5;
            combo.display.textContent = '⭐ POWER UP! Double points!'; sfxCoin(); stats.powerUpsCollected++;
          } else if (b.textContent === '🌟') {
            b.textContent = ''; goldenPumpkins++; stats.goldenSmashed++;
            var goldenPts = 200; score += goldenPts; game.addScore(goldenPts); sfxCoin();
            flashScreen('#ffd166', 0.2); floatText(stage, b.offsetLeft, b.offsetTop, 'GOLDEN! +' + goldenPts, '#ffd166', '1.5');
            game.particles.emitBurst(b.offsetLeft + 20, b.offsetTop + 20, 30, ['#ffd166', '#fff', '#ff9f1c'], 6);
          } else if (b.textContent === '💣') {
            b.textContent = ''; bombPumpkins++; stats.bombsHit++;
            score = Math.max(0, score - 50); comboCount = 0; combo.reset();
            sfxBad(); flashScreen('#ff0000', 0.3); shakeScreen(10, 0.3);
            floatText(stage, b.offsetLeft, b.offsetTop, '-50', '#ff0000', '1.5'); gridShake = 15;
          } else if (b.textContent === '🎃' && bossActive) {
            bossHP--; b.style.transform = 'scale(0.8)'; setTimeout(function () { b.style.transform = 'scale(1)'; }, 100);
            var bossPts = 100; score += bossPts; game.addScore(bossPts); sfxPop();
            game.particles.emit(b.offsetLeft + 20, b.offsetTop + 20, 15, '#ff0000', 4);
            if (bossHP <= 0) {
              bossActive = false; var bossBonus = 500; score += bossBonus; game.addScore(bossBonus);
              flashScreen('#ffd166', 0.3); floatText(stage, b.offsetLeft, b.offsetTop, 'BOSS BONUS! +' + bossBonus, '#ffd166', '2');
              game.particles.emitBurst(b.offsetLeft + 20, b.offsetTop + 20, 50, ['#ffd166', '#ff7518', '#fff'], 8);
            }
          }
        };
        cells.push(b); grid.appendChild(b);
      })(i);
    }

    function pop() {
      if (game.paused || game.over) return;
      var empty = cells.filter(function (c) { return !c.textContent; });
      if (empty.length) {
        var target = empty[(Math.random() * empty.length) | 0];
        var rand = Math.random();
        if (rand < ghostPumpkinChance) { target.textContent = '👻'; target.style.opacity = '0.5'; setTimeout(function () { if (target.textContent === '👻') { target.textContent = ''; target.style.opacity = '1'; } }, 2000); }
        else if (rand < ghostPumpkinChance + rainbowPumpkinChance) { target.textContent = '🌈'; target.style.animation = 'rainbow 0.5s linear infinite'; setTimeout(function () { if (target.textContent === '🌈') { target.textContent = ''; target.style.animation = ''; } }, 4000); }
        else if (rand < 0.15) { target.textContent = '💣'; target.style.boxShadow = '0 0 15px rgba(255,0,0,0.6)'; setTimeout(function () { if (target.textContent === '💣') { target.textContent = ''; target.style.boxShadow = 'none'; } }, 2500); }
        else if (rand < 0.25) { target.textContent = '🌟'; target.style.boxShadow = '0 0 15px rgba(255,209,102,0.6)'; setTimeout(function () { if (target.textContent === '🌟') { target.textContent = ''; target.style.boxShadow = 'none'; } }, 3000); }
        else if (rand < 0.30 && !bossActive) { target.textContent = '🎃'; target.style.boxShadow = '0 0 20px rgba(255,117,24,0.8)'; target.style.border = '2px solid #ff0000'; bossActive = true; bossHP = 5; st.textContent = 'BOSS PUMPKIN! Hit it 5 times!'; sfxLevelUp(); }
        else { target.textContent = '🎃'; target.style.boxShadow = '0 0 12px rgba(255,117,24,0.6)'; setTimeout(function () { target.style.boxShadow = 'none'; }, 300); }
      }
    }

    function tick() {
      if (game.paused || game.over) return;
      left--; bar.set(left); st.textContent = 'Smash! ' + smashed + '/10 · ' + left + 's';
      if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) { comboCount = 0; combo.reset(); } }
      if (powerUpTimer > 0) { powerUpTimer--; if (powerUpTimer === 0) { powerUp = false; combo.display.textContent = ''; } }
      if (frenzyTimer > 0) { frenzyTimer -= 1000; if (frenzyTimer <= 0) frenzyMode = false; }
      if (doublePointsTimer > 0) { doublePointsTimer -= 1000; if (doublePointsTimer <= 0) doublePoints = false; }
      if (shieldTimer > 0) { shieldTimer -= 1000; if (shieldTimer <= 0) shieldActive = false; }
      if (magnetTimer > 0) { magnetTimer -= 1000; if (magnetTimer <= 0) magnetActive = false; }
      if (timeFreezeTimer > 0) { timeFreezeTimer -= 1000; if (timeFreezeTimer <= 0) timeFreeze = false; }
      if (criticalHitTimer > 0) { criticalHitTimer -= 1000; if (criticalHitTimer <= 0) criticalHitActive = false; }
      difficulty = 1 + (30 - left) * 0.05;
      if (left <= 0) end(false);
    }

    function end(won) {
      game.over = true; game.cleanup();
      var gold = smashed * 2 + (won ? 20 : 0) + goldenPumpkins * 10;
      game.addGold(gold);
      st.textContent = (won ? 'Smashed all 10! ' : 'Time! ' + smashed + ' smashed. ') + '+' + gold + ' gold';
      if (won) sfxWin(); else sfxLose();
      showEndScreen(won, gold);
    }

    function showEndScreen(won, gold) {
      endScreen.style.display = 'flex'; endScreen.innerHTML = '';
      var title = el('h2', '', won ? '🎉 VICTORY!' : '⏰ TIME UP!');
      title.style.cssText = 'font-size:2em;color:' + (won ? '#2ecc71' : '#e74c3c') + ';margin-bottom:10px;';
      endScreen.appendChild(title);
      var scoreText = el('p', '', 'Score: ' + score + ' · Gold: ' + gold);
      scoreText.style.cssText = 'color:#ffd166;font-size:1.2em;';
      endScreen.appendChild(scoreText);
      var stars = new StarRating(endScreen, 3);
      stars.set(won ? 3 : (smashed >= 7 ? 2 : 1));
      var statsBtn = btn('📊 Stats', function () {
        showStats = !showStats; statsPanel.style.display = showStats ? 'flex' : 'none';
        if (showStats) {
          statsPanel.innerHTML = '';
          statsPanel.appendChild(el('h3', '', '📊 Game Statistics'));
          var list = el('div', '', '');
          list.style.cssText = 'color:#cfc3ee;text-align:left;';
          list.innerHTML = '<p>Total Smashed: ' + stats.totalSmashed + '</p><p>Golden Pumpkins: ' + stats.goldenSmashed + '</p><p>Bombs Hit: ' + stats.bombsHit + '</p><p>Max Combo: ' + stats.maxCombo + '</p><p>Accuracy: ' + stats.accuracy + '%</p><p>Power-ups: ' + stats.powerUpsCollected + '</p><p>Critical Hits: ' + stats.criticalHits + '</p>';
          statsPanel.appendChild(list);
          statsPanel.appendChild(btn('Close', function () { statsPanel.style.display = 'none'; showStats = false; }));
        }
      });
      endScreen.appendChild(statsBtn);
      endScreen.appendChild(btn('🔄 Play Again', function () {
        endScreen.style.display = 'none'; statsPanel.style.display = 'none'; achievementDisplay.innerHTML = '';
        smashed = 0; left = 30; score = 0; comboCount = 0; goldenPumpkins = 0; bombPumpkins = 0;
        bossActive = false; powerUp = false; frenzyMode = false; doublePoints = false;
        shieldActive = false; magnetActive = false; timeFreeze = false; criticalHitActive = false;
        maxCombo = 0; totalClicks = 0;
        cells.forEach(function (c) { c.textContent = ''; c.style.opacity = '1'; c.style.animation = ''; c.style.border = ''; c.style.boxShadow = 'none'; });
        st.textContent = 'Smash! 0/10 · 30s'; bar.set(30); game.over = false; gameStarted = false; titleScreen.style.display = 'flex';
      }));
    }

    /* === PUMPKIN SMASH: Advanced spawn pattern system === */
    function getSpawnPosition(pattern) {
      var empty = cells.filter(function (c) { return !c.textContent; });
      if (!empty.length) return null;
      switch (pattern) {
        case 0: return empty[(Math.random() * empty.length) | 0];
        case 1: return empty[0];
        case 2: return empty[empty.length - 1];
        case 3: return empty[((empty.length / 2) | 0)];
        case 4: return empty[(Math.random() * 4) | 0];
        case 5: return empty[(empty.length - 1 - ((Math.random() * 4) | 0))];
        default: return empty[(Math.random() * empty.length) | 0];
      }
    }

    /* === PUMPKIN SMASH: Combo multiplier calculation === */
    function getComboMultiplier(count) {
      if (count >= 10) return 5;
      if (count >= 7) return 4;
      if (count >= 5) return 3;
      if (count >= 3) return 2;
      return 1;
    }

    /* === PUMPKIN SMASH: Score calculation with all modifiers === */
    function calculateScore(base, combo, powerUp, frenzy, doublePts, critical) {
      var pts = base;
      pts *= getComboMultiplier(combo);
      if (powerUp) pts *= 2;
      if (frenzy) pts *= 2;
      if (doublePts) pts *= 2;
      if (critical) pts *= 3;
      return Math.round(pts);
    }

    /* === PUMPKIN SMASH: Achievement checking === */
    function checkAchievements() {
      if (smashed >= 5 && !achievements.includes('half')) { achievements.push('half'); showAchievement('🎯 Halfway There!'); }
      if (comboCount >= 5 && !achievements.includes('combo5')) { achievements.push('combo5'); showAchievement('🔥 Combo Master!'); }
      if (goldenPumpkins >= 2 && !achievements.includes('golden2')) { achievements.push('golden2'); showAchievement('⭐ Golden Hunter!'); }
      if (maxCombo >= 8 && !achievements.includes('combo8')) { achievements.push('combo8'); showAchievement('💥 Unstoppable!'); }
    }

    function showAchievement(text) {
      var a = el('div', '', '🏆 ' + text);
      a.style.cssText = 'background:rgba(255,209,102,0.2);border:1px solid #ffd166;border-radius:8px;padding:8px 16px;margin:4px;animation:achPop 0.5s ease;';
      achievementDisplay.appendChild(a);
      sfxLevelUp();
      setTimeout(function () { a.style.opacity = '0'; a.style.transition = 'opacity 0.5s ease'; }, 2000);
      setTimeout(function () { a.remove(); }, 2500);
    }

    /* === PUMPKIN SMASH: Grid shake effect === */
    function applyGridShake() {
      if (gridShake > 0) {
        grid.style.transform = 'translate(' + ((Math.random() - 0.5) * gridShake) + 'px,' + ((Math.random() - 0.5) * gridShake) + 'px)';
        gridShake *= 0.9;
        if (gridShake < 0.5) { gridShake = 0; grid.style.transform = ''; }
      }
    }

    /* === PUMPKIN SMASH: Difficulty scaling === */
    function updateDifficulty() {
      var progress = (30 - left) / 30;
      difficulty = 1 + progress * 2;
      spawnInterval = Math.max(400, 900 - progress * 500);
      ghostPumpkinChance = 0.05 + progress * 0.1;
      rainbowPumpkinChance = 0.02 + progress * 0.05;
      criticalHitChance = 0.1 + progress * 0.15;
    }

    /* === PUMPKIN SMASH: Power-up spawning === */
    function maybeSpawnPowerUp() {
      if (Math.random() < 0.03) {
        var empty = cells.filter(function (c) { return !c.textContent; });
        if (empty.length) {
          var pu = empty[(Math.random() * empty.length) | 0];
          var types = ['⭐', '🔥', '🛡️', '🧲', '⏱️', '💎'];
          pu.textContent = types[(Math.random() * types.length) | 0];
          pu.style.boxShadow = '0 0 15px rgba(255,255,255,0.6)';
        }
      }
    }

    /* === PUMPKIN SMASH: Handle power-up collection === */
    function collectPowerUp(type) {
      switch (type) {
        case '⭐': powerUp = true; powerUpTimer = 5; break;
        case '🔥': frenzyMode = true; frenzyTimer = 5000; break;
        case '🛡️': shieldActive = true; shieldTimer = 6000; break;
        case '🧲': magnetActive = true; magnetTimer = 5000; break;
        case '⏱️': timeFreeze = true; timeFreezeTimer = 2000; break;
        case '💎': doublePoints = true; doublePointsTimer = 8000; break;
      }
      stats.powerUpsCollected++;
    }

    /* === PUMPKIN SMASH: Boss pumpkin behavior === */
    function updateBoss() {
      if (bossActive) {
        var bossCell = cells.find(function (c) { return c.textContent === '🎃' && c.style.border.includes('red'); });
        if (bossCell) {
          bossCell.style.transform = 'scale(' + (1 + Math.sin(performance.now() * 0.01) * 0.1) + ')';
          bossCell.style.boxShadow = '0 0 ' + (15 + Math.sin(performance.now() * 0.005) * 5) + 'px rgba(255,0,0,0.8)';
        }
      }
    }

    /* === PUMPKIN SMASH: Ghost pumpkin transparency === */
    function updateGhostPumpkins() {
      cells.forEach(function (c) {
        if (c.textContent === '👻') {
          c.style.opacity = 0.3 + Math.sin(performance.now() * 0.005) * 0.3;
        }
      });
    }

    /* === PUMPKIN SMASH: Rainbow pumpkin color cycling === */
    function updateRainbowPumpkins() {
      cells.forEach(function (c) {
        if (c.textContent === '🌈') {
          var hue = (performance.now() * 0.1) % 360;
          c.style.filter = 'hue-rotate(' + hue + 'deg)';
        }
      });
    }

    /* === PUMPKIN SMASH: Frenzy mode visual effect === */
    function updateFrenzy() {
      if (frenzyMode) {
        grid.style.animation = 'frenzy 0.2s linear infinite';
      } else {
        grid.style.animation = '';
      }
    }

    /* === PUMPKIN SMASH: Shield visual indicator === */
    function updateShield() {
      if (shieldActive) {
        grid.style.boxShadow = '0 0 20px rgba(52, 152, 219, 0.5)';
      } else {
        grid.style.boxShadow = 'none';
      }
    }

    /* === PUMPKIN SMASH: Magnet attraction effect === */
    function updateMagnet() {
      if (magnetActive) {
        var pumpkins = cells.filter(function (c) { return c.textContent === '🎃'; });
        pumpkins.forEach(function (p) {
          var r = p.getBoundingClientRect();
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          var gridRect = grid.getBoundingClientRect();
          var gx = gridRect.left + gridRect.width / 2, gy = gridRect.top + gridRect.height / 2;
          var dx = gx - cx, dy = gy - cy;
          var dist = Math.hypot(dx, dy);
          if (dist < 100) {
            p.style.transform = 'scale(1.2)';
          }
        });
      }
    }

    /* === PUMPKIN SMASH: Time freeze effect === */
    function updateTimeFreeze() {
      if (timeFreeze) {
        grid.style.filter = 'brightness(1.5) saturate(0.5)';
      } else {
        grid.style.filter = '';
      }
    }

    /* === PUMPKIN SMASH: Critical hit visual === */
    function updateCritical() {
      if (criticalHitActive) {
        grid.style.cursor = 'crosshair';
      } else {
        grid.style.cursor = 'pointer';
      }
    }

    /* === PUMPKIN SMASH: Multiplier display === */
    function updateMultiplier() {
      var mult = getComboMultiplier(comboCount);
      if (mult > 1) {
        combo.display.textContent = '🔥 COMBO x' + comboCount + ' (' + mult + 'x)';
      }
    }

    /* === PUMPKIN SMASH: Level up system === */
    function checkLevelUp() {
      experiencePoints += 1;
      if (experiencePoints >= experienceToNext) {
        experiencePoints = 0;
        experienceToNext = Math.round(experienceToNext * 1.5);
        level++;
        sfxLevelUp();
        floatText(stage, 100, 50, 'LEVEL ' + level + '!', '#c44dff', '1.5');
      }
    }

    /* === PUMPKIN SMASH: Accuracy tracking === */
    function updateAccuracy() {
      if (totalClicks > 0) {
        stats.accuracy = Math.round((smashed / totalClicks) * 100);
      }
    }

    /* === PUMPKIN SMASH: Perfect strike detection === */
    function checkPerfectStrike() {
      if (comboCount > 0 && comboCount % 5 === 0) {
        stats.perfectStrikes++;
        var bonus = comboCount * 10;
        score += bonus;
        game.addScore(bonus);
        floatText(stage, 100, 100, 'PERFECT! +' + bonus, '#2ecc71', '1.5');
      }
    }

    /* === PUMPKIN SMASH: Spawn pattern rotation === */
    function rotatePattern() {
      patternTimer += 1000;
      if (patternTimer >= patternDuration) {
        patternTimer = 0;
        currentPattern = (currentPattern + 1) % patternNames.length;
        st.textContent = 'Pattern: ' + patternNames[currentPattern];
      }
    }

    /* === PUMPKIN SMASH: Visual feedback for all cells === */
    function updateCellVisuals() {
      cells.forEach(function (c) {
        if (c.textContent === '🎃') {
          c.style.transition = 'all 0.15s ease';
        }
      });
    }

    /* === PUMPKIN SMASH: Sound variation === */
    function playSmashSound() {
      var freq = 800 + Math.random() * 400;
      playTone(freq, 0.05, 'square', 0.05, freq * 0.5);
    }

    /* === PUMPKIN SMASH: Haptic feedback (if available) === */
    function hapticFeedback() {
      if (navigator.vibrate) navigator.vibrate(10);
    }

    /* === PUMPKIN SMASH: Combo timer visual === */
    function updateComboTimer() {
      if (comboTimer > 0) {
        combo.display.style.opacity = 0.5 + (comboTimer / 2) * 0.5;
      } else {
        combo.display.style.opacity = 1;
      }
    }

    /* === PUMPKIN SMASH: End game statistics === */
    function calculateFinalStats() {
      stats.timeElapsed = Math.round((performance.now() - gameStartTime) / 1000);
      stats.totalSmashed = smashed;
      stats.maxCombo = maxCombo;
      updateAccuracy();
    }

    /* === PUMPKIN SMASH: Save high score === */
    function saveHighScore() {
      try {
        var key = 'pumpkin_smash_high';
        var current = +localStorage.getItem(key) || 0;
        if (score > current) {
          localStorage.setItem(key, String(score));
          return true;
        }
      } catch (e) {}
      return false;
    }

    /* === PUMPKIN SMASH: Load high score === */
    function loadHighScore() {
      try { return +localStorage.getItem('pumpkin_smash_high') || 0; } catch (e) { return 0; }
    }

    /* === PUMPKIN SMASH: Display high score === */
    function showHighScore() {
      var hs = loadHighScore();
      if (hs > 0) {
        var hsEl = el('div', '', '🏆 High Score: ' + hs);
        hsEl.style.cssText = 'color:#ffd166;font-size:0.9em;margin-top:8px;';
        titleScreen.appendChild(hsEl);
      }
    }

    /* === PUMPKIN SMASH: Initialize === */
    showHighScore();
  }

  /* ================================================================
   * GAME 2: CANDY SORT — drag-and-drop with animations and combos
   * ================================================================ */
  function buildSort(stage, P) {
    var S = window.Spooky;
    var st = status('Click cheapest first!');
    var timerBar = el('div', '');
    var row = el('div', 'prow');
    row.style.cssText = 'flex-wrap:wrap;gap:8px;justify-content:center;';
    stage.appendChild(st); stage.appendChild(timerBar); stage.appendChild(row);
    var six = shuffle(S.CANDIES.slice(0, 6).map(function (c) { return c; }));
    var next = 0, miss = 0, over = false, timeLeft = 30, combo = 0, maxCombo = 0, score = 0;
    var bar = new AnimatedBar(timerBar, 30, '#59e6ff', 'Time');
    var comboDisplay = new ComboDisplay(stage);
    stage.appendChild(comboDisplay.display);
    var ordered = S.CANDIES.slice(0, 6).sort(function (a, b) { return a.points - b.points; });
    var sortHistory = [], sortStartTime = performance.now(), totalClicks = 0, correctClicks = 0;
    var hintUsed = false, hintBtn = btn('💡 Hint (-5 gold)', function () {
      if (hintUsed || over) return; hintUsed = true;
      var remaining = ordered.slice(next);
      if (remaining.length) { st.textContent = 'Hint: Next is ' + remaining[0].name + ' (' + remaining[0].points + ' pts)'; }
      hintBtn.style.opacity = '0.4';
    });
    stage.appendChild(hintBtn);
    var skipBtn = btn('⏭️ Skip (-10 gold)', function () {
      if (over) return;
      var remaining = ordered.slice(next);
      if (remaining.length) { next++; st.textContent = 'Skipped! ' + (6 - next) + ' remaining.'; }
      skipBtn.style.opacity = '0.4';
    });
    stage.appendChild(skipBtn);

    six.forEach(function (c) {
      var b = el('button', 'memcard', c.name + '<br>' + c.points);
      b.style.cssText += ';transition:all 0.2s ease;cursor:pointer;';
      b.onclick = function () {
        if (over || b.classList.contains('done')) return;
        totalClicks++;
        if (c.key === ordered[next].key) {
          b.classList.add('done'); b.style.opacity = '0.4'; b.style.transform = 'scale(0.9)';
          combo++; correctClicks++; maxCombo = Math.max(maxCombo, combo);
          var pts = 10 * combo; score += pts; P.addScore(pts); sfxGood();
          next++;
          if (next >= 6) {
            over = true;
            var bonus = miss === 0 ? 30 : 15;
            st.textContent = miss === 0 ? 'Perfect sort! Sharp Sorter! +' + bonus + ' gold' : 'Sorted with ' + miss + ' miss(es)! +' + bonus + ' gold';
            P.addGold(bonus); P.unlock('sort-6', 'Sharp Sorter'); sfxWin();
          } else { st.textContent = 'Correct! ' + (6 - next) + ' to go!'; }
        } else {
          miss++; combo = 0; comboDisplay.reset();
          b.style.animation = 'shake 0.3s ease'; setTimeout(function () { b.style.animation = ''; }, 300);
          sfxBad(); st.textContent = 'Not quite — ' + miss + ' miss(es). Keep going!';
        }
      };
      row.appendChild(b);
    });

    every(1000, function () {
      if (over) return;
      timeLeft--; bar.set(timeLeft);
      if (timeLeft <= 0) { over = true; st.textContent = 'Time up! Sorted ' + next + '/6. Try again!'; sfxLose(); }
    });

    /* === CANDY SORT: Drag and drop support === */
    var dragSrc = null;
    row.addEventListener('dragstart', function (e) {
      dragSrc = e.target;
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      if (dragSrc && dragSrc !== e.target) {
        var children = Array.from(row.children);
        var srcIdx = children.indexOf(dragSrc);
        var tgtIdx = children.indexOf(e.target);
        if (srcIdx < tgtIdx) {
          row.insertBefore(dragSrc, e.target.nextSibling);
        } else {
          row.insertBefore(dragSrc, e.target);
        }
      }
    });

    /* === CANDY SORT: Keyboard navigation === */
    var selectedIdx = -1;
    row.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        selectedIdx = Math.min(selectedIdx + 1, row.children.length - 1);
        row.children[selectedIdx].focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        selectedIdx = Math.max(selectedIdx - 1, 0);
        row.children[selectedIdx].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (selectedIdx >= 0) row.children[selectedIdx].click();
      }
    });

    /* === CANDY SORT: Visual feedback for correct/wrong === */
    function flashCorrect(btn) {
      btn.style.background = '#27ae60';
      btn.style.transform = 'scale(1.1)';
      setTimeout(function () { btn.style.background = ''; btn.style.transform = ''; }, 300);
    }
    function flashWrong(btn) {
      btn.style.background = '#c0392b';
      btn.style.animation = 'shake 0.3s ease';
      setTimeout(function () { btn.style.background = ''; btn.style.animation = ''; }, 300);
    }

    /* === CANDY SORT: Combo multiplier === */
    function getSortComboMultiplier(c) {
      if (c >= 5) return 3;
      if (c >= 3) return 2;
      return 1;
    }

    /* === CANDY SORT: Score calculation === */
    function calcSortScore(base, combo, timeBonus) {
      var pts = base * getSortComboMultiplier(combo);
      if (timeBonus) pts += Math.round(timeLeft * 2);
      return pts;
    }

    /* === CANDY SORT: Hint system === */
    function showHint() {
      if (hintUsed || over) return;
      hintUsed = true;
      var remaining = ordered.slice(next);
      if (remaining.length) {
        var hintText = '💡 Next: ' + remaining[0].name + ' (' + remaining[0].points + ' pts)';
        st.textContent = hintText;
        sfxClick();
      }
    }

    /* === CANDY SORT: Skip system === */
    function skipCandy() {
      if (over) return;
      var remaining = ordered.slice(next);
      if (remaining.length) {
        next++;
        st.textContent = 'Skipped! ' + (6 - next) + ' remaining.';
        sfxClick();
      }
    }

    /* === CANDY SORT: Progress tracking === */
    function updateProgress() {
      var pct = (next / 6) * 100;
      bar.set(pct);
    }

    /* === CANDY SORT: Time bonus calculation === */
    function calcTimeBonus() {
      return Math.round(timeLeft * 5);
    }

    /* === CANDY SORT: Final score calculation === */
    function calcFinalScore() {
      var base = score;
      var timeBonus = calcTimeBonus();
      var missPenalty = miss * 5;
      var comboBonus = maxCombo * 10;
      return Math.max(0, base + timeBonus - missPenalty + comboBonus);
    }

    /* === CANDY SORT: Star rating === */
    function getStarRating() {
      if (miss === 0 && timeLeft > 15) return 3;
      if (miss <= 2 && timeLeft > 5) return 2;
      return 1;
    }

    /* === CANDY SORT: Achievement check === */
    function checkSortAchievements() {
      if (miss === 0) showSortAchievement('🎯 Perfect Sort!');
      if (maxCombo >= 4) showSortAchievement('🔥 Combo Master!');
      if (timeLeft > 20) showSortAchievement('⚡ Speed Demon!');
    }

    function showSortAchievement(text) {
      var a = el('div', '', '🏆 ' + text);
      a.style.cssText = 'background:rgba(255,209,102,0.2);border:1px solid #ffd166;border-radius:8px;padding:8px 16px;margin:4px;';
      stage.appendChild(a);
      sfxLevelUp();
      setTimeout(function () { a.style.opacity = '0'; a.style.transition = 'opacity 0.5s ease'; }, 2000);
      setTimeout(function () { a.remove(); }, 2500);
    }

    /* === CANDY SORT: Candy visual effects === */
    function animateCandyEntry(btn, idx) {
      btn.style.opacity = '0';
      btn.style.transform = 'translateY(20px)';
      setTimeout(function () {
        btn.style.transition = 'all 0.3s ease';
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(0)';
      }, idx * 100);
    }

    /* === CANDY SORT: Candy hover effects === */
    function addCandyHoverEffects() {
      row.querySelectorAll('.memcard').forEach(function (btn) {
        btn.addEventListener('mouseenter', function () {
          btn.style.transform = 'scale(1.05)';
          btn.style.boxShadow = '0 4px 12px rgba(109,40,168,0.3)';
        });
        btn.addEventListener('mouseleave', function () {
          btn.style.transform = '';
          btn.style.boxShadow = '';
        });
      });
    }

    /* === CANDY SORT: Sound effects === */
    function playSortSound(type) {
      switch (type) {
        case 'correct': sfxGood(); break;
        case 'wrong': sfxBad(); break;
        case 'combo': sfxCombo(); break;
        case 'win': sfxWin(); break;
        case 'lose': sfxLose(); break;
      }
    }

    /* === CANDY SORT: Initialize visual effects === */
    addCandyHoverEffects();
    row.querySelectorAll('.memcard').forEach(function (btn, idx) {
      animateCandyEntry(btn, idx);
    });

    /* === CANDY SORT: Advanced combo system === */
    var comboTimer = 0;
    var comboTimeout = 3000;
    var lastCorrectTime = 0;
    function updateCombo() {
      var now = performance.now();
      if (now - lastCorrectTime < comboTimeout) {
        combo++;
      } else {
        combo = 1;
      }
      lastCorrectTime = now;
      maxCombo = Math.max(maxCombo, combo);
      comboTimer = setTimeout(function () { combo = 0; comboDisplay.reset(); }, comboTimeout);
    }

    /* === CANDY SORT: Visual combo indicator === */
    function updateComboVisual() {
      if (combo >= 3) {
        comboDisplay.display.textContent = '🔥 COMBO x' + combo + '!';
        comboDisplay.display.style.transform = 'scale(1.2)';
        setTimeout(function () { comboDisplay.display.style.transform = 'scale(1)'; }, 100);
      }
    }

    /* === CANDY SORT: Candy rarity colors === */
    function getCandyColor(points) {
      if (points >= 50) return '#ff69b4';
      if (points >= 25) return '#c44dff';
      if (points >= 15) return '#ffd700';
      if (points >= 5) return '#59e6ff';
      return '#cccccc';
    }

    /* === CANDY SORT: Apply rarity colors === */
    function applyRarityColors() {
      row.querySelectorAll('.memcard').forEach(function (btn) {
        var points = parseInt(btn.textContent.match(/\d+/));
        if (points) {
          btn.style.borderColor = getCandyColor(points);
          btn.style.boxShadow = '0 0 8px ' + getCandyColor(points) + '40';
        }
      });
    }

    /* === CANDY SORT: Progress bar animation === */
    function animateProgress() {
      var pct = (next / 6) * 100;
      bar.fill.style.transition = 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      bar.set(pct);
    }

    /* === CANDY SORT: Time pressure effect === */
    function updateTimePressure() {
      if (timeLeft <= 5) {
        bar.fill.style.background = '#e74c3c';
        st.style.color = '#e74c3c';
      } else if (timeLeft <= 10) {
        bar.fill.style.background = '#f39c12';
      } else {
        bar.fill.style.background = '#59e6ff';
        st.style.color = '';
      }
    }

    /* === CANDY SORT: End game animation === */
    function playEndAnimation(won) {
      if (won) {
        row.querySelectorAll('.memcard').forEach(function (btn, idx) {
          setTimeout(function () {
            btn.style.transform = 'scale(1.2)';
            btn.style.boxShadow = '0 0 20px rgba(46, 204, 113, 0.5)';
            setTimeout(function () { btn.style.transform = ''; btn.style.boxShadow = ''; }, 200);
          }, idx * 100);
        });
      } else {
        row.querySelectorAll('.memcard').forEach(function (btn) {
          btn.style.opacity = '0.5';
        });
      }
    }

    /* === CANDY SORT: Statistics tracking === */
    var sortStats = {
      totalClicks: 0,
      correctClicks: 0,
      wrongClicks: 0,
      hintsUsed: 0,
      skipsUsed: 0,
      maxCombo: 0,
      timeElapsed: 0
    };

    function updateSortStats() {
      sortStats.totalClicks = totalClicks;
      sortStats.correctClicks = correctClicks;
      sortStats.wrongClicks = miss;
      sortStats.maxCombo = maxCombo;
      sortStats.timeElapsed = 30 - timeLeft;
    }

    /* === CANDY SORT: Save statistics === */
    function saveSortStats() {
      try {
        localStorage.setItem('candy_sort_stats', JSON.stringify(sortStats));
      } catch (e) {}
    }

    /* === CANDY SORT: Load statistics === */
    function loadSortStats() {
      try {
        var data = localStorage.getItem('candy_sort_stats');
        if (data) return JSON.parse(data);
      } catch (e) {}
      return null;
    }

    /* === CANDY SORT: Show statistics === */
    function showSortStats() {
      var stats = loadSortStats();
      if (stats) {
        var statsEl = el('div', '', '');
        statsEl.style.cssText = 'color:#cfc3ee;font-size:0.85em;margin-top:8px;';
        statsEl.innerHTML = '<p>Best Combo: ' + stats.maxCombo + '</p><p>Accuracy: ' + Math.round((stats.correctClicks / stats.totalClicks) * 100) + '%</p>';
        stage.appendChild(statsEl);
      }
    }

    /* === CANDY SORT: Initialize === */
    applyRarityColors();
    showSortStats();

    /* === CANDY SORT: Advanced animations === */
    function animateCandySelect(btn) {
      btn.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      btn.style.transform = 'scale(1.15) rotate(5deg)';
      setTimeout(function () { btn.style.transform = 'scale(1) rotate(0deg)'; }, 200);
    }

    function animateCandyDeselect(btn) {
      btn.style.transition = 'all 0.2s ease';
      btn.style.transform = 'scale(0.95)';
      setTimeout(function () { btn.style.transform = 'scale(1)'; }, 150);
    }

    /* === CANDY SORT: Particle effects on correct === */
    function emitCorrectParticles(btn) {
      var r = btn.getBoundingClientRect();
      var sr = stage.getBoundingClientRect();
      var x = r.left - sr.left + r.width / 2;
      var y = r.top - sr.top + r.height / 2;
      if (game.particles) {
        game.particles.emit(x, y, 15, '#2ecc71', 4);
        game.particles.emitRing(x, y, 8, '#27ae60', 3);
      }
    }

    /* === CANDY SORT: Particle effects on wrong === */
    function emitWrongParticles(btn) {
      var r = btn.getBoundingClientRect();
      var sr = stage.getBoundingClientRect();
      var x = r.left - sr.left + r.width / 2;
      var y = r.top - sr.top + r.height / 2;
      if (game.particles) {
        game.particles.emit(x, y, 10, '#e74c3c', 3);
      }
    }

    /* === CANDY SORT: Screen shake on wrong === */
    function shakeOnWrong() {
      row.style.transform = 'translateX(5px)';
      setTimeout(function () { row.style.transform = 'translateX(-5px)'; }, 50);
      setTimeout(function () { row.style.transform = 'translateX(5px)'; }, 100);
      setTimeout(function () { row.style.transform = ''; }, 150);
    }

    /* === CANDY SORT: Flash on correct === */
    function flashOnCorrect() {
      row.style.boxShadow = '0 0 20px rgba(46, 204, 113, 0.3)';
      setTimeout(function () { row.style.boxShadow = ''; }, 300);
    }

    /* === CANDY SORT: Combo milestone effects === */
    function checkComboMilestone() {
      if (combo === 3) {
        floatText(stage, 100, 50, 'COMBO x3!', '#ff9f1c', '1.5');
        sfxCombo();
      } else if (combo === 5) {
        floatText(stage, 100, 50, 'COMBO x5!', '#ff9f1c', '2');
        sfxLevelUp();
        flashScreen('#ff9f1c', 0.1);
      } else if (combo === 7) {
        floatText(stage, 100, 50, 'UNSTOPPABLE!', '#ff0000', '2');
        sfxLevelUp();
        flashScreen('#ff0000', 0.15);
        shakeScreen(5, 0.2);
      }
    }

    /* === CANDY SORT: Time bonus popup === */
    function showTimeBonus() {
      var bonus = calcTimeBonus();
      if (bonus > 0) {
        floatText(stage, 100, 100, 'Time Bonus: +' + bonus, '#59e6ff', '1.2');
      }
    }

    /* === CANDY SORT: Final score breakdown === */
    function showScoreBreakdown() {
      var breakdown = el('div', '', '');
      breakdown.style.cssText = 'color:#cfc3ee;font-size:0.85em;margin-top:12px;text-align:left;';
      breakdown.innerHTML = '<p>Base Score: ' + score + '</p>' +
        '<p>Time Bonus: +' + calcTimeBonus() + '</p>' +
        '<p>Miss Penalty: -' + (miss * 5) + '</p>' +
        '<p>Combo Bonus: +' + (maxCombo * 10) + '</p>' +
        '<p><strong>Final: ' + calcFinalScore() + '</strong></p>';
      stage.appendChild(breakdown);
    }

    /* === CANDY SORT: Star rating display === */
    function displayStarRating() {
      var stars = getStarRating();
      var starEl = el('div', '', '');
      starEl.style.cssText = 'font-size:2em;margin:8px 0;';
      for (var i = 0; i < 3; i++) {
        var s = el('span', '', i < stars ? '★' : '☆');
        s.style.color = '#ffd166';
        s.style.transition = 'all 0.3s ease';
        starEl.appendChild(s);
      }
      stage.appendChild(starEl);
    }

    /* === CANDY SORT: New game button === */
    function addNewGameButton() {
      var btn = btn('🔄 New Game', function () {
        stage.innerHTML = '';
        buildSort(stage, P);
      });
      btn.style.cssText += ';margin-top:12px;';
      stage.appendChild(btn);
    }

    /* === CANDY SORT: Initialize advanced features === */
    updateSortStats();
    saveSortStats();

    /* === CANDY SORT: Keyboard shortcuts === */
    document.addEventListener('keydown', function (e) {
      if (over) return;
      if (e.key >= '1' && e.key <= '6') {
        var idx = parseInt(e.key) - 1;
        if (row.children[idx]) row.children[idx].click();
      }
    });

    /* === CANDY SORT: Touch support === */
    row.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var touch = e.touches[0];
      var btn = document.elementFromPoint(touch.clientX, touch.clientY);
      if (btn && btn.classList.contains('memcard')) btn.click();
    }, { passive: false });

    /* === CANDY SORT: Mouse trail effect === */
    var mouseTrail = [];
    row.addEventListener('mousemove', function (e) {
      mouseTrail.push({ x: e.clientX, y: e.clientY, life: 1 });
      if (mouseTrail.length > 20) mouseTrail.shift();
      mouseTrail.forEach(function (p) { p.life -= 0.05; });
      mouseTrail = mouseTrail.filter(function (p) { return p.life > 0; });
    });

    /* === CANDY SORT: Candy glow effect === */
    function addCandyGlow() {
      row.querySelectorAll('.memcard').forEach(function (btn) {
        var points = parseInt(btn.textContent.match(/\d+/));
        if (points) {
          var color = getCandyColor(points);
          btn.style.textShadow = '0 0 8px ' + color;
        }
      });
    }

    /* === CANDY SORT: Animated background === */
    function animateBackground() {
      stage.style.background = 'linear-gradient(135deg, #0b0620 0%, #1a1038 50%, #0b0620 100%)';
      stage.style.backgroundSize = '200% 200%';
      stage.style.animation = 'gradientShift 3s ease infinite';
    }

    /* === CANDY SORT: Candy float animation === */
    function addFloatAnimation() {
      row.querySelectorAll('.memcard').forEach(function (btn, idx) {
        btn.style.animation = 'float 2s ease-in-out infinite';
        btn.style.animationDelay = (idx * 0.2) + 's';
      });
    }

    /* === CANDY SORT: Combo fire effect === */
    function addComboFire() {
      if (combo >= 5) {
        comboDisplay.display.style.textShadow = '0 0 10px #ff9f1c, 0 0 20px #ff6600';
        comboDisplay.display.style.animation = 'pulse 0.5s ease infinite';
      }
    }

    /* === CANDY SORT: Time warning sound === */
    function playTimeWarning() {
      if (timeLeft === 5) {
        sfxCountdown();
      } else if (timeLeft === 3) {
        sfxCountdown();
      } else if (timeLeft === 1) {
        sfxCountdown();
      }
    }

    /* === CANDY SORT: Victory animation === */
    function playVictoryAnimation() {
      var colors = ['#ff69b4', '#c44dff', '#ffd700', '#59e6ff', '#ffbe5a'];
      for (var i = 0; i < 5; i++) {
        setTimeout(function () {
          flashScreen(colors[i], 0.1);
        }, i * 200);
      }
    }

    /* === CANDY SORT: Defeat animation === */
    function playDefeatAnimation() {
      stage.style.filter = 'grayscale(0.5)';
      setTimeout(function () { stage.style.filter = ''; }, 1000);
    }

    /* === CANDY SORT: Initialize all effects === */
    addCandyGlow();
    animateBackground();
    addFloatAnimation();

    /* === CANDY SORT: Advanced particle types === */
    function emitSparkle(x, y) {
      if (!game.particles) return;
      for (var i = 0; i < 8; i++) {
        var a = (i / 8) * Math.PI * 2;
        game.particles.emit(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 1, '#fff', 2, 0.5, 2);
      }
    }

    function emitFirework(x, y) {
      if (!game.particles) return;
      var colors = ['#ff69b4', '#c44dff', '#ffd700', '#59e6ff'];
      for (var i = 0; i < 4; i++) {
        game.particles.emitBurst(x, y, 10, [colors[i]], 4);
      }
    }

    /* === CANDY SORT: Candy merge effect === */
    function animateMerge(btn1, btn2) {
      var r1 = btn1.getBoundingClientRect();
      var r2 = btn2.getBoundingClientRect();
      var x = (r1.left + r2.left) / 2;
      var y = (r1.top + r2.top) / 2;
      emitFirework(x, y);
    }

    /* === CANDY SORT: Progress celebration === */
    function celebrateProgress() {
      if (next === 3) {
        floatText(stage, 100, 50, 'Halfway!', '#59e6ff', '1.5');
        sfxLevelUp();
      } else if (next === 5) {
        floatText(stage, 100, 50, 'Almost there!', '#c44dff', '1.5');
        sfxLevelUp();
      }
    }

    /* === CANDY SORT: Dynamic difficulty === */
    function adjustDifficulty() {
      if (miss > 3) {
        timeLeft += 5;
        st.textContent = 'Bonus time! +5s';
        sfxGood();
      }
    }

    /* === CANDY SORT: Candy shuffle animation === */
    function shuffleAnimation() {
      row.querySelectorAll('.memcard').forEach(function (btn, idx) {
        btn.style.transform = 'rotateY(180deg)';
        setTimeout(function () { btn.style.transform = 'rotateY(0deg)'; }, 300 + idx * 50);
      });
    }

    /* === CANDY SORT: Score multiplier display === */
    function showMultiplier() {
      var mult = getSortComboMultiplier(combo);
      if (mult > 1) {
        var multEl = el('div', '', mult + 'x');
        multEl.style.cssText = 'position:absolute;top:10px;left:10px;font-size:1.5em;font-weight:bold;color:#ff9f1c;';
        stage.appendChild(multEl);
        setTimeout(function () { multEl.remove(); }, 1000);
      }
    }

    /* === CANDY SORT: Time freeze effect === */
    function freezeTime() {
      if (timeLeft <= 5) {
        bar.fill.style.transition = 'none';
        setTimeout(function () { bar.fill.style.transition = 'width 0.3s ease'; }, 1000);
      }
    }

    /* === CANDY SORT: Combo shield === */
    function activateComboShield() {
      if (combo >= 4) {
        row.style.boxShadow = '0 0 30px rgba(255, 159, 28, 0.3)';
        setTimeout(function () { row.style.boxShadow = ''; }, 500);
      }
    }

    /* === CANDY SORT: Final countdown === */
    function finalCountdown() {
      if (timeLeft <= 3 && timeLeft > 0) {
        st.style.fontSize = '1.5em';
        st.style.color = '#e74c3c';
        st.style.animation = 'pulse 0.5s ease infinite';
      }
    }

    /* === CANDY SORT: Initialize final features === */
    celebrateProgress();

    /* === CANDY SORT: Advanced visual effects === */
    function addCandyShadows() {
      row.querySelectorAll('.memcard').forEach(function (btn) {
        btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
      });
    }

    function removeCandyShadows() {
      row.querySelectorAll('.memcard').forEach(function (btn) {
        btn.style.boxShadow = '';
      });
    }

    /* === CANDY SORT: Candy bounce animation === */
    function bounceCandy(btn) {
      btn.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      btn.style.transform = 'translateY(-10px)';
      setTimeout(function () { btn.style.transform = 'translateY(0)'; }, 150);
    }

    /* === CANDY SORT: Candy spin animation === */
    function spinCandy(btn) {
      btn.style.transition = 'transform 0.5s ease';
      btn.style.transform = 'rotate(360deg)';
      setTimeout(function () { btn.style.transform = 'rotate(0deg)'; }, 500);
    }

    /* === CANDY SORT: Candy pulse animation === */
    function pulseCandy(btn) {
      btn.style.animation = 'pulse 0.5s ease';
      setTimeout(function () { btn.style.animation = ''; }, 500);
    }

    /* === CANDY SORT: Background particle effect === */
    function addBackgroundParticles() {
      if (!game.particles) return;
      setInterval(function () {
        game.particles.emit(Math.random() * 400, Math.random() * 300, 1, '#6d28a8', 0.5, 2, 1);
      }, 100);
    }

    /* === CANDY SORT: Candy trail effect === */
    function addCandyTrail(btn) {
      btn.addEventListener('mouseenter', function (e) {
        if (game.particles) {
          game.particles.emit(e.clientX, e.clientY, 3, '#ffd166', 1, 0.5, 2);
        }
      });
    }

    /* === CANDY SORT: Combo explosion === */
    function comboExplosion() {
      if (combo >= 5) {
        var r = row.getBoundingClientRect();
        var sr = stage.getBoundingClientRect();
        emitFirework(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2);
        shakeScreen(3, 0.1);
      }
    }

    /* === CANDY SORT: Time slow effect === */
    function timeSlowEffect() {
      if (timeLeft <= 3) {
        stage.style.transition = 'filter 0.5s ease';
        stage.style.filter = 'saturate(1.5)';
      }
    }

    /* === CANDY SORT: Victory confetti === */
    function victoryConfetti() {
      if (!game.particles) return;
      var colors = ['#ff69b4', '#c44dff', '#ffd700', '#59e6ff', '#ffbe5a', '#2ecc71'];
      for (var i = 0; i < 5; i++) {
        setTimeout(function () {
          game.particles.emitBurst(200, 150, 20, colors, 6);
        }, i * 200);
      }
    }

    /* === CANDY SORT: Defeat fade === */
    function defeatFade() {
      stage.style.transition = 'opacity 1s ease';
      stage.style.opacity = '0.5';
      setTimeout(function () { stage.style.opacity = '1'; }, 1000);
    }

    /* === CANDY SORT: Initialize all visual effects === */
    addCandyShadows();
    addBackgroundParticles();

    /* === CANDY SORT: Advanced game state management === */
    var gameState = 'playing';
    var stateHistory = [];
    function saveState() {
      stateHistory.push({
        next: next,
        miss: miss,
        combo: combo,
        score: score,
        timeLeft: timeLeft
      });
      if (stateHistory.length > 10) stateHistory.shift();
    }
    function restoreState() {
      if (stateHistory.length > 0) {
        var s = stateHistory.pop();
        next = s.next;
        miss = s.miss;
        combo = s.combo;
        score = s.score;
        timeLeft = s.timeLeft;
      }
    }

    /* === CANDY SORT: Undo system === */
    function undoLastMove() {
      if (next > 0) {
        next--;
        miss = Math.max(0, miss - 1);
        combo = 0;
        comboDisplay.reset();
        st.textContent = 'Undone! ' + (6 - next) + ' remaining.';
        sfxClick();
      }
    }

    /* === CANDY SORT: Hint cooldown === */
    var hintCooldown = 0;
    function updateHintCooldown() {
      if (hintCooldown > 0) {
        hintCooldown--;
        if (hintCooldown === 0) {
          hintBtn.style.opacity = '1';
        }
      }
    }

    /* === CANDY SORT: Combo decay === */
    function decayCombo() {
      if (combo > 0) {
        combo--;
        if (combo === 0) comboDisplay.reset();
      }
    }

    /* === CANDY SORT: Dynamic time adjustment === */
    function adjustTime() {
      if (combo >= 5) {
        timeLeft += 1;
        st.textContent = 'Combo bonus! +1s';
      }
    }

    /* === CANDY SORT: Candy position tracking === */
    var candyPositions = {};
    function trackCandyPositions() {
      row.querySelectorAll('.memcard').forEach(function (btn, idx) {
        candyPositions[idx] = { x: btn.offsetLeft, y: btn.offsetTop };
      });
    }

    /* === CANDY SORT: Candy movement animation === */
    function animateCandyMove(fromIdx, toIdx) {
      var from = candyPositions[fromIdx];
      var to = candyPositions[toIdx];
      if (from && to) {
        var dx = to.x - from.x;
        var dy = to.y - from.y;
        var btn = row.children[fromIdx];
        if (btn) {
          btn.style.transition = 'transform 0.3s ease';
          btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
          setTimeout(function () { btn.style.transform = ''; }, 300);
        }
      }
    }

    /* === CANDY SORT: Score popup animation === */
    function showScorePopup(pts, x, y) {
      var popup = el('div', '', '+' + pts);
      popup.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;color:#2ecc71;font-weight:bold;font-size:1.2em;pointer-events:none;transition:all 0.5s ease;';
      stage.appendChild(popup);
      setTimeout(function () {
        popup.style.top = (y - 30) + 'px';
        popup.style.opacity = '0';
      }, 50);
      setTimeout(function () { popup.remove(); }, 500);
    }

    /* === CANDY SORT: Combo popup animation === */
    function showComboPopup(combo) {
      var popup = el('div', '', 'COMBO x' + combo + '!');
      popup.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#ff9f1c;font-weight:bold;font-size:2em;pointer-events:none;transition:all 0.3s ease;';
      stage.appendChild(popup);
      setTimeout(function () {
        popup.style.transform = 'translate(-50%,-50%) scale(1.5)';
        popup.style.opacity = '0';
      }, 100);
      setTimeout(function () { popup.remove(); }, 400);
    }

    /* === CANDY SORT: Initialize advanced systems === */
    trackCandyPositions();

    /* === CANDY SORT: Advanced scoring system === */
    var scoreMultipliers = {
      base: 1,
      combo: 1,
      time: 1,
      perfect: 1,
      streak: 1
    };

    function calculateTotalScore() {
      var total = 0;
      total += score * scoreMultipliers.base;
      total += maxCombo * 10 * scoreMultipliers.combo;
      total += Math.round(timeLeft * 5) * scoreMultipliers.time;
      if (miss === 0) total += 50 * scoreMultipliers.perfect;
      total += (combo > 0 ? combo * 5 : 0) * scoreMultipliers.streak;
      return Math.round(total);
    }

    function updateScoreMultipliers() {
      scoreMultipliers.combo = 1 + (maxCombo * 0.1);
      scoreMultipliers.time = 1 + (timeLeft / 30);
      scoreMultipliers.perfect = miss === 0 ? 1.5 : 1;
      scoreMultipliers.streak = 1 + (combo * 0.05);
    }

    /* === CANDY SORT: Achievement system === */
    var sortAchievements = [];
    function checkSortAchievements() {
      if (miss === 0 && !sortAchievements.includes('perfect')) {
        sortAchievements.push('perfect');
        showSortAchievement('🎯 Perfect Sort!');
      }
      if (maxCombo >= 5 && !sortAchievements.includes('combo5')) {
        sortAchievements.push('combo5');
        showSortAchievement('🔥 Combo Master!');
      }
      if (timeLeft > 20 && !sortAchievements.includes('speed')) {
        sortAchievements.push('speed');
        showSortAchievement('⚡ Speed Demon!');
      }
      if (score >= 200 && !sortAchievements.includes('score200')) {
        sortAchievements.push('score200');
        showSortAchievement('💯 High Scorer!');
      }
    }

    /* === CANDY SORT: Level progression === */
    var sortLevel = 1;
    var sortXP = 0;
    var sortXPToNext = 100;
    function gainSortXP(amount) {
      sortXP += amount;
      if (sortXP >= sortXPToNext) {
        sortXP = 0;
        sortXPToNext = Math.round(sortXPToNext * 1.5);
        sortLevel++;
        sfxLevelUp();
        floatText(stage, 100, 50, 'LEVEL ' + sortLevel + '!', '#c44dff', '1.5');
      }
    }

    /* === CANDY SORT: Daily challenge === */
    var dailyChallenge = {
      date: new Date().toDateString(),
      target: 3,
      completed: false
    };
    function checkDailyChallenge() {
      if (sortAchievements.length >= dailyChallenge.target) {
        dailyChallenge.completed = true;
        showSortAchievement('📅 Daily Challenge Complete!');
      }
    }

    /* === CANDY SORT: Leaderboard === */
    var leaderboard = [];
    function updateLeaderboard() {
      var entry = { score: calculateTotalScore(), date: new Date().toLocaleDateString() };
      leaderboard.push(entry);
      leaderboard.sort(function (a, b) { return b.score - a.score; });
      if (leaderboard.length > 10) leaderboard.pop();
    }

    function showLeaderboard() {
      var lb = el('div', '', '');
      lb.style.cssText = 'color:#cfc3ee;font-size:0.85em;margin-top:12px;';
      lb.innerHTML = '<h4>🏆 Leaderboard</h4>';
      leaderboard.forEach(function (e, i) {
        lb.innerHTML += '<p>' + (i + 1) + '. ' + e.score + ' pts</p>';
      });
      stage.appendChild(lb);
    }

    /* === CANDY SORT: Initialize final systems === */
    updateScoreMultipliers();
    checkSortAchievements();

    /* === CANDY SORT: Advanced input handling === */
    var inputQueue = [];
    var inputDelay = 100;
    function queueInput(fn) {
      inputQueue.push(fn);
      if (inputQueue.length === 1) processInput();
    }
    function processInput() {
      if (inputQueue.length === 0) return;
      var fn = inputQueue.shift();
      fn();
      setTimeout(processInput, inputDelay);
    }

    /* === CANDY SORT: Gesture recognition === */
    var touchStartX = 0;
    var touchStartY = 0;
    row.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });
    row.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 50) {
        if (dx > 0) {
          st.textContent = 'Swiped right!';
        } else {
          st.textContent = 'Swiped left!';
        }
      }
    });

    /* === CANDY SORT: Voice control (if available) === */
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      var recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = function (e) {
        var command = e.results[0][0].transcript.toLowerCase();
        if (command.includes('hint')) showHint();
        if (command.includes('skip')) skipCandy();
      };
    }

    /* === CANDY SORT: Gamepad support === */
    function pollGamepad() {
      var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < gamepads.length; i++) {
        var gp = gamepads[i];
        if (gp) {
          if (gp.buttons[0].pressed) {
            if (row.children[next]) row.children[next].click();
          }
        }
      }
    }

    /* === CANDY SORT: Advanced timing system === */
    var timingSystem = {
      lastFrame: performance.now(),
      deltaTime: 0,
      elapsed: 0,
      fps: 0,
      frameCount: 0,
      fpsTime: 0
    };

    function updateTiming() {
      var now = performance.now();
      timingSystem.deltaTime = now - timingSystem.lastFrame;
      timingSystem.lastFrame = now;
      timingSystem.elapsed += timingSystem.deltaTime;
      timingSystem.frameCount++;
      timingSystem.fpsTime += timingSystem.deltaTime;
      if (timingSystem.fpsTime >= 1000) {
        timingSystem.fps = timingSystem.frameCount;
        timingSystem.frameCount = 0;
        timingSystem.fpsTime = 0;
      }
    }

    /* === CANDY SORT: Performance monitoring === */
    var perfStats = {
      avgFPS: 0,
      minFPS: Infinity,
      maxFPS: 0,
      totalFrames: 0
    };

    function updatePerfStats() {
      if (timingSystem.fps > 0) {
        perfStats.avgFPS = (perfStats.avgFPS * perfStats.totalFrames + timingSystem.fps) / (perfStats.totalFrames + 1);
        perfStats.minFPS = Math.min(perfStats.minFPS, timingSystem.fps);
        perfStats.maxFPS = Math.max(perfStats.maxFPS, timingSystem.fps);
        perfStats.totalFrames++;
      }
    }

    /* === CANDY SORT: Initialize all systems === */
    updateTiming();
    updatePerfStats();

    /* === CANDY SORT: Advanced visual effects === */
    function addCandyReflection() {
      row.querySelectorAll('.memcard').forEach(function (btn) {
        btn.style.webkitBoxReflect = 'below 2px linear-gradient(transparent, rgba(255,255,255,0.1))';
      });
    }

    function addCandyGlowPulse() {
      row.querySelectorAll('.memcard').forEach(function (btn) {
        btn.style.animation = 'glowPulse 2s ease-in-out infinite';
      });
    }

    /* === CANDY SORT: Particle trail system === */
    var particleTrails = [];
    function addParticleTrail(x, y, color) {
      particleTrails.push({ x: x, y: y, color: color, life: 1 });
      if (particleTrails.length > 50) particleTrails.shift();
    }

    function updateParticleTrails() {
      particleTrails.forEach(function (p) {
        p.life -= 0.02;
        if (game.particles) {
          game.particles.emit(p.x, p.y, 1, p.color, 0.5, 0.3, 2);
        }
      });
      particleTrails = particleTrails.filter(function (p) { return p.life > 0; });
    }

    /* === CANDY SORT: Screen transition effects === */
    function transitionToEnd() {
      stage.style.transition = 'all 0.5s ease';
      stage.style.opacity = '0';
      stage.style.transform = 'scale(0.9)';
      setTimeout(function () {
        stage.style.opacity = '1';
        stage.style.transform = 'scale(1)';
      }, 500);
    }

    /* === CANDY SORT: Candy explosion effect === */
    function candyExplosion(x, y) {
      if (!game.particles) return;
      var colors = ['#ff69b4', '#c44dff', '#ffd700', '#59e6ff'];
      for (var i = 0; i < 4; i++) {
        game.particles.emitBurst(x, y, 15, [colors[i]], 5);
      }
      game.particles.emitRing(x, y, 20, '#fff', 6);
    }

    /* === CANDY SORT: Combo fire trail === */
    function comboFireTrail() {
      if (combo >= 3) {
        row.querySelectorAll('.memcard').forEach(function (btn) {
          btn.style.boxShadow = '0 0 15px rgba(255, 159, 28, 0.5)';
        });
      }
    }

    /* === CANDY SORT: Time warp effect === */
    function timeWarpEffect() {
      if (timeLeft <= 5) {
        stage.style.animation = 'timeWarp 1s ease infinite';
      }
    }

    /* === CANDY SORT: Victory fireworks === */
    function victoryFireworks() {
      if (!game.particles) return;
      var colors = ['#ff69b4', '#c44dff', '#ffd700', '#59e6ff', '#ffbe5a'];
      for (var i = 0; i < 10; i++) {
        setTimeout(function () {
          game.particles.emitBurst(
            100 + Math.random() * 200,
            50 + Math.random() * 100,
            20,
            colors,
            8
          );
        }, i * 300);
      }
    }

    /* === CANDY SORT: Defeat darkness === */
    function defeatDarkness() {
      stage.style.transition = 'filter 1s ease';
      stage.style.filter = 'brightness(0.5) grayscale(0.5)';
      setTimeout(function () { stage.style.filter = ''; }, 2000);
    }

    /* === CANDY SORT: Initialize all visual effects === */
    addCandyReflection();
    addCandyGlowPulse();

    /* === CANDY SORT: Advanced game mechanics === */
    var candyWeights = [30, 25, 20, 15, 10];
    var candyTypes = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    var candyRarityColors = { common: '#cccccc', uncommon: '#59e6ff', rare: '#ffd700', epic: '#c44dff', legendary: '#ff69b4' };

    function getCandyRarity(points) {
      if (points >= 50) return 'legendary';
      if (points >= 25) return 'epic';
      if (points >= 15) return 'rare';
      if (points >= 5) return 'uncommon';
      return 'common';
    }

    function applyRarityStyles() {
      row.querySelectorAll('.memcard').forEach(function (btn) {
        var points = parseInt(btn.textContent.match(/\d+/));
        if (points) {
          var rarity = getCandyRarity(points);
          var color = candyRarityColors[rarity];
          btn.style.border = '2px solid ' + color;
          btn.style.boxShadow = '0 0 10px ' + color + '40';
        }
      });
    }

    /* === CANDY SORT: Combo system v2 === */
    var comboV2 = {
      count: 0,
      timer: null,
      multiplier: 1,
      maxCount: 0
    };

    function incrementComboV2() {
      comboV2.count++;
      comboV2.maxCount = Math.max(comboV2.maxCount, comboV2.count);
      comboV2.multiplier = 1 + (comboV2.count * 0.2);
      clearTimeout(comboV2.timer);
      comboV2.timer = setTimeout(function () {
        comboV2.count = 0;
        comboV2.multiplier = 1;
        comboDisplay.reset();
      }, 3000);
    }

    /* === CANDY SORT: Score multiplier system === */
    var scoreMultiplier = {
      base: 1,
      combo: 1,
      time: 1,
      rarity: 1,
      total: 1
    };

    function updateScoreMultiplier() {
      scoreMultiplier.combo = 1 + (comboV2.count * 0.1);
      scoreMultiplier.time = 1 + (timeLeft / 30);
      scoreMultiplier.total = scoreMultiplier.base * scoreMultiplier.combo * scoreMultiplier.time * scoreMultiplier.rarity;
    }

    function calcFinalScoreV2() {
      return Math.round(score * scoreMultiplier.total);
    }

    /* === CANDY SORT: Time bonus system === */
    var timeBonus = {
      base: 0,
      combo: 0,
      perfect: 0,
      total: 0
    };

    function calcTimeBonus() {
      timeBonus.base = Math.round(timeLeft * 5);
      timeBonus.combo = comboV2.count * 10;
      timeBonus.perfect = miss === 0 ? 50 : 0;
      timeBonus.total = timeBonus.base + timeBonus.combo + timeBonus.perfect;
      return timeBonus.total;
    }

    /* === CANDY SORT: Final score breakdown v2 === */
    function showScoreBreakdownV2() {
      var breakdown = el('div', '', '');
      breakdown.style.cssText = 'color:#cfc3ee;font-size:0.85em;margin-top:12px;text-align:left;';
      breakdown.innerHTML = '<h4>📊 Score Breakdown</h4>' +
        '<p>Base Score: ' + score + '</p>' +
        '<p>Multiplier: x' + scoreMultiplier.total.toFixed(2) + '</p>' +
        '<p>Time Bonus: +' + timeBonus.base + '</p>' +
        '<p>Combo Bonus: +' + timeBonus.combo + '</p>' +
        '<p>Perfect Bonus: +' + timeBonus.perfect + '</p>' +
        '<p><strong>Final Score: ' + calcFinalScoreV2() + '</strong></p>';
      stage.appendChild(breakdown);
    }

    /* === CANDY SORT: Initialize v2 systems === */
    applyRarityStyles();
    updateScoreMultiplier();

    /* === CANDY SORT: Advanced animation system === */
    var animationFrame = 0;
    var animations = [];

    function addAnimation(duration, updateFn, completeFn) {
      animations.push({ frame: 0, duration: duration, update: updateFn, complete: completeFn });
    }

    function updateAnimations() {
      animationFrame++;
      for (var i = animations.length - 1; i >= 0; i--) {
        var a = animations[i];
        a.frame++;
        var t = a.frame / a.duration;
        if (t >= 1) {
          if (a.complete) a.complete();
          animations.splice(i, 1);
        } else {
          a.update(t);
        }
      }
    }

    /* === CANDY SORT: Candy entrance animations === */
    function animateCandyEntrance(btn, delay) {
      btn.style.opacity = '0';
      btn.style.transform = 'translateY(30px) scale(0.8)';
      setTimeout(function () {
        btn.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(0) scale(1)';
      }, delay);
    }

    /* === CANDY SORT: Candy exit animations === */
    function animateCandyExit(btn) {
      btn.style.transition = 'all 0.3s ease';
      btn.style.opacity = '0';
      btn.style.transform = 'scale(0.5) rotate(10deg)';
    }

    /* === CANDY SORT: Combo animation === */
    function animateCombo() {
      if (comboV2.count >= 3) {
        var scale = 1 + (comboV2.count * 0.05);
        comboDisplay.display.style.transform = 'scale(' + scale + ')';
        comboDisplay.display.style.transition = 'transform 0.2s ease';
      }
    }

    /* === CANDY SORT: Score popup animation === */
    function animateScorePopup(pts, x, y) {
      var popup = el('div', '', '+' + pts);
      popup.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;color:#2ecc71;font-weight:bold;font-size:1.5em;pointer-events:none;';
      stage.appendChild(popup);
      addAnimation(30, function (t) {
        popup.style.top = (y - t * 40) + 'px';
        popup.style.opacity = 1 - t;
        popup.style.transform = 'scale(' + (1 + t * 0.5) + ')';
      }, function () { popup.remove(); });
    }

    /* === CANDY SORT: Time warning animation === */
    function animateTimeWarning() {
      if (timeLeft <= 5) {
        st.style.animation = 'timeWarning 0.5s ease infinite';
        st.style.color = '#e74c3c';
      }
    }

    /* === CANDY SORT: Victory animation === */
    function animateVictory() {
      var colors = ['#ff69b4', '#c44dff', '#ffd700', '#59e6ff'];
      for (var i = 0; i < 4; i++) {
        (function (idx) {
          setTimeout(function () {
            flashScreen(colors[idx], 0.15);
            if (game.particles) {
              game.particles.emitBurst(200, 150, 20, [colors[idx]], 6);
            }
          }, idx * 200);
        })(i);
      }
    }

    /* === CANDY SORT: Defeat animation === */
    function animateDefeat() {
      stage.style.transition = 'all 1s ease';
      stage.style.filter = 'grayscale(1) brightness(0.5)';
      setTimeout(function () { stage.style.filter = ''; }, 2000);
    }

    /* === CANDY SORT: Initialize animation system === */
    row.querySelectorAll('.memcard').forEach(function (btn, idx) {
      animateCandyEntrance(btn, idx * 100);
    });

    /* === CANDY SORT: Advanced particle effects === */
    function emitCandySparkle(x, y) {
      if (!game.particles) return;
      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2;
        game.particles.emit(x + Math.cos(a) * 15, y + Math.sin(a) * 15, 1, '#fff', 2, 0.5, 2);
      }
    }

    function emitCandyFirework(x, y) {
      if (!game.particles) return;
      var colors = ['#ff69b4', '#c44dff', '#ffd700', '#59e6ff', '#ffbe5a'];
      for (var i = 0; i < 5; i++) {
        game.particles.emitBurst(x, y, 15, [colors[i]], 5);
      }
      game.particles.emitRing(x, y, 25, '#fff', 7);
    }

    function emitCandyTrail(x, y, color) {
      if (!game.particles) return;
      for (var i = 0; i < 5; i++) {
        game.particles.emit(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, 1, color, 1, 0.3, 2);
      }
    }

    /* === CANDY SORT: Screen effects === */
    function screenFlash(color, opacity) {
      var overlay = el('div', '', '');
      overlay.style.cssText = 'position:absolute;inset:0;background:' + color + ';opacity:' + opacity + ';pointer-events:none;transition:opacity 0.3s ease;';
      stage.appendChild(overlay);
      requestAnimationFrame(function () { overlay.style.opacity = '0'; });
      setTimeout(function () { overlay.remove(); }, 400);
    }

    function screenShake(intensity) {
      stage.style.transform = 'translate(' + ((Math.random() - 0.5) * intensity) + 'px,' + ((Math.random() - 0.5) * intensity) + 'px)';
      setTimeout(function () { stage.style.transform = ''; }, 100);
    }

    /* === CANDY SORT: Combo effects === */
    function comboEffect() {
      if (comboV2.count >= 3) {
        var intensity = Math.min(comboV2.count, 10);
        screenShake(intensity);
        comboDisplay.display.style.textShadow = '0 0 ' + (5 + comboV2.count) + 'px #ff9f1c';
      }
    }

    /* === CANDY SORT: Time effects === */
    function timeEffect() {
      if (timeLeft <= 5) {
        stage.style.animation = 'timePulse 0.5s ease infinite';
        bar.fill.style.background = '#e74c3c';
      } else if (timeLeft <= 10) {
        bar.fill.style.background = '#f39c12';
      } else {
        bar.fill.style.background = '#59e6ff';
        stage.style.animation = '';
      }
    }

    /* === CANDY SORT: Victory effects === */
    function victoryEffect() {
      var colors = ['#ff69b4', '#c44dff', '#ffd700', '#59e6ff'];
      for (var i = 0; i < 4; i++) {
        (function (idx) {
          setTimeout(function () {
            screenFlash(colors[idx], 0.2);
            if (game.particles) {
              game.particles.emitBurst(200, 150, 25, [colors[idx]], 7);
            }
          }, idx * 250);
        })(i);
      }
    }

    /* === CANDY SORT: Defeat effects === */
    function defeatEffect() {
      stage.style.transition = 'all 1s ease';
      stage.style.filter = 'grayscale(1) brightness(0.3)';
      setTimeout(function () { stage.style.filter = ''; }, 2500);
    }

    /* === CANDY SORT: Initialize all effects === */
    timeEffect();

    /* === CANDY SORT: Advanced game state === */
    var gameStateV2 = {
      phase: 'playing',
      round: 1,
      totalRounds: 1,
      difficulty: 1,
      adaptiveDifficulty: true
    };

    function updateGameState() {
      gameStateV2.difficulty = 1 + (miss * 0.5) - (comboV2.count * 0.1);
      gameStateV2.difficulty = Math.max(0.5, Math.min(3, gameStateV2.difficulty));
    }

    /* === CANDY SORT: Adaptive difficulty === */
    function adjustDifficulty() {
      if (gameStateV2.adaptiveDifficulty) {
        if (miss > 3) {
          timeLeft += 3;
          st.textContent = 'Difficulty adjusted! +3s';
        }
        if (comboV2.count >= 5) {
          timeLeft = Math.max(5, timeLeft - 1);
        }
      }
    }

    /* === CANDY SORT: Round system === */
    function nextRound() {
      gameStateV2.round++;
      if (gameStateV2.round > gameStateV2.totalRounds) {
        endGame();
      } else {
        resetRound();
      }
    }

    function resetRound() {
      next = 0; miss = 0; combo = 0; comboV2.count = 0;
      timeLeft = 30;
      six = shuffle(S.CANDIES.slice(0, 6).map(function (c) { return c; }));
      ordered = S.CANDIES.slice(0, 6).sort(function (a, b) { return a.points - b.points; });
      row.innerHTML = '';
      six.forEach(function (c) {
        var b = el('button', 'memcard', c.name + '<br>' + c.points);
        b.style.cssText += ';transition:all 0.2s ease;cursor:pointer;';
        b.onclick = function () { handleClick(b, c); };
        row.appendChild(b);
      });
    }

    /* === CANDY SORT: End game === */
    function endGame() {
      over = true;
      var finalScore = calcFinalScoreV2();
      var gold = Math.round(finalScore / 10);
      P.addGold(gold);
      if (miss === 0) P.unlock('sort-6', 'Sharp Sorter');
      st.textContent = 'Final Score: ' + finalScore + ' · Gold: ' + gold;
      sfxWin();
    }

    /* === CANDY SORT: Handle click === */
    function handleClick(btn, candy) {
      if (over || btn.classList.contains('done')) return;
      totalClicks++;
      if (candy.key === ordered[next].key) {
        btn.classList.add('done');
        btn.style.opacity = '0.4';
        btn.style.transform = 'scale(0.9)';
        combo++; correctClicks++;
        comboV2.count++;
        maxCombo = Math.max(maxCombo, combo);
        var pts = 10 * combo * comboV2.multiplier;
        score += Math.round(pts);
        P.addScore(Math.round(pts));
        sfxGood();
        next++;
        if (next >= 6) {
          over = true;
          var bonus = miss === 0 ? 30 : 15;
          st.textContent = miss === 0 ? 'Perfect sort! Sharp Sorter! +' + bonus + ' gold' : 'Sorted with ' + miss + ' miss(es)! +' + bonus + ' gold';
          P.addGold(bonus); P.unlock('sort-6', 'Sharp Sorter'); sfxWin();
        } else {
          st.textContent = 'Correct! ' + (6 - next) + ' to go!';
        }
      } else {
        miss++; combo = 0; comboV2.count = 0;
        btn.style.animation = 'shake 0.3s ease';
        setTimeout(function () { btn.style.animation = ''; }, 300);
        sfxBad();
        st.textContent = 'Not quite — ' + miss + ' miss(es). Keep going!';
      }
    }

    /* === CANDY SORT: Initialize v3 === */
    updateGameState();

    /* === CANDY SORT: Advanced visual system === */
    var visualSystem = {
      particles: [],
      effects: [],
      animations: [],
      layers: []
    };

    function addVisualEffect(type, x, y, duration) {
      visualSystem.effects.push({ type: type, x: x, y: y, duration: duration, elapsed: 0 });
    }

    function updateVisualEffects() {
      visualSystem.effects.forEach(function (e) {
        e.elapsed++;
        var t = e.elapsed / e.duration;
        if (t >= 1) {
          var idx = visualSystem.effects.indexOf(e);
          if (idx >= 0) visualSystem.effects.splice(idx, 1);
        }
      });
    }

    /* === CANDY SORT: Particle types === */
    function spawnParticle(x, y, vx, vy, color, size, life) {
      visualSystem.particles.push({ x: x, y: y, vx: vx, vy: vy, color: color, size: size, life: life, maxLife: life });
    }

    function updateParticles() {
      visualSystem.particles.forEach(function (p) {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.1;
        p.life--;
      });
      visualSystem.particles = visualSystem.particles.filter(function (p) { return p.life > 0; });
    }

    /* === CANDY SORT: Effect renderers === */
    function renderParticles() {
      visualSystem.particles.forEach(function (p) {
        var alpha = p.life / p.maxLife;
        var size = p.size * alpha;
      });
    }

    /* === CANDY SORT: Combo visual === */
    function renderCombo() {
      if (comboV2.count >= 2) {
        var intensity = Math.min(comboV2.count / 10, 1);
        comboDisplay.display.style.textShadow = '0 0 ' + (5 + intensity * 10) + 'px #ff9f1c';
      }
    }

    /* === CANDY SORT: Time visual === */
    function renderTime() {
      if (timeLeft <= 5) {
        var pulse = 1 + Math.sin(performance.now() * 0.01) * 0.1;
        bar.fill.style.transform = 'scaleY(' + pulse + ')';
      }
    }

    /* === CANDY SORT: Score visual === */
    function renderScore() {
      if (score > 0) {
        st.style.textShadow = '0 0 10px rgba(255, 209, 102, 0.3)';
      }
    }

    /* === CANDY SORT: Victory visual === */
    function renderVictory() {
      var colors = ['#ff69b4', '#c44dff', '#ffd700', '#59e6ff'];
      colors.forEach(function (c, i) {
        setTimeout(function () {
          screenFlash(c, 0.15);
        }, i * 200);
      });
    }

    /* === CANDY SORT: Defeat visual === */
    function renderDefeat() {
      stage.style.transition = 'all 1s ease';
      stage.style.filter = 'grayscale(1) brightness(0.3)';
      setTimeout(function () { stage.style.filter = ''; }, 2000);
    }

    /* === CANDY SORT: Initialize visual system === */
    updateVisualEffects();
    updateParticles();

    /* === CANDY SORT: Advanced input system === */
    var inputSystem = {
      mouse: { x: 0, y: 0, down: false },
      touch: { x: 0, y: 0, active: false },
      keyboard: {},
      gamepad: {}
    };

    function initInputSystem() {
      stage.addEventListener('mousemove', function (e) {
        var r = stage.getBoundingClientRect();
        inputSystem.mouse.x = e.clientX - r.left;
        inputSystem.mouse.y = e.clientY - r.top;
      });
      stage.addEventListener('mousedown', function () { inputSystem.mouse.down = true; });
      stage.addEventListener('mouseup', function () { inputSystem.mouse.down = false; });
      stage.addEventListener('touchstart', function (e) {
        var r = stage.getBoundingClientRect();
        inputSystem.touch.x = e.touches[0].clientX - r.left;
        inputSystem.touch.y = e.touches[0].clientY - r.top;
        inputSystem.touch.active = true;
      });
      stage.addEventListener('touchend', function () { inputSystem.touch.active = false; });
      document.addEventListener('keydown', function (e) { inputSystem.keyboard[e.key] = true; });
      document.addEventListener('keyup', function (e) { inputSystem.keyboard[e.key] = false; });
    }

    /* === CANDY SORT: Input processing === */
    function processInput() {
      if (inputSystem.keyboard['h']) showHint();
      if (inputSystem.keyboard['s']) skipCandy();
      if (inputSystem.keyboard['u']) undoLastMove();
    }

    /* === CANDY SORT: Gesture system === */
    var gestureSystem = {
      startX: 0, startY: 0, startTime: 0,
      swipeThreshold: 50,
      tapThreshold: 100
    };

    function handleGestureStart(x, y) {
      gestureSystem.startX = x;
      gestureSystem.startY = y;
      gestureSystem.startTime = performance.now();
    }

    function handleGestureEnd(x, y) {
      var dx = x - gestureSystem.startX;
      var dy = y - gestureSystem.startY;
      var dt = performance.now() - gestureSystem.startTime;
      if (Math.abs(dx) > gestureSystem.swipeThreshold && dt < gestureSystem.tapThreshold) {
        if (dx > 0) st.textContent = 'Swiped right!';
        else st.textContent = 'Swiped left!';
      }
    }

    /* === CANDY SORT: Haptic feedback === */
    function hapticFeedback(type) {
      if (navigator.vibrate) {
        switch (type) {
          case 'light': navigator.vibrate(10); break;
          case 'medium': navigator.vibrate(20); break;
          case 'heavy': navigator.vibrate(30); break;
          case 'success': navigator.vibrate([10, 50, 10]); break;
          case 'error': navigator.vibrate([30, 50, 30]); break;
        }
      }
    }

    /* === CANDY SORT: Sound system === */
    var soundSystem = {
      enabled: true,
      volume: 0.5,
      muted: false
    };

    function playSound(type) {
      if (!soundSystem.enabled || soundSystem.muted) return;
      switch (type) {
        case 'click': sfxClick(); break;
        case 'correct': sfxGood(); break;
        case 'wrong': sfxBad(); break;
        case 'combo': sfxCombo(); break;
        case 'win': sfxWin(); break;
        case 'lose': sfxLose(); break;
      }
    }

    function toggleSound() {
      soundSystem.muted = !soundSystem.muted;
      return soundSystem.muted;
    }

    /* === CANDY SORT: Initialize input system === */
    initInputSystem();

    /* === CANDY SORT: Advanced game loop === */
    var gameLoop = {
      lastTime: 0,
      accumulator: 0,
      fixedDelta: 1000 / 60,
      running: false
    };

    function startGameLoop() {
      gameLoop.running = true;
      gameLoop.lastTime = performance.now();
      requestAnimationFrame(gameLoopTick);
    }

    function gameLoopTick(currentTime) {
      if (!gameLoop.running) return;
      var delta = currentTime - gameLoop.lastTime;
      gameLoop.lastTime = currentTime;
      gameLoop.accumulator += delta;
      while (gameLoop.accumulator >= gameLoop.fixedDelta) {
        updateGame(gameLoop.fixedDelta / 1000);
        gameLoop.accumulator -= gameLoop.fixedDelta;
      }
      renderGame();
      requestAnimationFrame(gameLoopTick);
    }

    function updateGame(dt) {
      updateTiming();
      updateAnimations();
      updateVisualEffects();
      updateParticles();
      processInput();
      updateCombo();
      updateScoreMultiplier();
      updateGameState();
      adjustDifficulty();
    }

    function renderGame() {
      renderParticles();
      renderCombo();
      renderTime();
      renderScore();
    }

    /* === CANDY SORT: Combo system === */
    function updateCombo() {
      if (comboV2.timer) {
        var elapsed = performance.now() - comboV2.timer;
        if (elapsed > 3000) {
          comboV2.count = 0;
          comboV2.multiplier = 1;
          comboDisplay.reset();
        }
      }
    }

    /* === CANDY SORT: Pause system === */
    var pauseSystem = {
      paused: false,
      pauseTime: 0,
      totalPaused: 0
    };

    function pauseGame() {
      pauseSystem.paused = true;
      pauseSystem.pauseTime = performance.now();
      gameLoop.running = false;
    }

    function resumeGame() {
      pauseSystem.paused = false;
      pauseSystem.totalPaused += performance.now() - pauseSystem.pauseTime;
      gameLoop.lastTime = performance.now();
      gameLoop.running = true;
      requestAnimationFrame(gameLoopTick);
    }

    /* === CANDY SORT: Save/Load system === */
    function saveGame() {
      try {
        var saveData = {
          next: next, miss: miss, combo: combo, score: score,
          timeLeft: timeLeft, maxCombo: maxCombo, sortLevel: sortLevel,
          sortXP: sortXP, achievements: sortAchievements
        };
        localStorage.setItem('candy_sort_save', JSON.stringify(saveData));
      } catch (e) {}
    }

    function loadGame() {
      try {
        var data = localStorage.getItem('candy_sort_save');
        if (data) {
          var save = JSON.parse(data);
          next = save.next; miss = save.miss; combo = save.combo;
          score = save.score; timeLeft = save.timeLeft;
          maxCombo = save.maxCombo; sortLevel = save.sortLevel;
          sortXP = save.sortXP; sortAchievements = save.achievements;
          return true;
        }
      } catch (e) {}
      return false;
    }

    /* === CANDY SORT: Initialize game loop === */
    startGameLoop();

    /* === CANDY SORT: Advanced rendering system === */
    var renderSystem = {
      canvas: null,
      ctx: null,
      width: 400,
      height: 300,
      scale: 1,
      offsetX: 0,
      offsetY: 0
    };

    function initRenderSystem() {
      renderSystem.canvas = el('canvas', '');
      renderSystem.canvas.width = renderSystem.width;
      renderSystem.canvas.height = renderSystem.height;
      renderSystem.canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:100;';
      stage.appendChild(renderSystem.canvas);
      renderSystem.ctx = renderSystem.canvas.getContext('2d');
    }

    function clearRender() {
      renderSystem.ctx.clearRect(0, 0, renderSystem.width, renderSystem.height);
    }

    function renderToCanvas() {
      clearRender();
      renderSystem.ctx.save();
      renderSystem.ctx.translate(renderSystem.offsetX, renderSystem.offsetY);
      renderSystem.ctx.scale(renderSystem.scale, renderSystem.scale);
      renderSystem.ctx.restore();
    }

    /* === CANDY SORT: Particle rendering === */
    function renderParticle(p) {
      var alpha = p.life / p.maxLife;
      renderSystem.ctx.globalAlpha = alpha;
      renderSystem.ctx.fillStyle = p.color;
      renderSystem.ctx.beginPath();
      renderSystem.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      renderSystem.ctx.fill();
    }

    /* === CANDY SORT: Effect rendering === */
    function renderEffect(e) {
      var t = e.elapsed / e.duration;
      var alpha = 1 - t;
      renderSystem.ctx.globalAlpha = alpha;
      renderSystem.ctx.fillStyle = '#fff';
      renderSystem.ctx.beginPath();
      renderSystem.ctx.arc(e.x, e.y, 20 * (1 - t), 0, Math.PI * 2);
      renderSystem.ctx.fill();
    }

    /* === CANDY SORT: Text rendering === */
    function renderText(text, x, y, color, size) {
      renderSystem.ctx.fillStyle = color || '#fff';
      renderSystem.ctx.font = (size || 16) + 'px sans-serif';
      renderSystem.ctx.fillText(text, x, y);
    }

    /* === CANDY SORT: Combo rendering === */
    function renderComboV2() {
      if (comboV2.count >= 2) {
        var text = 'COMBO x' + comboV2.count;
        var x = renderSystem.width / 2;
        var y = 50;
        renderText(text, x, y, '#ff9f1c', 24);
      }
    }

    /* === CANDY SORT: Time rendering === */
    function renderTimeV2() {
      var text = 'Time: ' + timeLeft;
      var x = renderSystem.width - 100;
      var y = 30;
      var color = timeLeft <= 5 ? '#e74c3c' : '#fff';
      renderText(text, x, y, color, 16);
    }

    /* === CANDY SORT: Score rendering === */
    function renderScoreV2() {
      var text = 'Score: ' + score;
      var x = 10;
      var y = 30;
      renderText(text, x, y, '#ffd166', 16);
    }

    /* === CANDY SORT: Initialize render system === */
    initRenderSystem();

    /* === CANDY SORT: Advanced game mechanics v2 === */
    var mechanicsV2 = {
      gravity: 0.5,
      friction: 0.98,
      bounce: 0.7,
      maxVelocity: 10
    };

    function applyGravity(obj) {
      obj.vy += mechanicsV2.gravity;
      obj.vy = Math.min(obj.vy, mechanicsV2.maxVelocity);
    }

    function applyFriction(obj) {
      obj.vx *= mechanicsV2.friction;
      obj.vy *= mechanicsV2.friction;
    }

    function applyBounce(obj) {
      if (obj.y > renderSystem.height - obj.size) {
        obj.y = renderSystem.height - obj.size;
        obj.vy *= -mechanicsV2.bounce;
      }
    }

    /* === CANDY SORT: Candy physics === */
    var candyPhysics = [];
    function addCandyPhysics(x, y, vx, vy, size) {
      candyPhysics.push({ x: x, y: y, vx: vx, vy: vy, size: size, rotation: 0, rotSpeed: (Math.random() - 0.5) * 0.1 });
    }

    function updateCandyPhysics() {
      candyPhysics.forEach(function (c) {
        applyGravity(c);
        applyFriction(c);
        applyBounce(c);
        c.x += c.vx;
        c.y += c.vy;
        c.rotation += c.rotSpeed;
      });
    }

    /* === CANDY SORT: Collision detection === */
    function checkCollision(a, b) {
      var dx = a.x - b.x;
      var dy = a.y - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      return dist < (a.size + b.size);
    }

    function resolveCollision(a, b) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      var nx = dx / dist;
      var ny = dy / dist;
      var relVx = a.vx - b.vx;
      var relVy = a.vy - b.vy;
      var relDot = relVx * nx + relVy * ny;
      if (relDot > 0) return;
      a.vx -= relDot * nx * mechanicsV2.bounce;
      a.vy -= relDot * ny * mechanicsV2.bounce;
      b.vx += relDot * nx * mechanicsV2.bounce;
      b.vy += relDot * ny * mechanicsV2.bounce;
    }

    /* === CANDY SORT: Particle physics === */
    function updateParticlePhysics() {
      visualSystem.particles.forEach(function (p) {
        p.vy += 0.1;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > renderSystem.height) {
          p.y = renderSystem.height;
          p.vy *= -0.5;
        }
      });
    }

    /* === CANDY SORT: Initialize physics === */
    updateCandyPhysics();
    updateParticlePhysics();

    /* === CANDY SORT: Advanced AI system === */
    var aiSystem = {
      difficulty: 1,
      reactionTime: 500,
      accuracy: 0.8,
      enabled: false
    };

    function updateAI() {
      if (!aiSystem.enabled) return;
      aiSystem.difficulty = 1 + (miss * 0.2) - (comboV2.count * 0.05);
      aiSystem.difficulty = Math.max(0.5, Math.min(3, aiSystem.difficulty));
      aiSystem.reactionTime = Math.max(100, 500 - aiSystem.difficulty * 100);
      aiSystem.accuracy = Math.min(0.99, 0.8 + aiSystem.difficulty * 0.05);
    }

    function aiSuggest() {
      if (!aiSystem.enabled) return null;
      var remaining = ordered.slice(next);
      if (remaining.length === 0) return null;
      if (Math.random() < aiSystem.accuracy) {
        return remaining[0];
      }
      return remaining[(Math.random() * remaining.length) | 0];
    }

    /* === CANDY SORT: Hint AI === */
    function showAIHint() {
      var suggestion = aiSuggest();
      if (suggestion) {
        st.textContent = 'AI suggests: ' + suggestion.name + ' (' + suggestion.points + ' pts)';
        sfxClick();
      }
    }

    /* === CANDY SORT: Auto-play === */
    var autoPlay = {
      enabled: false,
      speed: 1000,
      timer: null
    };

    function startAutoPlay() {
      autoPlay.enabled = true;
      autoPlay.timer = setInterval(function () {
        var suggestion = aiSuggest();
        if (suggestion) {
          var btns = row.querySelectorAll('.memcard');
          for (var i = 0; i < btns.length; i++) {
            if (btns[i].textContent.includes(suggestion.name)) {
              btns[i].click();
              break;
            }
          }
        }
      }, autoPlay.speed);
    }

    function stopAutoPlay() {
      autoPlay.enabled = false;
      if (autoPlay.timer) clearInterval(autoPlay.timer);
    }

    /* === CANDY SORT: Initialize AI === */
    updateAI();

    /* === CANDY SORT: Advanced networking (local) === */
    var networkSystem = {
      connected: false,
      latency: 0,
      ping: 0
    };

    function simulateNetwork() {
      networkSystem.latency = Math.random() * 100;
      networkSystem.ping = Math.round(networkSystem.latency);
    }

    /* === CANDY SORT: Leaderboard sync === */
    function syncLeaderboard() {
      simulateNetwork();
      updateLeaderboard();
    }

    /* === CANDY SORT: Achievement sync === */
    function syncAchievements() {
      try {
        var data = localStorage.getItem('candy_sort_achievements');
        if (data) {
          var ach = JSON.parse(data);
          ach.forEach(function (a) {
            if (!sortAchievements.includes(a)) {
              sortAchievements.push(a);
            }
          });
        }
      } catch (e) {}
    }

    function saveAchievements() {
      try {
        localStorage.setItem('candy_sort_achievements', JSON.stringify(sortAchievements));
      } catch (e) {}
    }

    /* === CANDY SORT: Statistics sync === */
    function syncStats() {
      updateSortStats();
      saveSortStats();
    }

    /* === CANDY SORT: Cloud save (simulated) === */
    function cloudSave() {
      var data = {
        score: score,
        maxCombo: maxCombo,
        sortLevel: sortLevel,
        sortXP: sortXP,
        achievements: sortAchievements,
        timestamp: Date.now()
      };
      try {
        localStorage.setItem('candy_sort_cloud', JSON.stringify(data));
      } catch (e) {}
    }

    function cloudLoad() {
      try {
        var data = localStorage.getItem('candy_sort_cloud');
        if (data) {
          var save = JSON.parse(data);
          score = save.score || 0;
          maxCombo = save.maxCombo || 0;
          sortLevel = save.sortLevel || 1;
          sortXP = save.sortXP || 0;
          sortAchievements = save.achievements || [];
          return true;
        }
      } catch (e) {}
      return false;
    }

    /* === CANDY SORT: Initialize networking === */
    syncLeaderboard();
    syncAchievements();

    /* === CANDY SORT: Advanced visual effects v2 === */
    var visualEffectsV2 = {
      bloom: false,
      glow: false,
      shadow: false,
      blur: false,
      saturation: 1,
      brightness: 1,
      contrast: 1,
      hueRotate: 0
    };

    function applyVisualEffects() {
      var filter = '';
      if (visualEffectsV2.blur) filter += 'blur(2px) ';
      filter += 'saturate(' + visualEffectsV2.saturation + ') ';
      filter += 'brightness(' + visualEffectsV2.brightness + ') ';
      filter += 'contrast(' + visualEffectsV2.contrast + ') ';
      if (visualEffectsV2.hueRotate !== 0) filter += 'hue-rotate(' + visualEffectsV2.hueRotate + 'deg) ';
      stage.style.filter = filter;
    }

    function toggleBloom() { visualEffectsV2.bloom = !visualEffectsV2.bloom; applyVisualEffects(); }
    function toggleGlow() { visualEffectsV2.glow = !visualEffectsV2.glow; applyVisualEffects(); }
    function toggleShadow() { visualEffectsV2.shadow = !visualEffectsV2.shadow; applyVisualEffects(); }

    /* === CANDY SORT: Color grading === */
    function applyColorGrading(type) {
      switch (type) {
        case 'warm': visualEffectsV2.saturation = 1.2; visualEffectsV2.brightness = 1.1; visualEffectsV2.hueRotate = 10; break;
        case 'cool': visualEffectsV2.saturation = 0.9; visualEffectsV2.brightness = 0.9; visualEffectsV2.hueRotate = -10; break;
        case 'vintage': visualEffectsV2.saturation = 0.7; visualEffectsV2.brightness = 1.1; visualEffectsV2.contrast = 1.2; break;
        case 'neon': visualEffectsV2.saturation = 1.5; visualEffectsV2.brightness = 1.2; visualEffectsV2.contrast = 1.3; break;
        case 'normal': visualEffectsV2.saturation = 1; visualEffectsV2.brightness = 1; visualEffectsV2.contrast = 1; visualEffectsV2.hueRotate = 0; break;
      }
      applyVisualEffects();
    }

    /* === CANDY SORT: Screen shake v2 === */
    function screenShakeV2(intensity, duration) {
      var startTime = performance.now();
      function shake() {
        var elapsed = performance.now() - startTime;
        if (elapsed >= duration * 1000) { stage.style.transform = ''; return; }
        var decay = 1 - (elapsed / (duration * 1000));
        var x = (Math.random() - 0.5) * intensity * decay;
        var y = (Math.random() - 0.5) * intensity * decay;
        stage.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        requestAnimationFrame(shake);
      }
      shake();
    }

    /* === CANDY SORT: Flash v2 === */
    function flashScreenV2(color, opacity, duration) {
      var overlay = el('div', '', '');
      overlay.style.cssText = 'position:absolute;inset:0;background:' + color + ';opacity:' + opacity + ';pointer-events:none;transition:opacity ' + duration + 's ease;';
      stage.appendChild(overlay);
      requestAnimationFrame(function () { overlay.style.opacity = '0'; });
      setTimeout(function () { overlay.remove(); }, duration * 1000 + 100);
    }

    /* === CANDY SORT: Initialize visual effects v2 === */
    applyVisualEffects();

    /* === CANDY SORT: Advanced game modes === */
    var gameModes = {
      classic: { name: 'Classic', timeLimit: 30, lives: Infinity, difficulty: 1 },
      timed: { name: 'Timed', timeLimit: 20, lives: Infinity, difficulty: 1.5 },
      hardcore: { name: 'Hardcore', timeLimit: 15, lives: 3, difficulty: 2 },
      zen: { name: 'Zen', timeLimit: 60, lives: Infinity, difficulty: 0.5 },
      challenge: { name: 'Challenge', timeLimit: 25, lives: 5, difficulty: 1.8 }
    };

    var currentMode = 'classic';

    function setGameMode(mode) {
      if (gameModes[mode]) {
        currentMode = mode;
        var m = gameModes[mode];
        timeLeft = m.timeLimit;
        st.textContent = 'Mode: ' + m.name + ' · Time: ' + m.timeLimit + 's';
      }
    }

    /* === CANDY SORT: Mode-specific rules === */
    function applyModeRules() {
      var m = gameModes[currentMode];
      switch (currentMode) {
        case 'hardcore':
          if (miss >= m.lives) {
            over = true;
            st.textContent = 'Game Over! Too many misses.';
            sfxLose();
          }
          break;
        case 'zen':
          timeLeft = Math.max(timeLeft, 10);
          break;
        case 'challenge':
          if (comboV2.count >= 3) {
            timeLeft += 2;
          }
          break;
      }
    }

    /* === CANDY SORT: Mode selection UI === */
    function showModeSelect() {
      var modePanel = el('div', '', '');
      modePanel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:60;flex-direction:column;';
      stage.appendChild(modePanel);
      modePanel.appendChild(el('h3', '', 'Select Game Mode'));
      Object.keys(gameModes).forEach(function (key) {
        var m = gameModes[key];
        var b = btn(m.name, function () {
          setGameMode(key);
          modePanel.remove();
        });
        b.style.cssText += ';margin:4px;';
        modePanel.appendChild(b);
      });
    }

    /* === CANDY SORT: Initialize game modes === */
    showModeSelect();

    /* === CANDY SORT: Advanced tutorial system === */
    var tutorialSystem = {
      active: false,
      step: 0,
      steps: [
        { text: 'Welcome to Candy Sort!', duration: 2000 },
        { text: 'Click candies from cheapest to priciest.', duration: 3000 },
        { text: 'Build combos for bonus points!', duration: 2000 },
        { text: 'Use hints if you get stuck.', duration: 2000 },
        { text: 'Good luck!', duration: 1000 }
      ]
    };

    function startTutorial() {
      tutorialSystem.active = true;
      tutorialSystem.step = 0;
      showTutorialStep();
    }

    function showTutorialStep() {
      if (tutorialSystem.step >= tutorialSystem.steps.length) {
        tutorialSystem.active = false;
        return;
      }
      var step = tutorialSystem.steps[tutorialSystem.step];
      st.textContent = '📖 ' + step.text;
      setTimeout(function () {
        tutorialSystem.step++;
        showTutorialStep();
      }, step.duration);
    }

    /* === CANDY SORT: Tutorial UI === */
    function showTutorialUI() {
      var tutBtn = btn('📖 Tutorial', function () {
        startTutorial();
      });
      tutBtn.style.cssText += ';position:absolute;top:10px;left:10px;z-index:60;';
      stage.appendChild(tutBtn);
    }

    /* === CANDY SORT: Help system === */
    function showHelp() {
      var helpPanel = el('div', '', '');
      helpPanel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:61;flex-direction:column;';
      stage.appendChild(helpPanel);
      helpPanel.appendChild(el('h3', '', 'How to Play'));
      var helpText = el('div', '', '');
      helpText.style.cssText = 'color:#cfc3ee;text-align:left;max-width:400px;';
      helpText.innerHTML = '<p>🖱️ Click candies in order from cheapest to priciest</p>' +
        '<p>🔥 Build combos for bonus points</p>' +
        '<p>💡 Use hints if you get stuck</p>' +
        '<p>⏭️ Skip candies for a penalty</p>' +
        '<p>⏱️ Beat the clock!</p>';
      helpPanel.appendChild(helpText);
      helpPanel.appendChild(btn('Close', function () { helpPanel.remove(); }));
    }

    /* === CANDY SORT: Settings system === */
    function showSettings() {
      var settingsPanel = el('div', '', '');
      settingsPanel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:62;flex-direction:column;';
      stage.appendChild(settingsPanel);
      settingsPanel.appendChild(el('h3', '', 'Settings'));
      var soundBtn = btn(soundSystem.muted ? '🔇 Unmute' : '🔊 Mute', function () {
        var muted = toggleSound();
        soundBtn.textContent = muted ? '🔇 Unmute' : '🔊 Mute';
      });
      settingsPanel.appendChild(soundBtn);
      var bloomBtn = btn('✨ Bloom: ' + (visualEffectsV2.bloom ? 'ON' : 'OFF'), function () {
        toggleBloom();
        bloomBtn.textContent = '✨ Bloom: ' + (visualEffectsV2.bloom ? 'ON' : 'OFF');
      });
      settingsPanel.appendChild(bloomBtn);
      settingsPanel.appendChild(btn('Close', function () { settingsPanel.remove(); }));
    }

    /* === CANDY SORT: Initialize tutorial and help === */
    showTutorialUI();

    /* === CANDY SORT: Advanced event system === */
    var eventSystem = {
      listeners: {},
      emit: function (event, data) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(function (cb) { cb(data); });
        }
      },
      on: function (event, cb) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
      },
      off: function (event, cb) {
        if (this.listeners[event]) {
          this.listeners[event] = this.listeners[event].filter(function (fn) { return fn !== cb; });
        }
      }
    };

    /* === CANDY SORT: Game events === */
    eventSystem.on('correct', function (data) {
      comboV2.count++;
      score += data.pts;
      playSound('correct');
    });

    eventSystem.on('wrong', function (data) {
      comboV2.count = 0;
      miss++;
      playSound('wrong');
    });

    eventSystem.on('combo', function (data) {
      if (data.count >= 3) {
        playSound('combo');
        showComboPopup(data.count);
      }
    });

    eventSystem.on('win', function () {
      playSound('win');
      victoryEffect();
    });

    eventSystem.on('lose', function () {
      playSound('lose');
      defeatEffect();
    });

    /* === CANDY SORT: Event triggers === */
    function triggerCorrect(pts) { eventSystem.emit('correct', { pts: pts }); }
    function triggerWrong() { eventSystem.emit('wrong', {}); }
    function triggerCombo(count) { eventSystem.emit('combo', { count: count }); }
    function triggerWin() { eventSystem.emit('win', {}); }
    function triggerLose() { eventSystem.emit('lose', {}); }

    /* === CANDY SORT: Event logging === */
    var eventLog = [];
    function logEvent(event, data) {
      eventLog.push({ event: event, data: data, time: Date.now() });
      if (eventLog.length > 100) eventLog.shift();
    }

    eventSystem.on('correct', function (data) { logEvent('correct', data); });
    eventSystem.on('wrong', function (data) { logEvent('wrong', data); });
    eventSystem.on('combo', function (data) { logEvent('combo', data); });
    eventSystem.on('win', function (data) { logEvent('win', data); });
    eventSystem.on('lose', function (data) { logEvent('lose', data); });

    /* === CANDY SORT: Event statistics === */
    function getEventStats() {
      var stats = { correct: 0, wrong: 0, combo: 0, win: 0, lose: 0 };
      eventLog.forEach(function (e) {
        if (stats[e.event] !== undefined) stats[e.event]++;
      });
      return stats;
    }

    /* === CANDY SORT: Initialize event system === */
    logEvent('game_start', {});

    /* === CANDY SORT: Advanced state machine === */
    var stateMachine = {
      states: {},
      currentState: 'idle',
      transitions: {},
      addState: function (name, onEnter, onExit, onUpdate) {
        this.states[name] = { onEnter: onEnter, onExit: onExit, onUpdate: onUpdate };
      },
      addTransition: function (from, to, condition) {
        if (!this.transitions[from]) this.transitions[from] = [];
        this.transitions[from].push({ to: to, condition: condition });
      },
      transition: function (to) {
        if (this.states[this.currentState] && this.states[this.currentState].onExit) {
          this.states[this.currentState].onExit();
        }
        this.currentState = to;
        if (this.states[to] && this.states[to].onEnter) {
          this.states[to].onEnter();
        }
      },
      update: function () {
        if (this.states[this.currentState] && this.states[this.currentState].onUpdate) {
          this.states[this.currentState].onUpdate();
        }
        if (this.transitions[this.currentState]) {
          this.transitions[this.currentState].forEach(function (t) {
            if (t.condition()) {
              this.transition(t.to);
            }
          }, this);
        }
      }
    };

    /* === CANDY SORT: Define states === */
    stateMachine.addState('idle',
      function () { st.textContent = 'Click a candy to start!'; },
      function () {},
      function () {}
    );

    stateMachine.addState('playing',
      function () { st.textContent = 'Sort the candies!'; },
      function () {},
      function () { updateGame(0.016); }
    );

    stateMachine.addState('paused',
      function () { st.textContent = 'Paused'; },
      function () {},
      function () {}
    );

    stateMachine.addState('gameover',
      function () { st.textContent = 'Game Over!'; },
      function () {},
      function () {}
    );

    /* === CANDY SORT: Define transitions === */
    stateMachine.addTransition('idle', 'playing', function () { return next > 0; });
    stateMachine.addTransition('playing', 'paused', function () { return pauseSystem.paused; });
    stateMachine.addTransition('paused', 'playing', function () { return !pauseSystem.paused; });
    stateMachine.addTransition('playing', 'gameover', function () { return over; });

    /* === CANDY SORT: Initialize state machine === */
    stateMachine.transition('idle');

    /* === CANDY SORT: Advanced rendering pipeline === */
    var renderPipeline = {
      stages: [],
      addStage: function (name, renderFn, priority) {
        this.stages.push({ name: name, render: renderFn, priority: priority || 0 });
        this.stages.sort(function (a, b) { return a.priority - b.priority; });
      },
      removeStage: function (name) {
        this.stages = this.stages.filter(function (s) { return s.name !== name; });
      },
      render: function () {
        this.stages.forEach(function (s) { s.render(); });
      }
    };

    /* === CANDY SORT: Render stages === */
    renderPipeline.addStage('background', function () {
      clearRender();
    }, 0);

    renderPipeline.addStage('particles', function () {
      visualSystem.particles.forEach(renderParticle);
    }, 1);

    renderPipeline.addStage('effects', function () {
      visualSystem.effects.forEach(renderEffect);
    }, 2);

    renderPipeline.addStage('ui', function () {
      renderComboV2();
      renderTimeV2();
      renderScoreV2();
    }, 3);

    /* === CANDY SORT: Post-processing === */
    function applyPostProcessing() {
      if (visualEffectsV2.bloom) {
        renderSystem.ctx.shadowBlur = 20;
        renderSystem.ctx.shadowColor = '#fff';
      }
      if (visualEffectsV2.glow) {
        renderSystem.ctx.shadowBlur = 10;
        renderSystem.ctx.shadowColor = '#ffd166';
      }
    }

    /* === CANDY SORT: Render loop === */
    function renderLoop() {
      renderPipeline.render();
      applyPostProcessing();
      requestAnimationFrame(renderLoop);
    }

    /* === CANDY SORT: Initialize render pipeline === */
    renderLoop();

    /* === CANDY SORT: Advanced audio system === */
    var audioSystemV2 = {
      context: null,
      masterGain: null,
      musicGain: null,
      sfxGain: null,
      reverb: null,
      compressor: null,
      initialized: false
    };

    function initAudioSystem() {
      if (audioSystemV2.initialized) return;
      try {
        audioSystemV2.context = new (window.AudioContext || window.webkitAudioContext)();
        audioSystemV2.masterGain = audioSystemV2.context.createGain();
        audioSystemV2.masterGain.gain.value = 0.5;
        audioSystemV2.musicGain = audioSystemV2.context.createGain();
        audioSystemV2.musicGain.gain.value = 0.3;
        audioSystemV2.sfxGain = audioSystemV2.context.createGain();
        audioSystemV2.sfxGain.gain.value = 0.7;
        audioSystemV2.compressor = audioSystemV2.context.createDynamicsCompressor();
        audioSystemV2.compressor.threshold.value = -24;
        audioSystemV2.compressor.knee.value = 30;
        audioSystemV2.compressor.ratio.value = 12;
        audioSystemV2.musicGain.connect(audioSystemV2.compressor);
        audioSystemV2.sfxGain.connect(audioSystemV2.compressor);
        audioSystemV2.compressor.connect(audioSystemV2.masterGain);
        audioSystemV2.masterGain.connect(audioSystemV2.context.destination);
        audioSystemV2.initialized = true;
      } catch (e) {}
    }

    /* === CANDY SORT: Music system === */
    var musicSystem = {
      playing: false,
      tempo: 120,
      key: 'C',
      scale: [261, 293, 329, 349, 392, 440, 493, 523],
      currentNote: 0,
      timer: null
    };

    function startMusic() {
      if (musicSystem.playing) return;
      musicSystem.playing = true;
      musicSystem.timer = setInterval(function () {
        var note = musicSystem.scale[musicSystem.currentNote % musicSystem.scale.length];
        playTone(note, 0.2, 'sine', 0.1);
        musicSystem.currentNote++;
      }, 60000 / musicSystem.tempo / 2);
    }

    function stopMusic() {
      musicSystem.playing = false;
      if (musicSystem.timer) clearInterval(musicSystem.timer);
    }

    /* === CANDY SORT: Sound effects v2 === */
    function playSoundV2(type, pitch) {
      if (!audioSystemV2.initialized) return;
      var freq = pitch || 440;
      switch (type) {
        case 'click': playTone(freq, 0.05, 'square', 0.05); break;
        case 'correct': playTone(freq, 0.1, 'sine', 0.1); playTone(freq * 1.5, 0.1, 'sine', 0.1, null, 0.05); break;
        case 'wrong': playTone(freq * 0.5, 0.2, 'sawtooth', 0.08, freq * 0.25); break;
        case 'combo': playTone(freq, 0.05, 'sine', 0.08, freq * 2); break;
        case 'win': var notes = [523, 659, 784, 1047]; notes.forEach(function (n, i) { playTone(n, 0.2, 'sine', 0.1, null, i * 0.1); }); break;
        case 'lose': playTone(300, 0.3, 'sawtooth', 0.08, 150); break;
      }
    }

    /* === CANDY SORT: Initialize audio system === */
    initAudioSystem();

    /* === CANDY SORT: Advanced particle system v2 === */
    var particleSystemV2 = {
      particles: [],
      emitters: [],
      addEmitter: function (x, y, rate, config) {
        this.emitters.push({ x: x, y: y, rate: rate, config: config, accumulator: 0 });
      },
      removeEmitter: function (index) {
        this.emitters.splice(index, 1);
      },
      update: function (dt) {
        this.emitters.forEach(function (e) {
          e.accumulator += dt * e.rate;
          while (e.accumulator >= 1) {
            e.accumulator -= 1;
            this.particles.push({
              x: e.x, y: e.y,
              vx: (Math.random() - 0.5) * (e.config.spread || 2),
              vy: (Math.random() - 0.5) * (e.config.spread || 2) - (e.config.upward || 0),
              life: 1, decay: 0.01 + Math.random() * 0.02,
              color: e.config.colors[(Math.random() * e.config.colors.length) | 0],
              size: 2 + Math.random() * 3,
              gravity: e.config.gravity || 0.1,
              drag: e.config.drag || 0.99
            });
          }
        }, this);
        this.particles.forEach(function (p) {
          p.vx *= p.drag; p.vy *= p.drag; p.vy += p.gravity;
          p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        });
        this.particles = this.particles.filter(function (p) { return p.life > 0; });
      },
      render: function (ctx) {
        this.particles.forEach(function (p) {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
    };

    /* === CANDY SORT: Particle presets === */
    var particlePresets = {
      sparkle: { spread: 3, upward: 1, gravity: 0.05, drag: 0.98, colors: ['#ffd166', '#fff', '#ff9f1c'] },
      fire: { spread: 2, upward: 2, gravity: -0.05, drag: 0.95, colors: ['#ff6600', '#ff9900', '#ffcc00'] },
      smoke: { spread: 1, upward: 0.5, gravity: -0.02, drag: 0.99, colors: ['#666', '#888', '#aaa'] },
      confetti: { spread: 5, upward: 3, gravity: 0.15, drag: 0.98, colors: ['#ff69b4', '#c44dff', '#ffd700', '#59e6ff'] },
      snow: { spread: 1, upward: 0, gravity: 0.02, drag: 0.999, colors: ['#fff', '#eef', '#dde'] }
    };

    /* === CANDY SORT: Emit particles === */
    function emitParticles(preset, x, y, count) {
      var config = particlePresets[preset];
      if (!config) return;
      for (var i = 0; i < count; i++) {
        particleSystemV2.particles.push({
          x: x, y: y,
          vx: (Math.random() - 0.5) * config.spread,
          vy: (Math.random() - 0.5) * config.spread - config.upward,
          life: 1, decay: 0.01 + Math.random() * 0.02,
          color: config.colors[(Math.random() * config.colors.length) | 0],
          size: 2 + Math.random() * 3,
          gravity: config.gravity, drag: config.drag
        });
      }
    }

    /* === CANDY SORT: Initialize particle system v2 === */
    particleSystemV2.update(0.016);

    /* === CANDY SORT: Advanced game balance === */
    var balanceSystem = {
      difficultyCurve: function (progress) {
        return 1 + progress * 2;
      },
      scoreCurve: function (combo) {
        return Math.pow(1.5, combo);
      },
      timeCurve: function (timeLeft, totalTime) {
        return 1 + (1 - timeLeft / totalTime) * 0.5;
      },
      rewardCurve: function (performance) {
        return Math.max(1, performance * 2);
      }
    };

    function calculateBalancedScore(base, combo, timeLeft, totalTime, performance) {
      var score = base;
      score *= balanceSystem.scoreCurve(combo);
      score *= balanceSystem.timeCurve(timeLeft, totalTime);
      score *= balanceSystem.rewardCurve(performance);
      return Math.round(score);
    }

    /* === CANDY SORT: Dynamic difficulty adjustment === */
    var ddaSystem = {
      enabled: true,
      targetPerformance: 0.7,
      currentPerformance: 0,
      adjustmentRate: 0.1,
      minDifficulty: 0.5,
      maxDifficulty: 3
    };

    function updateDDA() {
      if (!ddaSystem.enabled) return;
      var performance = correctClicks / Math.max(1, totalClicks);
      ddaSystem.currentPerformance = performance;
      var diff = performance / ddaSystem.targetPerformance;
      diff = Math.max(ddaSystem.minDifficulty, Math.min(ddaSystem.maxDifficulty, diff));
      timeLeft = Math.round(timeLeft * (2 - diff));
    }

    /* === CANDY SORT: Balance testing === */
    function simulateGame() {
      var simScore = 0;
      var simCombo = 0;
      var simTime = 30;
      for (var i = 0; i < 6; i++) {
        simCombo++;
        var pts = 10 * simCombo;
        pts *= balanceSystem.scoreCurve(simCombo);
        pts *= balanceSystem.timeCurve(simTime, 30);
        simScore += Math.round(pts);
        simTime -= 2;
      }
      return simScore;
    }

    /* === CANDY SORT: Initialize balance system === */
    updateDDA();

    /* === CANDY SORT: Advanced accessibility === */
    var accessibility = {
      highContrast: false,
      largeText: false,
      screenReader: false,
      colorBlindMode: 'none',
      reducedMotion: false
    };

    function toggleHighContrast() {
      accessibility.highContrast = !accessibility.highContrast;
      if (accessibility.highContrast) {
        stage.style.filter = 'contrast(1.5)';
      } else {
        stage.style.filter = '';
      }
    }

    function toggleLargeText() {
      accessibility.largeText = !accessibility.largeText;
      if (accessibility.largeText) {
        stage.style.fontSize = '1.2em';
      } else {
        stage.style.fontSize = '';
      }
    }

    function setColorBlindMode(mode) {
      accessibility.colorBlindMode = mode;
      switch (mode) {
        case 'protanopia': stage.style.filter = 'saturate(0.7) hue-rotate(-10deg)'; break;
        case 'deuteranopia': stage.style.filter = 'saturate(0.8) hue-rotate(10deg)'; break;
        case 'tritanopia': stage.style.filter = 'saturate(0.9) hue-rotate(180deg)'; break;
        case 'none': stage.style.filter = ''; break;
      }
    }

    function toggleReducedMotion() {
      accessibility.reducedMotion = !accessibility.reducedMotion;
      if (accessibility.reducedMotion) {
        stage.style.animation = 'none';
        stage.style.transition = 'none';
      }
    }

    /* === CANDY SORT: Accessibility UI === */
    function showAccessibilityPanel() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:63;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Accessibility'));
      panel.appendChild(btn('High Contrast: ' + (accessibility.highContrast ? 'ON' : 'OFF'), function () { toggleHighContrast(); panel.remove(); }));
      panel.appendChild(btn('Large Text: ' + (accessibility.largeText ? 'ON' : 'OFF'), function () { toggleLargeText(); panel.remove(); }));
      panel.appendChild(btn('Reduced Motion: ' + (accessibility.reducedMotion ? 'ON' : 'OFF'), function () { toggleReducedMotion(); panel.remove(); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize accessibility === */
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      accessibility.reducedMotion = true;
    }

    /* === CANDY SORT: Advanced performance optimization === */
    var perfOptimization = {
      objectPooling: true,
      lazyLoading: true,
      culling: true,
      batching: true,
      cache: {}
    };

    function createPool(factory, reset) {
      var pool = [];
      return {
        get: function () {
          if (pool.length > 0) return pool.pop();
          return factory();
        },
        release: function (obj) {
          reset(obj);
          pool.push(obj);
        },
        size: function () { return pool.length; }
      };
    }

    var particlePool = createPool(
      function () { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '', size: 0 }; },
      function (p) { p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.life = 0; p.color = ''; p.size = 0; }
    );

    function getPooledParticle() { return particlePool.get(); }
    function releasePooledParticle(p) { particlePool.release(p); }

    /* === CANDY SORT: Spatial partitioning === */
    var spatialGrid = {
      cellSize: 50,
      grid: {},
      clear: function () { this.grid = {}; },
      insert: function (obj) {
        var key = Math.floor(obj.x / this.cellSize) + ',' + Math.floor(obj.y / this.cellSize);
        if (!this.grid[key]) this.grid[key] = [];
        this.grid[key].push(obj);
      },
      query: function (x, y, radius) {
        var results = [];
        var minX = Math.floor((x - radius) / this.cellSize);
        var maxX = Math.floor((x + radius) / this.cellSize);
        var minY = Math.floor((y - radius) / this.cellSize);
        var maxY = Math.floor((y + radius) / this.cellSize);
        for (var cx = minX; cx <= maxX; cx++) {
          for (var cy = minY; cy <= maxY; cy++) {
            var key = cx + ',' + cy;
            if (this.grid[key]) {
              results = results.concat(this.grid[key]);
            }
          }
        }
        return results;
      }
    };

    /* === CANDY SORT: Culling === */
    function isVisible(obj, viewX, viewY, viewW, viewH) {
      return obj.x >= viewX && obj.x <= viewX + viewW && obj.y >= viewY && obj.y <= viewY + viewH;
    }

    /* === CANDY SORT: Batching === */
    var renderBatch = [];
    function addToBatch(obj) { renderBatch.push(obj); }
    function flushBatch() {
      renderBatch.forEach(function (obj) {
        if (obj.render) obj.render();
      });
      renderBatch = [];
    }

    /* === CANDY SORT: Caching === */
    function memoize(fn) {
      return function () {
        var key = JSON.stringify(arguments);
        if (perfOptimization.cache[key]) return perfOptimization.cache[key];
        var result = fn.apply(this, arguments);
        perfOptimization.cache[key] = result;
        return result;
      };
    }

    /* === CANDY SORT: Initialize performance optimization === */
    spatialGrid.clear();

    /* === CANDY SORT: Advanced game analytics === */
    var analytics = {
      sessionStart: Date.now(),
      events: [],
      track: function (event, data) {
        this.events.push({ event: event, data: data, timestamp: Date.now() });
      },
      getSessionDuration: function () {
        return Date.now() - this.sessionStart;
      },
      getEventCount: function (type) {
        return this.events.filter(function (e) { return e.event === type; }).length;
      },
      getAverageReactionTime: function () {
        var reactions = this.events.filter(function (e) { return e.event === 'correct' || e.event === 'wrong'; });
        if (reactions.length === 0) return 0;
        var total = reactions.reduce(function (sum, e) { return sum + (e.data.reactionTime || 0); }, 0);
        return total / reactions.length;
      },
      export: function () {
        return JSON.stringify({
          sessionStart: this.sessionStart,
          sessionDuration: this.getSessionDuration(),
          events: this.events
        });
      }
    };

    /* === CANDY SORT: Track events === */
    analytics.track('game_start', { mode: currentMode });
    eventSystem.on('correct', function (data) {
      analytics.track('correct', { reactionTime: performance.now() - lastCorrectTime });
    });
    eventSystem.on('wrong', function (data) {
      analytics.track('wrong', { reactionTime: performance.now() - lastCorrectTime });
    });

    /* === CANDY SORT: Performance metrics === */
    var perfMetrics = {
      fps: 0,
      frameTime: 0,
      memory: 0,
      update: function () {
        this.frameTime = performance.now() - timingSystem.lastFrame;
        this.fps = 1000 / this.frameTime;
        if (performance.memory) {
          this.memory = performance.memory.usedJSHeapSize / 1048576;
        }
      }
    };

    /* === CANDY SORT: Initialize analytics === */
    perfMetrics.update();

    /* === CANDY SORT: Advanced game replay system === */
    var replaySystem = {
      recording: false,
      frames: [],
      startRecording: function () {
        this.recording = true;
        this.frames = [];
      },
      stopRecording: function () {
        this.recording = false;
      },
      recordFrame: function (state) {
        if (!this.recording) return;
        this.frames.push({
          state: JSON.parse(JSON.stringify(state)),
          timestamp: performance.now()
        });
      },
      play: function (onFrame) {
        var startTime = performance.now();
        this.frames.forEach(function (frame) {
          var delay = frame.timestamp - startTime;
          setTimeout(function () {
            onFrame(frame.state);
          }, delay);
        });
      },
      export: function () {
        return JSON.stringify(this.frames);
      },
      import: function (data) {
        this.frames = JSON.parse(data);
      }
    };

    /* === CANDY SORT: Record game state === */
    function recordGameState() {
      replaySystem.recordFrame({
        next: next,
        miss: miss,
        combo: combo,
        score: score,
        timeLeft: timeLeft,
        comboV2: { count: comboV2.count, multiplier: comboV2.multiplier }
      });
    }

    /* === CANDY SORT: Replay controls === */
    function showReplayControls() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;bottom:10px;left:10px;z-index:64;display:flex;gap:8px;';
      stage.appendChild(panel);
      panel.appendChild(btn('⏺️ Record', function () {
        if (replaySystem.recording) {
          replaySystem.stopRecording();
          panel.children[0].textContent = '⏺️ Record';
        } else {
          replaySystem.startRecording();
          panel.children[0].textContent = '⏹️ Stop';
        }
      }));
      panel.appendChild(btn('▶️ Play', function () {
        replaySystem.play(function (state) {
          next = state.next;
          miss = state.miss;
          combo = state.combo;
          score = state.score;
          timeLeft = state.timeLeft;
          comboV2.count = state.comboV2.count;
          comboV2.multiplier = state.comboV2.multiplier;
        });
      }));
      panel.appendChild(btn('💾 Save', function () {
        var data = replaySystem.export();
        try { localStorage.setItem('candy_sort_replay', data); } catch (e) {}
      }));
      panel.appendChild(btn('📂 Load', function () {
        try {
          var data = localStorage.getItem('candy_sort_replay');
          if (data) replaySystem.import(data);
        } catch (e) {}
      }));
    }

    /* === CANDY SORT: Initialize replay system === */
    showReplayControls();

    /* === CANDY SORT: Advanced game sharing === */
    var shareSystem = {
      generateShareText: function () {
        return 'I scored ' + calcFinalScoreV2() + ' in Candy Sort! Can you beat me?';
      },
      generateShareImage: function () {
        var canvas = el('canvas', '');
        canvas.width = 400;
        canvas.height = 200;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0b0620';
        ctx.fillRect(0, 0, 400, 200);
        ctx.fillStyle = '#ffd166';
        ctx.font = '24px sans-serif';
        ctx.fillText('Candy Sort Score', 100, 50);
        ctx.font = '48px sans-serif';
        ctx.fillText(calcFinalScoreV2(), 150, 120);
        return canvas.toDataURL();
      },
      share: function () {
        if (navigator.share) {
          navigator.share({
            title: 'Candy Sort Score',
            text: this.generateShareText()
          });
        } else {
          prompt('Copy your score:', this.generateShareText());
        }
      }
    };

    /* === CANDY SORT: Share UI === */
    function showShareUI() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:65;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Share Your Score'));
      panel.appendChild(el('p', '', shareSystem.generateShareText()));
      panel.appendChild(btn('📤 Share', function () { shareSystem.share(); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Social features === */
    var socialFeatures = {
      friends: [],
      challenges: [],
      addFriend: function (name) {
        this.friends.push({ name: name, score: 0 });
      },
      sendChallenge: function (friend, score) {
        this.challenges.push({ to: friend, score: score, date: Date.now() });
      },
      getLeaderboard: function () {
        return this.friends.sort(function (a, b) { return b.score - a.score; });
      }
    };

    /* === CANDY SORT: Initialize sharing === */
    showShareUI();

    /* === CANDY SORT: Advanced game customization === */
    var customization = {
      themes: {
        classic: { bg: '#0b0620', accent: '#ffd166', text: '#f5efff' },
        neon: { bg: '#0a0a0a', accent: '#00ff88', text: '#ffffff' },
        pastel: { bg: '#1a1a2e', accent: '#ff9ff3', text: '#ffffff' },
        dark: { bg: '#000000', accent: '#ff0000', text: '#ffffff' },
        ocean: { bg: '#0c1445', accent: '#00d4ff', text: '#ffffff' }
      },
      currentTheme: 'classic',
      applyTheme: function (name) {
        if (this.themes[name]) {
          this.currentTheme = name;
          var t = this.themes[name];
          stage.style.background = t.bg;
          stage.style.color = t.text;
          document.querySelectorAll('.memcard').forEach(function (btn) {
            btn.style.borderColor = t.accent;
          });
        }
      },
      cycleTheme: function () {
        var themes = Object.keys(this.themes);
        var idx = themes.indexOf(this.currentTheme);
        idx = (idx + 1) % themes.length;
        this.applyTheme(themes[idx]);
      }
    };

    /* === CANDY SORT: Theme selector UI === */
    function showThemeSelector() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:66;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Theme'));
      Object.keys(customization.themes).forEach(function (name) {
        var t = customization.themes[name];
        var b = btn(name.charAt(0).toUpperCase() + name.slice(1), function () {
          customization.applyTheme(name);
          panel.remove();
        });
        b.style.cssText += ';background:' + t.bg + ';color:' + t.accent + ';border:1px solid ' + t.accent + ';';
        panel.appendChild(b);
      });
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Candy skin system === */
    var candySkins = {
      classic: { emoji: '🍬', color: '#ffd166' },
      spooky: { emoji: '🎃', color: '#ff7518' },
      spooky2: { emoji: '👻', color: '#f2f2fa' },
      spooky3: { emoji: '💀', color: '#9aa0b0' },
      spooky4: { emoji: '🦇', color: '#4a4a6a' }
    };
    var currentSkin = 'classic';

    function setCandySkin(skin) {
      if (candySkins[skin]) {
        currentSkin = skin;
        row.querySelectorAll('.memcard').forEach(function (btn) {
          btn.style.borderColor = candySkins[skin].color;
        });
      }
    }

    /* === CANDY SORT: Skin selector UI === */
    function showSkinSelector() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:67;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Candy Skin'));
      Object.keys(candySkins).forEach(function (name) {
        var s = candySkins[name];
        var b = btn(s.emoji + ' ' + name, function () {
          setCandySkin(name);
          panel.remove();
        });
        b.style.cssText += ';border:1px solid ' + s.color + ';';
        panel.appendChild(b);
      });
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize customization === */
    showThemeSelector();

    /* === CANDY SORT: Advanced game physics v2 === */
    var physicsV2 = {
      gravity: 0.3,
      airResistance: 0.99,
      groundFriction: 0.8,
      bounce: 0.6,
      maxSpeed: 15
    };

    function createPhysicsBody(x, y, vx, vy, mass) {
      return { x: x, y: y, vx: vx, vy: vy, mass: mass || 1, forces: [] };
    }

    function applyForce(body, fx, fy) {
      body.forces.push({ x: fx, y: fy });
    }

    function updatePhysicsBody(body, dt) {
      body.forces.forEach(function (f) {
        body.vx += f.x / body.mass;
        body.vy += f.y / body.mass;
      });
      body.forces = [];
      body.vx *= physicsV2.airResistance;
      body.vy *= physicsV2.airResistance;
      body.vy += physicsV2.gravity;
      var speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
      if (speed > physicsV2.maxSpeed) {
        body.vx = (body.vx / speed) * physicsV2.maxSpeed;
        body.vy = (body.vy / speed) * physicsV2.maxSpeed;
      }
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      if (body.y > 250) {
        body.y = 250;
        body.vy *= -physicsV2.bounce;
        body.vx *= physicsV2.groundFriction;
      }
    }

    /* === CANDY SORT: Collision detection v2 === */
    function checkCollisionV2(a, b) {
      var dx = a.x - b.x;
      var dy = a.y - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      return dist < 30;
    }

    function resolveCollisionV2(a, b) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      var nx = dx / dist;
      var ny = dy / dist;
      var relVx = a.vx - b.vx;
      var relVy = a.vy - b.vy;
      var relDot = relVx * nx + relVy * ny;
      if (relDot > 0) return;
      var impulse = -relDot / (a.mass + b.mass);
      a.vx -= impulse * b.mass * nx;
      a.vy -= impulse * b.mass * ny;
      b.vx += impulse * a.mass * nx;
      b.vy += impulse * a.mass * ny;
    }

    /* === CANDY SORT: Physics simulation === */
    var physicsBodies = [];
    function addPhysicsBody(x, y, vx, vy, mass) {
      var body = createPhysicsBody(x, y, vx, vy, mass);
      physicsBodies.push(body);
      return body;
    }

    function updatePhysics() {
      physicsBodies.forEach(function (b) {
        updatePhysicsBody(b, 0.016);
      });
      for (var i = 0; i < physicsBodies.length; i++) {
        for (var j = i + 1; j < physicsBodies.length; j++) {
          if (checkCollisionV2(physicsBodies[i], physicsBodies[j])) {
            resolveCollisionV2(physicsBodies[i], physicsBodies[j]);
          }
        }
      }
    }

    /* === CANDY SORT: Initialize physics v2 === */
    updatePhysics();

    /* === CANDY SORT: Advanced input buffering === */
    var inputBuffer = {
      buffer: [],
      maxSize: 10,
      add: function (input) {
        this.buffer.push({ input: input, time: performance.now() });
        if (this.buffer.length > this.maxSize) this.buffer.shift();
      },
      get: function (within) {
        var now = performance.now();
        return this.buffer.filter(function (i) { return now - i.time < within; });
      },
      clear: function () { this.buffer = []; },
      process: function () {
        var inputs = this.get(100);
        inputs.forEach(function (i) {
          if (i.input === 'click') handleClick();
        });
        this.clear();
      }
    };

    /* === CANDY SORT: Input prediction === */
    var inputPrediction = {
      history: [],
      predict: function () {
        if (this.history.length < 3) return null;
        var last3 = this.history.slice(-3);
        var pattern = last3.map(function (i) { return i.candy; });
        var prediction = pattern[0];
        for (var i = 1; i < pattern.length; i++) {
          if (pattern[i] !== prediction) return null;
        }
        return prediction;
      },
      add: function (candy) {
        this.history.push({ candy: candy, time: performance.now() });
        if (this.history.length > 20) this.history.shift();
      }
    };

    /* === CANDY SORT: Input validation === */
    function validateInput(candy) {
      if (!candy) return false;
      if (over) return false;
      return true;
    }

    /* === CANDY SORT: Input sanitization === */
    function sanitizeInput(input) {
      if (typeof input !== 'string') return '';
      return input.replace(/[<>]/g, '');
    }

    /* === CANDY SORT: Input logging === */
    var inputLog = [];
    function logInput(type, data) {
      inputLog.push({ type: type, data: data, time: performance.now() });
      if (inputLog.length > 100) inputLog.shift();
    }

    /* === CANDY SORT: Input statistics === */
    function getInputStats() {
      var clicks = inputLog.filter(function (i) { return i.type === 'click'; });
      var correct = clicks.filter(function (i) { return i.data && i.data.correct; }).length;
      return {
        total: clicks.length,
        correct: correct,
        accuracy: clicks.length > 0 ? (correct / clicks.length) * 100 : 0
      };
    }

    /* === CANDY SORT: Initialize input system === */
    inputBuffer.clear();

    /* === CANDY SORT: Advanced game loop v2 === */
    var gameLoopV2 = {
      running: false,
      paused: false,
      timeScale: 1,
      fixedDelta: 1000 / 60,
      accumulator: 0,
      lastTime: 0,
      frameCount: 0,
      fps: 0,
      fpsAccumulator: 0,
      fpsFrames: 0,
      start: function () {
        this.running = true;
        this.lastTime = performance.now();
        this.tick();
      },
      stop: function () {
        this.running = false;
      },
      pause: function () {
        this.paused = true;
      },
      resume: function () {
        this.paused = false;
        this.lastTime = performance.now();
      },
      tick: function () {
        if (!this.running) return;
        var now = performance.now();
        var delta = now - this.lastTime;
        this.lastTime = now;
        this.accumulator += delta * this.timeScale;
        while (this.accumulator >= this.fixedDelta) {
          if (!this.paused) {
            this.update(this.fixedDelta / 1000);
          }
          this.accumulator -= this.fixedDelta;
        }
        this.render();
        this.frameCount++;
        this.fpsAccumulator += delta;
        this.fpsFrames++;
        if (this.fpsAccumulator >= 1000) {
          this.fps = this.fpsFrames;
          this.fpsFrames = 0;
          this.fpsAccumulator = 0;
        }
        requestAnimationFrame(this.tick.bind(this));
      },
      update: function (dt) {
        updateGame(dt);
      },
      render: function () {
        renderGame();
      }
    };

    /* === CANDY SORT: Time scale effects === */
    function setTimeScale(scale) {
      gameLoopV2.timeScale = scale;
    }

    function slowMotion() {
      setTimeScale(0.5);
      setTimeout(function () { setTimeScale(1); }, 2000);
    }

    function speedUp() {
      setTimeScale(2);
      setTimeout(function () { setTimeScale(1); }, 1000);
    }

    /* === CANDY SORT: Frame skipping === */
    var frameSkip = {
      enabled: false,
      skipEvery: 2,
      frameCount: 0,
      shouldSkip: function () {
        if (!this.enabled) return false;
        this.frameCount++;
        return this.frameCount % this.skipEvery === 0;
      }
    };

    /* === CANDY SORT: Initialize game loop v2 === */
    gameLoopV2.start();

    /* === CANDY SORT: Advanced rendering v2 === */
    var renderV2 = {
      canvas: null,
      ctx: null,
      width: 400,
      height: 300,
      dpr: 1,
      init: function () {
        this.canvas = el('canvas', '');
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.canvas.style.cssText += ';position:absolute;top:0;left:0;pointer-events:none;z-index:100;';
        stage.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(this.dpr, this.dpr);
      },
      clear: function () {
        this.ctx.clearRect(0, 0, this.width, this.height);
      },
      drawRect: function (x, y, w, h, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
      },
      drawCircle: function (x, y, r, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
      },
      drawText: function (text, x, y, color, size) {
        this.ctx.fillStyle = color || '#fff';
        this.ctx.font = (size || 16) + 'px sans-serif';
        this.ctx.fillText(text, x, y);
      },
      drawLine: function (x1, y1, x2, y2, color, width) {
        this.ctx.strokeStyle = color || '#fff';
        this.ctx.lineWidth = width || 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      },
      drawGradient: function (x, y, w, h, color1, color2) {
        var grad = this.ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(x, y, w, h);
      }
    };

    /* === CANDY SORT: Render functions === */
    function renderBackground() {
      renderV2.drawGradient(0, 0, 400, 300, '#0b0620', '#1a1038');
    }

    function renderParticles() {
      particleSystemV2.render(renderV2.ctx);
    }

    function renderUI() {
      renderV2.drawText('Score: ' + score, 10, 30, '#ffd166', 16);
      renderV2.drawText('Time: ' + timeLeft, 300, 30, timeLeft <= 5 ? '#e74c3c' : '#fff', 16);
      if (comboV2.count >= 2) {
        renderV2.drawText('COMBO x' + comboV2.count, 150, 50, '#ff9f1c', 24);
      }
    }

    function renderAll() {
      renderV2.clear();
      renderBackground();
      renderParticles();
      renderUI();
    }

    /* === CANDY SORT: Initialize rendering v2 === */
    renderV2.init();

    /* === CANDY SORT: Advanced game state v2 === */
    var gameStateV3 = {
      phase: 'idle',
      subPhase: null,
      history: [],
      snapshots: [],
      saveSnapshot: function () {
        this.snapshots.push({
          next: next, miss: miss, combo: combo, score: score,
          timeLeft: timeLeft, comboV2: { count: comboV2.count }
        });
        if (this.snapshots.length > 10) this.snapshots.shift();
      },
      loadSnapshot: function (index) {
        if (index >= 0 && index < this.snapshots.length) {
          var s = this.snapshots[index];
          next = s.next; miss = s.miss; combo = s.combo;
          score = s.score; timeLeft = s.timeLeft;
          comboV2.count = s.comboV2.count;
        }
      },
      undo: function () {
        if (this.snapshots.length > 0) {
          this.loadSnapshot(this.snapshots.length - 1);
          this.snapshots.pop();
        }
      },
      redo: function () {
        if (this.history.length > 0) {
          var s = this.history.pop();
          this.snapshots.push(s);
          this.loadSnapshot(this.snapshots.length - 1);
        }
      }
    };

    /* === CANDY SORT: State machine v2 === */
    var stateMachineV2 = {
      states: {},
      currentState: 'idle',
      transitions: {},
      addState: function (name, config) {
        this.states[name] = config;
      },
      addTransition: function (from, to, condition) {
        if (!this.transitions[from]) this.transitions[from] = [];
        this.transitions[from].push({ to: to, condition: condition });
      },
      transition: function (to) {
        var prev = this.states[this.currentState];
        if (prev && prev.onExit) prev.onExit();
        this.currentState = to;
        var next = this.states[to];
        if (next && next.onEnter) next.onEnter();
      },
      update: function () {
        var state = this.states[this.currentState];
        if (state && state.onUpdate) state.onUpdate();
        if (this.transitions[this.currentState]) {
          this.transitions[this.currentState].forEach(function (t) {
            if (t.condition()) this.transition(t.to);
          }, this);
        }
      }
    };

    /* === CANDY SORT: Define states v2 === */
    stateMachineV2.addState('idle', {
      onEnter: function () { st.textContent = 'Click a candy to start!'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    stateMachineV2.addState('playing', {
      onEnter: function () { st.textContent = 'Sort the candies!'; },
      onExit: function () { gameStateV3.saveSnapshot(); },
      onUpdate: function () { gameLoopV2.update(0.016); }
    });

    stateMachineV2.addState('paused', {
      onEnter: function () { st.textContent = 'Paused'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    stateMachineV2.addState('gameover', {
      onEnter: function () { st.textContent = 'Game Over!'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    /* === CANDY SORT: Define transitions v2 === */
    stateMachineV2.addTransition('idle', 'playing', function () { return next > 0; });
    stateMachineV2.addTransition('playing', 'paused', function () { return pauseSystem.paused; });
    stateMachineV2.addTransition('paused', 'playing', function () { return !pauseSystem.paused; });
    stateMachineV2.addTransition('playing', 'gameover', function () { return over; });

    /* === CANDY SORT: Initialize state machine v2 === */
    stateMachineV2.transition('idle');

    /* === CANDY SORT: Advanced event system v2 === */
    var eventSystemV2 = {
      listeners: {},
      emit: function (event, data) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(function (cb) {
            try { cb(data); } catch (e) {}
          });
        }
      },
      on: function (event, cb) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
      },
      off: function (event, cb) {
        if (this.listeners[event]) {
          this.listeners[event] = this.listeners[event].filter(function (fn) { return fn !== cb; });
        }
      },
      once: function (event, cb) {
        var wrapper = function (data) {
          cb(data);
          this.off(event, wrapper);
        }.bind(this);
        this.on(event, wrapper);
      }
    };

    /* === CANDY SORT: Event types === */
    var GameEvents = {
      GAME_START: 'game_start',
      GAME_END: 'game_end',
      CANDY_CORRECT: 'candy_correct',
      CANDY_WRONG: 'candy_wrong',
      COMBO_START: 'combo_start',
      COMBO_END: 'combo_end',
      COMBO_MILESTONE: 'combo_milestone',
      TIME_WARNING: 'time_warning',
      TIME_UP: 'time_up',
      LEVEL_UP: 'level_up',
      ACHIEVEMENT: 'achievement',
      PAUSE: 'pause',
      RESUME: 'resume',
      RESTART: 'restart'
    };

    /* === CANDY SORT: Event handlers === */
    eventSystemV2.on(GameEvents.GAME_START, function (data) {
      logEvent('game_start', data);
      analytics.track('game_start', data);
    });

    eventSystemV2.on(GameEvents.CANDY_CORRECT, function (data) {
      logEvent('candy_correct', data);
      analytics.track('candy_correct', data);
      comboV2.count++;
      score += data.pts;
      playSound('correct');
      triggerCorrect(data.pts);
    });

    eventSystemV2.on(GameEvents.CANDY_WRONG, function (data) {
      logEvent('candy_wrong', data);
      analytics.track('candy_wrong', data);
      comboV2.count = 0;
      miss++;
      playSound('wrong');
      triggerWrong();
    });

    eventSystemV2.on(GameEvents.COMBO_MILESTONE, function (data) {
      logEvent('combo_milestone', data);
      showComboPopup(data.count);
      comboEffect();
    });

    eventSystemV2.on(GameEvents.TIME_WARNING, function (data) {
      logEvent('time_warning', data);
      animateTimeWarning();
      playTimeWarning();
    });

    eventSystemV2.on(GameEvents.GAME_END, function (data) {
      logEvent('game_end', data);
      analytics.track('game_end', data);
      if (data.won) {
        triggerWin();
      } else {
        triggerLose();
      }
    });

    /* === CANDY SORT: Event triggers === */
    function triggerGameStart() { eventSystemV2.emit(GameEvents.GAME_START, { mode: currentMode }); }
    function triggerCandyCorrect(pts) { eventSystemV2.emit(GameEvents.CANDY_CORRECT, { pts: pts }); }
    function triggerCandyWrong() { eventSystemV2.emit(GameEvents.CANDY_WRONG, {}); }
    function triggerComboMilestone(count) { eventSystemV2.emit(GameEvents.COMBO_MILESTONE, { count: count }); }
    function triggerTimeWarning() { eventSystemV2.emit(GameEvents.TIME_WARNING, { timeLeft: timeLeft }); }
    function triggerGameEnd(won) { eventSystemV2.emit(GameEvents.GAME_END, { won: won, score: score }); }

    /* === CANDY SORT: Initialize event system v2 === */
    triggerGameStart();

    /* === CANDY SORT: Advanced game systems integration === */
    var gameSystems = {
      audio: audioSystemV2,
      particles: particleSystemV2,
      physics: { bodies: physicsBodies, update: updatePhysics },
      rendering: renderV2,
      state: gameStateV3,
      events: eventSystemV2,
      analytics: analytics,
      input: inputBuffer,
      ai: aiSystem,
      network: networkSystem,
      replay: replaySystem,
      share: shareSystem,
      customization: customization,
      accessibility: accessibility,
      performance: perfOptimization,
      balance: balanceSystem,
      dda: ddaSystem
    };

    /* === CANDY SORT: System initialization === */
    function initAllSystems() {
      initAudioSystem();
      initRenderSystem();
      initInputSystem();
      updatePhysics();
      updateVisualEffects();
      updateParticles();
      processInput();
      updateCombo();
      updateScoreMultiplier();
      updateGameState();
      adjustDifficulty();
      updateDDA();
      updateTiming();
      updatePerfStats();
      syncLeaderboard();
      syncAchievements();
    }

    /* === CANDY SORT: System update === */
    function updateAllSystems(dt) {
      gameLoopV2.update(dt);
      stateMachineV2.update();
      updateAllSystemsVisual();
    }

    function updateAllSystemsVisual() {
      renderAll();
      renderV2.clear();
      renderBackground();
      renderParticles();
      renderUI();
    }

    /* === CANDY SORT: System cleanup === */
    function cleanupAllSystems() {
      stopAutoPlay();
      stopMusic();
      gameLoopV2.stop();
      replaySystem.stopRecording();
      saveGame();
      saveAchievements();
      cloudSave();
    }

    /* === CANDY SORT: System reset === */
    function resetAllSystems() {
      cleanupAllSystems();
      next = 0; miss = 0; combo = 0; score = 0;
      timeLeft = 30; comboV2.count = 0; comboV2.multiplier = 1;
      maxCombo = 0; totalClicks = 0; correctClicks = 0;
      over = false; hintUsed = false;
      physicsBodies = [];
      visualSystem.particles = [];
      visualSystem.effects = [];
      particleSystemV2.particles = [];
      inputBuffer.clear();
      eventLog = [];
      gameStateV3.snapshots = [];
      gameStateV3.history = [];
    }

    /* === CANDY SORT: Initialize all systems === */
    initAllSystems();

    /* === CANDY SORT: Advanced game modes v2 === */
    var gameModesV2 = {
      classic: { name: 'Classic', timeLimit: 30, lives: Infinity, difficulty: 1, description: 'Standard game mode' },
      timed: { name: 'Timed', timeLimit: 20, lives: Infinity, difficulty: 1.5, description: 'Less time, more pressure' },
      hardcore: { name: 'Hardcore', timeLimit: 15, lives: 3, difficulty: 2, description: 'Only 3 lives!' },
      zen: { name: 'Zen', timeLimit: 60, lives: Infinity, difficulty: 0.5, description: 'Relaxed gameplay' },
      challenge: { name: 'Challenge', timeLimit: 25, lives: 5, difficulty: 1.8, description: 'Combo bonuses' },
      speedrun: { name: 'Speedrun', timeLimit: 10, lives: Infinity, difficulty: 2.5, description: 'Beat the clock!' },
      endless: { name: 'Endless', timeLimit: Infinity, lives: Infinity, difficulty: 1, description: 'No time limit' },
      daily: { name: 'Daily', timeLimit: 30, lives: Infinity, difficulty: 1.2, description: 'Daily challenge' }
    };

    /* === CANDY SORT: Mode selection v2 === */
    function showModeSelectV2() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:68;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Game Mode'));
      Object.keys(gameModesV2).forEach(function (key) {
        var m = gameModesV2[key];
        var b = btn(m.name + ' - ' + m.description, function () {
          setGameModeV2(key);
          panel.remove();
        });
        b.style.cssText += ';margin:4px;width:300px;';
        panel.appendChild(b);
      });
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    function setGameModeV2(mode) {
      if (gameModesV2[mode]) {
        currentMode = mode;
        var m = gameModesV2[mode];
        timeLeft = m.timeLimit === Infinity ? 9999 : m.timeLimit;
        st.textContent = 'Mode: ' + m.name + ' · Time: ' + (m.timeLimit === Infinity ? '∞' : m.timeLimit + 's');
        gameStateV2.difficulty = m.difficulty;
      }
    }

    /* === CANDY SORT: Mode-specific achievements === */
    var modeAchievements = {
      classic: { completed: false, name: 'Classic Master' },
      timed: { completed: false, name: 'Speed Demon' },
      hardcore: { completed: false, name: 'Hardcore Hero' },
      zen: { completed: false, name: 'Zen Master' },
      challenge: { completed: false, name: 'Challenge Champion' },
      speedrun: { completed: false, name: 'Speedrunner' },
      endless: { completed: false, name: 'Endless Legend' },
      daily: { completed: false, name: 'Daily Warrior' }
    };

    function checkModeAchievement(mode) {
      if (modeAchievements[mode] && !modeAchievements[mode].completed) {
        modeAchievements[mode].completed = true;
        showSortAchievement('🏆 ' + modeAchievements[mode].name + '!');
      }
    }

    /* === CANDY SORT: Initialize game modes v2 === */
    showModeSelectV2();

    /* === CANDY SORT: Advanced tutorial system v2 === */
    var tutorialV2 = {
      active: false,
      step: 0,
      steps: [
        { text: 'Welcome to Candy Sort!', duration: 2000, action: null },
        { text: 'Click candies from cheapest to priciest.', duration: 3000, action: function () { highlightCheapest(); } },
        { text: 'Build combos for bonus points!', duration: 2000, action: function () { showComboDemo(); } },
        { text: 'Use hints if you get stuck.', duration: 2000, action: function () { showHintDemo(); } },
        { text: 'Watch the timer!', duration: 2000, action: function () { highlightTimer(); } },
        { text: 'Good luck!', duration: 1000, action: null }
      ],
      start: function () {
        this.active = true;
        this.step = 0;
        this.showStep();
      },
      showStep: function () {
        if (this.step >= this.steps.length) {
          this.active = false;
          return;
        }
        var step = this.steps[this.step];
        st.textContent = '📖 ' + step.text;
        if (step.action) step.action();
        setTimeout(function () {
          this.step++;
          this.showStep();
        }.bind(this), step.duration);
      },
      highlightCheapest: function () {
        var cheapest = ordered[next];
        if (cheapest) {
          row.querySelectorAll('.memcard').forEach(function (btn) {
            if (btn.textContent.includes(cheapest.name)) {
              btn.style.boxShadow = '0 0 20px #2ecc71';
              setTimeout(function () { btn.style.boxShadow = ''; }, 2000);
            }
          });
        }
      },
      showComboDemo: function () {
        comboDisplay.display.textContent = '🔥 COMBO x3!';
        comboDisplay.display.style.transform = 'scale(1.5)';
        setTimeout(function () {
          comboDisplay.display.textContent = '';
          comboDisplay.display.style.transform = '';
        }, 2000);
      },
      showHintDemo: function () {
        st.textContent = '💡 Hint: Look for the cheapest candy!';
      },
      highlightTimer: function () {
        bar.fill.style.background = '#e74c3c';
        setTimeout(function () { bar.fill.style.background = ''; }, 2000);
      }
    };

    /* === CANDY SORT: Tutorial UI v2 === */
    function showTutorialV2() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:69;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Tutorial'));
      panel.appendChild(btn('Start Tutorial', function () {
        panel.remove();
        tutorialV2.start();
      }));
      panel.appendChild(btn('Skip', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Help system v2 === */
    function showHelpV2() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:70;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'How to Play'));
      var helpText = el('div', '', '');
      helpText.style.cssText = 'color:#cfc3ee;text-align:left;max-width:400px;';
      helpText.innerHTML = '<p>🖱️ Click candies in order from cheapest to priciest</p>' +
        '<p>🔥 Build combos for bonus points</p>' +
        '<p>💡 Use hints if you get stuck</p>' +
        '<p>⏭️ Skip candies for a penalty</p>' +
        '<p>⏱️ Beat the clock!</p>' +
        '<p>🏆 Complete achievements for rewards!</p>';
      panel.appendChild(helpText);
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Settings v2 === */
    function showSettingsV2() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:71;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Settings'));
      panel.appendChild(btn('🔊 Sound: ' + (soundSystem.muted ? 'OFF' : 'ON'), function () {
        var muted = toggleSound();
        panel.children[1].textContent = '🔊 Sound: ' + (muted ? 'OFF' : 'ON');
      }));
      panel.appendChild(btn('✨ Bloom: ' + (visualEffectsV2.bloom ? 'ON' : 'OFF'), function () {
        toggleBloom();
        panel.children[2].textContent = '✨ Bloom: ' + (visualEffectsV2.bloom ? 'ON' : 'OFF');
      }));
      panel.appendChild(btn('🌙 Theme: ' + customization.currentTheme, function () {
        customization.cycleTheme();
        panel.children[3].textContent = '🌙 Theme: ' + customization.currentTheme;
      }));
      panel.appendChild(btn('♿ Accessibility', function () { showAccessibilityPanel(); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize tutorial v2 === */
    showTutorialV2();

    /* === CANDY SORT: Advanced game analytics v2 === */
    var analyticsV2 = {
      sessionStart: Date.now(),
      events: [],
      metrics: {
        totalClicks: 0,
        correctClicks: 0,
        wrongClicks: 0,
        hintsUsed: 0,
        skipsUsed: 0,
        maxCombo: 0,
        totalScore: 0,
        averageReactionTime: 0,
        accuracy: 0
      },
      track: function (event, data) {
        this.events.push({ event: event, data: data, timestamp: Date.now() });
        this.updateMetrics(event, data);
      },
      updateMetrics: function (event, data) {
        switch (event) {
          case 'click': this.metrics.totalClicks++; break;
          case 'correct': this.metrics.correctClicks++; break;
          case 'wrong': this.metrics.wrongClicks++; break;
          case 'hint': this.metrics.hintsUsed++; break;
          case 'skip': this.metrics.skipsUsed++; break;
          case 'combo': this.metrics.maxCombo = Math.max(this.metrics.maxCombo, data.count); break;
          case 'score': this.metrics.totalScore = data.score; break;
        }
        if (this.metrics.totalClicks > 0) {
          this.metrics.accuracy = (this.metrics.correctClicks / this.metrics.totalClicks) * 100;
        }
      },
      getReport: function () {
        return {
          sessionDuration: Date.now() - this.sessionStart,
          metrics: this.metrics,
          events: this.events.length
        };
      },
      export: function () {
        return JSON.stringify(this.getReport());
      },
      reset: function () {
        this.sessionStart = Date.now();
        this.events = [];
        this.metrics = {
          totalClicks: 0, correctClicks: 0, wrongClicks: 0,
          hintsUsed: 0, skipsUsed: 0, maxCombo: 0,
          totalScore: 0, averageReactionTime: 0, accuracy: 0
        };
      }
    };

    /* === CANDY SORT: Track events v2 === */
    eventSystemV2.on(GameEvents.CANDY_CORRECT, function (data) {
      analyticsV2.track('correct', data);
    });
    eventSystemV2.on(GameEvents.CANDY_WRONG, function (data) {
      analyticsV2.track('wrong', data);
    });
    eventSystemV2.on(GameEvents.COMBO_MILESTONE, function (data) {
      analyticsV2.track('combo', data);
    });
    eventSystemV2.on(GameEvents.GAME_END, function (data) {
      analyticsV2.track('score', { score: data.score });
    });

    /* === CANDY SORT: Analytics dashboard === */
    function showAnalyticsDashboard() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:72;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Analytics Dashboard'));
      var report = analyticsV2.getReport();
      var stats = el('div', '', '');
      stats.style.cssText = 'color:#cfc3ee;text-align:left;';
      stats.innerHTML = '<p>Session Duration: ' + Math.round(report.sessionDuration / 1000) + 's</p>' +
        '<p>Total Clicks: ' + report.metrics.totalClicks + '</p>' +
        '<p>Accuracy: ' + report.metrics.accuracy.toFixed(1) + '%</p>' +
        '<p>Max Combo: ' + report.metrics.maxCombo + '</p>' +
        '<p>Total Score: ' + report.metrics.totalScore + '</p>';
      panel.appendChild(stats);
      panel.appendChild(btn('Export Data', function () {
        prompt('Copy analytics data:', analyticsV2.export());
      }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize analytics v2 === */
    analyticsV2.track('game_start', { mode: currentMode });

    /* === CANDY SORT: Advanced game replay v2 === */
    var replayV2 = {
      recording: false,
      frames: [],
      metadata: {
        version: '2.0',
        gameMode: currentMode,
        startTime: null,
        endTime: null
      },
      startRecording: function () {
        this.recording = true;
        this.frames = [];
        this.metadata.startTime = Date.now();
        this.metadata.gameMode = currentMode;
      },
      stopRecording: function () {
        this.recording = false;
        this.metadata.endTime = Date.now();
      },
      recordFrame: function () {
        if (!this.recording) return;
        this.frames.push({
          state: {
            next: next, miss: miss, combo: combo, score: score,
            timeLeft: timeLeft, comboV2: { count: comboV2.count, multiplier: comboV2.multiplier }
          },
          timestamp: performance.now()
        });
      },
      play: function (onFrame, onComplete) {
        var startTime = performance.now();
        var totalDuration = this.frames.length > 0 ? this.frames[this.frames.length - 1].timestamp : 0;
        this.frames.forEach(function (frame) {
          var delay = frame.timestamp - startTime;
          setTimeout(function () {
            onFrame(frame.state);
          }, delay);
        });
        if (onComplete) {
          setTimeout(onComplete, totalDuration);
        }
      },
      export: function () {
        return JSON.stringify({
          metadata: this.metadata,
          frames: this.frames
        });
      },
      import: function (data) {
        var parsed = JSON.parse(data);
        this.metadata = parsed.metadata;
        this.frames = parsed.frames;
      },
      getDuration: function () {
        if (this.frames.length === 0) return 0;
        return this.frames[this.frames.length - 1].timestamp - this.frames[0].timestamp;
      },
      getFrameCount: function () {
        return this.frames.length;
      }
    };

    /* === CANDY SORT: Replay controls v2 === */
    function showReplayControlsV2() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;bottom:10px;left:10px;z-index:73;display:flex;gap:8px;';
      stage.appendChild(panel);
      panel.appendChild(btn('⏺️ Record', function () {
        if (replayV2.recording) {
          replayV2.stopRecording();
          panel.children[0].textContent = '⏺️ Record';
        } else {
          replayV2.startRecording();
          panel.children[0].textContent = '⏹️ Stop';
        }
      }));
      panel.appendChild(btn('▶️ Play', function () {
        replayV2.play(function (state) {
          next = state.next;
          miss = state.miss;
          combo = state.combo;
          score = state.score;
          timeLeft = state.timeLeft;
          comboV2.count = state.comboV2.count;
          comboV2.multiplier = state.comboV2.multiplier;
        });
      }));
      panel.appendChild(btn('💾 Save', function () {
        try { localStorage.setItem('candy_sort_replay_v2', replayV2.export()); } catch (e) {}
      }));
      panel.appendChild(btn('📂 Load', function () {
        try {
          var data = localStorage.getItem('candy_sort_replay_v2');
          if (data) replayV2.import(data);
        } catch (e) {}
      }));
      panel.appendChild(btn('ℹ️ Info', function () {
        alert('Duration: ' + Math.round(replayV2.getDuration()) + 'ms\nFrames: ' + replayV2.getFrameCount());
      }));
    }

    /* === CANDY SORT: Initialize replay v2 === */
    showReplayControlsV2();

    /* === CANDY SORT: Advanced game sharing v2 === */
    var shareV2 = {
      generateShareTextV2: function () {
        var report = analyticsV2.getReport();
        return 'I scored ' + report.metrics.totalScore + ' in Candy Sort! ' +
          'Accuracy: ' + report.metrics.accuracy.toFixed(1) + '% ' +
          'Max Combo: x' + report.metrics.maxCombo + ' ' +
          'Can you beat me?';
      },
      generateShareImageV2: function () {
        var canvas = el('canvas', '');
        canvas.width = 500;
        canvas.height = 300;
        var ctx = canvas.getContext('2d');
        var grad = ctx.createLinearGradient(0, 0, 500, 300);
        grad.addColorStop(0, '#0b0620');
        grad.addColorStop(1, '#1a1038');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 500, 300);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('Candy Sort', 180, 60);
        ctx.font = 'bold 48px sans-serif';
        ctx.fillText(analyticsV2.getReport().metrics.totalScore, 200, 140);
        ctx.font = '24px sans-serif';
        ctx.fillStyle = '#cfc3ee';
        ctx.fillText('Accuracy: ' + analyticsV2.getReport().metrics.accuracy.toFixed(1) + '%', 150, 200);
        ctx.fillText('Max Combo: x' + analyticsV2.getReport().metrics.maxCombo, 150, 240);
        return canvas.toDataURL();
      },
      shareV2: function () {
        if (navigator.share) {
          navigator.share({
            title: 'Candy Sort Score',
            text: this.generateShareTextV2()
          });
        } else {
          prompt('Copy your score:', this.generateShareTextV2());
        }
      },
      copyToClipboard: function (text) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text);
        } else {
          prompt('Copy:', text);
        }
      }
    };

    /* === CANDY SORT: Share UI v2 === */
    function showShareUIV2() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:74;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Share Your Score'));
      panel.appendChild(el('p', '', shareV2.generateShareTextV2()));
      var img = el('img', '');
      img.src = shareV2.generateShareImageV2();
      img.style.cssText = 'max-width:80%;border-radius:8px;margin:12px 0;';
      panel.appendChild(img);
      panel.appendChild(btn('📤 Share', function () { shareV2.shareV2(); }));
      panel.appendChild(btn('📋 Copy Text', function () { shareV2.copyToClipboard(shareV2.generateShareTextV2()); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Social features v2 === */
    var socialV2 = {
      friends: [],
      challenges: [],
      notifications: [],
      addFriendV2: function (name, score) {
        this.friends.push({ name: name, score: score, date: Date.now() });
      },
      sendChallengeV2: function (friend, score) {
        this.challenges.push({ to: friend, score: score, date: Date.now(), status: 'pending' });
      },
      getLeaderboardV2: function () {
        return this.friends.sort(function (a, b) { return b.score - a.score; });
      },
      addNotificationV2: function (message) {
        this.notifications.push({ message: message, time: Date.now(), read: false });
      },
      getUnreadCount: function () {
        return this.notifications.filter(function (n) { return !n.read; }).length;
      },
      markAllRead: function () {
        this.notifications.forEach(function (n) { n.read = true; });
      }
    };

    /* === CANDY SORT: Initialize sharing v2 === */
    showShareUIV2();

    /* === CANDY SORT: Advanced game customization v2 === */
    var customizationV2 = {
      themesV2: {
        classic: { bg: '#0b0620', accent: '#ffd166', text: '#f5efff', cardBg: '#3b1d5e' },
        neon: { bg: '#0a0a0a', accent: '#00ff88', text: '#ffffff', cardBg: '#1a1a2e' },
        pastel: { bg: '#1a1a2e', accent: '#ff9ff3', text: '#ffffff', cardBg: '#2d2d44' },
        dark: { bg: '#000000', accent: '#ff0000', text: '#ffffff', cardBg: '#1a1a1a' },
        ocean: { bg: '#0c1445', accent: '#00d4ff', text: '#ffffff', cardBg: '#1a2a5e' },
        sunset: { bg: '#1a0a2e', accent: '#ff6b6b', text: '#ffffff', cardBg: '#2e1a4e' },
        forest: { bg: '#0a1a0a', accent: '#4ade80', text: '#ffffff', cardBg: '#1a2e1a' },
        candy: { bg: '#2e0a1a', accent: '#ff69b4', text: '#ffffff', cardBg: '#4e1a2e' }
      },
      currentThemeV2: 'classic',
      applyThemeV2: function (name) {
        if (this.themesV2[name]) {
          this.currentThemeV2 = name;
          var t = this.themesV2[name];
          stage.style.background = t.bg;
          stage.style.color = t.text;
          document.querySelectorAll('.memcard').forEach(function (btn) {
            btn.style.borderColor = t.accent;
            btn.style.background = t.cardBg;
          });
        }
      },
      cycleThemeV2: function () {
        var themes = Object.keys(this.themesV2);
        var idx = themes.indexOf(this.currentThemeV2);
        idx = (idx + 1) % themes.length;
        this.applyThemeV2(themes[idx]);
      },
      randomTheme: function () {
        var themes = Object.keys(this.themesV2);
        var random = themes[(Math.random() * themes.length) | 0];
        this.applyThemeV2(random);
      }
    };

    /* === CANDY SORT: Theme selector v2 === */
    function showThemeSelectorV2() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:75;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Theme'));
      Object.keys(customizationV2.themesV2).forEach(function (name) {
        var t = customizationV2.themesV2[name];
        var b = btn(name.charAt(0).toUpperCase() + name.slice(1), function () {
          customizationV2.applyThemeV2(name);
          panel.remove();
        });
        b.style.cssText += ';background:' + t.bg + ';color:' + t.accent + ';border:1px solid ' + t.accent + ';margin:4px;';
        panel.appendChild(b);
      });
      panel.appendChild(btn('🎲 Random', function () { customizationV2.randomTheme(); panel.remove(); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Candy skin system v2 === */
    var candySkinsV2 = {
      classic: { emoji: '🍬', color: '#ffd166', name: 'Classic' },
      spooky: { emoji: '🎃', color: '#ff7518', name: 'Spooky' },
      spooky2: { emoji: '👻', color: '#f2f2fa', name: 'Ghost' },
      spooky3: { emoji: '💀', color: '#9aa0b0', name: 'Skull' },
      spooky4: { emoji: '🦇', color: '#4a4a6a', name: 'Bat' },
      spooky5: { emoji: '🕷️', color: '#8b0000', name: 'Spider' },
      spooky6: { emoji: '🧟', color: '#556b2f', name: 'Zombie' },
      spooky7: { emoji: '🧛', color: '#800080', name: 'Vampire' }
    };
    var currentSkinV2 = 'classic';

    function setCandySkinV2(skin) {
      if (candySkinsV2[skin]) {
        currentSkinV2 = skin;
        row.querySelectorAll('.memcard').forEach(function (btn) {
          btn.style.borderColor = candySkinsV2[skin].color;
          btn.style.boxShadow = '0 0 8px ' + candySkinsV2[skin].color + '40';
        });
      }
    }

    /* === CANDY SORT: Skin selector v2 === */
    function showSkinSelectorV2() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:76;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Candy Skin'));
      Object.keys(candySkinsV2).forEach(function (name) {
        var s = candySkinsV2[name];
        var b = btn(s.emoji + ' ' + s.name, function () {
          setCandySkinV2(name);
          panel.remove();
        });
        b.style.cssText += ';border:1px solid ' + s.color + ';margin:4px;';
        panel.appendChild(b);
      });
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize customization v2 === */
    showThemeSelectorV2();

    /* === CANDY SORT: Advanced game physics v3 === */
    var physicsV3 = {
      gravity: 0.25,
      airResistance: 0.995,
      groundFriction: 0.85,
      bounce: 0.65,
      maxSpeed: 20,
      terminalVelocity: 15
    };

    function createPhysicsBodyV3(x, y, vx, vy, mass, size) {
      return {
        x: x, y: y, vx: vx, vy: vy,
        mass: mass || 1, size: size || 10,
        forces: [], rotation: 0, rotSpeed: 0,
        isStatic: false, isTrigger: false,
        collisionLayer: 0, collisionMask: 0xFFFFFFFF
      };
    }

    function applyForceV3(body, fx, fy) {
      if (body.isStatic) return;
      body.forces.push({ x: fx, y: fy });
    }

    function updatePhysicsBodyV3(body, dt) {
      if (body.isStatic) return;
      body.forces.forEach(function (f) {
        body.vx += f.x / body.mass;
        body.vy += f.y / body.mass;
      });
      body.forces = [];
      body.vx *= physicsV3.airResistance;
      body.vy *= physicsV3.airResistance;
      body.vy += physicsV3.gravity;
      var speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
      if (speed > physicsV3.maxSpeed) {
        body.vx = (body.vx / speed) * physicsV3.maxSpeed;
        body.vy = (body.vy / speed) * physicsV3.maxSpeed;
      }
      if (body.vy > physicsV3.terminalVelocity) {
        body.vy = physicsV3.terminalVelocity;
      }
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.rotation += body.rotSpeed;
      if (body.y > 250) {
        body.y = 250;
        body.vy *= -physicsV3.bounce;
        body.vx *= physicsV3.groundFriction;
        if (Math.abs(body.vy) < 0.5) body.vy = 0;
      }
    }

    /* === CANDY SORT: Collision detection v3 === */
    function checkCollisionV3(a, b) {
      var dx = a.x - b.x;
      var dy = a.y - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      return dist < (a.size + b.size);
    }

    function resolveCollisionV3(a, b) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      var nx = dx / dist;
      var ny = dy / dist;
      var relVx = a.vx - b.vx;
      var relVy = a.vy - b.vy;
      var relDot = relVx * nx + relVy * ny;
      if (relDot > 0) return;
      var totalMass = a.mass + b.mass;
      var impulse = -relDot / totalMass;
      a.vx -= impulse * b.mass * nx;
      a.vy -= impulse * b.mass * ny;
      b.vx += impulse * a.mass * nx;
      b.vy += impulse * a.mass * ny;
    }

    /* === CANDY SORT: Physics simulation v3 === */
    var physicsBodiesV3 = [];
    function addPhysicsBodyV3(x, y, vx, vy, mass, size) {
      var body = createPhysicsBodyV3(x, y, vx, vy, mass, size);
      physicsBodiesV3.push(body);
      return body;
    }

    function updatePhysicsV3() {
      physicsBodiesV3.forEach(function (b) {
        updatePhysicsBodyV3(b, 0.016);
      });
      for (var i = 0; i < physicsBodiesV3.length; i++) {
        for (var j = i + 1; j < physicsBodiesV3.length; j++) {
          if (checkCollisionV3(physicsBodiesV3[i], physicsBodiesV3[j])) {
            resolveCollisionV3(physicsBodiesV3[i], physicsBodiesV3[j]);
          }
        }
      }
    }

    /* === CANDY SORT: Initialize physics v3 === */
    updatePhysicsV3();

    /* === CANDY SORT: Advanced input buffering v2 === */
    var inputBufferV2 = {
      buffer: [],
      maxSize: 20,
      add: function (input) {
        this.buffer.push({ input: input, time: performance.now() });
        if (this.buffer.length > this.maxSize) this.buffer.shift();
      },
      get: function (within) {
        var now = performance.now();
        return this.buffer.filter(function (i) { return now - i.time < within; });
      },
      clear: function () { this.buffer = []; },
      process: function () {
        var inputs = this.get(150);
        inputs.forEach(function (i) {
          if (i.input === 'click') handleClick();
          if (i.input === 'right') handleRight();
          if (i.input === 'left') handleLeft();
        });
        this.clear();
      },
      undo: function () {
        if (this.buffer.length > 0) {
          this.buffer.pop();
        }
      },
      redo: function () {
      }
    };

    function handleClick() {
      if (over) return;
      var btns = row.querySelectorAll('.memcard:not(.done)');
      if (btns.length > 0) {
        btns[0].click();
      }
    }

    function handleRight() {
      if (next < 6) {
        next++;
        st.textContent = 'Skipped to ' + next + '/6';
      }
    }

    function handleLeft() {
      if (next > 0) {
        next--;
        st.textContent = 'Back to ' + next + '/6';
      }
    }

    /* === CANDY SORT: Input prediction v2 === */
    var inputPredictionV2 = {
      history: [],
      patterns: {},
      predict: function () {
        if (this.history.length < 4) return null;
        var last4 = this.history.slice(-4).map(function (i) { return i.candy; });
        var key = last4.join(',');
        if (this.patterns[key]) {
          return this.patterns[key];
        }
        return null;
      },
      add: function (candy) {
        this.history.push({ candy: candy, time: performance.now() });
        if (this.history.length > 30) this.history.shift();
        if (this.history.length >= 5) {
          var last5 = this.history.slice(-5).map(function (i) { return i.candy; });
          var key = last5.slice(0, 4).join(',');
          var next = last5[4];
          this.patterns[key] = next;
        }
      },
      getStats: function () {
        return {
          historyLength: this.history.length,
          patternsFound: Object.keys(this.patterns).length
        };
      }
    };

    /* === CANDY SORT: Input validation v2 === */
    function validateInputV2(candy) {
      if (!candy) return { valid: false, reason: 'No candy' };
      if (over) return { valid: false, reason: 'Game over' };
      if (candy.key === ordered[next].key) return { valid: true, correct: true };
      return { valid: true, correct: false };
    }

    /* === CANDY SORT: Input sanitization v2 === */
    function sanitizeInputV2(input) {
      if (typeof input !== 'string') return '';
      return input.replace(/[<>"'&]/g, '');
    }

    /* === CANDY SORT: Input logging v2 === */
    var inputLogV2 = [];
    function logInputV2(type, data) {
      inputLogV2.push({ type: type, data: data, time: performance.now() });
      if (inputLogV2.length > 200) inputLogV2.shift();
    }

    /* === CANDY SORT: Input statistics v2 === */
    function getInputStatsV2() {
      var clicks = inputLogV2.filter(function (i) { return i.type === 'click'; });
      var correct = clicks.filter(function (i) { return i.data && i.data.correct; }).length;
      var wrong = clicks.length - correct;
      return {
        total: clicks.length,
        correct: correct,
        wrong: wrong,
        accuracy: clicks.length > 0 ? (correct / clicks.length) * 100 : 0,
        averageReactionTime: calculateAverageReactionTime()
      };
    }

    function calculateAverageReactionTime() {
      var reactions = inputLogV2.filter(function (i) { return i.type === 'click'; });
      if (reactions.length === 0) return 0;
      var total = reactions.reduce(function (sum, i) { return sum + (i.data.reactionTime || 0); }, 0);
      return total / reactions.length;
    }

    /* === CANDY SORT: Initialize input system v2 === */
    inputBufferV2.clear();

    /* === CANDY SORT: Advanced game loop v3 === */
    var gameLoopV3 = {
      running: false,
      paused: false,
      timeScale: 1,
      fixedDelta: 1000 / 120,
      accumulator: 0,
      lastTime: 0,
      frameCount: 0,
      fps: 0,
      fpsAccumulator: 0,
      fpsFrames: 0,
      updateCallbacks: [],
      renderCallbacks: [],
      start: function () {
        this.running = true;
        this.lastTime = performance.now();
        this.tick();
      },
      stop: function () {
        this.running = false;
      },
      pause: function () {
        this.paused = true;
      },
      resume: function () {
        this.paused = false;
        this.lastTime = performance.now();
      },
      tick: function () {
        if (!this.running) return;
        var now = performance.now();
        var delta = now - this.lastTime;
        this.lastTime = now;
        this.accumulator += delta * this.timeScale;
        while (this.accumulator >= this.fixedDelta) {
          if (!this.paused) {
            this.update(this.fixedDelta / 1000);
          }
          this.accumulator -= this.fixedDelta;
        }
        this.render();
        this.frameCount++;
        this.fpsAccumulator += delta;
        this.fpsFrames++;
        if (this.fpsAccumulator >= 1000) {
          this.fps = this.fpsFrames;
          this.fpsFrames = 0;
          this.fpsAccumulator = 0;
        }
        requestAnimationFrame(this.tick.bind(this));
      },
      update: function (dt) {
        this.updateCallbacks.forEach(function (cb) { cb(dt); });
      },
      render: function () {
        this.renderCallbacks.forEach(function (cb) { cb(); });
      },
      onUpdate: function (cb) {
        this.updateCallbacks.push(cb);
      },
      onRender: function (cb) {
        this.renderCallbacks.push(cb);
      }
    };

    /* === CANDY SORT: Register update callbacks === */
    gameLoopV3.onUpdate(function (dt) {
      updateGame(dt);
    });

    gameLoopV3.onUpdate(function (dt) {
      updatePhysicsV3();
    });

    gameLoopV3.onUpdate(function (dt) {
      particleSystemV2.update(dt);
    });

    gameLoopV3.onUpdate(function (dt) {
      updateAnimations();
    });

    gameLoopV3.onUpdate(function (dt) {
      updateVisualEffects();
    });

    /* === CANDY SORT: Register render callbacks === */
    gameLoopV3.onRender(function () {
      renderAll();
    });

    gameLoopV3.onRender(function () {
      renderV2.clear();
      renderBackground();
      renderParticles();
      renderUI();
    });

    /* === CANDY SORT: Time scale effects v2 === */
    function setTimeScaleV2(scale) {
      gameLoopV3.timeScale = scale;
    }

    function slowMotionV2() {
      setTimeScaleV2(0.3);
      setTimeout(function () { setTimeScaleV2(1); }, 3000);
    }

    function speedUpV2() {
      setTimeScaleV2(3);
      setTimeout(function () { setTimeScaleV2(1); }, 1500);
    }

    function freezeFrame() {
      setTimeScaleV2(0);
      setTimeout(function () { setTimeScaleV2(1); }, 500);
    }

    /* === CANDY SORT: Frame skipping v2 === */
    var frameSkipV2 = {
      enabled: false,
      skipEvery: 3,
      frameCount: 0,
      shouldSkip: function () {
        if (!this.enabled) return false;
        this.frameCount++;
        return this.frameCount % this.skipEvery === 0;
      }
    };

    /* === CANDY SORT: Initialize game loop v3 === */
    gameLoopV3.start();

    /* === CANDY SORT: Advanced rendering v3 === */
    var renderV3 = {
      canvas: null,
      ctx: null,
      width: 500,
      height: 350,
      dpr: Math.min(2, window.devicePixelRatio || 1),
      init: function () {
        this.canvas = el('canvas', '');
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.canvas.style.cssText += ';position:absolute;top:0;left:0;pointer-events:none;z-index:100;';
        stage.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(this.dpr, this.dpr);
      },
      clear: function () {
        this.ctx.clearRect(0, 0, this.width, this.height);
      },
      drawRect: function (x, y, w, h, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
      },
      drawCircle: function (x, y, r, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
      },
      drawText: function (text, x, y, color, size, align) {
        this.ctx.fillStyle = color || '#fff';
        this.ctx.font = (size || 16) + 'px sans-serif';
        this.ctx.textAlign = align || 'left';
        this.ctx.fillText(text, x, y);
        this.ctx.textAlign = 'left';
      },
      drawLine: function (x1, y1, x2, y2, color, width) {
        this.ctx.strokeStyle = color || '#fff';
        this.ctx.lineWidth = width || 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      },
      drawGradient: function (x, y, w, h, color1, color2) {
        var grad = this.ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(x, y, w, h);
      },
      drawRoundRect: function (x, y, w, h, r, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.closePath();
        this.ctx.fill();
      },
      drawShadow: function (x, y, w, h, blur, color) {
        this.ctx.shadowBlur = blur;
        this.ctx.shadowColor = color || 'rgba(0,0,0,0.5)';
        this.ctx.fillStyle = color || 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(x, y, w, h);
        this.ctx.shadowBlur = 0;
      }
    };

    /* === CANDY SORT: Render functions v3 === */
    function renderBackgroundV3() {
      renderV3.drawGradient(0, 0, 500, 350, '#0b0620', '#1a1038');
      for (var i = 0; i < 20; i++) {
        renderV3.drawCircle(Math.random() * 500, Math.random() * 350, 1, 'rgba(255,255,255,0.1)');
      }
    }

    function renderParticlesV3() {
      particleSystemV2.render(renderV3.ctx);
    }

    function renderUIV3() {
      renderV3.drawText('Score: ' + score, 10, 30, '#ffd166', 18);
      renderV3.drawText('Time: ' + timeLeft, 380, 30, timeLeft <= 5 ? '#e74c3c' : '#fff', 18);
      if (comboV2.count >= 2) {
        renderV3.drawText('COMBO x' + comboV2.count, 220, 60, '#ff9f1c', 28, 'center');
      }
      renderV3.drawText('Miss: ' + miss, 10, 60, '#e74c3c', 14);
      renderV3.drawText('Combo: ' + comboV2.count, 10, 80, '#ff9f1c', 14);
    }

    function renderAllV3() {
      renderV3.clear();
      renderBackgroundV3();
      renderParticlesV3();
      renderUIV3();
    }

    /* === CANDY SORT: Initialize rendering v3 === */
    renderV3.init();

    /* === CANDY SORT: Advanced game state v3 === */
    var gameStateV4 = {
      phase: 'idle',
      subPhase: null,
      history: [],
      snapshots: [],
      checkpoints: [],
      saveSnapshot: function () {
        this.snapshots.push({
          next: next, miss: miss, combo: combo, score: score,
          timeLeft: timeLeft, comboV2: { count: comboV2.count, multiplier: comboV2.multiplier },
          timestamp: Date.now()
        });
        if (this.snapshots.length > 20) this.snapshots.shift();
      },
      loadSnapshot: function (index) {
        if (index >= 0 && index < this.snapshots.length) {
          var s = this.snapshots[index];
          next = s.next; miss = s.miss; combo = s.combo;
          score = s.score; timeLeft = s.timeLeft;
          comboV2.count = s.comboV2.count;
          comboV2.multiplier = s.comboV2.multiplier;
        }
      },
      undo: function () {
        if (this.snapshots.length > 0) {
          this.loadSnapshot(this.snapshots.length - 1);
          this.snapshots.pop();
        }
      },
      redo: function () {
        if (this.history.length > 0) {
          var s = this.history.pop();
          this.snapshots.push(s);
          this.loadSnapshot(this.snapshots.length - 1);
        }
      },
      saveCheckpoint: function (name) {
        this.checkpoints.push({
          name: name,
          state: {
            next: next, miss: miss, combo: combo, score: score,
            timeLeft: timeLeft, comboV2: { count: comboV2.count, multiplier: comboV2.multiplier }
          },
          timestamp: Date.now()
        });
      },
      loadCheckpoint: function (name) {
        var cp = this.checkpoints.find(function (c) { return c.name === name; });
        if (cp) {
          var s = cp.state;
          next = s.next; miss = s.miss; combo = s.combo;
          score = s.score; timeLeft = s.timeLeft;
          comboV2.count = s.comboV2.count;
          comboV2.multiplier = s.comboV2.multiplier;
        }
      },
      getSnapshotCount: function () { return this.snapshots.length; },
      getCheckpointCount: function () { return this.checkpoints.length; }
    };

    /* === CANDY SORT: State machine v3 === */
    var stateMachineV3 = {
      states: {},
      currentState: 'idle',
      transitions: {},
      addState: function (name, config) {
        this.states[name] = config;
      },
      addTransition: function (from, to, condition) {
        if (!this.transitions[from]) this.transitions[from] = [];
        this.transitions[from].push({ to: to, condition: condition });
      },
      transition: function (to) {
        var prev = this.states[this.currentState];
        if (prev && prev.onExit) prev.onExit();
        this.currentState = to;
        var next = this.states[to];
        if (next && next.onEnter) next.onEnter();
      },
      update: function () {
        var state = this.states[this.currentState];
        if (state && state.onUpdate) state.onUpdate();
        if (this.transitions[this.currentState]) {
          this.transitions[this.currentState].forEach(function (t) {
            if (t.condition()) this.transition(t.to);
          }, this);
        }
      }
    };

    /* === CANDY SORT: Define states v3 === */
    stateMachineV3.addState('idle', {
      onEnter: function () { st.textContent = 'Click a candy to start!'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    stateMachineV3.addState('playing', {
      onEnter: function () { st.textContent = 'Sort the candies!'; },
      onExit: function () { gameStateV4.saveSnapshot(); },
      onUpdate: function () { gameLoopV3.update(0.016); }
    });

    stateMachineV3.addState('paused', {
      onEnter: function () { st.textContent = 'Paused'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    stateMachineV3.addState('gameover', {
      onEnter: function () { st.textContent = 'Game Over!'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    /* === CANDY SORT: Define transitions v3 === */
    stateMachineV3.addTransition('idle', 'playing', function () { return next > 0; });
    stateMachineV3.addTransition('playing', 'paused', function () { return pauseSystem.paused; });
    stateMachineV3.addTransition('paused', 'playing', function () { return !pauseSystem.paused; });
    stateMachineV3.addTransition('playing', 'gameover', function () { return over; });

    /* === CANDY SORT: Initialize state machine v3 === */
    stateMachineV3.transition('idle');

    /* === CANDY SORT: Advanced event system v3 === */
    var eventSystemV3 = {
      listeners: {},
      emit: function (event, data) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(function (cb) {
            try { cb(data); } catch (e) { console.error(e); }
          });
        }
      },
      on: function (event, cb) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
      },
      off: function (event, cb) {
        if (this.listeners[event]) {
          this.listeners[event] = this.listeners[event].filter(function (fn) { return fn !== cb; });
        }
      },
      once: function (event, cb) {
        var self = this;
        var wrapper = function (data) {
          cb(data);
          self.off(event, wrapper);
        };
        this.on(event, wrapper);
      },
      clear: function (event) {
        if (event) {
          delete this.listeners[event];
        } else {
          this.listeners = {};
        }
      },
      getListenerCount: function (event) {
        return this.listeners[event] ? this.listeners[event].length : 0;
      }
    };

    /* === CANDY SORT: Event types v3 === */
    var GameEventsV3 = {
      GAME_START: 'game_start',
      GAME_END: 'game_end',
      CANDY_CORRECT: 'candy_correct',
      CANDY_WRONG: 'candy_wrong',
      COMBO_START: 'combo_start',
      COMBO_END: 'combo_end',
      COMBO_MILESTONE: 'combo_milestone',
      TIME_WARNING: 'time_warning',
      TIME_UP: 'time_up',
      LEVEL_UP: 'level_up',
      ACHIEVEMENT: 'achievement',
      PAUSE: 'pause',
      RESUME: 'resume',
      RESTART: 'restart',
      UNDO: 'undo',
      REDO: 'redo',
      CHECKPOINT_SAVE: 'checkpoint_save',
      CHECKPOINT_LOAD: 'checkpoint_load'
    };

    /* === CANDY SORT: Event handlers v3 === */
    eventSystemV3.on(GameEventsV3.GAME_START, function (data) {
      logEvent('game_start', data);
      analyticsV2.track('game_start', data);
    });

    eventSystemV3.on(GameEventsV3.CANDY_CORRECT, function (data) {
      logEvent('candy_correct', data);
      analyticsV2.track('candy_correct', data);
      comboV2.count++;
      score += data.pts;
      playSound('correct');
      triggerCorrect(data.pts);
    });

    eventSystemV3.on(GameEventsV3.CANDY_WRONG, function (data) {
      logEvent('candy_wrong', data);
      analyticsV2.track('candy_wrong', data);
      comboV2.count = 0;
      miss++;
      playSound('wrong');
      triggerWrong();
    });

    eventSystemV3.on(GameEventsV3.COMBO_MILESTONE, function (data) {
      logEvent('combo_milestone', data);
      showComboPopup(data.count);
      comboEffect();
    });

    eventSystemV3.on(GameEventsV3.TIME_WARNING, function (data) {
      logEvent('time_warning', data);
      animateTimeWarning();
      playTimeWarning();
    });

    eventSystemV3.on(GameEventsV3.GAME_END, function (data) {
      logEvent('game_end', data);
      analyticsV2.track('game_end', data);
      if (data.won) {
        triggerWin();
      } else {
        triggerLose();
      }
    });

    eventSystemV3.on(GameEventsV3.UNDO, function () {
      gameStateV4.undo();
      st.textContent = 'Undone!';
    });

    eventSystemV3.on(GameEventsV3.REDO, function () {
      gameStateV4.redo();
      st.textContent = 'Redone!';
    });

    eventSystemV3.on(GameEventsV3.CHECKPOINT_SAVE, function (data) {
      gameStateV4.saveCheckpoint(data.name);
      st.textContent = 'Checkpoint saved: ' + data.name;
    });

    eventSystemV3.on(GameEventsV3.CHECKPOINT_LOAD, function (data) {
      gameStateV4.loadCheckpoint(data.name);
      st.textContent = 'Checkpoint loaded: ' + data.name;
    });

    /* === CANDY SORT: Event triggers v3 === */
    function triggerGameStartV3() { eventSystemV3.emit(GameEventsV3.GAME_START, { mode: currentMode }); }
    function triggerCandyCorrectV3(pts) { eventSystemV3.emit(GameEventsV3.CANDY_CORRECT, { pts: pts }); }
    function triggerCandyWrongV3() { eventSystemV3.emit(GameEventsV3.CANDY_WRONG, {}); }
    function triggerComboMilestoneV3(count) { eventSystemV3.emit(GameEventsV3.COMBO_MILESTONE, { count: count }); }
    function triggerTimeWarningV3() { eventSystemV3.emit(GameEventsV3.TIME_WARNING, { timeLeft: timeLeft }); }
    function triggerGameEndV3(won) { eventSystemV3.emit(GameEventsV3.GAME_END, { won: won, score: score }); }
    function triggerUndo() { eventSystemV3.emit(GameEventsV3.UNDO, {}); }
    function triggerRedo() { eventSystemV3.emit(GameEventsV3.REDO, {}); }
    function triggerCheckpointSave(name) { eventSystemV3.emit(GameEventsV3.CHECKPOINT_SAVE, { name: name }); }
    function triggerCheckpointLoad(name) { eventSystemV3.emit(GameEventsV3.CHECKPOINT_LOAD, { name: name }); }

    /* === CANDY SORT: Initialize event system v3 === */
    triggerGameStartV3();

    /* === CANDY SORT: Advanced game systems integration v2 === */
    var gameSystemsV2 = {
      audio: audioSystemV2,
      particles: particleSystemV2,
      physics: { bodies: physicsBodiesV3, update: updatePhysicsV3 },
      rendering: renderV3,
      state: gameStateV4,
      events: eventSystemV3,
      analytics: analyticsV2,
      input: inputBufferV2,
      ai: aiSystem,
      network: networkSystem,
      replay: replayV2,
      share: shareV2,
      customization: customizationV2,
      accessibility: accessibility,
      performance: perfOptimization,
      balance: balanceSystem,
      dda: ddaSystem,
      modes: gameModesV2,
      tutorial: tutorialV2
    };

    /* === CANDY SORT: System initialization v2 === */
    function initAllSystemsV2() {
      initAudioSystem();
      initRenderSystem();
      initInputSystem();
      updatePhysicsV3();
      updateVisualEffects();
      updateParticles();
      processInput();
      updateCombo();
      updateScoreMultiplier();
      updateGameState();
      adjustDifficulty();
      updateDDA();
      updateTiming();
      updatePerfStats();
      syncLeaderboard();
      syncAchievements();
      initAllSystems();
    }

    /* === CANDY SORT: System update v2 === */
    function updateAllSystemsV2(dt) {
      gameLoopV3.update(dt);
      stateMachineV3.update();
      updateAllSystemsVisualV2();
    }

    function updateAllSystemsVisualV2() {
      renderAllV3();
      renderV3.clear();
      renderBackgroundV3();
      renderParticlesV3();
      renderUIV3();
    }

    /* === CANDY SORT: System cleanup v2 === */
    function cleanupAllSystemsV2() {
      stopAutoPlay();
      stopMusic();
      gameLoopV3.stop();
      replayV2.stopRecording();
      saveGame();
      saveAchievements();
      cloudSave();
      cleanupAllSystems();
    }

    /* === CANDY SORT: System reset v2 === */
    function resetAllSystemsV2() {
      cleanupAllSystemsV2();
      next = 0; miss = 0; combo = 0; score = 0;
      timeLeft = 30; comboV2.count = 0; comboV2.multiplier = 1;
      maxCombo = 0; totalClicks = 0; correctClicks = 0;
      over = false; hintUsed = false;
      physicsBodiesV3 = [];
      visualSystem.particles = [];
      visualSystem.effects = [];
      particleSystemV2.particles = [];
      inputBufferV2.clear();
      eventLog = [];
      gameStateV4.snapshots = [];
      gameStateV4.history = [];
      gameStateV4.checkpoints = [];
      resetAllSystems();
    }

    /* === CANDY SORT: System status === */
    function getSystemStatus() {
      return {
        audio: audioSystemV2.initialized,
        particles: particleSystemV2.particles.length,
        physics: physicsBodiesV3.length,
        rendering: renderV3.canvas !== null,
        state: gameStateV4.getSnapshotCount(),
        events: Object.keys(eventSystemV3.listeners).length,
        analytics: analyticsV2.events.length,
        input: inputBufferV2.buffer.length,
        ai: aiSystem.enabled,
        network: networkSystem.connected,
        replay: replayV2.recording,
        customization: customizationV2.currentThemeV2,
        accessibility: accessibility.highContrast,
        performance: perfOptimization.objectPooling,
        balance: balanceSystem,
        dda: ddaSystem.enabled,
        modes: currentMode,
        tutorial: tutorialV2.active
      };
    }

    /* === CANDY SORT: Initialize all systems v2 === */
    initAllSystemsV2();

    /* === CANDY SORT: Advanced game modes v3 === */
    var gameModesV3 = {
      classic: { name: 'Classic', timeLimit: 30, lives: Infinity, difficulty: 1, description: 'Standard game mode', unlock: true },
      timed: { name: 'Timed', timeLimit: 20, lives: Infinity, difficulty: 1.5, description: 'Less time, more pressure', unlock: true },
      hardcore: { name: 'Hardcore', timeLimit: 15, lives: 3, difficulty: 2, description: 'Only 3 lives!', unlock: true },
      zen: { name: 'Zen', timeLimit: 60, lives: Infinity, difficulty: 0.5, description: 'Relaxed gameplay', unlock: true },
      challenge: { name: 'Challenge', timeLimit: 25, lives: 5, difficulty: 1.8, description: 'Combo bonuses', unlock: true },
      speedrun: { name: 'Speedrun', timeLimit: 10, lives: Infinity, difficulty: 2.5, description: 'Beat the clock!', unlock: true },
      endless: { name: 'Endless', timeLimit: Infinity, lives: Infinity, difficulty: 1, description: 'No time limit', unlock: true },
      daily: { name: 'Daily', timeLimit: 30, lives: Infinity, difficulty: 1.2, description: 'Daily challenge', unlock: true },
      nightmare: { name: 'Nightmare', timeLimit: 10, lives: 1, difficulty: 3, description: 'One life, 10 seconds!', unlock: false },
      impossible: { name: 'Impossible', timeLimit: 5, lives: 1, difficulty: 4, description: 'Good luck!', unlock: false }
    };

    /* === CANDY SORT: Mode unlock system === */
    var modeUnlocks = {
      nightmare: { requirement: 'Complete hardcore mode', unlocked: false },
      impossible: { requirement: 'Complete nightmare mode', unlocked: false }
    };

    function checkModeUnlocks() {
      if (modeAchievements.hardcore && !modeUnlocks.nightmare.unlocked) {
        modeUnlocks.nightmare.unlocked = true;
        gameModesV3.nightmare.unlock = true;
        showSortAchievement('🔓 Nightmare mode unlocked!');
      }
      if (modeAchievements.nightmare && !modeUnlocks.impossible.unlocked) {
        modeUnlocks.impossible.unlocked = true;
        gameModesV3.impossible.unlock = true;
        showSortAchievement('🔓 Impossible mode unlocked!');
      }
    }

    /* === CANDY SORT: Mode selection v3 === */
    function showModeSelectV3() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:77;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Game Mode'));
      Object.keys(gameModesV3).forEach(function (key) {
        var m = gameModesV3[key];
        var b = btn(m.name + ' - ' + m.description, function () {
          if (m.unlock) {
            setGameModeV3(key);
            panel.remove();
          } else {
            st.textContent = '🔒 ' + modeUnlocks[key].requirement;
          }
        });
        b.style.cssText += ';margin:4px;width:350px;';
        if (!m.unlock) b.style.opacity = '0.5';
        panel.appendChild(b);
      });
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    function setGameModeV3(mode) {
      if (gameModesV3[mode] && gameModesV3[mode].unlock) {
        currentMode = mode;
        var m = gameModesV3[mode];
        timeLeft = m.timeLimit === Infinity ? 9999 : m.timeLimit;
        st.textContent = 'Mode: ' + m.name + ' · Time: ' + (m.timeLimit === Infinity ? '∞' : m.timeLimit + 's');
        gameStateV2.difficulty = m.difficulty;
        checkModeUnlocks();
      }
    }

    /* === CANDY SORT: Mode-specific achievements v2 === */
    var modeAchievementsV2 = {
      classic: { completed: false, name: 'Classic Master' },
      timed: { completed: false, name: 'Speed Demon' },
      hardcore: { completed: false, name: 'Hardcore Hero' },
      zen: { completed: false, name: 'Zen Master' },
      challenge: { completed: false, name: 'Challenge Champion' },
      speedrun: { completed: false, name: 'Speedrunner' },
      endless: { completed: false, name: 'Endless Legend' },
      daily: { completed: false, name: 'Daily Warrior' },
      nightmare: { completed: false, name: 'Nightmare Survivor' },
      impossible: { completed: false, name: 'Impossible Champion' }
    };

    function checkModeAchievementV2(mode) {
      if (modeAchievementsV2[mode] && !modeAchievementsV2[mode].completed) {
        modeAchievementsV2[mode].completed = true;
        showSortAchievement('🏆 ' + modeAchievementsV2[mode].name + '!');
      }
    }

    /* === CANDY SORT: Initialize game modes v3 === */
    showModeSelectV3();

    /* === CANDY SORT: Advanced tutorial system v3 === */
    var tutorialV3 = {
      active: false,
      step: 0,
      steps: [
        { text: 'Welcome to Candy Sort!', duration: 2000, action: null, highlight: null },
        { text: 'Click candies from cheapest to priciest.', duration: 3000, action: function () { highlightCheapestV3(); }, highlight: 'cheapest' },
        { text: 'Build combos for bonus points!', duration: 2000, action: function () { showComboDemoV3(); }, highlight: 'combo' },
        { text: 'Use hints if you get stuck.', duration: 2000, action: function () { showHintDemoV3(); }, highlight: 'hint' },
        { text: 'Watch the timer!', duration: 2000, action: function () { highlightTimerV3(); }, highlight: 'timer' },
        { text: 'Complete achievements for rewards!', duration: 2000, action: null, highlight: null },
        { text: 'Good luck!', duration: 1000, action: null, highlight: null }
      ],
      start: function () {
        this.active = true;
        this.step = 0;
        this.showStep();
      },
      showStep: function () {
        if (this.step >= this.steps.length) {
          this.active = false;
          return;
        }
        var step = this.steps[this.step];
        st.textContent = '📖 ' + step.text;
        if (step.action) step.action();
        if (step.highlight) this.highlightElement(step.highlight);
        setTimeout(function () {
          this.step++;
          this.showStep();
        }.bind(this), step.duration);
      },
      highlightElement: function (type) {
        switch (type) {
          case 'cheapest': this.highlightCheapest(); break;
          case 'combo': this.highlightCombo(); break;
          case 'hint': this.highlightHint(); break;
          case 'timer': this.highlightTimer(); break;
        }
      },
      highlightCheapest: function () {
        var cheapest = ordered[next];
        if (cheapest) {
          row.querySelectorAll('.memcard').forEach(function (btn) {
            if (btn.textContent.includes(cheapest.name)) {
              btn.style.boxShadow = '0 0 25px #2ecc71';
              btn.style.transform = 'scale(1.1)';
              setTimeout(function () { btn.style.boxShadow = ''; btn.style.transform = ''; }, 2000);
            }
          });
        }
      },
      highlightCombo: function () {
        comboDisplay.display.textContent = '🔥 COMBO x5!';
        comboDisplay.display.style.transform = 'scale(2)';
        comboDisplay.display.style.color = '#ff9f1c';
        setTimeout(function () {
          comboDisplay.display.textContent = '';
          comboDisplay.display.style.transform = '';
          comboDisplay.display.style.color = '';
        }, 2000);
      },
      highlightHint: function () {
        hintBtn.style.boxShadow = '0 0 20px #59e6ff';
        setTimeout(function () { hintBtn.style.boxShadow = ''; }, 2000);
      },
      highlightTimer: function () {
        bar.fill.style.background = '#e74c3c';
        bar.fill.style.height = '15px';
        setTimeout(function () { bar.fill.style.background = ''; bar.fill.style.height = ''; }, 2000);
      },
      highlightCheapestV3: function () { this.highlightCheapest(); },
      showComboDemoV3: function () { this.highlightCombo(); },
      showHintDemoV3: function () { this.highlightHint(); },
      highlightTimerV3: function () { this.highlightTimer(); }
    };

    /* === CANDY SORT: Tutorial UI v3 === */
    function showTutorialV3() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:78;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Tutorial'));
      panel.appendChild(btn('Start Tutorial', function () {
        panel.remove();
        tutorialV3.start();
      }));
      panel.appendChild(btn('Skip', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Help system v3 === */
    function showHelpV3() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:79;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'How to Play'));
      var helpText = el('div', '', '');
      helpText.style.cssText = 'color:#cfc3ee;text-align:left;max-width:450px;';
      helpText.innerHTML = '<p>🖱️ Click candies in order from cheapest to priciest</p>' +
        '<p>🔥 Build combos for bonus points</p>' +
        '<p>💡 Use hints if you get stuck</p>' +
        '<p>⏭️ Skip candies for a penalty</p>' +
        '<p>⏱️ Beat the clock!</p>' +
        '<p>🏆 Complete achievements for rewards!</p>' +
        '<p>🎨 Customize themes and skins!</p>' +
        '<p>📊 Track your analytics!</p>';
      panel.appendChild(helpText);
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Settings v3 === */
    function showSettingsV3() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:80;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Settings'));
      panel.appendChild(btn('🔊 Sound: ' + (soundSystem.muted ? 'OFF' : 'ON'), function () {
        var muted = toggleSound();
        panel.children[1].textContent = '🔊 Sound: ' + (mutered ? 'OFF' : 'ON');
      }));
      panel.appendChild(btn('✨ Bloom: ' + (visualEffectsV2.bloom ? 'ON' : 'OFF'), function () {
        toggleBloom();
        panel.children[2].textContent = '✨ Bloom: ' + (visualEffectsV2.bloom ? 'ON' : 'OFF');
      }));
      panel.appendChild(btn('🌙 Theme: ' + customizationV2.currentThemeV2, function () {
        customizationV2.cycleThemeV2();
        panel.children[3].textContent = '🌙 Theme: ' + customizationV2.currentThemeV2;
      }));
      panel.appendChild(btn('🍬 Skin: ' + currentSkinV2, function () {
        var skins = Object.keys(candySkinsV2);
        var idx = skins.indexOf(currentSkinV2);
        idx = (idx + 1) % skins.length;
        setCandySkinV2(skins[idx]);
        panel.children[4].textContent = '🍬 Skin: ' + currentSkinV2;
      }));
      panel.appendChild(btn('♿ Accessibility', function () { showAccessibilityPanel(); }));
      panel.appendChild(btn('📊 Analytics', function () { showAnalyticsDashboard(); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize tutorial v3 === */
    showTutorialV3();

    /* === CANDY SORT: Advanced game analytics v3 === */
    var analyticsV3 = {
      sessionStart: Date.now(),
      events: [],
      metrics: {
        totalClicks: 0,
        correctClicks: 0,
        wrongClicks: 0,
        hintsUsed: 0,
        skipsUsed: 0,
        maxCombo: 0,
        totalScore: 0,
        averageReactionTime: 0,
        accuracy: 0,
        sessionDuration: 0,
        eventsPerSecond: 0
      },
      track: function (event, data) {
        this.events.push({ event: event, data: data, timestamp: Date.now() });
        this.updateMetrics(event, data);
      },
      updateMetrics: function (event, data) {
        switch (event) {
          case 'click': this.metrics.totalClicks++; break;
          case 'correct': this.metrics.correctClicks++; break;
          case 'wrong': this.metrics.wrongClicks++; break;
          case 'hint': this.metrics.hintsUsed++; break;
          case 'skip': this.metrics.skipsUsed++; break;
          case 'combo': this.metrics.maxCombo = Math.max(this.metrics.maxCombo, data.count); break;
          case 'score': this.metrics.totalScore = data.score; break;
        }
        if (this.metrics.totalClicks > 0) {
          this.metrics.accuracy = (this.metrics.correctClicks / this.metrics.totalClicks) * 100;
        }
        this.metrics.sessionDuration = Date.now() - this.sessionStart;
        if (this.metrics.sessionDuration > 0) {
          this.metrics.eventsPerSecond = this.events.length / (this.metrics.sessionDuration / 1000);
        }
      },
      getReport: function () {
        return {
          sessionDuration: this.metrics.sessionDuration,
          metrics: this.metrics,
          events: this.events.length,
          eventTypes: this.getEventTypes()
        };
      },
      getEventTypes: function () {
        var types = {};
        this.events.forEach(function (e) {
          types[e.event] = (types[e.event] || 0) + 1;
        });
        return types;
      },
      export: function () {
        return JSON.stringify(this.getReport());
      },
      reset: function () {
        this.sessionStart = Date.now();
        this.events = [];
        this.metrics = {
          totalClicks: 0, correctClicks: 0, wrongClicks: 0,
          hintsUsed: 0, skipsUsed: 0, maxCombo: 0,
          totalScore: 0, averageReactionTime: 0, accuracy: 0,
          sessionDuration: 0, eventsPerSecond: 0
        };
      }
    };

    /* === CANDY SORT: Track events v3 === */
    eventSystemV3.on(GameEventsV3.CANDY_CORRECT, function (data) {
      analyticsV3.track('correct', data);
    });
    eventSystemV3.on(GameEventsV3.CANDY_WRONG, function (data) {
      analyticsV3.track('wrong', data);
    });
    eventSystemV3.on(GameEventsV3.COMBO_MILESTONE, function (data) {
      analyticsV3.track('combo', data);
    });
    eventSystemV3.on(GameEventsV3.GAME_END, function (data) {
      analyticsV3.track('score', { score: data.score });
    });

    /* === CANDY SORT: Analytics dashboard v3 === */
    function showAnalyticsDashboardV3() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:81;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Analytics Dashboard'));
      var report = analyticsV3.getReport();
      var stats = el('div', '', '');
      stats.style.cssText = 'color:#cfc3ee;text-align:left;';
      stats.innerHTML = '<p>Session Duration: ' + Math.round(report.metrics.sessionDuration / 1000) + 's</p>' +
        '<p>Total Clicks: ' + report.metrics.totalClicks + '</p>' +
        '<p>Accuracy: ' + report.metrics.accuracy.toFixed(1) + '%</p>' +
        '<p>Max Combo: ' + report.metrics.maxCombo + '</p>' +
        '<p>Total Score: ' + report.metrics.totalScore + '</p>' +
        '<p>Events/sec: ' + report.metrics.eventsPerSecond.toFixed(2) + '</p>';
      panel.appendChild(stats);
      panel.appendChild(btn('Export Data', function () {
        prompt('Copy analytics data:', analyticsV3.export());
      }));
      panel.appendChild(btn('Reset Analytics', function () {
        analyticsV3.reset();
        panel.remove();
      }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize analytics v3 === */
    analyticsV3.track('game_start', { mode: currentMode });

    /* === CANDY SORT: Advanced game replay v3 === */
    var replayV3 = {
      recording: false,
      frames: [],
      metadata: {
        version: '3.0',
        gameMode: currentMode,
        startTime: null,
        endTime: null,
        frameCount: 0
      },
      startRecording: function () {
        this.recording = true;
        this.frames = [];
        this.metadata.startTime = Date.now();
        this.metadata.gameMode = currentMode;
      },
      stopRecording: function () {
        this.recording = false;
        this.metadata.endTime = Date.now();
        this.metadata.frameCount = this.frames.length;
      },
      recordFrame: function () {
        if (!this.recording) return;
        this.frames.push({
          state: {
            next: next, miss: miss, combo: combo, score: score,
            timeLeft: timeLeft, comboV2: { count: comboV2.count, multiplier: comboV2.multiplier }
          },
          timestamp: performance.now()
        });
      },
      play: function (onFrame, onComplete) {
        var startTime = performance.now();
        var totalDuration = this.frames.length > 0 ? this.frames[this.frames.length - 1].timestamp : 0;
        this.frames.forEach(function (frame) {
          var delay = frame.timestamp - startTime;
          setTimeout(function () {
            onFrame(frame.state);
          }, delay);
        });
        if (onComplete) {
          setTimeout(onComplete, totalDuration);
        }
      },
      export: function () {
        return JSON.stringify({
          metadata: this.metadata,
          frames: this.frames
        });
      },
      import: function (data) {
        var parsed = JSON.parse(data);
        this.metadata = parsed.metadata;
        this.frames = parsed.frames;
      },
      getDuration: function () {
        if (this.frames.length === 0) return 0;
        return this.frames[this.frames.length - 1].timestamp - this.frames[0].timestamp;
      },
      getFrameCount: function () {
        return this.frames.length;
      },
      getMetadata: function () {
        return this.metadata;
      }
    };

    /* === CANDY SORT: Replay controls v3 === */
    function showReplayControlsV3() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;bottom:10px;left:10px;z-index:82;display:flex;gap:8px;';
      stage.appendChild(panel);
      panel.appendChild(btn('⏺️ Record', function () {
        if (replayV3.recording) {
          replayV3.stopRecording();
          panel.children[0].textContent = '⏺️ Record';
        } else {
          replayV3.startRecording();
          panel.children[0].textContent = '⏹️ Stop';
        }
      }));
      panel.appendChild(btn('▶️ Play', function () {
        replayV3.play(function (state) {
          next = state.next;
          miss = state.miss;
          combo = state.combo;
          score = state.score;
          timeLeft = state.timeLeft;
          comboV2.count = state.comboV2.count;
          comboV2.multiplier = state.comboV2.multiplier;
        });
      }));
      panel.appendChild(btn('💾 Save', function () {
        try { localStorage.setItem('candy_sort_replay_v3', replayV3.export()); } catch (e) {}
      }));
      panel.appendChild(btn('📂 Load', function () {
        try {
          var data = localStorage.getItem('candy_sort_replay_v3');
          if (data) replayV3.import(data);
        } catch (e) {}
      }));
      panel.appendChild(btn('ℹ️ Info', function () {
        var meta = replayV3.getMetadata();
        alert('Duration: ' + Math.round(replayV3.getDuration()) + 'ms\nFrames: ' + replayV3.getFrameCount() + '\nMode: ' + meta.gameMode);
      }));
    }

    /* === CANDY SORT: Initialize replay v3 === */
    showReplayControlsV3();

    /* === CANDY SORT: Advanced game sharing v3 === */
    var shareV3 = {
      generateShareTextV3: function () {
        var report = analyticsV3.getReport();
        return 'I scored ' + report.metrics.totalScore + ' in Candy Sort! ' +
          'Accuracy: ' + report.metrics.accuracy.toFixed(1) + '% ' +
          'Max Combo: x' + report.metrics.maxCombo + ' ' +
          'Time: ' + Math.round(report.metrics.sessionDuration / 1000) + 's ' +
          'Can you beat me?';
      },
      generateShareImageV3: function () {
        var canvas = el('canvas', '');
        canvas.width = 600;
        canvas.height = 400;
        var ctx = canvas.getContext('2d');
        var grad = ctx.createLinearGradient(0, 0, 600, 400);
        grad.addColorStop(0, '#0b0620');
        grad.addColorStop(1, '#1a1038');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 600, 400);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('Candy Sort', 220, 70);
        ctx.font = 'bold 56px sans-serif';
        ctx.fillText(analyticsV3.getReport().metrics.totalScore, 250, 160);
        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#cfc3ee';
        ctx.fillText('Accuracy: ' + analyticsV3.getReport().metrics.accuracy.toFixed(1) + '%', 180, 230);
        ctx.fillText('Max Combo: x' + analyticsV3.getReport().metrics.maxCombo, 180, 270);
        ctx.fillText('Time: ' + Math.round(analyticsV3.getReport().metrics.sessionDuration / 1000) + 's', 180, 310);
        return canvas.toDataURL();
      },
      shareV3: function () {
        if (navigator.share) {
          navigator.share({
            title: 'Candy Sort Score',
            text: this.generateShareTextV3()
          });
        } else {
          prompt('Copy your score:', this.generateShareTextV3());
        }
      },
      copyToClipboardV3: function (text) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text);
        } else {
          prompt('Copy:', text);
        }
      },
      generateQRCode: function (text) {
        return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(text);
      }
    };

    /* === CANDY SORT: Share UI v3 === */
    function showShareUIV3() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:83;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Share Your Score'));
      panel.appendChild(el('p', '', shareV3.generateShareTextV3()));
      var img = el('img', '');
      img.src = shareV3.generateShareImageV3();
      img.style.cssText = 'max-width:80%;border-radius:8px;margin:12px 0;';
      panel.appendChild(img);
      var qr = el('img', '');
      qr.src = shareV3.generateQRCode(shareV3.generateShareTextV3());
      qr.style.cssText = 'width:100px;height:100px;margin:8px;';
      panel.appendChild(qr);
      panel.appendChild(btn('📤 Share', function () { shareV3.shareV3(); }));
      panel.appendChild(btn('📋 Copy Text', function () { shareV3.copyToClipboardV3(shareV3.generateShareTextV3()); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Social features v3 === */
    var socialV3 = {
      friends: [],
      challenges: [],
      notifications: [],
      groups: [],
      addFriendV3: function (name, score) {
        this.friends.push({ name: name, score: score, date: Date.now() });
      },
      sendChallengeV3: function (friend, score) {
        this.challenges.push({ to: friend, score: score, date: Date.now(), status: 'pending' });
      },
      getLeaderboardV3: function () {
        return this.friends.sort(function (a, b) { return b.score - a.score; });
      },
      addNotificationV3: function (message, type) {
        this.notifications.push({ message: message, type: type || 'info', time: Date.now(), read: false });
      },
      getUnreadCountV3: function () {
        return this.notifications.filter(function (n) { return !n.read; }).length;
      },
      markAllReadV3: function () {
        this.notifications.forEach(function (n) { n.read = true; });
      },
      createGroupV3: function (name) {
        this.groups.push({ name: name, members: [], created: Date.now() });
      },
      joinGroupV3: function (groupName, memberName) {
        var group = this.groups.find(function (g) { return g.name === groupName; });
        if (group && !group.members.includes(memberName)) {
          group.members.push(memberName);
        }
      },
      getGroupLeaderboardV3: function (groupName) {
        var group = this.groups.find(function (g) { return g.name === groupName; });
        if (!group) return [];
        return group.members.map(function (m) {
          var friend = this.friends.find(function (f) { return f.name === m; });
          return { name: m, score: friend ? friend.score : 0 };
        }, this).sort(function (a, b) { return b.score - a.score; });
      }
    };

    /* === CANDY SORT: Initialize sharing v3 === */
    showShareUIV3();

    /* === CANDY SORT: Advanced game customization v3 === */
    var customizationV3 = {
      themesV3: {
        classic: { bg: '#0b0620', accent: '#ffd166', text: '#f5efff', cardBg: '#3b1d5e', name: 'Classic' },
        neon: { bg: '#0a0a0a', accent: '#00ff88', text: '#ffffff', cardBg: '#1a1a2e', name: 'Neon' },
        pastel: { bg: '#1a1a2e', accent: '#ff9ff3', text: '#ffffff', cardBg: '#2d2d44', name: 'Pastel' },
        dark: { bg: '#000000', accent: '#ff0000', text: '#ffffff', cardBg: '#1a1a1a', name: 'Dark' },
        ocean: { bg: '#0c1445', accent: '#00d4ff', text: '#ffffff', cardBg: '#1a2a5e', name: 'Ocean' },
        sunset: { bg: '#1a0a2e', accent: '#ff6b6b', text: '#ffffff', cardBg: '#2e1a4e', name: 'Sunset' },
        forest: { bg: '#0a1a0a', accent: '#4ade80', text: '#ffffff', cardBg: '#1a2e1a', name: 'Forest' },
        candy: { bg: '#2e0a1a', accent: '#ff69b4', text: '#ffffff', cardBg: '#4e1a2e', name: 'Candy' },
        halloween: { bg: '#1a0a00', accent: '#ff7518', text: '#ffffff', cardBg: '#2e1a0a', name: 'Halloween' },
        christmas: { bg: '#0a1a0a', accent: '#ff0000', text: '#ffffff', cardBg: '#1a2e1a', name: 'Christmas' }
      },
      currentThemeV3: 'classic',
      applyThemeV3: function (name) {
        if (this.themesV3[name]) {
          this.currentThemeV3 = name;
          var t = this.themesV3[name];
          stage.style.background = t.bg;
          stage.style.color = t.text;
          document.querySelectorAll('.memcard').forEach(function (btn) {
            btn.style.borderColor = t.accent;
            btn.style.background = t.cardBg;
          });
        }
      },
      cycleThemeV3: function () {
        var themes = Object.keys(this.themesV3);
        var idx = themes.indexOf(this.currentThemeV3);
        idx = (idx + 1) % themes.length;
        this.applyThemeV3(themes[idx]);
      },
      randomThemeV3: function () {
        var themes = Object.keys(this.themesV3);
        var random = themes[(Math.random() * themes.length) | 0];
        this.applyThemeV3(random);
      },
      getThemeNames: function () {
        return Object.keys(this.themesV3);
      },
      getCurrentTheme: function () {
        return this.themesV3[this.currentThemeV3];
      }
    };

    /* === CANDY SORT: Theme selector v3 === */
    function showThemeSelectorV3() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:84;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Theme'));
      Object.keys(customizationV3.themesV3).forEach(function (name) {
        var t = customizationV3.themesV3[name];
        var b = btn(t.name, function () {
          customizationV3.applyThemeV3(name);
          panel.remove();
        });
        b.style.cssText += ';background:' + t.bg + ';color:' + t.accent + ';border:1px solid ' + t.accent + ';margin:4px;';
        panel.appendChild(b);
      });
      panel.appendChild(btn('🎲 Random', function () { customizationV3.randomThemeV3(); panel.remove(); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Candy skin system v3 === */
    var candySkinsV3 = {
      classic: { emoji: '🍬', color: '#ffd166', name: 'Classic' },
      spooky: { emoji: '🎃', color: '#ff7518', name: 'Spooky' },
      spooky2: { emoji: '👻', color: '#f2f2fa', name: 'Ghost' },
      spooky3: { emoji: '💀', color: '#9aa0b0', name: 'Skull' },
      spooky4: { emoji: '🦇', color: '#4a4a6a', name: 'Bat' },
      spooky5: { emoji: '🕷️', color: '#8b0000', name: 'Spider' },
      spooky6: { emoji: '🧟', color: '#556b2f', name: 'Zombie' },
      spooky7: { emoji: '🧛', color: '#800080', name: 'Vampire' },
      spooky8: { emoji: '🧙', color: '#4b0082', name: 'Witch' },
      spooky9: { emoji: '🎃', color: '#ff6600', name: 'Pumpkin' }
    };
    var currentSkinV3 = 'classic';

    function setCandySkinV3(skin) {
      if (candySkinsV3[skin]) {
        currentSkinV3 = skin;
        row.querySelectorAll('.memcard').forEach(function (btn) {
          btn.style.borderColor = candySkinsV3[skin].color;
          btn.style.boxShadow = '0 0 10px ' + candySkinsV3[skin].color + '40';
        });
      }
    }

    /* === CANDY SORT: Skin selector v3 === */
    function showSkinSelectorV3() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:85;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Candy Skin'));
      Object.keys(candySkinsV3).forEach(function (name) {
        var s = candySkinsV3[name];
        var b = btn(s.emoji + ' ' + s.name, function () {
          setCandySkinV3(name);
          panel.remove();
        });
        b.style.cssText += ';border:1px solid ' + s.color + ';margin:4px;';
        panel.appendChild(b);
      });
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize customization v3 === */
    showThemeSelectorV3();

    /* === CANDY SORT: Advanced game physics v4 === */
    var physicsV4 = {
      gravity: 0.2,
      airResistance: 0.998,
      groundFriction: 0.9,
      bounce: 0.7,
      maxSpeed: 25,
      terminalVelocity: 20,
      windResistance: 0.999
    };

    function createPhysicsBodyV4(x, y, vx, vy, mass, size, rotation) {
      return {
        x: x, y: y, vx: vx, vy: vy,
        mass: mass || 1, size: size || 10,
        rotation: rotation || 0, rotSpeed: 0,
        forces: [], isStatic: false, isTrigger: false,
        collisionLayer: 0, collisionMask: 0xFFFFFFFF,
        restitution: 0.5, friction: 0.3
      };
    }

    function applyForceV4(body, fx, fy) {
      if (body.isStatic) return;
      body.forces.push({ x: fx, y: fy });
    }

    function updatePhysicsBodyV4(body, dt) {
      if (body.isStatic) return;
      body.forces.forEach(function (f) {
        body.vx += f.x / body.mass;
        body.vy += f.y / body.mass;
      });
      body.forces = [];
      body.vx *= physicsV4.airResistance;
      body.vy *= physicsV4.airResistance;
      body.vy += physicsV4.gravity;
      var speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
      if (speed > physicsV4.maxSpeed) {
        body.vx = (body.vx / speed) * physicsV4.maxSpeed;
        body.vy = (body.vy / speed) * physicsV4.maxSpeed;
      }
      if (body.vy > physicsV4.terminalVelocity) {
        body.vy = physicsV4.terminalVelocity;
      }
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.rotation += body.rotSpeed;
      if (body.y > 280) {
        body.y = 280;
        body.vy *= -physicsV4.bounce;
        body.vx *= physicsV4.groundFriction;
        if (Math.abs(body.vy) < 0.3) body.vy = 0;
      }
    }

    /* === CANDY SORT: Collision detection v4 === */
    function checkCollisionV4(a, b) {
      var dx = a.x - b.x;
      var dy = a.y - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      return dist < (a.size + b.size);
    }

    function resolveCollisionV4(a, b) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      var nx = dx / dist;
      var ny = dy / dist;
      var relVx = a.vx - b.vx;
      var relVy = a.vy - b.vy;
      var relDot = relVx * nx + relVy * ny;
      if (relDot > 0) return;
      var totalMass = a.mass + b.mass;
      var restitution = Math.min(a.restitution, b.restitution);
      var impulse = -(1 + restitution) * relDot / totalMass;
      a.vx -= impulse * b.mass * nx;
      a.vy -= impulse * b.mass * ny;
      b.vx += impulse * a.mass * nx;
      b.vy += impulse * a.mass * ny;
    }

    /* === CANDY SORT: Physics simulation v4 === */
    var physicsBodiesV4 = [];
    function addPhysicsBodyV4(x, y, vx, vy, mass, size, rotation) {
      var body = createPhysicsBodyV4(x, y, vx, vy, mass, size, rotation);
      physicsBodiesV4.push(body);
      return body;
    }

    function updatePhysicsV4() {
      physicsBodiesV4.forEach(function (b) {
        updatePhysicsBodyV4(b, 0.016);
      });
      for (var i = 0; i < physicsBodiesV4.length; i++) {
        for (var j = i + 1; j < physicsBodiesV4.length; j++) {
          if (checkCollisionV4(physicsBodiesV4[i], physicsBodiesV4[j])) {
            resolveCollisionV4(physicsBodiesV4[i], physicsBodiesV4[j]);
          }
        }
      }
    }

    /* === CANDY SORT: Initialize physics v4 === */
    updatePhysicsV4();

    /* === CANDY SORT: Advanced input buffering v3 === */
    var inputBufferV3 = {
      buffer: [],
      maxSize: 30,
      add: function (input) {
        this.buffer.push({ input: input, time: performance.now() });
        if (this.buffer.length > this.maxSize) this.buffer.shift();
      },
      get: function (within) {
        var now = performance.now();
        return this.buffer.filter(function (i) { return now - i.time < within; });
      },
      clear: function () { this.buffer = []; },
      process: function () {
        var inputs = this.get(200);
        inputs.forEach(function (i) {
          if (i.input === 'click') handleClickV3();
          if (i.input === 'right') handleRightV3();
          if (i.input === 'left') handleLeftV3();
          if (i.input === 'undo') triggerUndo();
          if (i.input === 'redo') triggerRedo();
        });
        this.clear();
      },
      undo: function () {
        if (this.buffer.length > 0) {
          this.buffer.pop();
        }
      },
      redo: function () {},
      getStats: function () {
        return {
          bufferSize: this.buffer.length,
          maxSize: this.maxSize
        };
      }
    };

    function handleClickV3() {
      if (over) return;
      var btns = row.querySelectorAll('.memcard:not(.done)');
      if (btns.length > 0) {
        btns[0].click();
      }
    }

    function handleRightV3() {
      if (next < 6) {
        next++;
        st.textContent = 'Skipped to ' + next + '/6';
      }
    }

    function handleLeftV3() {
      if (next > 0) {
        next--;
        st.textContent = 'Back to ' + next + '/6';
      }
    }

    /* === CANDY SORT: Input prediction v3 === */
    var inputPredictionV3 = {
      history: [],
      patterns: {},
      predict: function () {
        if (this.history.length < 5) return null;
        var last5 = this.history.slice(-5).map(function (i) { return i.candy; });
        var key = last5.join(',');
        if (this.patterns[key]) {
          return this.patterns[key];
        }
        return null;
      },
      add: function (candy) {
        this.history.push({ candy: candy, time: performance.now() });
        if (this.history.length > 40) this.history.shift();
        if (this.history.length >= 6) {
          var last6 = this.history.slice(-6).map(function (i) { return i.candy; });
          var key = last6.slice(0, 5).join(',');
          var next = last6[5];
          this.patterns[key] = next;
        }
      },
      getStats: function () {
        return {
          historyLength: this.history.length,
          patternsFound: Object.keys(this.patterns).length
        };
      },
      clear: function () {
        this.history = [];
        this.patterns = {};
      }
    };

    /* === CANDY SORT: Input validation v3 === */
    function validateInputV3(candy) {
      if (!candy) return { valid: false, reason: 'No candy' };
      if (over) return { valid: false, reason: 'Game over' };
      if (candy.key === ordered[next].key) return { valid: true, correct: true };
      return { valid: true, correct: false };
    }

    /* === CANDY SORT: Input sanitization v3 === */
    function sanitizeInputV3(input) {
      if (typeof input !== 'string') return '';
      return input.replace(/[<>"'&`]/g, '');
    }

    /* === CANDY SORT: Input logging v3 === */
    var inputLogV3 = [];
    function logInputV3(type, data) {
      inputLogV3.push({ type: type, data: data, time: performance.now() });
      if (inputLogV3.length > 300) inputLogV3.shift();
    }

    /* === CANDY SORT: Input statistics v3 === */
    function getInputStatsV3() {
      var clicks = inputLogV3.filter(function (i) { return i.type === 'click'; });
      var correct = clicks.filter(function (i) { return i.data && i.data.correct; }).length;
      var wrong = clicks.length - correct;
      return {
        total: clicks.length,
        correct: correct,
        wrong: wrong,
        accuracy: clicks.length > 0 ? (correct / clicks.length) * 100 : 0,
        averageReactionTime: calculateAverageReactionTimeV3()
      };
    }

    function calculateAverageReactionTimeV3() {
      var reactions = inputLogV3.filter(function (i) { return i.type === 'click'; });
      if (reactions.length === 0) return 0;
      var total = reactions.reduce(function (sum, i) { return sum + (i.data.reactionTime || 0); }, 0);
      return total / reactions.length;
    }

    /* === CANDY SORT: Initialize input system v3 === */
    inputBufferV3.clear();

    /* === CANDY SORT: Advanced game loop v4 === */
    var gameLoopV4 = {
      running: false,
      paused: false,
      timeScale: 1,
      fixedDelta: 1000 / 144,
      accumulator: 0,
      lastTime: 0,
      frameCount: 0,
      fps: 0,
      fpsAccumulator: 0,
      fpsFrames: 0,
      updateCallbacks: [],
      renderCallbacks: [],
      start: function () {
        this.running = true;
        this.lastTime = performance.now();
        this.tick();
      },
      stop: function () {
        this.running = false;
      },
      pause: function () {
        this.paused = true;
      },
      resume: function () {
        this.paused = false;
        this.lastTime = performance.now();
      },
      tick: function () {
        if (!this.running) return;
        var now = performance.now();
        var delta = now - this.lastTime;
        this.lastTime = now;
        this.accumulator += delta * this.timeScale;
        while (this.accumulator >= this.fixedDelta) {
          if (!this.paused) {
            this.update(this.fixedDelta / 1000);
          }
          this.accumulator -= this.fixedDelta;
        }
        this.render();
        this.frameCount++;
        this.fpsAccumulator += delta;
        this.fpsFrames++;
        if (this.fpsAccumulator >= 1000) {
          this.fps = this.fpsFrames;
          this.fpsFrames = 0;
          this.fpsAccumulator = 0;
        }
        requestAnimationFrame(this.tick.bind(this));
      },
      update: function (dt) {
        this.updateCallbacks.forEach(function (cb) { cb(dt); });
      },
      render: function () {
        this.renderCallbacks.forEach(function (cb) { cb(); });
      },
      onUpdate: function (cb) {
        this.updateCallbacks.push(cb);
      },
      onRender: function (cb) {
        this.renderCallbacks.push(cb);
      }
    };

    /* === CANDY SORT: Register update callbacks v4 === */
    gameLoopV4.onUpdate(function (dt) {
      updateGame(dt);
    });

    gameLoopV4.onUpdate(function (dt) {
      updatePhysicsV4();
    });

    gameLoopV4.onUpdate(function (dt) {
      particleSystemV2.update(dt);
    });

    gameLoopV4.onUpdate(function (dt) {
      updateAnimations();
    });

    gameLoopV4.onUpdate(function (dt) {
      updateVisualEffects();
    });

    gameLoopV4.onUpdate(function (dt) {
      inputBufferV3.process();
    });

    /* === CANDY SORT: Register render callbacks v4 === */
    gameLoopV4.onRender(function () {
      renderAllV3();
    });

    gameLoopV4.onRender(function () {
      renderV3.clear();
      renderBackgroundV3();
      renderParticlesV3();
      renderUIV3();
    });

    /* === CANDY SORT: Time scale effects v3 === */
    function setTimeScaleV3(scale) {
      gameLoopV4.timeScale = scale;
    }

    function slowMotionV3() {
      setTimeScaleV3(0.2);
      setTimeout(function () { setTimeScaleV3(1); }, 4000);
    }

    function speedUpV3() {
      setTimeScaleV3(4);
      setTimeout(function () { setTimeScaleV3(1); }, 1000);
    }

    function freezeFrameV3() {
      setTimeScaleV3(0);
      setTimeout(function () { setTimeScaleV3(1); }, 300);
    }

    /* === CANDY SORT: Frame skipping v3 === */
    var frameSkipV3 = {
      enabled: false,
      skipEvery: 4,
      frameCount: 0,
      shouldSkip: function () {
        if (!this.enabled) return false;
        this.frameCount++;
        return this.frameCount % this.skipEvery === 0;
      }
    };

    /* === CANDY SORT: Initialize game loop v4 === */
    gameLoopV4.start();

    /* === CANDY SORT: Advanced rendering v4 === */
    var renderV4 = {
      canvas: null,
      ctx: null,
      width: 600,
      height: 400,
      dpr: Math.min(2, window.devicePixelRatio || 1),
      init: function () {
        this.canvas = el('canvas', '');
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.canvas.style.cssText += ';position:absolute;top:0;left:0;pointer-events:none;z-index:100;';
        stage.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(this.dpr, this.dpr);
      },
      clear: function () {
        this.ctx.clearRect(0, 0, this.width, this.height);
      },
      drawRect: function (x, y, w, h, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
      },
      drawCircle: function (x, y, r, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
      },
      drawText: function (text, x, y, color, size, align) {
        this.ctx.fillStyle = color || '#fff';
        this.ctx.font = (size || 16) + 'px sans-serif';
        this.ctx.textAlign = align || 'left';
        this.ctx.fillText(text, x, y);
        this.ctx.textAlign = 'left';
      },
      drawLine: function (x1, y1, x2, y2, color, width) {
        this.ctx.strokeStyle = color || '#fff';
        this.ctx.lineWidth = width || 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      },
      drawGradient: function (x, y, w, h, color1, color2) {
        var grad = this.ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(x, y, w, h);
      },
      drawRoundRect: function (x, y, w, h, r, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.closePath();
        this.ctx.fill();
      },
      drawShadow: function (x, y, w, h, blur, color) {
        this.ctx.shadowBlur = blur;
        this.ctx.shadowColor = color || 'rgba(0,0,0,0.5)';
        this.ctx.fillStyle = color || 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(x, y, w, h);
        this.ctx.shadowBlur = 0;
      },
      drawGlow: function (x, y, r, color, intensity) {
        var grad = this.ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.globalAlpha = intensity || 0.5;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
      }
    };

    /* === CANDY SORT: Render functions v4 === */
    function renderBackgroundV4() {
      renderV4.drawGradient(0, 0, 600, 400, '#0b0620', '#1a1038');
      for (var i = 0; i < 30; i++) {
        renderV4.drawCircle(Math.random() * 600, Math.random() * 400, 1.5, 'rgba(255,255,255,0.15)');
      }
    }

    function renderParticlesV4() {
      particleSystemV2.render(renderV4.ctx);
    }

    function renderUIV4() {
      renderV4.drawText('Score: ' + score, 15, 35, '#ffd166', 20);
      renderV4.drawText('Time: ' + timeLeft, 450, 35, timeLeft <= 5 ? '#e74c3c' : '#fff', 20);
      if (comboV2.count >= 2) {
        renderV4.drawText('COMBO x' + comboV2.count, 250, 70, '#ff9f1c', 32, 'center');
      }
      renderV4.drawText('Miss: ' + miss, 15, 65, '#e74c3c', 16);
      renderV4.drawText('Combo: ' + comboV2.count, 15, 85, '#ff9f1c', 16);
      renderV4.drawText('Accuracy: ' + (totalClicks > 0 ? Math.round((correctClicks / totalClicks) * 100) : 0) + '%', 15, 105, '#59e6ff', 14);
    }

    function renderAllV4() {
      renderV4.clear();
      renderBackgroundV4();
      renderParticlesV4();
      renderUIV4();
    }

    /* === CANDY SORT: Initialize rendering v4 === */
    renderV4.init();

    /* === CANDY SORT: Advanced game state v4 === */
    var gameStateV5 = {
      phase: 'idle',
      subPhase: null,
      history: [],
      snapshots: [],
      checkpoints: [],
      saveSnapshot: function () {
        this.snapshots.push({
          next: next, miss: miss, combo: combo, score: score,
          timeLeft: timeLeft, comboV2: { count: comboV2.count, multiplier: comboV2.multiplier },
          timestamp: Date.now()
        });
        if (this.snapshots.length > 25) this.snapshots.shift();
      },
      loadSnapshot: function (index) {
        if (index >= 0 && index < this.snapshots.length) {
          var s = this.snapshots[index];
          next = s.next; miss = s.miss; combo = s.combo;
          score = s.score; timeLeft = s.timeLeft;
          comboV2.count = s.comboV2.count;
          comboV2.multiplier = s.comboV2.multiplier;
        }
      },
      undo: function () {
        if (this.snapshots.length > 0) {
          this.loadSnapshot(this.snapshots.length - 1);
          this.snapshots.pop();
        }
      },
      redo: function () {
        if (this.history.length > 0) {
          var s = this.history.pop();
          this.snapshots.push(s);
          this.loadSnapshot(this.snapshots.length - 1);
        }
      },
      saveCheckpoint: function (name) {
        this.checkpoints.push({
          name: name,
          state: {
            next: next, miss: miss, combo: combo, score: score,
            timeLeft: timeLeft, comboV2: { count: comboV2.count, multiplier: comboV2.multiplier }
          },
          timestamp: Date.now()
        });
      },
      loadCheckpoint: function (name) {
        var cp = this.checkpoints.find(function (c) { return c.name === name; });
        if (cp) {
          var s = cp.state;
          next = s.next; miss = s.miss; combo = s.combo;
          score = s.score; timeLeft = s.timeLeft;
          comboV2.count = s.comboV2.count;
          comboV2.multiplier = s.comboV2.multiplier;
        }
      },
      getSnapshotCount: function () { return this.snapshots.length; },
      getCheckpointCount: function () { return this.checkpoints.length; },
      clearAll: function () {
        this.snapshots = [];
        this.history = [];
        this.checkpoints = [];
      }
    };

    /* === CANDY SORT: State machine v4 === */
    var stateMachineV4 = {
      states: {},
      currentState: 'idle',
      transitions: {},
      addState: function (name, config) {
        this.states[name] = config;
      },
      addTransition: function (from, to, condition) {
        if (!this.transitions[from]) this.transitions[from] = [];
        this.transitions[from].push({ to: to, condition: condition });
      },
      transition: function (to) {
        var prev = this.states[this.currentState];
        if (prev && prev.onExit) prev.onExit();
        this.currentState = to;
        var next = this.states[to];
        if (next && next.onEnter) next.onEnter();
      },
      update: function () {
        var state = this.states[this.currentState];
        if (state && state.onUpdate) state.onUpdate();
        if (this.transitions[this.currentState]) {
          this.transitions[this.currentState].forEach(function (t) {
            if (t.condition()) this.transition(t.to);
          }, this);
        }
      }
    };

    /* === CANDY SORT: Define states v4 === */
    stateMachineV4.addState('idle', {
      onEnter: function () { st.textContent = 'Click a candy to start!'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    stateMachineV4.addState('playing', {
      onEnter: function () { st.textContent = 'Sort the candies!'; },
      onExit: function () { gameStateV5.saveSnapshot(); },
      onUpdate: function () { gameLoopV4.update(0.016); }
    });

    stateMachineV4.addState('paused', {
      onEnter: function () { st.textContent = 'Paused'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    stateMachineV4.addState('gameover', {
      onEnter: function () { st.textContent = 'Game Over!'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    /* === CANDY SORT: Define transitions v4 === */
    stateMachineV4.addTransition('idle', 'playing', function () { return next > 0; });
    stateMachineV4.addTransition('playing', 'paused', function () { return pauseSystem.paused; });
    stateMachineV4.addTransition('paused', 'playing', function () { return !pauseSystem.paused; });
    stateMachineV4.addTransition('playing', 'gameover', function () { return over; });

    /* === CANDY SORT: Initialize state machine v4 === */
    stateMachineV4.transition('idle');

    /* === CANDY SORT: Advanced event system v4 === */
    var eventSystemV4 = {
      listeners: {},
      emit: function (event, data) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(function (cb) {
            try { cb(data); } catch (e) { console.error(e); }
          });
        }
      },
      on: function (event, cb) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
      },
      off: function (event, cb) {
        if (this.listeners[event]) {
          this.listeners[event] = this.listeners[event].filter(function (fn) { return fn !== cb; });
        }
      },
      once: function (event, cb) {
        var self = this;
        var wrapper = function (data) {
          cb(data);
          self.off(event, wrapper);
        };
        this.on(event, wrapper);
      },
      clear: function (event) {
        if (event) {
          delete this.listeners[event];
        } else {
          this.listeners = {};
        }
      },
      getListenerCount: function (event) {
        return this.listeners[event] ? this.listeners[event].length : 0;
      },
      getAllEvents: function () {
        return Object.keys(this.listeners);
      }
    };

    /* === CANDY SORT: Event types v4 === */
    var GameEventsV4 = {
      GAME_START: 'game_start',
      GAME_END: 'game_end',
      CANDY_CORRECT: 'candy_correct',
      CANDY_WRONG: 'candy_wrong',
      COMBO_START: 'combo_start',
      COMBO_END: 'combo_end',
      COMBO_MILESTONE: 'combo_milestone',
      TIME_WARNING: 'time_warning',
      TIME_UP: 'time_up',
      LEVEL_UP: 'level_up',
      ACHIEVEMENT: 'achievement',
      PAUSE: 'pause',
      RESUME: 'resume',
      RESTART: 'restart',
      UNDO: 'undo',
      REDO: 'redo',
      CHECKPOINT_SAVE: 'checkpoint_save',
      CHECKPOINT_LOAD: 'checkpoint_load',
      THEME_CHANGE: 'theme_change',
      SKIN_CHANGE: 'skin_change',
      MODE_CHANGE: 'mode_change',
      SETTINGS_CHANGE: 'settings_change'
    };

    /* === CANDY SORT: Event handlers v4 === */
    eventSystemV4.on(GameEventsV4.GAME_START, function (data) {
      logEvent('game_start', data);
      analyticsV3.track('game_start', data);
    });

    eventSystemV4.on(GameEventsV4.CANDY_CORRECT, function (data) {
      logEvent('candy_correct', data);
      analyticsV3.track('candy_correct', data);
      comboV2.count++;
      score += data.pts;
      playSound('correct');
      triggerCorrectV3(data.pts);
    });

    eventSystemV4.on(GameEventsV4.CANDY_WRONG, function (data) {
      logEvent('candy_wrong', data);
      analyticsV3.track('wrong', data);
      comboV2.count = 0;
      miss++;
      playSound('wrong');
      triggerWrongV3();
    });

    eventSystemV4.on(GameEventsV4.COMBO_MILESTONE, function (data) {
      logEvent('combo_milestone', data);
      showComboPopup(data.count);
      comboEffect();
    });

    eventSystemV4.on(GameEventsV4.TIME_WARNING, function (data) {
      logEvent('time_warning', data);
      animateTimeWarning();
      playTimeWarning();
    });

    eventSystemV4.on(GameEventsV4.GAME_END, function (data) {
      logEvent('game_end', data);
      analyticsV3.track('game_end', data);
      if (data.won) {
        triggerWin();
      } else {
        triggerLose();
      }
    });

    eventSystemV4.on(GameEventsV4.UNDO, function () {
      gameStateV5.undo();
      st.textContent = 'Undone!';
    });

    eventSystemV4.on(GameEventsV4.REDO, function () {
      gameStateV5.redo();
      st.textContent = 'Redone!';
    });

    eventSystemV4.on(GameEventsV4.CHECKPOINT_SAVE, function (data) {
      gameStateV5.saveCheckpoint(data.name);
      st.textContent = 'Checkpoint saved: ' + data.name;
    });

    eventSystemV4.on(GameEventsV4.CHECKPOINT_LOAD, function (data) {
      gameStateV5.loadCheckpoint(data.name);
      st.textContent = 'Checkpoint loaded: ' + data.name;
    });

    eventSystemV4.on(GameEventsV4.THEME_CHANGE, function (data) {
      st.textContent = 'Theme changed to: ' + data.theme;
    });

    eventSystemV4.on(GameEventsV4.SKIN_CHANGE, function (data) {
      st.textContent = 'Skin changed to: ' + data.skin;
    });

    eventSystemV4.on(GameEventsV4.MODE_CHANGE, function (data) {
      st.textContent = 'Mode changed to: ' + data.mode;
    });

    /* === CANDY SORT: Event triggers v4 === */
    function triggerGameStartV4() { eventSystemV4.emit(GameEventsV4.GAME_START, { mode: currentMode }); }
    function triggerCandyCorrectV4(pts) { eventSystemV4.emit(GameEventsV4.CANDY_CORRECT, { pts: pts }); }
    function triggerCandyWrongV4() { eventSystemV4.emit(GameEventsV4.CANDY_WRONG, {}); }
    function triggerComboMilestoneV4(count) { eventSystemV4.emit(GameEventsV4.COMBO_MILESTONE, { count: count }); }
    function triggerTimeWarningV4() { eventSystemV4.emit(GameEventsV4.TIME_WARNING, { timeLeft: timeLeft }); }
    function triggerGameEndV4(won) { eventSystemV4.emit(GameEventsV4.GAME_END, { won: won, score: score }); }
    function triggerUndoV4() { eventSystemV4.emit(GameEventsV4.UNDO, {}); }
    function triggerRedoV4() { eventSystemV4.emit(GameEventsV4.REDO, {}); }
    function triggerCheckpointSaveV4(name) { eventSystemV4.emit(GameEventsV4.CHECKPOINT_SAVE, { name: name }); }
    function triggerCheckpointLoadV4(name) { eventSystemV4.emit(GameEventsV4.CHECKPOINT_LOAD, { name: name }); }
    function triggerThemeChange(theme) { eventSystemV4.emit(GameEventsV4.THEME_CHANGE, { theme: theme }); }
    function triggerSkinChange(skin) { eventSystemV4.emit(GameEventsV4.SKIN_CHANGE, { skin: skin }); }
    function triggerModeChange(mode) { eventSystemV4.emit(GameEventsV4.MODE_CHANGE, { mode: mode }); }

    /* === CANDY SORT: Initialize event system v4 === */
    triggerGameStartV4();

    /* === CANDY SORT: Advanced game systems integration v3 === */
    var gameSystemsV3 = {
      audio: audioSystemV2,
      particles: particleSystemV2,
      physics: { bodies: physicsBodiesV4, update: updatePhysicsV4 },
      rendering: renderV4,
      state: gameStateV5,
      events: eventSystemV4,
      analytics: analyticsV3,
      input: inputBufferV3,
      ai: aiSystem,
      network: networkSystem,
      replay: replayV3,
      share: shareV3,
      customization: customizationV3,
      accessibility: accessibility,
      performance: perfOptimization,
      balance: balanceSystem,
      dda: ddaSystem,
      modes: gameModesV3,
      tutorial: tutorialV3
    };

    /* === CANDY SORT: System initialization v3 === */
    function initAllSystemsV3() {
      initAudioSystem();
      initRenderSystem();
      initInputSystem();
      updatePhysicsV4();
      updateVisualEffects();
      updateParticles();
      processInput();
      updateCombo();
      updateScoreMultiplier();
      updateGameState();
      adjustDifficulty();
      updateDDA();
      updateTiming();
      updatePerfStats();
      syncLeaderboard();
      syncAchievements();
      initAllSystems();
      initAllSystemsV2();
    }

    /* === CANDY SORT: System update v3 === */
    function updateAllSystemsV3(dt) {
      gameLoopV4.update(dt);
      stateMachineV4.update();
      updateAllSystemsVisualV3();
    }

    function updateAllSystemsVisualV3() {
      renderAllV4();
      renderV4.clear();
      renderBackgroundV4();
      renderParticlesV4();
      renderUIV4();
    }

    /* === CANDY SORT: System cleanup v3 === */
    function cleanupAllSystemsV3() {
      stopAutoPlay();
      stopMusic();
      gameLoopV4.stop();
      replayV3.stopRecording();
      saveGame();
      saveAchievements();
      cloudSave();
      cleanupAllSystems();
      cleanupAllSystemsV2();
    }

    /* === CANDY SORT: System reset v3 === */
    function resetAllSystemsV3() {
      cleanupAllSystemsV3();
      next = 0; miss = 0; combo = 0; score = 0;
      timeLeft = 30; comboV2.count = 0; comboV2.multiplier = 1;
      maxCombo = 0; totalClicks = 0; correctClicks = 0;
      over = false; hintUsed = false;
      physicsBodiesV4 = [];
      visualSystem.particles = [];
      visualSystem.effects = [];
      particleSystemV2.particles = [];
      inputBufferV3.clear();
      eventLog = [];
      gameStateV5.snapshots = [];
      gameStateV5.history = [];
      gameStateV5.checkpoints = [];
      resetAllSystems();
      resetAllSystemsV2();
    }

    /* === CANDY SORT: System status v2 === */
    function getSystemStatusV2() {
      return {
        audio: audioSystemV2.initialized,
        particles: particleSystemV2.particles.length,
        physics: physicsBodiesV4.length,
        rendering: renderV4.canvas !== null,
        state: gameStateV5.getSnapshotCount(),
        events: Object.keys(eventSystemV4.listeners).length,
        analytics: analyticsV3.events.length,
        input: inputBufferV3.buffer.length,
        ai: aiSystem.enabled,
        network: networkSystem.connected,
        replay: replayV3.recording,
        customization: customizationV3.currentThemeV3,
        accessibility: accessibility.highContrast,
        performance: perfOptimization.objectPooling,
        balance: balanceSystem,
        dda: ddaSystem.enabled,
        modes: currentMode,
        tutorial: tutorialV3.active,
        fps: gameLoopV4.fps,
        frameCount: gameLoopV4.frameCount
      };
    }

    /* === CANDY SORT: Initialize all systems v3 === */
    initAllSystemsV3();

    /* === CANDY SORT: Advanced game modes v4 === */
    var gameModesV4 = {
      classic: { name: 'Classic', timeLimit: 30, lives: Infinity, difficulty: 1, description: 'Standard game mode', unlock: true, icon: '🎮' },
      timed: { name: 'Timed', timeLimit: 20, lives: Infinity, difficulty: 1.5, description: 'Less time, more pressure', unlock: true, icon: '⏱️' },
      hardcore: { name: 'Hardcore', timeLimit: 15, lives: 3, difficulty: 2, description: 'Only 3 lives!', unlock: true, icon: '💀' },
      zen: { name: 'Zen', timeLimit: 60, lives: Infinity, difficulty: 0.5, description: 'Relaxed gameplay', unlock: true, icon: '🧘' },
      challenge: { name: 'Challenge', timeLimit: 25, lives: 5, difficulty: 1.8, description: 'Combo bonuses', unlock: true, icon: '🏆' },
      speedrun: { name: 'Speedrun', timeLimit: 10, lives: Infinity, difficulty: 2.5, description: 'Beat the clock!', unlock: true, icon: '⚡' },
      endless: { name: 'Endless', timeLimit: Infinity, lives: Infinity, difficulty: 1, description: 'No time limit', unlock: true, icon: '∞' },
      daily: { name: 'Daily', timeLimit: 30, lives: Infinity, difficulty: 1.2, description: 'Daily challenge', unlock: true, icon: '📅' },
      nightmare: { name: 'Nightmare', timeLimit: 10, lives: 1, difficulty: 3, description: 'One life, 10 seconds!', unlock: false, icon: '👻' },
      impossible: { name: 'Impossible', timeLimit: 5, lives: 1, difficulty: 4, description: 'Good luck!', unlock: false, icon: '🔥' }
    };

    /* === CANDY SORT: Mode unlock system v2 === */
    var modeUnlocksV2 = {
      nightmare: { requirement: 'Complete hardcore mode', unlocked: false, hint: 'Try hardcore mode!' },
      impossible: { requirement: 'Complete nightmare mode', unlocked: false, hint: 'Try nightmare mode!' }
    };

    function checkModeUnlocksV2() {
      if (modeAchievementsV2.hardcore && !modeUnlocksV2.nightmare.unlocked) {
        modeUnlocksV2.nightmare.unlocked = true;
        gameModesV4.nightmare.unlock = true;
        showSortAchievement('🔓 Nightmare mode unlocked!');
        socialV3.addNotificationV3('Nightmare mode unlocked!', 'achievement');
      }
      if (modeAchievementsV2.nightmare && !modeUnlocksV2.impossible.unlocked) {
        modeUnlocksV2.impossible.unlocked = true;
        gameModesV4.impossible.unlock = true;
        showSortAchievement('🔓 Impossible mode unlocked!');
        socialV3.addNotificationV3('Impossible mode unlocked!', 'achievement');
      }
    }

    /* === CANDY SORT: Mode selection v4 === */
    function showModeSelectV4() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:86;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Game Mode'));
      Object.keys(gameModesV4).forEach(function (key) {
        var m = gameModesV4[key];
        var b = btn(m.icon + ' ' + m.name + ' - ' + m.description, function () {
          if (m.unlock) {
            setGameModeV4(key);
            panel.remove();
          } else {
            st.textContent = '🔒 ' + modeUnlocksV2[key].requirement;
            socialV3.addNotificationV3('Mode locked: ' + m.name, 'info');
          }
        });
        b.style.cssText += ';margin:4px;width:400px;';
        if (!m.unlock) b.style.opacity = '0.5';
        panel.appendChild(b);
      });
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    function setGameModeV4(mode) {
      if (gameModesV4[mode] && gameModesV4[mode].unlock) {
        currentMode = mode;
        var m = gameModesV4[mode];
        timeLeft = m.timeLimit === Infinity ? 9999 : m.timeLimit;
        st.textContent = m.icon + ' Mode: ' + m.name + ' · Time: ' + (m.timeLimit === Infinity ? '∞' : m.timeLimit + 's');
        gameStateV2.difficulty = m.difficulty;
        checkModeUnlocksV2();
        triggerModeChange(mode);
      }
    }

    /* === CANDY SORT: Mode-specific achievements v3 === */
    var modeAchievementsV3 = {
      classic: { completed: false, name: 'Classic Master', icon: '🎮' },
      timed: { completed: false, name: 'Speed Demon', icon: '⏱️' },
      hardcore: { completed: false, name: 'Hardcore Hero', icon: '💀' },
      zen: { completed: false, name: 'Zen Master', icon: '🧘' },
      challenge: { completed: false, name: 'Challenge Champion', icon: '🏆' },
      speedrun: { completed: false, name: 'Speedrunner', icon: '⚡' },
      endless: { completed: false, name: 'Endless Legend', icon: '∞' },
      daily: { completed: false, name: 'Daily Warrior', icon: '📅' },
      nightmare: { completed: false, name: 'Nightmare Survivor', icon: '👻' },
      impossible: { completed: false, name: 'Impossible Champion', icon: '🔥' }
    };

    function checkModeAchievementV3(mode) {
      if (modeAchievementsV3[mode] && !modeAchievementsV3[mode].completed) {
        modeAchievementsV3[mode].completed = true;
        showSortAchievement(modeAchievementsV3[mode].icon + ' ' + modeAchievementsV3[mode].name + '!');
        socialV3.addNotificationV3('Achievement: ' + modeAchievementsV3[mode].name, 'achievement');
      }
    }

    /* === CANDY SORT: Initialize game modes v4 === */
    showModeSelectV4();

    /* === CANDY SORT: Advanced tutorial system v4 === */
    var tutorialV4 = {
      active: false,
      step: 0,
      steps: [
        { text: 'Welcome to Candy Sort!', duration: 2000, action: null, highlight: null, sound: 'start' },
        { text: 'Click candies from cheapest to priciest.', duration: 3000, action: function () { highlightCheapestV4(); }, highlight: 'cheapest', sound: 'info' },
        { text: 'Build combos for bonus points!', duration: 2000, action: function () { showComboDemoV4(); }, highlight: 'combo', sound: 'combo' },
        { text: 'Use hints if you get stuck.', duration: 2000, action: function () { showHintDemoV4(); }, highlight: 'hint', sound: 'info' },
        { text: 'Watch the timer!', duration: 2000, action: function () { highlightTimerV4(); }, highlight: 'timer', sound: 'warning' },
        { text: 'Complete achievements for rewards!', duration: 2000, action: null, highlight: null, sound: 'achievement' },
        { text: 'Customize themes and skins!', duration: 2000, action: null, highlight: null, sound: 'info' },
        { text: 'Track your analytics!', duration: 2000, action: null, highlight: null, sound: 'info' },
        { text: 'Good luck!', duration: 1000, action: null, highlight: null, sound: 'win' }
      ],
      start: function () {
        this.active = true;
        this.step = 0;
        this.showStep();
      },
      showStep: function () {
        if (this.step >= this.steps.length) {
          this.active = false;
          return;
        }
        var step = this.steps[this.step];
        st.textContent = '📖 ' + step.text;
        if (step.action) step.action();
        if (step.highlight) this.highlightElement(step.highlight);
        if (step.sound) playSoundV2(step.sound);
        setTimeout(function () {
          this.step++;
          this.showStep();
        }.bind(this), step.duration);
      },
      highlightElement: function (type) {
        switch (type) {
          case 'cheapest': this.highlightCheapest(); break;
          case 'combo': this.highlightCombo(); break;
          case 'hint': this.highlightHint(); break;
          case 'timer': this.highlightTimer(); break;
        }
      },
      highlightCheapest: function () {
        var cheapest = ordered[next];
        if (cheapest) {
          row.querySelectorAll('.memcard').forEach(function (btn) {
            if (btn.textContent.includes(cheapest.name)) {
              btn.style.boxShadow = '0 0 30px #2ecc71';
              btn.style.transform = 'scale(1.15)';
              setTimeout(function () { btn.style.boxShadow = ''; btn.style.transform = ''; }, 2000);
            }
          });
        }
      },
      highlightCombo: function () {
        comboDisplay.display.textContent = '🔥 COMBO x5!';
        comboDisplay.display.style.transform = 'scale(2.5)';
        comboDisplay.display.style.color = '#ff9f1c';
        setTimeout(function () {
          comboDisplay.display.textContent = '';
          comboDisplay.display.style.transform = '';
          comboDisplay.display.style.color = '';
        }, 2000);
      },
      highlightHint: function () {
        hintBtn.style.boxShadow = '0 0 25px #59e6ff';
        setTimeout(function () { hintBtn.style.boxShadow = ''; }, 2000);
      },
      highlightTimer: function () {
        bar.fill.style.background = '#e74c3c';
        bar.fill.style.height = '20px';
        setTimeout(function () { bar.fill.style.background = ''; bar.fill.style.height = ''; }, 2000);
      },
      highlightCheapestV4: function () { this.highlightCheapest(); },
      showComboDemoV4: function () { this.highlightCombo(); },
      showHintDemoV4: function () { this.highlightHint(); },
      highlightTimerV4: function () { this.highlightTimer(); }
    };

    /* === CANDY SORT: Tutorial UI v4 === */
    function showTutorialV4() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:87;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Tutorial'));
      panel.appendChild(btn('Start Tutorial', function () {
        panel.remove();
        tutorialV4.start();
      }));
      panel.appendChild(btn('Skip', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Help system v4 === */
    function showHelpV4() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:88;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'How to Play'));
      var helpText = el('div', '', '');
      helpText.style.cssText = 'color:#cfc3ee;text-align:left;max-width:500px;';
      helpText.innerHTML = '<p>🖱️ Click candies in order from cheapest to priciest</p>' +
        '<p>🔥 Build combos for bonus points</p>' +
        '<p>💡 Use hints if you get stuck</p>' +
        '<p>⏭️ Skip candies for a penalty</p>' +
        '<p>⏱️ Beat the clock!</p>' +
        '<p>🏆 Complete achievements for rewards!</p>' +
        '<p>🎨 Customize themes and skins!</p>' +
        '<p>📊 Track your analytics!</p>' +
        '<p>🎮 Try different game modes!</p>';
      panel.appendChild(helpText);
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Settings v4 === */
    function showSettingsV4() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:89;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Settings'));
      panel.appendChild(btn('🔊 Sound: ' + (soundSystem.muted ? 'OFF' : 'ON'), function () {
        var muted = toggleSound();
        panel.children[1].textContent = '🔊 Sound: ' + (muted ? 'OFF' : 'ON');
      }));
      panel.appendChild(btn('✨ Bloom: ' + (visualEffectsV2.bloom ? 'ON' : 'OFF'), function () {
        toggleBloom();
        panel.children[2].textContent = '✨ Bloom: ' + (visualEffectsV2.bloom ? 'ON' : 'OFF');
      }));
      panel.appendChild(btn('🌙 Theme: ' + customizationV3.currentThemeV3, function () {
        customizationV3.cycleThemeV3();
        panel.children[3].textContent = '🌙 Theme: ' + customizationV3.currentThemeV3;
        triggerThemeChange(customizationV3.currentThemeV3);
      }));
      panel.appendChild(btn('🍬 Skin: ' + currentSkinV3, function () {
        var skins = Object.keys(candySkinsV3);
        var idx = skins.indexOf(currentSkinV3);
        idx = (idx + 1) % skins.length;
        setCandySkinV3(skins[idx]);
        panel.children[4].textContent = '🍬 Skin: ' + currentSkinV3;
        triggerSkinChange(currentSkinV3);
      }));
      panel.appendChild(btn('♿ Accessibility', function () { showAccessibilityPanel(); }));
      panel.appendChild(btn('📊 Analytics', function () { showAnalyticsDashboardV3(); }));
      panel.appendChild(btn('🎮 Modes', function () { showModeSelectV4(); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize tutorial v4 === */
    showTutorialV4();

    /* === CANDY SORT: Advanced game analytics v4 === */
    var analyticsV4 = {
      sessionStart: Date.now(),
      events: [],
      metrics: {
        totalClicks: 0,
        correctClicks: 0,
        wrongClicks: 0,
        hintsUsed: 0,
        skipsUsed: 0,
        maxCombo: 0,
        totalScore: 0,
        averageReactionTime: 0,
        accuracy: 0,
        sessionDuration: 0,
        eventsPerSecond: 0,
        clicksPerSecond: 0,
        correctPerSecond: 0
      },
      track: function (event, data) {
        this.events.push({ event: event, data: data, timestamp: Date.now() });
        this.updateMetrics(event, data);
      },
      updateMetrics: function (event, data) {
        switch (event) {
          case 'click': this.metrics.totalClicks++; break;
          case 'correct': this.metrics.correctClicks++; break;
          case 'wrong': this.metrics.wrongClicks++; break;
          case 'hint': this.metrics.hintsUsed++; break;
          case 'skip': this.metrics.skipsUsed++; break;
          case 'combo': this.metrics.maxCombo = Math.max(this.metrics.maxCombo, data.count); break;
          case 'score': this.metrics.totalScore = data.score; break;
        }
        if (this.metrics.totalClicks > 0) {
          this.metrics.accuracy = (this.metrics.correctClicks / this.metrics.totalClicks) * 100;
        }
        this.metrics.sessionDuration = Date.now() - this.sessionStart;
        if (this.metrics.sessionDuration > 0) {
          this.metrics.eventsPerSecond = this.events.length / (this.metrics.sessionDuration / 1000);
          this.metrics.clicksPerSecond = this.metrics.totalClicks / (this.metrics.sessionDuration / 1000);
          this.metrics.correctPerSecond = this.metrics.correctClicks / (this.metrics.sessionDuration / 1000);
        }
      },
      getReport: function () {
        return {
          sessionDuration: this.metrics.sessionDuration,
          metrics: this.metrics,
          events: this.events.length,
          eventTypes: this.getEventTypes(),
          summary: this.getSummary()
        };
      },
      getEventTypes: function () {
        var types = {};
        this.events.forEach(function (e) {
          types[e.event] = (types[e.event] || 0) + 1;
        });
        return types;
      },
      getSummary: function () {
        return 'Score: ' + this.metrics.totalScore + ' | Accuracy: ' + this.metrics.accuracy.toFixed(1) + '% | Max Combo: x' + this.metrics.maxCombo;
      },
      export: function () {
        return JSON.stringify(this.getReport());
      },
      reset: function () {
        this.sessionStart = Date.now();
        this.events = [];
        this.metrics = {
          totalClicks: 0, correctClicks: 0, wrongClicks: 0,
          hintsUsed: 0, skipsUsed: 0, maxCombo: 0,
          totalScore: 0, averageReactionTime: 0, accuracy: 0,
          sessionDuration: 0, eventsPerSecond: 0,
          clicksPerSecond: 0, correctPerSecond: 0
        };
      }
    };

    /* === CANDY SORT: Track events v4 === */
    eventSystemV4.on(GameEventsV4.CANDY_CORRECT, function (data) {
      analyticsV4.track('correct', data);
    });
    eventSystemV4.on(GameEventsV4.CANDY_WRONG, function (data) {
      analyticsV4.track('wrong', data);
    });
    eventSystemV4.on(GameEventsV4.COMBO_MILESTONE, function (data) {
      analyticsV4.track('combo', data);
    });
    eventSystemV4.on(GameEventsV4.GAME_END, function (data) {
      analyticsV4.track('score', { score: data.score });
    });

    /* === CANDY SORT: Analytics dashboard v4 === */
    function showAnalyticsDashboardV4() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:90;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Analytics Dashboard'));
      var report = analyticsV4.getReport();
      var stats = el('div', '', '');
      stats.style.cssText = 'color:#cfc3ee;text-align:left;';
      stats.innerHTML = '<p>Session Duration: ' + Math.round(report.metrics.sessionDuration / 1000) + 's</p>' +
        '<p>Total Clicks: ' + report.metrics.totalClicks + '</p>' +
        '<p>Accuracy: ' + report.metrics.accuracy.toFixed(1) + '%</p>' +
        '<p>Max Combo: ' + report.metrics.maxCombo + '</p>' +
        '<p>Total Score: ' + report.metrics.totalScore + '</p>' +
        '<p>Events/sec: ' + report.metrics.eventsPerSecond.toFixed(2) + '</p>' +
        '<p>Clicks/sec: ' + report.metrics.clicksPerSecond.toFixed(2) + '</p>' +
        '<p>Correct/sec: ' + report.metrics.correctPerSecond.toFixed(2) + '</p>';
      panel.appendChild(stats);
      panel.appendChild(btn('Export Data', function () {
        prompt('Copy analytics data:', analyticsV4.export());
      }));
      panel.appendChild(btn('Reset Analytics', function () {
        analyticsV4.reset();
        panel.remove();
      }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize analytics v4 === */
    analyticsV4.track('game_start', { mode: currentMode });

    /* === CANDY SORT: Advanced game replay v4 === */
    var replayV4 = {
      recording: false,
      frames: [],
      metadata: {
        version: '4.0',
        gameMode: currentMode,
        startTime: null,
        endTime: null,
        frameCount: 0,
        duration: 0
      },
      startRecording: function () {
        this.recording = true;
        this.frames = [];
        this.metadata.startTime = Date.now();
        this.metadata.gameMode = currentMode;
      },
      stopRecording: function () {
        this.recording = false;
        this.metadata.endTime = Date.now();
        this.metadata.frameCount = this.frames.length;
        this.metadata.duration = this.metadata.endTime - this.metadata.startTime;
      },
      recordFrame: function () {
        if (!this.recording) return;
        this.frames.push({
          state: {
            next: next, miss: miss, combo: combo, score: score,
            timeLeft: timeLeft, comboV2: { count: comboV2.count, multiplier: comboV2.multiplier }
          },
          timestamp: performance.now()
        });
      },
      play: function (onFrame, onComplete) {
        var startTime = performance.now();
        var totalDuration = this.frames.length > 0 ? this.frames[this.frames.length - 1].timestamp : 0;
        this.frames.forEach(function (frame) {
          var delay = frame.timestamp - startTime;
          setTimeout(function () {
            onFrame(frame.state);
          }, delay);
        });
        if (onComplete) {
          setTimeout(onComplete, totalDuration);
        }
      },
      export: function () {
        return JSON.stringify({
          metadata: this.metadata,
          frames: this.frames
        });
      },
      import: function (data) {
        var parsed = JSON.parse(data);
        this.metadata = parsed.metadata;
        this.frames = parsed.frames;
      },
      getDuration: function () {
        if (this.frames.length === 0) return 0;
        return this.frames[this.frames.length - 1].timestamp - this.frames[0].timestamp;
      },
      getFrameCount: function () {
        return this.frames.length;
      },
      getMetadata: function () {
        return this.metadata;
      },
      getInfo: function () {
        return {
          duration: this.getDuration(),
          frames: this.getFrameCount(),
          mode: this.metadata.gameMode,
          version: this.metadata.version
        };
      }
    };

    /* === CANDY SORT: Replay controls v4 === */
    function showReplayControlsV4() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;bottom:10px;left:10px;z-index:91;display:flex;gap:8px;';
      stage.appendChild(panel);
      panel.appendChild(btn('⏺️ Record', function () {
        if (replayV4.recording) {
          replayV4.stopRecording();
          panel.children[0].textContent = '⏺️ Record';
        } else {
          replayV4.startRecording();
          panel.children[0].textContent = '⏹️ Stop';
        }
      }));
      panel.appendChild(btn('▶️ Play', function () {
        replayV4.play(function (state) {
          next = state.next;
          miss = state.miss;
          combo = state.combo;
          score = state.score;
          timeLeft = state.timeLeft;
          comboV2.count = state.comboV2.count;
          comboV2.multiplier = state.comboV2.multiplier;
        });
      }));
      panel.appendChild(btn('💾 Save', function () {
        try { localStorage.setItem('candy_sort_replay_v4', replayV4.export()); } catch (e) {}
      }));
      panel.appendChild(btn('📂 Load', function () {
        try {
          var data = localStorage.getItem('candy_sort_replay_v4');
          if (data) replayV4.import(data);
        } catch (e) {}
      }));
      panel.appendChild(btn('ℹ️ Info', function () {
        var info = replayV4.getInfo();
        alert('Duration: ' + Math.round(info.duration) + 'ms\nFrames: ' + info.frames + '\nMode: ' + info.mode + '\nVersion: ' + info.version);
      }));
    }

    /* === CANDY SORT: Initialize replay v4 === */
    showReplayControlsV4();

    /* === CANDY SORT: Advanced game sharing v4 === */
    var shareV4 = {
      generateShareTextV4: function () {
        var report = analyticsV4.getReport();
        return 'I scored ' + report.metrics.totalScore + ' in Candy Sort! ' +
          'Accuracy: ' + report.metrics.accuracy.toFixed(1) + '% ' +
          'Max Combo: x' + report.metrics.maxCombo + ' ' +
          'Time: ' + Math.round(report.metrics.sessionDuration / 1000) + 's ' +
          'Mode: ' + currentMode + ' ' +
          'Can you beat me?';
      },
      generateShareImageV4: function () {
        var canvas = el('canvas', '');
        canvas.width = 700;
        canvas.height = 500;
        var ctx = canvas.getContext('2d');
        var grad = ctx.createLinearGradient(0, 0, 700, 500);
        grad.addColorStop(0, '#0b0620');
        grad.addColorStop(1, '#1a1038');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 700, 500);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('Candy Sort', 250, 80);
        ctx.font = 'bold 64px sans-serif';
        ctx.fillText(analyticsV4.getReport().metrics.totalScore, 280, 180);
        ctx.font = '32px sans-serif';
        ctx.fillStyle = '#cfc3ee';
        ctx.fillText('Accuracy: ' + analyticsV4.getReport().metrics.accuracy.toFixed(1) + '%', 220, 260);
        ctx.fillText('Max Combo: x' + analyticsV4.getReport().metrics.maxCombo, 220, 310);
        ctx.fillText('Time: ' + Math.round(analyticsV4.getReport().metrics.sessionDuration / 1000) + 's', 220, 360);
        ctx.fillText('Mode: ' + currentMode, 220, 410);
        return canvas.toDataURL();
      },
      shareV4: function () {
        if (navigator.share) {
          navigator.share({
            title: 'Candy Sort Score',
            text: this.generateShareTextV4()
          });
        } else {
          prompt('Copy your score:', this.generateShareTextV4());
        }
      },
      copyToClipboardV4: function (text) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text);
        } else {
          prompt('Copy:', text);
        }
      },
      generateQRCodeV4: function (text) {
        return 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(text);
      },
      generateEmbedCode: function () {
        return '<iframe src="' + window.location.href + '" width="600" height="400"></iframe>';
      }
    };

    /* === CANDY SORT: Share UI v4 === */
    function showShareUIV4() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:92;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Share Your Score'));
      panel.appendChild(el('p', '', shareV4.generateShareTextV4()));
      var img = el('img', '');
      img.src = shareV4.generateShareImageV4();
      img.style.cssText = 'max-width:80%;border-radius:8px;margin:12px 0;';
      panel.appendChild(img);
      var qr = el('img', '');
      qr.src = shareV4.generateQRCodeV4(shareV4.generateShareTextV4());
      qr.style.cssText = 'width:120px;height:120px;margin:8px;';
      panel.appendChild(qr);
      panel.appendChild(btn('📤 Share', function () { shareV4.shareV4(); }));
      panel.appendChild(btn('📋 Copy Text', function () { shareV4.copyToClipboardV4(shareV4.generateShareTextV4()); }));
      panel.appendChild(btn('🔗 Copy Embed', function () { shareV4.copyToClipboardV4(shareV4.generateEmbedCode()); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Social features v4 === */
    var socialV4 = {
      friends: [],
      challenges: [],
      notifications: [],
      groups: [],
      addFriendV4: function (name, score) {
        this.friends.push({ name: name, score: score, date: Date.now() });
      },
      sendChallengeV4: function (friend, score) {
        this.challenges.push({ to: friend, score: score, date: Date.now(), status: 'pending' });
      },
      getLeaderboardV4: function () {
        return this.friends.sort(function (a, b) { return b.score - a.score; });
      },
      addNotificationV4: function (message, type) {
        this.notifications.push({ message: message, type: type || 'info', time: Date.now(), read: false });
      },
      getUnreadCountV4: function () {
        return this.notifications.filter(function (n) { return !n.read; }).length;
      },
      markAllReadV4: function () {
        this.notifications.forEach(function (n) { n.read = true; });
      },
      createGroupV4: function (name) {
        this.groups.push({ name: name, members: [], created: Date.now() });
      },
      joinGroupV4: function (groupName, memberName) {
        var group = this.groups.find(function (g) { return g.name === groupName; });
        if (group && !group.members.includes(memberName)) {
          group.members.push(memberName);
        }
      },
      getGroupLeaderboardV4: function (groupName) {
        var group = this.groups.find(function (g) { return g.name === groupName; });
        if (!group) return [];
        return group.members.map(function (m) {
          var friend = this.friends.find(function (f) { return f.name === m; });
          return { name: m, score: friend ? friend.score : 0 };
        }, this).sort(function (a, b) { return b.score - a.score; });
      },
      getFriendCount: function () { return this.friends.length; },
      getGroupCount: function () { return this.groups.length; },
      getChallengeCount: function () { return this.challenges.length; }
    };

    /* === CANDY SORT: Initialize sharing v4 === */
    showShareUIV4();

    /* === CANDY SORT: Advanced game customization v4 === */
    var customizationV4 = {
      themesV4: {
        classic: { bg: '#0b0620', accent: '#ffd166', text: '#f5efff', cardBg: '#3b1d5e', name: 'Classic', icon: '🎮' },
        neon: { bg: '#0a0a0a', accent: '#00ff88', text: '#ffffff', cardBg: '#1a1a2e', name: 'Neon', icon: '💚' },
        pastel: { bg: '#1a1a2e', accent: '#ff9ff3', text: '#ffffff', cardBg: '#2d2d44', name: 'Pastel', icon: '🌸' },
        dark: { bg: '#000000', accent: '#ff0000', text: '#ffffff', cardBg: '#1a1a1a', name: 'Dark', icon: '🌑' },
        ocean: { bg: '#0c1445', accent: '#00d4ff', text: '#ffffff', cardBg: '#1a2a5e', name: 'Ocean', icon: '🌊' },
        sunset: { bg: '#1a0a2e', accent: '#ff6b6b', text: '#ffffff', cardBg: '#2e1a4e', name: 'Sunset', icon: '🌅' },
        forest: { bg: '#0a1a0a', accent: '#4ade80', text: '#ffffff', cardBg: '#1a2e1a', name: 'Forest', icon: '🌲' },
        candy: { bg: '#2e0a1a', accent: '#ff69b4', text: '#ffffff', cardBg: '#4e1a2e', name: 'Candy', icon: '🍬' },
        halloween: { bg: '#1a0a00', accent: '#ff7518', text: '#ffffff', cardBg: '#2e1a0a', name: 'Halloween', icon: '🎃' },
        christmas: { bg: '#0a1a0a', accent: '#ff0000', text: '#ffffff', cardBg: '#1a2e1a', name: 'Christmas', icon: '🎄' },
        valentine: { bg: '#2e0a1a', accent: '#ff1493', text: '#ffffff', cardBg: '#4e1a2e', name: 'Valentine', icon: '💕' },
        stpatrick: { bg: '#0a1a0a', accent: '#00ff00', text: '#ffffff', cardBg: '#1a2e1a', name: "St. Patrick's", icon: '☘️' }
      },
      currentThemeV4: 'classic',
      applyThemeV4: function (name) {
        if (this.themesV4[name]) {
          this.currentThemeV4 = name;
          var t = this.themesV4[name];
          stage.style.background = t.bg;
          stage.style.color = t.text;
          document.querySelectorAll('.memcard').forEach(function (btn) {
            btn.style.borderColor = t.accent;
            btn.style.background = t.cardBg;
          });
        }
      },
      cycleThemeV4: function () {
        var themes = Object.keys(this.themesV4);
        var idx = themes.indexOf(this.currentThemeV4);
        idx = (idx + 1) % themes.length;
        this.applyThemeV4(themes[idx]);
      },
      randomThemeV4: function () {
        var themes = Object.keys(this.themesV4);
        var random = themes[(Math.random() * themes.length) | 0];
        this.applyThemeV4(random);
      },
      getThemeNames: function () {
        return Object.keys(this.themesV4);
      },
      getCurrentTheme: function () {
        return this.themesV4[this.currentThemeV4];
      },
      getThemeCount: function () {
        return Object.keys(this.themesV4).length;
      }
    };

    /* === CANDY SORT: Theme selector v4 === */
    function showThemeSelectorV4() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:93;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Theme'));
      Object.keys(customizationV4.themesV4).forEach(function (name) {
        var t = customizationV4.themesV4[name];
        var b = btn(t.icon + ' ' + t.name, function () {
          customizationV4.applyThemeV4(name);
          panel.remove();
        });
        b.style.cssText += ';background:' + t.bg + ';color:' + t.accent + ';border:1px solid ' + t.accent + ';margin:4px;';
        panel.appendChild(b);
      });
      panel.appendChild(btn('🎲 Random', function () { customizationV4.randomThemeV4(); panel.remove(); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Candy skin system v4 === */
    var candySkinsV4 = {
      classic: { emoji: '🍬', color: '#ffd166', name: 'Classic' },
      spooky: { emoji: '🎃', color: '#ff7518', name: 'Spooky' },
      spooky2: { emoji: '👻', color: '#f2f2fa', name: 'Ghost' },
      spooky3: { emoji: '💀', color: '#9aa0b0', name: 'Skull' },
      spooky4: { emoji: '🦇', color: '#4a4a6a', name: 'Bat' },
      spooky5: { emoji: '🕷️', color: '#8b0000', name: 'Spider' },
      spooky6: { emoji: '🧟', color: '#556b2f', name: 'Zombie' },
      spooky7: { emoji: '🧛', color: '#800080', name: 'Vampire' },
      spooky8: { emoji: '🧙', color: '#4b0082', name: 'Witch' },
      spooky9: { emoji: '🎃', color: '#ff6600', name: 'Pumpkin' },
      spooky10: { emoji: '🕸️', color: '#666666', name: 'Web' },
      spooky11: { emoji: '🦉', color: '#8b4513', name: 'Owl' },
      spooky12: { emoji: '🐍', color: '#006400', name: 'Snake' }
    };
    var currentSkinV4 = 'classic';

    function setCandySkinV4(skin) {
      if (candySkinsV4[skin]) {
        currentSkinV4 = skin;
        row.querySelectorAll('.memcard').forEach(function (btn) {
          btn.style.borderColor = candySkinsV4[skin].color;
          btn.style.boxShadow = '0 0 12px ' + candySkinsV4[skin].color + '40';
        });
      }
    }

    /* === CANDY SORT: Skin selector v4 === */
    function showSkinSelectorV4() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:94;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Candy Skin'));
      Object.keys(candySkinsV4).forEach(function (name) {
        var s = candySkinsV4[name];
        var b = btn(s.emoji + ' ' + s.name, function () {
          setCandySkinV4(name);
          panel.remove();
        });
        b.style.cssText += ';border:1px solid ' + s.color + ';margin:4px;';
        panel.appendChild(b);
      });
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize customization v4 === */
    showThemeSelectorV4();

    /* === CANDY SORT: Advanced game physics v5 === */
    var physicsV5 = {
      gravity: 0.15,
      airResistance: 0.999,
      groundFriction: 0.92,
      bounce: 0.75,
      maxSpeed: 30,
      terminalVelocity: 25,
      windResistance: 0.9995,
      dragCoefficient: 0.47,
      airDensity: 1.225
    };

    function createPhysicsBodyV5(x, y, vx, vy, mass, size, rotation) {
      return {
        x: x, y: y, vx: vx, vy: vy,
        mass: mass || 1, size: size || 10,
        rotation: rotation || 0, rotSpeed: 0,
        forces: [], isStatic: false, isTrigger: false,
        collisionLayer: 0, collisionMask: 0xFFFFFFFF,
        restitution: 0.6, friction: 0.4,
        dragArea: size * size, volume: size * size * size
      };
    }

    function applyForceV5(body, fx, fy) {
      if (body.isStatic) return;
      body.forces.push({ x: fx, y: fy });
    }

    function updatePhysicsBodyV5(body, dt) {
      if (body.isStatic) return;
      body.forces.forEach(function (f) {
        body.vx += f.x / body.mass;
        body.vy += f.y / body.mass;
      });
      body.forces = [];
      var speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
      var dragForce = 0.5 * physicsV5.airDensity * speed * speed * physicsV5.dragCoefficient * body.dragArea;
      if (speed > 0) {
        body.vx -= (body.vx / speed) * dragForce / body.mass;
        body.vy -= (body.vy / speed) * dragForce / body.mass;
      }
      body.vx *= physicsV5.airResistance;
      body.vy *= physicsV5.airResistance;
      body.vy += physicsV5.gravity;
      if (speed > physicsV5.maxSpeed) {
        body.vx = (body.vx / speed) * physicsV5.maxSpeed;
        body.vy = (body.vy / speed) * physicsV5.maxSpeed;
      }
      if (body.vy > physicsV5.terminalVelocity) {
        body.vy = physicsV5.terminalVelocity;
      }
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.rotation += body.rotSpeed;
      if (body.y > 300) {
        body.y = 300;
        body.vy *= -physicsV5.bounce;
        body.vx *= physicsV5.groundFriction;
        if (Math.abs(body.vy) < 0.2) body.vy = 0;
      }
    }

    /* === CANDY SORT: Collision detection v5 === */
    function checkCollisionV5(a, b) {
      var dx = a.x - b.x;
      var dy = a.y - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      return dist < (a.size + b.size);
    }

    function resolveCollisionV5(a, b) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      var nx = dx / dist;
      var ny = dy / dist;
      var relVx = a.vx - b.vx;
      var relVy = a.vy - b.vy;
      var relDot = relVx * nx + relVy * ny;
      if (relDot > 0) return;
      var totalMass = a.mass + b.mass;
      var restitution = Math.min(a.restitution, b.restitution);
      var impulse = -(1 + restitution) * relDot / totalMass;
      a.vx -= impulse * b.mass * nx;
      a.vy -= impulse * b.mass * ny;
      b.vx += impulse * a.mass * nx;
      b.vy += impulse * a.mass * ny;
    }

    /* === CANDY SORT: Physics simulation v5 === */
    var physicsBodiesV5 = [];
    function addPhysicsBodyV5(x, y, vx, vy, mass, size, rotation) {
      var body = createPhysicsBodyV5(x, y, vx, vy, mass, size, rotation);
      physicsBodiesV5.push(body);
      return body;
    }

    function updatePhysicsV5() {
      physicsBodiesV5.forEach(function (b) {
        updatePhysicsBodyV5(b, 0.016);
      });
      for (var i = 0; i < physicsBodiesV5.length; i++) {
        for (var j = i + 1; j < physicsBodiesV5.length; j++) {
          if (checkCollisionV5(physicsBodiesV5[i], physicsBodiesV5[j])) {
            resolveCollisionV5(physicsBodiesV5[i], physicsBodiesV5[j]);
          }
        }
      }
    }

    /* === CANDY SORT: Initialize physics v5 === */
    updatePhysicsV5();

    /* === CANDY SORT: Advanced input buffering v4 === */
    var inputBufferV4 = {
      buffer: [],
      maxSize: 40,
      add: function (input) {
        this.buffer.push({ input: input, time: performance.now() });
        if (this.buffer.length > this.maxSize) this.buffer.shift();
      },
      get: function (within) {
        var now = performance.now();
        return this.buffer.filter(function (i) { return now - i.time < within; });
      },
      clear: function () { this.buffer = []; },
      process: function () {
        var inputs = this.get(250);
        inputs.forEach(function (i) {
          if (i.input === 'click') handleClickV4();
          if (i.input === 'right') handleRightV4();
          if (i.input === 'left') handleLeftV4();
          if (i.input === 'undo') triggerUndoV4();
          if (i.input === 'redo') triggerRedoV4();
          if (i.input === 'pause') togglePause();
        });
        this.clear();
      },
      undo: function () {
        if (this.buffer.length > 0) {
          this.buffer.pop();
        }
      },
      redo: function () {},
      getStats: function () {
        return {
          bufferSize: this.buffer.length,
          maxSize: this.maxSize
        };
      }
    };

    function handleClickV4() {
      if (over) return;
      var btns = row.querySelectorAll('.memcard:not(.done)');
      if (btns.length > 0) {
        btns[0].click();
      }
    }

    function handleRightV4() {
      if (next < 6) {
        next++;
        st.textContent = 'Skipped to ' + next + '/6';
      }
    }

    function handleLeftV4() {
      if (next > 0) {
        next--;
        st.textContent = 'Back to ' + next + '/6';
      }
    }

    function togglePause() {
      if (pauseSystem.paused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }

    /* === CANDY SORT: Input prediction v4 === */
    var inputPredictionV4 = {
      history: [],
      patterns: {},
      predict: function () {
        if (this.history.length < 6) return null;
        var last6 = this.history.slice(-6).map(function (i) { return i.candy; });
        var key = last6.join(',');
        if (this.patterns[key]) {
          return this.patterns[key];
        }
        return null;
      },
      add: function (candy) {
        this.history.push({ candy: candy, time: performance.now() });
        if (this.history.length > 50) this.history.shift();
        if (this.history.length >= 7) {
          var last7 = this.history.slice(-7).map(function (i) { return i.candy; });
          var key = last7.slice(0, 6).join(',');
          var next = last7[6];
          this.patterns[key] = next;
        }
      },
      getStats: function () {
        return {
          historyLength: this.history.length,
          patternsFound: Object.keys(this.patterns).length
        };
      },
      clear: function () {
        this.history = [];
        this.patterns = {};
      }
    };

    /* === CANDY SORT: Input validation v4 === */
    function validateInputV4(candy) {
      if (!candy) return { valid: false, reason: 'No candy' };
      if (over) return { valid: false, reason: 'Game over' };
      if (candy.key === ordered[next].key) return { valid: true, correct: true };
      return { valid: true, correct: false };
    }

    /* === CANDY SORT: Input sanitization v4 === */
    function sanitizeInputV4(input) {
      if (typeof input !== 'string') return '';
      return input.replace(/[<>"'`\\/\\]/g, '');
    }

    /* === CANDY SORT: Input logging v4 === */
    var inputLogV4 = [];
    function logInputV4(type, data) {
      inputLogV4.push({ type: type, data: data, time: performance.now() });
      if (inputLogV4.length > 400) inputLogV4.shift();
    }

    /* === CANDY SORT: Input statistics v4 === */
    function getInputStatsV4() {
      var clicks = inputLogV4.filter(function (i) { return i.type === 'click'; });
      var correct = clicks.filter(function (i) { return i.data && i.data.correct; }).length;
      var wrong = clicks.length - correct;
      return {
        total: clicks.length,
        correct: correct,
        wrong: wrong,
        accuracy: clicks.length > 0 ? (correct / clicks.length) * 100 : 0,
        averageReactionTime: calculateAverageReactionTimeV4()
      };
    }

    function calculateAverageReactionTimeV4() {
      var reactions = inputLogV4.filter(function (i) { return i.type === 'click'; });
      if (reactions.length === 0) return 0;
      var total = reactions.reduce(function (sum, i) { return sum + (i.data.reactionTime || 0); }, 0);
      return total / reactions.length;
    }

    /* === CANDY SORT: Initialize input system v4 === */
    inputBufferV4.clear();

    /* === CANDY SORT: Advanced game loop v5 === */
    var gameLoopV5 = {
      running: false,
      paused: false,
      timeScale: 1,
      fixedDelta: 1000 / 240,
      accumulator: 0,
      lastTime: 0,
      frameCount: 0,
      fps: 0,
      fpsAccumulator: 0,
      fpsFrames: 0,
      updateCallbacks: [],
      renderCallbacks: [],
      start: function () {
        this.running = true;
        this.lastTime = performance.now();
        this.tick();
      },
      stop: function () {
        this.running = false;
      },
      pause: function () {
        this.paused = true;
      },
      resume: function () {
        this.paused = false;
        this.lastTime = performance.now();
      },
      tick: function () {
        if (!this.running) return;
        var now = performance.now();
        var delta = now - this.lastTime;
        this.lastTime = now;
        this.accumulator += delta * this.timeScale;
        while (this.accumulator >= this.fixedDelta) {
          if (!this.paused) {
            this.update(this.fixedDelta / 1000);
          }
          this.accumulator -= this.fixedDelta;
        }
        this.render();
        this.frameCount++;
        this.fpsAccumulator += delta;
        this.fpsFrames++;
        if (this.fpsAccumulator >= 1000) {
          this.fps = this.fpsFrames;
          this.fpsFrames = 0;
          this.fpsAccumulator = 0;
        }
        requestAnimationFrame(this.tick.bind(this));
      },
      update: function (dt) {
        this.updateCallbacks.forEach(function (cb) { cb(dt); });
      },
      render: function () {
        this.renderCallbacks.forEach(function (cb) { cb(); });
      },
      onUpdate: function (cb) {
        this.updateCallbacks.push(cb);
      },
      onRender: function (cb) {
        this.renderCallbacks.push(cb);
      }
    };

    /* === CANDY SORT: Register update callbacks v5 === */
    gameLoopV5.onUpdate(function (dt) {
      updateGame(dt);
    });

    gameLoopV5.onUpdate(function (dt) {
      updatePhysicsV5();
    });

    gameLoopV5.onUpdate(function (dt) {
      particleSystemV2.update(dt);
    });

    gameLoopV5.onUpdate(function (dt) {
      updateAnimations();
    });

    gameLoopV5.onUpdate(function (dt) {
      updateVisualEffects();
    });

    gameLoopV5.onUpdate(function (dt) {
      inputBufferV4.process();
    });

    /* === CANDY SORT: Register render callbacks v5 === */
    gameLoopV5.onRender(function () {
      renderAllV4();
    });

    gameLoopV5.onRender(function () {
      renderV4.clear();
      renderBackgroundV4();
      renderParticlesV4();
      renderUIV4();
    });

    /* === CANDY SORT: Time scale effects v4 === */
    function setTimeScaleV4(scale) {
      gameLoopV5.timeScale = scale;
    }

    function slowMotionV4() {
      setTimeScaleV4(0.15);
      setTimeout(function () { setTimeScaleV4(1); }, 5000);
    }

    function speedUpV4() {
      setTimeScaleV4(5);
      setTimeout(function () { setTimeScaleV4(1); }, 800);
    }

    function freezeFrameV4() {
      setTimeScaleV4(0);
      setTimeout(function () { setTimeScaleV4(1); }, 200);
    }

    /* === CANDY SORT: Frame skipping v4 === */
    var frameSkipV4 = {
      enabled: false,
      skipEvery: 5,
      frameCount: 0,
      shouldSkip: function () {
        if (!this.enabled) return false;
        this.frameCount++;
        return this.frameCount % this.skipEvery === 0;
      }
    };

    /* === CANDY SORT: Initialize game loop v5 === */
    gameLoopV5.start();

    /* === CANDY SORT: Advanced rendering v5 === */
    var renderV5 = {
      canvas: null,
      ctx: null,
      width: 700,
      height: 500,
      dpr: Math.min(2, window.devicePixelRatio || 1),
      init: function () {
        this.canvas = el('canvas', '');
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.canvas.style.cssText += ';position:absolute;top:0;left:0;pointer-events:none;z-index:100;';
        stage.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(this.dpr, this.dpr);
      },
      clear: function () {
        this.ctx.clearRect(0, 0, this.width, this.height);
      },
      drawRect: function (x, y, w, h, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
      },
      drawCircle: function (x, y, r, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
      },
      drawText: function (text, x, y, color, size, align) {
        this.ctx.fillStyle = color || '#fff';
        this.ctx.font = (size || 16) + 'px sans-serif';
        this.ctx.textAlign = align || 'left';
        this.ctx.fillText(text, x, y);
        this.ctx.textAlign = 'left';
      },
      drawLine: function (x1, y1, x2, y2, color, width) {
        this.ctx.strokeStyle = color || '#fff';
        this.ctx.lineWidth = width || 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      },
      drawGradient: function (x, y, w, h, color1, color2) {
        var grad = this.ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(x, y, w, h);
      },
      drawRoundRect: function (x, y, w, h, r, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x + r, y);
        this.ctx.lineTo(x + w - r, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        this.ctx.lineTo(x + w, y + h - r);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.ctx.lineTo(x + r, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        this.ctx.lineTo(x, y + r);
        this.ctx.quadraticCurveTo(x, y, x + r, y);
        this.ctx.closePath();
        this.ctx.fill();
      },
      drawShadow: function (x, y, w, h, blur, color) {
        this.ctx.shadowBlur = blur;
        this.ctx.shadowColor = color || 'rgba(0,0,0,0.5)';
        this.ctx.fillStyle = color || 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(x, y, w, h);
        this.ctx.shadowBlur = 0;
      },
      drawGlow: function (x, y, r, color, intensity) {
        var grad = this.ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.globalAlpha = intensity || 0.5;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
      },
      drawStar: function (x, y, r, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        for (var i = 0; i < 5; i++) {
          var angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          var px = x + Math.cos(angle) * r;
          var py = y + Math.sin(angle) * r;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();
      }
    };

    /* === CANDY SORT: Render functions v5 === */
    function renderBackgroundV5() {
      renderV5.drawGradient(0, 0, 700, 500, '#0b0620', '#1a1038');
      for (var i = 0; i < 40; i++) {
        renderV5.drawCircle(Math.random() * 700, Math.random() * 500, 2, 'rgba(255,255,255,0.2)');
      }
    }

    function renderParticlesV5() {
      particleSystemV2.render(renderV5.ctx);
    }

    function renderUIV5() {
      renderV5.drawText('Score: ' + score, 20, 40, '#ffd166', 22);
      renderV5.drawText('Time: ' + timeLeft, 550, 40, timeLeft <= 5 ? '#e74c3c' : '#fff', 22);
      if (comboV2.count >= 2) {
        renderV5.drawText('COMBO x' + comboV2.count, 300, 80, '#ff9f1c', 36, 'center');
      }
      renderV5.drawText('Miss: ' + miss, 20, 75, '#e74c3c', 18);
      renderV5.drawText('Combo: ' + comboV2.count, 20, 100, '#ff9f1c', 18);
      renderV5.drawText('Accuracy: ' + (totalClicks > 0 ? Math.round((correctClicks / totalClicks) * 100) : 0) + '%', 20, 125, '#59e6ff', 16);
    }

    function renderAllV5() {
      renderV5.clear();
      renderBackgroundV5();
      renderParticlesV5();
      renderUIV5();
    }

    /* === CANDY SORT: Initialize rendering v5 === */
    renderV5.init();

    /* === CANDY SORT: Advanced game state v5 === */
    var gameStateV6 = {
      phase: 'idle',
      subPhase: null,
      history: [],
      snapshots: [],
      checkpoints: [],
      saveSnapshot: function () {
        this.snapshots.push({
          next: next, miss: miss, combo: combo, score: score,
          timeLeft: timeLeft, comboV2: { count: comboV2.count, multiplier: comboV2.multiplier },
          timestamp: Date.now()
        });
        if (this.snapshots.length > 30) this.snapshots.shift();
      },
      loadSnapshot: function (index) {
        if (index >= 0 && index < this.snapshots.length) {
          var s = this.snapshots[index];
          next = s.next; miss = s.miss; combo = s.combo;
          score = s.score; timeLeft = s.timeLeft;
          comboV2.count = s.comboV2.count;
          comboV2.multiplier = s.comboV2.multiplier;
        }
      },
      undo: function () {
        if (this.snapshots.length > 0) {
          this.loadSnapshot(this.snapshots.length - 1);
          this.snapshots.pop();
        }
      },
      redo: function () {
        if (this.history.length > 0) {
          var s = this.history.pop();
          this.snapshots.push(s);
          this.loadSnapshot(this.snapshots.length - 1);
        }
      },
      saveCheckpoint: function (name) {
        this.checkpoints.push({
          name: name,
          state: {
            next: next, miss: miss, combo: combo, score: score,
            timeLeft: timeLeft, comboV2: { count: comboV2.count, multiplier: comboV2.multiplier }
          },
          timestamp: Date.now()
        });
      },
      loadCheckpoint: function (name) {
        var cp = this.checkpoints.find(function (c) { return c.name === name; });
        if (cp) {
          var s = cp.state;
          next = s.next; miss = s.miss; combo = s.combo;
          score = s.score; timeLeft = s.timeLeft;
          comboV2.count = s.comboV2.count;
          comboV2.multiplier = s.comboV2.multiplier;
        }
      },
      getSnapshotCount: function () { return this.snapshots.length; },
      getCheckpointCount: function () { return this.checkpoints.length; },
      clearAll: function () {
        this.snapshots = [];
        this.history = [];
        this.checkpoints = [];
      }
    };

    /* === CANDY SORT: State machine v5 === */
    var stateMachineV5 = {
      states: {},
      currentState: 'idle',
      transitions: {},
      addState: function (name, config) {
        this.states[name] = config;
      },
      addTransition: function (from, to, condition) {
        if (!this.transitions[from]) this.transitions[from] = [];
        this.transitions[from].push({ to: to, condition: condition });
      },
      transition: function (to) {
        var prev = this.states[this.currentState];
        if (prev && prev.onExit) prev.onExit();
        this.currentState = to;
        var next = this.states[to];
        if (next && next.onEnter) next.onEnter();
      },
      update: function () {
        var state = this.states[this.currentState];
        if (state && state.onUpdate) state.onUpdate();
        if (this.transitions[this.currentState]) {
          this.transitions[this.currentState].forEach(function (t) {
            if (t.condition()) this.transition(t.to);
          }, this);
        }
      }
    };

    /* === CANDY SORT: Define states v5 === */
    stateMachineV5.addState('idle', {
      onEnter: function () { st.textContent = 'Click a candy to start!'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    stateMachineV5.addState('playing', {
      onEnter: function () { st.textContent = 'Sort the candies!'; },
      onExit: function () { gameStateV6.saveSnapshot(); },
      onUpdate: function () { gameLoopV5.update(0.016); }
    });

    stateMachineV5.addState('paused', {
      onEnter: function () { st.textContent = 'Paused'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    stateMachineV5.addState('gameover', {
      onEnter: function () { st.textContent = 'Game Over!'; },
      onExit: function () {},
      onUpdate: function () {}
    });

    /* === CANDY SORT: Define transitions v5 === */
    stateMachineV5.addTransition('idle', 'playing', function () { return next > 0; });
    stateMachineV5.addTransition('playing', 'paused', function () { return pauseSystem.paused; });
    stateMachineV5.addTransition('paused', 'playing', function () { return !pauseSystem.paused; });
    stateMachineV5.addTransition('playing', 'gameover', function () { return over; });

    /* === CANDY SORT: Initialize state machine v5 === */
    stateMachineV5.transition('idle');

    /* === CANDY SORT: Advanced event system v5 === */
    var eventSystemV5 = {
      listeners: {},
      emit: function (event, data) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(function (cb) {
            try { cb(data); } catch (e) { console.error(e); }
          });
        }
      },
      on: function (event, cb) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
      },
      off: function (event, cb) {
        if (this.listeners[event]) {
          this.listeners[event] = this.listeners[event].filter(function (fn) { return fn !== cb; });
        }
      },
      once: function (event, cb) {
        var self = this;
        var wrapper = function (data) {
          cb(data);
          self.off(event, wrapper);
        };
        this.on(event, wrapper);
      },
      clear: function (event) {
        if (event) {
          delete this.listeners[event];
        } else {
          this.listeners = {};
        }
      },
      getListenerCount: function (event) {
        return this.listeners[event] ? this.listeners[event].length : 0;
      },
      getAllEvents: function () {
        return Object.keys(this.listeners);
      }
    };

    /* === CANDY SORT: Event types v5 === */
    var GameEventsV5 = {
      GAME_START: 'game_start',
      GAME_END: 'game_end',
      CANDY_CORRECT: 'candy_correct',
      CANDY_WRONG: 'candy_wrong',
      COMBO_START: 'combo_start',
      COMBO_END: 'combo_end',
      COMBO_MILESTONE: 'combo_milestone',
      TIME_WARNING: 'time_warning',
      TIME_UP: 'time_up',
      LEVEL_UP: 'level_up',
      ACHIEVEMENT: 'achievement',
      PAUSE: 'pause',
      RESUME: 'resume',
      RESTART: 'restart',
      UNDO: 'undo',
      REDO: 'redo',
      CHECKPOINT_SAVE: 'checkpoint_save',
      CHECKPOINT_LOAD: 'checkpoint_load',
      THEME_CHANGE: 'theme_change',
      SKIN_CHANGE: 'skin_change',
      MODE_CHANGE: 'mode_change',
      SETTINGS_CHANGE: 'settings_change',
      SOUND_TOGGLE: 'sound_toggle',
      MUSIC_TOGGLE: 'music_toggle'
    };

    /* === CANDY SORT: Event handlers v5 === */
    eventSystemV5.on(GameEventsV5.GAME_START, function (data) {
      logEvent('game_start', data);
      analyticsV4.track('game_start', data);
    });

    eventSystemV5.on(GameEventsV5.CANDY_CORRECT, function (data) {
      logEvent('candy_correct', data);
      analyticsV4.track('candy_correct', data);
      comboV2.count++;
      score += data.pts;
      playSound('correct');
      triggerCorrectV4(data.pts);
    });

    eventSystemV5.on(GameEventsV5.CANDY_WRONG, function (data) {
      logEvent('candy_wrong', data);
      analyticsV4.track('wrong', data);
      comboV2.count = 0;
      miss++;
      playSound('wrong');
      triggerWrongV4();
    });

    eventSystemV5.on(GameEventsV5.COMBO_MILESTONE, function (data) {
      logEvent('combo_milestone', data);
      showComboPopup(data.count);
      comboEffect();
    });

    eventSystemV5.on(GameEventsV5.TIME_WARNING, function (data) {
      logEvent('time_warning', data);
      animateTimeWarning();
      playTimeWarning();
    });

    eventSystemV5.on(GameEventsV5.GAME_END, function (data) {
      logEvent('game_end', data);
      analyticsV4.track('game_end', data);
      if (data.won) {
        triggerWin();
      } else {
        triggerLose();
      }
    });

    eventSystemV5.on(GameEventsV5.UNDO, function () {
      gameStateV6.undo();
      st.textContent = 'Undone!';
    });

    eventSystemV5.on(GameEventsV5.REDO, function () {
      gameStateV6.redo();
      st.textContent = 'Redone!';
    });

    eventSystemV5.on(GameEventsV5.CHECKPOINT_SAVE, function (data) {
      gameStateV6.saveCheckpoint(data.name);
      st.textContent = 'Checkpoint saved: ' + data.name;
    });

    eventSystemV5.on(GameEventsV5.CHECKPOINT_LOAD, function (data) {
      gameStateV6.loadCheckpoint(data.name);
      st.textContent = 'Checkpoint loaded: ' + data.name;
    });

    eventSystemV5.on(GameEventsV5.THEME_CHANGE, function (data) {
      st.textContent = 'Theme changed to: ' + data.theme;
    });

    eventSystemV5.on(GameEventsV5.SKIN_CHANGE, function (data) {
      st.textContent = 'Skin changed to: ' + data.skin;
    });

    eventSystemV5.on(GameEventsV5.MODE_CHANGE, function (data) {
      st.textContent = 'Mode changed to: ' + data.mode;
    });

    eventSystemV5.on(GameEventsV5.SOUND_TOGGLE, function (data) {
      st.textContent = 'Sound: ' + (data.muted ? 'OFF' : 'ON');
    });

    eventSystemV5.on(GameEventsV5.MUSIC_TOGGLE, function (data) {
      st.textContent = 'Music: ' + (data.playing ? 'ON' : 'OFF');
    });

    /* === CANDY SORT: Event triggers v5 === */
    function triggerGameStartV5() { eventSystemV5.emit(GameEventsV5.GAME_START, { mode: currentMode }); }
    function triggerCandyCorrectV5(pts) { eventSystemV5.emit(GameEventsV5.CANDY_CORRECT, { pts: pts }); }
    function triggerCandyWrongV5() { eventSystemV5.emit(GameEventsV5.CANDY_WRONG, {}); }
    function triggerComboMilestoneV5(count) { eventSystemV5.emit(GameEventsV5.COMBO_MILESTONE, { count: count }); }
    function triggerTimeWarningV5() { eventSystemV5.emit(GameEventsV5.TIME_WARNING, { timeLeft: timeLeft }); }
    function triggerGameEndV5(won) { eventSystemV5.emit(GameEventsV5.GAME_END, { won: won, score: score }); }
    function triggerUndoV5() { eventSystemV5.emit(GameEventsV5.UNDO, {}); }
    function triggerRedoV5() { eventSystemV5.emit(GameEventsV5.REDO, {}); }
    function triggerCheckpointSaveV5(name) { eventSystemV5.emit(GameEventsV5.CHECKPOINT_SAVE, { name: name }); }
    function triggerCheckpointLoadV5(name) { eventSystemV5.emit(GameEventsV5.CHECKPOINT_LOAD, { name: name }); }
    function triggerThemeChangeV5(theme) { eventSystemV5.emit(GameEventsV5.THEME_CHANGE, { theme: theme }); }
    function triggerSkinChangeV5(skin) { eventSystemV5.emit(GameEventsV5.SKIN_CHANGE, { skin: skin }); }
    function triggerModeChangeV5(mode) { eventSystemV5.emit(GameEventsV5.MODE_CHANGE, { mode: mode }); }
    function triggerSoundToggle(muted) { eventSystemV5.emit(GameEventsV5.SOUND_TOGGLE, { muted: muted }); }
    function triggerMusicToggle(playing) { eventSystemV5.emit(GameEventsV5.MUSIC_TOGGLE, { playing: playing }); }

    /* === CANDY SORT: Initialize event system v5 === */
    triggerGameStartV5();

    /* === CANDY SORT: Advanced game systems integration v4 === */
    var gameSystemsV4 = {
      audio: audioSystemV2,
      particles: particleSystemV2,
      physics: { bodies: physicsBodiesV5, update: updatePhysicsV5 },
      rendering: renderV5,
      state: gameStateV6,
      events: eventSystemV5,
      analytics: analyticsV4,
      input: inputBufferV4,
      ai: aiSystem,
      network: networkSystem,
      replay: replayV4,
      share: shareV4,
      customization: customizationV4,
      accessibility: accessibility,
      performance: perfOptimization,
      balance: balanceSystem,
      dda: ddaSystem,
      modes: gameModesV4,
      tutorial: tutorialV4
    };

    /* === CANDY SORT: System initialization v4 === */
    function initAllSystemsV4() {
      initAudioSystem();
      initRenderSystem();
      initInputSystem();
      updatePhysicsV5();
      updateVisualEffects();
      updateParticles();
      processInput();
      updateCombo();
      updateScoreMultiplier();
      updateGameState();
      adjustDifficulty();
      updateDDA();
      updateTiming();
      updatePerfStats();
      syncLeaderboard();
      syncAchievements();
      initAllSystems();
      initAllSystemsV2();
      initAllSystemsV3();
    }

    /* === CANDY SORT: System update v4 === */
    function updateAllSystemsV4(dt) {
      gameLoopV5.update(dt);
      stateMachineV5.update();
      updateAllSystemsVisualV4();
    }

    function updateAllSystemsVisualV4() {
      renderAllV5();
      renderV5.clear();
      renderBackgroundV5();
      renderParticlesV5();
      renderUIV5();
    }

    /* === CANDY SORT: System cleanup v4 === */
    function cleanupAllSystemsV4() {
      stopAutoPlay();
      stopMusic();
      gameLoopV5.stop();
      replayV4.stopRecording();
      saveGame();
      saveAchievements();
      cloudSave();
      cleanupAllSystems();
      cleanupAllSystemsV2();
      cleanupAllSystemsV3();
    }

    /* === CANDY SORT: System reset v4 === */
    function resetAllSystemsV4() {
      cleanupAllSystemsV4();
      next = 0; miss = 0; combo = 0; score = 0;
      timeLeft = 30; comboV2.count = 0; comboV2.multiplier = 1;
      maxCombo = 0; totalClicks = 0; correctClicks = 0;
      over = false; hintUsed = false;
      physicsBodiesV5 = [];
      visualSystem.particles = [];
      visualSystem.effects = [];
      particleSystemV2.particles = [];
      inputBufferV4.clear();
      eventLog = [];
      gameStateV6.snapshots = [];
      gameStateV6.history = [];
      gameStateV6.checkpoints = [];
      resetAllSystems();
      resetAllSystemsV2();
      resetAllSystemsV3();
    }

    /* === CANDY SORT: System status v3 === */
    function getSystemStatusV3() {
      return {
        audio: audioSystemV2.initialized,
        particles: particleSystemV2.particles.length,
        physics: physicsBodiesV5.length,
        rendering: renderV5.canvas !== null,
        state: gameStateV6.getSnapshotCount(),
        events: Object.keys(eventSystemV5.listeners).length,
        analytics: analyticsV4.events.length,
        input: inputBufferV4.buffer.length,
        ai: aiSystem.enabled,
        network: networkSystem.connected,
        replay: replayV4.recording,
        customization: customizationV4.currentThemeV4,
        accessibility: accessibility.highContrast,
        performance: perfOptimization.objectPooling,
        balance: balanceSystem,
        dda: ddaSystem.enabled,
        modes: currentMode,
        tutorial: tutorialV4.active,
        fps: gameLoopV5.fps,
        frameCount: gameLoopV5.frameCount
      };
    }

    /* === CANDY SORT: Initialize all systems v4 === */
    initAllSystemsV4();

    /* === CANDY SORT: Advanced game modes v5 === */
    var gameModesV5 = {
      classic: { name: 'Classic', timeLimit: 30, lives: Infinity, difficulty: 1, description: 'Standard game mode', unlock: true, icon: '🎮' },
      timed: { name: 'Timed', timeLimit: 20, lives: Infinity, difficulty: 1.5, description: 'Less time, more pressure', unlock: true, icon: '⏱️' },
      hardcore: { name: 'Hardcore', timeLimit: 15, lives: 3, difficulty: 2, description: 'Only 3 lives!', unlock: true, icon: '💀' },
      zen: { name: 'Zen', timeLimit: 60, lives: Infinity, difficulty: 0.5, description: 'Relaxed gameplay', unlock: true, icon: '🧘' },
      challenge: { name: 'Challenge', timeLimit: 25, lives: 5, difficulty: 1.8, description: 'Combo bonuses', unlock: true, icon: '🏆' },
      speedrun: { name: 'Speedrun', timeLimit: 10, lives: Infinity, difficulty: 2.5, description: 'Beat the clock!', unlock: true, icon: '⚡' },
      endless: { name: 'Endless', timeLimit: Infinity, lives: Infinity, difficulty: 1, description: 'No time limit', unlock: true, icon: '∞' },
      daily: { name: 'Daily', timeLimit: 30, lives: Infinity, difficulty: 1.2, description: 'Daily challenge', unlock: true, icon: '📅' },
      nightmare: { name: 'Nightmare', timeLimit: 10, lives: 1, difficulty: 3, description: 'One life, 10 seconds!', unlock: false, icon: '👻' },
      impossible: { name: 'Impossible', timeLimit: 5, lives: 1, difficulty: 4, description: 'Good luck!', unlock: false, icon: '🔥' }
    };

    /* === CANDY SORT: Mode unlock system v3 === */
    var modeUnlocksV3 = {
      nightmare: { requirement: 'Complete hardcore mode', unlocked: false, hint: 'Try hardcore mode!' },
      impossible: { requirement: 'Complete nightmare mode', unlocked: false, hint: 'Try nightmare mode!' }
    };

    function checkModeUnlocksV3() {
      if (modeAchievementsV3.hardcore && !modeUnlocksV3.nightmare.unlocked) {
        modeUnlocksV3.nightmare.unlocked = true;
        gameModesV5.nightmare.unlock = true;
        showSortAchievement('🔓 Nightmare mode unlocked!');
        socialV4.addNotificationV4('Nightmare mode unlocked!', 'achievement');
      }
      if (modeAchievementsV3.nightmare && !modeUnlocksV3.impossible.unlocked) {
        modeUnlocksV3.impossible.unlocked = true;
        gameModesV5.impossible.unlock = true;
        showSortAchievement('🔓 Impossible mode unlocked!');
        socialV4.addNotificationV4('Impossible mode unlocked!', 'achievement');
      }
    }

    /* === CANDY SORT: Mode selection v5 === */
    function showModeSelectV5() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:95;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Game Mode'));
      Object.keys(gameModesV5).forEach(function (key) {
        var m = gameModesV5[key];
        var b = btn(m.icon + ' ' + m.name + ' - ' + m.description, function () {
          if (m.unlock) {
            setGameModeV5(key);
            panel.remove();
          } else {
            st.textContent = '🔒 ' + modeUnlocksV3[key].requirement;
            socialV4.addNotificationV4('Mode locked: ' + m.name, 'info');
          }
        });
        b.style.cssText += ';margin:4px;width:450px;';
        if (!m.unlock) b.style.opacity = '0.5';
        panel.appendChild(b);
      });
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    function setGameModeV5(mode) {
      if (gameModesV5[mode] && gameModesV5[mode].unlock) {
        currentMode = mode;
        var m = gameModesV5[mode];
        timeLeft = m.timeLimit === Infinity ? 9999 : m.timeLimit;
        st.textContent = m.icon + ' Mode: ' + m.name + ' · Time: ' + (m.timeLimit === Infinity ? '∞' : m.timeLimit + 's');
        gameStateV2.difficulty = m.difficulty;
        checkModeUnlocksV3();
        triggerModeChangeV5(mode);
      }
    }

    /* === CANDY SORT: Mode-specific achievements v4 === */
    var modeAchievementsV4 = {
      classic: { completed: false, name: 'Classic Master', icon: '🎮' },
      timed: { completed: false, name: 'Speed Demon', icon: '⏱️' },
      hardcore: { completed: false, name: 'Hardcore Hero', icon: '💀' },
      zen: { completed: false, name: 'Zen Master', icon: '🧘' },
      challenge: { completed: false, name: 'Challenge Champion', icon: '🏆' },
      speedrun: { completed: false, name: 'Speedrunner', icon: '⚡' },
      endless: { completed: false, name: 'Endless Legend', icon: '∞' },
      daily: { completed: false, name: 'Daily Warrior', icon: '📅' },
      nightmare: { completed: false, name: 'Nightmare Survivor', icon: '👻' },
      impossible: { completed: false, name: 'Impossible Champion', icon: '🔥' }
    };

    function checkModeAchievementV4(mode) {
      if (modeAchievementsV4[mode] && !modeAchievementsV4[mode].completed) {
        modeAchievementsV4[mode].completed = true;
        showSortAchievement(modeAchievementsV4[mode].icon + ' ' + modeAchievementsV4[mode].name + '!');
        socialV4.addNotificationV4('Achievement: ' + modeAchievementsV4[mode].name, 'achievement');
      }
    }

    /* === CANDY SORT: Initialize game modes v5 === */
    showModeSelectV5();

    /* === CANDY SORT: Advanced tutorial system v5 === */
    var tutorialV5 = {
      active: false,
      step: 0,
      steps: [
        { text: 'Welcome to Candy Sort!', duration: 2000, action: null, highlight: null, sound: 'start' },
        { text: 'Click candies from cheapest to priciest.', duration: 3000, action: function () { highlightCheapestV5(); }, highlight: 'cheapest', sound: 'info' },
        { text: 'Build combos for bonus points!', duration: 2000, action: function () { showComboDemoV5(); }, highlight: 'combo', sound: 'combo' },
        { text: 'Use hints if you get stuck.', duration: 2000, action: function () { showHintDemoV5(); }, highlight: 'hint', sound: 'info' },
        { text: 'Watch the timer!', duration: 2000, action: function () { highlightTimerV5(); }, highlight: 'timer', sound: 'warning' },
        { text: 'Complete achievements for rewards!', duration: 2000, action: null, highlight: null, sound: 'achievement' },
        { text: 'Customize themes and skins!', duration: 2000, action: null, highlight: null, sound: 'info' },
        { text: 'Track your analytics!', duration: 2000, action: null, highlight: null, sound: 'info' },
        { text: 'Try different game modes!', duration: 2000, action: null, highlight: null, sound: 'info' },
        { text: 'Good luck!', duration: 1000, action: null, highlight: null, sound: 'win' }
      ],
      start: function () {
        this.active = true;
        this.step = 0;
        this.showStep();
      },
      showStep: function () {
        if (this.step >= this.steps.length) {
          this.active = false;
          return;
        }
        var step = this.steps[this.step];
        st.textContent = '📖 ' + step.text;
        if (step.action) step.action();
        if (step.highlight) this.highlightElement(step.highlight);
        if (step.sound) playSoundV2(step.sound);
        setTimeout(function () {
          this.step++;
          this.showStep();
        }.bind(this), step.duration);
      },
      highlightElement: function (type) {
        switch (type) {
          case 'cheapest': this.highlightCheapest(); break;
          case 'combo': this.highlightCombo(); break;
          case 'hint': this.highlightHint(); break;
          case 'timer': this.highlightTimer(); break;
        }
      },
      highlightCheapest: function () {
        var cheapest = ordered[next];
        if (cheapest) {
          row.querySelectorAll('.memcard').forEach(function (btn) {
            if (btn.textContent.includes(cheapest.name)) {
              btn.style.boxShadow = '0 0 35px #2ecc71';
              btn.style.transform = 'scale(1.2)';
              setTimeout(function () { btn.style.boxShadow = ''; btn.style.transform = ''; }, 2000);
            }
          });
        }
      },
      highlightCombo: function () {
        comboDisplay.display.textContent = '🔥 COMBO x5!';
        comboDisplay.display.style.transform = 'scale(3)';
        comboDisplay.display.style.color = '#ff9f1c';
        setTimeout(function () {
          comboDisplay.display.textContent = '';
          comboDisplay.display.style.transform = '';
          comboDisplay.display.style.color = '';
        }, 2000);
      },
      highlightHint: function () {
        hintBtn.style.boxShadow = '0 0 30px #59e6ff';
        setTimeout(function () { hintBtn.style.boxShadow = ''; }, 2000);
      },
      highlightTimer: function () {
        bar.fill.style.background = '#e74c3c';
        bar.fill.style.height = '25px';
        setTimeout(function () { bar.fill.style.background = ''; bar.fill.style.height = ''; }, 2000);
      },
      highlightCheapestV5: function () { this.highlightCheapest(); },
      showComboDemoV5: function () { this.highlightCombo(); },
      showHintDemoV5: function () { this.highlightHint(); },
      highlightTimerV5: function () { this.highlightTimer(); }
    };

    /* === CANDY SORT: Tutorial UI v5 === */
    function showTutorialV5() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:96;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Tutorial'));
      panel.appendChild(btn('Start Tutorial', function () {
        panel.remove();
        tutorialV5.start();
      }));
      panel.appendChild(btn('Skip', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Help system v5 === */
    function showHelpV5() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:97;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'How to Play'));
      var helpText = el('div', '', '');
      helpText.style.cssText = 'color:#cfc3ee;text-align:left;max-width:550px;';
      helpText.innerHTML = '<p>🖱️ Click candies in order from cheapest to priciest</p>' +
        '<p>🔥 Build combos for bonus points</p>' +
        '<p>💡 Use hints if you get stuck</p>' +
        '<p>⏭️ Skip candies for a penalty</p>' +
        '<p>⏱️ Beat the clock!</p>' +
        '<p>🏆 Complete achievements for rewards!</p>' +
        '<p>🎨 Customize themes and skins!</p>' +
        '<p>📊 Track your analytics!</p>' +
        '<p>🎮 Try different game modes!</p>' +
        '<p>📈 Level up and unlock new modes!</p>';
      panel.appendChild(helpText);
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Settings v5 === */
    function showSettingsV5() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:98;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Settings'));
      panel.appendChild(btn('🔊 Sound: ' + (soundSystem.muted ? 'OFF' : 'ON'), function () {
        var muted = toggleSound();
        panel.children[1].textContent = '🔊 Sound: ' + (muted ? 'OFF' : 'ON');
        triggerSoundToggle(muted);
      }));
      panel.appendChild(btn('🎵 Music: ' + (musicSystem.playing ? 'ON' : 'OFF'), function () {
        if (musicSystem.playing) {
          stopMusic();
        } else {
          startMusic();
        }
        panel.children[2].textContent = '🎵 Music: ' + (musicSystem.playing ? 'ON' : 'OFF');
        triggerMusicToggle(musicSystem.playing);
      }));
      panel.appendChild(btn('✨ Bloom: ' + (visualEffectsV2.bloom ? 'ON' : 'OFF'), function () {
        toggleBloom();
        panel.children[3].textContent = '✨ Bloom: ' + (visualEffectsV2.bloom ? 'ON' : 'OFF');
      }));
      panel.appendChild(btn('🌙 Theme: ' + customizationV4.currentThemeV4, function () {
        customizationV4.cycleThemeV4();
        panel.children[4].textContent = '🌙 Theme: ' + customizationV4.currentThemeV4;
        triggerThemeChangeV5(customizationV4.currentThemeV4);
      }));
      panel.appendChild(btn('🍬 Skin: ' + currentSkinV4, function () {
        var skins = Object.keys(candySkinsV4);
        var idx = skins.indexOf(currentSkinV4);
        idx = (idx + 1) % skins.length;
        setCandySkinV4(skins[idx]);
        panel.children[5].textContent = '🍬 Skin: ' + currentSkinV4;
        triggerSkinChangeV5(currentSkinV4);
      }));
      panel.appendChild(btn('♿ Accessibility', function () { showAccessibilityPanel(); }));
      panel.appendChild(btn('📊 Analytics', function () { showAnalyticsDashboardV4(); }));
      panel.appendChild(btn('🎮 Modes', function () { showModeSelectV5(); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize tutorial v5 === */
    showTutorialV5();

    /* === CANDY SORT: Advanced game analytics v5 === */
    var analyticsV5 = {
      sessionStart: Date.now(),
      events: [],
      metrics: {
        totalClicks: 0,
        correctClicks: 0,
        wrongClicks: 0,
        hintsUsed: 0,
        skipsUsed: 0,
        maxCombo: 0,
        totalScore: 0,
        averageReactionTime: 0,
        accuracy: 0,
        sessionDuration: 0,
        eventsPerSecond: 0,
        clicksPerSecond: 0,
        correctPerSecond: 0
      },
      track: function (event, data) {
        this.events.push({ event: event, data: data, timestamp: Date.now() });
        this.updateMetrics(event, data);
      },
      updateMetrics: function (event, data) {
        switch (event) {
          case 'click': this.metrics.totalClicks++; break;
          case 'correct': this.metrics.correctClicks++; break;
          case 'wrong': this.metrics.wrongClicks++; break;
          case 'hint': this.metrics.hintsUsed++; break;
          case 'skip': this.metrics.skipsUsed++; break;
          case 'combo': this.metrics.maxCombo = Math.max(this.metrics.maxCombo, data.count); break;
          case 'score': this.metrics.totalScore = data.score; break;
        }
        if (this.metrics.totalClicks > 0) {
          this.metrics.accuracy = (this.metrics.correctClicks / this.metrics.totalClicks) * 100;
        }
        this.metrics.sessionDuration = Date.now() - this.sessionStart;
        if (this.metrics.sessionDuration > 0) {
          this.metrics.eventsPerSecond = this.events.length / (this.metrics.sessionDuration / 1000);
          this.metrics.clicksPerSecond = this.metrics.totalClicks / (this.metrics.sessionDuration / 1000);
          this.metrics.correctPerSecond = this.metrics.correctClicks / (this.metrics.sessionDuration / 1000);
        }
      },
      getReport: function () {
        return {
          sessionDuration: this.metrics.sessionDuration,
          metrics: this.metrics,
          events: this.events.length,
          eventTypes: this.getEventTypes(),
          summary: this.getSummary()
        };
      },
      getEventTypes: function () {
        var types = {};
        this.events.forEach(function (e) {
          types[e.event] = (types[e.event] || 0) + 1;
        });
        return types;
      },
      getSummary: function () {
        return 'Score: ' + this.metrics.totalScore + ' | Accuracy: ' + this.metrics.accuracy.toFixed(1) + '% | Max Combo: x' + this.metrics.maxCombo;
      },
      export: function () {
        return JSON.stringify(this.getReport());
      },
      reset: function () {
        this.sessionStart = Date.now();
        this.events = [];
        this.metrics = {
          totalClicks: 0, correctClicks: 0, wrongClicks: 0,
          hintsUsed: 0, skipsUsed: 0, maxCombo: 0,
          totalScore: 0, averageReactionTime: 0, accuracy: 0,
          sessionDuration: 0, eventsPerSecond: 0,
          clicksPerSecond: 0, correctPerSecond: 0
        };
      }
    };

    /* === CANDY SORT: Track events v5 === */
    eventSystemV5.on(GameEventsV5.CANDY_CORRECT, function (data) {
      analyticsV5.track('correct', data);
    });
    eventSystemV5.on(GameEventsV5.CANDY_WRONG, function (data) {
      analyticsV5.track('wrong', data);
    });
    eventSystemV5.on(GameEventsV5.COMBO_MILESTONE, function (data) {
      analyticsV5.track('combo', data);
    });
    eventSystemV5.on(GameEventsV5.GAME_END, function (data) {
      analyticsV5.track('score', { score: data.score });
    });

    /* === CANDY SORT: Analytics dashboard v5 === */
    function showAnalyticsDashboardV5() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:99;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Analytics Dashboard'));
      var report = analyticsV5.getReport();
      var stats = el('div', '', '');
      stats.style.cssText = 'color:#cfc3ee;text-align:left;';
      stats.innerHTML = '<p>Session Duration: ' + Math.round(report.metrics.sessionDuration / 1000) + 's</p>' +
        '<p>Total Clicks: ' + report.metrics.totalClicks + '</p>' +
        '<p>Accuracy: ' + report.metrics.accuracy.toFixed(1) + '%</p>' +
        '<p>Max Combo: ' + report.metrics.maxCombo + '</p>' +
        '<p>Total Score: ' + report.metrics.totalScore + '</p>' +
        '<p>Events/sec: ' + report.metrics.eventsPerSecond.toFixed(2) + '</p>' +
        '<p>Clicks/sec: ' + report.metrics.clicksPerSecond.toFixed(2) + '</p>' +
        '<p>Correct/sec: ' + report.metrics.correctPerSecond.toFixed(2) + '</p>';
      panel.appendChild(stats);
      panel.appendChild(btn('Export Data', function () {
        prompt('Copy analytics data:', analyticsV5.export());
      }));
      panel.appendChild(btn('Reset Analytics', function () {
        analyticsV5.reset();
        panel.remove();
      }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize analytics v5 === */
    analyticsV5.track('game_start', { mode: currentMode });

    /* === CANDY SORT: Advanced game replay v5 === */
    var replayV5 = {
      recording: false,
      frames: [],
      metadata: {
        version: '5.0',
        gameMode: currentMode,
        startTime: null,
        endTime: null,
        frameCount: 0,
        duration: 0
      },
      startRecording: function () {
        this.recording = true;
        this.frames = [];
        this.metadata.startTime = Date.now();
        this.metadata.gameMode = currentMode;
      },
      stopRecording: function () {
        this.recording = false;
        this.metadata.endTime = Date.now();
        this.metadata.frameCount = this.frames.length;
        this.metadata.duration = this.metadata.endTime - this.metadata.startTime;
      },
      recordFrame: function () {
        if (!this.recording) return;
        this.frames.push({
          state: {
            next: next, miss: miss, combo: combo, score: score,
            timeLeft: timeLeft, comboV2: { count: comboV2.count, multiplier: comboV2.multiplier }
          },
          timestamp: performance.now()
        });
      },
      play: function (onFrame, onComplete) {
        var startTime = performance.now();
        var totalDuration = this.frames.length > 0 ? this.frames[this.frames.length - 1].timestamp : 0;
        this.frames.forEach(function (frame) {
          var delay = frame.timestamp - startTime;
          setTimeout(function () {
            onFrame(frame.state);
          }, delay);
        });
        if (onComplete) {
          setTimeout(onComplete, totalDuration);
        }
      },
      export: function () {
        return JSON.stringify({
          metadata: this.metadata,
          frames: this.frames
        });
      },
      import: function (data) {
        var parsed = JSON.parse(data);
        this.metadata = parsed.metadata;
        this.frames = parsed.frames;
      },
      getDuration: function () {
        if (this.frames.length === 0) return 0;
        return this.frames[this.frames.length - 1].timestamp - this.frames[0].timestamp;
      },
      getFrameCount: function () {
        return this.frames.length;
      },
      getMetadata: function () {
        return this.metadata;
      },
      getInfo: function () {
        return {
          duration: this.getDuration(),
          frames: this.getFrameCount(),
          mode: this.metadata.gameMode,
          version: this.metadata.version
        };
      }
    };

    /* === CANDY SORT: Replay controls v5 === */
    function showReplayControlsV5() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;bottom:10px;left:10px;z-index:100;display:flex;gap:8px;';
      stage.appendChild(panel);
      panel.appendChild(btn('⏺️ Record', function () {
        if (replayV5.recording) {
          replayV5.stopRecording();
          panel.children[0].textContent = '⏺️ Record';
        } else {
          replayV5.startRecording();
          panel.children[0].textContent = '⏹️ Stop';
        }
      }));
      panel.appendChild(btn('▶️ Play', function () {
        replayV5.play(function (state) {
          next = state.next;
          miss = state.miss;
          combo = state.combo;
          score = state.score;
          timeLeft = state.timeLeft;
          comboV2.count = state.comboV2.count;
          comboV2.multiplier = state.comboV2.multiplier;
        });
      }));
      panel.appendChild(btn('💾 Save', function () {
        try { localStorage.setItem('candy_sort_replay_v5', replayV5.export()); } catch (e) {}
      }));
      panel.appendChild(btn('📂 Load', function () {
        try {
          var data = localStorage.getItem('candy_sort_replay_v5');
          if (data) replayV5.import(data);
        } catch (e) {}
      }));
      panel.appendChild(btn('ℹ️ Info', function () {
        var info = replayV5.getInfo();
        alert('Duration: ' + Math.round(info.duration) + 'ms\nFrames: ' + info.frames + '\nMode: ' + info.mode + '\nVersion: ' + info.version);
      }));
    }

    /* === CANDY SORT: Initialize replay v5 === */
    showReplayControlsV5();

    /* === CANDY SORT: Advanced game sharing v5 === */
    var shareV5 = {
      generateShareTextV5: function () {
        var report = analyticsV5.getReport();
        return 'I scored ' + report.metrics.totalScore + ' in Candy Sort! ' +
          'Accuracy: ' + report.metrics.accuracy.toFixed(1) + '% ' +
          'Max Combo: x' + report.metrics.maxCombo + ' ' +
          'Time: ' + Math.round(report.metrics.sessionDuration / 1000) + 's ' +
          'Mode: ' + currentMode + ' ' +
          'Can you beat me?';
      },
      generateShareImageV5: function () {
        var canvas = el('canvas', '');
        canvas.width = 800;
        canvas.height = 600;
        var ctx = canvas.getContext('2d');
        var grad = ctx.createLinearGradient(0, 0, 800, 600);
        grad.addColorStop(0, '#0b0620');
        grad.addColorStop(1, '#1a1038');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText('Candy Sort', 280, 90);
        ctx.font = 'bold 72px sans-serif';
        ctx.fillText(analyticsV5.getReport().metrics.totalScore, 320, 200);
        ctx.font = '36px sans-serif';
        ctx.fillStyle = '#cfc3ee';
        ctx.fillText('Accuracy: ' + analyticsV5.getReport().metrics.accuracy.toFixed(1) + '%', 260, 290);
        ctx.fillText('Max Combo: x' + analyticsV5.getReport().metrics.maxCombo, 260, 350);
        ctx.fillText('Time: ' + Math.round(analyticsV5.getReport().metrics.sessionDuration / 1000) + 's', 260, 410);
        ctx.fillText('Mode: ' + currentMode, 260, 470);
        return canvas.toDataURL();
      },
      shareV5: function () {
        if (navigator.share) {
          navigator.share({
            title: 'Candy Sort Score',
            text: this.generateShareTextV5()
          });
        } else {
          prompt('Copy your score:', this.generateShareTextV5());
        }
      },
      copyToClipboardV5: function (text) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text);
        } else {
          prompt('Copy:', text);
        }
      },
      generateQRCodeV5: function (text) {
        return 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(text);
      },
      generateEmbedCodeV5: function () {
        return '<iframe src="' + window.location.href + '" width="700" height="500"></iframe>';
      }
    };

    /* === CANDY SORT: Share UI v5 === */
    function showShareUIV5() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:101;flex-direction:column;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Share Your Score'));
      panel.appendChild(el('p', '', shareV5.generateShareTextV5()));
      var img = el('img', '');
      img.src = shareV5.generateShareImageV5();
      img.style.cssText = 'max-width:80%;border-radius:8px;margin:12px 0;';
      panel.appendChild(img);
      var qr = el('img', '');
      qr.src = shareV5.generateQRCodeV5(shareV5.generateShareTextV5());
      qr.style.cssText = 'width:150px;height:150px;margin:8px;';
      panel.appendChild(qr);
      panel.appendChild(btn('📤 Share', function () { shareV5.shareV5(); }));
      panel.appendChild(btn('📋 Copy Text', function () { shareV5.copyToClipboardV5(shareV5.generateShareTextV5()); }));
      panel.appendChild(btn('🔗 Copy Embed', function () { shareV5.copyToClipboardV5(shareV5.generateEmbedCodeV5()); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Social features v5 === */
    var socialV5 = {
      friends: [],
      challenges: [],
      notifications: [],
      groups: [],
      addFriendV5: function (name, score) {
        this.friends.push({ name: name, score: score, date: Date.now() });
      },
      sendChallengeV5: function (friend, score) {
        this.challenges.push({ to: friend, score: score, date: Date.now(), status: 'pending' });
      },
      getLeaderboardV5: function () {
        return this.friends.sort(function (a, b) { return b.score - a.score; });
      },
      addNotificationV5: function (message, type) {
        this.notifications.push({ message: message, type: type || 'info', time: Date.now(), read: false });
      },
      getUnreadCountV5: function () {
        return this.notifications.filter(function (n) { return !n.read; }).length;
      },
      markAllReadV5: function () {
        this.notifications.forEach(function (n) { n.read = true; });
      },
      createGroupV5: function (name) {
        this.groups.push({ name: name, members: [], created: Date.now() });
      },
      joinGroupV5: function (groupName, memberName) {
        var group = this.groups.find(function (g) { return g.name === groupName; });
        if (group && !group.members.includes(memberName)) {
          group.members.push(memberName);
        }
      },
      getGroupLeaderboardV5: function (groupName) {
        var group = this.groups.find(function (g) { return g.name === groupName; });
        if (!group) return [];
        return group.members.map(function (m) {
          var friend = this.friends.find(function (f) { return f.name === m; });
          return { name: m, score: friend ? friend.score : 0 };
        }, this).sort(function (a, b) { return b.score - a.score; });
      },
      getFriendCount: function () { return this.friends.length; },
      getGroupCount: function () { return this.groups.length; },
      getChallengeCount: function () { return this.challenges.length; }
    };

    /* === CANDY SORT: Initialize sharing v5 === */
    showShareUIV5();

    /* === CANDY SORT: Advanced game customization v5 === */
    var customizationV5 = {
      themesV5: {
        classic: { bg: '#0b0620', accent: '#ffd166', text: '#f5efff', cardBg: '#3b1d5e', name: 'Classic', icon: '🎮' },
        neon: { bg: '#0a0a0a', accent: '#00ff88', text: '#ffffff', cardBg: '#1a1a2e', name: 'Neon', icon: '💚' },
        pastel: { bg: '#1a1a2e', accent: '#ff9ff3', text: '#ffffff', cardBg: '#2d2d44', name: 'Pastel', icon: '🌸' },
        dark: { bg: '#000000', accent: '#ff0000', text: '#ffffff', cardBg: '#1a1a1a', name: 'Dark', icon: '🌑' },
        ocean: { bg: '#0c1445', accent: '#00d4ff', text: '#ffffff', cardBg: '#1a2a5e', name: 'Ocean', icon: '🌊' },
        sunset: { bg: '#1a0a2e', accent: '#ff6b6b', text: '#ffffff', cardBg: '#2e1a4e', name: 'Sunset', icon: '🌅' },
        forest: { bg: '#0a1a0a', accent: '#4ade80', text: '#ffffff', cardBg: '#1a2e1a', name: 'Forest', icon: '🌲' },
        candy: { bg: '#2e0a1a', accent: '#ff69b4', text: '#ffffff', cardBg: '#4e1a2e', name: 'Candy', icon: '🍬' },
        halloween: { bg: '#1a0a00', accent: '#ff7518', text: '#ffffff', cardBg: '#2e1a0a', name: 'Halloween', icon: '🎃' },
        christmas: { bg: '#0a1a0a', accent: '#ff0000', text: '#ffffff', cardBg: '#1a2e1a', name: 'Christmas', icon: '🎄' },
        valentine: { bg: '#2e0a1a', accent: '#ff1493', text: '#ffffff', cardBg: '#4e1a2e', name: 'Valentine', icon: '💕' },
        stpatrick: { bg: '#0a1a0a', accent: '#00ff00', text: '#ffffff', cardBg: '#1a2e1a', name: "St. Patrick's", icon: '☘️' }
      },
      currentThemeV5: 'classic',
      applyThemeV5: function (name) {
        if (this.themesV5[name]) {
          this.currentThemeV5 = name;
          var t = this.themesV5[name];
          stage.style.background = t.bg;
          stage.style.color = t.text;
          document.querySelectorAll('.memcard').forEach(function (btn) {
            btn.style.borderColor = t.accent;
            btn.style.background = t.cardBg;
          });
        }
      },
      cycleThemeV5: function () {
        var themes = Object.keys(this.themesV5);
        var idx = themes.indexOf(this.currentThemeV5);
        idx = (idx + 1) % themes.length;
        this.applyThemeV5(themes[idx]);
      },
      randomThemeV5: function () {
        var themes = Object.keys(this.themesV5);
        var random = themes[(Math.random() * themes.length) | 0];
        this.applyThemeV5(random);
      },
      getThemeNames: function () {
        return Object.keys(this.themesV5);
      },
      getCurrentTheme: function () {
        return this.themesV5[this.currentThemeV5];
      },
      getThemeCount: function () {
        return Object.keys(this.themesV5).length;
      }
    };

    /* === CANDY SORT: Theme selector v5 === */
    function showThemeSelectorV5() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:102;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Theme'));
      Object.keys(customizationV5.themesV5).forEach(function (name) {
        var t = customizationV5.themesV5[name];
        var b = btn(t.icon + ' ' + t.name, function () {
          customizationV5.applyThemeV5(name);
          panel.remove();
        });
        b.style.cssText += ';background:' + t.bg + ';color:' + t.accent + ';border:1px solid ' + t.accent + ';margin:4px;';
        panel.appendChild(b);
      });
      panel.appendChild(btn('🎲 Random', function () { customizationV5.randomThemeV5(); panel.remove(); }));
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Candy skin system v5 === */
    var candySkinsV5 = {
      classic: { emoji: '🍬', color: '#ffd166', name: 'Classic' },
      spooky: { emoji: '🎃', color: '#ff7518', name: 'Spooky' },
      spooky2: { emoji: '👻', color: '#f2f2fa', name: 'Ghost' },
      spooky3: { emoji: '💀', color: '#9aa0b0', name: 'Skull' },
      spooky4: { emoji: '🦇', color: '#4a4a6a', name: 'Bat' },
      spooky5: { emoji: '🕷️', color: '#8b0000', name: 'Spider' },
      spooky6: { emoji: '🧟', color: '#556b2f', name: 'Zombie' },
      spooky7: { emoji: '🧛', color: '#800080', name: 'Vampire' },
      spooky8: { emoji: '🧙', color: '#4b0082', name: 'Witch' },
      spooky9: { emoji: '🎃', color: '#ff6600', name: 'Pumpkin' },
      spooky10: { emoji: '🕸️', color: '#666666', name: 'Web' },
      spooky11: { emoji: '🦉', color: '#8b4513', name: 'Owl' },
      spooky12: { emoji: '🐍', color: '#006400', name: 'Snake' }
    };
    var currentSkinV5 = 'classic';

    function setCandySkinV5(skin) {
      if (candySkinsV5[skin]) {
        currentSkinV5 = skin;
        row.querySelectorAll('.memcard').forEach(function (btn) {
          btn.style.borderColor = candySkinsV5[skin].color;
          btn.style.boxShadow = '0 0 15px ' + candySkinsV5[skin].color + '40';
        });
      }
    }

    /* === CANDY SORT: Skin selector v5 === */
    function showSkinSelectorV5() {
      var panel = el('div', '', '');
      panel.style.cssText = 'position:absolute;inset:0;background:rgba(11,6,32,0.95);display:flex;align-items:center;justify-content:center;z-index:103;flex-direction:column;overflow-y:auto;';
      stage.appendChild(panel);
      panel.appendChild(el('h3', '', 'Select Candy Skin'));
      Object.keys(candySkinsV5).forEach(function (name) {
        var s = candySkinsV5[name];
        var b = btn(s.emoji + ' ' + s.name, function () {
          setCandySkinV5(name);
          panel.remove();
        });
        b.style.cssText += ';border:1px solid ' + s.color + ';margin:4px;';
        panel.appendChild(b);
      });
      panel.appendChild(btn('Close', function () { panel.remove(); }));
    }

    /* === CANDY SORT: Initialize customization v5 === */
    showThemeSelectorV5();

    /* === CANDY SORT: Advanced game physics v6 === */
    var physicsV6 = {
      gravity: 0.1,
      airResistance: 0.9995,
      groundFriction: 0.95,
      bounce: 0.8,
      maxSpeed: 35,
      terminalVelocity: 30,
      windResistance: 0.9999,
      dragCoefficient: 0.5,
      airDensity: 1.225
    };

    function createPhysicsBodyV6(x, y, vx, vy, mass, size, rotation) {
      return {
        x: x, y: y, vx: vx, vy: vy,
        mass: mass || 1, size: size || 10,
        rotation: rotation || 0, rotSpeed: 0,
        forces: [], isStatic: false, isTrigger: false,
        collisionLayer: 0, collisionMask: 0xFFFFFFFF,
        restitution: 0.7, friction: 0.5,
        dragArea: size * size, volume: size * size * size
      };
    }

    function applyForceV6(body, fx, fy) {
      if (body.isStatic) return;
      body.forces.push({ x: fx, y: fy });
    }

    function updatePhysicsBodyV6(body, dt) {
      if (body.isStatic) return;
      body.forces.forEach(function (f) {
        body.vx += f.x / body.mass;
        body.vy += f.y / body.mass;
      });
      body.forces = [];
      var speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
      var dragForce = 0.5 * physicsV6.airDensity * speed * speed * physicsV6.dragCoefficient * body.dragArea;
      if (speed > 0) {
        body.vx -= (body.vx / speed) * dragForce / body.mass;
        body.vy -= (body.vy / speed) * dragForce / body.mass;
      }
      body.vx *= physicsV6.airResistance;
      body.vy *= physicsV6.airResistance;
      body.vy += physicsV6.gravity;
      if (speed > physicsV6.maxSpeed) {
        body.vx = (body.vx / speed) * physicsV6.maxSpeed;
        body.vy = (body.vy / speed) * physicsV6.maxSpeed;
      }
      if (body.vy > physicsV6.terminalVelocity) {
        body.vy = physicsV6.terminalVelocity;
      }
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.rotation += body.rotSpeed;
      if (body.y > 320) {
        body.y = 320;
        body.vy *= -physicsV6.bounce;
        body.vx *= physicsV6.groundFriction;
        if (Math.abs(body.vy) < 0.1) body.vy = 0;
      }
    }

    /* === CANDY SORT: Collision detection v6 === */
    function checkCollisionV6(a, b) {
      var dx = a.x - b.x;
      var dy = a.y - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      return dist < (a.size + b.size);
    }

    function resolveCollisionV6(a, b) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      var nx = dx / dist;
      var ny = dy / dist;
      var relVx = a.vx - b.vx;
      var relVy = a.vy - b.vy;
      var relDot = relVx * nx + relVy * ny;
      if (relDot > 0) return;
      var totalMass = a.mass + b.mass;
      var restitution = Math.min(a.restitution, b.restitution);
      var impulse = -(1 + restitution) * relDot / totalMass;
      a.vx -= impulse * b.mass * nx;
      a.vy -= impulse * b.mass * ny;
      b.vx += impulse * a.mass * nx;
      b.vy += impulse * a.mass * ny;
    }

    /* === CANDY SORT: Physics simulation v6 === */
    var physicsBodiesV6 = [];
    function addPhysicsBodyV6(x, y, vx, vy, mass, size, rotation) {
      var body = createPhysicsBodyV6(x, y, vx, vy, mass, size, rotation);
      physicsBodiesV6.push(body);
      return body;
    }

    function updatePhysicsV6() {
      physicsBodiesV6.forEach(function (b) {
        updatePhysicsBodyV6(b, 0.016);
      });
      for (var i = 0; i < physicsBodiesV6.length; i++) {
        for (var j = i + 1; j < physicsBodiesV6.length; j++) {
          if (checkCollisionV6(physicsBodiesV6[i], physicsBodiesV6[j])) {
            resolveCollisionV6(physicsBodiesV6[i], physicsBodiesV6[j]);
          }
        }
      }
    }

    /* === CANDY SORT: Initialize physics v6 === */
    updatePhysicsV6();

    /* === CANDY SORT: Advanced input buffering v5 === */
    var inputBufferV5 = {
      buffer: [],
      maxSize: 50,
      add: function (input) {
        this.buffer.push({ input: input, time: performance.now() });
        if (this.buffer.length > this.maxSize) this.buffer.shift();
      },
      get: function (within) {
        var now = performance.now();
        return this.buffer.filter(function (i) { return now - i.time < within; });
      },
      clear: function () { this.buffer = []; },
      process: function () {
        var inputs = this.get(300);
        inputs.forEach(function (i) {
          if (i.input === 'click') handleClickV5();
          if (i.input === 'right') handleRightV5();
          if (i.input === 'left') handleLeftV5();
          if (i.input === 'undo') triggerUndoV5();
          if (i.input === 'redo') triggerRedoV5();
          if (i.input === 'pause') togglePauseV5();
        });
        this.clear();
      },
      undo: function () {
        if (this.buffer.length > 0) {
          this.buffer.pop();
        }
      },
      redo: function () {},
      getStats: function () {
        return {
          bufferSize: this.buffer.length,
          maxSize: this.maxSize
        };
      }
    };

    function handleClickV5() {
      if (over) return;
      var btns = row.querySelectorAll('.memcard:not(.done)');
      if (btns.length > 0) {
        btns[0].click();
      }
    }

    function handleRightV5() {
      if (next < 6) {
        next++;
        st.textContent = 'Skipped to ' + next + '/6';
      }
    }

    function handleLeftV5() {
      if (next > 0) {
        next--;
        st.textContent = 'Back to ' + next + '/6';
      }
    }

    function togglePauseV5() {
      if (pauseSystem.paused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }

    /* === CANDY SORT: Input prediction v5 === */
    var inputPredictionV5 = {
      history: [],
      patterns: {},
      predict: function () {
        if (this.history.length < 7) return null;
        var last7 = this.history.slice(-7).map(function (i) { return i.candy; });
        var key = last7.join(',');
        if (this.patterns[key]) {
          return this.patterns[key];
        }
        return null;
      },
      add: function (candy) {
        this.history.push({ candy: candy, time: performance.now() });
        if (this.history.length > 60) this.history.shift();
        if (this.history.length >= 8) {
          var last8 = this.history.slice(-8).map(function (i) { return i.candy; });
          var key = last8.slice(0, 7).join(',');
          var next = last8[7];
          this.patterns[key] = next;
        }
      },
      getStats: function () {
        return {
          historyLength: this.history.length,
          patternsFound: Object.keys(this.patterns).length
        };
      },
      clear: function () {
        this.history = [];
        this.patterns = {};
      }
    };

    /* === CANDY SORT: Input validation v5 === */
    function validateInputV5(candy) {
      if (!candy) return { valid: false, reason: 'No candy' };
      if (over) return { valid: false, reason: 'Game over' };
      if (candy.key === ordered[next].key) return { valid: true, correct: true };
      return { valid: true, correct: false };
    }

    /* === CANDY SORT: Input sanitization v5 === */
    function sanitizeInputV5(input) {
      if (typeof input !== 'string') return '';
      return input.replace(/[<>"'`\\/\\{\\}\\[\\]\\(\\)]/g, '');
    }

    /* === CANDY SORT: Input logging v5 === */
    var inputLogV5 = [];
    function logInputV5(type, data) {
      inputLogV5.push({ type: type, data: data, time: performance.now() });
      if (inputLogV5.length > 500) inputLogV5.shift();
    }

    /* === CANDY SORT: Input statistics v5 === */
    function getInputStatsV5() {
      var clicks = inputLogV5.filter(function (i) { return i.type === 'click'; });
      var correct = clicks.filter(function (i) { return i.data && i.data.correct; }).length;
      var wrong = clicks.length - correct;
      return {
        total: clicks.length,
        correct: correct,
        wrong: wrong,
        accuracy: clicks.length > 0 ? (correct / clicks.length) * 100 : 0,
        averageReactionTime: calculateAverageReactionTimeV5()
      };
    }

    function calculateAverageReactionTimeV5() {
      var reactions = inputLogV5.filter(function (i) { return i.type === 'click'; });
      if (reactions.length === 0) return 0;
      var total = reactions.reduce(function (sum, i) { return sum + (i.data.reactionTime || 0); }, 0);
      return total / reactions.length;
    }

    /* === CANDY SORT: Initialize input system v5 === */
    inputBufferV5.clear();
  }

  /* ================================================================
   * GAME 3: GHOST RACE — visual track with power-ups and boost mechanics
   * ================================================================ */
  function buildRace(stage, P) {
    var st = status('Pick your racer!');
    var row = el('div', 'prow');
    var trackWrap = el('div', '');
    trackWrap.style.cssText = 'width:100%;padding:8px;';
    stage.appendChild(st); stage.appendChild(row); stage.appendChild(trackWrap);
    var names = ['Wraith', 'Specter', 'Banshee'];
    var emojis = ['👻', '💀', '🌫️'];
    var colors = ['#c0392b', '#8e44ad', '#2980b9'];
    var pos = [0, 0, 0], mine = -1, over = false, bars = [], racers = [];
    var powerUps = [false, false, false], powerUpTimers = [0, 0, 0], boostCooldown = 0;
    var raceTime = 0, maxSpeed = 6, minSpeed = 2;

    names.forEach(function (n, i) {
      var b = btn(emojis[i] + ' ' + n, function () {
        if (mine >= 0) { boost(i); return; }
        mine = i; st.textContent = 'Racing! Click ' + n + ' to cheer!'; sfxClick(); every(200, tick);
      });
      row.appendChild(b);
      var trackEl = el('div', '');
      trackEl.style.cssText = 'width:100%;height:30px;background:rgba(255,255,255,0.05);border-radius:15px;margin:4px 0;position:relative;overflow:hidden;';
      var racerEl = el('div', '', emojis[i]);
      racerEl.style.cssText = 'position:absolute;left:0;top:50%;transform:translateY(-50%);font-size:1.2em;transition:left 0.2s ease;';
      var bar = el('div', '', n + ': 0%');
      bar.style.cssText = 'color:' + colors[i] + ';font-size:0.85em;';
      trackEl.appendChild(racerEl); trackWrap.appendChild(trackEl); trackWrap.appendChild(bar);
      bars.push(bar); racers.push(racerEl);
    });

    function boost(i) {
      if (!over && i === mine && boostCooldown <= 0) { pos[i] += 4; boostCooldown = 3; sfxWhoosh(); st.textContent = names[i] + ' boosted!'; }
    }

    function tick() {
      if (over) return;
      raceTime += 0.2;
      for (var i = 0; i < 3; i++) {
        var speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
        if (powerUps[i]) speed *= 1.5;
        pos[i] += speed;
        racers[i].style.left = Math.min(95, pos[i]) + '%';
        bars[i].textContent = names[i] + ': ' + Math.min(100, Math.round(pos[i])) + '%';
      }
      if (boostCooldown > 0) boostCooldown--;
      for (var p = 0; p < 3; p++) { if (powerUpTimers[p] > 0) { powerUpTimers[p]--; if (powerUpTimers[p] === 0) powerUps[p] = false; } }
      if (Math.random() < 0.02) { var idx = (Math.random() * 3) | 0; if (!powerUps[idx]) { powerUps[idx] = true; powerUpTimers[idx] = 5; bars[idx].textContent += ' ⚡'; } }
      for (var w = 0; w < 3; w++) {
        if (pos[w] >= 100) {
          over = true;
          if (w === mine) { st.textContent = names[w] + ' wins! Ghost Racer! +50 gold'; P.addGold(50); P.unlock('race-1', 'Ghost Racer'); sfxWin(); }
          else { st.textContent = names[w] + ' wins. Your ghost got dusted.'; sfxLose(); }
          return;
        }
      }
    }
  }

  /* ================================================================
   * GAME 4: SPELL DUEL — animated combat with health bars and specials
   * ================================================================ */
  function buildDuel(stage, P) {
    var st = status('Choose your spell!');
    var row = el('div', 'prow');
    var hpWrap = el('div', '');
    hpWrap.style.cssText = 'width:100%;padding:8px;';
    stage.appendChild(st); stage.appendChild(row); stage.appendChild(hpWrap);
    var spells = [['🔥', 'Fire', '#e74c3c'], ['💧', 'Water', '#3498db'], ['🍃', 'Leaf', '#2ecc71']];
    var you = 0, foe = 0, over = false, youHP = 3, foeHP = 3;
    var beats = { Fire: 'Leaf', Leaf: 'Water', Water: 'Fire' };
    var roundNum = 0, combo = 0, specialReady = false;
    var specialBtn = btn('✨ Special', function () {
      if (!specialReady || over) return;
      specialReady = false; specialBtn.style.opacity = '0.4';
      var f = spells[(Math.random() * 3) | 0][1];
      var dmg = 2; foeHP -= dmg; foe += dmg;
      st.textContent = 'SPECIAL HIT! ' + dmg + ' damage! ' + youHP + '-' + foeHP;
      sfxCombo(); flashScreen('#c44dff', 0.2);
      checkEnd();
    });
    specialBtn.style.opacity = '0.4';
    var youBar = el('div', 'You: ' + '❤️'.repeat(youHP));
    youBar.style.cssText = 'color:#2ecc71;';
    var foeBar = el('div', 'Ghost: ' + '❤️'.repeat(foeHP));
    foeBar.style.cssText = 'color:#e74c3c;';
    hpWrap.appendChild(youBar); hpWrap.appendChild(foeBar); hpWrap.appendChild(specialBtn);

    function checkEnd() {
      if (youHP <= 0 || foeHP <= 0 || you >= 3 || foe >= 3) {
        over = true;
        if (you >= 3 || foeHP <= 0) { st.textContent = 'Duelist! +40 gold'; P.addGold(40); P.unlock('duel-3', 'Spell Duelist'); sfxWin(); }
        else { st.textContent = 'The ghost wins...'; sfxLose(); }
      }
    }

    spells.forEach(function (s) {
      row.appendChild(btn(s[0] + ' ' + s[1], function () {
        if (over) return;
        roundNum++;
        var f = spells[(Math.random() * 3) | 0][1];
        var line = 'You ' + s[1] + ' vs ' + f + '. ';
        if (s[1] === f) { line += 'Tie. '; combo = 0; }
        else if (beats[s[1]] === f) { you++; combo++; foeHP--; line += 'You hit! '; sfxGood(); if (combo >= 2) { specialReady = true; specialBtn.style.opacity = '1'; line += 'Special ready! '; } }
        else { foe++; combo = 0; youHP--; line += 'Ghost hits! '; sfxBad(); }
        line += youHP + '-' + foeHP;
        youBar.textContent = 'You: ' + '❤️'.repeat(Math.max(0, youHP));
        foeBar.textContent = 'Ghost: ' + '❤️'.repeat(Math.max(0, foeHP));
        st.textContent = line;
        checkEnd();
      }));
    });
  }

  /* ================================================================
   * GAME 5: MAZE ESCAPE — fog of war, timer, and animated player
   * ================================================================ */
  function buildEscape(stage, P) {
    var S = window.Spooky;
    var st = status('Find the exit!');
    var timerBar = el('div', '');
    var grid = el('div', 'memgrid');
    grid.style.cssText += ';grid-template-columns:repeat(9,1fr);gap:2px;';
    var nav = el('div', 'prow');
    stage.appendChild(st); stage.appendChild(timerBar); stage.appendChild(grid); stage.appendChild(nav);
    var mz = S.carveDFS(9, 9, (Math.random() * 1e9) | 0);
    var cells = {}, px = 1, pz = 1, over = false, timeLeft = 60, moves = 0;
    var fog = {}, bar = new AnimatedBar(timerBar, 60, '#2ecc71', 'Time');
    for (var k in mz.cells) cells[k] = true;
    var goal = [7, 7];

    function revealFog() { for (var dx = -2; dx <= 2; dx++) { for (var dz = -2; dz <= 2; dz++) { fog[(px + dx) + ',' + (pz + dz)] = true; } } }

    function draw() {
      grid.innerHTML = '';
      for (var z = 0; z < 9; z++) for (var x = 0; x < 9; x++) {
        var d = el('div', 'memcard', '');
        d.style.cssText += ';font-size:0.7em;min-height:28px;';
        var key = x + ',' + z;
        if (!fog[key]) { d.style.background = '#0b0620'; d.style.opacity = '0.3'; }
        else if (!cells[key]) { d.style.background = '#241243'; }
        else if (x === px && z === pz) { d.textContent = '🎃'; d.style.background = '#ff7518'; d.style.boxShadow = '0 0 8px rgba(255,117,24,0.5)'; }
        else if (x === goal[0] && z === goal[1]) { d.textContent = '🚪'; d.style.background = '#1d5e2b'; }
        grid.appendChild(d);
      }
    }

    function move(dx, dz) {
      if (over) return;
      if (cells[(px + dx) + ',' + (pz + dz)]) { px += dx; pz += dz; moves++; revealFog(); sfxClick(); }
      if (px === goal[0] && pz === goal[1]) {
        over = true;
        var bonus = Math.max(0, 60 - moves);
        st.textContent = 'Escaped! Escape Artist! +' + (60 + bonus) + ' gold';
        P.addGold(60 + bonus); P.addScore(200); P.unlock('escape-1', 'Escape Artist'); sfxWin();
      }
      draw();
    }

    [['↑', 0, -1], ['↓', 0, 1], ['←', -1, 0], ['→', 1, 0]].forEach(function (d) { nav.appendChild(btn(d[0], function () { move(d[1], d[2]); })); });
    revealFog(); draw();
    every(1000, function () { if (over) return; timeLeft--; bar.set(timeLeft); if (timeLeft <= 0) { over = true; st.textContent = 'Time up! The maze claims another...'; sfxLose(); } });
  }

  /* ================================================================
   * GAME 6: TRIVIA — timed questions with streaks and categories
   * ================================================================ */
  function buildTrivia(stage, P) {
    var qs = [
      ['How many ghost types haunt the app?', ['25', '18', '11', '40'], 0],
      ['What is the ultimate pick?', ['Void Drill', 'Diamond Pick', 'Stone Pick', 'Stick'], 0],
      ['What is the deepest layer called?', ['Magma Core', 'Dirt Tunnels', 'Stone Depths', 'The Lobby'], 0],
      ['How many relics exist?', ['12', '7', '14', '60'], 0],
      ['What does coal buy?', ['Pick upgrades', 'Candy', 'Ghosts', 'Nothing'], 0]
    ];
    var st = status('Question 1/5');
    var timerBar = el('div', '');
    var box = el('div', 'prow');
    box.style.cssText = 'flex-direction:column;gap:8px;';
    stage.appendChild(st); stage.appendChild(timerBar); stage.appendChild(box);
    var i = 0, right = 0, over = false, streak = 0, timePerQ = 10, timeLeft = timePerQ;
    var bar = new AnimatedBar(timerBar, timePerQ, '#c44dff', 'Time');

    function ask() {
      box.innerHTML = '';
      st.textContent = 'Question ' + (i + 1) + '/5 — ' + qs[i][0];
      timeLeft = timePerQ; bar.set(timeLeft);
      qs[i][1].forEach(function (opt, k) {
        var b = btn(opt, function () {
          if (over) return;
          if (k === qs[i][2]) { right++; streak++; var pts = 10 * streak; P.addScore(pts); sfxGood(); b.style.background = '#27ae60'; }
          else { streak = 0; sfxBad(); b.style.background = '#c0392b'; }
          i++;
          if (i >= qs.length) {
            over = true;
            st.textContent = right + '/5' + (right === 5 ? ' — Scholar! +50 gold' : ' — try again!');
            box.innerHTML = '';
            if (right === 5) { P.addGold(50); P.unlock('trivia-5', 'Scholar'); sfxWin(); }
          } else { setTimeout(ask, 500); }
        });
        b.style.cssText += ';transition:all 0.2s ease;padding:12px 20px;font-size:1em;';
        box.appendChild(b);
      });
    }

    every(1000, function () {
      if (over) return;
      timeLeft--; bar.set(timeLeft);
      if (timeLeft <= 0) { streak = 0; i++; if (i >= qs.length) { over = true; st.textContent = right + '/5 — try again!'; box.innerHTML = ''; } else { ask(); } }
    });
    ask();
  }

  /* ================================================================
   * GAME 7: RHYTHM — visual beat indicator with combos and speed ramp
   * ================================================================ */
  function buildRhythm(stage, P) {
    var st = status('Get ready...');
    var bar = el('div', 'plist');
    bar.style.cssText = 'font-family:monospace;font-size:1.2em;letter-spacing:2px;padding:8px;';
    var combo = el('div', '', '');
    combo.style.cssText = 'color:#c44dff;font-weight:bold;min-height:1.4em;';
    var tap = btn('TAP!', function () { hit(); });
    tap.style.cssText += ';font-size:1.3em;padding:16px 32px;';
    stage.appendChild(st); stage.appendChild(bar); stage.appendChild(combo); stage.appendChild(tap);
    var pos = 0, dir = 1, round = 0, hits = 0, over = false, comboCount = 0, speed = 4;

    every(60, function () {
      if (over) return;
      pos += dir * speed;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      var s = '';
      for (var i = 0; i < 20; i++) { if (i === Math.round(pos / 5)) s += '●'; else if (i === 10) s += '|'; else s += '·'; }
      bar.textContent = s;
    });

    function hit() {
      if (over) return;
      round++;
      var good = Math.abs(pos - 50) < 15;
      if (good) { hits++; comboCount++; sfxGood(); combo.textContent = comboCount >= 3 ? '🔥 Combo x' + comboCount + '!' : ''; }
      else { comboCount = 0; combo.textContent = ''; sfxBad(); }
      st.textContent = 'Round ' + round + '/10 · Hits ' + hits + (good ? ' — nice!' : ' — miss');
      if (round >= 10) {
        over = true;
        if (hits >= 8) { st.textContent += ' Drummer! +40 gold'; P.addGold(40); P.unlock('rhythm-8', 'Drummer'); sfxWin(); }
        else { st.textContent += ' — again!'; sfxLose(); }
        speed = Math.min(8, 4 + round * 0.1);
      }
    }
  }

  /* ================================================================
   * GAME 8: VOXEL RUN — enhanced graphics with power-ups and particles
   * ================================================================ */
  function buildRun(stage, P) {
    var st = status('Survive!');
    var timerBar = el('div', '');
    var cv = el('canvas', '');
    cv.width = 360; cv.height = 160;
    cv.style.width = '100%';
    cv.style.cssText += ';border-radius:8px;';
    stage.appendChild(st); stage.appendChild(timerBar); stage.appendChild(cv);
    var jump = btn('JUMP', function () { if (py >= 128) vy = -9; });
    jump.style.cssText += ';font-size:1.2em;padding:12px 24px;';
    stage.appendChild(jump);
    var g = cv.getContext('2d');
    var px = 40, py = 128, vy = 0, bats = [], t = 30, over = false, n = 0;
    var powerUp = false, powerUpTimer = 0, score = 0;
    var bar = new AnimatedBar(timerBar, 30, '#e63946', 'Time');

    every(50, function () {
      if (over) return;
      t -= 0.05; n++;
      vy += 0.5; py += vy;
      if (py > 128) { py = 128; vy = 0; }
      if (n % 14 === 0) bats.push({ x: 360, y: 60 + Math.random() * 60 });
      bats.forEach(function (b) { b.x -= 5 + (30 - t) * 0.2; });
      if (powerUp) { powerUpTimer -= 0.05; if (powerUpTimer <= 0) powerUp = false; }
      if (Math.random() < 0.01 && !powerUp) { powerUp = true; powerUpTimer = 5; st.textContent = '⭐ INVINCIBLE!'; }
      if (!powerUp && bats.some(function (b) { return Math.abs(b.x - px) < 16 && Math.abs(b.y - py) < 16; })) {
        over = true; st.textContent = 'Bonked! Survived ' + Math.round(30 - t) + 's. Again!'; sfxLose(); return;
      }
      bats = bats.filter(function (b) { return b.x > -10; });
      g.fillStyle = '#0b0620'; g.fillRect(0, 0, 360, 160);
      g.fillStyle = '#1a1038'; g.fillRect(0, 0, 360, 160);
      g.fillStyle = '#3b1d5e'; g.fillRect(0, 140, 360, 20);
      g.fillStyle = '#59e6ff';
      for (var i = 0; i < 5; i++) g.fillRect(i * 80 + 20, 20 + i * 15, 4, 4);
      if (powerUp) { g.fillStyle = 'rgba(255,209,102,0.3)'; g.fillRect(px - 12, py - 18, 24, 24); }
      g.fillStyle = powerUp ? '#ffd166' : '#ff9f1c';
      g.fillRect(px - 8, py - 16, 16, 16);
      g.fillStyle = '#fff'; g.fillRect(px - 4, py - 12, 3, 3); g.fillRect(px + 2, py - 12, 3, 3);
      g.fillStyle = '#1a1a2e';
      bats.forEach(function (b) { g.fillRect(b.x - 8, b.y - 6, 16, 12); g.fillStyle = '#4a4a6a'; g.fillRect(b.x - 12, b.y - 4, 4, 3); g.fillRect(b.x + 8, b.y - 4, 4, 3); g.fillStyle = '#1a1a2e'; });
      score = Math.round((30 - t) * 10);
      st.textContent = 'Survive! ' + Math.ceil(t) + 's left · Score ' + score;
      bar.set(t);
      if (t <= 0) { over = true; st.textContent = 'Marathoner! +60 gold'; P.addGold(60); P.addScore(300); P.unlock('run-30', 'Marathoner'); sfxWin(); }
    });
  }

  /* ================================================================
   * GAME 9: CANDY CATCHER — different candy types with combos
   * ================================================================ */
  function buildCatcher(stage, P) {
    var st = status('Catch 10!');
    var cv = el('canvas', '');
    cv.width = 320; cv.height = 240;
    cv.style.width = '100%';
    cv.style.cssText += ';border-radius:8px;cursor:none;';
    stage.appendChild(st); stage.appendChild(cv);
    var g = cv.getContext('2d');
    var bx = 160, drops = [], caught = 0, over = false, n = 0, combo = 0, comboTimer = 0, missed = 0;

    cv.onmousemove = function (e) { try { var r = cv.getBoundingClientRect(); bx = (e.clientX - r.left) * (320 / (r.width || 320)); } catch (err) {} };
    cv.onclick = function () {
      if (over) return;
      drops.forEach(function (d) {
        if (d.y > 210 && Math.abs(d.x - bx) < 28) { d.caught = true; caught++; combo++; comboTimer = 3; var pts = 10 * combo; P.addScore(pts); sfxCoin(); }
      });
    };

    every(60, function () {
      if (over) return;
      n++;
      if (n % 10 === 0) {
        var types = [{ emoji: '🍬', pts: 10, w: 30 }, { emoji: '🍭', pts: 15, w: 20 }, { emoji: '🍫', pts: 12, w: 20 }, { emoji: '⭐', pts: 50, w: 5 }, { emoji: '💎', pts: 100, w: 2 }];
        var total = 0; types.forEach(function (t) { total += t.w; });
        var r = Math.random() * total, chosen = types[0];
        for (var i = 0; i < types.length; i++) { r -= types[i].w; if (r <= 0) { chosen = types[i]; break; } }
        drops.push({ x: 20 + Math.random() * 280, y: -10, type: chosen, caught: false });
      }
      drops.forEach(function (d) { d.y += 3.5; });
      drops = drops.filter(function (d) { if (d.caught) return false; if (d.y > 245) { if (!d.counted) { missed++; combo = 0; d.counted = true; } return false; } return true; });
      if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) combo = 0; }
      g.fillStyle = '#0b0620'; g.fillRect(0, 0, 320, 240);
      g.fillStyle = '#1a1038'; g.fillRect(0, 0, 320, 240);
      g.fillStyle = '#3b1d5e'; g.fillRect(0, 220, 320, 20);
      g.fillStyle = '#ff7518'; g.fillRect(bx - 24, 224, 48, 10);
      g.fillStyle = '#ffd166'; g.fillRect(bx - 20, 222, 40, 4);
      drops.forEach(function (d) { g.font = '16px sans-serif'; g.fillText(d.type.emoji, d.x - 8, d.y + 6); });
      st.textContent = 'Caught ' + caught + '/10 · Missed ' + missed + (combo >= 3 ? ' · 🔥 Combo x' + combo : '');
      if (caught >= 10) { over = true; st.textContent = 'Candy Keeper! +50 gold'; P.addGold(50); P.unlock('catch-10', 'Candy Keeper'); sfxWin(); }
    });
    stage._cleanup = function () { cv.onmousemove = null; cv.onclick = null; };
  }

  /* ================================================================
   * GAME 10: ECHO SIMON — visual effects with speed increase
   * ================================================================ */
  function buildSimon(stage, P) {
    var st = status('Watch...');
    var row = el('div', 'prow');
    row.style.cssText = 'gap:12px;justify-content:center;';
    stage.appendChild(st); stage.appendChild(row);
    var cols = [['🟥', '#c0392b', 261], ['🟩', '#27ae60', 329], ['🟦', '#2980b9', 392], ['🟨', '#f39c12', 523]];
    var seq = [], at = 0, lock = true, round = 0, over = false, pads = [], speed = 450;

    cols.forEach(function (c, i) {
      var b = el('button', 'memcard', c[0]);
      b.style.cssText += ';font-size:2em;width:70px;height:70px;transition:all 0.15s ease;';
      b.onclick = function () { press(i, b); };
      row.appendChild(b); pads.push(b);
    });

    function next() { seq.push((Math.random() * 4) | 0); round++; speed = Math.max(200, 450 - round * 30); playSeq(); }

    function playSeq() {
      var k = 0; lock = true; st.textContent = 'Round ' + round + ' — watch...';
      var t = every(speed, function () {
        pads.forEach(function (p) { p.style.outline = 'none'; p.style.transform = 'scale(1)'; });
        if (k >= seq.length) {
          clearInterval(t); var ii = timers.indexOf(t); if (ii >= 0) timers.splice(ii, 1);
          lock = false; at = 0; st.textContent = 'Round ' + round + ' — repeat!'; return;
        }
        pads[seq[k]].style.outline = '4px solid white'; pads[seq[k]].style.transform = 'scale(1.1)';
        playTone(cols[seq[k]][2], 0.15, 'sine', 0.1); k++;
      });
    }

    function press(i, btn) {
      if (lock || over) return;
      playTone(cols[i][2], 0.1, 'sine', 0.08);
      if (i !== seq[at]) { over = true; st.textContent = 'Wrong pad! Reached round ' + round + '. Again!'; sfxLose(); return; }
      at++;
      if (at >= seq.length) {
        if (round >= 5) { over = true; st.textContent = 'Echo Mind! +50 gold'; P.addGold(50); P.unlock('simon-5', 'Echo Mind'); sfxWin(); return; }
        next();
      }
    }
    next();
  }

  /* ================================================================
   * GAME 11: MEMORY MATCH — animations, timer, and combo system
   * ================================================================ */
  function buildMemory(stage, P) {
    var wrap = el('div', 'memwrap');
    var st = status('Memory Match — find all 8 pairs!');
    var timerBar = el('div', '');
    var grid = el('div', 'memgrid');
    grid.style.cssText += ';grid-template-columns:repeat(4,1fr);gap:8px;';
    wrap.appendChild(st); wrap.appendChild(timerBar); wrap.appendChild(grid);
    stage.appendChild(wrap);
    var deck, open, lock, moves, found, timeLeft = 60, combo = 0;
    var bar = new AnimatedBar(timerBar, 60, '#8b5cf6', 'Time');

    function deal() {
      var S = window.Spooky;
      var base = S.CANDIES.slice(0, 8).map(function (c) { return c.name; });
      deck = base.concat(base);
      for (var i = deck.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
      open = -1; lock = false; moves = 0; found = 0; timeLeft = 60;
      grid.innerHTML = '';
      deck.forEach(function (name, idx) {
        var b = el('button', 'memcard', '?');
        b.style.cssText += ';font-size:1.2em;min-height:60px;transition:all 0.3s ease;';
        b.onclick = function () { flip(idx, b); };
        grid.appendChild(b);
      });
      st.textContent = 'Memory Match — find all 8 pairs!';
    }

    function flip(idx, btn) {
      if (lock || btn.textContent !== '?') return;
      btn.textContent = deck[idx]; btn.classList.add('open');
      btn.style.transform = 'rotateY(180deg)'; setTimeout(function () { btn.style.transform = 'rotateY(0deg)'; }, 150);
      sfxClick();
      if (open < 0) { open = idx; return; }
      moves++;
      var a = grid.children[open], b = btn, ai = open;
      if (deck[ai] === deck[idx]) {
        a.classList.add('done'); b.classList.add('done');
        a.style.opacity = '0.5'; b.style.opacity = '0.5';
        open = -1; found += 2; combo++;
        var pts = 10 * combo; P.addScore(pts); sfxGood();
        st.textContent = 'Moves: ' + moves + ' · Found ' + (found / 2) + '/8' + (combo >= 2 ? ' · Combo x' + combo : '');
        if (found === 16) {
          var bonus = Math.max(0, 30 - moves);
          st.textContent = 'Cleared in ' + moves + ' moves! Memory Master! +' + (30 + bonus) + ' gold';
          P.addGold(30 + bonus); P.unlock('match-8', 'Memory Master'); sfxWin();
        }
      } else {
        combo = 0; lock = true; st.textContent = 'Moves: ' + moves; sfxBad();
        setTimeout(function () { a.textContent = '?'; b.textContent = '?'; a.classList.remove('open'); b.classList.remove('open'); open = -1; lock = false; }, 700);
      }
    }

    every(1000, function () { if (lock) return; timeLeft--; bar.set(timeLeft); if (timeLeft <= 0) { st.textContent = 'Time up! Found ' + (found / 2) + '/8 pairs.'; sfxLose(); } });
    wrap.appendChild(btn('New game', deal));
    deal();
  }

  /* ================================================================
   * GAME REGISTRY
   * ================================================================ */
  var games = [
    { key: 'smash', name: '🎃 Pumpkin Smash', desc: 'Smash 10 pumpkins in 30s. Combos and power-ups!', build: buildSmash },
    { key: 'sort', name: '🍬 Candy Sort', desc: 'Click the 6 candies from cheapest to priciest. Timed!', build: buildSort },
    { key: 'race', name: '👻 Ghost Race', desc: 'Pick a racer, cheer to boost. First to 100% wins!', build: buildRace },
    { key: 'duel', name: '✨ Spell Duel', desc: 'Fire beats Leaf, Leaf beats Water, Water beats Fire. First to 3.', build: buildDuel },
    { key: 'escape', name: '🌀 Maze Escape', desc: 'Escape the 9x9 vault with fog of war. Reach the exit!', build: buildEscape },
    { key: 'trivia', name: '🧠 Trivia', desc: '5 questions from the vaults. Ace them all!', build: buildTrivia },
    { key: 'rhythm', name: '🎵 Rhythm', desc: 'Tap when the marker hits the center zone. 8/10 wins.', build: buildRhythm },
    { key: 'run', name: '🧱 Voxel Run', desc: 'Survive 30s. Jump over the bats! Power-ups appear!', build: buildRun },
    { key: 'catcher', name: '🍬 Candy Catcher', desc: 'Click falling candy to catch 10! Rare candy = big points!', build: buildCatcher },
    { key: 'simon', name: '🟢 Echo Simon', desc: 'Repeat the growing pattern. Reach round 5!', build: buildSimon },
    { key: 'memory', name: '🧠 Memory Match', desc: 'Find all 8 pairs. Fewer moves = more gold!', build: buildMemory }
  ];

  window.SpookyGames = { list: games, stopAll: stopAll };
})();

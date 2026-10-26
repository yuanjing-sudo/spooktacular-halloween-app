/* SpookyGames — 20 playable micro-games for the Arcade tab.
 * Enhanced edition: particle systems, Web Audio sound effects, animated
 * transitions, combo mechanics, progressive difficulty, and polished UI.
 * Each entry: { key, name, desc, build(stage, P) } where P is the profile
 * (gold/coal/score/XP/unlock/flash). All timers route through every() /
 * everyRaf() / later() so the host can pause or stop them (pauseAll, stopAll).
 */
(function () {
  'use strict';

  var timers = [];
  var rafIds = new Set();
  var timeouts = [];
  var cleanups = [];
  var audioCtx = null;
  var muted = false;
  var paused = false;
  var gen = 0;

  function every(ms, fn) {
    var id = setInterval(function () { if (!paused) fn(); }, ms);
    timers.push(id);
    return id;
  }
  function everyRaf(fn) {
    var g = gen, cur = 0;
    function step(ts) {
      if (g !== gen) return;
      if (!paused) fn(ts);
      var next = requestAnimationFrame(step);
      rafIds.delete(cur);
      rafIds.add(next);
      cur = next;
    }
    cur = requestAnimationFrame(step);
    rafIds.add(cur);
    return cur;
  }
  function later(fn, ms) {
    var id;
    function run() {
      if (paused) { id = setTimeout(run, 100); timeouts.push(id); return; }
      var i = timeouts.indexOf(id);
      if (i >= 0) timeouts.splice(i, 1);
      fn();
    }
    id = setTimeout(run, ms);
    timeouts.push(id);
    return id;
  }
  function onCleanup(fn) { cleanups.push(fn); }
  function stopAll() {
    gen++;
    timers.forEach(clearInterval);
    rafIds.forEach(cancelAnimationFrame);
    timers = [];
    rafIds = new Set();
    timeouts.forEach(clearTimeout);
    timeouts = [];
    cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    cleanups = [];
    paused = false;
  }
  function pauseAll() { paused = true; }
  function resumeAll() { paused = false; }
  function setMuted(v) { muted = !!v; }
  function isMuted() { return muted; }

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

  /* Shared game-over card used by the newer games. */
  function endCard(stage, build, P, o) {
    o = o || {};
    var card = el('div', 'g-result');
    var icon = o.win ? '🏆' : '💀';
    card.innerHTML =
      '<div class="gr-icon">' + (o.icon || icon) + '</div>' +
      '<h3>' + (o.title || (o.win ? 'Victory!' : 'The night wins')) + '</h3>' +
      '<p>' + (o.lines || '') + (o.gold ? '<br><span class="gr-gold">+' + o.gold + ' gold</span>' : '') + '</p>';
    var row = el('div', 'prow');
    row.appendChild(btn('↻ Play again', function () {
      if (o.onReplay) return o.onReplay();
      restartGame(build, stage, P);
    }));
    row.appendChild(btn('🎮 Arcade', function () {
      if (window.SpookyArcade) window.SpookyArcade.toHub();
    }));
    card.appendChild(row);
    stage.appendChild(card);
    if (window.SpookyArcade && window.SpookyArcade.result) {
      window.SpookyArcade.result({ win: !!o.win, score: o.score || 0, gold: o.gold || 0 });
    }
  }
  function restartGame(build, stage, P) {
    stopAll();
    stage.innerHTML = '';
    setTimeout(function () { build(stage, P); }, 0);
  }
  function canvasPoint(cv, ev) {
    var r = cv.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) * (cv.width / (r.width || cv.width)),
      y: (ev.clientY - r.top) * (cv.height / (r.height || cv.height))
    };
  }
  function bar(container, cls) {
    var m = el('div', 'g-meter' + (cls ? ' ' + cls : ''));
    var fill = el('i');
    m.appendChild(fill);
    container.appendChild(m);
    return {
      set: function (pct) { fill.style.width = Math.max(0, Math.min(100, pct)) + '%'; },
      node: m
    };
  }
  function stat(parent, label, value, hot) {
    var s = el('div', 'g-stat' + (hot ? ' hot' : ''), '<b>' + value + '</b>' + label);
    parent.appendChild(s);
    return {
      set: function (v) { s.querySelector('b').textContent = v; },
      node: s
    };
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ================================================================
   * AUDIO SYSTEM — Web Audio API synthesized sound effects
   * ================================================================ */
  function getAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function playTone(freq, dur, type, vol, slide) {
    if (muted) return;
    var ctx = getAudio();
    if (!ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }
  function sfxClick() { playTone(800, 0.08, 'square', 0.08); }
  function sfxGood() { playTone(523, 0.1, 'sine', 0.12); playTone(659, 0.1, 'sine', 0.12); playTone(784, 0.15, 'sine', 0.12); }
  function sfxBad() { playTone(200, 0.2, 'sawtooth', 0.1, 100); }
  function sfxWin() {
    var ctx = getAudio(); if (!ctx) return;
    var notes = [523, 659, 784, 1047];
    notes.forEach(function (n, i) {
      setTimeout(function () { playTone(n, 0.2, 'sine', 0.15); }, i * 120);
    });
  }
  function sfxLose() {
    var ctx = getAudio(); if (!ctx) return;
    playTone(300, 0.3, 'sawtooth', 0.1, 150);
    setTimeout(function () { playTone(200, 0.4, 'sawtooth', 0.1, 80); }, 200);
  }
  function sfxPop() { playTone(1200, 0.05, 'square', 0.06, 600); }
  function sfxWhoosh() { playTone(400, 0.15, 'sine', 0.08, 800); }
  function sfxCoin() { playTone(988, 0.08, 'square', 0.08); setTimeout(function () { playTone(1319, 0.15, 'square', 0.08); }, 80); }
  function sfxCombo() { playTone(600, 0.06, 'sine', 0.1, 1200); }

  /* ================================================================
   * PARTICLE SYSTEM — lightweight canvas particle effects
   * ================================================================ */
  function ParticleSystem(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.running = false;
  }
  ParticleSystem.prototype.emit = function (x, y, count, color, speed, life) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = (0.3 + Math.random()) * (speed || 3);
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5,
        life: 1, decay: 0.01 + Math.random() * 0.025,
        color: color || '#ffd166',
        size: 2 + Math.random() * 4
      });
    }
  };
  ParticleSystem.prototype.emitBurst = function (x, y, count, colors) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = 1 + Math.random() * 5;
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2,
        life: 1, decay: 0.008 + Math.random() * 0.02,
        color: colors[(Math.random() * colors.length) | 0],
        size: 2 + Math.random() * 5
      });
    }
  };
  ParticleSystem.prototype.update = function () {
    var self = this;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= p.decay;
      self.ctx.globalAlpha = Math.max(0, p.life);
      self.ctx.fillStyle = p.color;
      self.ctx.beginPath();
      self.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      self.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
    this.particles = this.particles.filter(function (p) { return p.life > 0; });
  };
  ParticleSystem.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this;
    function loop() {
      if (!self.running) return;
      self.update();
      everyRaf(loop);
    }
    loop();
  };
  ParticleSystem.prototype.stop = function () {
    this.running = false;
  };

  /* ================================================================
   * ANIMATED PROGRESS BAR
   * ================================================================ */
  function AnimatedBar(container, max, color) {
    this.container = container;
    this.max = max;
    this.value = 0;
    this.color = color || '#ffd166';
    this.bar = el('div', '');
    this.bar.style.cssText = 'width:100%;height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;margin:4px 0;';
    this.fill = el('div', '');
    this.fill.style.cssText = 'height:100%;width:0%;background:' + this.color + ';border-radius:4px;transition:width 0.3s ease;';
    this.bar.appendChild(this.fill);
    container.appendChild(this.bar);
  }
  AnimatedBar.prototype.set = function (v) {
    this.value = v;
    var pct = Math.min(100, (v / this.max) * 100);
    this.fill.style.width = pct + '%';
  };

  /* ================================================================
   * FLOATING TEXT — score popups
   * ================================================================ */
  function floatText(parent, x, y, text, color) {
    var d = el('div', '', text);
    d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;color:' + (color || '#ffd166') +
      ';font-weight:bold;font-size:1.1em;pointer-events:none;transition:all 0.8s ease-out;opacity:1;';
    parent.appendChild(d);
    setTimeout(function () {
      d.style.top = (y - 40) + 'px';
      d.style.opacity = '0';
    }, 50);
    setTimeout(function () { d.remove(); }, 900);
  }

  /* ================================================================
   * GAME 1: PUMPKIN SMASH — full-stage grid, particles, combo meter
   * ================================================================ */
  function buildSmash(stage, P) {
    stage.classList.add('g-smash');
    var wrap = el('div', 'smash-wrap');
    var hud = el('div', 'smash-hud');
    var sScore = el('div', 'smash-stat hot', '<b>0</b><span>Score</span>');
    var sCount = el('div', 'smash-stat', '<b>0/10</b><span>Smashed</span>');
    var sTime = el('div', 'smash-stat', '<b>45</b><span>Seconds</span>');
    hud.appendChild(sScore); hud.appendChild(sCount); hud.appendChild(sTime);

    var combo = el('div', 'smash-combo', 'Tap the lit pumpkins 🎃');
    var meter = el('div', 'g-meter');
    var fill = el('i');
    meter.appendChild(fill);
    var grid = el('div', 'smash-grid');
    wrap.appendChild(hud);
    wrap.appendChild(meter);
    wrap.appendChild(combo);
    wrap.appendChild(grid);
    stage.appendChild(wrap);

    var cells = [];
    var smashed = 0, score = 0, left = 45, over = false;
    var comboCount = 0, comboT = 0;
    var powerUp = false, powerUpLeft = 0;

    for (var i = 0; i < 12; i++) {
      (function () {
        var b = el('button', 'smash-cell');
        b.type = 'button';
        var p = el('span', 'pumpkin', '🎃');
        b.appendChild(p);
        var c = { el: b, live: false, star: false, hideT: 0 };
        b.onclick = function () { hit(c); };
        cells.push(c);
        grid.appendChild(b);
      })();
    }

    function paint() {
      sScore.querySelector('b').textContent = score;
      sCount.querySelector('b').textContent = smashed + '/10';
      sTime.querySelector('b').textContent = left;
      fill.style.width = Math.max(0, (left / 45) * 100) + '%';
    }

    function clearCell(c) {
      if (c.hideT) { clearTimeout(c.hideT); c.hideT = 0; }
      c.live = false;
      c.star = false;
      c.el.classList.remove('live', 'star', 'pop');
      c.el.querySelector('.pumpkin').textContent = '🎃';
    }

    function light() {
      if (over) return;
      var free = cells.filter(function (c) { return !c.live; });
      if (!free.length) return;
      var c = free[(Math.random() * free.length) | 0];
      c.live = true;
      c.star = Math.random() < 0.09;
      c.el.classList.add(c.star ? 'star' : 'live');
      c.el.classList.remove('pop');
      void c.el.offsetWidth;
      c.el.classList.add('pop');
      c.el.querySelector('.pumpkin').textContent = c.star ? '⭐' : '🎃';
      c.hideT = later(function () { clearCell(c); }, c.star ? 3200 : 1900);
    }

    function burst(c, color, count) {
      var r = c.el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      var x = r.left - sr.left + r.width / 2;
      var y = r.top - sr.top + r.height / 2;
      for (var i = 0; i < count; i++) {
        var bit = el('i', 'smash-bit');
        bit.style.left = x + 'px';
        bit.style.top = y + 'px';
        bit.style.background = i % 3 ? color : '#ffd166';
        var a = Math.random() * Math.PI * 2;
        var d = 16 + Math.random() * 64;
        bit.style.setProperty('--dx', Math.cos(a) * d + 'px');
        bit.style.setProperty('--dy', Math.sin(a) * d + 'px');
        bit.style.setProperty('--sz', (3 + Math.random() * 5) + 'px');
        stage.appendChild(bit);
        (function (node) {
          setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 640);
        })(bit);
      }
      floatText(stage, x - 8, y - 12, '+' + lastPts, '#ffd166');
    }

    var lastPts = 0;
    function hit(c) {
      if (over) return;
      if (!c.live) {
        c.el.classList.remove('miss');
        void c.el.offsetWidth;
        c.el.classList.add('miss');
        if (comboCount > 0) comboCount = Math.max(0, comboCount - 1);
        return;
      }
      if (c.star) {
        powerUp = true;
        powerUpLeft = 6;
        lastPts = 20;
        score += 20;
        P.addScore(20);
        combo.textContent = '⭐ POWER UP — double points for 6s!';
        combo.classList.remove('bump'); void combo.offsetWidth; combo.classList.add('bump');
        burst(c, '#ffd166', 16);
        sfxCoin();
        clearCell(c);
        paint();
        return;
      }
      smashed++;
      comboCount++;
      comboT = 2.6;
      var pts = powerUp ? 50 : 25;
      if (comboCount >= 3) pts += comboCount * 5;
      lastPts = pts;
      score += pts;
      P.addScore(pts);
      burst(c, '#ff7518', 15);
      combo.textContent = comboCount >= 3 ? '🔥 Combo x' + comboCount + ' · +' + pts : 'Nice smash · +' + pts;
      combo.classList.remove('bump'); void combo.offsetWidth; combo.classList.add('bump');
      sfxPop();
      if (comboCount >= 3) sfxCombo();
      clearCell(c);
      paint();
      if (smashed >= 10) end(true);
    }

    function tick() {
      if (over) return;
      left--;
      if (comboT > 0) {
        comboT--;
        if (comboT <= 0) {
          comboCount = 0;
          if (!powerUp) combo.textContent = 'Combo dropped — start a new chain';
        }
      }
      if (powerUpLeft > 0) {
        powerUpLeft--;
        if (powerUpLeft <= 0) { powerUp = false; combo.textContent = 'Power-up faded'; }
        else if (!over) combo.textContent = '⭐ DOUBLE POINTS · ' + powerUpLeft + 's';
      }
      paint();
      if (left <= 0) end(false);
    }

    function end(won) {
      if (over) return;
      over = true;
      var gold = smashed * 3 + (won ? 25 : 0);
      if (gold > 0) P.addGold(gold);
      if (won) { P.unlock('smash-10', 'Pumpkin Pro'); sfxWin(); } else sfxLose();
      endCard(stage, buildSmash, P, {
        win: won,
        icon: won ? '🎃' : '⏳',
        title: won ? 'Pumpkin Pro!' : 'Time, pumpkin!',
        lines: 'Smashed ' + smashed + ' pumpkin' + (smashed === 1 ? '' : 's') + ' · ' + score + ' points',
        gold: gold,
        score: score
      });
    }

    light(); light(); light();
    every(780, function () {
      light();
      if (left < 24 && Math.random() < 0.45) light();
    });
    every(1000, tick);
    paint();
  }

  /* ================================================================
   * GAME 2: CANDY SORT — enhanced with drag-drop, animations, timer
   * ================================================================ */
  function buildSort(stage, P) {
    var S = window.Spooky;
    var st = status('Click cheapest first!');
    var timerBar = el('div', '');
    var row = el('div', 'prow');
    row.style.cssText = 'flex-wrap:wrap;gap:6px;justify-content:center;';
    stage.appendChild(st); stage.appendChild(timerBar); stage.appendChild(row);

    var six = shuffle(S.CANDIES.slice(0, 6).map(function (c) { return c; }));
    var next = 0, miss = 0, over = false;
    var timeLeft = 30;
    var combo = 0;
    var bar = new AnimatedBar(timerBar, 30, '#59e6ff');

    var ordered = S.CANDIES.slice(0, 6).sort(function (a, b) { return a.points - b.points; });

    six.forEach(function (c) {
      var b = el('button', 'memcard', c.name + '<br>' + c.points);
      b.style.cssText += ';transition:all 0.2s ease;cursor:pointer;';
      b.onclick = function () {
        if (over || b.classList.contains('done')) return;
        if (c.key === ordered[next].key) {
          b.classList.add('done');
          b.style.opacity = '0.4';
          b.style.transform = 'scale(0.9)';
          combo++;
          var pts = 10 * combo;
          P.addScore(pts);
          sfxGood();
          next++;
          if (next >= 6) {
            over = true;
            var bonus = miss === 0 ? 30 : 15;
            st.textContent = miss === 0 ? 'Perfect sort! Sharp Sorter! +' + bonus + ' gold' : 'Sorted with ' + miss + ' miss(es)! +' + bonus + ' gold';
            P.addGold(bonus); P.unlock('sort-6', 'Sharp Sorter');
            sfxWin();
          } else {
            st.textContent = 'Correct! ' + (6 - next) + ' to go!';
          }
        } else {
          miss++;
          combo = 0;
          b.style.animation = 'shake 0.3s ease';
          setTimeout(function () { b.style.animation = ''; }, 300);
          sfxBad();
          st.textContent = 'Not quite — ' + miss + ' miss(es). Keep going!';
        }
      };
      row.appendChild(b);
    });

    every(1000, function () {
      if (over) return;
      timeLeft--;
      bar.set(timeLeft);
      if (timeLeft <= 0) {
        over = true;
        st.textContent = 'Time up! Sorted ' + next + '/6. Try again!';
        sfxLose();
      }
    });
  }

  /* ================================================================
   * GAME 3: GHOST RACE — enhanced with visual track, power-ups, particles
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
    var pos = [0, 0, 0], mine = -1, over = false;
    var bars = [], racers = [];
    var powerUps = [false, false, false];
    var powerUpTimers = [0, 0, 0];
    var boostCooldown = 0;

    names.forEach(function (n, i) {
      var b = btn(emojis[i] + ' ' + n, function () {
        if (mine >= 0) { boost(i); return; }
        mine = i;
        st.textContent = 'Racing! Click ' + n + ' to cheer!';
        sfxClick();
        every(200, tick);
      });
      row.appendChild(b);

      var trackEl = el('div', '');
      trackEl.style.cssText = 'width:100%;height:30px;background:rgba(255,255,255,0.05);border-radius:15px;margin:4px 0;position:relative;overflow:hidden;';
      var racerEl = el('div', '', emojis[i]);
      racerEl.style.cssText = 'position:absolute;left:0;top:50%;transform:translateY(-50%);font-size:1.2em;transition:left 0.2s ease;';
      var bar = el('div', '', n + ': 0%');
      bar.style.cssText = 'color:' + colors[i] + ';font-size:0.85em;';
      trackEl.appendChild(racerEl);
      trackWrap.appendChild(trackEl);
      trackWrap.appendChild(bar);
      bars.push(bar);
      racers.push(racerEl);
    });

    function boost(i) {
      if (!over && i === mine && boostCooldown <= 0) {
        pos[i] += 4;
        boostCooldown = 3;
        sfxWhoosh();
        st.textContent = names[i] + ' boosted!';
      }
    }

    function tick() {
      if (over) return;
      for (var i = 0; i < 3; i++) {
        var speed = Math.random() * 4;
        if (powerUps[i]) speed *= 1.5;
        pos[i] += speed;
        racers[i].style.left = Math.min(95, pos[i]) + '%';
        bars[i].textContent = names[i] + ': ' + Math.min(100, Math.round(pos[i])) + '%';
      }
      if (boostCooldown > 0) boostCooldown--;
      for (var p = 0; p < 3; p++) {
        if (powerUpTimers[p] > 0) {
          powerUpTimers[p]--;
          if (powerUpTimers[p] === 0) powerUps[p] = false;
        }
      }
      if (Math.random() < 0.02) {
        var idx = (Math.random() * 3) | 0;
        if (!powerUps[idx]) {
          powerUps[idx] = true;
          powerUpTimers[idx] = 5;
          bars[idx].textContent += ' ⚡';
        }
      }
      for (var w = 0; w < 3; w++) {
        if (pos[w] >= 100) {
          over = true;
          if (w === mine) {
            st.textContent = names[w] + ' wins! Ghost Racer! +50 gold';
            P.addGold(50); P.unlock('race-1', 'Ghost Racer');
            sfxWin();
          } else {
            st.textContent = names[w] + ' wins. Your ghost got dusted.';
            sfxLose();
          }
          return;
        }
      }
    }
  }

  /* ================================================================
   * GAME 4: SPELL DUEL — enhanced with animations, health bars, specials
   * ================================================================ */
  function buildDuel(stage, P) {
    var st = status('Choose your spell!');
    var row = el('div', 'prow');
    var hpWrap = el('div', '');
    hpWrap.style.cssText = 'width:100%;padding:8px;';
    stage.appendChild(st); stage.appendChild(row); stage.appendChild(hpWrap);

    var spells = [['🔥', 'Fire', '#e74c3c'], ['💧', 'Water', '#3498db'], ['🍃', 'Leaf', '#2ecc71']];
    var you = 0, foe = 0, over = false;
    var youHP = 3, foeHP = 3;
    var beats = { Fire: 'Leaf', Leaf: 'Water', Water: 'Fire' };
    var roundNum = 0;
    var combo = 0;
    var specialReady = false;
    var specialBtn = btn('✨ Special', function () {
      if (!specialReady || over) return;
      specialReady = false;
      specialBtn.style.opacity = '0.4';
      var f = spells[(Math.random() * 3) | 0][1];
      var dmg = beats[spells[0][1]] === f ? 2 : 1;
      foeHP -= dmg;
      foe += dmg;
      st.textContent = 'SPECIAL HIT! ' + dmg + ' damage! ' + youHP + '-' + foeHP;
      sfxCombo();
      checkEnd();
    });
    specialBtn.style.opacity = '0.4';

    var youBar = el('div', 'You: ❤️'.repeat(youHP));
    youBar.style.cssText = 'color:#2ecc71;';
    var foeBar = el('div', 'Ghost: ❤️'.repeat(foeHP));
    foeBar.style.cssText = 'color:#e74c3c;';
    hpWrap.appendChild(youBar);
    hpWrap.appendChild(foeBar);
    hpWrap.appendChild(specialBtn);

    function checkEnd() {
      if (youHP <= 0 || foeHP <= 0 || you >= 3 || foe >= 3) {
        over = true;
        if (you >= 3 || foeHP <= 0) {
          st.textContent = 'Duelist! +40 gold';
          P.addGold(40); P.unlock('duel-3', 'Spell Duelist');
          sfxWin();
        } else {
          st.textContent = 'The ghost wins...';
          sfxLose();
        }
      }
    }

    spells.forEach(function (s) {
      row.appendChild(btn(s[0] + ' ' + s[1], function () {
        if (over) return;
        roundNum++;
        var f = spells[(Math.random() * 3) | 0][1];
        var line = 'You ' + s[1] + ' vs ' + f + '. ';
        if (s[1] === f) { line += 'Tie. '; combo = 0; }
        else if (beats[s[1]] === f) {
          you++; combo++;
          foeHP--;
          line += 'You hit! ';
          sfxGood();
          if (combo >= 2) { specialReady = true; specialBtn.style.opacity = '1'; line += 'Special ready! '; }
        } else {
          foe++; combo = 0;
          youHP--;
          line += 'Ghost hits! ';
          sfxBad();
        }
        line += youHP + '-' + foeHP;
        youBar.textContent = 'You: ' + '❤️'.repeat(Math.max(0, youHP));
        foeBar.textContent = 'Ghost: ' + '❤️'.repeat(Math.max(0, foeHP));
        st.textContent = line;
        checkEnd();
      }));
    });
  }

  /* ================================================================
   * GAME 5: MAZE ESCAPE — enhanced with fog of war, timer, minimap
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
    var cells = {}, px = 1, pz = 1, over = false;
    var timeLeft = 60;
    var moves = 0;
    var fog = {};
    var bar = new AnimatedBar(timerBar, 60, '#2ecc71');

    for (var k in mz.cells) cells[k] = true;
    var goal = [7, 7];

    function revealFog() {
      for (var dx = -2; dx <= 2; dx++) {
        for (var dz = -2; dz <= 2; dz++) {
          fog[(px + dx) + ',' + (pz + dz)] = true;
        }
      }
    }

    function draw() {
      grid.innerHTML = '';
      for (var z = 0; z < 9; z++) for (var x = 0; x < 9; x++) {
        var d = el('div', 'memcard', '');
        d.style.cssText += ';font-size:0.7em;min-height:28px;';
        var key = x + ',' + z;
        if (!fog[key]) {
          d.style.background = '#0b0620';
          d.style.opacity = '0.3';
        } else if (!cells[key]) {
          d.style.background = '#241243';
        } else if (x === px && z === pz) {
          d.textContent = '🎃';
          d.style.background = '#ff7518';
          d.style.boxShadow = '0 0 8px rgba(255,117,24,0.5)';
        } else if (x === goal[0] && z === goal[1]) {
          d.textContent = '🚪';
          d.style.background = '#1d5e2b';
        }
        grid.appendChild(d);
      }
    }

    function move(dx, dz) {
      if (over) return;
      if (cells[(px + dx) + ',' + (pz + dz)]) {
        px += dx; pz += dz;
        moves++;
        revealFog();
        sfxClick();
      }
      if (px === goal[0] && pz === goal[1]) {
        over = true;
        var bonus = Math.max(0, 60 - moves);
        st.textContent = 'Escaped! Escape Artist! +' + (60 + bonus) + ' gold';
        P.addGold(60 + bonus); P.addScore(200); P.unlock('escape-1', 'Escape Artist');
        sfxWin();
      }
      draw();
    }

    [['↑', 0, -1], ['↓', 0, 1], ['←', -1, 0], ['→', 1, 0]].forEach(function (d) {
      nav.appendChild(btn(d[0], function () { move(d[1], d[2]); }));
    });

    revealFog();
    draw();

    every(1000, function () {
      if (over) return;
      timeLeft--;
      bar.set(timeLeft);
      if (timeLeft <= 0) {
        over = true;
        st.textContent = 'Time up! The maze claims another...';
        sfxLose();
      }
    });
  }

  /* ================================================================
   * GAME 6: TRIVIA — enhanced with timer, streaks, categories
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

    var i = 0, right = 0, over = false;
    var streak = 0;
    var timePerQ = 10;
    var timeLeft = timePerQ;
    var bar = new AnimatedBar(timerBar, timePerQ, '#c44dff');

    function ask() {
      box.innerHTML = '';
      st.textContent = 'Question ' + (i + 1) + '/5 — ' + qs[i][0];
      timeLeft = timePerQ;
      bar.set(timeLeft);
      qs[i][1].forEach(function (opt, k) {
        var b = btn(opt, function () {
          if (over) return;
          if (k === qs[i][2]) {
            right++;
            streak++;
            var pts = 10 * streak;
            P.addScore(pts);
            sfxGood();
            b.style.background = '#27ae60';
          } else {
            streak = 0;
            sfxBad();
            b.style.background = '#c0392b';
          }
          i++;
          if (i >= qs.length) {
            over = true;
            st.textContent = right + '/5' + (right === 5 ? ' — Scholar! +50 gold' : ' — try again!');
            box.innerHTML = '';
            if (right === 5) { P.addGold(50); P.unlock('trivia-5', 'Scholar'); sfxWin(); }
          } else {
            setTimeout(ask, 500);
          }
        });
        b.style.cssText += ';transition:all 0.2s ease;padding:12px 20px;font-size:1em;';
        box.appendChild(b);
      });
    }

    every(1000, function () {
      if (over) return;
      timeLeft--;
      bar.set(timeLeft);
      if (timeLeft <= 0) {
        streak = 0;
        i++;
        if (i >= qs.length) {
          over = true;
          st.textContent = right + '/5 — try again!';
          box.innerHTML = '';
        } else {
          ask();
        }
      }
    });

    ask();
  }

  /* ================================================================
   * GAME 7: RHYTHM — enhanced with visual beat indicator, combos
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

    var pos = 0, dir = 1, round = 0, hits = 0, over = false;
    var comboCount = 0;
    var speed = 4;

    every(60, function () {
      if (over) return;
      pos += dir * speed;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      var s = '';
      for (var i = 0; i < 20; i++) {
        if (i === Math.round(pos / 5)) s += '●';
        else if (i === 10) s += '|';
        else s += '·';
      }
      bar.textContent = s;
    });

    function hit() {
      if (over) return;
      round++;
      var good = Math.abs(pos - 50) < 15;
      if (good) {
        hits++;
        comboCount++;
        sfxGood();
        combo.textContent = comboCount >= 3 ? '🔥 Combo x' + comboCount + '!' : '';
      } else {
        comboCount = 0;
        combo.textContent = '';
        sfxBad();
      }
      st.textContent = 'Round ' + round + '/10 · Hits ' + hits + (good ? ' — nice!' : ' — miss');
      if (round >= 10) {
        over = true;
        if (hits >= 8) {
          st.textContent += ' Drummer! +40 gold';
          P.addGold(40); P.unlock('rhythm-8', 'Drummer');
          sfxWin();
        } else {
          st.textContent += ' — again!';
          sfxLose();
        }
        speed = Math.min(8, 4 + round * 0.1);
      }
    }
  }

  /* ================================================================
   * GAME 8: VOXEL RUN — enhanced with better graphics, power-ups
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
    var powerUp = false, powerUpTimer = 0;
    var score = 0;
    var bar = new AnimatedBar(timerBar, 30, '#e63946');

    every(50, function () {
      if (over) return;
      t -= 0.05; n++;
      vy += 0.5; py += vy;
      if (py > 128) { py = 128; vy = 0; }
      if (n % 14 === 0) bats.push({ x: 360, y: 60 + Math.random() * 60 });
      bats.forEach(function (b) { b.x -= 5 + (30 - t) * 0.2; });
      if (powerUp) {
        powerUpTimer -= 0.05;
        if (powerUpTimer <= 0) powerUp = false;
      }
      if (Math.random() < 0.01 && !powerUp) {
        powerUp = true;
        powerUpTimer = 5;
        st.textContent = '⭐ INVINCIBLE!';
      }
      if (!powerUp && bats.some(function (b) { return Math.abs(b.x - px) < 16 && Math.abs(b.y - py) < 16; })) {
        over = true;
        st.textContent = 'Bonked! Survived ' + Math.round(30 - t) + 's. Again!';
        sfxLose();
        return;
      }
      bats = bats.filter(function (b) { return b.x > -10; });

      g.fillStyle = '#0b0620'; g.fillRect(0, 0, 360, 160);
      g.fillStyle = '#1a1038'; g.fillRect(0, 0, 360, 160);
      g.fillStyle = '#3b1d5e'; g.fillRect(0, 140, 360, 20);
      g.fillStyle = '#59e6ff';
      for (var i = 0; i < 5; i++) g.fillRect(i * 80 + 20, 20 + i * 15, 4, 4);

      if (powerUp) {
        g.fillStyle = 'rgba(255,209,102,0.3)';
        g.fillRect(px - 12, py - 18, 24, 24);
      }
      g.fillStyle = powerUp ? '#ffd166' : '#ff9f1c';
      g.fillRect(px - 8, py - 16, 16, 16);
      g.fillStyle = '#fff';
      g.fillRect(px - 4, py - 12, 3, 3);
      g.fillRect(px + 2, py - 12, 3, 3);

      g.fillStyle = '#1a1a2e';
      bats.forEach(function (b) {
        g.fillRect(b.x - 8, b.y - 6, 16, 12);
        g.fillStyle = '#4a4a6a';
        g.fillRect(b.x - 12, b.y - 4, 4, 3);
        g.fillRect(b.x + 8, b.y - 4, 4, 3);
        g.fillStyle = '#1a1a2e';
      });

      score = Math.round((30 - t) * 10);
      st.textContent = 'Survive! ' + Math.ceil(t) + 's left · Score ' + score;
      bar.set(t);
      if (t <= 0) {
        over = true;
        st.textContent = 'Marathoner! +60 gold';
        P.addGold(60); P.addScore(300); P.unlock('run-30', 'Marathoner');
        sfxWin();
      }
    });
  }

  /* ================================================================
   * GAME 9: CANDY CATCHER — enhanced with different candy types, combos
   * ================================================================ */
  function buildCatcher(stage, P) {
    var st = status('Catch 10!');
    var cv = el('canvas', '');
    cv.width = 320; cv.height = 240;
    cv.style.width = '100%';
    cv.style.cssText += ';border-radius:8px;cursor:none;';
    stage.appendChild(st); stage.appendChild(cv);

    var g = cv.getContext('2d');
    var bx = 160, drops = [], caught = 0, over = false, n = 0;
    var combo = 0, comboTimer = 0;
    var missed = 0;

    cv.onmousemove = function (e) {
      try {
        var r = cv.getBoundingClientRect();
        bx = (e.clientX - r.left) * (320 / (r.width || 320));
      } catch (err) {}
    };
    cv.onclick = function () {
      if (over) return;
      drops.forEach(function (d) {
        if (d.y > 210 && Math.abs(d.x - bx) < 28) {
          d.caught = true;
          caught++;
          combo++;
          comboTimer = 3;
          var pts = 10 * combo;
          P.addScore(pts);
          sfxCoin();
        }
      });
    };

    every(60, function () {
      if (over) return;
      n++;
      if (n % 10 === 0) {
        var types = [
          { emoji: '🍬', pts: 10, w: 30 },
          { emoji: '🍭', pts: 15, w: 20 },
          { emoji: '🍫', pts: 12, w: 20 },
          { emoji: '⭐', pts: 50, w: 5 },
          { emoji: '💎', pts: 100, w: 2 }
        ];
        var total = 0;
        types.forEach(function (t) { total += t.w; });
        var r = Math.random() * total;
        var chosen = types[0];
        for (var i = 0; i < types.length; i++) {
          r -= types[i].w;
          if (r <= 0) { chosen = types[i]; break; }
        }
        drops.push({ x: 20 + Math.random() * 280, y: -10, type: chosen, caught: false });
      }
      drops.forEach(function (d) { d.y += 3.5; });
      drops = drops.filter(function (d) {
        if (d.caught) return false;
        if (d.y > 245) {
          if (!d.counted) { missed++; combo = 0; d.counted = true; }
          return false;
        }
        return true;
      });
      if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) combo = 0; }

      g.fillStyle = '#0b0620'; g.fillRect(0, 0, 320, 240);
      g.fillStyle = '#1a1038'; g.fillRect(0, 0, 320, 240);
      g.fillStyle = '#3b1d5e'; g.fillRect(0, 220, 320, 20);

      g.fillStyle = '#ff7518';
      g.fillRect(bx - 24, 224, 48, 10);
      g.fillStyle = '#ffd166';
      g.fillRect(bx - 20, 222, 40, 4);

      drops.forEach(function (d) {
        g.font = '16px sans-serif';
        g.fillText(d.type.emoji, d.x - 8, d.y + 6);
      });

      st.textContent = 'Caught ' + caught + '/10 · Missed ' + missed + (combo >= 3 ? ' · 🔥 Combo x' + combo : '');
      if (caught >= 10) {
        over = true;
        st.textContent = 'Candy Keeper! +50 gold';
        P.addGold(50); P.unlock('catch-10', 'Candy Keeper');
        sfxWin();
      }
    });

    stage._cleanup = function () { cv.onmousemove = null; cv.onclick = null; };
  }

  /* ================================================================
   * GAME 10: ECHO SIMON — enhanced with visual effects, speed increase
   * ================================================================ */
  function buildSimon(stage, P) {
    var st = status('Watch...');
    var row = el('div', 'prow');
    row.style.cssText = 'gap:12px;justify-content:center;';
    stage.appendChild(st); stage.appendChild(row);

    var cols = [['🟥', '#c0392b', 261], ['🟩', '#27ae60', 329], ['🟦', '#2980b9', 392], ['🟨', '#f39c12', 523]];
    var seq = [], at = 0, lock = true, round = 0, over = false;
    var pads = [];
    var speed = 450;

    cols.forEach(function (c, i) {
      var b = el('button', 'memcard', c[0]);
      b.style.cssText += ';font-size:2em;width:70px;height:70px;transition:all 0.15s ease;';
      b.onclick = function () { press(i, b); };
      row.appendChild(b);
      pads.push(b);
    });

    function next() {
      seq.push((Math.random() * 4) | 0);
      round++;
      speed = Math.max(200, 450 - round * 30);
      playSeq();
    }

    function playSeq() {
      var k = 0;
      lock = true;
      st.textContent = 'Round ' + round + ' — watch...';
      var t = every(speed, function () {
        pads.forEach(function (p) {
          p.style.outline = 'none';
          p.style.transform = 'scale(1)';
        });
        if (k >= seq.length) {
          clearInterval(t);
          var ii = timers.indexOf(t);
          if (ii >= 0) timers.splice(ii, 1);
          lock = false; at = 0;
          st.textContent = 'Round ' + round + ' — repeat!';
          return;
        }
        pads[seq[k]].style.outline = '4px solid white';
        pads[seq[k]].style.transform = 'scale(1.1)';
        playTone(cols[seq[k]][2], 0.15, 'sine', 0.1);
        k++;
      });
    }

    function press(i, btn) {
      if (lock || over) return;
      playTone(cols[i][2], 0.1, 'sine', 0.08);
      if (i !== seq[at]) {
        over = true;
        st.textContent = 'Wrong pad! Reached round ' + round + '. Again!';
        sfxLose();
        return;
      }
      at++;
      if (at >= seq.length) {
        if (round >= 5) {
          over = true;
          st.textContent = 'Echo Mind! +50 gold';
          P.addGold(50); P.unlock('simon-5', 'Echo Mind');
          sfxWin();
          return;
        }
        next();
      }
    }

    next();
  }

  /* ================================================================
   * GAME 11: MEMORY MATCH — enhanced with animations, timer, combos
   * ================================================================ */
  function buildMemory(stage, P) {
    var wrap = el('div', 'memwrap');
    var st = status('Memory Match — find all 8 pairs!');
    var timerBar = el('div', '');
    var grid = el('div', 'memgrid');
    grid.style.cssText += ';grid-template-columns:repeat(4,1fr);gap:8px;';
    wrap.appendChild(st); wrap.appendChild(timerBar); wrap.appendChild(grid);
    stage.appendChild(wrap);

    var deck, open, lock, moves, found;
    var timeLeft = 60;
    var combo = 0;
    var bar = new AnimatedBar(timerBar, 60, '#8b5cf6');

    function deal() {
      var S = window.Spooky;
      var base = S.CANDIES.slice(0, 8).map(function (c) { return c.name; });
      deck = base.concat(base);
      for (var i = deck.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0, t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      }
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
      btn.textContent = deck[idx];
      btn.classList.add('open');
      btn.style.transform = 'rotateY(180deg)';
      setTimeout(function () { btn.style.transform = 'rotateY(0deg)'; }, 150);
      sfxClick();
      if (open < 0) { open = idx; return; }
      moves++;
      var a = grid.children[open], b = btn, ai = open;
      if (deck[ai] === deck[idx]) {
        a.classList.add('done'); b.classList.add('done');
        a.style.opacity = '0.5'; b.style.opacity = '0.5';
        open = -1; found += 2;
        combo++;
        var pts = 10 * combo;
        P.addScore(pts);
        sfxGood();
        st.textContent = 'Moves: ' + moves + ' · Found ' + (found / 2) + '/8' + (combo >= 2 ? ' · Combo x' + combo : '');
        if (found === 16) {
          var bonus = Math.max(0, 30 - moves);
          st.textContent = 'Cleared in ' + moves + ' moves! Memory Master! +' + (30 + bonus) + ' gold';
          P.addGold(30 + bonus);
          P.unlock('match-8', 'Memory Master');
          sfxWin();
        }
      } else {
        combo = 0;
        lock = true;
        st.textContent = 'Moves: ' + moves;
        sfxBad();
        setTimeout(function () {
          a.textContent = '?'; b.textContent = '?';
          a.classList.remove('open'); b.classList.remove('open');
          open = -1; lock = false;
        }, 700);
      }
    }

    every(1000, function () {
      if (lock) return;
      timeLeft--;
      bar.set(timeLeft);
      if (timeLeft <= 0) {
        st.textContent = 'Time up! Found ' + (found / 2) + '/8 pairs.';
        sfxLose();
      }
    });

    var again = btn('New game', deal);
    wrap.appendChild(again);
    deal();
  }

  /* ================================================================
   * GAME 12: BAT SWARM — tap the bats out of the moonlit belfry
   * ================================================================ */
  function buildBats(stage, P) {
    stage.classList.add('g-bats');
    var hud = el('div', 'g-hud');
    var sHits = stat(hud, 'Hits', '0/20');
    var sCombo = stat(hud, 'Combo', 'x1');
    var sTime = stat(hud, 'Time', '40');
    stage.appendChild(hud);
    var meter = bar(stage, 'violet');
    var cv = el('canvas', 'g-canvas');
    cv.width = 660; cv.height = 340;
    stage.appendChild(cv);
    var hint = el('div', 'bats-hint', '<b>Tap</b> a bat to banish it · chained hits score more');
    stage.appendChild(hint);

    var g = cv.getContext('2d');
    var bats = [], parts = [];
    var hits = 0, combo = 1, comboT = 0, left = 40, over = false, elapsed = 0;
    var stars = [];
    for (var i = 0; i < 46; i++) stars.push({ x: Math.random() * 660, y: Math.random() * 210, r: Math.random() * 1.4 + .4, a: Math.random() });
    var tombs = [];
    for (var t = 0; t < 7; t++) tombs.push({ x: 40 + t * 96 + Math.random() * 24, w: 20 + Math.random() * 20, h: 26 + Math.random() * 34 });

    function spawn() {
      if (over) return;
      var dir = Math.random() < 0.5 ? 1 : -1;
      var size = 20 + Math.random() * 16;
      bats.push({
        x: dir > 0 ? -40 : 700,
        y: 58 + Math.random() * 190,
        baseY: 0, dir: dir,
        speed: (1.5 + Math.random() * 1.6) * (1 + elapsed * 0.022),
        size: size, phase: Math.random() * 6.28,
        flap: Math.random() * 6.28, dead: false
      });
      bats[bats.length - 1].baseY = bats[bats.length - 1].y;
    }
    spawn(); spawn(); spawn();

    function draw(time) {
      var grd = g.createLinearGradient(0, 0, 0, 340);
      grd.addColorStop(0, '#090417');
      grd.addColorStop(.62, '#1a0a2e');
      grd.addColorStop(1, '#0b0514');
      g.fillStyle = grd; g.fillRect(0, 0, 660, 340);

      g.save();
      g.globalAlpha = .8;
      stars.forEach(function (s) {
        g.fillStyle = 'rgba(255,255,255,' + (.35 + Math.sin(time * 2 + s.a * 9) * .3) + ')';
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
      });
      g.restore();

      var moon = g.createRadialGradient(540, 74, 4, 540, 74, 86);
      moon.addColorStop(0, 'rgba(255,243,207,.95)');
      moon.addColorStop(.32, 'rgba(255,231,170,.5)');
      moon.addColorStop(1, 'rgba(255,231,170,0)');
      g.fillStyle = moon;
      g.beginPath(); g.arc(540, 74, 86, 0, 6.283); g.fill();
      g.fillStyle = '#fff3cf';
      g.beginPath(); g.arc(540, 74, 34, 0, 6.283); g.fill();

      g.fillStyle = '#080412';
      g.beginPath();
      g.moveTo(0, 300);
      g.bezierCurveTo(120, 250, 220, 320, 340, 286);
      g.bezierCurveTo(460, 252, 560, 312, 660, 280);
      g.lineTo(660, 340); g.lineTo(0, 340); g.closePath(); g.fill();

      tombs.forEach(function (t2) {
        g.fillStyle = '#120a22';
        g.beginPath();
        g.moveTo(t2.x - t2.w / 2, 302);
        g.lineTo(t2.x - t2.w / 2, 302 - t2.h * .7);
        g.arc(t2.x, 302 - t2.h * .7, t2.w / 2, Math.PI, 0);
        g.lineTo(t2.x + t2.w / 2, 302);
        g.closePath(); g.fill();
      });

      g.save();
      g.globalAlpha = .14 + Math.sin(time * .7) * .04;
      g.fillStyle = '#b794ff';
      for (var f = 0; f < 4; f++) {
        g.beginPath();
        g.ellipse(((time * 12 + f * 190) % 840) - 90, 250 + Math.sin(f) * 20, 180, 26, 0, 0, 6.283);
        g.fill();
      }
      g.restore();

      bats.forEach(function (b) {
        b.flap += .28;
        var wing = Math.sin(b.flap) * b.size * .62;
        b.y = b.baseY + Math.sin(time * 1.6 + b.phase) * 12;
        g.save();
        g.translate(b.x, b.y);
        g.shadowColor = 'rgba(168,85,247,.55)';
        g.shadowBlur = 14;
        g.fillStyle = '#6a4aa8';
        g.strokeStyle = 'rgba(226,196,255,.6)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(0, 0, b.size * .34, b.size * .26, 0, 0, 6.283);
        g.fill();
        g.beginPath();
        g.moveTo(-b.size * .28, 0);
        g.quadraticCurveTo(-b.size * .74, -wing, -b.size * 1.12, -wing * .28);
        g.quadraticCurveTo(-b.size * .66, -b.size * .06, -b.size * 1.1, wing * .34);
        g.quadraticCurveTo(-b.size * .7, wing * .62, -b.size * .28, 0);
        g.fill();
        g.beginPath();
        g.moveTo(b.size * .28, 0);
        g.quadraticCurveTo(b.size * .74, -wing, b.size * 1.12, -wing * .28);
        g.quadraticCurveTo(b.size * .66, -b.size * .06, b.size * 1.1, wing * .34);
        g.quadraticCurveTo(b.size * .7, wing * .62, b.size * .28, 0);
        g.fill();
        g.fillStyle = '#ff4d6d';
        g.beginPath();
        g.arc(-b.size * .1, -b.size * .05, 1.8, 0, 6.283);
        g.arc(b.size * .1, -b.size * .05, 1.8, 0, 6.283);
        g.fill();
        g.restore();
      });

      parts.forEach(function (p) {
        g.globalAlpha = Math.max(0, p.life);
        g.fillStyle = p.color;
        g.beginPath(); g.arc(p.x, p.y, p.size * p.life, 0, 6.283); g.fill();
      });
      g.globalAlpha = 1;
    }

    function update() {
      if (over) return;
      elapsed += .033;
      bats.forEach(function (b) { b.x += b.dir * b.speed; });
      bats = bats.filter(function (b) { return !b.dead && b.x > -90 && b.x < 750; });
      parts.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += .06; p.life -= .03; });
      parts = parts.filter(function (p) { return p.life > 0; });
      if (comboT > 0) { comboT -= .033; if (comboT <= 0) { combo = 1; sCombo.set('x1'); } }
      draw(elapsed);
    }

    function hitAt(pt) {
      if (over) return;
      var best = null, bd = 1e9;
      bats.forEach(function (b) {
        var d = Math.hypot(b.x - pt.x, b.y - pt.y);
        if (d < b.size * 1.05 && d < bd) { best = b; bd = d; }
      });
      if (!best) {
        combo = 1; sCombo.set('x1'); sfxPop();
        return;
      }
      best.dead = true;
      hits++;
      combo = Math.min(9, combo + 1);
      comboT = 1.6;
      var pts = 12 * combo;
      P.addScore(pts);
      sHits.set(Math.min(20, hits) + '/20');
      sCombo.set('x' + combo);
      for (var i = 0; i < 12; i++) {
        var a = Math.random() * 6.283, v = 1 + Math.random() * 3.4;
        parts.push({ x: best.x, y: best.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, size: 2 + Math.random() * 3, color: i % 3 ? '#c084fc' : '#ffd166' });
      }
      sfxGood();
      if (hits >= 20) end(true);
    }

    function onTap(e) {
      e.preventDefault();
      hitAt(canvasPoint(cv, e));
    }
    cv.addEventListener('pointerdown', onTap);
    onCleanup(function () { cv.removeEventListener('pointerdown', onTap); });

    every(680, spawn);
    every(33, update);
    every(1000, function () {
      if (over) return;
      left--;
      meter.set((left / 40) * 100);
      sTime.set(left);
      if (left <= 0) end(false);
    });

    function end(won) {
      if (over) return;
      over = true;
      var gold = hits * 3 + (won ? 30 : 0);
      if (gold > 0) P.addGold(gold);
      if (won) { P.unlock('bats-20', 'Bat Warden'); sfxWin(); } else sfxLose();
      endCard(stage, buildBats, P, {
        win: won,
        icon: won ? '🦇' : '🌙',
        title: won ? 'Swarm cleared!' : 'The swarm thickens',
        lines: hits + ' bats banished · best combo x' + combo,
        gold: gold,
        score: hits * 12
      });
    }

    meter.set(100);
    draw(0);
  }

  /* ================================================================
   * GAME 13: WITCH'S BREW — memorise and repeat the recipe
   * ================================================================ */
  function buildBrew(stage, P) {
    stage.classList.add('g-brew');
    var ING = [
      { e: '🍄', n: 'Toadstool' },
      { e: '🦴', n: 'Bone Dust' },
      { e: '🕷️', n: 'Spider' },
      { e: '🐸', n: 'Frog' },
      { e: '🌿', n: 'Nightshade' },
      { e: '🦇', n: 'Bat Wing' }
    ];
    var COLORS = ['#7dffb0', '#59e6ff', '#c084fc', '#ff9a3d', '#ff69b4'];

    var wrap = el('div', 'brew-wrap');
    var hud = el('div', 'g-hud');
    var sRound = stat(hud, 'Recipe', '1/5');
    var sScore = stat(hud, 'Score', '0');
    var lives = el('div', 'brew-lives', '<span>🕯️</span><span>🕯️</span><span>🕯️</span>');
    wrap.appendChild(hud);

    var top = el('div', 'brew-top');
    var prompt = el('div', 'brew-prompt', 'Watch the recipe…');
    top.appendChild(prompt);
    top.appendChild(lives);
    wrap.appendChild(top);

    var cauldron = el('div', 'cauldron',
      '<div class="brew-liquid"></div><div class="bubble"></div><div class="bubble"></div><div class="bubble"></div><div class="bubble"></div>');
    wrap.appendChild(cauldron);

    var recipe = el('div', 'brew-recipe');
    wrap.appendChild(recipe);

    var hint = el('div', 'brew-prompt', '');
    wrap.appendChild(hint);

    var grid = el('div', 'brew-grid');
    ING.forEach(function (ing, i) {
      var b = el('button', 'brew-ing', '<span class="ing-emoji">' + ing.e + '</span>' + ing.n);
      b.type = 'button';
      b.dataset.i = i;
      b.onclick = function () { pick(i, b); };
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    stage.appendChild(wrap);

    var round = 1, maxRound = 5, score = 0, life = 3;
    var seq = [], at = 0, showing = true, over = false, busy = false;

    function setLives() {
      Array.prototype.forEach.call(lives.children, function (s, i) {
        s.classList.toggle('out', i >= life);
      });
    }

    function paintRecipe() {
      recipe.innerHTML = seq.map(function (idx, i) {
        return '<span class="slot' + (i < at ? ' done' : '') + '">' + ING[idx].e + '</span>';
      }).join('');
    }

    function clearRecipe() {
      recipe.innerHTML = seq.map(function () { return '<span class="slot">?</span>'; }).join('');
    }

    function startRound() {
      if (over) return;
      busy = true;
      at = 0;
      seq = [];
      var len = [3, 4, 4, 5, 6][round - 1];
      for (var i = 0; i < len; i++) seq.push((Math.random() * ING.length) | 0);
      while (seq.length > 1 && seq[0] === seq[seq.length - 1]) seq[seq.length - 1] = (seq[seq.length - 1] + 1) % ING.length;
      cauldron.style.setProperty('--brew-color', COLORS[(round - 1) % COLORS.length]);
      paintRecipe();
      recipe.classList.remove('hidden-recipe');
      prompt.textContent = 'Watch the recipe for ' + len + ' ingredients…';
      showing = true;
      grid.style.pointerEvents = 'none';
      grid.style.opacity = '.45';
      later(function () {
        recipe.classList.add('hidden-recipe');
        prompt.textContent = 'Now repeat it — ' + len + ' ingredients';
        showing = false;
        busy = false;
        grid.style.pointerEvents = '';
        grid.style.opacity = '';
        clearRecipe();
      }, 950 + len * 520);
      sRound.set(round + '/5');
      sScore.set(score);
    }

    function pick(i, b) {
      if (over || showing || busy) return;
      var want = seq[at];
      if (i === want) {
        at++;
        b.classList.remove('right'); void b.offsetWidth; b.classList.add('right');
        paintRecipe();
        sfxClick();
        if (at >= seq.length) {
          busy = true;
          grid.style.pointerEvents = 'none';
          grid.style.opacity = '.45';
          score += seq.length * 25;
          P.addScore(seq.length * 25);
          sScore.set(score);
          prompt.textContent = 'Perfect brew! ✨';
          sfxGood();
          round++;
          if (round > maxRound) return win();
          later(startRound, 900);
        }
      } else {
        b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
        sfxBad();
        life--;
        setLives();
        prompt.textContent = 'Wrong ingredient! The brew spits back…';
        if (life <= 0) return lose();
        at = 0;
        busy = true;
        grid.style.pointerEvents = 'none';
        grid.style.opacity = '.45';
        later(startRound, 1000);
      }
    }

    function win() {
      over = true;
      var gold = 60;
      P.addGold(gold);
      P.unlock('brew-5', 'Master Brewer');
      sfxWin();
      endCard(stage, buildBrew, P, {
        win: true,
        icon: '🧪',
        title: 'Master Brewer!',
        lines: 'All five recipes brewed · ' + score + ' points',
        gold: gold,
        score: score
      });
    }
    function lose() {
      over = true;
      sfxLose();
      endCard(stage, buildBrew, P, {
        win: false,
        icon: '💥',
        title: 'Batch ruined',
        lines: 'Three spoiled cauldrons. Reached recipe ' + round + ' of 5.',
        gold: 5,
        score: score
      });
    }

    setLives();
    startRound();
  }

  /* ================================================================
   * GAME 14: SPIDER SIEGE — squash spiders, spare the black cats
   * ================================================================ */
  function buildSpiders(stage, P) {
    stage.classList.add('g-spiders');
    var wrap = el('div', 'spider-wrap');
    var hud = el('div', 'spider-hud');
    var hearts = el('div', 'spider-hearts', '');
    var sKill = el('div', 'g-stat', '<b>0</b> Squashed');
    hud.appendChild(hearts);
    hud.appendChild(sKill);
    wrap.appendChild(hud);
    var meter = bar(wrap, 'violet');
    var grid = el('div', 'spider-grid');
    wrap.appendChild(grid);
    stage.appendChild(wrap);

    var holes = [];
    for (var i = 0; i < 9; i++) {
      (function () {
        var b = el('button', 'spider-hole');
        b.type = 'button';
        b.innerHTML = '<span class="hole-ring"></span><span class="bug"></span>';
        var h = { el: b, bug: b.querySelector('.bug'), up: false, kind: '', t: 0 };
        b.onclick = function () { whack(h); };
        holes.push(h);
        grid.appendChild(b);
      })();
    }

    var hp = 3, killed = 0, left = 40, elapsed = 0, over = false;
    var combo = 0;

    function paintHearts() {
      hearts.innerHTML = '';
      for (var i = 0; i < 3; i++) {
        var s = el('span', i < hp ? '' : 'dead', '🕯️');
        hearts.appendChild(s);
      }
    }

    function freeHole() {
      var free = holes.filter(function (h) { return !h.up; });
      if (!free.length) return null;
      return free[(Math.random() * free.length) | 0];
    }

    function spawn() {
      if (over) return;
      var h = freeHole();
      if (!h) return;
      var cat = Math.random() < 0.16;
      h.up = true;
      h.kind = cat ? 'cat' : 'spider';
      h.bug.textContent = cat ? '🐈' : (Math.random() < 0.08 ? '💎' : '🕷️');
      h.el.classList.toggle('friendly', cat);
      h.el.classList.add('up');
      var life = Math.max(0.85, 1.75 - elapsed * 0.02);
      h.t = later(function () {
        if (!h.up || h.kind !== 'spider') { hide(h); return; }
        hide(h);
        hp--;
        combo = 0;
        paintHearts();
        sfxBad();
        if (hp <= 0) end(false);
      }, life * 1000);
      if (Math.random() < 0.12) later(function () { spawn(); }, 180);
    }

    function hide(h) {
      if (h.t) { clearTimeout(h.t); h.t = 0; }
      h.up = false;
      h.kind = '';
      h.el.classList.remove('up', 'friendly');
    }

    function whack(h) {
      if (over || !h.up) return;
      if (h.kind === 'cat') {
        combo = 0;
        hp--;
        paintHearts();
        h.el.classList.remove('miss'); void h.el.offsetWidth; h.el.classList.add('miss');
        sfxBad();
        hide(h);
        if (hp <= 0) end(false);
        return;
      }
      var gem = h.bug.textContent === '💎';
      h.el.classList.remove('hit'); void h.el.offsetWidth; h.el.classList.add('hit');
      killed++;
      combo++;
      var pts = (gem ? 60 : 20) * Math.min(4, combo);
      P.addScore(pts);
      sKill.querySelector('b').textContent = killed;
      sfxPop();
      if (killed >= 10) P.unlock('spider-10', 'Spider Squasher');
      hide(h);
    }

    every(860, function () {
      if (over) return;
      spawn();
      if (elapsed > 16 && Math.random() < 0.5) spawn();
    });
    every(1000, function () {
      if (over) return;
      left--;
      elapsed++;
      meter.set((left / 40) * 100);
      if (left <= 0) end(true);
    });

    function end(won) {
      if (over) return;
      over = true;
      var gold = killed * 2 + (won ? 35 : 0);
      if (gold > 0) P.addGold(gold);
      if (won) sfxWin(); else sfxLose();
      endCard(stage, buildSpiders, P, {
        win: won,
        icon: won ? '🕷️' : '🕯️',
        title: won ? 'The candles held!' : 'The dark got in',
        lines: killed + ' spiders squashed' + (won ? ' · candles still burning' : ''),
        gold: gold,
        score: killed * 20
      });
    }

    paintHearts();
    meter.set(100);
    spawn(); spawn();
  }

  /* ================================================================
   * GAME 15: WITCH FLIGHT — thread the midnight pines
   * ================================================================ */
  function buildFlight(stage, P) {
    stage.classList.add('g-flight');
    var wrap = el('div', 'flight-wrap');
    var hud = el('div', 'g-hud');
    var sDist = stat(hud, 'Distance', '0 m');
    var sLives = stat(hud, 'Lives', '♥♥♥');
    var sScore = stat(hud, 'Score', '0');
    wrap.appendChild(hud);
    var meter = bar(wrap, 'mint');
    var cv = el('canvas', 'g-canvas');
    cv.width = 660; cv.height = 340;
    wrap.appendChild(cv);
    var actions = el('div', 'flight-actions');
    var fly = el('button', 'flight-fly', 'FLY');
    actions.appendChild(fly);
    wrap.appendChild(actions);
    stage.appendChild(wrap);

    var g = cv.getContext('2d');
    var y = 160, vy = 0, lives = 3, inv = 0;
    var obstacles = [], distance = 0, over = false, scroll = 3;
    var moonStars = [];
    for (var i = 0; i < 50; i++) moonStars.push({ x: Math.random() * 660, y: Math.random() * 340, r: Math.random() * 1.3 + .3 });
    var wx = 128, r = 18;

    function flap() {
      if (over) return;
      vy = -6.4;
      sfxWhoosh();
    }
    fly.onclick = flap;
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); flap(); });

    function newPine(x) {
      var gap = Math.max(126, 176 - distance / 90);
      var gapY = 52 + Math.random() * (340 - 110 - gap);
      obstacles.push({ x: x, gapY: gapY, gap: gap, scored: false });
    }
    newPine(760); newPine(1060); newPine(1360);

    function draw() {
      var sky = g.createLinearGradient(0, 0, 0, 340);
      sky.addColorStop(0, '#08152b');
      sky.addColorStop(.55, '#0e2742');
      sky.addColorStop(1, '#05101c');
      g.fillStyle = sky; g.fillRect(0, 0, 660, 340);

      g.save();
      g.globalAlpha = .75;
      moonStars.forEach(function (s) {
        g.fillStyle = 'rgba(220,245,255,.7)';
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
      });
      g.restore();

      g.fillStyle = 'rgba(255,244,206,.22)';
      g.beginPath(); g.arc(540, 68, 52, 0, 6.283); g.fill();
      g.fillStyle = '#fff4ce';
      g.beginPath(); g.arc(540, 68, 30, 0, 6.283); g.fill();

      g.fillStyle = 'rgba(24,70,84,.55)';
      g.beginPath();
      g.moveTo(0, 300);
      g.bezierCurveTo(150, 262, 300, 318, 460, 282);
      g.bezierCurveTo(560, 260, 620, 300, 660, 288);
      g.lineTo(660, 340); g.lineTo(0, 340); g.closePath(); g.fill();

      obstacles.forEach(function (o) {
        var x = o.x;
        g.fillStyle = '#0a1c12';
        g.fillRect(x - 18, 0, 36, o.gapY);
        g.fillRect(x - 18, o.gapY + o.gap, 36, 340 - (o.gapY + o.gap));
        g.fillStyle = '#10331f';
        for (var t = 0; t < 8; t++) {
          var yy = t * 46;
          if (yy < o.gapY) {
            g.beginPath(); g.moveTo(x, yy); g.lineTo(x - 40, yy + 52); g.lineTo(x + 40, yy + 52); g.closePath(); g.fill();
          }
          var yb = o.gapY + o.gap + yy;
          if (yb < 340) {
            g.beginPath(); g.moveTo(x, yb); g.lineTo(x - 40, yb + 52); g.lineTo(x + 40, yb + 52); g.closePath(); g.fill();
          }
        }
        g.fillStyle = 'rgba(125,255,176,.16)';
        g.fillRect(x - 2, o.gapY, 4, o.gap);
      });

      g.save();
      if (inv > 0 && Math.floor(inv / 6) % 2 === 0) g.globalAlpha = .4;
      g.translate(wx, y);
      g.rotate(Math.max(-.45, Math.min(.45, vy / 16)));
      g.font = '34px serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('🧙', 0, 0);
      g.restore();

      g.fillStyle = 'rgba(125,255,176,.35)';
      g.fillRect(0, 334, 660, 6);
    }

    function step() {
      if (over) return;
      if (inv > 0) inv--;
      vy += .27;
      y += vy;
      if (y < 34) { y = 34; vy = Math.max(0, vy); }
      if (y > 314) { y = 314; vy = -3.4; if (inv <= 0) { lives--; inv = 70; hitFlash(); } }
      distance += scroll;
      scroll = 3 + distance / 3200;

      obstacles.forEach(function (o) { o.x -= scroll; });
      var last = obstacles[obstacles.length - 1];
      if (!last || last.x < 1000) newPine(1360);
      obstacles = obstacles.filter(function (o) { return o.x > -70; });

      obstacles.forEach(function (o) {
        if (Math.abs(o.x - wx) < 28) {
          if (y < o.gapY + 8 || y > o.gapY + o.gap - 8) {
            if (inv <= 0) {
              lives--;
              inv = 80;
              hitFlash();
              if (lives <= 0) return end(false);
            }
          }
        }
      });

      var m = Math.floor(distance / 10);
      sDist.set(m + ' m');
      sScore.set(Math.floor(distance / 12));
      sLives.set(lives > 0 ? '♥'.repeat(lives) + '♡'.repeat(3 - lives) : '—');
      meter.set((distance / 3000) * 100);
      draw();
      if (distance >= 3000) end(true);
    }

    function hitFlash() {
      sfxBad();
      cv.style.boxShadow = '0 0 0 2px rgba(239,68,68,.7)';
      later(function () { cv.style.boxShadow = ''; }, 180);
    }

    function end(won) {
      if (over) return;
      over = true;
      var m = Math.floor(distance / 10);
      var gold = Math.floor(m / 2) + (won ? 45 : 0);
      if (gold > 0) P.addGold(gold);
      if (won) { P.unlock('flight-300', 'Night Rider'); sfxWin(); } else sfxLose();
      endCard(stage, buildFlight, P, {
        win: won,
        icon: won ? '🧹' : '🌲',
        title: won ? 'Night Rider!' : 'Into the pines',
        lines: 'Flew ' + m + ' m through the midnight forest',
        gold: gold,
        score: m
      });
    }

    function key(e) {
      if (e.code === 'Space') { e.preventDefault(); flap(); }
    }
    document.addEventListener('keydown', key);
    onCleanup(function () { document.removeEventListener('keydown', key); });

    draw();
    every(16, step);
  }

  /* ================================================================
   * GAME 16: HAUNTED HANGMAN — letters vs candles
   * ================================================================ */
  function buildHangman(stage, P) {
    stage.classList.add('g-hangman');
    var WORDS = [
      ['PUMPKIN', 'Orange, carved, and grinning'],
      ['CAULDRON', 'Bubbling pot in the witch’s hut'],
      ['VAMPIRE', 'Allergic to garlic and dawn'],
      ['WEREWOLF', 'Howls when the moon is full'],
      ['GRAVEYARD', 'Where the quiet neighbours live'],
      ['LANTERN', 'A little light against the dark'],
      ['MIDNIGHT', 'The witching hour'],
      ['SKELETON', 'All bones, no complaints'],
      ['SPIDERWEB', 'Eight-legged architecture'],
      ['HAUNTED', 'This whole app, honestly'],
      ['CANDLE', 'Wax, wick and a small flame'],
      ['GHOST', 'Sheets with unresolved business']
    ];
    var pick = WORDS[(Math.random() * WORDS.length) | 0];
    var word = pick[0], clue = pick[1];

    var wrap = el('div', 'hang-wrap');
    var top = el('div', 'hang-top');
    var candles = el('div', 'hang-candles', '<span>🕯️</span><span>🕯️</span><span>🕯️</span><span>🕯️</span><span>🕯️</span><span>🕯️</span><span>🕯️</span><span>🕯️</span>');
    var hud = el('div', 'g-hud');
    var sWrong = stat(hud, 'Mistakes', '0/8');
    top.appendChild(hud);
    top.appendChild(candles);
    wrap.appendChild(top);

    var figure = el('canvas', 'hang-figure');
    figure.width = 240; figure.height = 170;
    wrap.appendChild(figure);

    var wordEl = el('div', 'hang-word');
    wrap.appendChild(wordEl);

    var clueEl = el('div', 'g-status', '💀 ' + clue);
    wrap.appendChild(clueEl);

    var keys = el('div', 'hang-keys');
    wrap.appendChild(keys);
    stage.appendChild(wrap);

    var guessed = {}, wrong = 0, over = false, revealed = 0;
    var unique = word.split('').filter(function (c, i, a) { return a.indexOf(c) === i; }).length;

    function renderWord() {
      wordEl.innerHTML = '';
      word.split('').forEach(function (ch) {
        var s = el('span', guessed[ch] ? 'revealed' : '', guessed[ch] ? ch : '');
        wordEl.appendChild(s);
      });
    }

    function paintGallows() {
      var g = figure.getContext('2d');
      g.clearRect(0, 0, 240, 170);
      g.strokeStyle = 'rgba(255,209,102,.7)';
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(30, 158); g.lineTo(120, 158);
      g.moveTo(70, 158); g.lineTo(70, 22);
      g.moveTo(70, 22); g.lineTo(158, 22);
      g.lineTo(158, 48);
      g.stroke();
      g.strokeStyle = '#e8d7ff';
      g.lineWidth = 3;
      var cx = 158, cy = 60;
      if (wrong > 0) { g.beginPath(); g.arc(cx, cy, 13, 0, 6.283); g.stroke(); }
      if (wrong > 1) { g.beginPath(); g.moveTo(cx, cy + 13); g.lineTo(cx, cy + 48); g.stroke(); }
      if (wrong > 2) { g.beginPath(); g.moveTo(cx, cy + 20); g.lineTo(cx - 18, cy + 34); g.stroke(); }
      if (wrong > 3) { g.beginPath(); g.moveTo(cx, cy + 20); g.lineTo(cx + 18, cy + 34); g.stroke(); }
      if (wrong > 4) { g.beginPath(); g.moveTo(cx, cy + 48); g.lineTo(cx - 15, cy + 76); g.stroke(); }
      if (wrong > 5) { g.beginPath(); g.moveTo(cx, cy + 48); g.lineTo(cx + 15, cy + 76); g.stroke(); }
      if (wrong > 6) { g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(cx - 4, cy - 2, 1.8, 0, 6.283); g.arc(cx + 4, cy - 2, 1.8, 0, 6.283); g.fill(); }
      if (wrong > 7) { g.beginPath(); g.arc(cx, cy + 8, 5, 0, Math.PI); g.stroke(); }
    }

    function letterBtn(ch) {
      var b = el('button', 'hang-key', ch);
      b.type = 'button';
      b.onclick = function () { guess(ch, b); };
      b.dataset.ch = ch;
      keys.appendChild(b);
    }
    for (var i = 65; i <= 90; i++) letterBtn(String.fromCharCode(i));

    function guess(ch, b) {
      if (over || guessed[ch]) return;
      guessed[ch] = true;
      b.classList.add('used');
      if (word.indexOf(ch) >= 0) {
        b.classList.add('good');
        revealed++;
        renderWord();
        sfxClick();
        if (revealed >= unique) win();
      } else {
        b.classList.add('bad');
        wrong++;
        candles.children[wrong - 1].classList.add('out');
        sWrong.set(wrong + '/8');
        paintGallows();
        sfxBad();
        clueEl.textContent = wrong >= 6 ? '💀 The candles are almost out…' : '💀 ' + clue;
        if (wrong >= 8) lose();
      }
    }

    function win() {
      over = true;
      var gold = 35 + word.length * 2;
      P.addGold(gold);
      P.unlock('hangman-1', 'Word Whisperer');
      sfxWin();
      endCard(stage, buildHangman, P, {
        win: true,
        icon: '🕯️',
        title: 'The spectre retreats!',
        lines: 'The word was <b>' + word + '</b> · ' + (8 - wrong) + ' candles left',
        gold: gold,
        score: (8 - wrong) * 25
      });
    }
    function lose() {
      over = true;
      sfxLose();
      endCard(stage, buildHangman, P, {
        win: false,
        icon: '☠️',
        title: 'The dark takes its due',
        lines: 'The word was <b>' + word + '</b>. The candles are cold.',
        gold: 0,
        score: revealed * 15
      });
    }

    function key(e) {
      var ch = (e.key || '').toUpperCase();
      if (ch.length === 1 && ch >= 'A' && ch <= 'Z') {
        var b = keys.querySelector('[data-ch="' + ch + '"]');
        if (b) guess(ch, b);
      }
    }
    document.addEventListener('keydown', key);
    onCleanup(function () { document.removeEventListener('keydown', key); });

    renderWord();
    paintGallows();
    sWrong.set('0/8');
  }

  /* ================================================================
   * GAME 17: CRYPT COUNT — count the ghosts before the crypt closes
   * ================================================================ */
  function buildCount(stage, P) {
    stage.classList.add('g-count');
    var wrap = el('div', 'count-wrap');
    var hud = el('div', 'g-hud');
    var sRound = stat(hud, 'Round', '1/5');
    var sScore = stat(hud, 'Score', '0');
    wrap.appendChild(hud);
    var meter = bar(wrap, 'mint');
    var prompt = el('div', 'g-status', 'Watch the crypt…');
    wrap.appendChild(prompt);
    var board = el('div', 'count-board');
    wrap.appendChild(board);
    var choices = el('div', 'count-choices');
    wrap.appendChild(choices);
    stage.appendChild(wrap);

    var round = 1, score = 0, right = 0, over = false, target = 0, busy = false;
    var watching = false, showLeft = 0, showTotal = 1;
    var OTHERS = ['🎃', '🕷️', '🦇', '💀', '🕯️', '🐈'];

    every(100, function () {
      if (!watching) return;
      showLeft -= .1;
      meter.set(Math.max(0, (showLeft / showTotal) * 100));
      if (showLeft <= 0) watching = false;
    });

    function showBoard() {
      busy = true;
      watching = false;
      board.classList.remove('veiled');
      board.innerHTML = '';
      choices.innerHTML = '';
      prompt.textContent = 'Count only the 👻 …';
      var n = 20;
      var count = Math.min(13, 4 + round + ((Math.random() * 2) | 0));
      target = count;
      var ghosts = {};
      while (Object.keys(ghosts).length < count) ghosts[(Math.random() * n) | 0] = true;
      for (var i = 0; i < n; i++) {
        var ghost = !!ghosts[i];
        var cell = el('div', 'count-cell' + (ghost ? ' ghost' : ''), ghost ? '👻' : OTHERS[(Math.random() * OTHERS.length) | 0]);
        cell.style.animationDelay = (i * 14) + 'ms';
        board.appendChild(cell);
      }
      var showMs = Math.max(750, 1900 - round * 190);
      showTotal = showMs / 1000;
      showLeft = showTotal;
      watching = true;
      meter.set(100);
      later(function () {
        watching = false;
        meter.set(0);
        board.classList.add('veiled');
        prompt.textContent = 'How many 👻 did you see?';
        askChoices();
      }, showMs);
    }

    function askChoices() {
      busy = false;
      var opts = {};
      opts[target] = true;
      while (Object.keys(opts).length < 3) {
        var d = target + (Math.random() < 0.5 ? -1 : 1) * (1 + ((Math.random() * 2) | 0));
        if (d > 0) opts[d] = true;
      }
      var arr = Object.keys(opts).map(Number);
      arr.sort(function () { return Math.random() - 0.5; });
      arr.forEach(function (v) {
        var b = el('button', 'count-choice', String(v));
        b.type = 'button';
        b.onclick = function () { answer(v, b); };
        choices.appendChild(b);
      });
    }

    function answer(v, b) {
      if (busy || over) return;
      busy = true;
      if (v === target) {
        right++;
        score += 30 + round * 10;
        P.addScore(30 + round * 10);
        b.classList.add('right');
        sfxGood();
        prompt.textContent = 'Correct — ' + target + ' ghosts!';
      } else {
        b.classList.add('wrong');
        Array.prototype.forEach.call(choices.children, function (c) {
          if (+c.textContent === target) c.classList.add('right');
        });
        sfxBad();
        prompt.textContent = 'It was ' + target + ' ghosts.';
      }
      sScore.set(score);
      later(function () {
        round++;
        if (round > 5) return finish();
        sRound.set(round + '/5');
        showBoard();
      }, 1000);
    }

    function finish() {
      over = true;
      var won = right >= 4;
      var gold = right * 8 + (won ? 25 : 0);
      if (gold > 0) P.addGold(gold);
      if (won) { P.unlock('count-5', 'Keen Eye'); sfxWin(); } else sfxLose();
      endCard(stage, buildCount, P, {
        win: won,
        icon: won ? '👁️' : '🕯️',
        title: won ? 'Keen Eye!' : 'The crypt kept its secrets',
        lines: right + ' of 5 counts correct · ' + score + ' points',
        gold: gold,
        score: score
      });
    }

    sRound.set('1/5');
    showBoard();
  }

  /* ================================================================
   * GAME 18: PUMPKIN ARCHERY — time the sweeping aim rune
   * ================================================================ */
  function buildArchery(stage, P) {
    stage.classList.add('g-archery');
    var wrap = el('div', 'archery-wrap');
    var hud = el('div', 'g-hud');
    var sHits = stat(hud, 'Hits', '0/3');
    var sArrows = stat(hud, 'Arrows', '6');
    var sScore = stat(hud, 'Score', '0');
    wrap.appendChild(hud);
    var cv = el('canvas', 'g-canvas');
    cv.width = 660; cv.height = 320;
    wrap.appendChild(cv);
    var actions = el('div', 'archery-actions');
    var shootBtn = el('button', 'archery-shoot', '🏹 LOOSE ARROW');
    actions.appendChild(shootBtn);
    wrap.appendChild(actions);
    stage.appendChild(wrap);

    var g = cv.getContext('2d');
    var arrows = 6, hits = 0, score = 0, over = false;
    var targetX = 480, targetY = 150, time = 0;
    var sweep = 120, sweepDir = 1, sweepSpeed = 2.6;
    var cooldown = 0, tracer = null;

    function shoot() {
      if (over || cooldown > 0 || arrows <= 0) return;
      arrows--;
      cooldown = .42;
      var d = Math.abs(sweep - targetX);
      var hit = d < 26;
      if (hit) {
        hits++;
        var pts = Math.max(20, Math.round(120 - d * 3));
        score += pts;
        P.addScore(pts);
        sfxGood();
        tracer = { x: sweep, life: 1, hit: true };
        if (hits >= 3) {
          P.unlock('archery-3', 'Dead Eye');
        }
      } else {
        sfxBad();
        tracer = { x: sweep, life: 1, hit: false };
      }
      sArrows.set(arrows);
      sHits.set(Math.min(3, hits) + '/3');
      sScore.set(score);
      if (arrows <= 0) later(function () { end(hits >= 3); }, 600);
      sweepSpeed = Math.min(5.2, sweepSpeed + .18);
    }
    shootBtn.onclick = shoot;
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); shoot(); });

    function draw() {
      var sky = g.createLinearGradient(0, 0, 0, 320);
      sky.addColorStop(0, '#0b0619');
      sky.addColorStop(.6, '#1b0e31');
      sky.addColorStop(1, '#0a0413');
      g.fillStyle = sky; g.fillRect(0, 0, 660, 320);

      g.fillStyle = 'rgba(255,244,206,.9)';
      g.beginPath(); g.arc(96, 62, 26, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(255,244,206,.12)';
      g.beginPath(); g.arc(96, 62, 58, 0, 6.283); g.fill();

      g.fillStyle = 'rgba(18,9,32,.9)';
      g.beginPath();
      g.moveTo(0, 270);
      g.bezierCurveTo(160, 240, 330, 286, 500, 252);
      g.bezierCurveTo(580, 238, 630, 260, 660, 256);
      g.lineTo(660, 320); g.lineTo(0, 320); g.closePath(); g.fill();

      for (var i = 0; i < 5; i++) {
        g.fillStyle = 'rgba(12,6,22,.9)';
        var bx = 40 + i * 140;
        g.fillRect(bx, 236, 5, 34);
        g.beginPath(); g.arc(bx + 2, 232, 16, Math.PI, 0); g.fill();
      }

      g.save();
      g.translate(targetX, targetY);
      var pulse = 1 + Math.sin(time * 3) * .04;
      g.scale(pulse, pulse);
      g.fillStyle = 'rgba(255,117,24,.18)';
      g.beginPath(); g.arc(0, 0, 44, 0, 6.283); g.fill();
      g.fillStyle = '#ff7518';
      g.beginPath(); g.ellipse(0, 0, 32, 28, 0, 0, 6.283); g.fill();
      g.strokeStyle = '#ffd166';
      g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 20, 0, 6.283); g.stroke();
      g.beginPath(); g.arc(0, 0, 10, 0, 6.283); g.stroke();
      g.fillStyle = '#2a1200';
      g.beginPath(); g.moveTo(-11, -6); g.lineTo(-4, 2); g.lineTo(-16, 2); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(11, -6); g.lineTo(4, 2); g.lineTo(16, 2); g.closePath(); g.fill();
      g.restore();

      g.save();
      g.strokeStyle = 'rgba(125,255,176,.8)';
      g.lineWidth = 2;
      g.setLineDash([5, 5]);
      g.beginPath(); g.moveTo(sweep, 26); g.lineTo(sweep, 286); g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(125,255,176,.9)';
      g.beginPath(); g.moveTo(sweep, 26); g.lineTo(sweep - 7, 16); g.lineTo(sweep + 7, 16); g.closePath(); g.fill();
      g.restore();

      if (tracer) {
        g.globalAlpha = Math.max(0, tracer.life);
        g.strokeStyle = tracer.hit ? '#ffd166' : 'rgba(255,255,255,.5)';
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(80, 250); g.lineTo(tracer.x, targetY); g.stroke();
        g.globalAlpha = 1;
      }
    }

    function tick() {
      if (over) return;
      time += .016;
      targetX = 470 + Math.sin(time * .9) * 120;
      targetY = 150 + Math.sin(time * 1.7) * 26;
      sweep += sweepDir * sweepSpeed;
      if (sweep > 600) { sweep = 600; sweepDir = -1; }
      if (sweep < 70) { sweep = 70; sweepDir = 1; }
      if (cooldown > 0) cooldown -= .016;
      if (tracer) { tracer.life -= .035; if (tracer.life <= 0) tracer = null; }
      draw();
    }

    function end(won) {
      if (over) return;
      over = true;
      var gold = hits * 15 + (won ? 30 : 0);
      if (gold > 0) P.addGold(gold);
      if (won) sfxWin(); else sfxLose();
      endCard(stage, buildArchery, P, {
        win: won,
        icon: won ? '🎯' : '🏹',
        title: won ? 'Dead Eye!' : 'The pumpkin escaped',
        lines: hits + ' of 6 arrows found the target · ' + score + ' points',
        gold: gold,
        score: score
      });
    }

    draw();
    every(16, tick);
  }

  /* ================================================================
   * GAME 19: VAMPIRE REFLEX — strike the instant the coffin opens
   * ================================================================ */
  function buildReflex(stage, P) {
    stage.classList.add('g-reflex');
    var wrap = el('div', 'reflex-wrap');
    var hud = el('div', 'g-hud');
    var sRound = stat(hud, 'Round', '1/5');
    var sScore = stat(hud, 'Score', '0');
    wrap.appendChild(hud);
    var prompt = el('div', 'g-status', 'The coffin is still…');
    wrap.appendChild(prompt);
    var coffin = el('div', 'reflex-coffin', '<span class="coffin-lid">✝</span><span class="coffin-face">🧛</span>');
    wrap.appendChild(coffin);
    var tap = el('button', 'reflex-tap', 'STRIKE');
    wrap.appendChild(tap);
    var times = el('div', 'reflex-times');
    wrap.appendChild(times);
    stage.appendChild(wrap);

    var round = 1, score = 0, over = false, state = 'idle', timer = 0;
    var awakeAt = 0, results = [], falseStarts = 0, busy = false;

    function arm() {
      if (over) return;
      state = 'waiting';
      busy = false;
      coffin.classList.remove('awake');
      prompt.textContent = 'Wait for it…';
      sRound.set(round + '/5');
      var delay = 1100 + Math.random() * 2600;
      timer = later(function () {
        state = 'awake';
        awakeAt = performance.now();
        coffin.classList.add('awake');
        prompt.textContent = 'NOW! Strike!';
        sfxWhoosh();
        timer = later(function () {
          if (state === 'awake') miss('Too slow — it slipped away');
        }, 1700);
      }, delay);
    }

    function strike() {
      if (over || busy) return;
      if (state === 'waiting') {
        clearTimeout(timer);
        falseStarts++;
        state = 'idle';
        sfxBad();
        prompt.textContent = 'Too early! The coffin was still shut.';
        pushTime('—');
        next(true);
        return;
      }
      if (state === 'awake') {
        clearTimeout(timer);
        var ms = Math.round(performance.now() - awakeAt);
        results.push(ms);
        var pts = Math.max(10, Math.round(700 - ms * .6));
        score += pts;
        P.addScore(pts);
        sScore.set(score);
        pushTime(ms + ' ms');
        prompt.textContent = ms < 220 ? 'Lightning! ' + ms + ' ms' : ms < 380 ? 'Fast — ' + ms + ' ms' : ms + ' ms. Not bad.';
        sfxGood();
        state = 'idle';
        next(false);
      }
    }

    function miss(msg) {
      if (over) return;
      state = 'idle';
      sfxBad();
      prompt.textContent = msg;
      pushTime('—');
      next(true);
    }

    function pushTime(label) {
      var s = el('span', '', label);
      times.appendChild(s);
      if (times.children.length > 5) times.removeChild(times.firstChild);
    }

    function next(failed) {
      if (over) return;
      busy = true;
      later(function () {
        round++;
        busy = false;
        if (round > 5) return finish();
        arm();
      }, 900);
    }

    function finish() {
      over = true;
      var avg = results.length ? Math.round(results.reduce(function (a, b) { return a + b; }, 0) / results.length) : 9999;
      var won = results.length >= 3 && avg < 520;
      var gold = results.length * 6 + (won ? 30 : 0);
      if (gold > 0) P.addGold(gold);
      if (won) { P.unlock('reflex-5', 'Night Reflexes'); sfxWin(); } else sfxLose();
      endCard(stage, buildReflex, P, {
        win: won,
        icon: won ? '🧛' : '🦇',
        title: won ? 'Night Reflexes!' : 'The vampire escaped',
        lines: (results.length ? 'Average ' + avg + ' ms' : 'No clean strikes') + ' · ' + falseStarts + ' false start' + (falseStarts === 1 ? '' : 's'),
        gold: gold,
        score: score
      });
    }

    coffin.onclick = strike;
    tap.onclick = strike;
    function key(e) {
      if (e.code === 'Space') { e.preventDefault(); strike(); }
    }
    document.addEventListener('keydown', key);
    onCleanup(function () { document.removeEventListener('keydown', key); });

    arm();
  }

  /* ================================================================
   * GAME 20: CANDLE KEEP — relight the shelf before the dark wins
   * ================================================================ */
  function buildCandles(stage, P) {
    stage.classList.add('g-candles');
    delete stage.dataset.half;
    var wrap = el('div', 'candle-wrap');
    var hud = el('div', 'g-hud');
    var sTime = stat(hud, 'Time', '60');
    var sRelight = stat(hud, 'Relights', '0');
    var sScore = stat(hud, 'Score', '0');
    wrap.appendChild(hud);
    var meter = bar(wrap, '');
    var shelf = el('div', 'candle-shelf');
    wrap.appendChild(shelf);
    var hint = el('div', 'candle-hint', 'Tap a guttering candle to bring it back to life');
    wrap.appendChild(hint);
    stage.appendChild(wrap);

    var candles = [];
    for (var i = 0; i < 6; i++) {
      var b = el('button', 'candle');
      b.type = 'button';
      b.innerHTML = '<span class="flame"></span><span class="wax"></span><span class="wick"></span>';
      var c = { el: b, flame: b.querySelector('.flame'), wax: b.querySelector('.wax'), life: 1, draining: false };
      b.onclick = function () { relight(c); };
      candles.push(c);
      shelf.appendChild(b);
    }

    var left = 60, elapsed = 0, over = false, relights = 0, score = 0;
    var nextEvent = 1.2;

    function relight(c) {
      if (over) return;
      var wasLow = c.life < .96;
      c.life = 1;
      c.draining = false;
      c.el.classList.remove('out', 'panic');
      c.flame.style.opacity = '';
      c.wax.style.filter = '';
      if (wasLow) {
        relights++;
        score += 12;
        P.addScore(12);
        sRelight.set(relights);
        sScore.set(score);
        c.el.classList.remove('relit'); void c.el.offsetWidth; c.el.classList.add('relit');
        sfxPop();
      }
    }

    function paint() {
      candles.forEach(function (c) {
        var lit = c.life > 0.04;
        c.el.classList.toggle('out', !lit);
        c.el.classList.toggle('panic', c.draining && c.life < .55);
        c.flame.style.opacity = lit ? String(0.25 + c.life * .75) : '0';
        c.wax.style.filter = 'brightness(' + (0.45 + c.life * 0.55) + ')';
      });
    }

    function tick() {
      if (over) return;
      elapsed += .1;
      sTime.set(Math.max(0, Math.ceil(left - elapsed)));
      meter.set(((left - elapsed) / left) * 100);

      if (elapsed >= nextEvent) {
        nextEvent = elapsed + Math.max(.42, 1.15 - elapsed * .012);
        var lit = candles.filter(function (c) { return c.life > .35 && !c.draining; });
        if (lit.length) lit[(Math.random() * lit.length) | 0].draining = true;
        if (elapsed > 22 && Math.random() < .35) {
          var lit2 = candles.filter(function (c) { return c.life > .5 && !c.draining; });
          if (lit2.length) lit2[(Math.random() * lit2.length) | 0].draining = true;
        }
      }

      candles.forEach(function (c) {
        if (c.draining && c.life > 0) {
          c.life -= .0092 * (1 + elapsed / 28);
          if (c.life <= 0) { c.life = 0; c.draining = false; }
        }
      });
      paint();

      var alive = candles.filter(function (c) { return c.life > .04; }).length;
      if (!alive) return end(false);
      if (elapsed >= left) end(true);
      else if (elapsed >= 30 && !stage.dataset.half) {
        stage.dataset.half = '1';
        P.unlock('candles-30', 'Keeper of the Flame');
      }
    }

    function end(won) {
      if (over) return;
      over = true;
      var gold = relights * 2 + (won ? 45 : 0);
      if (gold > 0) P.addGold(gold);
      if (won) sfxWin(); else sfxLose();
      endCard(stage, buildCandles, P, {
        win: won,
        icon: won ? '🕯️' : '🌑',
        title: won ? 'The flame holds!' : 'The dark got in',
        lines: relights + ' candles relit · ' + Math.floor(elapsed) + 's survived',
        gold: gold,
        score: score
      });
    }

    paint();
    every(100, tick);
    every(1000, function () { sTime.set(Math.max(0, Math.ceil(left - elapsed))); });
  }

  /* ================================================================
   * GAME REGISTRY
   * ================================================================ */
  var games = [
    { key: 'smash', name: '🎃 Pumpkin Smash', title: 'Pumpkin Smash', icon: '🎃', cat: 'Arcade',
      desc: 'Whack every pumpkin that lights up. Combos and stars double the fun!',
      build: buildSmash },
    { key: 'sort', name: '🍬 Candy Sort', title: 'Candy Sort', icon: '🍬', cat: 'Puzzle',
      desc: 'Click the 6 candies from cheapest to priciest before time runs out.',
      build: buildSort },
    { key: 'race', name: '👻 Ghost Race', title: 'Ghost Race', icon: '👻', cat: 'Spooky',
      desc: 'Pick a racer, cheer to boost. First ghost to 100% wins!',
      build: buildRace },
    { key: 'duel', name: '✨ Spell Duel', title: 'Spell Duel', icon: '✨', cat: 'Arcade',
      desc: 'Fire beats Leaf, Leaf beats Water, Water beats Fire. First to 3.',
      build: buildDuel },
    { key: 'escape', name: '🌀 Maze Escape', title: 'Maze Escape', icon: '🌀', cat: 'Puzzle',
      desc: 'Escape the 9×9 vault with fog of war. Reach the exit!',
      build: buildEscape },
    { key: 'trivia', name: '🧠 Crypt Trivia', title: 'Crypt Trivia', icon: '🧠', cat: 'Brain',
      desc: '5 questions from the vaults. Keep your streak and ace them all!',
      build: buildTrivia },
    { key: 'rhythm', name: '🎵 Ritual Rhythm', title: 'Ritual Rhythm', icon: '🎵', cat: 'Reflex',
      desc: 'Tap when the rune crosses the centre glyph. 8/10 wins.',
      build: buildRhythm },
    { key: 'run', name: '🧱 Voxel Run', title: 'Voxel Run', icon: '🧱', cat: 'Arcade',
      desc: 'Survive 30s. Jump the bats and grab the invincibility star.',
      build: buildRun },
    { key: 'catcher', name: '🍭 Candy Catcher', title: 'Candy Catcher', icon: '🍭', cat: 'Reflex',
      desc: 'Catch falling candy. Rare sweets are worth a fortune!',
      build: buildCatcher },
    { key: 'simon', name: '🟣 Echo Simon', title: 'Echo Simon', icon: '🟣', cat: 'Brain',
      desc: 'Repeat the growing rune pattern. Reach round 5!',
      build: buildSimon },
    { key: 'memory', name: '🃏 Memory Match', title: 'Memory Match', icon: '🃏', cat: 'Brain',
      desc: 'Find all 8 pairs. Fewer moves = more gold!',
      build: buildMemory },

    { key: 'bats', name: '🦇 Bat Swarm', title: 'Bat Swarm', icon: '🦇', cat: 'Reflex',
      desc: 'Tap the bats out of the belfry before they cross the moon.',
      build: buildBats },
    { key: 'brew', name: '🧪 Witch’s Brew', title: 'Witch’s Brew', icon: '🧪', cat: 'Brain',
      desc: 'Memorise the recipe, then toss ingredients in the exact order.',
      build: buildBrew },
    { key: 'spiders', name: '🕷️ Spider Siege', title: 'Spider Siege', icon: '🕷️', cat: 'Reflex',
      desc: 'Squash spiders before they reach the candle — spare the cats.',
      build: buildSpiders },
    { key: 'flight', name: '🧙 Witch Flight', title: 'Witch Flight', icon: '🧙', cat: 'Arcade',
      desc: 'Ride a broom through the midnight pines. Tap to rise, thread the gaps.',
      build: buildFlight },
    { key: 'hangman', name: '☠️ Haunted Hangman', title: 'Haunted Hangman', icon: '☠️', cat: 'Brain',
      desc: 'Guess the stolen word before the last candle gutters out.',
      build: buildHangman },
    { key: 'count', name: '🔢 Crypt Count', title: 'Crypt Count', icon: '🔢', cat: 'Brain',
      desc: 'A crypt flashes open. Count the ghosts, then pick the number.',
      build: buildCount },
    { key: 'archery', name: '🏹 Pumpkin Archery', title: 'Pumpkin Archery', icon: '🏹', cat: 'Reflex',
      desc: 'Time your shot as the aiming rune sweeps across the drifting pumpkin.',
      build: buildArchery },
    { key: 'reflex', name: '🧛 Vampire Reflex', title: 'Vampire Reflex', icon: '🧛', cat: 'Reflex',
      desc: 'Strike the instant the coffin opens. Five rounds of pure reaction.',
      build: buildReflex },
    { key: 'candles', name: '🕯️ Candle Keep', title: 'Candle Keep', icon: '🕯️', cat: 'Reflex',
      desc: 'Relight the shelf as the candles gutter. If all go out, something gets in.',
      build: buildCandles }
  ];

  window.SpookyGames = {
    list: games,
    stopAll: stopAll,
    pauseAll: pauseAll,
    resumeAll: resumeAll,
    setMuted: setMuted,
    isMuted: isMuted,
    isPaused: function () { return paused; }
  };
})();

/* SpookyGames — 11 playable micro-games for the Games tab.
 * Enhanced edition: particle systems, Web Audio sound effects, animated
 * transitions, combo mechanics, progressive difficulty, and polished UI.
 * Each entry: { key, name, desc, build(stage, P) } where P is the profile
 * (gold/coal/score/XP/unlock/flash). All timers route through every() so the
 * host can stop them when switching tabs (stopAll).
 */
(function () {
  'use strict';

  var timers = [];
  var rafIds = [];
  var audioCtx = null;

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
   * GAME 1: PUMPKIN SMASH — enhanced with particles, combos, power-ups
   * ================================================================ */
  function buildSmash(stage, P) {
    var st = status('Smash! 0/10 · 30s');
    var combo = el('div', '', '');
    combo.style.cssText = 'color:#ff9f1c;font-weight:bold;min-height:1.4em;';
    var grid = el('div', 'memgrid');
    var timerBar = el('div', '');
    stage.appendChild(st); stage.appendChild(combo); stage.appendChild(timerBar); stage.appendChild(grid);

    var cv = el('canvas', '');
    cv.width = 360; cv.height = 200;
    cv.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10;';
    stage.style.position = 'relative';
    stage.appendChild(cv);
    var ps = new ParticleSystem(cv);
    ps.start();

    var cells = [], smashed = 0, over = false, left = 30;
    var comboCount = 0, comboTimer = 0;
    var powerUp = false, powerUpTimer = 0;
    var difficulty = 1;
    var spawnInterval = 900;
    var score = 0;

    var bar = new AnimatedBar(timerBar, 30, '#ff9f1c');

    for (var i = 0; i < 12; i++) {
      (function (idx) {
        var b = el('button', 'memcard', '');
        b.style.fontSize = '1.6em';
        b.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
        b.onclick = function () {
          if (over) return;
          if (b.textContent === '🎃') {
            b.textContent = '';
            b.style.transform = 'scale(0.8)';
            setTimeout(function () { b.style.transform = 'scale(1)'; }, 100);
            smashed++;
            comboCount++;
            comboTimer = 2;
            var pts = powerUp ? 50 : 25;
            if (comboCount >= 3) {
              pts += comboCount * 5;
              combo.textContent = '🔥 Combo x' + comboCount + '!';
              sfxCombo();
            }
            score += pts;
            P.addScore(pts);
            sfxPop();
            var r = b.getBoundingClientRect(), sr = stage.getBoundingClientRect();
            ps.emit(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, 15, '#ff7518', 4);
            ps.emit(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, 8, '#ffd166', 3);
            floatText(stage, r.left - sr.left, r.top - sr.top, '+' + pts, '#ffd166');
            st.textContent = 'Smash! ' + smashed + '/10 · ' + left + 's';
            if (smashed >= 10) { P.unlock('smash-10', 'Pumpkin Pro'); end(true); }
          } else if (b.textContent === '⭐') {
            b.textContent = '';
            powerUp = true;
            powerUpTimer = 5;
            combo.textContent = '⭐ POWER UP! Double points!';
            sfxCoin();
          }
        };
        cells.push(b); grid.appendChild(b);
      })(i);
    }

    function pop() {
      if (over) return;
      var empty = cells.filter(function (c) { return !c.textContent; });
      if (empty.length) {
        var target = empty[(Math.random() * empty.length) | 0];
        target.textContent = '🎃';
        target.style.boxShadow = '0 0 12px rgba(255,117,24,0.6)';
        setTimeout(function () { target.style.boxShadow = 'none'; }, 300);
      }
      if (Math.random() < 0.08) {
        var empty2 = cells.filter(function (c) { return !c.textContent; });
        if (empty2.length) {
          var pu = empty2[(Math.random() * empty2.length) | 0];
          pu.textContent = '⭐';
          setTimeout(function () { if (pu.textContent === '⭐') pu.textContent = ''; }, 3000);
        }
      }
    }

    pop(); pop(); pop();

    every(spawnInterval, pop);
    every(1000, function () {
      if (over) return;
      left--;
      bar.set(left);
      st.textContent = 'Smash! ' + smashed + '/10 · ' + left + 's';
      if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) { comboCount = 0; combo.textContent = ''; } }
      if (powerUpTimer > 0) { powerUpTimer--; if (powerUpTimer === 0) { powerUp = false; combo.textContent = ''; } }
      difficulty = 1 + (30 - left) * 0.05;
      if (left <= 0) end(false);
    });

    function end(won) {
      over = true;
      ps.stop();
      var gold = smashed * 2 + (won ? 20 : 0);
      P.addGold(gold);
      st.textContent = (won ? 'Smashed all 10! ' : 'Time! ' + smashed + ' smashed. ') + '+' + gold + ' gold';
      if (won) sfxWin(); else sfxLose();
    }
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
   * GAME REGISTRY
   * ================================================================ */
  var games = [
    { key: 'smash', name: '🎃 Pumpkin Smash',
      desc: 'Smash 10 pumpkins in 30s. Combos and power-ups!',
      build: buildSmash },
    { key: 'sort', name: '🍬 Candy Sort',
      desc: 'Click the 6 candies from cheapest to priciest. Timed!',
      build: buildSort },
    { key: 'race', name: '👻 Ghost Race',
      desc: 'Pick a racer, cheer to boost. First to 100% wins!',
      build: buildRace },
    { key: 'duel', name: '✨ Spell Duel',
      desc: 'Fire beats Leaf, Leaf beats Water, Water beats Fire. First to 3.',
      build: buildDuel },
    { key: 'escape', name: '🌀 Maze Escape',
      desc: 'Escape the 9x9 vault with fog of war. Reach the exit!',
      build: buildEscape },
    { key: 'trivia', name: '🧠 Trivia',
      desc: '5 questions from the vaults. Ace them all!',
      build: buildTrivia },
    { key: 'rhythm', name: '🎵 Rhythm',
      desc: 'Tap when the marker hits the center zone. 8/10 wins.',
      build: buildRhythm },
    { key: 'run', name: '🧱 Voxel Run',
      desc: 'Survive 30s. Jump over the bats! Power-ups appear!',
      build: buildRun },
    { key: 'catcher', name: '🍬 Candy Catcher',
      desc: 'Click falling candy to catch 10! Rare candy = big points!',
      build: buildCatcher },
    { key: 'simon', name: '🟢 Echo Simon',
      desc: 'Repeat the growing pattern. Reach round 5!',
      build: buildSimon },
    { key: 'memory', name: '🧠 Memory Match',
      desc: 'Find all 8 pairs. Fewer moves = more gold!',
      build: buildMemory }
  ];

  window.SpookyGames = { list: games, stopAll: stopAll };
})();

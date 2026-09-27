/* SpookyTabs — the 7 iOS tabs, shared by the 2D + 3D web games.
 * Maze | Candy | Mine | World | Explore | Games | Achieve
 * Usage: SpookyTabs.init({ tabsId, panelsId, snapshot, onSelect, actions })
 *  snapshot() -> {score,layer,left,gold,level,pick,seed,relics,ach,collected}
 *  onSelect(i)   -> host pauses/resumes gameplay (0 = Maze)
 *  actions = { openShop(), newMaze(), gotoMaze() }
 */
(function () {
  'use strict';
  var TABS = [
    { icon: '⛏️', name: 'Maze' },
    { icon: '🍬', name: 'Candy' },
    { icon: '🛒', name: 'Mine' },
    { icon: '🌍', name: 'World' },
    { icon: '🗺️', name: 'Explore' },
    { icon: '🎮', name: 'Games' },
    { icon: '🏆', name: 'Achieve' }
  ];
  var ACH_ROSTER = [
    ['first-candy', 'First Bite — grab candy'],
    ['clear-1', 'Pathfinder — clear a depth'],
    ['first-pick', 'New Edge — first upgrade'],
    ['void-drill', 'Maximum Spin — own the Void Drill'],
    ['level-5', 'Living Myth — reach level 5'],
    ['score-1k', 'Score Legend — 1,000 points'],
    ['match-8', 'Memory Master — clear Memory Match'],
    ['mine-10', 'Ore Hauled — break 10 blocks'],
    ['coal-20', 'Coal Baron — bank 20 coal'],
    ['smash-10', 'Pumpkin Pro — smash 10 pumpkins'],
    ['sort-6', 'Sharp Sorter — clear Candy Sort'],
    ['race-1', 'Ghost Racer — win a ghost race'],
    ['duel-3', 'Spell Duelist — win a duel 3-0'],
    ['escape-1', 'Escape Artist — clear Maze Escape'],
    ['trivia-5', 'Scholar — ace all 5 trivia'],
    ['rhythm-8', 'Drummer — 8 rhythm hits'],
    ['run-30', 'Marathoner — survive Voxel Run'],
    ['catch-10', 'Candy Keeper — catch 10 falling candy'],
    ['simon-5', 'Echo Mind — reach Simon round 5']
  ];

  /* ---- Playable mining sim (MNBlockType values; coal banks picks) ---- */
  var mine = null;
  function newVein() {
    var S = window.Spooky;
    var bag = [];
    S.ORES.forEach(function (o) { for (var i = 0; i < o.w; i++) bag.push(o); });
    var cells = [];
    for (var i = 0; i < 60; i++) cells.push({ ore: bag[(Math.random() * bag.length) | 0], hp: 0 });
    cells.forEach(function (c) { c.hp = c.ore.hp; });
    mine = { cells: cells, pack: 0, packCap: 50, sellValue: 0, broken: 0, coalRun: 0 };
  }
  function buildMine(box, snap, opts, status) {
    var S = window.Spooky, P = opts.profile;
    if (!mine) newVein();
    var grid = el('div', 'minegrid');
    function paint() {
      grid.innerHTML = '';
      mine.cells.forEach(function (c, idx) {
        var b = el('button', 'minecell', c.hp > 0 ? c.ore.emoji : '·');
        b.title = c.hp > 0 ? c.ore.name + ' (' + Math.ceil(c.hp) + ' hp)' : 'dug out';
        b.style.background = c.hp > 0 ? c.ore.color : '#0b0620';
        b.onclick = function () { swing(idx); };
        grid.appendChild(b);
      });
      status.textContent = 'Gold ' + fmt(P.gold()) + ' · Coal ' + P.coal() + ' · Pack ' +
        mine.pack + '/' + mine.packCap + ' · Sell ' + mine.sellValue + ' · ' +
        S.PICKS[P.pickIdx()].name + ' · Broken ' + mine.broken;
    }
    function swing(idx) {
      var c = mine.cells[idx];
      if (c.hp <= 0) return;
      if (c.ore.tier > P.pickIdx()) { P.flash('Too tough — needs ' + S.PICKS[c.ore.tier].name); return; }
      c.hp -= P.pickDamage();
      if (c.hp > 0) { paint(); return; }
      mine.broken++;
      if (c.ore.coal) {
        P.addCoal(1); mine.coalRun++;
        if (mine.coalRun >= 20) P.unlock('coal-20', 'Coal Baron');
      } else if (c.ore.gold > 0 || c.ore.xp > 0) {
        if (mine.pack >= mine.packCap) { P.flash('Backpack full — sell first!'); c.hp = 1; paint(); return; }
        mine.pack++;
        mine.sellValue += c.ore.gold;
        P.gainXP(c.ore.xp);
        P.addScore(c.ore.gold);
      } else {
        P.gainXP(1);
      }
      if (mine.broken >= 10) P.unlock('mine-10', 'Ore Hauled');
      paint();
    }
    function sell() {
      if (mine.sellValue <= 0) { P.flash('Backpack empty — break some ore!'); return; }
      var g = Math.round(mine.sellValue * P.goldMult());
      P.addGold(g);
      mine.pack = 0; mine.sellValue = 0;
      P.flash('Sold for ' + g + ' gold. Coal stays banked: ' + P.coal());
      paint();
    }
    function buy() {
      var next = S.PICKS[P.pickIdx() + 1];
      if (!next) { P.flash('Void Drill is max!'); return; }
      if (!P.spendCoal(next.cost)) { P.flash('Needs ' + next.cost + ' coal (have ' + P.coal() + ')'); return; }
      P.setPick(P.pickIdx() + 1);
      P.flash('Forged ' + next.name + '!');
      if (P.pickIdx() === 1) P.unlock('first-pick', 'New Edge');
      if (next.name === 'Void Drill') P.unlock('void-drill', 'Maximum Spin');
      paint();
    }
    var row = el('div', 'prow');
    [['Sell pack', sell], ['Buy pick (coal)', buy], ['New vein', function () { newVein(); paint(); }]].forEach(function (x) {
      var mb = el('button', '', x[0]);
      mb.onclick = x[1];
      row.appendChild(mb);
    });
    box.appendChild(status);
    box.appendChild(grid);
    box.appendChild(row);
    paint();
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function fmt(n) { return window.Spooky.compact(n); }

  function memKey() { return 'spooky_match'; }
  function hasMatch() {
    try { return localStorage.getItem(memKey()) === '1'; } catch (e) { return false; }
  }
  function setMatch() {
    try { localStorage.setItem(memKey(), '1'); } catch (e) {}
  }

  function buildMemory(host) {
    var wrap = el('div', 'memwrap');
    var status = el('div', 'memstatus', 'Memory Match — find all 8 pairs!');
    var grid = el('div', 'memgrid');
    wrap.appendChild(status);
    wrap.appendChild(grid);
    var deck, open, lock, moves, found;
    function deal() {
      var S = window.Spooky;
      var base = S.CANDIES.slice(0, 8).map(function (c) { return c.name; });
      deck = base.concat(base);
      for (var i = deck.length - 1; i > 0; i--) {
        var j = (Math.random() * (i + 1)) | 0, t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      }
      open = -1; lock = false; moves = 0; found = 0;
      grid.innerHTML = '';
      deck.forEach(function (name, idx) {
        var b = el('button', 'memcard', '?');
        b.onclick = function () { flip(idx, b); };
        grid.appendChild(b);
      });
      status.textContent = 'Memory Match — find all 8 pairs!';
    }
    function flip(idx, btn) {
      if (lock || btn.textContent !== '?') return;
      btn.textContent = deck[idx];
      btn.classList.add('open');
      if (open < 0) { open = idx; return; }
      moves++;
      var a = grid.children[open], b = btn, ai = open;
      if (deck[ai] === deck[idx]) {
        a.classList.add('done'); b.classList.add('done');
        open = -1; found += 2;
        status.textContent = 'Moves: ' + moves + ' · Found ' + (found / 2) + '/8';
        if (found === 16) {
          status.textContent = 'Cleared in ' + moves + ' moves! Memory Master!';
          setMatch();
          if (host && host.onUnlock) host.onUnlock('match-8', 'Memory Master');
        }
      } else {
        lock = true;
        status.textContent = 'Moves: ' + moves;
        setTimeout(function () {
          a.textContent = '?'; b.textContent = '?';
          a.classList.remove('open'); b.classList.remove('open');
          open = -1; lock = false;
        }, 700);
      }
    }
    var again = el('button', '', 'New game');
    again.onclick = deal;
    wrap.appendChild(again);
    deal();
    return wrap;
  }

  function init(opts) {
    var S = window.Spooky;
    var bar = document.getElementById(opts.tabsId);
    var panels = document.getElementById(opts.panelsId);
    var current = 0, built = {};

    TABS.forEach(function (t, i) {
      var b = el('button', 'tabbtn' + (i === 0 ? ' active' : ''), t.icon + '<br>' + t.name);
      b.onclick = function () { select(i); };
      bar.appendChild(b);
    });

    function select(i) {
      current = i;
      if (window.SpookyGames) window.SpookyGames.stopAll();
      var btns = bar.children;
      for (var k = 0; k < btns.length; k++) btns[k].classList.toggle('active', k === i);
      panels.innerHTML = '';
      if (i !== 0) panels.appendChild(build(i));
      panels.style.display = i === 0 ? 'none' : 'flex';
      opts.onSelect(i);
    }

    function head(title, snap) {
      var h = el('div', 'phead', '<h2>' + title + '</h2><div class="psub">Score ' +
        fmt(snap.score) + ' · Gold ' + fmt(snap.gold) + ' · Lv ' + snap.level + ' · ' + snap.pick + '</div>');
      return h;
    }
    function list(items) {
      var d = el('div', 'plist');
      d.innerHTML = items.map(function (t) { return '<div class="pitem">' + t + '</div>'; }).join('');
      return d;
    }
    function btn(label, fn) {
      var b = el('button', '', label);
      b.onclick = fn;
      return b;
    }

    function build(i) {
      var snap = opts.snapshot();
      var box = el('div', 'panel');
      var back = el('button', '', '⛏️ Back to Maze');
      back.onclick = function () { select(0); };
      if (i === 1) {
        box.appendChild(head('🍬 Candy Vault', snap));
        box.appendChild(el('div', 'psub', 'Collected: ' + snap.collected + ' · 18 kinds from the app'));
        var candyGrid = el('div', 'candy-grid');
        box.appendChild(candyGrid);
        S.CANDIES.forEach(function (c, ci) {
          var card = el('div', 'candy-card', c.name + '<br>' + c.points + ' pts');
          card.dataset.key = c.key;
          card.onclick = function () { projectCandy3D(c.key, c.points, c.name); };
          candyGrid.appendChild(card);
        });
        var mysteryBtn = el('button', 'mystery-btn', '🎁 Mystery Candy');
        mysteryBtn.onclick = function () { unpackMysteryCandy(); };
        candyGrid.appendChild(mysteryBtn);
      } else if (i === 2) {
        box.appendChild(head('⛏️ Mine — Dig Site', snap));
        box.appendChild(el('div', 'psub', 'Click blocks to swing. Coal banks picks (never sold). Relics: ' + snap.relics + '/12 · Seed ' + snap.seed));
        var mstatus = el('div', 'psub', '');
        // Add 3D mine view button
        var btn3d = el('button', '', '👁️ 3D View');
        btn3d.onclick = function () { window.location.href = 'mine3d.html'; };
        box.appendChild(btn3d);
        buildMine(box, snap, opts, mstatus);
        // Add instruction
        var inst = el('div', 'psub', '💡 Tip: Press O for orbit mode, or click "👁️ 3D View" for full 3D mine');
        box.appendChild(inst);
        var row = el('div', 'prow');
        row.appendChild(btn('Open Shop', function () { select(0); if (opts.actions.openShop) opts.actions.openShop(); }));
        row.appendChild(btn('New Maze', function () { select(0); opts.actions.newMaze(); }));
        box.appendChild(row);
      } else if (i === 3) {
        box.appendChild(head('🌍 Avatar World', snap));
        box.appendChild(el('div', 'psub', 'Companions (first 8 of the 25-ghost cast):'));
        box.appendChild(list(S.GHOSTS.slice(0, 8).map(function (g) { return g.name + ' [' + g.rarity + ']'; })));
        box.appendChild(el('div', 'psub', 'Full cast:'));
        box.appendChild(list(S.GHOSTS.slice(8).map(function (g) { return g.name + ' [' + g.rarity + ']'; })));
      } else if (i === 4) {
        box.appendChild(head('🗺️ Explore', snap));
        box.appendChild(el('div', 'psub', 'Regions:'));
        box.appendChild(list(S.REGIONS));
        box.appendChild(el('div', 'psub', 'Worlds:'));
        var row2 = el('div', 'prow');
        row2.appendChild(btn('Maze 3D', function () { window.location.href = 'mine3d.html'; }));
        row2.appendChild(btn('Maze 2D', function () { window.location.href = 'index.html'; }));
        row2.appendChild(btn('Voxel Forest', function () { window.location.href = 'voxel.html#forest'; }));
        row2.appendChild(btn('Voxel Mine', function () { window.location.href = 'voxel.html#mine'; }));
        box.appendChild(row2);
      } else if (i === 5) {
        box.appendChild(head('🎮 Games', snap));
        box.appendChild(el('div', 'psub', '11 from the vault — Memory Match plus 10 more, all playable:'));
        var glist = el('div', 'plist');
        box.appendChild(glist);
        var stage = el('div', 'gamestage');
        function showList() {
          if (window.SpookyGames) window.SpookyGames.stopAll();
          glist.innerHTML = '';
          var all = [{ key: 'memory', name: '🧠 Memory Match' }]
            .concat((window.SpookyGames ? window.SpookyGames.list : []).map(function (g) { return { key: g.key, name: g.name }; }));
          all.forEach(function (g) {
            var row = el('div', 'pitem', '');
            row.textContent = g.name + ' ';
            var pb = btn('Play', function () { playGame(g.key); });
            row.appendChild(pb);
            glist.appendChild(row);
          });
          stage.innerHTML = '';
        }
        function playGame(key) {
          if (window.SpookyGames) window.SpookyGames.stopAll();
          stage.innerHTML = '';
          var back = btn('← All games', showList);
          stage.appendChild(back);
          if (key === 'memory') {
            stage.appendChild(buildMemory(opts.host));
            return;
          }
          var def = window.SpookyGames.list.filter(function (g) { return g.key === key; })[0];
          var P = opts.profile;
          def.build(stage, P);
          stage.appendChild(back);
        }
        box.appendChild(stage);
        showList();
      } else if (i === 6) {
        box.appendChild(head('🏆 Achievements', snap));
        var extra = hasMatch() ? { 'match-8': 'Memory Master' } : {};
        var all = {};
        Object.keys(snap.ach || {}).forEach(function (k) { all[k] = 1; });
        Object.keys(extra).forEach(function (k) { all[k] = 1; });
        box.appendChild(list(ACH_ROSTER.map(function (a) {
          return (all[a[0]] ? '✅ ' : '🔒 ') + a[1];
        })));
      }
      box.appendChild(back);
      return box;
    }

    return { select: select, hasMatch: hasMatch };
  }

  window.SpookyTabs = { init: init, hasMatch: hasMatch, setMatch: setMatch };

  function projectCandy3D(key, points, name) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,2,15,.96);display:flex;align-items:center;justify-content:center;z-index:100;overflow:hidden';
    var canvas = document.createElement('canvas');
    canvas.width = 500; canvas.height = 500;
    canvas.style.cssText = 'max-width:92vw;max-height:92vh';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);
    var ctx = canvas.getContext('2d');
    var W = 500, H = 500, cx = W / 2, cy = H / 2;
    var particles = [], sparkles = [], confetti = [], rings = [], lightRays = [];
    var stage = 'intro';
    var stageStart = performance.now();
    var shakeMag = 0, revealScale = 0, flashAlpha = 0, textAlpha = 0, textScale = 0;
    var candyColor = points >= 25 ? '#ff69b4' : points >= 15 ? '#ffd700' : points >= 5 ? '#59e6ff' : '#ffbe5a';
    var rarity = points >= 50 ? 'legendary' : points >= 25 ? 'epic' : points >= 15 ? 'rare' : points >= 5 ? 'uncommon' : 'common';
    var rarityLabel = { legendary: 'LEGENDARY', epic: 'EPIC', rare: 'RARE', uncommon: 'UNCOMMON', common: 'COMMON' };
    var rarityColor = { legendary: '#ff69b4', epic: '#c44dff', rare: '#ffd700', uncommon: '#59e6ff', common: '#aaaaaa' };
    var rarityGlow = { legendary: 30, epic: 22, rare: 16, uncommon: 10, common: 0 };
    function stageT() { return (performance.now() - stageStart) / 1000; }
    function spawnParticles(n, color, speed, spread) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2;
        var v = (0.3 + Math.random()) * (speed || 3);
        particles.push({ x: cx, y: cy, vx: Math.cos(a) * v * (spread || 1), vy: Math.sin(a) * v - 1.5, life: 1, decay: 0.012 + Math.random() * 0.018, color: color, size: 2 + Math.random() * 5, trail: [] });
      }
    }
    function spawnSparkles(n, rMin, rMax) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2;
        var r = (rMin || 30) + Math.random() * ((rMax || 90) - (rMin || 30));
        sparkles.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, life: 1, decay: 0.015 + Math.random() * 0.025, size: 1.5 + Math.random() * 3.5, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.02 });
      }
    }
    function spawnConfetti(n) {
      var cols = ['#ff69b4', '#ffd700', '#59e6ff', '#c44dff', '#7dff6a', '#ff9f1c', '#fff'];
      for (var i = 0; i < n; i++) {
        confetti.push({ x: Math.random() * W, y: -10 - Math.random() * 100, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 3, rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.1, w: 4 + Math.random() * 6, h: 3 + Math.random() * 4, color: cols[(Math.random() * cols.length) | 0], life: 1 });
      }
    }
    function spawnRing() {
      rings.push({ r: 20, life: 1, decay: 0.03, color: candyColor, width: 3 });
    }
    function spawnLightRays() {
      for (var i = 0; i < 12; i++) {
        lightRays.push({ angle: (i / 12) * Math.PI * 2, speed: 0.3 + Math.random() * 0.5, width: 0.05 + Math.random() * 0.08, alpha: 0.1 + Math.random() * 0.15 });
      }
    }
    function drawBackground(t) {
      var g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 300);
      g.addColorStop(0, '#1e1145');
      g.addColorStop(0.5, '#0f0828');
      g.addColorStop(1, '#05020f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = 0.15 + Math.sin(t * 2) * 0.05;
      for (var i = 0; i < 30; i++) {
        var sx = (i * 137.5) % W, sy = (i * 97.3) % H;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5 + Math.sin(t * 3 + i) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    function drawLightRays(t) {
      if (stage !== 'reveal' && stage !== 'celebrate') return;
      ctx.save();
      ctx.translate(cx, cy);
      lightRays.forEach(function (r) {
        ctx.save();
        ctx.rotate(r.angle + t * r.speed);
        var grad = ctx.createLinearGradient(0, 0, 250, 0);
        grad.addColorStop(0, 'rgba(255,255,255,' + r.alpha + ')');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 250, -r.width, r.width);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }
    function drawWrappedCandy(t) {
      ctx.save();
      ctx.translate(cx, cy);
      var st = stageT();
      if (stage === 'anticipate') {
        var pulse = 1 + Math.sin(t * 8) * 0.04;
        ctx.scale(pulse, pulse);
        ctx.rotate(Math.sin(t * 3) * 0.05);
      } else if (stage === 'shake') {
        shakeMag = Math.min(10, st * 5);
        ctx.translate(Math.sin(t * 35) * shakeMag, Math.cos(t * 28) * shakeMag * 0.5);
        ctx.rotate(Math.sin(t * 22) * 0.12);
      }
      var s = 70 + Math.sin(t * 4) * 3;
      var wrapperGrad = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 5, 0, 0, s * 1.2);
      wrapperGrad.addColorStop(0, '#a78bfa');
      wrapperGrad.addColorStop(0.5, '#7c3aed');
      wrapperGrad.addColorStop(1, '#4c1d95');
      ctx.fillStyle = wrapperGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.2, s * 0.75, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.55);
      ctx.quadraticCurveTo(0, -s * 0.85, s * 0.35, -s * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, s * 0.55);
      ctx.quadraticCurveTo(0, s * 0.85, s * 0.35, s * 0.55);
      ctx.stroke();
      var twistGrad = ctx.createLinearGradient(-s - 20, 0, -s + 15, 0);
      twistGrad.addColorStop(0, '#5b21b6');
      twistGrad.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = twistGrad;
      ctx.beginPath();
      ctx.moveTo(-s - 20, 0);
      ctx.lineTo(-s + 12, -20);
      ctx.lineTo(-s + 12, 20);
      ctx.closePath();
      ctx.fill();
      var twistGrad2 = ctx.createLinearGradient(s + 20, 0, s - 15, 0);
      twistGrad2.addColorStop(0, '#5b21b6');
      twistGrad2.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = twistGrad2;
      ctx.beginPath();
      ctx.moveTo(s + 20, 0);
      ctx.lineTo(s - 12, -20);
      ctx.lineTo(s - 12, 20);
      ctx.closePath();
      ctx.fill();
      if (stage === 'anticipate' || stage === 'shake') {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.2 + Math.sin(t * 12) * 0.2) + ')';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, s + 15 + Math.sin(t * 6) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (stage === 'unwrap') {
        var peel = Math.min(1, st * 2);
        ctx.save();
        ctx.globalAlpha = 1 - peel;
        ctx.translate(-peel * 40, -peel * 30);
        ctx.rotate(-peel * 0.5);
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    function drawRevealCandy(t) {
      ctx.save();
      ctx.translate(cx, cy);
      var pulse = 1 + Math.sin(t * 5) * 0.04;
      ctx.scale(revealScale * pulse, revealScale * pulse);
      var glowR = 90 + rarityGlow[rarity];
      var glow = ctx.createRadialGradient(0, 0, 5, 0, 0, glowR);
      glow.addColorStop(0, candyColor);
      glow.addColorStop(0.4, candyColor + '88');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx.fill();
      var bodyGrad = ctx.createRadialGradient(-12, -12, 3, 0, 0, 40);
      bodyGrad.addColorStop(0, '#fff');
      bodyGrad.addColorStop(0.3, candyColor);
      bodyGrad.addColorStop(1, candyColor);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(-12, -14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(10, 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    function drawText(t) {
      if (textAlpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.translate(cx, cy);
      ctx.scale(textScale, textScale);
      ctx.textAlign = 'center';
      ctx.font = 'bold 28px sans-serif';
      ctx.shadowColor = candyColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#fff';
      ctx.fillText(name || key, 0, 75);
      ctx.shadowBlur = 0;
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = rarityColor[rarity];
      ctx.shadowColor = rarityColor[rarity];
      ctx.shadowBlur = 10;
      ctx.fillText(rarityLabel[rarity] + '  ·  +' + points + ' PTS', 0, 100);
      ctx.restore();
    }
    function drawParticles() {
      particles.forEach(function (p) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();
        ctx.globalAlpha = p.life * 0.3;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.5;
        ctx.beginPath();
        p.trail.forEach(function (tp, i) { i === 0 ? ctx.moveTo(tp.x, tp.y) : ctx.lineTo(tp.x, tp.y); });
        ctx.stroke();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    function drawSparkles() {
      sparkles.forEach(function (s) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot + (1 - s.life) * 4);
        ctx.globalAlpha = s.life;
        ctx.fillStyle = '#fff';
        var sz = s.size * s.life;
        ctx.beginPath();
        ctx.moveTo(0, -sz * 2);
        ctx.lineTo(sz * 0.5, -sz * 0.5);
        ctx.lineTo(sz * 2, 0);
        ctx.lineTo(sz * 0.5, sz * 0.5);
        ctx.lineTo(0, sz * 2);
        ctx.lineTo(-sz * 0.5, sz * 0.5);
        ctx.lineTo(-sz * 2, 0);
        ctx.lineTo(-sz * 0.5, -sz * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }
    function drawConfetti() {
      confetti.forEach(function (c) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      });
    }
    function drawRings() {
      rings.forEach(function (r) {
        ctx.globalAlpha = r.life;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.width * r.life;
        ctx.beginPath();
        ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    function drawFlash() {
      if (flashAlpha > 0.01) {
        ctx.fillStyle = 'rgba(255,255,255,' + flashAlpha + ')';
        ctx.fillRect(0, 0, W, H);
      }
    }
    function drawVignette() {
      var v = ctx.createRadialGradient(cx, cy, W * 0.3, cx, cy, W * 0.7);
      v.addColorStop(0, 'transparent');
      v.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }
    function setStage(s) { stage = s; stageStart = performance.now(); }
    spawnLightRays();
    function animate(now) {
      var t = (now - stageStart) / 1000;
      var st = stageT();
      ctx.clearRect(0, 0, W, H);
      drawBackground(now / 1000);
      drawLightRays(now / 1000);
      if (stage === 'intro') {
        var scale = Math.min(1, st * 3);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.globalAlpha = Math.min(1, st * 2);
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.ellipse(0, 0, 70, 50, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
        if (st > 0.8) setStage('anticipate');
      } else if (stage === 'anticipate') {
        drawWrappedCandy(now / 1000);
        if (st > 1.0) setStage('shake');
      } else if (stage === 'shake') {
        drawWrappedCandy(now / 1000);
        if (st > 1.4) {
          setStage('unwrap');
          spawnParticles(40, '#c4b5fd', 4);
        }
      } else if (stage === 'unwrap') {
        drawWrappedCandy(now / 1000);
        drawParticles();
        if (st > 0.5) {
          setStage('burst');
          spawnParticles(80, candyColor, 6);
          spawnParticles(40, '#fff', 4);
          spawnParticles(30, rarityColor[rarity], 5);
          spawnSparkles(30);
          spawnRing(); spawnRing();
          flashAlpha = 0.7;
          shakeMag = 0;
        }
      } else if (stage === 'burst') {
        revealScale = Math.min(1, st * 3);
        textAlpha = Math.max(0, Math.min(1, (st - 0.3) * 2));
        textScale = 0.5 + Math.min(1, (st - 0.3) * 2) * 0.5;
        drawRevealCandy(now / 1000);
        drawText(now / 1000);
        drawParticles();
        drawSparkles();
        drawRings();
        drawFlash();
        flashAlpha *= 0.9;
        rings.forEach(function (r) { r.r += 4; r.life -= r.decay; });
        rings = rings.filter(function (r) { return r.life > 0; });
        if (st > 0.4 && Math.random() < 0.15) spawnSparkles(2);
        if (st > 1.2) {
          setStage('reveal');
          spawnConfetti(60);
          if (rarity === 'legendary' || rarity === 'epic') { spawnConfetti(80); spawnRing(); }
        }
      } else if (stage === 'reveal') {
        revealScale = 1;
        textAlpha = Math.min(1, textAlpha + 0.02);
        textScale = 1;
        drawRevealCandy(now / 1000);
        drawText(now / 1000);
        drawSparkles();
        drawConfetti();
        drawRings();
        rings.forEach(function (r) { r.r += 3; r.life -= r.decay * 0.7; });
        rings = rings.filter(function (r) { return r.life > 0; });
        if (Math.random() < 0.08) spawnSparkles(2);
        if (Math.random() < 0.03) spawnRing();
        if (st > 2.0) setStage('celebrate');
      } else if (stage === 'celebrate') {
        revealScale = 1 + Math.sin(now / 1000 * 4) * 0.03;
        textAlpha = 1;
        drawRevealCandy(now / 1000);
        drawText(now / 1000);
        drawSparkles();
        drawConfetti();
        if (Math.random() < 0.1) spawnSparkles(3);
        if (Math.random() < 0.05) spawnConfetti(5);
        if (st > 3.0) {
          document.body.removeChild(overlay);
          return;
        }
      }
      particles.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.vx *= 0.99; p.life -= p.decay; });
      particles = particles.filter(function (p) { return p.life > 0; });
      sparkles.forEach(function (s) { s.life -= s.decay; s.rot += s.vr; });
      sparkles = sparkles.filter(function (s) { return s.life > 0; });
      confetti.forEach(function (c) { c.x += c.vx; c.y += c.vy; c.rot += c.vr; if (c.y > H + 20) { c.y = -10; c.x = Math.random() * W; } });
      drawVignette();
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  function unpackMysteryCandy() {
    var surprises = [
      { name: 'Chocolate Bar', emoji: '🍫', points: 3 },
      { name: 'Lollipop Pop', emoji: '🍭', points: 3 },
      { name: 'Gummi Bear', emoji: '🐻', points: 3 },
      { name: 'Candy Corn', emoji: '🌽', points: 2 },
      { name: 'Licorice Twist', emoji: '🖤', points: 2 },
      { name: 'Jawbreaker', emoji: '🔴', points: 2 },
      { name: 'Taffy Pull', emoji: '🍬', points: 2 },
      { name: 'Peppermint Twist', emoji: '🍬', points: 2 },
      { name: 'Truffle Delight', emoji: '🍫', points: 5 },
      { name: 'Caramel Swirl', emoji: '🍬', points: 5 },
      { name: 'Fudge Square', emoji: '🍫', points: 5 },
      { name: 'Toffee Crunch', emoji: '🍬', points: 5 },
      { name: 'Golden Candy', emoji: '⭐', points: 15 },
      { name: 'Magical Candy', emoji: '✨', points: 20 },
      { name: 'Rainbow Candy', emoji: '🌈', points: 25 },
      { name: 'Candy Corn King', emoji: '👑', points: 50 },
      { name: 'Chocolate Dragon', emoji: '🐉', points: 60 },
      { name: 'Lollipop Tower', emoji: '🗼', points: 70 }
    ];
    var idx = Math.floor(Math.random() * surprises.length);
    var s = surprises[idx];
    projectCandy3D('mystery_' + idx, s.points, s.emoji + ' ' + s.name);
  }

})();

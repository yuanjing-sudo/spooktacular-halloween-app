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
        box.appendChild(list(S.CANDIES.map(function (c) { return c.name + ' — ' + c.points + ' pts'; })));
      } else if (i === 2) {
        box.appendChild(head('⛏️ Mine — Dig Site', snap));
        box.appendChild(el('div', 'psub', 'Click blocks to swing. Coal banks picks (never sold). Relics: ' + snap.relics + '/12 · Seed ' + snap.seed));
        var mstatus = el('div', 'psub', '');
        buildMine(box, snap, opts, mstatus);
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
})();

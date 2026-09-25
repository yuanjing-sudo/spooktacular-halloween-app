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
    ['match-8', 'Memory Master — clear Memory Match']
  ];

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
        box.appendChild(head('🛒 Mine — Tycoon', snap));
        box.appendChild(el('div', 'psub', 'Relics: ' + snap.relics + '/12 · Depth: ' + snap.layer + ' · Seed ' + snap.seed));
        var row = el('div', 'prow');
        if (opts.actions.openShop) row.appendChild(btn('Open Shop', function () { select(0); opts.actions.openShop(); }));
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
        box.appendChild(list(S.MINIGAMES.map(function (g) { return g.name; })));
        box.appendChild(el('div', 'psub', 'Now playing: Memory Match'));
        box.appendChild(buildMemory(opts.host));
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

/* SpookyGames — 10 playable micro-games for the Games tab.
 * Each entry: { key, name, desc, build(stage, P) } where P is the profile
 * (gold/coal/score/XP/unlock/flash). All timers route through every() so the
 * host can stop them when switching tabs (stopAll).
 */
(function () {
  'use strict';
  var timers = [];
  function every(ms, fn) {
    var id = setInterval(fn, ms);
    timers.push(id);
    return id;
  }
  function stopAll() {
    timers.forEach(clearInterval);
    timers = [];
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

  var games = [
    { key: 'smash', name: '🎃 Pumpkin Smash',
      desc: 'Smash 10 pumpkins in 30s. Click them as they pop!',
      build: function (stage, P) {
        var st = status('Smash! 0/10 · 30s'), grid = el('div', 'memgrid'), left = 30;
        stage.appendChild(st); stage.appendChild(grid);
        var cells = [], smashed = 0, over = false;
        for (var i = 0; i < 9; i++) {
          var b = el('button', 'memcard', '');
          b.onclick = (function (bb) {
            return function () {
              if (over || bb.textContent !== '🎃') return;
              bb.textContent = ''; smashed++;
              P.addScore(25);
              st.textContent = 'Smash! ' + smashed + '/10 · ' + left + 's';
              if (smashed >= 10) { P.unlock('smash-10', 'Pumpkin Pro'); end(true); }
            };
          })(b);
          cells.push(b); grid.appendChild(b);
        }
        function pop() {
          if (over) return;
          var empty = cells.filter(function (c) { return !c.textContent; });
          if (empty.length) empty[(Math.random() * empty.length) | 0].textContent = '🎃';
        }
        pop(); pop();
        every(900, pop);
        every(1000, function () {
          if (over) return;
          left--;
          st.textContent = 'Smash! ' + smashed + '/10 · ' + left + 's';
          if (left <= 0) end(false);
        });
        function end(won) {
          over = true;
          P.addGold(smashed * 2);
          st.textContent = (won ? 'Smashed all 10! ' : 'Time! ' + smashed + ' smashed. ') + '+' + (smashed * 2) + ' gold';
        }
      } },
    { key: 'sort', name: '🍬 Candy Sort',
      desc: 'Click the 6 candies from cheapest to priciest.',
      build: function (stage, P) {
        var S = window.Spooky;
        var st = status('Click cheapest first!'), row = el('div', 'prow');
        stage.appendChild(st); stage.appendChild(row);
        var six = shuffle(S.CANDIES.slice(0, 6).map(function (c) { return c; }));
        var next = 0, miss = 0;
        six.forEach(function (c) {
          var b = el('button', 'memcard', c.name + '<br>' + c.points);
          b.onclick = function () {
            if (b.classList.contains('done')) return;
            var ordered = S.CANDIES.slice(0, 6).sort(function (a, b2) { return a.points - b2.points; });
            if (c.key === ordered[next].key) {
              b.classList.add('done'); next++;
              if (next >= 6) {
                st.textContent = miss === 0 ? 'Perfect sort! Sharp Sorter!' : 'Sorted with ' + miss + ' miss(es)!';
                P.addGold(30); P.unlock('sort-6', 'Sharp Sorter');
              }
            } else { miss++; st.textContent = 'Not quite — ' + miss + ' miss(es). Keep going!'; }
          };
          row.appendChild(b);
        });
      } },
    { key: 'race', name: '👻 Ghost Race',
      desc: 'Pick a racer, then click it to cheer it faster!',
      build: function (stage, P) {
        var st = status('Pick your racer!'), row = el('div', 'prow'), track = el('div', 'plist');
        stage.appendChild(st); stage.appendChild(row); stage.appendChild(track);
        var names = ['Wraith', 'Specter', 'Banshee'], pos = [0, 0, 0], mine = -1, over = false, bars = [];
        names.forEach(function (n, i) {
          var b = btn('👻 ' + n, function () {
            if (mine >= 0) { boost(i); return; }
            mine = i;
            st.textContent = 'Racing! Click ' + n + ' to cheer!';
            every(200, tick);
          });
          row.appendChild(b);
          var bar = el('div', 'pitem', n + ': ' + '·'.repeat(0));
          bars.push(bar); track.appendChild(bar);
        });
        function boost(i) { if (!over && i === mine) pos[i] += 4; }
        function tick() {
          if (over) return;
          for (var i = 0; i < 3; i++) pos[i] += Math.random() * 4;
          for (var k = 0; k < 3; k++) bars[k].textContent = names[k] + ': ' + '█'.repeat(Math.min(20, pos[k] | 0));
          for (var w = 0; w < 3; w++) if (pos[w] >= 100) {
            over = true;
            if (w === mine) { st.textContent = names[w] + ' wins! Ghost Racer! +50 gold'; P.addGold(50); P.unlock('race-1', 'Ghost Racer'); }
            else st.textContent = names[w] + ' wins. Your ghost got ' + (w === mine ? '' : 'dusted. ');
            return;
          }
        }
      } },
    { key: 'duel', name: '✨ Spell Duel',
      desc: 'Fire beats Leaf, Leaf beats Water, Water beats Fire. First to 3.',
      build: function (stage, P) {
        var st = status('Choose your spell!'), row = el('div', 'prow');
        stage.appendChild(st); stage.appendChild(row);
        var spells = [['🔥', 'Fire'], ['💧', 'Water'], ['🍃', 'Leaf']];
        var you = 0, foe = 0, over = false;
        var beats = { Fire: 'Leaf', Leaf: 'Water', Water: 'Fire' };
        spells.forEach(function (s) {
          row.appendChild(btn(s[0] + ' ' + s[1], function () {
            if (over) return;
            var f = spells[(Math.random() * 3) | 0][1];
            var line = 'You ' + s[1] + ' vs ' + f + '. ';
            if (s[1] === f) line += 'Tie. ';
            else if (beats[s[1]] === f) { you++; line += 'You hit! '; }
            else { foe++; line += 'Ghost hits! '; }
            line += you + '-' + foe;
            if (you >= 3) { over = true; line += ' Duelist! +40 gold'; P.addGold(40); P.unlock('duel-3', 'Spell Duelist'); }
            if (foe >= 3) { over = true; line += ' The ghost wins...'; }
            st.textContent = line;
          }));
        });
      } },
    { key: 'escape', name: '🌀 Maze Escape',
      desc: 'Escape the 9x9 vault. Reach the green exit.',
      build: function (stage, P) {
        var S = window.Spooky;
        var st = status('Find the exit!'), grid = el('div', 'memgrid'), nav = el('div', 'prow');
        stage.appendChild(st); stage.appendChild(grid); stage.appendChild(nav);
        var mz = S.carveDFS(9, 9, (Math.random() * 1e9) | 0);
        var cells = {}, px = 1, pz = 1, over = false;
        for (var k in mz.cells) cells[k] = true;
        var goal = [7, 7];
        function draw() {
          grid.innerHTML = '';
          for (var z = 0; z < 9; z++) for (var x = 0; x < 9; x++) {
            var d = el('div', 'memcard', '');
            if (!cells[x + ',' + z]) { d.style.background = '#241243'; }
            else if (x === px && z === pz) { d.textContent = '🎃'; d.style.background = '#ff7518'; }
            else if (x === goal[0] && z === goal[1]) { d.textContent = '🚪'; d.style.background = '#1d5e2b'; }
            grid.appendChild(d);
          }
        }
        function move(dx, dz) {
          if (over) return;
          if (cells[(px + dx) + ',' + (pz + dz)]) { px += dx; pz += dz; }
          if (px === goal[0] && pz === goal[1]) {
            over = true;
            st.textContent = 'Escaped! Escape Artist! +60 gold';
            P.addGold(60); P.addScore(200); P.unlock('escape-1', 'Escape Artist');
          }
          draw();
        }
        [['↑', 0, -1], ['↓', 0, 1], ['←', -1, 0], ['→', 1, 0]].forEach(function (d) {
          nav.appendChild(btn(d[0], function () { move(d[1], d[2]); }));
        });
        draw();
      } },
    { key: 'trivia', name: '🧠 Trivia',
      desc: '5 questions from the vaults. Ace them all!',
      build: function (stage, P) {
        var qs = [
          ['How many ghost types haunt the app?', ['25', '18', '11', '40'], 0],
          ['What is the ultimate pick?', ['Void Drill', 'Diamond Pick', 'Stone Pick', 'Stick'], 0],
          ['What is the deepest layer called?', ['Magma Core', 'Dirt Tunnels', 'Stone Depths', 'The Lobby'], 0],
          ['How many relics exist?', ['12', '7', '14', '60'], 0],
          ['What does coal buy?', ['Pick upgrades', 'Candy', 'Ghosts', 'Nothing'], 0]
        ];
        var st = status('Question 1/5'), box = el('div', 'prow');
        stage.appendChild(st); stage.appendChild(box);
        var i = 0, right = 0;
        function ask() {
          box.innerHTML = '';
          st.textContent = 'Question ' + (i + 1) + '/5 — ' + qs[i][0];
          qs[i][1].forEach(function (opt, k) {
            box.appendChild(btn(opt, function () {
              if (k === qs[i][2]) right++;
              i++;
              if (i >= qs.length) {
                st.textContent = right + '/5' + (right === 5 ? ' — Scholar! +50 gold' : ' — try again!');
                box.innerHTML = '';
                if (right === 5) { P.addGold(50); P.unlock('trivia-5', 'Scholar'); }
              } else ask();
            }));
          });
        }
        ask();
      } },
    { key: 'rhythm', name: '🎵 Rhythm',
      desc: 'Tap when the marker hits the center zone. 8/10 wins.',
      build: function (stage, P) {
        var st = status('Get ready...'), bar = el('div', 'plist'), tap = btn('TAP!', function () { hit(); });
        stage.appendChild(st); stage.appendChild(bar); stage.appendChild(tap);
        var pos = 0, dir = 1, round = 0, hits = 0, over = false;
        every(60, function () {
          if (over) return;
          pos += dir * 4;
          if (pos >= 100) { pos = 100; dir = -1; }
          if (pos <= 0) { pos = 0; dir = 1; }
          var s = '';
          for (var i = 0; i < 20; i++) s += (i === Math.round(pos / 5)) ? '●' : (i === 10 ? '|' : '·');
          bar.textContent = s;
        });
        function hit() {
          if (over) return;
          round++;
          var good = Math.abs(pos - 50) < 15;
          if (good) hits++;
          st.textContent = 'Round ' + round + '/10 · Hits ' + hits + (good ? ' — nice!' : ' — miss');
          if (round >= 10) {
            over = true;
            if (hits >= 8) { st.textContent += ' Drummer! +40 gold'; P.addGold(40); P.unlock('rhythm-8', 'Drummer'); }
            else st.textContent += ' — again!';
          }
        }
      } },
    { key: 'run', name: '🧱 Voxel Run',
      desc: 'Survive 30s. Jump (button) over the bats!',
      build: function (stage, P) {
        var st = status('Survive!'), cv = el('canvas', '');
        cv.width = 300; cv.height = 120;
        cv.style.width = '100%';
        stage.appendChild(st); stage.appendChild(cv);
        var jump = btn('JUMP', function () { if (py >= 88) vy = -7; });
        stage.appendChild(jump);
        var g = cv.getContext('2d');
        var px = 30, py = 88, vy = 0, bats = [], t = 30, over = false, n = 0;
        every(50, function () {
          if (over) return;
          t -= 0.05; n++;
          vy += 0.5; py += vy;
          if (py > 88) { py = 88; vy = 0; }
          if (n % 14 === 0) bats.push({ x: 300, y: 40 + Math.random() * 48 });
          bats.forEach(function (b) { b.x -= 4 + (30 - t) * 0.15; });
          if (bats.some(function (b) { return Math.abs(b.x - px) < 14 && Math.abs(b.y - py) < 14; })) {
            over = true; st.textContent = 'Bonked! Survived ' + Math.round(30 - t) + 's. Again!';
            return;
          }
          bats = bats.filter(function (b) { return b.x > -10; });
          g.fillStyle = '#0b0620'; g.fillRect(0, 0, 300, 120);
          g.fillStyle = '#3b1d5e'; g.fillRect(0, 100, 300, 20);
          g.fillStyle = '#ff9f1c'; g.fillRect(px - 6, py - 12, 12, 12);
          g.fillStyle = '#1a1a2e';
          bats.forEach(function (b) { g.fillRect(b.x - 7, b.y - 5, 14, 10); });
          st.textContent = 'Survive! ' + Math.ceil(t) + 's left';
          if (t <= 0) {
            over = true; st.textContent = 'Marathoner! +60 gold';
            P.addGold(60); P.addScore(300); P.unlock('run-30', 'Marathoner');
          }
        });
      } },
    { key: 'catcher', name: '🍬 Candy Catcher',
      desc: 'Move the mouse over the tray to catch 10 falling treats!',
      build: function (stage, P) {
        var st = status('Catch 10!'), cv = el('canvas', '');
        cv.width = 260; cv.height = 200;
        cv.style.width = '100%';
        stage.appendChild(st); stage.appendChild(cv);
        var g = cv.getContext('2d');
        var bx = 130, drops = [], caught = 0, over = false, n = 0;
        cv.onmousemove = function (e) {
          var r = { left: 0 };
          try { r = cv.getBoundingClientRect(); } catch (err) {}
          bx = (e.clientX - (r.left || 0)) * (260 / (cv.clientWidth || 260));
        };
        every(60, function () {
          if (over) return;
          n++;
          if (n % 12 === 0) drops.push({ x: 20 + Math.random() * 220, y: -8 });
          drops.forEach(function (d) { d.y += 3; });
          drops = drops.filter(function (d) {
            if (d.y > 178 && Math.abs(d.x - bx) < 22) { caught++; return false; }
            return d.y < 205;
          });
          g.fillStyle = '#0b0620'; g.fillRect(0, 0, 260, 200);
          g.fillStyle = '#ff7518'; g.fillRect(bx - 20, 184, 40, 8);
          g.fillStyle = '#ffd166';
          drops.forEach(function (d) { g.fillRect(d.x - 3, d.y - 3, 6, 6); });
          st.textContent = 'Caught ' + caught + '/10';
          if (caught >= 10) {
            over = true; st.textContent = 'Candy Keeper! +50 gold';
            P.addGold(50); P.unlock('catch-10', 'Candy Keeper');
          }
        });
        stage._cleanup = function () { cv.onmousemove = null; };
      } },
    { key: 'simon', name: '🟢 Echo Simon',
      desc: 'Repeat the growing pattern. Reach round 5!',
      build: function (stage, P) {
        var st = status('Watch...'), row = el('div', 'prow');
        stage.appendChild(st); stage.appendChild(row);
        var cols = [['🟥', '#c0392b'], ['🟩', '#27ae60'], ['🟦', '#2980b9'], ['🟨', '#f39c12']];
        var seq = [], at = 0, lock = true, round = 0, over = false;
        var pads = cols.map(function (c, i) {
          var b = el('button', 'memcard', c[0]);
          b.style.background = c[1];
          b.onclick = function () { press(i, b); };
          row.appendChild(b);
          return b;
        });
        function next() {
          seq.push((Math.random() * 4) | 0);
          round++;
          playSeq();
        }
        function playSeq() {
          var k = 0;
          lock = true;
          st.textContent = 'Round ' + round + ' — watch...';
          var t = every(450, function () {
            pads.forEach(function (p) { p.style.outline = 'none'; });
            if (k >= seq.length) {
              clearInterval(t);
              var ii = timers.indexOf(t);
              if (ii >= 0) timers.splice(ii, 1);
              lock = false; at = 0;
              st.textContent = 'Round ' + round + ' — repeat!';
              return;
            }
            pads[seq[k]].style.outline = '3px solid white';
            k++;
          });
        }
        function press(i) {
          if (lock || over) return;
          if (i !== seq[at]) {
            over = true;
            st.textContent = 'Wrong pad! Reached round ' + round + '. Again!';
            return;
          }
          at++;
          if (at >= seq.length) {
            if (round >= 5) {
              over = true;
              st.textContent = 'Echo Mind! +50 gold';
              P.addGold(50); P.unlock('simon-5', 'Echo Mind');
              return;
            }
            next();
          }
        }
        next();
      } }
  ];

  window.SpookyGames = { list: games, stopAll: stopAll };
})();

/* ==========================================================================
   SpookyArcade — a dedicated, full-screen games hub for the 7-tab web app.

   • Reads the playable registry from SpookyGames (games.js).
   • Renders a filterable card grid with best scores and difficulty.
   • Every game opens in its own full-screen room with a top bar, live HUD,
     intro screen, pause sheet, restart and exit — no more clipping inside
     the 390×390 maze canvas.
   ========================================================================== */
(function () {
  'use strict';

  var CATS = ['All', 'Arcade', 'Reflex', 'Puzzle', 'Brain', 'Spooky'];
  var NEW_KEYS = { bats: 1, brew: 1, spiders: 1, flight: 1, hangman: 1, count: 1, archery: 1, reflex: 1, candles: 1 };

  /* Presentation metadata for each game key. Kept here so the mini-game
   * implementations stay focused on gameplay. */
  var META = {
    smash: {
      title: 'Pumpkin Smash', icon: '🎃', cat: 'Arcade', accent: '#ff7518', diff: 1,
      desc: 'Whack every pumpkin that lights up before the clock runs out. Chain hits for combos and grab the stars.',
      howto: ['45 seconds', 'Chain combos', '⭐ = double points'],
      controls: 'Tap a pumpkin to smash it'
    },
    sort: {
      title: 'Candy Sort', icon: '🍬', cat: 'Puzzle', accent: '#59e6ff', diff: 2,
      desc: 'Clear the candy bowl by clicking sweets from cheapest to most valuable. One wrong bite breaks your streak.',
      howto: ['6 candies', 'Cheapest first', '30 seconds'],
      controls: 'Click candies in point order'
    },
    race: {
      title: 'Ghost Race', icon: '👻', cat: 'Spooky', accent: '#c44dff', diff: 1,
      desc: 'Pick a phantom racer, then cheer to boost it down the spectral track. First ghost to 100% takes the gold.',
      howto: ['Pick a racer', 'Tap to cheer', 'First to 100%'],
      controls: 'Pick a ghost, then tap it to boost'
    },
    duel: {
      title: 'Spell Duel', icon: '✨', cat: 'Arcade', accent: '#f472b6', diff: 2,
      desc: 'Fire beats Leaf, Leaf beats Water, Water beats Fire. Out-duel the ghost and charge a special attack.',
      howto: ['First to 3', '3 hearts each', 'Combo = special'],
      controls: 'Choose Fire, Water or Leaf'
    },
    escape: {
      title: 'Maze Escape', icon: '🌀', cat: 'Puzzle', accent: '#7dffb0', diff: 3,
      desc: 'A pitch-black 9×9 vault. Feel your way to the exit before the clock claims you — fog lifts as you move.',
      howto: ['9×9 maze', 'Fog of war', '60 seconds'],
      controls: 'Use the arrow pad or keyboard'
    },
    trivia: {
      title: 'Crypt Trivia', icon: '🧠', cat: 'Brain', accent: '#a855f7', diff: 2,
      desc: 'Five questions from the vaults of the Spooktacular. Answer fast, keep your streak, and ace the set.',
      howto: ['5 questions', '10s each', 'Streak bonus'],
      controls: 'Pick one of four answers'
    },
    rhythm: {
      title: 'Ritual Rhythm', icon: '🎵', cat: 'Reflex', accent: '#fb7185', diff: 3,
      desc: 'Tap when the drifting rune crosses the centre glyph. Ten beats, eight hits, one very impatient drummer.',
      howto: ['10 beats', 'Hit the centre', '8/10 to win'],
      controls: 'Tap TAP when the rune is centred'
    },
    run: {
      title: 'Voxel Run', icon: '🧱', cat: 'Arcade', accent: '#59e6ff', diff: 2,
      desc: 'A little lantern runner versus a swarm of bats. Jump the swarm and survive thirty seconds of moonlit chaos.',
      howto: ['30 seconds', 'Jump the bats', '⭐ invincible'],
      controls: 'Tap JUMP over incoming bats'
    },
    catcher: {
      title: 'Candy Catcher', icon: '🍭', cat: 'Reflex', accent: '#f59e0b', diff: 2,
      desc: 'Slide the lantern tray under falling candy. Rare sweets are worth a fortune — don’t let them hit the ground.',
      howto: ['Catch 10', 'Combo multiplier', '💎 = 100 pts'],
      controls: 'Move the tray and tap to catch'
    },
    simon: {
      title: 'Echo Simon', icon: '🟣', cat: 'Brain', accent: '#a855f7', diff: 3,
      desc: 'Four singing runes. Watch the sequence, then echo it back. Each round grows longer and a little faster.',
      howto: ['Watch the runes', 'Repeat exactly', 'Reach round 5'],
      controls: 'Tap the runes in the same order'
    },
    memory: {
      title: 'Memory Match', icon: '🃏', cat: 'Brain', accent: '#8b5cf6', diff: 2,
      desc: 'Eight pairs of cursed candy cards. Find them all — fewer moves means a bigger purse at the end.',
      howto: ['8 pairs', '60 seconds', 'Fewer moves = more gold'],
      controls: 'Flip two cards to find a pair'
    },
    bats: {
      title: 'Bat Swarm', icon: '🦇', cat: 'Reflex', accent: '#c084fc', diff: 3,
      desc: 'The belfry has emptied. Tap the bats out of the sky before they cross the moon — combos build fast.',
      howto: ['40 seconds', 'Tap to banish', '20 hits to win'],
      controls: 'Tap or click the bats'
    },
    brew: {
      title: 'Witch’s Brew', icon: '🧪', cat: 'Brain', accent: '#7dffb0', diff: 3,
      desc: 'Memorise the recipe, then toss the ingredients into the cauldron in the exact order. Three burnt batches and the night is over.',
      howto: ['5 recipes', 'Memory round', '3 lives'],
      controls: 'Tap ingredients in recipe order'
    },
    spiders: {
      title: 'Spider Siege', icon: '🕷️', cat: 'Reflex', accent: '#c44dff', diff: 2,
      desc: 'Spiders are crawling out of the floorboards. Squash them before they reach the candle — and never hit the black cat.',
      howto: ['40 seconds', '3 candle lives', 'Avoid 🐈'],
      controls: 'Tap spiders, spare the cats'
    },
    flight: {
      title: 'Witch Flight', icon: '🧙', cat: 'Arcade', accent: '#59e6ff', diff: 3,
      desc: 'Ride a broom through the midnight pines. Tap to rise, release to fall, and thread the gaps for 300 metres.',
      howto: ['Tap to rise', '3 lives', '300 m to win'],
      controls: 'Tap the canvas or FLY to rise'
    },
    hangman: {
      title: 'Haunted Hangman', icon: '☠️', cat: 'Brain', accent: '#ff9f1c', diff: 2,
      desc: 'A spectre has stolen a word. Guess letters before the last candle gutters out — eight mistakes and it keeps your soul.',
      howto: ['8 candles', 'Guess letters', 'Reveal the word'],
      controls: 'Choose letters from the keyboard'
    },
    count: {
      title: 'Crypt Count', icon: '🔢', cat: 'Brain', accent: '#59e6ff', diff: 3,
      desc: 'A crypt flashes open for a heartbeat. Count the ghosts inside, then pick the right number. Five rounds, less time each.',
      howto: ['5 rounds', 'Count 👻 only', 'Time shrinks'],
      controls: 'Look, then choose the ghost count'
    },
    archery: {
      title: 'Pumpkin Archery', icon: '🏹', cat: 'Reflex', accent: '#ffd166', diff: 2,
      desc: 'A lone pumpkin drifts across the graveyard. Time your shot as the aiming rune sweeps past it. Six arrows.',
      howto: ['6 arrows', '3 hits to win', 'Aim carefully'],
      controls: 'Tap SHOOT as the rune crosses the target'
    },
    reflex: {
      title: 'Vampire Reflex', icon: '🧛', cat: 'Reflex', accent: '#ef4444', diff: 2,
      desc: 'The coffin rattles. The moment it opens, strike. Five rounds of pure reaction — flinch early and you lose the round.',
      howto: ['5 rounds', 'Wait for the lid', 'Faster = more points'],
      controls: 'Tap STRIKE the instant it opens'
    },
    candles: {
      title: 'Candle Keep', icon: '🕯️', cat: 'Reflex', accent: '#ffb457', diff: 3,
      desc: 'Six candles hold back the dark. Relight them as they gutter — if the whole shelf goes out, something gets in.',
      howto: ['60 seconds', '6 candles', 'All out = lose'],
      controls: 'Tap a dimming candle to relight it'
    }
  };

  var state = {
    open: false,
    host: null,
    filter: 'All',
    game: null,
    playing: false,
    paused: false,
    startScore: 0,
    bestThisRun: 0,
    goldStart: 0,
    hudTimer: 0,
    featured: null,
    muted: false
  };

  var hub = null, room = null, roomRefs = null;

  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function fmt(n) {
    n = Math.max(0, Math.round(+n || 0));
    if (window.Spooky && window.Spooky.compact) return window.Spooky.compact(n);
    return n > 99999 ? (n / 1000).toFixed(0) + 'k' : String(n);
  }
  function bestKey(key) { return 'spooky_arcade_best_' + key; }
  function getBest(key) {
    try { return Math.max(0, +localStorage.getItem(bestKey(key)) || 0); } catch (e) { return 0; }
  }
  function setBest(key, value) {
    value = Math.max(0, Math.round(value));
    if (value <= getBest(key)) return;
    try { localStorage.setItem(bestKey(key), String(value)); } catch (e) {}
  }
  function list() { return (window.SpookyGames && window.SpookyGames.list) || []; }
  function metaFor(game) {
    var m = META[game.key] || {};
    return {
      title: m.title || (game.name || game.key).replace(/^[^\w]+/, ''),
      icon: m.icon || (game.name || '🎮').trim().charAt(0),
      cat: m.cat || 'Arcade',
      accent: m.accent || '#ff9a3d',
      diff: m.diff || 2,
      desc: m.desc || game.desc || '',
      howto: m.howto || ['No timer', 'Just vibes'],
      controls: m.controls || 'Tap / click to play',
      isNew: !!(m.isNew || NEW_KEYS[game.key])
    };
  }
  function dailyGame() {
    var all = list();
    if (!all.length) return null;
    var day = Math.floor(Date.now() / 86400000);
    return all[day % all.length];
  }

  /* ------------------------------------------------------------------ hub */
  function ensureHub() {
    if (hub) return;
    hub = h('div');
    hub.id = 'spookyArcade';
    hub.setAttribute('role', 'dialog');
    hub.setAttribute('aria-label', 'Midnight Arcade');
    document.body.appendChild(hub);
  }

  function gold() {
    var p = state.host && state.host.profile;
    if (p && p.gold) { try { return p.gold(); } catch (e) {} }
    var snap = snapshot();
    return snap.gold || 0;
  }
  function level() {
    var p = state.host && state.host.profile;
    if (p && p.level) { try { return p.level(); } catch (e) {} }
    return snapshot().level || 1;
  }
  function snapshot() {
    try { return (state.host && state.host.snapshot && state.host.snapshot()) || {}; }
    catch (e) { return {}; }
  }

  function renderHub() {
    ensureHub();
    var all = list();
    if (!all.length) {
      hub.innerHTML = '<div class="arc-top"><div class="arc-brand"><div class="arc-brand-mark">🎃</div><div><h1>Midnight Arcade</h1><p>The arcade is warming up</p></div></div></div>' +
        '<div class="arc-scroll"><div class="arc-empty">The mini-games are still loading. Give it a second and reopen this tab.</div></div>';
      return;
    }
    if (!state.featured) state.featured = dailyGame() || all[0];

    var fm = metaFor(state.featured);
    var fb = getBest(state.featured.key);

    hub.innerHTML =
      '<div class="arc-top">' +
        '<div class="arc-brand">' +
          '<div class="arc-brand-mark">🎃</div>' +
          '<div><h1>Midnight Arcade</h1><p>7 tabs · ' + all.length + ' haunted games</p></div>' +
        '</div>' +
        '<div class="arc-top-stats">' +
          '<span class="arc-chip">🪙 <b id="arcGold">' + fmt(gold()) + '</b></span>' +
          '<span class="arc-chip">⭐ Lv <b id="arcLevel">' + level() + '</b></span>' +
          '<button class="arc-icon-btn" id="arcSound" title="Sound" aria-label="Toggle sound">' + (state.muted ? '🔇' : '🔊') + '</button>' +
          '<button class="arc-icon-btn" id="arcClose" title="Close arcade" aria-label="Close arcade">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="arc-scroll"><div class="arc-inner">' +
        '<section class="arc-hero" style="--accent:' + fm.accent + '">' +
          '<div class="arc-hero-copy">' +
            '<span class="arc-eyebrow">✦ Featured tonight</span>' +
            '<h2>' + fm.title + '</h2>' +
            '<p>' + fm.desc + '</p>' +
            '<div class="arc-hero-meta">' +
              '<span class="arc-pill">🎮 ' + fm.cat + '</span>' +
              '<span class="arc-pill">🎯 ' + diffLabel(fm.diff) + '</span>' +
              '<span class="arc-pill">🏆 Best <b>' + (fb ? fmt(fb) : '—') + '</b></span>' +
              '<span class="arc-pill">🕹️ ' + fm.howto[0] + '</span>' +
            '</div>' +
            '<button class="arc-cta" id="arcFeatured">▶ Play ' + fm.title + '</button>' +
          '</div>' +
          '<div class="arc-hero-art">' +
            '<span class="arc-ring"></span><span class="arc-ring"></span>' +
            '<span class="arc-big-emoji">' + fm.icon + '</span>' +
          '</div>' +
        '</section>' +
        '<div class="arc-bar">' +
          '<div class="arc-filters" id="arcFilters" role="tablist" aria-label="Game categories"></div>' +
          '<div class="arc-count" id="arcCount"></div>' +
        '</div>' +
        '<div class="arc-grid" id="arcGrid"></div>' +
        '<p class="arc-foot-note">Every game opens in its own room · high scores saved on this device</p>' +
      '</div></div>';

    var filters = hub.querySelector('#arcFilters');
    CATS.forEach(function (c) {
      var b = h('button', 'arc-filter' + (state.filter === c ? ' active' : ''), c);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', state.filter === c ? 'true' : 'false');
      b.onclick = function () {
        state.filter = c;
        Array.prototype.forEach.call(filters.children, function (x) {
          x.classList.toggle('active', x === b);
          x.setAttribute('aria-selected', x === b ? 'true' : 'false');
        });
        renderGrid();
      };
      filters.appendChild(b);
    });

    hub.querySelector('#arcFeatured').onclick = function () { openRoom(state.featured.key); };
    hub.querySelector('#arcClose').onclick = function () { close(); };
    var soundBtn = hub.querySelector('#arcSound');
    soundBtn.classList.toggle('on', !state.muted);
    soundBtn.onclick = function () {
      setMuted(!state.muted);
      soundBtn.textContent = state.muted ? '🔇' : '🔊';
      soundBtn.classList.toggle('on', !state.muted);
    };

    renderGrid();
  }

  function renderGrid() {
    var grid = hub && hub.querySelector('#arcGrid');
    var count = hub && hub.querySelector('#arcCount');
    if (!grid) return;
    var all = list().filter(function (g) {
      return state.filter === 'All' || metaFor(g).cat === state.filter;
    });
    grid.innerHTML = '';
    if (!all.length) {
      grid.appendChild(h('div', 'arc-empty', 'No games in this wing yet. Try another filter.'));
    }
    all.forEach(function (game, i) {
      var m = metaFor(game);
      var best = getBest(game.key);
      var card = h('button', 'arc-card');
      card.type = 'button';
      card.style.setProperty('--i', i);
      card.style.setProperty('--accent', m.accent);
      card.setAttribute('aria-label', 'Play ' + m.title);
      card.innerHTML =
        '<div class="arc-card-art">' +
          (m.isNew ? '<span class="arc-new">New</span>' : '') +
          '<div class="arc-diff" aria-label="Difficulty ' + m.diff + ' of 4">' +
            [1, 2, 3, 4].map(function (n) { return '<i class="' + (n <= m.diff ? 'on' : '') + '"></i>'; }).join('') +
          '</div>' +
          '<span class="arc-card-emoji">' + m.icon + '</span>' +
        '</div>' +
        '<div class="arc-card-body">' +
          '<div class="arc-card-title">' + m.title + '<small>' + m.cat + '</small></div>' +
          '<p class="arc-card-desc">' + m.desc + '</p>' +
          '<div class="arc-card-foot">' +
            '<span class="best">🏆 <b>' + (best ? fmt(best) : '—') + '</b></span>' +
            '<span class="arc-card-play">▶ Play</span>' +
          '</div>' +
        '</div>';
      card.onclick = function () { openRoom(game.key); };
      grid.appendChild(card);
    });
    if (count) count.innerHTML = '<b>' + all.length + '</b> game' + (all.length === 1 ? '' : 's') + (state.filter === 'All' ? '' : ' · ' + state.filter);
  }

  function diffLabel(d) {
    return ['Chill', 'Easy', 'Tricky', 'Cursed'][Math.min(3, Math.max(0, d - 1))] || 'Tricky';
  }

  function refreshHubStats() {
    if (!hub) return;
    var g = hub.querySelector('#arcGold'), l = hub.querySelector('#arcLevel');
    if (g) g.textContent = fmt(gold());
    if (l) l.textContent = level();
  }

  /* ----------------------------------------------------------------- room */
  function ensureRoom() {
    if (room) return;
    room = h('div');
    room.id = 'spookyRoom';
    room.setAttribute('role', 'dialog');
    room.setAttribute('aria-modal', 'true');
    room.innerHTML =
      '<div class="room-toast-wrap" id="roomToasts"></div>' +
      '<div class="room-top">' +
        '<button class="room-back" id="roomBack" aria-label="Back to arcade"><span aria-hidden="true">←</span><span>Arcade</span></button>' +
        '<div class="room-heading"><h2 id="roomTitle">Game</h2><p id="roomSub">Midnight Arcade</p></div>' +
        '<div class="room-hud">' +
          '<span class="arc-chip room-score-chip">Score <b id="roomScore">0</b></span>' +
          '<span class="arc-chip gold-chip">🪙 <b id="roomGold">0</b></span>' +
          '<span class="arc-chip room-best-chip">🏆 <b id="roomBest">0</b></span>' +
          '<button class="arc-icon-btn" id="roomSound" aria-label="Toggle sound">🔊</button>' +
          '<button class="arc-icon-btn" id="roomPause" aria-label="Pause">⏸</button>' +
        '</div>' +
      '</div>' +
      '<div class="room-main" id="roomMain"></div>' +
      '<div class="room-foot" id="roomFoot"></div>';
    document.body.appendChild(room);
    roomRefs = {
      title: room.querySelector('#roomTitle'),
      sub: room.querySelector('#roomSub'),
      score: room.querySelector('#roomScore'),
      gold: room.querySelector('#roomGold'),
      best: room.querySelector('#roomBest'),
      sound: room.querySelector('#roomSound'),
      pause: room.querySelector('#roomPause'),
      main: room.querySelector('#roomMain'),
      foot: room.querySelector('#roomFoot'),
      toasts: room.querySelector('#roomToasts')
    };
    room.querySelector('#roomBack').onclick = function () { exitRoom(); };
    roomRefs.pause.onclick = function () { togglePause(); };
    roomRefs.sound.onclick = function () {
      setMuted(!state.muted);
      roomRefs.sound.textContent = state.muted ? '🔇' : '🔊';
      roomRefs.sound.classList.toggle('on', !state.muted);
    };
    roomRefs.sound.classList.toggle('on', !state.muted);
    roomRefs.sound.textContent = state.muted ? '🔇' : '🔊';
  }

  function gameByKey(key) {
    var found = null;
    list().forEach(function (g) { if (g.key === key) found = g; });
    return found;
  }

  function openRoom(key) {
    var game = gameByKey(key);
    if (!game) return;
    ensureRoom();
    ensureHub();
    if (window.SpookyGames) window.SpookyGames.stopAll();
    state.game = game;
    state.playing = false;
    state.paused = false;
    state.bestThisRun = 0;
    state.startScore = +(snapshot().score || 0);
    state.goldStart = +(gold() || 0);

    var m = metaFor(game);
    room.style.setProperty('--accent', m.accent);
    roomRefs.title.textContent = m.title;
    roomRefs.sub.textContent = m.cat + ' · ' + diffLabel(m.diff);
    roomRefs.score.textContent = '0';
    roomRefs.gold.textContent = fmt(gold());
    roomRefs.best.textContent = getBest(game.key) ? fmt(getBest(game.key)) : '—';
    roomRefs.pause.disabled = false;
    roomRefs.pause.style.opacity = '.45';
    roomRefs.foot.innerHTML = '<span><b>' + m.controls + '</b></span><span><span class="kbd">Esc</span> pause</span><span><span class="kbd">Backspace</span> leave</span>';

    roomRefs.main.innerHTML = '';
    var intro = h('div', 'room-intro');
    intro.style.setProperty('--accent', m.accent);
    intro.innerHTML =
      '<div class="room-intro-icon">' + m.icon + '</div>' +
      '<span class="intro-tag">' + m.cat + ' · ' + diffLabel(m.diff) + '</span>' +
      '<h1>' + m.title + '</h1>' +
      '<p class="intro-desc">' + m.desc + '</p>' +
      '<div class="intro-how">' + m.howto.map(function (t) { return '<span>✦ ' + t + '</span>'; }).join('') + '</div>' +
      '<div class="intro-actions">' +
        '<button class="arc-cta" id="roomStart">▶ Enter the game</button>' +
        '<button class="room-ghost-btn" id="roomIntroBack">← Back to arcade</button>' +
      '</div>';
    roomRefs.main.appendChild(intro);
    intro.querySelector('#roomStart').onclick = function () { startGame(); };
    intro.querySelector('#roomIntroBack').onclick = function () { exitRoom(); };

    hub.style.visibility = 'hidden';
    room.classList.add('room-open');
    roomRefs.main.scrollTop = 0;
    updateRoomHud();
  }

  function startGame() {
    if (!state.game) return;
    var game = state.game;
    var m = metaFor(game);
    roomRefs.main.innerHTML = '';
    var stage = h('div', 'room-stage');
    stage.style.setProperty('--accent', m.accent);
    roomRefs.main.appendChild(stage);

    state.playing = true;
    state.paused = false;
    state.bestThisRun = 0;
    state.startScore = +(snapshot().score || 0);
    state.goldStart = +(gold() || 0);
    roomRefs.pause.style.opacity = '1';

    if (window.SpookyGames) {
      window.SpookyGames.setMuted(state.muted);
      if (window.SpookyGames.resumeAll) window.SpookyGames.resumeAll();
    }
    try {
      game.build(stage, roomProfile());
    } catch (err) {
      stage.innerHTML = '<div class="g-result"><div class="gr-icon">💥</div><h3>The spell fizzled</h3><p>' +
        String(err && err.message ? err.message : err) + '</p></div>';
    }
    startHud();
    updateRoomHud();
  }

  function roomProfile() {
    var base = (state.host && state.host.profile) || {};
    var p = Object.create(base);
    p.addScore = function (n) {
      if (base.addScore) base.addScore(n);
      updateRoomHud();
    };
    p.addGold = function (n) {
      if (base.addGold) base.addGold(n);
      toast('+ ' + fmt(n) + ' gold');
      updateRoomHud();
    };
    p.addCoal = function (n) {
      if (base.addCoal) base.addCoal(n);
      updateRoomHud();
    };
    p.gainXP = function (n) {
      if (base.gainXP) base.gainXP(n);
      updateRoomHud();
    };
    p.unlock = function (id, name) {
      if (base.unlock) base.unlock(id, name);
      toast('🏆 ' + name);
    };
    p.flash = function (msg) {
      toast(msg);
      if (base.flash) { try { base.flash(msg); } catch (e) {} }
    };
    return p;
  }

  function startHud() {
    stopHud();
    state.hudTimer = setInterval(updateRoomHud, 450);
  }
  function stopHud() {
    if (state.hudTimer) { clearInterval(state.hudTimer); state.hudTimer = 0; }
  }

  function updateRoomHud() {
    if (!room || !state.game) return;
    var snap = snapshot();
    var score = +(snap.score || 0);
    var delta = Math.max(0, score - state.startScore);
    if (delta > state.bestThisRun) state.bestThisRun = delta;
    var best = Math.max(getBest(state.game.key), state.bestThisRun);
    if (roomRefs) {
      roomRefs.score.textContent = fmt(delta);
      roomRefs.gold.textContent = fmt(gold());
      roomRefs.best.textContent = best ? fmt(best) : '—';
    }
  }

  function toast(msg) {
    if (!roomRefs || !roomRefs.toasts || !msg) return;
    var t = h('div', 'room-toast', msg);
    roomRefs.toasts.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2700);
    while (roomRefs.toasts.children.length > 3) roomRefs.toasts.removeChild(roomRefs.toasts.firstChild);
  }

  function togglePause() {
    if (!state.playing) return;
    state.paused = !state.paused;
    if (state.paused) {
      if (window.SpookyGames && window.SpookyGames.pauseAll) window.SpookyGames.pauseAll();
      showPause();
    } else {
      if (window.SpookyGames && window.SpookyGames.resumeAll) window.SpookyGames.resumeAll();
      var p = room.querySelector('.room-pause');
      if (p) p.remove();
    }
    if (roomRefs) roomRefs.pause.textContent = state.paused ? '▶' : '⏸';
  }

  function showPause() {
    var old = room.querySelector('.room-pause');
    if (old) old.remove();
    var m = metaFor(state.game);
    var p = h('div', 'room-pause');
    p.innerHTML =
      '<div class="room-pause-card">' +
        '<h3>⏸ Paused</h3>' +
        '<p>' + m.title + ' will wait right here.</p>' +
        '<div class="prow">' +
          '<button class="primary" id="pauseResume">▶ Resume</button>' +
          '<button id="pauseRestart">↻ Restart game</button>' +
          '<button id="pauseExit">← Back to arcade</button>' +
        '</div>' +
      '</div>';
    room.appendChild(p);
    p.querySelector('#pauseResume').onclick = function () { togglePause(); };
    p.querySelector('#pauseRestart').onclick = function () {
      p.remove();
      state.paused = false;
      if (roomRefs) roomRefs.pause.textContent = '⏸';
      if (window.SpookyGames) window.SpookyGames.resumeAll();
      startGame();
    };
    p.querySelector('#pauseExit').onclick = function () {
      p.remove();
      state.paused = false;
      if (roomRefs) roomRefs.pause.textContent = '⏸';
      if (window.SpookyGames) window.SpookyGames.resumeAll();
      exitRoom();
    };
  }

  function exitRoom() {
    if (!room || !state.game) return;
    if (state.playing) updateRoomHud();
    setBest(state.game.key, state.bestThisRun);
    if (window.SpookyGames) window.SpookyGames.stopAll();
    stopHud();
    var pause = room.querySelector('.room-pause');
    if (pause) pause.remove();
    room.classList.remove('room-open');
    roomRefs.pause.textContent = '⏸';
    state.paused = false;
    state.playing = false;
    state.game = null;
    if (hub) hub.style.visibility = '';
    if (state.host && state.host.onSelect) { try { state.host.onSelect(5); } catch (e) {} }
    renderHub();
    if (hub) hub.classList.add('arc-open');
  }

  /* Called by mini-games through SpookyArcade.result({...}) on game over. */
  function result(o) {
    if (!o || !state.game) return;
    if (state.bestThisRun > 0) setBest(state.game.key, state.bestThisRun);
    if (roomRefs) roomRefs.best.textContent = fmt(Math.max(getBest(state.game.key), state.bestThisRun));
    if (o.win) toast('🏆 Victory!');
  }

  /* ------------------------------------------------------------ open/close */
  function open(host) {
    state.host = host || state.host;
    state.open = true;
    ensureHub();
    renderHub();
    hub.classList.add('arc-open');
    document.body.classList.add('arcade-open');
    refreshHubStats();
    if (state.host && state.host.snapshot) {
      state.startScore = +(snapshot().score || 0);
    }
    if (window.SpookyGames && window.SpookyGames.setMuted) window.SpookyGames.setMuted(state.muted);
  }

  function close(silent) {
    if (!state.open) return;
    if (room && room.classList.contains('room-open')) exitRoom();
    state.open = false;
    document.body.classList.remove('arcade-open');
    if (hub) hub.classList.remove('arc-open');
    if (!silent && state.host && state.host.onClose) state.host.onClose();
  }

  function isOpen() { return state.open; }
  function toHub() { exitRoom(); }
  function isMuted() { return state.muted; }

  /* Keyboard: Esc pauses a run / leaves a room / closes the hub. */
  document.addEventListener('keydown', function (e) {
    if (!state.open) return;
    if (e.key === 'Escape') {
      if (state.playing) { e.preventDefault(); togglePause(); }
      else if (room && room.classList.contains('room-open')) { e.preventDefault(); exitRoom(); }
      else { e.preventDefault(); close(); }
    } else if (e.key === 'Backspace' && state.playing) {
      e.preventDefault();
      if (state.paused) togglePause();
      exitRoom();
    }
  });

  /* Keep hub counters fresh while it is visible. */
  setInterval(function () {
    if (state.open && hub && !(room && room.classList.contains('room-open'))) refreshHubStats();
  }, 1200);

  function setMuted(v) {
    state.muted = !!v;
    try { localStorage.setItem('spooky_arcade_muted', state.muted ? '1' : '0'); } catch (e) {}
    if (window.SpookyGames && window.SpookyGames.setMuted) window.SpookyGames.setMuted(state.muted);
  }

  try {
    state.muted = localStorage.getItem('spooky_arcade_muted') === '1';
  } catch (e) {}

  window.SpookyArcade = {
    open: open,
    close: close,
    isOpen: isOpen,
    toHub: toHub,
    result: result,
    isMuted: isMuted
  };
})();

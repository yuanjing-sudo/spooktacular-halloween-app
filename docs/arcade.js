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

  function artSVG(inner) {
    return '<svg class="arc-art-svg" viewBox="0 0 120 120" aria-hidden="true">' + inner + '</svg>';
  }

  /* Hand-built miniature scenes for the hub, hero and room intro. No external
   * assets, so the whole arcade stays portable inside GitHub Pages. */
  var ART = {
    smash: artSVG(
      '<ellipse cx="60" cy="99" rx="34" ry="6" fill="#ff7518" opacity=".2"/>' +
      '<path d="M24 65 Q24 32 60 32 Q96 32 96 65 Q96 94 60 94 Q24 94 24 65Z" fill="#ff8c1a"/>' +
      '<path d="M34 47 Q28 69 34 90 M60 35 Q54 64 60 94 M86 47 Q92 69 86 90" fill="none" stroke="#d95f00" stroke-width="2" opacity=".55"/>' +
      '<path d="M58 34 Q58 22 68 18 Q64 28 66 34Z" fill="#4f9a3a"/><path d="M67 24 Q78 22 80 30 Q72 32 67 24Z" fill="#68b84c"/>' +
      '<path d="M37 54 L50 66 L36 66Z" fill="#3a1400"/><path d="M83 54 L70 66 L84 66Z" fill="#3a1400"/>' +
      '<path d="M44 76 L52 67 L60 77 L68 67 L76 76 L68 88 L60 82 L52 88Z" fill="#3a1400"/>' +
      '<g transform="rotate(38 94 55)"><rect x="90" y="25" width="9" height="38" rx="4" fill="#8b5a2b"/><rect x="80" y="14" width="29" height="14" rx="4" fill="#c98a4b"/></g>'
    ),
    sort: artSVG(
      '<path d="M16 68 Q60 55 104 68 L94 98 Q60 108 26 98Z" fill="#24103f" stroke="#59e6ff" stroke-width="2"/>' +
      '<path d="M20 76 Q60 65 100 76" fill="none" stroke="#59e6ff" stroke-width="1.5" opacity=".55"/>' +
      '<circle cx="39" cy="43" r="12" fill="#ff6b9d"/><path d="M27 43 L17 34 L20 47 L14 55 L29 50Z" fill="#ff6b9d" opacity=".85"/><path d="M51 43 L61 34 L58 47 L64 55 L49 50Z" fill="#ff6b9d" opacity=".85"/>' +
      '<circle cx="64" cy="32" r="13" fill="#59e6ff"/><path d="M51 32 L41 22 L44 36 L38 44 L53 39Z" fill="#59e6ff" opacity=".85"/><path d="M77 32 L87 22 L84 36 L90 44 L75 39Z" fill="#59e6ff" opacity=".85"/>' +
      '<circle cx="86" cy="48" r="10" fill="#ffd166"/><path d="M96 48 L105 40 L102 52 L108 59 L95 55Z" fill="#ffd166" opacity=".85"/>' +
      '<path d="M24 18 Q60 6 96 18" fill="none" stroke="#ffd166" stroke-width="2" stroke-dasharray="4 5" opacity=".55"/>' +
      '<path d="M90 15 L99 19 L91 24Z" fill="#ffd166"/>'
    ),
    race: artSVG(
      '<circle cx="93" cy="25" r="14" fill="#ffd166" opacity=".85"/><circle cx="88" cy="21" r="13" fill="#1a0b30"/>' +
      '<path d="M10 87 Q60 68 110 87" fill="none" stroke="#c44dff" stroke-width="4" opacity=".5"/><path d="M17 96 Q60 78 103 96" fill="none" stroke="#c44dff" stroke-width="2" opacity=".35"/>' +
      '<path d="M43 49 Q43 28 61 28 Q79 28 79 49 L79 70 Q79 76 74 71 Q70 67 66 72 Q62 77 58 72 Q54 67 50 72 Q46 77 43 70Z" fill="#f5e9ff" opacity=".9"/>' +
      '<circle cx="53" cy="48" r="4" fill="#2a1040"/><circle cx="69" cy="48" r="4" fill="#2a1040"/><ellipse cx="61" cy="60" rx="4" ry="5" fill="#2a1040" opacity=".7"/>' +
      '<path d="M22 51 L37 51 M18 61 L33 61 M25 71 L38 71" stroke="#ffd166" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M89 61 Q99 55 107 61 M88 70 Q98 64 106 70" stroke="#c44dff" stroke-width="2" stroke-linecap="round" opacity=".55"/>'
    ),
    duel: artSVG(
      '<circle cx="37" cy="60" r="20" fill="#ff7518" opacity=".2"/><circle cx="83" cy="60" r="20" fill="#59e6ff" opacity=".2"/>' +
      '<circle cx="37" cy="60" r="13" fill="#ff9a3d"/><circle cx="83" cy="60" r="13" fill="#59e6ff"/>' +
      '<path d="M50 51 L58 58 L53 60 L67 70 L62 59 L68 57Z" fill="#ffd166"/>' +
      '<path d="M37 42 L39 34 M83 42 L81 34 M21 60 L13 60 M107 60 L99 60" stroke="#f472b6" stroke-width="2" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M20 26 L23 32 L30 34 L24 38 L23 45 L19 39 L12 38 L18 33Z" fill="#f472b6" opacity=".8"/>' +
      '<path d="M98 24 L100 31 L107 33 L101 37 L99 44 L96 37 L89 35 L95 30Z" fill="#ffd166" opacity=".8"/>'
    ),
    escape: artSVG(
      '<rect x="17" y="17" width="86" height="86" rx="14" fill="#071a12" stroke="#7dffb0" stroke-width="2"/>' +
      '<path d="M31 31 H68 V44 H44 V68 H68 V80 H31Z M76 31 H89 V57 H76Z M56 56 H89 V80 H76 V68 H56Z" fill="none" stroke="#7dffb0" stroke-width="4" stroke-linejoin="round" opacity=".8"/>' +
      '<circle cx="50" cy="50" r="6" fill="#ffd166"/><path d="M50 44 Q47 36 53 31 Q52 39 56 44Z" fill="#ff9a3d"/>' +
      '<path d="M24 90 L34 80 M96 30 L86 40" stroke="#7dffb0" stroke-width="2" stroke-linecap="round" opacity=".4"/>'
    ),
    trivia: artSVG(
      '<path d="M20 42 Q42 32 60 42 Q78 32 100 42 L100 88 Q78 78 60 88 Q42 78 20 88Z" fill="#2a1040" stroke="#a855f7" stroke-width="2"/>' +
      '<path d="M60 42 L60 88" stroke="#a855f7" stroke-width="2" opacity=".6"/>' +
      '<path d="M34 55 Q38 47 46 49 Q53 51 50 59 Q48 63 44 65 L44 70" fill="none" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="78" r="2.5" fill="#ffd166"/>' +
      '<path d="M78 54 Q84 48 90 54 Q94 60 88 65 L88 70" fill="none" stroke="#59e6ff" stroke-width="3" stroke-linecap="round"/><circle cx="88" cy="77" r="2" fill="#59e6ff"/>' +
      '<path d="M96 24 Q100 14 108 12 Q104 20 96 24Z" fill="#ff9a3d" opacity=".8"/>'
    ),
    rhythm: artSVG(
      '<circle cx="60" cy="62" r="38" fill="none" stroke="#fb7185" stroke-width="2" stroke-dasharray="4 7" opacity=".65"/>' +
      '<circle cx="60" cy="62" r="27" fill="none" stroke="#ffd166" stroke-width="1.5" opacity=".45"/>' +
      '<circle cx="60" cy="62" r="9" fill="#fb7185"/><circle cx="60" cy="62" r="4" fill="#fff2f6"/>' +
      '<g fill="#ffd166"><circle cx="29" cy="35" r="6"/><rect x="34" y="18" width="3" height="19" rx="1.5"/><path d="M37 18 Q46 20 44 28 L37 25Z"/></g>' +
      '<g fill="#59e6ff"><circle cx="88" cy="81" r="5"/><rect x="92" y="67" width="3" height="16" rx="1.5"/><path d="M95 67 Q103 69 101 76 L95 73Z"/></g>' +
      '<path d="M23 82 L27 88 L34 90 L28 94 L27 101 L23 95 L16 94 L22 89Z" fill="#fb7185" opacity=".8"/>'
    ),
    run: artSVG(
      '<path d="M15 87 L38 74 L38 91 L15 104Z" fill="#2a1040"/><path d="M38 74 L61 87 L38 91Z" fill="#59e6ff" opacity=".55"/><path d="M15 87 L38 74 L38 91Z" fill="#59e6ff" opacity=".25"/>' +
      '<path d="M38 60 L61 73 L61 90 L38 104 L15 90 L15 73Z" fill="#3b1d5e" stroke="#59e6ff" stroke-width="1.5"/>' +
      '<circle cx="74" cy="58" r="7" fill="#ffd166"/><path d="M74 65 L74 80 M74 70 L64 76 M74 70 L84 64 M74 80 L66 92 M74 80 L82 92" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M92 30 Q96 25 100 30 Q104 25 108 30 Q112 34 108 38 Q104 42 100 46 Q96 42 92 38 Q88 34 92 30Z" fill="#c084fc" opacity=".85"/>' +
      '<circle cx="96" cy="20" r="9" fill="#f5e9ff" opacity=".8"/>'
    ),
    catcher: artSVG(
      '<path d="M26 77 L94 77 L84 103 L36 103Z" fill="#8b5a2b" stroke="#ffd166" stroke-width="2"/><path d="M32 84 H88" stroke="#ffd166" stroke-width="1.5" opacity=".55"/>' +
      '<circle cx="42" cy="34" r="8" fill="#ff6b9d"/><circle cx="63" cy="23" r="7" fill="#59e6ff"/><circle cx="83" cy="39" r="8" fill="#ffd166"/>' +
      '<path d="M34 36 L29 31 M49 31 L54 25 M55 26 L58 21 M75 45 L80 50" stroke="#ffd166" stroke-width="2" stroke-linecap="round" opacity=".55"/>' +
      '<path d="M35 63 L43 53 L51 63 M69 58 L77 48 L85 58" fill="none" stroke="#ffd166" stroke-width="2" stroke-linecap="round" opacity=".7"/>'
    ),
    simon: artSVG(
      '<g transform="translate(60 60) rotate(45)"><rect x="-36" y="-36" width="33" height="33" rx="9" fill="#7dffb0" opacity=".85"/><rect x="3" y="-36" width="33" height="33" rx="9" fill="#ff7518" opacity=".85"/><rect x="-36" y="3" width="33" height="33" rx="9" fill="#a855f7" opacity=".85"/><rect x="3" y="3" width="33" height="33" rx="9" fill="#59e6ff" opacity=".85"/></g>' +
      '<circle cx="60" cy="60" r="10" fill="#1a0b30" stroke="#ffd166" stroke-width="2"/>' +
      '<path d="M22 25 L26 31 L33 32 L27 37 L29 44 L23 39 L16 43 L18 36 L12 31 L19 30Z" fill="#ffd166" opacity=".8"/>'
    ),
    memory: artSVG(
      '<g transform="rotate(-10 42 62)"><rect x="24" y="30" width="45" height="62" rx="8" fill="#3b1d5e" stroke="#8b5cf6" stroke-width="2"/><path d="M35 48 Q35 38 47 38 Q59 38 59 48 L59 67 Q59 71 55 68 Q51 65 47 69 Q43 73 39 69 Q35 65 35 62Z" fill="#d8c7ff" opacity=".8"/><circle cx="42" cy="50" r="2.5" fill="#2a1040"/><circle cx="52" cy="50" r="2.5" fill="#2a1040"/></g>' +
      '<g transform="rotate(9 78 58)"><rect x="61" y="22" width="45" height="62" rx="8" fill="#24103f" stroke="#8b5cf6" stroke-width="2"/><path d="M64 84 L103 84" stroke="#8b5cf6" stroke-width="1" opacity=".5"/><path d="M84 38 L88 46 L96 47 L90 53 L92 61 L84 56 L76 61 L78 53 L72 47 L80 46Z" fill="#ffd166" opacity=".85"/></g>'
    ),
    bats: artSVG(
      '<circle cx="87" cy="26" r="16" fill="#ffd166" opacity=".9"/><circle cx="82" cy="22" r="15" fill="#1a0b30"/>' +
      '<g fill="#c084fc"><path d="M22 48 Q30 40 38 48 Q34 50 31 54 Q28 49 22 48Z"/><path d="M38 48 Q46 40 54 48 Q50 50 47 54 Q44 49 38 48Z"/></g>' +
      '<g fill="#a855f7"><path d="M48 70 Q56 62 64 70 Q60 72 57 76 Q54 71 48 70Z"/><path d="M64 70 Q72 62 80 70 Q76 72 73 76 Q70 71 64 70Z"/></g>' +
      '<g fill="#7c3aed"><path d="M70 42 Q76 36 82 42 Q79 44 77 47 Q75 43 70 42Z"/><path d="M82 42 Q88 36 94 42 Q91 44 89 47 Q87 43 82 42Z"/></g>' +
      '<circle cx="58" cy="58" r="2" fill="#ffd166"/><circle cx="76" cy="54" r="1.5" fill="#ffd166"/>'
    ),
    brew: artSVG(
      '<ellipse cx="60" cy="93" rx="40" ry="7" fill="#7dffb0" opacity=".18"/>' +
      '<path d="M25 56 Q25 92 60 92 Q95 92 95 56Z" fill="#24103f" stroke="#7dffb0" stroke-width="2"/>' +
      '<path d="M30 62 Q60 54 90 62 L86 78 Q60 86 34 78Z" fill="#3dff9d" opacity=".7"/>' +
      '<path d="M28 56 Q60 42 92 56" fill="none" stroke="#7dffb0" stroke-width="4"/>' +
      '<circle cx="44" cy="48" r="6" fill="#7dffb0" opacity=".45"/><circle cx="62" cy="39" r="8" fill="#7dffb0" opacity=".35"/><circle cx="80" cy="46" r="5" fill="#7dffb0" opacity=".5"/>' +
      '<path d="M34 83 Q40 72 46 83 M64 86 Q70 76 76 86" fill="none" stroke="#3dff9d" stroke-width="2" opacity=".55"/>' +
      '<rect x="92" y="36" width="6" height="44" rx="3" fill="#8b5a2b" transform="rotate(18 95 58)"/>'
    ),
    spiders: artSVG(
      '<path d="M60 16 V104 M16 60 H104 M24 24 L96 96 M96 24 L24 96 M38 18 L82 102 M82 18 L38 102" stroke="#c44dff" stroke-width="1" opacity=".28"/>' +
      '<circle cx="60" cy="60" r="15" fill="#2a1040" stroke="#c44dff" stroke-width="2"/><circle cx="60" cy="47" r="8" fill="#3b1d5e" stroke="#c44dff" stroke-width="2"/>' +
      '<circle cx="56" cy="45" r="2" fill="#ffd166"/><circle cx="64" cy="45" r="2" fill="#ffd166"/>' +
      '<path d="M49 54 L32 42 M49 60 L28 58 M49 66 L32 78 M71 54 L88 42 M71 60 L92 58 M71 66 L88 78" stroke="#c44dff" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M20 20 Q32 24 40 34 M100 20 Q88 24 80 34" stroke="#ffd166" stroke-width="1" opacity=".5"/>'
    ),
    flight: artSVG(
      '<circle cx="88" cy="28" r="15" fill="#ffd166" opacity=".85"/><circle cx="83" cy="23" r="14" fill="#1a0b30"/>' +
      '<path d="M22 78 Q60 96 98 78" fill="none" stroke="#59e6ff" stroke-width="4" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M28 55 L60 22 L92 55Z" fill="#3b1d5e" stroke="#a855f7" stroke-width="2"/><path d="M18 55 Q60 48 102 55" fill="none" stroke="#a855f7" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M60 22 Q52 14 58 8 Q66 12 64 22Z" fill="#ffd166"/>' +
      '<path d="M58 55 Q72 55 82 63 Q92 71 106 68" fill="none" stroke="#ffd166" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M42 86 L34 94 M54 90 L48 100 M68 90 L74 100" stroke="#59e6ff" stroke-width="2" stroke-linecap="round" opacity=".4"/>'
    ),
    hangman: artSVG(
      '<path d="M24 100 V18 H78 M78 18 V38" fill="none" stroke="#ff9f1c" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M24 100 H58" stroke="#ff9f1c" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="78" cy="51" r="13" fill="none" stroke="#ffd166" stroke-width="3"/><path d="M78 64 V85 M78 72 L66 80 M78 72 L90 80 M78 85 L68 98 M78 85 L88 98" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M92 18 Q98 14 100 22 Q96 24 92 18Z" fill="#c084fc"/><circle cx="103" cy="16" r="2" fill="#c084fc"/>' +
      '<circle cx="40" cy="28" r="9" fill="#ffd166" opacity=".7"/>'
    ),
    count: artSVG(
      '<path d="M18 102 V52 Q18 18 60 18 Q102 18 102 52 V102Z" fill="#0b0620" stroke="#59e6ff" stroke-width="2"/>' +
      '<path d="M28 102 V54 Q28 28 60 28 Q92 28 92 54 V102Z" fill="#122a3a" opacity=".75"/>' +
      '<g opacity=".95"><path d="M41 70 Q41 55 52 55 Q63 55 63 70 L63 84 Q63 88 59 84 Q56 81 52 85 Q48 89 45 85 Q41 81 41 78Z" fill="#d8f7ff"/><circle cx="47" cy="69" r="2.5" fill="#1a0b30"/><circle cx="57" cy="69" r="2.5" fill="#1a0b30"/></g>' +
      '<g opacity=".75"><path d="M65 62 Q65 50 74 50 Q83 50 83 62 L83 74 Q83 77 80 74 Q77 71 74 75 Q71 78 68 75 Q65 72 65 69Z" fill="#9defff"/><circle cx="70" cy="61" r="2" fill="#1a0b30"/><circle cx="78" cy="61" r="2" fill="#1a0b30"/></g>' +
      '<path d="M36 30 Q60 20 84 30" fill="none" stroke="#59e6ff" stroke-width="2" opacity=".45"/>' +
      '<text x="60" y="100" text-anchor="middle" fill="#ffd166" font-size="12" font-family="sans-serif" font-weight="700">1 · 2 · 3</text>'
    ),
    archery: artSVG(
      '<path d="M24 18 Q10 60 24 102" fill="none" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M24 18 L24 102" stroke="#ffd166" stroke-width="1" opacity=".7"/>' +
      '<path d="M20 60 H76" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/><path d="M76 60 L68 53 M76 60 L68 67" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="91" cy="60" r="20" fill="#ff7518" stroke="#ffd166" stroke-width="2"/><circle cx="91" cy="60" r="12" fill="#ffd166"/><circle cx="91" cy="60" r="4" fill="#3a1400"/>' +
      '<path d="M84 50 L96 50 M80 60 H102 M84 70 L96 70" stroke="#3a1400" stroke-width="2" opacity=".7"/>'
    ),
    reflex: artSVG(
      '<ellipse cx="60" cy="100" rx="31" ry="5" fill="#ef4444" opacity=".2"/>' +
      '<path d="M30 96 V44 Q30 20 60 20 Q90 20 90 44 V96Z" fill="#1a0b00" stroke="#ef4444" stroke-width="2"/>' +
      '<path d="M26 44 Q60 30 94 44 L94 96 Q60 84 26 96Z" fill="#2a1040" opacity=".7"/>' +
      '<path d="M33 45 Q60 35 87 45 L86 62 Q60 54 34 62Z" fill="#3b1d5e" stroke="#ef4444" stroke-width="1.5"/>' +
      '<circle cx="50" cy="72" r="4" fill="#ff3355"/><circle cx="70" cy="72" r="4" fill="#ff3355"/>' +
      '<path d="M50 84 Q60 92 70 84" fill="none" stroke="#ff3355" stroke-width="2"/><path d="M54 84 L57 91 L60 84 L63 91 L66 84" fill="#fff"/>' +
      '<path d="M60 20 V8" stroke="#ef4444" stroke-width="3"/><circle cx="60" cy="6" r="3" fill="#ffd166"/>'
    ),
    candles: artSVG(
      '<path d="M20 100 H100" stroke="#ffb457" stroke-width="3" stroke-linecap="round" opacity=".6"/>' +
      '<rect x="28" y="52" width="16" height="44" rx="4" fill="#f5e9ff"/><rect x="52" y="40" width="16" height="56" rx="4" fill="#ffd166"/><rect x="76" y="58" width="16" height="38" rx="4" fill="#f5e9ff"/>' +
      '<path d="M36 52 Q31 42 36 34 Q41 42 36 52Z" fill="#ff9a3d"/><path d="M60 40 Q55 28 60 18 Q65 28 60 40Z" fill="#ffd166"/><path d="M84 58 Q79 48 84 40 Q89 48 84 58Z" fill="#ff9a3d"/>' +
      '<circle cx="36" cy="40" r="13" fill="#ff9a3d" opacity=".12"/><circle cx="60" cy="27" r="16" fill="#ffd166" opacity=".14"/><circle cx="84" cy="46" r="12" fill="#ff9a3d" opacity=".12"/>' +
      '<path d="M18 30 Q24 24 28 30 M96 22 Q102 16 106 22" stroke="#ffb457" stroke-width="2" stroke-linecap="round" opacity=".5"/>'
    )
  };

  function artFor(key, fallback) {
    return ART[key] || '<span class="arc-art-fallback">' + (fallback || '🎮') + '</span>';
  }

  var AMBIENCE = {
    smash: ['🎃', '🍂', '🕯️', '🦇'],
    sort: ['🍬', '🍭', '🍫', '✨'],
    race: ['👻', '🌙', '🦇', '💨'],
    duel: ['✨', '🔮', '⚡', '🪄'],
    escape: ['🌀', '🕯️', '👻', '🧱'],
    trivia: ['🧠', '💀', '📜', '🕯️'],
    rhythm: ['🎵', '🎶', '🥁', '✨'],
    run: ['🧱', '🦇', '🌲', '🌙'],
    catcher: ['🍭', '🍬', '🪣', '✨'],
    simon: ['🟣', '🟢', '🔵', '🟡'],
    memory: ['🃏', '🎃', '👻', '🍬'],
    bats: ['🦇', '🌙', '⭐', '🕸️'],
    brew: ['🧪', '🫧', '🔥', '🌿'],
    spiders: ['🕷️', '🕸️', '🕯️', '🪰'],
    flight: ['🧙', '🌙', '⭐', '🏰'],
    hangman: ['☠️', '🪢', '🕯️', '📜'],
    count: ['👻', '💀', '⚰️', '🔢'],
    archery: ['🏹', '🎯', '🎃', '🍂'],
    reflex: ['🧛', '⚰️', '🩸', '🌙'],
    candles: ['🕯️', '🔥', '🌬️', '✨']
  };
  var MOTES = [
    [7, 17, 1.35, 0.0], [21, 72, 1.65, 2.8], [36, 25, 1.1, 1.4],
    [53, 84, 1.9, 3.5], [67, 18, 1.0, 4.1], [79, 62, 1.5, 0.8],
    [91, 31, 1.25, 3.2], [12, 53, 0.95, 2.2]
  ];

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
    countdownTimer: 0,
    countingDown: false,
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
            '<span class="arc-big-art">' + artFor(state.featured.key, fm.icon) + '</span>' +
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
      card.dataset.key = game.key;
      card.style.setProperty('--i', i);
      card.style.setProperty('--accent', m.accent);
      card.setAttribute('aria-label', 'Play ' + m.title);
      card.innerHTML =
        '<div class="arc-card-art">' +
          (m.isNew ? '<span class="arc-new">New</span>' : '') +
          '<div class="arc-diff" aria-label="Difficulty ' + m.diff + ' of 4">' +
            [1, 2, 3, 4].map(function (n) { return '<i class="' + (n <= m.diff ? 'on' : '') + '"></i>'; }).join('') +
          '</div>' +
          '<span class="arc-card-art-icon">' + artFor(game.key, m.icon) + '</span>' +
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
      '<div class="room-intro-icon">' + artFor(game.key, m.icon) + '</div>' +
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

  function addStageAtmosphere(stage, key, m) {
    stage.dataset.game = key;
    stage.dataset.icon = m.icon;
    var layer = h('div', 'stage-atmos');
    layer.setAttribute('aria-hidden', 'true');
    var icons = AMBIENCE[key] || [m.icon];
    MOTES.forEach(function (pos, i) {
      var mote = h('span', 'stage-mote', icons[i % icons.length]);
      mote.style.left = pos[0] + '%';
      mote.style.top = pos[1] + '%';
      mote.style.fontSize = pos[2] + 'rem';
      mote.style.animationDelay = (-pos[3]) + 's';
      mote.style.animationDuration = (7.5 + (i % 5) * 1.7) + 's';
      layer.appendChild(mote);
    });
    layer.appendChild(h('span', 'stage-fog'));
    stage.insertBefore(layer, stage.firstChild);
  }

  function beginCountdown(stage) {
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = 0; }
    var overlay = h('div', 'stage-countdown');
    overlay.innerHTML = '<span>3</span><small>Get ready</small>';
    stage.appendChild(overlay);
    state.countingDown = true;
    if (window.SpookyGames && window.SpookyGames.pauseAll) window.SpookyGames.pauseAll();
    var number = 3;
    var label = overlay.querySelector('span');
    state.countdownTimer = setInterval(function () {
      number--;
      if (number > 0) {
        label.textContent = number;
        overlay.classList.remove('tick');
        void overlay.offsetWidth;
        overlay.classList.add('tick');
      } else if (number === 0) {
        label.textContent = 'GO';
        overlay.classList.add('go');
      } else {
        clearInterval(state.countdownTimer);
        state.countdownTimer = 0;
        state.countingDown = false;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (window.SpookyGames && window.SpookyGames.resumeAll) window.SpookyGames.resumeAll();
      }
    }, 560);
  }

  function startGame() {
    if (!state.game) return;
    var game = state.game;
    var m = metaFor(game);
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = 0; }
    state.countingDown = false;
    roomRefs.main.innerHTML = '';
    var stage = h('div', 'room-stage');
    stage.style.setProperty('--accent', m.accent);
    stage.dataset.game = game.key;
    stage.dataset.icon = m.icon;
    var surface = h('div', 'room-game');
    stage.appendChild(surface);
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
      game.build(surface, roomProfile());
      addStageAtmosphere(stage, game.key, m);
      beginCountdown(stage);
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
      if (roomRefs && roomRefs.score) {
        var chip = roomRefs.score.closest ? roomRefs.score.closest('.room-score-chip') : null;
        if (chip) {
          chip.classList.remove('bump');
          void chip.offsetWidth;
          chip.classList.add('bump');
        }
      }
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
    if (!state.playing || state.countingDown) return;
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
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = 0; }
    state.countingDown = false;
    if (window.SpookyGames && window.SpookyGames.resumeAll) window.SpookyGames.resumeAll();
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

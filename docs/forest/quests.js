/* ==========================================================================
 *  ENDLESS SPOOKY FOREST — quests.js
 *  A gentle lantern-road of objectives that teaches the forest's systems.
 *  Quests auto-complete from live game state, grant small rewards and keep
 *  a persistent record for the journal.
 * ========================================================================== */
(function (root) {
  'use strict';

  var SF = root.SpookyForest = root.SpookyForest || {};
  var U = SF.Util;

  function countVisited(g) {
    return g.stats && g.stats.visited ? Object.keys(g.stats.visited).length : 0;
  }

  var QUESTS = [
    {
      id: 'first-light', icon: '🔥', title: 'The First Hearth',
      hint: 'Follow the warm glow and light a campfire with wood.',
      goal: 1, progress: function (g) { return g.campfires ? g.campfires.totalLit : 0; },
      reward: { wood: 3 }, rewardText: '3 wood'
    },
    {
      id: 'carrot-puller', icon: '🥕', title: 'Pulled From the Earth',
      hint: 'Find a wild carrot patch and pull three ripe roots.',
      goal: 3, progress: function (g) { return g.carrots ? g.carrots.totalHarvested : 0; },
      reward: { seeds: 2, carrots: 1 }, rewardText: '2 seeds + 1 carrot'
    },
    {
      id: 'nervous-hello', icon: '🐇', title: 'A Nervous Hello',
      hint: 'Approach a rabbit slowly. It will decide whether to stay.',
      goal: 1, progress: function (g) { return g.rabbits ? g.rabbits.met : 0; },
      reward: { carrots: 2 }, rewardText: '2 carrots'
    },
    {
      id: 'warren-bond', icon: '💛', title: 'Friend of the Warren',
      hint: 'Feed or pet a rabbit until it trusts you completely.',
      goal: 1, progress: function (g) { return g.rabbits ? g.rabbits.tamedCount : 0; },
      reward: { marshmallows: 1 }, rewardText: '1 marshmallow'
    },
    {
      id: 'line-in-water', icon: '🎣', title: 'The Line in the Water',
      hint: 'Find a misty pond, cast a line and land a fish.',
      goal: 1, progress: function (g) { return g.fishing ? g.fishing.totalCaught : 0; },
      reward: { wood: 2, fish: 1 }, rewardText: '2 wood + 1 fish'
    },
    {
      id: 'hot-meal', icon: '🍲', title: 'A Hot Meal',
      hint: 'Cook a carrot or a fish over a lit campfire.',
      goal: 1, progress: function (g) { return g.campfires ? g.campfires.totalCooked : 0; },
      reward: { cooked: 1 }, rewardText: '1 roasted carrot'
    },
    {
      id: 'jack-o', icon: '🎃', title: 'A Face in the Dark',
      hint: 'Carve one of the wild pumpkins into a jack-o’-lantern.',
      goal: 1, progress: function (g) { return g.pumpkins ? g.pumpkins.carvedCount : 0; },
      reward: { seeds: 2, wood: 1 }, rewardText: '2 seeds + 1 wood'
    },
    {
      id: 'five-weathers', icon: '🌍', title: 'Five Weathers',
      hint: 'Walk through all five forest biomes.',
      goal: 5, progress: countVisited,
      reward: { seeds: 3, marshmallows: 1 }, rewardText: '3 seeds + 1 marshmallow'
    },
    {
      id: 'story-circle', icon: '📖', title: 'Around the Fire',
      hint: 'Sit beside a campfire and listen to three stories.',
      goal: 3, progress: function (g) { return g.stats ? g.stats.stories : 0; },
      reward: { wood: 3 }, rewardText: '3 wood'
    },
    {
      id: 'owl-whisper', icon: '🦉', title: 'The Owl’s Whisper',
      hint: 'Find a perched owl after dark and listen to what it says.',
      goal: 1, progress: function (g) { return g.critters ? g.critters.owlsListened : 0; },
      reward: { marshmallows: 1, seeds: 1 }, rewardText: '1 marshmallow + 1 seed'
    },
    {
      id: 'sky-isle', icon: '☁️', title: 'Above the Canopy',
      hint: 'Fly high enough to see the floating spirit isles from above.',
      goal: 35, progress: function (g) { return g.player ? Math.max(0, g.player.position[1]) : 0; },
      reward: { seeds: 2, carrots: 2 }, rewardText: '2 seeds + 2 carrots'
    },
    {
      id: 'moon-witness', icon: '🌕', title: 'When the Moon Turns',
      hint: 'Witness a blood moon and survive until dawn.',
      goal: 1, progress: function (g) { return g.stats ? g.stats.bloodMoons : 0; },
      reward: { moonCarrots: 1, marshmallows: 2 }, rewardText: '1 moon carrot + 2 marshmallows', final: true
    }
  ];

  var QUEST_BY_ID = {};
  for (var qi = 0; qi < QUESTS.length; qi++) QUEST_BY_ID[QUESTS[qi].id] = QUESTS[qi];

  function Quests(opts) {
    opts = opts || {};
    this.onEvent = opts.onEvent || function () {};
    this.completed = {};
    this.completedOrder = [];
    this.clock = 1.2;
    this.lastCompleted = null;
  }

  Quests.prototype.reset = function () {
    this.completed = {};
    this.completedOrder = [];
    this.clock = 1.2;
    this.lastCompleted = null;
  };

  Quests.prototype.list = function () { return QUESTS; };

  Quests.prototype.progressOf = function (quest, game) {
    var n = 0;
    try { n = quest.progress(game) || 0; } catch (e) { n = 0; }
    return U.clamp(n / quest.goal, 0, 1);
  };

  Quests.prototype.valueOf = function (quest, game) {
    try { return quest.progress(game) || 0; } catch (e) { return 0; }
  };

  Quests.prototype.active = function (game) {
    for (var i = 0; i < QUESTS.length; i++) {
      if (!this.completed[QUESTS[i].id]) return QUESTS[i];
    }
    return null;
  };

  Quests.prototype.completedCount = function () {
    var n = 0;
    for (var i = 0; i < QUESTS.length; i++) if (this.completed[QUESTS[i].id]) n++;
    return n;
  };

  Quests.prototype.update = function (game, dt) {
    this.clock -= (dt || 0);
    if (this.clock > 0) return null;
    this.clock = 0.65;
    for (var i = 0; i < QUESTS.length; i++) {
      var q = QUESTS[i];
      if (this.completed[q.id]) continue;
      if (this.valueOf(q, game) + 0.0001 >= q.goal) {
        this.completed[q.id] = Date.now();
        this.completedOrder.push(q.id);
        this.lastCompleted = q;
        this._grant(game, q.reward);
        U.Audio.chime();
        this.onEvent('quest:complete', q);
        return q;
      }
    }
    return null;
  };

  Quests.prototype._grant = function (g, reward) {
    if (!reward) return;
    if (reward.wood && g.player) g.player.wood += reward.wood;
    if (reward.marshmallows && g.player) g.player.marshmallows += reward.marshmallows;
    if (reward.carrots && g.carrots) g.carrots.count += reward.carrots;
    if (reward.seeds && g.carrots) g.carrots.seeds += reward.seeds;
    if (reward.cooked && g.carrots) g.carrots.roasted += reward.cooked;
    if (reward.fish && g.fishing) g.fishing.fish += reward.fish;
    if (reward.moonCarrots && g.carrots) g.carrots.count += reward.moonCarrots;
  };

  Quests.prototype.serialize = function () {
    return { completed: this.completed, completedOrder: this.completedOrder };
  };

  Quests.prototype.load = function (data) {
    if (!data) return;
    this.completed = data.completed || {};
    this.completedOrder = data.completedOrder || [];
  };

  Quests.QUESTS = QUESTS;
  Quests.QUEST_BY_ID = QUEST_BY_ID;
  SF.Quests = Quests;
})(typeof window !== 'undefined' ? window : globalThis);

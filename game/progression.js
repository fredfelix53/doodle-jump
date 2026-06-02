/* ===== Doodle Jump — Full Progression System ===== */
(function() {
  'use strict';

  const SAVE_KEY = 'doodle_progress';

  const UPGRADE_TIERS = {
    weapon: {
      name: 'Spring',
      icon: '🪷',
      maxLevel: 5,
      levels: [
        { level: 0, name: 'Basic Spring',    bonus: { bounceMult: 1.0, scoreBonus: 0 },   coinsReq: 0 },
        { level: 1, name: 'Trampoline',       bonus: { bounceMult: 1.15, scoreBonus: 5 },  coinsReq: 800 },
        { level: 2, name: 'Power Spring',     bonus: { bounceMult: 1.3, scoreBonus: 12 },  coinsReq: 2000 },
        { level: 3, name: 'Rocket Boost',     bonus: { bounceMult: 1.5, scoreBonus: 25 },  coinsReq: 4000 },
        { level: 4, name: 'Jet Pack',         bonus: { bounceMult: 1.7, scoreBonus: 50 },  coinsReq: 8000 },
        { level: 5, name: '🚀 Moon Hopper',  bonus: { bounceMult: 2.0, scoreBonus: 100 }, coinsReq: 20000 },
      ]
    },
    case: {
      name: 'Hat',
      icon: '🎩',
      maxLevel: 5,
      levels: [
        { level: 0, name: 'Paper Hat',        bonus: { platformBonus: 0, magnetRange: 0 },   coinsReq: 0 },
        { level: 1, name: 'Beanie',           bonus: { platformBonus: 5, magnetRange: 20 },  coinsReq: 600 },
        { level: 2, name: 'Cap',              bonus: { platformBonus: 10, magnetRange: 30 }, coinsReq: 1500 },
        { level: 3, name: 'Top Hat',          bonus: { platformBonus: 20, magnetRange: 40 }, coinsReq: 3000 },
        { level: 4, name: 'Crown',            bonus: { platformBonus: 35, magnetRange: 50 }, coinsReq: 6000 },
        { level: 5, name: '👑 Royal Crown',  bonus: { platformBonus: 60, magnetRange: 70 }, coinsReq: 15000 },
      ]
    },
    outfit: {
      name: 'Cape',
      icon: '🧥',
      maxLevel: 5,
      levels: [
        { level: 0, name: 'Torn Cape',        bonus: { shieldPct: 0, extraLife: 0 },       coinsReq: 0 },
        { level: 1, name: 'Cloth Cape',       bonus: { shieldPct: 10, extraLife: 0 },      coinsReq: 700 },
        { level: 2, name: 'Leather Cape',     bonus: { shieldPct: 20, extraLife: 1 },      coinsReq: 1800 },
        { level: 3, name: 'Silk Cape',        bonus: { shieldPct: 30, extraLife: 1 },      coinsReq: 3500 },
        { level: 4, name: 'Mystic Cape',      bonus: { shieldPct: 45, extraLife: 2 },      coinsReq: 7000 },
        { level: 5, name: '✨ Phoenix Wings', bonus: { shieldPct: 60, extraLife: 3 },      coinsReq: 18000 },
      ]
    }
  };

  const SHOP_CATALOG = {
    themes: [
      { id: 'jungle',  name: 'Jungle',  price: 0,    colors: { bg: '#1a3a2a', plat: '#2d5a1e', sky: '#87CEEB' } },
      { id: 'space',   name: 'Space',   price: 600,  colors: { bg: '#0a0a2e', plat: '#4a4a8a', sky: '#1a1a4e' } },
      { id: 'ocean',   name: 'Ocean',   price: 800,  colors: { bg: '#023047', plat: '#0a6a8e', sky: '#4aB0D0' } },
      { id: 'candy',   name: 'Candy',   price: 1200, colors: { bg: '#2a1a3a', plat: '#ff6b9d', sky: '#ffb3d9' } },
      { id: 'sakura',  name: 'Sakura',  price: 2000, colors: { bg: '#2a0a1a', plat: '#ff8fa3', sky: '#ffe0e6' } },
      { id: 'neon',    name: 'Neon',    price: 3000, colors: { bg: '#0a0020', plat: '#00ff88', sky: '#1a0050' } },
    ],
    skins: [
      { id: 'default',  name: 'Doodle Dude', price: 0,    color: '#ff6b6b' },
      { id: 'ninja',    name: 'Ninja',       price: 500,  color: '#2d2d2d' },
      { id: 'robot',    name: 'Robot',       price: 800,  color: '#4a90d9' },
      { id: 'alien',    name: 'Alien',       price: 1000, color: '#6bff6b' },
      { id: 'ghost',    name: 'Ghost',       price: 1500, color: '#e0e0ff' },
      { id: 'dragon',   name: 'Dragon',      price: 2500, color: '#ff4500' },
      { id: 'unicorn',  name: 'Unicorn',     price: 4000, color: '#ff69b4' },
    ]
  };

  const ACHIEVEMENTS = [
    { id: 'first_jump',    name: 'First Leap',        desc: 'Play your first game',             reward: { coins: 50 },  check: p => p.totalPlays >= 1, icon: '🦘' },
    { id: 'height_100',    name: '100 Feet',          desc: 'Reach height 100',                 reward: { coins: 100 }, check: p => p.bestHeight >= 100, icon: '📏' },
    { id: 'height_500',    name: 'Skyscraper',        desc: 'Reach height 500',                 reward: { coins: 300 }, check: p => p.bestHeight >= 500, icon: '🏢' },
    { id: 'height_1000',   name: 'Cloud Walker',      desc: 'Reach height 1000',                reward: { coins: 600 }, check: p => p.bestHeight >= 1000, icon: '☁️' },
    { id: 'height_2000',   name: 'Space Explorer',    desc: 'Reach height 2000',                reward: { coins: 1200, gems: 10 }, check: p => p.bestHeight >= 2000, icon: '🚀' },
    { id: 'height_5000',   name: 'Moon Jumper',       desc: 'Reach height 5000',                reward: { coins: 3000, gems: 25 }, check: p => p.bestHeight >= 5000, icon: '🌙' },
    { id: 'spring_100',    name: 'Spring Lover',      desc: 'Use 100 springs',                  reward: { coins: 200 }, check: p => p.totalSprings >= 100, icon: '🪷' },
    { id: 'monster_10',    name: 'Monster Hunter',    desc: 'Dodge 10 monsters',                reward: { coins: 300 }, check: p => p.monstersDodged >= 10, icon: '👾' },
    { id: 'monster_50',    name: 'Ghost Runner',      desc: 'Dodge 50 monsters',                reward: { coins: 1000, gems: 10 }, check: p => p.monstersDodged >= 50, icon: '👻' },
    { id: 'combo_5',       name: 'Platform Streak',   desc: 'Land 5 platforms in a row',        reward: { coins: 200 }, check: p => p.bestCombo >= 5, icon: '5️⃣' },
    { id: 'combo_20',      name: 'Platform Master',   desc: 'Land 20 platforms in a row',       reward: { coins: 800, gems: 10 }, check: p => p.bestCombo >= 20, icon: '💪' },
    { id: 'combo_50',      name: 'Untouchable',       desc: 'Land 50 platforms in a row',       reward: { coins: 2000, gems: 20 }, check: p => p.bestCombo >= 50, icon: '🏆' },
    { id: 'weapon_1',      name: 'Spring Upgrade',    desc: 'Upgrade spring to Lv.1',           reward: { coins: 200 }, check: p => (p.upgrades?.weapon || 0) >= 1, icon: '🔧' },
    { id: 'weapon_3',      name: 'Power Bounce',      desc: 'Upgrade spring to Lv.3',           reward: { coins: 500, gems: 5 }, check: p => (p.upgrades?.weapon || 0) >= 3, icon: '⚡' },
    { id: 'weapon_5',      name: 'Gravity Breaker',   desc: 'Max out spring',                   reward: { coins: 2000, gems: 25 }, icon: '🚀', check: p => (p.upgrades?.weapon || 0) >= 5 },
    { id: 'case_1',        name: 'Hat Collector',     desc: 'Upgrade hat to Lv.1',              reward: { coins: 200 }, check: p => (p.upgrades?.case || 0) >= 1, icon: '🎩' },
    { id: 'case_3',        name: 'Fashionable',       desc: 'Upgrade hat to Lv.3',              reward: { coins: 500, gems: 5 }, check: p => (p.upgrades?.case || 0) >= 3, icon: '👒' },
    { id: 'case_5',        name: 'Royal Style',       desc: 'Max out hat',                      reward: { coins: 2000, gems: 25 }, icon: '👑', check: p => (p.upgrades?.case || 0) >= 5 },
    { id: 'outfit_1',      name: 'Cape Initiate',     desc: 'Upgrade cape to Lv.1',             reward: { coins: 200 }, check: p => (p.upgrades?.outfit || 0) >= 1, icon: '🧥' },
    { id: 'outfit_3',      name: 'Wind Rider',        desc: 'Upgrade cape to Lv.3',             reward: { coins: 500, gems: 5 }, check: p => (p.upgrades?.outfit || 0) >= 3, icon: '🌪️' },
    { id: 'outfit_5',      name: 'Sky Legend',        desc: 'Max out cape',                     reward: { coins: 2000, gems: 25 }, icon: '✨', check: p => (p.upgrades?.outfit || 0) >= 5 },
  ];

  function defaultState() {
    return {
      coins: 150, gems: 0, totalGems: 0, xp: 0, level: 1,
      bestHeight: 0, bestCombo: 0, totalPlays: 0,
      totalSprings: 0, monstersDodged: 0,
      upgrades: { weapon: 0, case: 0, outfit: 0 },
      ownedThemes: ['jungle'], activeTheme: 'jungle',
      ownedSkins: ['default'], activeSkin: 'default',
      achievements: {}, lastSaveDate: null, inventory: {}, adFree: false,
    };
  }

  let state = null;

  function save() {
    state.lastSaveDate = new Date().toISOString();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        state = { ...defaultState(), ...JSON.parse(raw) };
        if (!state.upgrades) state.upgrades = { weapon: 0, case: 0, outfit: 0 };
        if (!state.inventory) state.inventory = {};
        if (!state.ownedSkins) state.ownedSkins = ['default'];
        save();
        if (state.adFree && window.AdsManager) window.AdsManager.onAdsRemoved();
        return true;
      }
    } catch(e) {}
    reset();
    return false;
  }

  function reset() { state = defaultState(); save(); }

  function xpForLevel(lvl) { return Math.floor(80 * Math.pow(1.2, lvl - 1)); }

  function addXp(amount) {
    if (!state) return false;
    state.xp += amount;
    let leveled = false;
    while (state.xp >= xpForLevel(state.level)) {
      state.xp -= xpForLevel(state.level);
      state.level++;
      leveled = true;
    }
    save();
    return leveled;
  }

  function addCoins(amount) { if (!state) return 0; state.coins += amount; save(); return state.coins; }
  function spendCoins(amount) { if (!state || state.coins < amount) return false; state.coins -= amount; save(); return true; }
  function addGems(amount) { if (!state) return 0; state.gems += amount; state.totalGems += amount; save(); return state.gems; }
  function spendGems(amount) { if (!state || state.gems < amount) return false; state.gems -= amount; save(); return true; }

  function getUpgradeCost(category, currentLevel) {
    const tier = UPGRADE_TIERS[category];
    if (!tier) return null;
    const next = currentLevel + 1;
    const data = tier.levels.find(l => l.level === next);
    if (!data) return null;
    return { coins: data.coinsReq };
  }

  function upgradeItem(category) {
    if (!state) return { success: false, reason: 'no_state' };
    const tier = UPGRADE_TIERS[category];
    if (!tier) return { success: false, reason: 'invalid' };
    const current = state.upgrades[category] || 0;
    if (current >= tier.maxLevel) return { success: false, reason: 'max' };
    const costs = getUpgradeCost(category, current);
    if (!costs) return { success: false, reason: 'no_data' };
    if (state.coins < costs.coins) return { success: false, reason: 'coins' };
    state.coins -= costs.coins;
    state.upgrades[category]++;
    save();
    return { success: true, newLevel: state.upgrades[category] };
  }

  function getActiveBonuses() {
    if (!state) return { bounceMult: 1, scoreBonus: 0, platformBonus: 0, magnetRange: 0, shieldPct: 0, extraLife: 0 };
    const b = { bounceMult: 1, scoreBonus: 0, platformBonus: 0, magnetRange: 0, shieldPct: 0, extraLife: 0 };
    const w = UPGRADE_TIERS.weapon.levels[state.upgrades.weapon || 0];
    if (w) { b.bounceMult = w.bonus.bounceMult; b.scoreBonus = w.bonus.scoreBonus; }
    const c = UPGRADE_TIERS.case.levels[state.upgrades.case || 0];
    if (c) { b.platformBonus = c.bonus.platformBonus; b.magnetRange = c.bonus.magnetRange; }
    const o = UPGRADE_TIERS.outfit.levels[state.upgrades.outfit || 0];
    if (o) { b.shieldPct = o.bonus.shieldPct; b.extraLife = o.bonus.extraLife; }
    return b;
  }

  function checkAchievements() {
    if (!state) return [];
    const unlocked = [];
    for (const ach of ACHIEVEMENTS) {
      if (state.achievements[ach.id]) continue;
      if (ach.check(state)) {
        state.achievements[ach.id] = true;
        addCoins(ach.reward.coins);
        if (ach.reward.gems) addGems(ach.reward.gems);
        unlocked.push(ach);
      }
    }
    if (unlocked.length > 0) save();
    return unlocked;
  }

  function endOfGame(result) {
    if (!state) return;
    state.totalPlays++;
    if (result.height > state.bestHeight) state.bestHeight = result.height;
    if (result.combo > state.bestCombo) state.bestCombo = result.combo;
    if (result.springs) state.totalSprings += result.springs;
    const xpGain = Math.floor(result.height / 5) + 10;
    addXp(xpGain);
    const coinGain = Math.floor(result.height / 10) + 3;
    addCoins(coinGain);
    save();
  }

  // ─── Remove Ads Purchase Integration ──────────────
  function purchaseRemoveAds() {
    if (!state) return false;
    state.adFree = true;
    state.coins -= 199;
    save();
    if (window.AdsManager) window.AdsManager.onAdsRemoved();
    return true;
  }

  window.DoodleProgression = {
    load, save, reset, addCoins, spendCoins, addGems, spendGems, addXp, xpForLevel,
    upgradeItem, getUpgradeCost, getActiveBonuses, UPGRADE_TIERS,
    SHOP_CATALOG, ACHIEVEMENTS, checkAchievements, endOfGame,
    purchaseRemoveAds, getState: () => state, defaultState,
  };
})();

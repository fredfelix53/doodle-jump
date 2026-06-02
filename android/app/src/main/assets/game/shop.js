/* ===== Doodle Jump — Shop & Upgrades ===== */
(function() {
  'use strict';

  let shopContainer = null;
  let activeTab = 'coins';

  function fmtPrice(p) { return '🪙 ' + p.toLocaleString(); }

  function createShopPanel() {
    if (shopContainer) { shopContainer.style.display = 'block'; showTab(activeTab); return; }
    shopContainer = document.createElement('div');
    shopContainer.id = 'shop-panel';
    shopContainer.innerHTML = `
      <div class="shop-overlay"></div>
      <div class="shop-window">
        <button class="shop-close">&times;</button>
        <h2 class="shop-title">🛒 Shop</h2>
        <div class="shop-balance-bar">
          <span class="balance-item"><span class="coin-icon">🪙</span> <span id="shop-coins">0</span></span>
          <span class="balance-item"><span class="gem-icon">💎</span> <span id="shop-gems">0</span></span>
        </div>
        <div class="shop-tabs">
          <button class="shop-tab" data-tab="coins">🪙 Shop</button>
          <button class="shop-tab" data-tab="upgrades">⚡ Upgrades</button>
          <button class="shop-tab" data-tab="skins">🎨 Skins</button>
        </div>
        <div class="shop-content" id="shop-content"></div>
      </div>`;
    document.body.appendChild(shopContainer);
    shopContainer.querySelector('.shop-close').addEventListener('click', closeShop);
    shopContainer.querySelector('.shop-overlay').addEventListener('click', closeShop);
    shopContainer.querySelectorAll('.shop-tab').forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tab)));
    showTab('upgrades');
    updateBalances();
  }

  function closeShop() { if (shopContainer) shopContainer.style.display = 'none'; }

  function showTab(tabId) {
    activeTab = tabId;
    if (!shopContainer) return;
    shopContainer.querySelectorAll('.shop-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    const content = shopContainer.querySelector('#shop-content');
    if (tabId === 'coins') renderThemeShop(content);
    else if (tabId === 'upgrades') renderUpgrades(content);
    else if (tabId === 'skins') renderSkinShop(content);
    updateBalances();
  }

  function updateBalances() {
    const c = shopContainer?.querySelector('#shop-coins');
    const g = shopContainer?.querySelector('#shop-gems');
    if (c && window.DoodleProgression) c.textContent = window.DoodleProgression.getState()?.coins || 0;
    if (g && window.DoodleProgression) g.textContent = window.DoodleProgression.getState()?.gems || 0;
  }

  function renderThemeShop(container) {
    const P = window.DoodleProgression;
    const state = P.getState();
    const cat = P.SHOP_CATALOG;
    let html = '<div class="shop-section"><h3>🎨 Background Themes</h3><div class="shop-grid">';
    for (const t of cat.themes) {
      const owned = state.ownedThemes.includes(t.id);
      const active = state.activeTheme === t.id;
      html += `<div class="shop-item ${owned ? 'owned' : ''} ${active ? 'active' : ''}" data-type="theme" data-id="${t.id}" data-price="${t.price}">
        <div class="item-preview theme-preview" style="background:linear-gradient(135deg,${t.colors.bg},${t.colors.sky})"></div>
        <div class="item-name">${t.name}</div>
        <div class="item-desc">${t.id === 'jungle' ? 'Default theme' : t.colors.sky}</div>
        ${owned ? (active ? '<span class="item-status">✓ Active</span>' : '<button class="btn-equip">Equip</button>') : `<button class="btn-buy">🪙 ${t.price}</button>`}
      </div>`;
    }
    html += '</div></div>';
    container.innerHTML = html;
    container.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', e => {
        const item = e.target.closest('.shop-item');
        const id = item.dataset.id; const price = parseInt(item.dataset.price);
        if (state.ownedThemes.includes(id)) { equipTheme(id); return; }
        if (!P.spendCoins(price)) { showNotification('Not enough coins!'); return; }
        state.ownedThemes.push(id); state.activeTheme = id; P.save();
        showNotification('Theme purchased! ✨');
        showTab('coins');
      });
    });
    container.querySelectorAll('.btn-equip').forEach(btn => {
      btn.addEventListener('click', e => equipTheme(e.target.closest('.shop-item').dataset.id));
    });
  }

  function equipTheme(id) {
    const P = window.DoodleProgression;
    const state = P.getState();
    if (!state.ownedThemes.includes(id)) return;
    state.activeTheme = id; P.save();
    showNotification('Theme applied! ✅');
    showTab('coins');
  }

  function renderSkinShop(container) {
    const P = window.DoodleProgression;
    const state = P.getState();
    const cat = P.SHOP_CATALOG;
    let html = '<div class="shop-section"><h3>🎭 Character Skins</h3><div class="shop-grid">';
    for (const s of cat.skins) {
      const owned = state.ownedSkins.includes(s.id);
      const active = state.activeSkin === s.id;
      html += `<div class="shop-item ${owned ? 'owned' : ''} ${active ? 'active' : ''}" data-type="skin" data-id="${s.id}" data-price="${s.price}">
        <div class="skin-preview" style="background:${s.color};width:48px;height:48px;border-radius:50%;margin:auto;"></div>
        <div class="item-name">${s.name}</div>
        ${owned ? (active ? '<span class="item-status">✓ Active</span>' : '<button class="btn-equip">Equip</button>') : `<button class="btn-buy">🪙 ${s.price}</button>`}
      </div>`;
    }
    html += '</div></div>';
    container.innerHTML = html;
    container.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', e => {
        const item = e.target.closest('.shop-item');
        const id = item.dataset.id; const price = parseInt(item.dataset.price);
        if (state.ownedSkins.includes(id)) { equipSkin(id); return; }
        if (!P.spendCoins(price)) { showNotification('Not enough coins!'); return; }
        state.ownedSkins.push(id); state.activeSkin = id; P.save();
        showNotification('Skin purchased! ✨');
        showTab('skins');
      });
    });
    container.querySelectorAll('.btn-equip').forEach(btn => {
      btn.addEventListener('click', e => equipSkin(e.target.closest('.shop-item').dataset.id));
    });
  }

  function equipSkin(id) {
    const P = window.DoodleProgression;
    const state = P.getState();
    if (!state.ownedSkins.includes(id)) return;
    state.activeSkin = id; P.save();
    showNotification('Skin equipped! ✅');
    showTab('skins');
  }

  function renderUpgrades(container) {
    const P = window.DoodleProgression;
    const state = P.getState();
    const bonuses = P.getActiveBonuses();
    let html = '<div class="shop-section"><h3>⚡ Upgrade Station</h3>';
    html += `<div class="bonus-summary">
      <span>🪷 Bounce: <strong>${bonuses.bounceMult.toFixed(2)}x</strong></span>
      <span>🛡️ Shield: <strong>${bonuses.shieldPct}%</strong></span>
      <span>❤️ Lives: <strong>${bonuses.extraLife + 1}</strong></span>
      <span>🎩 Plat Bonus: <strong>+${bonuses.platformBonus}</strong></span>
      <span>🧲 Range: <strong>${bonuses.magnetRange}</strong></span>
    </div>`;
    html += `<div class="upgrade-balance"><span>🪙 ${state.coins.toLocaleString()}</span><span>💎 ${state.gems}</span></div>`;

    for (const [cat, tier] of Object.entries(P.UPGRADE_TIERS)) {
      const currentLevel = state.upgrades[cat] || 0;
      const currentData = tier.levels[currentLevel];
      const nextData = tier.levels[currentLevel + 1];
      const maxed = currentLevel >= tier.maxLevel;
      html += `<div class="upgrade-card" data-cat="${cat}">
        <div class="upgrade-header"><span class="upgrade-icon">${tier.icon}</span><span class="upgrade-name">${tier.name}</span><span class="upgrade-level">Lv.${currentLevel} → ${currentLevel + 1}</span></div>
        <div class="upgrade-visual"><div class="upgrade-bar"><div class="upgrade-fill" style="width:${(currentLevel / tier.maxLevel) * 100}%"></div></div><div class="upgrade-dots">`;
      for (let i = 0; i <= tier.maxLevel; i++) html += `<span class="upgrade-dot ${i <= currentLevel ? 'filled' : ''}">${i}</span>`;
      html += `</div></div>`;
      if (currentData) html += `<div class="upgrade-current">Current: <strong>${currentData.name}</strong></div>`;
      if (nextData && !maxed) {
        html += `<div class="upgrade-next">Next: <strong>${nextData.name}</strong></div>`;
        html += `<button class="btn-upgrade" data-cat="${cat}">🪙 ${nextData.coinsReq.toLocaleString()}</button>`;
      }
      if (maxed) html += `<div class="upgrade-maxed">⭐ MAX LEVEL ⭐</div>`;
      html += `</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('.btn-upgrade').forEach(btn => {
      btn.addEventListener('click', e => {
        const card = e.target.closest('.upgrade-card');
        const cat = card.dataset.cat;
        const result = P.upgradeItem(cat);
        if (result.success) { showNotification(`⬆️ ${cat} Lv.${result.newLevel}!`); renderUpgrades(container); updateBalances(); }
        else showNotification('Not enough coins!');
      });
    });
  }

  function showNotification(msg) {
    const el = document.getElementById('notification') || (() => { const n = document.createElement('div'); n.id = 'notification'; document.body.appendChild(n); return n; })();
    el.textContent = msg; el.className = 'show';
    clearTimeout(el._timeout); el._timeout = setTimeout(() => el.className = '', 2500);
  }

  window.DoodleShop = { open: createShopPanel, close: closeShop, showTab, updateBalances };
})();

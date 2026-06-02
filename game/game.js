function showToast(msg) {
  var el = document.getElementById('system-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'system-toast';
    el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;border:1px solid rgba(255,255,255,0.1);';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(function() { el.style.opacity = '0'; }, 3000);
}

/* ===== Doodle Jump — Game Engine ===== */
(function() {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  let W, H, scale;
  let gameRunning = false;
  let gameOver = false;
  let score = 0;
  let heightReached = 0;
  let combo = 0;
  let bestComboRun = 0;
  let totalSprings = 0;
  let monstersDodged = 0;
  let frame = 0;

  // Player
  let player = {};
  // Platforms
  let platforms = [];
  // Monsters
  let monsters = [];
  // Particles
  let particles = [];
  // Floating texts
  let floatingTexts = [];

  const GRAVITY = 0.45;
  const JUMP_VEL = -11;
  const PLATFORM_SPACING = 75;
  const PLATFORM_WIDTH = 70;
  const PLATFORM_HEIGHT = 15;
  const PLAYER_SIZE = 30;
  const MONSTER_SIZE = 26;
  const CAMERA_LERP = 0.08;

  let cameraY = 0;
  let tiltX = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight - 48;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    scale = Math.min(W, 400) / 400;
  }

  function getActiveSkinColor() {
    try {
      const state = window.DoodleProgression?.getState();
      if (state?.activeSkin && window.DoodleProgression?.SHOP_CATALOG?.skins) {
        const skin = window.DoodleProgression.SHOP_CATALOG.skins.find(s => s.id === state.activeSkin);
        if (skin) return skin.color;
      }
    } catch(e) {}
    return '#ff6b6b';
  }

  function getActiveTheme() {
    try {
      const state = window.DoodleProgression?.getState();
      if (state?.activeTheme && window.DoodleProgression?.SHOP_CATALOG?.themes) {
        const theme = window.DoodleProgression.SHOP_CATALOG.themes.find(t => t.id === state.activeTheme);
        if (theme) return theme.colors;
      }
    } catch(e) {}
    return { bg: '#1a3a2a', plat: '#2d5a1e', sky: '#87CEEB' };
  }

  function resetGame() {
    score = 0;
    heightReached = 0;
    combo = 0;
    bestComboRun = 0;
    totalSprings = 0;
    monstersDodged = 0;
    gameOver = false;
    cameraY = 0;
    platforms = [];
    monsters = [];
    particles = [];
    floatingTexts = [];

    const bonuses = window.DoodleProgression?.getActiveBonuses() || {};
    const extraLives = bonuses.extraLife || 0;
    const lives = 1 + extraLives;

    player = {
      x: W / 2,
      y: H * 0.7,
      vy: 0,
      vx: 0,
      size: PLAYER_SIZE,
      lives: lives,
      invincible: 0,
      alive: true,
    };

    // Generate initial platforms
    for (let i = 0; i < 10; i++) {
      addPlatform(i * PLATFORM_SPACING);
    }

    updateHUD();
  }

  function addPlatform(yOffset) {
    const x = Math.random() * (W - PLATFORM_WIDTH - 20) + 10;
    const y = H + yOffset;
    const r = Math.random();
    let type = 'normal';
    if (r < 0.1) type = 'spring';
    else if (r < 0.2) type = 'breakable';
    else if (r < 0.27) type = 'moving';
    platforms.push({ x, y, w: PLATFORM_WIDTH, h: PLATFORM_HEIGHT, type, hit: false, dir: 1, speed: 0.8 + Math.random() * 0.5 });
  }

  function addCoin(x, y) {
    floatingTexts.push({ x, y, text: '+🪙 5', color: '#ffd700', life: 1, vy: -1.2 });
  }

  function spawnMonster(y) {
    const x = Math.random() * (W - MONSTER_SIZE - 20) + 10;
    monsters.push({ x, y, size: MONSTER_SIZE, dir: Math.random() > 0.5 ? 1 : -1, speed: 0.5 + Math.random() * 0.8 });
  }

  // ─── Tilt Controls ───────────────────────
  function setupControls() {
    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'a') tiltX = -1;
      if (e.key === 'ArrowRight' || e.key === 'd') tiltX = 1;
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') tiltX = 0;
    });

    // Touch
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const tx = touch.clientX - rect.left;
      tiltX = tx < W / 2 ? -1 : 1;
    });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const tx = touch.clientX - rect.left;
      tiltX = tx < W / 2 ? -1 : 1;
    });
    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      tiltX = 0;
    });

    // Device orientation
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', e => {
        if (e.gamma !== null) {
          tiltX = Math.max(-1, Math.min(1, e.gamma / 30));
        }
      });
    }
  }

  // ─── Update Logic ─────────────────────────
  function update() {
    if (!gameRunning || gameOver) return;
    frame++;

    const bonuses = window.DoodleProgression?.getActiveBonuses() || {};
    const bounceMult = bonuses.bounceMult || 1;
    const platformBonus = bonuses.platformBonus || 0;
    const shieldPct = bonuses.shieldPct || 0;

    // Player horizontal movement
    player.vx += tiltX * 0.4;
    player.vx *= 0.92;
    player.x += player.vx;

    // Wrap around
    if (player.x < -player.size) player.x = W + player.size;
    if (player.x > W + player.size) player.x = -player.size;

    // Gravity
    player.vy += GRAVITY;
    if (player.vy > 15) player.vy = 15;
    player.y += player.vy;

    // Invincibility countdown
    if (player.invincible > 0) player.invincible--;

    // Platform collision
    if (player.vy > 0) {
      for (const p of platforms) {
        if (p.hit && p.type !== 'breakable') continue;
        if (player.x + 10 < p.x || player.x - 10 > p.x + p.w) continue;
        if (player.y + player.size / 2 > p.y && player.y + player.size / 2 < p.y + p.h + 10) {
          if (p.type === 'breakable') {
            p.hit = true;
            if (window.DoodleVisuals) {
              window.DoodleVisuals.ParticleSystem.prototype.emitBreak.call({ particles }, p.x + p.w / 2, p.y);
            }
            continue;
          }
          player.vy = JUMP_VEL * bounceMult;
          combo++;
          if (combo > bestComboRun) bestComboRun = combo;
          if (combo >= 5) {
            const bonusScore = Math.floor(combo / 5) * 10;
            score += bonusScore;
            floatingTexts.push({ x: player.x, y: player.y - 20, text: `🔥 ${bonusScore}`, color: '#ffd700', life: 1, vy: -1 });
          }
          score += 1 + platformBonus;
          p.hit = true;

          // Spring bounce harder
          if (p.type === 'spring') {
            player.vy = JUMP_VEL * bounceMult * 1.6;
            totalSprings++;
            if (window.DoodleVisuals) {
              window.DoodleVisuals.ParticleSystem.prototype.emitSpring.call({ particles }, p.x + p.w / 2, p.y);
            }
            floatingTexts.push({ x: p.x + p.w / 2, y: p.y - 15, text: '🚀 BOING!', color: '#00ff88', life: 0.8, vy: -1.5 });
          }
        }
      }
    }

    // Monster collision
    for (const m of monsters) {
      const dx = player.x - m.x;
      const dy = player.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < (player.size / 2 + m.size / 2)) {
        if (player.vy > 0 && player.y < m.y + 5) {
          // Jump on monster
          player.vy = JUMP_VEL * bounceMult * 0.8;
          monstersDodged++;
          m.remove = true;
          score += 5;
          floatingTexts.push({ x: m.x, y: m.y - 15, text: '💥 +5', color: '#ff6b6b', life: 0.8, vy: -1 });
          particles = particles.concat(
            Array.from({ length: 12 }, (_, i) => ({
              x: m.x, y: m.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
              life: 1, color: '#ff4444', size: 3 + Math.random() * 3,
              update() { this.x += this.vx; this.y += this.vy; this.life -= 0.04; return this.life > 0; },
              draw(c) { c.save(); c.globalAlpha = this.life; c.fillStyle = this.color; c.beginPath(); c.arc(this.x, this.y, this.size, 0, Math.PI * 2); c.fill(); c.restore(); }
            }))
          );
        } else if (player.invincible <= 0) {
          // Shield check
          if (Math.random() * 100 < shieldPct) {
            player.invincible = 60;
            floatingTexts.push({ x: player.x, y: player.y - 25, text: '🛡️ Shield!', color: '#00ff88', life: 0.8, vy: -1 });
          } else {
            player.lives--;
            player.invincible = 90;
            if (player.lives <= 0) {
              player.alive = false;
              endGame();
              return;
            }
            floatingTexts.push({ x: player.x, y: player.y - 25, text: `❤️ ${player.lives} lives`, color: '#ff6b6b', life: 0.8, vy: -1 });
          }
        }
      }
    }

    // Camera follow
    const targetCam = player.y - H * 0.35;
    cameraY += (targetCam - cameraY) * CAMERA_LERP;

    // Height tracking
    const playerHeight = H - player.y + cameraY;
    if (playerHeight > heightReached) heightReached = playerHeight;
    score = Math.floor(heightReached);

    // Remove passed platforms & monsters
    platforms = platforms.filter(p => p.y - cameraY > -50);
    monsters = monsters.filter(m => !m.remove && m.y - cameraY > -50);

    // Generate new platforms ahead
    const maxYPlatform = Math.max(...platforms.map(p => p.y), H + cameraY);
    while (maxYPlatform - cameraY < H + 100) {
      addPlatform((platforms.length) * PLATFORM_SPACING * 0.6);
    }

    // Generate new monsters
    if (frame % 120 === 0 && Math.random() < 0.4 && heightReached > 200) {
      spawnMonster(H + cameraY - 30);
    }

    // Move moving platforms
    for (const p of platforms) {
      if (p.type === 'moving') {
        p.x += p.dir * p.speed;
        if (p.x < 0 || p.x > W - p.w) p.dir *= -1;
      }
    }

    // Move monsters
    for (const m of monsters) {
      m.x += m.dir * m.speed;
      if (m.x < 0 || m.x > W - m.size) m.dir *= -1;
    }

    // Update particles
    particles = particles.filter(p => {
      p.x += p.vx || 0;
      p.y += p.vy || 0;
      if (p.gravity) p.vy += p.gravity;
      p.life -= p.decay || 0.02;
      return p.life > 0;
    });

    // Update floating texts
    floatingTexts = floatingTexts.filter(t => {
      t.y += t.vy;
      t.vy *= 0.97;
      t.life -= 0.02;
      return t.life > 0;
    });

    // Bound player below screen = game over
    if (player.y - cameraY > H + 100) {
      endGame();
    }

    updateHUD();
  }

  // ─── Draw ─────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);

    const theme = getActiveTheme();

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, theme.sky || '#87CEEB');
    bgGrad.addColorStop(0.3, theme.sky || '#87CEEB');
    bgGrad.addColorStop(1, theme.bg || '#1a3a2a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Clouds / background elements
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 5; i++) {
      const cx = (i * 137 + frame * 0.2) % (W + 100) - 50;
      const cy = (i * 89 + frame * 0.1) % (H * 0.4) + 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 30 + i * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(0, -cameraY);

    // Draw platforms
    for (const p of platforms) {
      if (p.y - cameraY < -30 || p.y - cameraY > H + 30) continue;
      if (p.hit && p.type === 'breakable') continue;

      if (window.DoodleVisuals) {
        window.DoodleVisuals.drawPlatform(ctx, p.x, p.y, p.w, p.h, p.type);
      } else {
        ctx.fillStyle = p.type === 'spring' ? '#00ff88' : p.type === 'breakable' ? '#ff6b6b' : '#4a9eff';
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    }

    // Draw monsters
    for (const m of monsters) {
      if (m.y - cameraY < -30 || m.y - cameraY > H + 30) continue;
      ctx.save();
      ctx.fillStyle = '#8B0000';
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(m.x + m.size / 2, m.y + m.size / 2, m.size / 2, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(m.x + m.size * 0.3, m.y + m.size * 0.35, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x + m.size * 0.7, m.y + m.size * 0.35, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(m.x + m.size * 0.3, m.y + m.size * 0.35, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x + m.size * 0.7, m.y + m.size * 0.35, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Draw player
    if (player.alive) {
      const skinColor = getActiveSkinColor();
      const alpha = player.invincible > 0 && Math.floor(player.invincible / 6) % 2 === 0 ? 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (window.DoodleVisuals) {
        window.DoodleVisuals.drawCharacter(ctx, player.x, player.y, player.size, skinColor, player.vx * 0.5);
      } else {
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(player.x, player.y - player.size * 0.2, player.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(player.x - player.size * 0.25, player.y + player.size * 0.05, player.size * 0.5, player.size * 0.5);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(player.x - 4, player.y - player.size * 0.25, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(player.x + 4, player.y - player.size * 0.25, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(player.x - 4, player.y - player.size * 0.25, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(player.x + 4, player.y - player.size * 0.25, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // Draw particles
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw floating texts
    for (const t of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.life);
      ctx.fillStyle = t.color || '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    ctx.restore(); // end camera transform

    // Lives display
    if (player.lives > 1) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('❤️'.repeat(player.lives), 10, H - 10);
    }
  }

  function updateHUD() {
    const scoreEl = document.getElementById('score-display');
    if (scoreEl) scoreEl.textContent = Math.max(0, Math.floor(score));

    try {
      const state = window.DoodleProgression?.getState();
      if (state) {
        const coinsEl = document.getElementById('hud-coins');
        const gemsEl = document.getElementById('hud-gems');
        const lvlEl = document.getElementById('hud-level');
        if (coinsEl) coinsEl.textContent = state.coins;
        if (gemsEl) gemsEl.textContent = state.gems;
        if (lvlEl) lvlEl.textContent = state.level;
      }
    } catch(e) {}
  }

  function endGame() {
    gameOver = true;
    gameRunning = false;
    player.alive = false;

    // Death particles
    if (window.DoodleVisuals) {
      window.DoodleVisuals.ParticleSystem.prototype.emitDeath.call({ particles }, player.x, player.y, getActiveSkinColor());
    }

    try {
      window.DoodleProgression?.endOfGame({
        height: Math.floor(heightReached),
        combo: bestComboRun,
        springs: totalSprings,
      });
      const unlocked = window.DoodleProgression?.checkAchievements() || [];

  // ─── Framework Module Hooks ───────────────────
  if (window.RetentionSystem) {
    RetentionSystem.onGameEnd(score);
    RetentionSystem.submitScore('Player', score);
  }
  if (window.ChallengesSystem) {
    ChallengesSystem.reportProgress('score', score);
    ChallengesSystem.reportProgress('games', 1);
  }
  if (window.CollectiblesSystem) {
    CollectiblesSystem.incrementTracker('totalGames');
    CollectiblesSystem.setTracker('highestScore', score);
    CollectiblesSystem.checkUnlocks();
  }
  if (window.AdsManager) {
    setTimeout(function() { AdsManager.tryShowInterstitial(); }, 2000);
  }
  // ─── End Framework Hooks ─────────────────────
      if (unlocked.length > 0) {
        setTimeout(() => {
          showAchievements(unlocked);
        }, 500);
      }
    } catch(e) {}

    // Framework game-over hooks
    window.RetentionSystem?.onGameEnd(Math.floor(score));
    window.ChallengesSystem?.reportProgress('score', Math.floor(heightReached));
    window.ChallengesSystem?.reportProgress('games', 1);
    window.CollectiblesSystem?.incrementTracker('totalGames', 1);
    window.CollectiblesSystem?.setTracker('highestScore', Math.floor(heightReached));
    window.AdsManager?.tryShowInterstitial();

    document.getElementById('final-score').textContent = Math.floor(heightReached);
    document.getElementById('go-height').textContent = Math.floor(heightReached);
    document.getElementById('go-combo').textContent = Math.max(0, bestComboRun);
    document.getElementById('go-score').textContent = Math.floor(score);
    document.getElementById('game-over-overlay').classList.add('show');
  }

  function showAchievements(achievements) {
    let msg = '🏆 Achievements Unlocked!\n';
    for (const a of achievements) {
      msg += `\n${a.icon} ${a.name}: ${a.reward.coins} coins`;
      if (a.reward.gems) msg += ` + ${a.reward.gems} gems`;
    }
    const el = document.getElementById('notification');
    if (el) {
      el.textContent = msg;
      el.className = 'show';
      clearTimeout(el._timeout);
      el._timeout = setTimeout(() => el.className = '', 4000);
    }
  }

  function gameLoop() {
    if (!gameRunning && !gameOver) {
      // Draw idle background
      ctx.clearRect(0, 0, W, H);
      const theme = getActiveTheme();
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, theme.sky || '#87CEEB');
      bgGrad.addColorStop(1, theme.bg || '#1a3a2a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
    } else {
      update();
      draw();
    }
    requestAnimationFrame(gameLoop);
  }

  function startGame() {
    document.getElementById('game-over-overlay').classList.remove('show');
    resetGame();
    gameRunning = true;
  }

  // ─── Init ─────────────────────────────────
  function init() {
    const P = window.DoodleProgression;


  // ─── Framework Modules Init ───────────────────
  if (window.StoreRotator) StoreRotator.init();
  if (window.RetentionSystem) RetentionSystem.init();
  if (window.AdsManager) AdsManager.init();
  if (window.ChallengesSystem) ChallengesSystem.init();
  if (window.CollectiblesSystem) CollectiblesSystem.init();
  if (window.TutorialSystem) {
    TutorialSystem.init({ gameTitle: 'Game' });
    if (TutorialSystem.shouldShow()) {
      setTimeout(() => TutorialSystem.start(function() {
        if (window.showToast) showToast('Tutorial complete! Good luck!');
      }), 500);
    }
  }
  // ─── End Framework Init ───────────────────────
    if (P) P.load();

    // Init framework modules
    window.AdsManager?.init({});
    window.ChallengesSystem?.init({});
    window.StoreRotator?.init({});
    window.RetentionSystem?.init({});
    window.CollectiblesSystem?.init({});
    window.TutorialSystem?.init({});

    resize();
    window.addEventListener('resize', resize);

    setupControls();

    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn2').addEventListener('click', startGame);
    document.getElementById('button-shop').addEventListener('click', () => {
      if (window.DoodleShop) window.DoodleShop.open();
      else if (window.ShopUI) window.ShopUI.open();
    });

    resetGame();

    // Update HUD on interval for balance changes
    setInterval(updateHUD, 1000);

    gameLoop();
  }

  document.addEventListener('DOMContentLoaded', init);
  window.startGame = startGame;
})();

/* ===== Doodle Jump — Visuals ===== */
(function() {
  'use strict';

  class Particle {
    constructor(x, y, color, type = 'sparkle') {
      this.x = x; this.y = y; this.color = color; this.type = type;
      this.life = 1.0; this.decay = 0.02 + Math.random() * 0.03;
      this.size = type === 'confetti' ? 4 + Math.random() * 4 : 2 + Math.random() * 3;
      this.vx = (Math.random() - 0.5) * 6;
      this.vy = (Math.random() - 0.5) * 6 - 2;
      this.gravity = 0.08 + Math.random() * 0.05;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.2;
      this.shape = type === 'confetti' ? 'rect' : 'circle';
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += this.gravity; this.life -= this.decay; this.rotation += this.rotSpeed; return this.life > 0; }
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      if (this.shape === 'rect') {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
      } else {
        ctx.shadowColor = this.color; ctx.shadowBlur = 8;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  class ParticleSystem {
    constructor() { this.particles = []; }
    emit(x, y, color, count = 15, type = 'sparkle') {
      for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y, color, type));
    }
    emitSpring(x, y) {
      const colors = ['#00ff88', '#ffd700', '#ff6b6b', '#4facfe'];
      for (let i = 0; i < 20; i++) {
        const p = new Particle(x, y, colors[Math.floor(Math.random() * colors.length)], 'confetti');
        p.vy = -4 - Math.random() * 4;
        this.particles.push(p);
      }
    }
    emitBreak(x, y) {
      for (let i = 0; i < 12; i++) {
        const p = new Particle(x, y, '#ff4444', 'sparkle');
        p.vy = (Math.random() - 0.5) * 4;
        p.vx = (Math.random() - 0.5) * 6;
        p.decay = 0.04;
        this.particles.push(p);
      }
    }
    emitDeath(x, y, color) {
      for (let i = 0; i < 40; i++) {
        const p = new Particle(x, y, color || '#ff0000', 'confetti');
        p.vy = -3 - Math.random() * 5;
        p.vx = (Math.random() - 0.5) * 8;
        this.particles.push(p);
      }
    }
    emitCoin(x, y) {
      const colors = ['#ffd700', '#ffe66d', '#ff9ff3'];
      for (let i = 0; i < 10; i++) {
        const p = new Particle(x, y, colors[Math.floor(Math.random() * colors.length)], 'sparkle');
        p.vy = -2 - Math.random() * 3;
        this.particles.push(p);
      }
    }
    update() { this.particles = this.particles.filter(p => p.update()); }
    draw(ctx) { for (const p of this.particles) p.draw(ctx); }
    get count() { return this.particles.length; }
  }

  class FloatingText {
    constructor(x, y, text, color = '#fff', size = 20) {
      this.x = x; this.y = y; this.text = text; this.color = color; this.size = size;
      this.life = 1.0; this.vy = -1.5;
    }
    update() { this.y += this.vy; this.vy *= 0.97; this.life -= 0.02; return this.life > 0; }
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.font = `bold ${this.size}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  const PLATFORM_COLORS = {
    normal: { top: '#4a9eff', bottom: '#2a6fcf', glow: '#4a9eff' },
    spring: { top: '#00ff88', bottom: '#00cc6a', glow: '#00ff88' },
    breakable: { top: '#ff6b6b', bottom: '#cc4444', glow: '#ff6b6b' },
    moving: { top: '#ffd700', bottom: '#ccaa00', glow: '#ffd700' },
    default: { top: '#667eea', bottom: '#764ba2', glow: '#667eea' },
  };

  function getPlatformColors(type) { return PLATFORM_COLORS[type] || PLATFORM_COLORS.default; }

  function drawPlatform(ctx, x, y, w, h, type, glowEnabled = true) {
    const c = getPlatformColors(type);
    if (glowEnabled) {
      ctx.save();
      ctx.shadowColor = c.glow; ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = c.glow;
      ctx.beginPath(); ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 6); ctx.fill();
      ctx.restore();
    }
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, c.top); grad.addColorStop(1, c.bottom);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill();
    // Highlight
    ctx.save();
    const sg = ctx.createLinearGradient(x, y, x, y + h * 0.4);
    sg.addColorStop(0, 'rgba(255,255,255,0.2)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.roundRect(x, y, w, h * 0.4, 5); ctx.clip();
    ctx.beginPath(); ctx.roundRect(x, y, w, h * 0.4, 5); ctx.fill();
    ctx.restore();
  }

  function drawCharacter(ctx, x, y, size, skinColor, angle) {
    ctx.save();
    ctx.translate(x, y);
    // Body
    ctx.fillStyle = skinColor || '#ff6b6b';
    ctx.shadowColor = skinColor || '#ff6b6b'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, -size * 0.2, size * 0.35, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillRect(-size * 0.25, size * 0.05, size * 0.5, size * 0.5);
    // Eyes
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-size * 0.1, -size * 0.25, size * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(size * 0.1, -size * 0.25, size * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-size * 0.1, -size * 0.25, size * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(size * 0.1, -size * 0.25, size * 0.04, 0, Math.PI * 2); ctx.fill();
    // Legs
    ctx.fillStyle = skinColor;
    ctx.fillRect(-size * 0.2, size * 0.5, size * 0.15, size * 0.3);
    ctx.fillRect(size * 0.05, size * 0.5, size * 0.15, size * 0.3);
    ctx.restore();
  }

  window.DoodleVisuals = {
    ParticleSystem, Particle, FloatingText,
    getPlatformColors, drawPlatform, drawCharacter,
  };
})();

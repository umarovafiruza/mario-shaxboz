const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');

const fullScript = `/**
 * ===================================================================
 * SHOHONA SUPER MARIO 3D — 2 KISHILIK PLATFORMER (SCRIPT.JS)
 * Muallif: Shaxboz uchun maxsus 3D Side-Scroller Co-op Platformer
 * Shohona Mario (👑 P1) va Shohona Luigi (⚔️ P2)
 * 3D Three.js WebGL & 2D Canvas | Gravitatsiya, Bosh bilan urish,
 * Goomba/Koopa dushmanlari, Qo'ziqorin, Quvurlar va Finish Bayrog'i
 * ===================================================================
 */

// ===================================================================
// 1. OVOZ TIZIMI (WEB AUDIO API — PROCEDURAL MARIO AUDIO SYNTHESIZER)
// ===================================================================
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Mario Sakrash ovozi (Smooth pitch sweep up: 160Hz -> 620Hz)
  playJump() {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.16);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch(e) {}
  }

  // Tanga jaranglashi (Double bell chime: B5 987Hz -> E6 1318Hz)
  playCoin() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [{ f: 987, t: 0 }, { f: 1318, t: 0.08 }];
      notes.forEach(({ f, t }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + t);

        gain.gain.setValueAtTime(0.25, now + t);
        gain.gain.exponentialRampToValueAtTime(0.01, now + t + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.3);
      });
    } catch(e) {}
  }

  // Sehrli Qo'ziqorin / Power-Up Arpeggio (C4-E4-G4-C5-E5-G5)
  playPowerUp() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const freq = [261.6, 329.6, 392.0, 523.3, 659.3, 784.0];
      freq.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = now + i * 0.07;
        osc.frequency.setValueAtTime(f, start);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.11);
      });
    } catch(e) {}
  }

  // Dushmanning ustiga sakrab ezish (Stomp squish crunch)
  playStomp() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch(e) {}
  }

  // Blokni bosh bilan urgandagi zarb (Bump)
  playBump() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.09);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch(e) {}
  }

  // G'isht sinishi (Brick Break)
  playBreak() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch(e) {}
  }

  // Bayroq ustuniga osilish va G'alaba Fanfarasi (Stage Clear Fanfare)
  playFlagpole() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const melody = [
        { f: 392.0, d: 0.12 }, // G4
        { f: 523.3, d: 0.12 }, // C5
        { f: 659.3, d: 0.12 }, // E5
        { f: 784.0, d: 0.16 }, // G5
        { f: 1046.5, d: 0.35 } // C6
      ];
      let t = 0;
      melody.forEach(m => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = now + t;
        osc.frequency.setValueAtTime(m.f, start);

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + m.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + m.d + 0.05);
        t += m.d + 0.03;
      });
    } catch(e) {}
  }

  // Game Over
  playGameOver() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [440, 415, 392, 349];
      notes.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        const start = now + i * 0.16;
        osc.frequency.setValueAtTime(f, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch(e) {}
  }
}

const sounds = new SoundSystem();

// ===================================================================
// 2. O'YIN SOZLAMALARI VA OBYEKTLAR (CONSTANTS & ENTITIES)
// ===================================================================
const TILE_SIZE = 36; // 36x36px Mario grid
const GRAVITY = 0.65; // Side-scroller tortishish kuchi

// Zarrachalar (Particles)
class Particle {
  constructor(x, y, color = '#ffd700', vx = 0, vy = 0, size = 3, maxLife = 20) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.maxLife = maxLife;
    this.life = maxLife;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy -= 0.3; // Gravity
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

// Qalqib chiquvchi matnlar (Score, Popups)
class FloatText {
  constructor(text, x, y, color = '#ffffff') {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = 35;
    this.maxLife = 35;
  }

  update() {
    this.y += 1.2;
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText(this.text, this.x + 1, this.y + 1);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// 🍄 Sehrli Qo'ziqorin (Super Mushroom Power-Up)
class SuperMushroom {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 28;
    this.vx = 1.6;
    this.vy = 0;
    this.isAlive = true;
    this.emerging = true;
    this.emergeY = y;
    this.targetY = y + 36;
  }

  update(engine) {
    if (!this.isAlive) return;

    if (this.emerging) {
      this.y += 1.2;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.emerging = false;
      }
      return;
    }

    this.vy -= GRAVITY;
    this.x += this.vx;

    if (engine.checkBlockCollision(this.x + (this.vx > 0 ? this.width : 0), this.y + 10)) {
      this.vx = -this.vx;
    }

    this.y += this.vy;

    const groundY = engine.getGroundY(this.x, this.x + this.width, this.y);
    if (this.y <= groundY) {
      this.y = groundY;
      this.vy = 0;
    }
  }
}

// 🪙 O'yin ichidagi Oltin Tangalar (Floating / Bumping Coin)
class MarioCoin {
  constructor(x, y, fromBlock = false) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 24;
    this.fromBlock = fromBlock;
    this.collected = false;
    this.animTime = 0;
    this.vy = fromBlock ? 9.5 : 0;
    this.startY = y;
  }

  update() {
    this.animTime += 0.1;
    if (this.fromBlock) {
      this.y += this.vy;
      this.vy -= 0.6;
      if (this.y <= this.startY + 4) {
        this.collected = true;
      }
    }
  }
}

// 🧱 Mario Bloklari (?, G'isht, Yer, Quvur, Zinapoya)
class MarioBlock {
  constructor(col, row, type, content = null) {
    this.col = col;
    this.row = row;
    this.x = col * TILE_SIZE;
    this.y = row * TILE_SIZE;
    this.width = TILE_SIZE;
    this.height = TILE_SIZE;
    this.type = type; // 'GROUND', 'BRICK', 'QUESTION', 'EMPTY', 'PIPE', 'STAIR'
    this.content = content; // 'COIN', 'MUSHROOM', null
    this.bumpProgress = 0;
    this.isBumping = false;
    this.isBroken = false;
  }

  bump(player, engine) {
    if (this.isBumping || this.type === 'EMPTY' || this.type === 'GROUND' || this.type === 'PIPE') return;

    this.isBumping = true;
    this.bumpProgress = 0;

    if (this.type === 'QUESTION') {
      sounds.playBump();
      if (this.content === 'COIN') {
        sounds.playCoin();
        player.coins += 1;
        player.score += 100;
        engine.totalCoins += 1;
        engine.addFloatText("+100 🪙", this.x + 8, this.y + 40, '#ffd54f');
        engine.particles.push(new Particle(this.x + 18, this.y + 36, '#ffd700', 0, 4, 4, 15));
        engine.coinsList.push(new MarioCoin(this.x + 8, this.y + 20, true));
      } else if (this.content === 'MUSHROOM') {
        sounds.playPowerUp();
        engine.mushrooms.push(new SuperMushroom(this.x + 4, this.y));
        engine.addFloatText("MUSHROOM! 🍄", this.x, this.y + 45, '#ff5252');
      }
      this.type = 'EMPTY';
      engine.updateHUD();
    } else if (this.type === 'BRICK') {
      if (player.isBig) {
        sounds.playBreak();
        this.isBroken = true;
        player.score += 50;
        engine.addFloatText("+50 🧱", this.x + 8, this.y + 20, '#ffab91');
        for (let i = 0; i < 6; i++) {
          engine.particles.push(new Particle(
            this.x + 18, this.y + 18, '#8d6e63',
            (Math.random() - 0.5) * 6, Math.random() * 5 + 3, 5, 25
          ));
        }
      } else {
        sounds.playBump();
      }
    }
  }

  update() {
    if (this.isBumping) {
      this.bumpProgress += 0.22;
      if (this.bumpProgress >= Math.PI) {
        this.bumpProgress = 0;
        this.isBumping = false;
      }
    }
  }

  getOffsetY() {
    return this.isBumping ? Math.sin(this.bumpProgress) * 9 : 0;
  }
}

// 💀 Dushman 1: Goomba
class Goomba {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 28;
    this.vx = -1.2;
    this.vy = 0;
    this.isAlive = true;
    this.isStomped = false;
    this.squishTimer = 0;
    this.walkAnim = 0;
  }

  update(engine) {
    if (!this.isAlive) return;

    if (this.isStomped) {
      this.squishTimer--;
      if (this.squishTimer <= 0) {
        this.isAlive = false;
      }
      return;
    }

    this.walkAnim += 0.15;
    this.vy -= GRAVITY;
    this.x += this.vx;

    if (engine.checkBlockCollision(this.x + (this.vx > 0 ? this.width : 0), this.y + 10)) {
      this.vx = -this.vx;
    }

    this.y += this.vy;

    const groundY = engine.getGroundY(this.x, this.x + this.width, this.y);
    if (this.y <= groundY) {
      this.y = groundY;
      this.vy = 0;
    }

    if (this.y < -100) {
      this.isAlive = false;
    }
  }

  stomp(player, engine) {
    if (this.isStomped || !this.isAlive) return;
    this.isStomped = true;
    this.squishTimer = 22;
    sounds.playStomp();
    player.vy = 9.8;
    player.score += 200;
    engine.addFloatText("200 ⭐", this.x + 4, this.y + 30, '#ffd54f');
    for (let i = 0; i < 8; i++) {
      engine.particles.push(new Particle(
        this.x + 14, this.y + 14, '#ffeb3b',
        (Math.random() - 0.5) * 4, Math.random() * 3 + 1, 3, 16
      ));
    }
    engine.updateHUD();
  }
}

// 🐢 Dushman 2: Koopa Troopa
class Koopa {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 36;
    this.vx = -1.2;
    this.vy = 0;
    this.isAlive = true;
    this.isShell = false;
    this.isSliding = false;
    this.walkAnim = 0;
  }

  update(engine) {
    if (!this.isAlive) return;

    this.walkAnim += 0.12;
    this.vy -= GRAVITY;
    this.x += this.vx;

    if (engine.checkBlockCollision(this.x + (this.vx > 0 ? this.width : 0), this.y + 12)) {
      this.vx = -this.vx;
      sounds.playBump();
    }

    this.y += this.vy;

    const groundY = engine.getGroundY(this.x, this.x + this.width, this.y);
    if (this.y <= groundY) {
      this.y = groundY;
      this.vy = 0;
    }

    if (this.isSliding) {
      engine.enemies.forEach(other => {
        if (other !== this && other.isAlive && !other.isStomped) {
          const dist = Math.hypot((this.x + 14) - (other.x + 14), (this.y + 14) - (other.y + 14));
          if (dist < 26) {
            other.isAlive = false;
            sounds.playStomp();
            engine.addFloatText("500 💥", other.x, other.y + 25, '#ff5252');
            for (let i = 0; i < 10; i++) {
              engine.particles.push(new Particle(
                other.x + 14, other.y + 14, '#ff1744',
                (Math.random() - 0.5) * 6, Math.random() * 5 + 2, 4, 20
              ));
            }
          }
        }
      });
    }

    if (this.y < -100) this.isAlive = false;
  }

  stomp(player, engine) {
    if (!this.isShell) {
      this.isShell = true;
      this.isSliding = false;
      this.vx = 0;
      this.height = 24;
      sounds.playStomp();
      player.vy = 9.5;
      player.score += 100;
      engine.addFloatText("100 🐢", this.x + 4, this.y + 25, '#69f0ae');
    } else if (!this.isSliding) {
      this.isSliding = true;
      this.vx = player.x < this.x ? 9.5 : -9.5;
      sounds.playBump();
      player.score += 400;
      engine.addFloatText("TEPISH! 🚀", this.x, this.y + 25, '#ffd54f');
    } else {
      this.isSliding = false;
      this.vx = 0;
      sounds.playStomp();
      player.vy = 8.5;
    }
  }
}

// 👑 Shohona Mario (P1) va ⚔️ Shohona Luigi (P2)
class Player {
  constructor(startX, startY, role = 'MARIO', id = 1) {
    this.spawnX = startX;
    this.spawnY = startY;
    this.x = startX;
    this.y = startY;
    this.role = role;
    this.id = id;
    this.name = id === 1 ? "Shohona Mario (👑)" : "Shohona Luigi (⚔️)";
    this.width = 24;
    this.height = 36;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = false;
    this.isBig = false;
    this.isJumping = false;
    this.invulnerableTimer = 0;
    this.hearts = 3;
    this.maxHearts = 3;
    this.score = 0;
    this.coins = 0;
    this.walkAnim = 0;

    this.inBubble = false;
    this.bubbleY = 0;
    this.onFlagpole = false;
    this.finishedLevel = false;
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = false;
    this.isBig = false;
    this.height = 36;
    this.invulnerableTimer = 0;
    this.inBubble = false;
    this.onFlagpole = false;
    this.finishedLevel = false;
    this.hearts = 3;
  }

  jump(engine) {
    if (this.inBubble || this.onFlagpole) return;

    if (this.isGrounded) {
      const jPower = this.role === 'LUIGI' ? 13.8 : 13.0;
      this.vy = jPower;
      this.isGrounded = false;
      this.isJumping = true;
      sounds.playJump();

      for (let i = 0; i < 5; i++) {
        engine.particles.push(new Particle(
          this.x + 12, this.y, '#b0bec5',
          (Math.random() - 0.5) * 3, Math.random() * 2, 2.5, 12
        ));
      }
    }
  }

  grow(engine) {
    if (this.isBig) return;
    this.isBig = true;
    this.height = 50;
    this.invulnerableTimer = 60;
    sounds.playPowerUp();
    engine.addFloatText("SUPER! ⭐", this.x, this.y + 55, '#ffeb3b');
  }

  shrink(engine) {
    this.isBig = false;
    this.height = 36;
    this.invulnerableTimer = 90;
    sounds.playBump();
    engine.addFloatText("-1 ❤️", this.x, this.y + 40, '#ff5252');
    engine.triggerScreenShake(4, 8);
  }

  takeDamage(amount = 1, engine) {
    if (this.invulnerableTimer > 0 || this.inBubble || this.onFlagpole) return false;

    if (this.isBig) {
      this.shrink(engine);
      return true;
    }

    this.hearts = Math.max(0, this.hearts - amount);
    this.invulnerableTimer = 90;
    sounds.playBump();
    engine.triggerScreenShake(4, 9);

    if (this.hearts <= 0) {
      const partner = this.id === 1 ? engine.player2 : engine.player;
      if (partner && !partner.inBubble && partner.hearts > 0) {
        this.inBubble = true;
        this.vx = 0;
        this.vy = 0;
        this.x = partner.x - 30;
        this.y = partner.y + 40;
        engine.showToast(\`⚠️ \${this.name} yiqildi! Pufakni urib qutqaring! 🫧\`);
        engine.addFloatText("PUFAK! 🫧", this.x, this.y + 35, '#80d8ff');
      } else {
        engine.gameOver();
      }
    }
    return true;
  }

  update(engine) {
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;

    // 🫧 Co-op Rescue Bubble
    if (this.inBubble) {
      const partner = this.id === 1 ? engine.player2 : engine.player;
      if (partner && !partner.inBubble) {
        const dx = (partner.x - 35) - this.x;
        const dy = (partner.y + 45) - this.y;
        this.x += dx * 0.05;
        this.y += dy * 0.05;

        const dist = Math.hypot(partner.x - this.x, partner.y - this.y);
        if (dist < 40) {
          this.inBubble = false;
          this.hearts = 1;
          this.vy = 6;
          this.invulnerableTimer = 100;
          sounds.playPowerUp();
          engine.showToast(\`\${partner.name} \${this.name}ni pufakdan qutqardi! 🤝✨\`);
          engine.addFloatText("QUTQARILDI! ✨", this.x, this.y + 35, '#69f0ae');
          for (let i = 0; i < 18; i++) {
            engine.particles.push(new Particle(
              this.x + 12, this.y + 18, '#80d8ff',
              (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, 3.5, 20
            ));
          }
          engine.updateHUD();
        }
      } else {
        engine.gameOver();
      }
      return;
    }

    // 🚩 Bayroq ustunida pastga sirpanish
    if (this.onFlagpole) {
      if (this.y > 40) {
        this.y -= 3.2;
      } else {
        this.y = 40;
        this.x += 1.8;
        if (this.x >= engine.flagpoleX + 170 && !this.finishedLevel) {
          this.finishedLevel = true;
          engine.handleLevelComplete();
        }
      }
      return;
    }

    this.vy -= GRAVITY;
    if (this.vy < -15) this.vy = -15;

    const nextX = this.x + this.vx;
    const testHeight = this.height - 6;

    if (this.vx > 0) {
      if (!engine.checkBlockCollision(nextX + this.width, this.y + 8) &&
          !engine.checkBlockCollision(nextX + this.width, this.y + testHeight)) {
        this.x = nextX;
      } else {
        this.vx = 0;
      }
    } else if (this.vx < 0) {
      if (!engine.checkBlockCollision(nextX, this.y + 8) &&
          !engine.checkBlockCollision(nextX, this.y + testHeight)) {
        this.x = nextX;
      } else {
        this.vx = 0;
      }
    }

    const nextY = this.y + this.vy;

    if (this.vy > 0) {
      const hitBlock = engine.getBlockAt(this.x + this.width / 2, nextY + this.height);
      if (hitBlock && !hitBlock.isBroken && hitBlock.type !== 'PIPE') {
        this.vy = -1.2;
        hitBlock.bump(this, engine);
      } else {
        this.y = nextY;
      }
    } else {
      const groundY = engine.getGroundY(this.x + 4, this.x + this.width - 4, nextY);
      if (nextY <= groundY) {
        this.y = groundY;
        this.vy = 0;
        this.isGrounded = true;
        this.isJumping = false;
      } else {
        this.y = nextY;
        this.isGrounded = false;
      }
    }

    if (Math.abs(this.vx) > 0.2 && this.isGrounded) {
      this.walkAnim += Math.abs(this.vx) * 0.12;
    }

    if (this.y < -60) {
      this.y = -60;
      this.takeDamage(3, engine);
    }

    if (!this.onFlagpole && Math.abs(this.x - engine.flagpoleX) < 24 && this.y >= 36) {
      this.onFlagpole = true;
      this.vx = 0;
      this.vy = 0;
      this.x = engine.flagpoleX - 8;
      sounds.playFlagpole();
      engine.flagLowering = true;
      const heightBonus = Math.round((this.y / 280) * 5000);
      this.score += heightBonus;
      engine.addFloatText(\`+\${heightBonus} 🚩\`, this.x, this.y + 30, '#ffd700');
      engine.showToast(\`\${this.name} Bayroq ustunini zabt etdi! (+\${heightBonus} ball)\`);
      engine.updateHUD();
    }
  }

  draw2D(ctx) {
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 5) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y);
    ctx.scale(this.facing, 1);

    if (this.inBubble) {
      ctx.strokeStyle = '#80d8ff';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(128, 216, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 18, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const legSwing = (this.isGrounded && Math.abs(this.vx) > 0.2) ? Math.sin(this.walkAnim) * 6 : 0;
    const bodyColor = this.role === 'MARIO' ? '#d32f2f' : '#2e7d32';
    const overallColor = this.role === 'MARIO' ? '#1565c0' : '#0d47a1';

    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-8 + legSwing, 0, 7, 10);
    ctx.fillRect(1 - legSwing, 0, 7, 10);

    ctx.fillStyle = overallColor;
    ctx.fillRect(-9, 8, 18, this.isBig ? 24 : 16);

    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-6, this.isBig ? 20 : 14, 3, 3);
    ctx.fillRect(3, this.isBig ? 20 : 14, 3, 3);

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-10, this.isBig ? 24 : 16, 20, 8);

    const headY = this.isBig ? 32 : 24;
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, headY + 6, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#212121';
    ctx.fillRect(1, headY + 4, 6, 3);

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-8, headY + 8, 18, 7, 3);
    ctx.fill();

    ctx.fillStyle = this.role === 'MARIO' ? '#ffd700' : '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(-6, headY + 15);
    ctx.lineTo(-6, headY + 21);
    ctx.lineTo(-2, headY + 18);
    ctx.lineTo(1, headY + 23);
    ctx.lineTo(4, headY + 18);
    ctx.lineTo(8, headY + 21);
    ctx.lineTo(8, headY + 15);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// ===================================================================
// 3. 3D THREE.JS WEBGL RENDERER (SUPER MARIO 3D SIDE-SCROLLER)
// ===================================================================
class ThreeRenderer {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('threeCanvas');
    if (!this.canvas || typeof THREE === 'undefined') {
      this.enabled = false;
      return;
    }

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(960, 720);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.25;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch(err) {
      console.warn("WebGL renderer init failed:", err);
      this.enabled = false;
      return;
    }

    this.enabled = true;

    // Mario osmoni (Classic Super Mario Sky Blue!)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5c94fc);
    this.scene.fog = new THREE.Fog(0x5c94fc, 800, 2400);

    // 2.5D / 3D Side-scroller Kamera
    this.camera = new THREE.PerspectiveCamera(46, 960 / 720, 10, 4500);
    this.camera.position.set(0, 120, 360);

    // Guruhlar
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    this.sceneryGroup = new THREE.Group();
    this.scene.add(this.sceneryGroup);

    this.blockMeshes = new Map();
    this.enemyMeshes = new Map();
    this.coinMeshes = new Map();
    this.mushroomMeshes = new Map();

    this.clouds = [];
    this.time = 0;

    this.setupLights();
    this.setupMarioBackground();
    this.setupPlayer1Mesh();
    this.setupPlayer2Mesh();
    this.setupFlagpoleAndCastle();
  }

  setupLights() {
    const amb = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(amb);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x5c94fc, 0.45);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffaed, 1.2);
    sun.position.set(300, 600, 300);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 50;
    sun.shadow.camera.far = 1800;
    const d = 500;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.sunLight = sun;
  }

  // Kulib turuvchi 3D Mario Bulutlari va Yashil Do'ngliklar
  setupMarioBackground() {
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    for (let i = 0; i < 14; i++) {
      const cGrp = new THREE.Group();
      for (let p = 0; p < 5; p++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(18, 10, 10), cloudMat);
        puff.position.set((p - 2) * 20, (Math.random() - 0.5) * 8, 0);
        cGrp.add(puff);
      }
      // Bulut ko'zlari
      const e1 = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), eyeMat);
      e1.position.set(-6, 2, 17);
      cGrp.add(e1);
      const e2 = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), eyeMat);
      e2.position.set(6, 2, 17);
      cGrp.add(e2);

      cGrp.position.set(i * 300 + (Math.random() - 0.5) * 100, 240 + Math.random() * 80, -90);
      cGrp.speed = 0.25 + Math.random() * 0.3;
      this.sceneryGroup.add(cGrp);
      this.clouds.push(cGrp);
    }

    // Mario yashil do'ngliklari (Green Rolling Hills)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x00c853, roughness: 0.7 });
    for (let h = 0; h < 12; h++) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(160, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
      hill.scale.set(1.4, 0.75, 1);
      hill.position.set(h * 340 + 60, -40, -160);
      this.sceneryGroup.add(hill);
    }
  }

  // Shohona Mario (P1 - Qizil/Oltin)
  setupPlayer1Mesh() {
    this.p1Group = new THREE.Group();

    // Soya
    const shadowGeo = new THREE.CircleGeometry(14, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
    this.p1Shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.scene.add(this.p1Shadow);

    // Oyoqlar
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.8 });
    this.p1LeftLeg = new THREE.Mesh(new THREE.BoxGeometry(7, 10, 10), bootMat);
    this.p1LeftLeg.position.set(-5, 5, 0);
    this.p1Group.add(this.p1LeftLeg);

    this.p1RightLeg = new THREE.Mesh(new THREE.BoxGeometry(7, 10, 10), bootMat);
    this.p1RightLeg.position.set(5, 5, 0);
    this.p1Group.add(this.p1RightLeg);

    // Ko'k Kombinezon
    const overallMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.6 });
    this.p1Torso = new THREE.Mesh(new THREE.BoxGeometry(18, 16, 12), overallMat);
    this.p1Torso.position.y = 17;
    this.p1Torso.castShadow = true;
    this.p1Group.add(this.p1Torso);

    // Oltin tugmalar
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 });
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1), goldMat);
    b1.rotateX(Math.PI / 2);
    b1.position.set(-4, 19, 6.2);
    this.p1Group.add(b1);
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1), goldMat);
    b2.rotateX(Math.PI / 2);
    b2.position.set(4, 19, 6.2);
    this.p1Group.add(b2);

    // Qizil Ko'ylak yenglari
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.6 });
    this.p1LeftArm = new THREE.Mesh(new THREE.BoxGeometry(5, 12, 6), shirtMat);
    this.p1LeftArm.position.set(-11, 18, 0);
    this.p1Group.add(this.p1LeftArm);

    this.p1RightArm = new THREE.Mesh(new THREE.BoxGeometry(5, 12, 6), shirtMat);
    this.p1RightArm.position.set(11, 18, 0);
    this.p1Group.add(this.p1RightArm);

    // Bosh
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.7 });
    this.p1Head = new THREE.Mesh(new THREE.SphereGeometry(7.5, 14, 14), headMat);
    this.p1Head.position.y = 29;
    this.p1Group.add(this.p1Head);

    // Mo'ylov va Burun
    const nose = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 10), headMat);
    nose.position.set(0, 28.5, 7.5);
    this.p1Group.add(nose);

    const mustache = new THREE.Mesh(new THREE.BoxGeometry(8, 2.5, 3), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    mustache.position.set(0, 26.5, 7.2);
    this.p1Group.add(mustache);

    // Qizil Mario Kepkasi
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 8.5, 5, 16), shirtMat);
    cap.position.y = 33.5;
    this.p1Group.add(cap);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(10, 1.8, 7), shirtMat);
    visor.position.set(0, 31.5, 6);
    this.p1Group.add(visor);

    // 👑 Shohona Oltin Toj (Kepka ustida!)
    const crown = new THREE.Group();
    crown.position.set(0, 37, 0);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.4, 2.5, 12, 1, true), goldMat);
    crown.add(rim);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.5, 6), goldMat);
      spike.position.set(Math.cos(ang) * 4.4, 2.2, Math.sin(ang) * 4.4);
      crown.add(spike);
    }
    this.p1Group.add(crown);

    // 🫧 Pufak (Rescue Bubble Mesh)
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0x80d8ff,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.6
    });
    this.p1Bubble = new THREE.Mesh(new THREE.SphereGeometry(22, 16, 16), bubbleMat);
    this.p1Bubble.position.y = 20;
    this.p1Bubble.visible = false;
    this.p1Group.add(this.p1Bubble);

    this.worldGroup.add(this.p1Group);
  }

  // Shohona Luigi (P2 - Yashil/Moviy)
  setupPlayer2Mesh() {
    this.p2Group = new THREE.Group();

    const shadowGeo = new THREE.CircleGeometry(14, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
    this.p2Shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.scene.add(this.p2Shadow);

    const bootMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });
    this.p2LeftLeg = new THREE.Mesh(new THREE.BoxGeometry(6.5, 11, 9.5), bootMat);
    this.p2LeftLeg.position.set(-5, 5.5, 0);
    this.p2Group.add(this.p2LeftLeg);

    this.p2RightLeg = new THREE.Mesh(new THREE.BoxGeometry(6.5, 11, 9.5), bootMat);
    this.p2RightLeg.position.set(5, 5.5, 0);
    this.p2Group.add(this.p2RightLeg);

    const overallMat = new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: 0.6 });
    this.p2Torso = new THREE.Mesh(new THREE.BoxGeometry(17, 18, 11), overallMat);
    this.p2Torso.position.y = 19;
    this.p2Torso.castShadow = true;
    this.p2Group.add(this.p2Torso);

    const silverMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.9 });
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1), silverMat);
    b1.rotateX(Math.PI / 2);
    b1.position.set(-4, 21, 5.8);
    this.p2Group.add(b1);
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1), silverMat);
    b2.rotateX(Math.PI / 2);
    b2.position.set(4, 21, 5.8);
    this.p2Group.add(b2);

    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });
    this.p2LeftArm = new THREE.Mesh(new THREE.BoxGeometry(4.8, 13, 5.5), shirtMat);
    this.p2LeftArm.position.set(-10.5, 20, 0);
    this.p2Group.add(this.p2LeftArm);

    this.p2RightArm = new THREE.Mesh(new THREE.BoxGeometry(4.8, 13, 5.5), shirtMat);
    this.p2RightArm.position.set(10.5, 20, 0);
    this.p2Group.add(this.p2RightArm);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.7 });
    this.p2Head = new THREE.Mesh(new THREE.SphereGeometry(7.2, 14, 14), headMat);
    this.p2Head.position.y = 32;
    this.p2Group.add(this.p2Head);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 10), headMat);
    nose.position.set(0, 31.5, 7.2);
    this.p2Group.add(nose);

    const mustache = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.2, 2.8), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    mustache.position.set(0, 29.5, 7.0);
    this.p2Group.add(mustache);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.2, 5.2, 16), shirtMat);
    cap.position.y = 36.5;
    this.p2Group.add(cap);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1.8, 6.5), shirtMat);
    visor.position.set(0, 34.5, 5.8);
    this.p2Group.add(visor);

    // ⚔️ Shohona Safir Toj
    const crown = new THREE.Group();
    crown.position.set(0, 40, 0);
    const circlet = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.2, 2.2, 12, 1, true), silverMat);
    crown.add(circlet);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(1.4, 6, 6), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
    gem.position.set(0, 1.2, 4.4);
    crown.add(gem);
    this.p2Group.add(crown);

    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0x80d8ff,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.6
    });
    this.p2Bubble = new THREE.Mesh(new THREE.SphereGeometry(22, 16, 16), bubbleMat);
    this.p2Bubble.position.y = 20;
    this.p2Bubble.visible = false;
    this.p2Group.add(this.p2Bubble);

    this.worldGroup.add(this.p2Group);
  }

  // 🚩 Finish Bayroq Ustuni va 🏰 Shohona Qasr
  setupFlagpoleAndCastle() {
    this.flagpoleGroup = new THREE.Group();
    this.flagpoleX = 3200;

    // Ustun poydevori
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(36, 16, 36), baseMat);
    base.position.set(this.flagpoleX, 8, 0);
    this.flagpoleGroup.add(base);

    // Metall Ustun
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.15 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 290), poleMat);
    pole.position.set(this.flagpoleX, 155, 0);
    pole.castShadow = true;
    this.flagpoleGroup.add(pole);

    // Ustun uchidagi Oltin Sharcha
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(8, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95 })
    );
    ball.position.set(this.flagpoleX, 300, 0);
    this.flagpoleGroup.add(ball);

    // Qizil va Oq Bayroq
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff1744, side: THREE.DoubleSide });
    const flagGeo = new THREE.PlaneGeometry(36, 24);
    flagGeo.translate(-18, 0, 0);
    this.flagMesh = new THREE.Mesh(flagGeo, flagMat);
    this.flagMesh.position.set(this.flagpoleX, 285, 0);
    this.flagpoleGroup.add(this.flagMesh);

    // 🏰 Shohona Qasr (Castle)
    const castleGroup = new THREE.Group();
    castleGroup.position.set(this.flagpoleX + 160, 0, 0);

    const castleMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.8 });
    const mainTower = new THREE.Mesh(new THREE.BoxGeometry(100, 110, 50), castleMat);
    mainTower.position.y = 55;
    mainTower.castShadow = true;
    castleGroup.add(mainTower);

    // Qasr qirralari (Battlements)
    for (let b = 0; b < 4; b++) {
      const bat = new THREE.Mesh(new THREE.BoxGeometry(18, 14, 52), castleMat);
      bat.position.set(-38 + b * 25, 115, 0);
      castleGroup.add(bat);
    }

    // Qasr eshigi (Qora arkali eshik)
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(26, 44, 52), doorMat);
    door.position.set(0, 22, 0);
    castleGroup.add(door);

    this.flagpoleGroup.add(castleGroup);
    this.worldGroup.add(this.flagpoleGroup);
  }

  // Bloklar yaratish (Ground, Brick, ?, Pipe)
  getOrCreateBlockMesh(block) {
    let mesh = this.blockMeshes.get(block);
    if (mesh) return mesh;

    const grp = new THREE.Group();
    grp.position.set(block.x + 18, block.y + 18, 0);

    if (block.type === 'GROUND') {
      const dirtMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.9 });
      const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(36, 36, 36), dirtMat);
      blockMesh.castShadow = true;
      blockMesh.receiveShadow = true;
      grp.add(blockMesh);

      // Yashil maysa qoplamasi
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.7 });
      const grassMesh = new THREE.Mesh(new THREE.BoxGeometry(36.2, 7, 36.2), grassMat);
      grassMesh.position.y = 15;
      grp.add(grassMesh);
    } else if (block.type === 'BRICK') {
      const brickMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.8 });
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(36, 36, 36), brickMat);
      bMesh.castShadow = true;
      grp.add(bMesh);

      // G'isht chiziqlari
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x3e2723 });
      const l1 = new THREE.Mesh(new THREE.BoxGeometry(36.2, 2, 36.2), lineMat);
      grp.add(l1);
    } else if (block.type === 'QUESTION') {
      const qMat = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.3, metalness: 0.3 });
      const qMesh = new THREE.Mesh(new THREE.BoxGeometry(36, 36, 36), qMat);
      qMesh.castShadow = true;
      grp.add(qMesh);

      // ? belgisi
      const qText = new THREE.Mesh(
        new THREE.SphereGeometry(4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      qText.position.set(0, 2, 18.5);
      grp.add(qText);
    } else if (block.type === 'EMPTY') {
      const eMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 });
      const eMesh = new THREE.Mesh(new THREE.BoxGeometry(36, 36, 36), eMat);
      grp.add(eMesh);
    } else if (block.type === 'PIPE') {
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.3, metalness: 0.2 });
      const pipeMesh = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 36, 16), pipeMat);
      pipeMesh.castShadow = true;
      grp.add(pipeMesh);

      // Quvur labi (Rim)
      const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(23, 23, 10, 16), pipeMat);
      rimMesh.position.y = 13;
      grp.add(rimMesh);
    }

    this.worldGroup.add(grp);
    this.blockMeshes.set(block, grp);
    return grp;
  }

  // Goomba yaratish
  getOrCreateEnemyMesh(enemy) {
    let mesh = this.enemyMeshes.get(enemy);
    if (mesh) return mesh;

    const grp = new THREE.Group();

    if (enemy instanceof Goomba) {
      const capMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.7 });
      const stemMat = new THREE.MeshStandardMaterial({ color: 0xffecb3, roughness: 0.8 });

      // Bosh qalpog'i
      const cap = new THREE.Mesh(new THREE.SphereGeometry(14, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
      cap.position.y = 14;
      cap.scale.set(1.1, 1, 1);
      cap.castShadow = true;
      grp.add(cap);

      // Tana
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(7, 9, 12, 10), stemMat);
      stem.position.y = 8;
      grp.add(stem);

      // Ko'zlar
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const e1 = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), eyeMat);
      e1.position.set(-4, 13, 11);
      grp.add(e1);
      const e2 = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), eyeMat);
      e2.position.set(4, 13, 11);
      grp.add(e2);
    } else if (enemy instanceof Koopa) {
      const shellMat = new THREE.MeshStandardMaterial({ color: 0x00c853, roughness: 0.4 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.6 });

      const shell = new THREE.Mesh(new THREE.SphereGeometry(13, 10, 10), shellMat);
      shell.position.y = 13;
      shell.scale.set(1, 1.2, 0.9);
      shell.castShadow = true;
      grp.add(shell);

      const head = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 10), skinMat);
      head.position.set(0, 24, 6);
      grp.add(head);
    }

    this.worldGroup.add(grp);
    this.enemyMeshes.set(enemy, grp);
    return grp;
  }

  // Tanga Mesh
  getOrCreateCoinMesh(coin, idx) {
    let mesh = this.coinMeshes.get(idx);
    if (mesh) return mesh;

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.1 });
    const cMesh = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 3, 16), goldMat);
    cMesh.rotateZ(Math.PI / 2);
    cMesh.castShadow = true;

    this.worldGroup.add(cMesh);
    this.coinMeshes.set(idx, cMesh);
    return cMesh;
  }

  // Qo'ziqorin Mesh
  getOrCreateMushroomMesh(mush, idx) {
    let mesh = this.mushroomMeshes.get(idx);
    if (mesh) return mesh;

    const grp = new THREE.Group();
    const capMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.5 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(13, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    cap.position.y = 13;
    grp.add(cap);

    // Oq nuqtalar
    const dotMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(4, 6, 6), dotMat);
    dot.position.set(0, 20, 9);
    grp.add(dot);

    const stemMat = new THREE.MeshStandardMaterial({ color: 0xffecb3 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 12), stemMat);
    stem.position.y = 6;
    grp.add(stem);

    this.worldGroup.add(grp);
    this.mushroomMeshes.set(idx, grp);
    return grp;
  }

  render(dt = 16) {
    if (!this.enabled) return;

    this.time += dt * 0.001;
    const game = this.game;

    // Bulutlar harakati
    this.clouds.forEach(c => {
      c.position.x += c.speed;
      if (c.position.x > this.camera.position.x + 800) {
        c.position.x = this.camera.position.x - 700;
      }
    });

    // 1. Bloklarni yangilash
    const activeBlocks = new Set();
    game.blocks.forEach(block => {
      activeBlocks.add(block);
      const bMesh = this.getOrCreateBlockMesh(block);
      bMesh.position.y = block.y + 18 + block.getOffsetY();
      bMesh.visible = !block.isBroken;
    });
    this.blockMeshes.forEach((mesh, block) => {
      if (!activeBlocks.has(block) || block.isBroken) {
        mesh.visible = false;
      }
    });

    // 2. O'yinchi 1 (Shohona Mario)
    const p1 = game.player;
    if (p1) {
      this.p1Group.position.set(p1.x + p1.width / 2, p1.y, 0);
      this.p1Group.scale.set(p1.facing * (p1.isBig ? 1.3 : 1.0), p1.isBig ? 1.3 : 1.0, 1.0);
      this.p1Shadow.position.set(p1.x + p1.width / 2, 1, 0);

      this.p1Bubble.visible = p1.inBubble;
      this.p1Group.visible = p1.invulnerableTimer % 6 < 3;

      if (!p1.isGrounded && !p1.inBubble && !p1.onFlagpole) {
        // Sakrash pozitsiyasi (Mario Wahoo!)
        this.p1RightArm.rotation.x = Math.PI * 0.8;
        this.p1LeftArm.rotation.x = -Math.PI * 0.3;
        this.p1LeftLeg.rotation.x = -0.5;
        this.p1RightLeg.rotation.x = 0.5;
      } else if (p1.isGrounded && Math.abs(p1.vx) > 0.2) {
        // Yugurish animatsiyasi
        const legSwing = Math.sin(p1.walkAnim) * 0.6;
        this.p1LeftLeg.rotation.x = legSwing;
        this.p1RightLeg.rotation.x = -legSwing;
        this.p1LeftArm.rotation.x = -legSwing;
        this.p1RightArm.rotation.x = legSwing;
      } else {
        this.p1LeftLeg.rotation.x = 0;
        this.p1RightLeg.rotation.x = 0;
        this.p1LeftArm.rotation.x = 0;
        this.p1RightArm.rotation.x = 0;
      }
    }

    // 3. O'yinchi 2 (Shohona Luigi)
    const p2 = game.player2;
    if (p2) {
      this.p2Group.position.set(p2.x + p2.width / 2, p2.y, 0);
      this.p2Group.scale.set(p2.facing * (p2.isBig ? 1.3 : 1.0), p2.isBig ? 1.3 : 1.0, 1.0);
      this.p2Shadow.position.set(p2.x + p2.width / 2, 1, 0);

      this.p2Bubble.visible = p2.inBubble;
      this.p2Group.visible = p2.invulnerableTimer % 6 < 3;

      if (!p2.isGrounded && !p2.inBubble && !p2.onFlagpole) {
        this.p2RightArm.rotation.x = Math.PI * 0.8;
        this.p2LeftArm.rotation.x = -Math.PI * 0.3;
        this.p2LeftLeg.rotation.x = -0.6;
        this.p2RightLeg.rotation.x = 0.6;
      } else if (p2.isGrounded && Math.abs(p2.vx) > 0.2) {
        const legSwing = Math.sin(p2.walkAnim) * 0.6;
        this.p2LeftLeg.rotation.x = legSwing;
        this.p2RightLeg.rotation.x = -legSwing;
        this.p2LeftArm.rotation.x = -legSwing;
        this.p2RightArm.rotation.x = legSwing;
      } else {
        this.p2LeftLeg.rotation.x = 0;
        this.p2RightLeg.rotation.x = 0;
        this.p2LeftArm.rotation.x = 0;
        this.p2RightArm.rotation.x = 0;
      }
    }

    // 4. Dushmanlar
    const activeEnemySet = new Set();
    game.enemies.forEach(enemy => {
      if (!enemy.isAlive) return;
      activeEnemySet.add(enemy);
      const eMesh = this.getOrCreateEnemyMesh(enemy);
      eMesh.position.set(enemy.x + enemy.width / 2, enemy.y, 0);

      if (enemy instanceof Goomba && enemy.isStomped) {
        eMesh.scale.set(1.3, 0.2, 1);
      } else {
        eMesh.scale.set(1, 1, 1);
        if (enemy instanceof Koopa && enemy.isSliding) {
          eMesh.rotation.y += 0.3;
        }
      }
    });
    this.enemyMeshes.forEach((mesh, enemy) => {
      if (!activeEnemySet.has(enemy)) {
        mesh.visible = false;
      }
    });

    // 5. Tangalar
    const activeCoinSet = new Set();
    game.coinsList.forEach((coin, idx) => {
      if (coin.collected) return;
      activeCoinSet.add(idx);
      const cMesh = this.getOrCreateCoinMesh(coin, idx);
      cMesh.position.set(coin.x + 10, coin.y + 12, 0);
      cMesh.rotation.y += 0.05;
      cMesh.visible = true;
    });
    this.coinMeshes.forEach((mesh, idx) => {
      if (!activeCoinSet.has(idx)) {
        mesh.visible = false;
      }
    });

    // 6. Qo'ziqorinlar
    game.mushrooms.forEach((mush, idx) => {
      if (!mush.isAlive) return;
      const mMesh = this.getOrCreateMushroomMesh(mush, idx);
      mMesh.position.set(mush.x + mush.width / 2, mush.y, 0);
      mMesh.visible = true;
    });

    // 7. Bayroqni tushirish animatsiyasi
    if (game.flagLowering && this.flagMesh.position.y > 60) {
      this.flagMesh.position.y -= 3.5;
    }

    // 8. 3D Side-Scroller Dinamik Kamera (2 Kishilik Midpoint)
    if (p1 && p2) {
      let activeX = (p1.x + p2.x) / 2;
      let activeY = (p1.y + p2.y) / 2;

      if (p1.inBubble) { activeX = p2.x; activeY = p2.y; }
      else if (p2.inBubble) { activeX = p1.x; activeY = p1.y; }

      const dist = Math.abs(p1.x - p2.x);
      const targetZ = 340 + Math.min(180, dist * 0.45);
      const targetCamX = Math.max(380, activeX);
      const targetCamY = Math.max(120, activeY * 0.4 + 90);

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.09;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.09;
      this.camera.position.z += (targetZ - this.camera.position.z) * 0.08;

      let lookX = this.camera.position.x;
      let lookY = this.camera.position.y - 20;

      if (game.shakeTimer > 0) {
        lookX += (Math.random() - 0.5) * game.shakeIntensity * 2;
        lookY += (Math.random() - 0.5) * game.shakeIntensity * 2;
      }

      this.camera.lookAt(lookX, lookY, 0);

      if (this.sunLight) {
        this.sunLight.position.set(lookX + 300, 600, 300);
        this.sunLight.target.position.set(lookX, 0, 0);
        this.sunLight.target.updateMatrixWorld();
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// ===================================================================
// 4. ASOSIY O'YIN BOSHQARUVI (GAME ENGINE — SUPER MARIO 3D CO-OP)
// ===================================================================
class GameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.threeCanvas = document.getElementById('threeCanvas');
    this.hudCanvas = document.getElementById('hudCanvas');
    this.hudCtx = this.hudCanvas ? this.hudCanvas.getContext('2d') : null;
    this.btnDimensionToggle = document.getElementById('btn-dimension-toggle');

    // UI elementlari
    this.uiLevel = document.getElementById('level-display');
    this.uiP1Hearts = document.getElementById('p1-hearts-display');
    this.uiP2Hearts = document.getElementById('p2-hearts-display');
    this.uiP1Score = document.getElementById('p1-score');
    this.uiP2Score = document.getElementById('p2-score');
    this.uiCoins = document.getElementById('coins-count');
    this.uiTime = document.getElementById('time-display');
    this.uiToast = document.getElementById('toast-notification');

    // Ekranlar
    this.screenStart = document.getElementById('start-screen');
    this.screenGameOver = document.getElementById('game-over-screen');
    this.screenVictory = document.getElementById('victory-screen');
    this.screenLevelComplete = document.getElementById('level-complete-screen');

    // Tugmalar
    this.btnStart = document.getElementById('btn-start-game');
    this.btnRetryLevel = document.getElementById('btn-retry-level');
    this.btnRestartVictory = document.getElementById('btn-restart-victory');
    this.btnNextLevel = document.getElementById('btn-next-level');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.btnActionAttack = document.getElementById('btn-action-attack');
    this.btnActionJump = document.getElementById('btn-action-jump');

    // Kamera & Holat
    this.camera = { x: 0, y: 0 };
    this.state = 'START';
    this.toastTimeout = null;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.lastP2InputTime = 0;
    this.totalCoins = 0;
    this.timeLeft = 400;
    this.timeCounter = 0;

    // Tugmalar
    this.keysP1 = { left: false, right: false, jump: false, run: false };
    this.keysP2 = { left: false, right: false, jump: false, run: false };

    // Qahramonlar
    this.player = new Player(60, 40, 'MARIO', 1);
    this.player2 = new Player(100, 40, 'LUIGI', 2);

    this.blocks = [];
    this.enemies = [];
    this.coinsList = [];
    this.mushrooms = [];
    this.particles = [];
    this.floatTexts = [];
    this.flagpoleX = 3200;
    this.flagLowering = false;

    // 3D Three.js Renderer
    this.is3D = true;
    try {
      this.threeRenderer = new ThreeRenderer(this);
      if (!this.threeRenderer || !this.threeRenderer.enabled) {
        this.is3D = false;
      }
    } catch(err) {
      console.warn("3D WebGL renderer faollashtirishda xatolik:", err);
      this.is3D = false;
    }

    if (this.is3D) {
      if (this.threeCanvas) this.threeCanvas.style.display = 'block';
      if (this.canvas) this.canvas.style.display = 'none';
      if (this.btnDimensionToggle) this.btnDimensionToggle.textContent = '🌐 3D';
    } else {
      if (this.threeCanvas) this.threeCanvas.style.display = 'none';
      if (this.canvas) this.canvas.style.display = 'block';
      if (this.btnDimensionToggle) this.btnDimensionToggle.textContent = '🗺️ 2D';
    }

    this.bindEvents();
    this.buildWorld1_1();
  }

  triggerScreenShake(intensity = 4, frames = 8) {
    this.shakeIntensity = intensity;
    this.shakeTimer = frames;
  }

  toggleDimension() {
    if (!this.threeRenderer || !this.threeRenderer.enabled) {
      this.showToast("3D WebGL rejimi ushbu brauzerda mavjud emas.");
      this.is3D = false;
      return;
    }
    this.is3D = !this.is3D;
    const btn = document.getElementById('btn-dimension-toggle');
    if (this.is3D) {
      if (this.threeCanvas) this.threeCanvas.style.display = 'block';
      if (this.canvas) this.canvas.style.display = 'none';
      if (btn) btn.textContent = '🌐 3D';
      this.showToast("3D Side-Scroller Rejimi faollashtirildi! 🌐");
    } else {
      if (this.threeCanvas) this.threeCanvas.style.display = 'none';
      if (this.canvas) this.canvas.style.display = 'block';
      if (btn) btn.textContent = '🗺️ 2D';
      this.showToast("2D Klassik Rejim faollashtirildi! 🗺️");
    }
  }

  // ===================================================================
  // WORLD 1-1 XARITASINI YARATISH (CLASSIC SUPER MARIO 1-1 LAYOUT)
  // ===================================================================
  buildWorld1_1() {
    this.blocks = [];
    this.enemies = [];
    this.coinsList = [];
    this.mushrooms = [];
    this.flagLowering = false;

    // Er platformasi (Ground with gaps/pits)
    for (let c = 0; c < 105; c++) {
      // Jarliklar (Pits at c = 32-34 and c = 52-54)
      if ((c >= 32 && c <= 34) || (c >= 52 && c <= 54) || (c >= 86 && c <= 88)) {
        continue;
      }
      this.blocks.push(new MarioBlock(c, 0, 'GROUND'));
    }

    // 1-qator: ? Blok (Coin)
    this.blocks.push(new MarioBlock(8, 3, 'QUESTION', 'COIN'));

    // 2-qator: G'isht - ? (Mushroom) - G'isht
    this.blocks.push(new MarioBlock(12, 3, 'BRICK'));
    this.blocks.push(new MarioBlock(13, 3, 'QUESTION', 'MUSHROOM'));
    this.blocks.push(new MarioBlock(14, 3, 'BRICK'));

    // Birinchi Dushman: Goomba
    this.enemies.push(new Goomba(12 * TILE_SIZE, 36));

    // 1-Yashil Quvur (Balandligi 2 blok)
    this.blocks.push(new MarioBlock(18, 1, 'PIPE'));
    this.blocks.push(new MarioBlock(18, 2, 'PIPE'));

    // Goomba quvur ortida
    this.enemies.push(new Goomba(22 * TILE_SIZE, 36));

    // 2-Yashil Quvur (Balandligi 3 blok)
    this.blocks.push(new MarioBlock(26, 1, 'PIPE'));
    this.blocks.push(new MarioBlock(26, 2, 'PIPE'));
    this.blocks.push(new MarioBlock(26, 3, 'PIPE'));

    // Havodagi platforma: 3 ta ? blok
    this.blocks.push(new MarioBlock(38, 3, 'QUESTION', 'COIN'));
    this.blocks.push(new MarioBlock(39, 3, 'QUESTION', 'COIN'));
    this.blocks.push(new MarioBlock(40, 3, 'QUESTION', 'COIN'));

    // Havodagi g'ishtlar zanjiri
    for (let c = 44; c <= 48; c++) {
      this.blocks.push(new MarioBlock(c, 4, 'BRICK'));
    }

    // Toshbaqa (Koopa Troopa)
    this.enemies.push(new Koopa(46 * TILE_SIZE, 5 * TILE_SIZE));

    // 3-Yashil Quvur (Balandligi 2 blok)
    this.blocks.push(new MarioBlock(60, 1, 'PIPE'));
    this.blocks.push(new MarioBlock(60, 2, 'PIPE'));

    // Ikkita Goomba
    this.enemies.push(new Goomba(64 * TILE_SIZE, 36));
    this.enemies.push(new Goomba(67 * TILE_SIZE, 36));

    // Zinapoyalar (Stairs leading to Flagpole)
    const stairStart = 72;
    for (let s = 0; s < 5; s++) {
      for (let h = 1; h <= s + 1; h++) {
        this.blocks.push(new MarioBlock(stairStart + s, h, 'BRICK'));
      }
    }

    // Finish zinapoyasi
    const finishStair = 80;
    for (let s = 0; s < 6; s++) {
      for (let h = 1; h <= 6 - s; h++) {
        this.blocks.push(new MarioBlock(finishStair + s, h, 'BRICK'));
      }
    }

    // Havodagi erkin oltin tangalar
    [10, 11, 20, 21, 45, 46, 47].forEach(c => {
      this.coinsList.push(new MarioCoin(c * TILE_SIZE + 8, 3 * TILE_SIZE + 10));
    });

    this.flagpoleX = 92 * TILE_SIZE;
    if (this.threeRenderer) {
      this.threeRenderer.flagpoleX = this.flagpoleX;
      if (this.threeRenderer.flagpoleGroup) {
        this.threeRenderer.flagpoleGroup.position.x = 0;
      }
    }
  }

  // To'qnashuvlar (Block collision checks)
  checkBlockCollision(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    const block = this.blocks.find(b => b.col === col && b.row === row);
    return block && !block.isBroken;
  }

  getBlockAt(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    return this.blocks.find(b => b.col === col && b.row === row);
  }

  getGroundY(minX, maxX, currentY) {
    let highestGround = -100;
    const startCol = Math.floor(minX / TILE_SIZE);
    const endCol = Math.floor(maxX / TILE_SIZE);

    this.blocks.forEach(block => {
      if (block.isBroken) return;
      if (block.col >= startCol && block.col <= endCol) {
        const topY = (block.row + 1) * TILE_SIZE;
        // O'yinchi platformaning ustida bo'lsa va unga yaqin bo'lsa
        if (topY <= currentY + 14 && topY > highestGround) {
          highestGround = topY;
        }
      }
    });

    return highestGround;
  }

  bindEvents() {
    const resumeAudio = () => sounds.init();

    window.addEventListener('keydown', (e) => {
      resumeAudio();

      // P1 (Mario): A, D (Yugurish), Space / W (Sakrash), ShiftLeft / F (Run/Boost)
      if (e.code === 'KeyA') this.keysP1.left = true;
      if (e.code === 'KeyD') this.keysP1.right = true;
      if (['Space', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        this.player.jump(this);
      }
      if (['ShiftLeft', 'KeyF'].includes(e.code)) this.keysP1.run = true;

      // P2 (Luigi): O'qlar (Arrows), Enter / ArrowUp (Sakrash), ShiftRight / L (Run/Boost)
      if (e.code === 'ArrowLeft') { this.keysP2.left = true; this.lastP2InputTime = Date.now(); }
      if (e.code === 'ArrowRight') { this.keysP2.right = true; this.lastP2InputTime = Date.now(); }
      if (['Enter', 'NumpadEnter', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        this.lastP2InputTime = Date.now();
        this.player2.jump(this);
      }
      if (['ShiftRight', 'KeyL'].includes(e.code)) {
        this.lastP2InputTime = Date.now();
        this.keysP2.run = true;
      }

      // 3D / 2D Rejim
      if (e.code === 'KeyV') {
        e.preventDefault();
        this.toggleDimension();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyA') this.keysP1.left = false;
      if (e.code === 'KeyD') this.keysP1.right = false;
      if (['ShiftLeft', 'KeyF'].includes(e.code)) this.keysP1.run = false;

      if (e.code === 'ArrowLeft') this.keysP2.left = false;
      if (e.code === 'ArrowRight') this.keysP2.right = false;
      if (['ShiftRight', 'KeyL'].includes(e.code)) this.keysP2.run = false;
    });

    // Sensorli boshqaruv
    const setupBtn = (id, obj, key) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const start = (e) => { e.preventDefault(); resumeAudio(); obj[key] = true; };
      const end = (e) => { e.preventDefault(); obj[key] = false; };
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
    };

    setupBtn('dpad-left', this.keysP1, 'left');
    setupBtn('dpad-right', this.keysP1, 'right');

    const jumpBtn = document.getElementById('btn-action-jump');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        resumeAudio();
        this.player.jump(this);
      });
      jumpBtn.addEventListener('touchstart', (e) => {
        if (e) e.preventDefault();
        resumeAudio();
        this.player.jump(this);
      }, { passive: false });
    }

    // Modal tugmalar
    const handleStart = (e) => {
      if (e) e.preventDefault();
      resumeAudio();
      this.startFromFirstLevel();
    };

    if (this.btnStart) {
      this.btnStart.addEventListener('click', handleStart);
      this.btnStart.addEventListener('pointerdown', handleStart);
    }

    window.addEventListener('keydown', (e) => {
      if (this.state === 'START' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStart();
      }
    });

    if (this.btnRetryLevel) {
      this.btnRetryLevel.addEventListener('click', handleStart);
    }
    if (this.btnRestartVictory) {
      this.btnRestartVictory.addEventListener('click', handleStart);
    }
    if (this.btnNextLevel) {
      this.btnNextLevel.addEventListener('click', handleStart);
    }

    if (this.btnDimensionToggle) {
      this.btnDimensionToggle.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        resumeAudio();
        this.toggleDimension();
      });
    }

    if (this.btnSoundToggle) {
      this.btnSoundToggle.addEventListener('click', () => {
        resumeAudio();
        const m = sounds.toggleMute();
        this.btnSoundToggle.textContent = m ? '🔇' : '🔊';
        this.showToast(m ? "Ovoz o'chirildi" : "Ovoz yoqildi");
      });
    }
  }

  startFromFirstLevel() {
    this.player.reset();
    this.player2.reset();
    this.buildWorld1_1();
    this.state = 'PLAYING';
    this.timeLeft = 400;
    this.timeCounter = 0;

    [this.screenStart, this.screenGameOver, this.screenVictory, this.screenLevelComplete].forEach(s => {
      if (s) {
        s.classList.remove('active');
        s.style.display = 'none';
        s.style.pointerEvents = 'none';
      }
    });

    this.showToast("WORLD 1-1 Boshlandi! Shohona Mario va Luigi bilan olg'a! 🍄⭐");
    this.updateHUD();
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    if (this.shakeTimer > 0) this.shakeTimer--;

    // Vaqt hisoblagichi
    this.timeCounter++;
    if (this.timeCounter >= 60) {
      this.timeCounter = 0;
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.gameOver();
        return;
      }
      this.updateHUD();
    }

    // 1. O'YINCHI 1 HARAKATI (P1 - MARIO)
    this.handleMovement(this.player, this.keysP1);
    this.player.update(this);

    // 2. O'YINCHI 2 HARAKATI (P2 - LUIGI / HAMROH AI)
    const p2ManualActive = (Date.now() - this.lastP2InputTime < 3500);
    if (p2ManualActive) {
      this.handleMovement(this.player2, this.keysP2);
    } else if (!this.player2.inBubble && !this.player2.onFlagpole) {
      // Luigi avtomatik hamrohlik qiladi
      if (this.player.x > this.player2.x + 40) {
        this.player2.vx = 2.4;
        this.player2.facing = 1;
      } else if (this.player.x < this.player2.x - 40) {
        this.player2.vx = -2.4;
        this.player2.facing = -1;
      } else {
        this.player2.vx *= 0.8;
      }
      if (this.player.isJumping && this.player2.isGrounded && Math.random() < 0.08) {
        this.player2.jump(this);
      }
    }
    this.player2.update(this);

    // 3. BLOKLAR
    this.blocks.forEach(b => b.update());

    // 4. DUSHMANLAR
    this.enemies.forEach(e => {
      e.update(this);
      if (e.isAlive && !e.isStomped) {
        // O'yinchilar bilan to'qnashuv
        [this.player, this.player2].forEach(p => {
          if (!p.inBubble && !p.onFlagpole) {
            const isFalling = p.vy < 0;
            const hitFromAbove = (p.y - e.y >= e.height - 10) && isFalling;
            const horizOverlap = (p.x + p.width > e.x + 4) && (p.x < e.x + e.width - 4);
            const vertOverlap = (p.y < e.y + e.height) && (p.y + p.height > e.y);

            if (horizOverlap && vertOverlap) {
              if (hitFromAbove) {
                // Tepasidan ezish! (Stomp)
                e.stomp(p, this);
              } else {
                // Yonidan urilish
                if (e instanceof Koopa && e.isShell && !e.isSliding) {
                  // Tinch turgan kosani tepish
                  e.stomp(p, this);
                } else {
                  p.takeDamage(1, this);
                  this.updateHUD();
                }
              }
            }
          }
        });
      }
    });

    // 5. TANGALARNI YIG'ISH
    this.coinsList.forEach(coin => {
      coin.update();
      if (!coin.collected && !coin.fromBlock) {
        [this.player, this.player2].forEach(p => {
          if (!p.inBubble) {
            const dist = Math.hypot((p.x + p.width / 2) - (coin.x + 10), (p.y + 18) - (coin.y + 12));
            if (dist < 26) {
              coin.collected = true;
              p.coins += 1;
              p.score += 100;
              this.totalCoins += 1;
              sounds.playCoin();
              this.addFloatText("+100 🪙", coin.x, coin.y + 20, '#ffd54f');
              this.updateHUD();
            }
          }
        });
      }
    });

    // 6. QO'ZIQORINLAR
    this.mushrooms.forEach(mush => {
      mush.update(this);
      if (mush.isAlive && !mush.emerging) {
        [this.player, this.player2].forEach(p => {
          if (!p.inBubble) {
            const dist = Math.hypot((p.x + p.width / 2) - (mush.x + 14), (p.y + 18) - (mush.y + 14));
            if (dist < 32) {
              mush.isAlive = false;
              p.grow(this);
              p.score += 1000;
              this.updateHUD();
            }
          }
        });
      }
    });

    // 7. ZARRALAR VA MATNLAR
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);

    this.floatTexts.forEach(t => t.update());
    this.floatTexts = this.floatTexts.filter(t => t.life > 0);
  }

  handleMovement(player, keys) {
    if (player.inBubble || player.onFlagpole) return;

    const accel = player.isGrounded ? (keys.run ? 0.9 : 0.6) : 0.45;
    const maxSpd = keys.run ? 5.8 : 3.8;
    const friction = player.isGrounded ? 0.84 : 0.92;

    if (keys.left) {
      player.vx -= accel;
      player.facing = -1;
    }
    if (keys.right) {
      player.vx += accel;
      player.facing = 1;
    }

    if (!keys.left && !keys.right) {
      player.vx *= friction;
      if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    player.vx = Math.max(-maxSpd, Math.min(maxSpd, player.vx));
  }

  handleLevelComplete() {
    this.state = 'LEVEL_COMPLETE';
    sounds.playFlagpole();
    const lcTitle = document.getElementById('lc-title');
    if (lcTitle) lcTitle.textContent = "COURSE CLEAR! 🏆";
    const lcCoins = document.getElementById('lc-coins');
    if (lcCoins) lcCoins.textContent = \`\${this.totalCoins} 🪙\`;
    if (this.screenLevelComplete) {
      this.screenLevelComplete.style.display = 'flex';
      this.screenLevelComplete.style.pointerEvents = 'auto';
      this.screenLevelComplete.classList.add('active');
    }
  }

  gameOver() {
    this.state = 'GAMEOVER';
    sounds.playGameOver();
    const goCoins = document.getElementById('go-coins');
    if (goCoins) goCoins.textContent = \`\${this.totalCoins} 🪙\`;
    const goScore = document.getElementById('go-score');
    if (goScore) goScore.textContent = String(this.player.score + this.player2.score).padStart(6, '0');
    if (this.screenGameOver) {
      this.screenGameOver.style.display = 'flex';
      this.screenGameOver.style.pointerEvents = 'auto';
      this.screenGameOver.classList.add('active');
    }
  }

  updateHUD() {
    if (this.uiP1Hearts) {
      let str = '';
      for (let i = 0; i < this.player.maxHearts; i++) {
        str += i < this.player.hearts ? '❤️' : '🖤';
      }
      this.uiP1Hearts.textContent = str;
    }
    if (this.uiP2Hearts) {
      let str = '';
      for (let i = 0; i < this.player2.maxHearts; i++) {
        str += i < this.player2.hearts ? '💙' : '🖤';
      }
      this.uiP2Hearts.textContent = str;
    }

    if (this.uiP1Score) {
      this.uiP1Score.textContent = String(this.player.score).padStart(6, '0');
    }
    if (this.uiP2Score) {
      this.uiP2Score.textContent = String(this.player2.score).padStart(6, '0');
    }

    if (this.uiCoins) {
      this.uiCoins.textContent = String(this.totalCoins).padStart(2, '0');
    }

    if (this.uiTime) {
      this.uiTime.textContent = String(this.timeLeft);
    }
  }

  showToast(message) {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.uiToast.textContent = message;
    this.uiToast.classList.remove('toast-hidden');
    this.toastTimeout = setTimeout(() => {
      this.uiToast.classList.add('toast-hidden');
      this.toastTimeout = null;
    }, 2800);
  }

  addFloatText(text, x, y, color = '#ffd700') {
    this.floatTexts.push(new FloatText(text, x, y, color));
  }

  draw(dt = 16) {
    if (this.is3D && this.threeRenderer && this.threeRenderer.enabled) {
      this.threeRenderer.render(dt);
      return;
    }

    // 2D Klassik Canvas Fallback
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    // 2D Kamera: O'yinchilarni kuzatadi
    const midX = (this.player.x + this.player2.x) / 2;
    this.camera.x += (midX - this.canvas.width / 2 - this.camera.x) * 0.1;
    ctx.translate(-Math.round(this.camera.x), 720 - 40);
    ctx.scale(1, -1); // Canvas Y coordinate inversion

    // Bloklar
    this.blocks.forEach(b => {
      if (b.isBroken) return;
      ctx.fillStyle = b.type === 'GROUND' ? '#795548' : (b.type === 'QUESTION' ? '#ffb300' : '#b71c1c');
      ctx.fillRect(b.x, b.y + b.getOffsetY(), b.width, b.height);
    });

    // Qahramonlar
    this.player.draw2D(ctx);
    this.player2.draw2D(ctx);

    // Dushmanlar
    this.enemies.forEach(e => {
      if (!e.isAlive) return;
      ctx.fillStyle = e instanceof Goomba ? '#5d4037' : '#2e7d32';
      ctx.fillRect(e.x, e.y, e.width, e.height);
    });

    ctx.restore();
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    try {
      this.update(dt);
      this.draw(dt);
    } catch(err) {
      console.error("Mario game loop xatosi:", err);
      if (this.is3D) {
        this.is3D = false;
        if (this.threeCanvas) this.threeCanvas.style.display = 'none';
        if (this.canvas) this.canvas.style.display = 'block';
      }
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}

// ===================================================================
// 5. O'YINNI ISHGA TUSHIRISH (ENTRY POINT)
// ===================================================================
let game = null;

function initGame() {
  if (window.game) return;
  game = new GameEngine();
  window.game = game;
  requestAnimationFrame((t) => game.loop(t));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
`;

fs.writeFileSync(scriptPath, fullScript, 'utf8');
console.log("Full Super Mario 3D game code written successfully!");

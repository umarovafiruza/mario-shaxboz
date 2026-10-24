const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');

const marioGameCode = `/**
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

  // Mario Sakrash ovozi (Smooth pitch sweep up: 160Hz -> 600Hz)
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

  // Quvurdan tushish (Pipe warp)
  playPipe() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.27);
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
    this.vy -= 0.3; // Gravity for particles
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

    // Gravitatsiya
    this.vy -= GRAVITY;
    this.x += this.vx;

    // Gorizontal to'qnashuv (quvur yoki blokga ursa qaytish)
    if (engine.checkBlockCollision(this.x + (this.vx > 0 ? this.width : 0), this.y + 10)) {
      this.vx = -this.vx;
    }

    this.y += this.vy;

    // Yer bilan to'qnashuv
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
        // Katta Mario g'ishtni parchalab yuboradi!
        sounds.playBreak();
        this.isBroken = true;
        player.score += 50;
        engine.addFloatText("+50 🧱", this.x + 8, this.y + 20, '#ffab91');
        // 4 ta parchalangan tosh
        for (let i = 0; i < 6; i++) {
          engine.particles.push(new Particle(
            this.x + 18, this.y + 18, '#8d6e63',
            (Math.random() - 0.5) * 6, Math.random() * 5 + 3, 5, 25
          ));
        }
      } else {
        // Kichik Mario urganda g'isht sapchib qaytadi
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

// 💀 Dushman 1: Goomba (Qo'ziqorinsimon Skelet)
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

    // Devor yoki quvurga ursa burilish
    if (engine.checkBlockCollision(this.x + (this.vx > 0 ? this.width : 0), this.y + 10)) {
      this.vx = -this.vx;
    }

    this.y += this.vy;

    const groundY = engine.getGroundY(this.x, this.x + this.width, this.y);
    if (this.y <= groundY) {
      this.y = groundY;
      this.vy = 0;
    }

    // Jarga tushib ketgan dushmanni o'chirish
    if (this.y < -100) {
      this.isAlive = false;
    }
  }

  stomp(player, engine) {
    if (this.isStomped || !this.isAlive) return;
    this.isStomped = true;
    this.squishTimer = 22;
    sounds.playStomp();
    player.vy = 9.8; // Sakrab qaytish
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

// 🐢 Dushman 2: Koopa Troopa (Toshbaqa)
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

    // Devorga ursa teskari burilish
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

    // Sirpanayotgan kosa yo'lidagi barcha gumbasimon dushmanlarni urib yuboradi!
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
      // Birinchi marta ezilganda kosaga kiradi
      this.isShell = true;
      this.isSliding = false;
      this.vx = 0;
      this.height = 24;
      sounds.playStomp();
      player.vy = 9.5;
      player.score += 100;
      engine.addFloatText("100 🐢", this.x + 4, this.y + 25, '#69f0ae');
    } else if (!this.isSliding) {
      // Kosani tepish (Kick shell)
      this.isSliding = true;
      this.vx = player.x < this.x ? 9.5 : -9.5;
      sounds.playBump();
      player.score += 400;
      engine.addFloatText("TEPISH! 🚀", this.x, this.y + 25, '#ffd54f');
    } else {
      // Yugurayotgan kosani to'xtatish
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
    this.role = role; // 'MARIO' yoki 'LUIGI'
    this.id = id;
    this.name = id === 1 ? "Shohona Mario (👑)" : "Shohona Luigi (⚔️)";
    this.width = 24;
    this.height = 36;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1: o'ng, -1: chap
    this.isGrounded = false;
    this.isBig = false;
    this.isJumping = false;
    this.invulnerableTimer = 0;
    this.hearts = 3;
    this.maxHearts = 3;
    this.score = 0;
    this.coins = 0;
    this.walkAnim = 0;

    // Co-op Pufakda Qutqarish (Rescue Bubble)
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
      // Luigi biroz balandroq va yengilroq sakraydi!
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
        // Hamkori tirik bo'lsa, qutqaruv pufagiga kiradi!
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

    // 🫧 Pufakda suzib yurish (Co-Op Rescue Bubble)
    if (this.inBubble) {
      const partner = this.id === 1 ? engine.player2 : engine.player;
      if (partner && !partner.inBubble) {
        const dx = (partner.x - 35) - this.x;
        const dy = (partner.y + 45) - this.y;
        this.x += dx * 0.05;
        this.y += dy * 0.05;

        // Sherigi unga sakrab tegsa pufak yoriladi va qutqariladi!
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
        this.x += 1.8; // Qasr eshigi tomon yurish
        if (this.x >= engine.flagpoleX + 180 && !this.finishedLevel) {
          this.finishedLevel = true;
          engine.handleLevelComplete();
        }
      }
      return;
    }

    // Fizika: Gravitatsiya
    this.vy -= GRAVITY;
    if (this.vy < -15) this.vy = -15; // Max fall speed

    // Gorizontal harakat va to'qnashuvlar
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

    // Vertikal harakat va bosh bilan bloklarni urish (Head bump)
    const nextY = this.y + this.vy;

    if (this.vy > 0) {
      // Yuqoriga sakrayotganda bosh bilan urilish
      const hitBlock = engine.getBlockAt(this.x + this.width / 2, nextY + this.height);
      if (hitBlock && !hitBlock.isBroken && hitBlock.type !== 'PIPE') {
        this.vy = -1.2;
        hitBlock.bump(this, engine);
      } else {
        this.y = nextY;
      }
    } else {
      // Pastga tushayotganda yer/platformaga qo'nish
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

    // Harakatlanish animatsiyasi
    if (Math.abs(this.vx) > 0.2 && this.isGrounded) {
      this.walkAnim += Math.abs(this.vx) * 0.12;
    }

    // Jarga qulashni tekshirish
    if (this.y < -60) {
      this.y = -60;
      this.takeDamage(3, engine);
    }

    // 🚩 Finish Bayrog'i ustunini tekshirish
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

    // Oyoqlar
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-8 + legSwing, 0, 7, 10);
    ctx.fillRect(1 - legSwing, 0, 7, 10);

    // Kombinezon
    ctx.fillStyle = overallColor;
    ctx.fillRect(-9, 8, 18, this.isBig ? 24 : 16);

    // Oltin tugmalar
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-6, this.isBig ? 20 : 14, 3, 3);
    ctx.fillRect(3, this.isBig ? 20 : 14, 3, 3);

    // Ko'ylak
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-10, this.isBig ? 24 : 16, 20, 8);

    // Bosh va kepka
    const headY = this.isBig ? 32 : 24;
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, headY + 6, 8, 0, Math.PI * 2);
    ctx.fill();

    // Mo'ylov
    ctx.fillStyle = '#212121';
    ctx.fillRect(1, headY + 4, 6, 3);

    // Kepka
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-8, headY + 8, 18, 7, 3);
    ctx.fill();

    // Shohona Toj (Kepka ustidagi toj!)
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
`;

fs.writeFileSync(scriptPath, marioGameCode, 'utf8');
console.log("Mario base classes written successfully!");

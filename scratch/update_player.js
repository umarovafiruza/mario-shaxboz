const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
let content = fs.readFileSync(scriptPath, 'utf8');

// 1. Replace class Player
const playerStart = content.indexOf('class Player {');
const carStart = content.indexOf('class Car {');

if (playerStart === -1 || carStart === -1) {
  console.error("Player or Car class not found!");
  process.exit(1);
}

const newPlayerCode = `class Player {
  constructor(startX, startY, role = 'KING', id = 1) {
    this.spawnX = startX;
    this.spawnY = startY;
    this.x = startX;
    this.y = startY;
    this.role = role; // 'KING' (P1) yoki 'PRINCE' (P2)
    this.id = id;
    this.name = id === 1 ? "1-O'yinchi (👑 Qirol)" : "2-O'yinchi (⚔️ Shahzoda)";
    this.radius = 14;
    this.speed = 3.2;
    this.carSpeed = 5.4;
    this.hearts = 3;
    this.maxHearts = 3;
    this.coins = 0;
    this.keys = 0;
    this.inVehicle = false;
    this.invulnerableTimer = 0;
    this.direction = 'down'; // 'down', 'up', 'left', 'right'
    this.walkAnim = 0;
    this.isMoving = false;
    this.isDowned = false; // Hamkorlikda yiqilish holati
    this.downedAnim = 0;

    // Qirol va Qurol (King & Royal Weapon)
    this.swordAttackTimer = 0;
    this.swordCooldown = 0;
    this.attackAngle = Math.PI / 2;

    // Sakrash (Jump Mechanics — Shift)
    this.isJumping = false;
    this.jumpTimer = 0;
    this.jumpDuration = 22;
    this.jumpCooldown = 0;
    this.jumpHeight = 0;
    this.jumpDirX = 0;
    this.jumpDirY = 0;
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.hearts = 3;
    this.coins = 0;
    this.keys = 0;
    this.inVehicle = false;
    this.invulnerableTimer = 0;
    this.direction = 'down';
    this.swordAttackTimer = 0;
    this.swordCooldown = 0;
    this.isJumping = false;
    this.jumpTimer = 0;
    this.jumpCooldown = 0;
    this.jumpHeight = 0;
    this.isDowned = false;
  }

  respawnAtSpawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.inVehicle = false;
    this.invulnerableTimer = 70;
    this.swordAttackTimer = 0;
    this.swordCooldown = 0;
    this.isJumping = false;
    this.jumpTimer = 0;
    this.jumpCooldown = 0;
    this.jumpHeight = 0;
  }

  jump(engine) {
    if (this.inVehicle || this.isJumping || this.jumpCooldown > 0 || this.isDowned) return;

    this.isJumping = true;
    this.jumpTimer = this.jumpDuration;
    this.jumpCooldown = 26;

    let dx = 0;
    let dy = 0;
    const keys = this.id === 1 ? engine.keysP1 : engine.keysP2;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;

    if (dx === 0 && dy === 0) {
      switch (this.direction) {
        case 'right': dx = 1; break;
        case 'left': dx = -1; break;
        case 'up': dy = -1; break;
        case 'down': dy = 1; break;
      }
    }
    const len = Math.hypot(dx, dy) || 1;
    this.jumpDirX = dx / len;
    this.jumpDirY = dy / len;

    sounds.playJump();
    engine.addFloatText(\`\${this.id === 1 ? '👑' : '⚔️'} SAKRASH! 🦘\`, this.x, this.y - 30, this.id === 1 ? '#81d4fa' : '#80d8ff');

    for (let i = 0; i < 6; i++) {
      engine.particles.push(new Particle(
        this.x, this.y + 12, '#cfd8dc',
        (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.5, 2.5, 14
      ));
    }
  }

  update(engine) {
    if (this.isDowned) {
      this.downedAnim++;
      this.isMoving = false;
      this.isJumping = false;
      this.jumpHeight = 0;
      return;
    }

    if (this.swordCooldown > 0) this.swordCooldown--;
    if (this.swordAttackTimer > 0) this.swordAttackTimer--;
    if (this.jumpCooldown > 0) this.jumpCooldown--;

    if (this.isJumping) {
      this.jumpTimer--;
      const progress = 1 - (this.jumpTimer / this.jumpDuration);
      this.jumpHeight = Math.sin(progress * Math.PI) * 26;

      const jSpeed = 4.2;
      const nextX = this.x + this.jumpDirX * jSpeed;
      const nextY = this.y + this.jumpDirY * jSpeed;

      const mRows = engine.mapRows || MAP_ROWS;
      const mCols = engine.mapCols || MAP_COLS;
      const colX = Math.floor(nextX / TILE_SIZE);
      const rowY = Math.floor(nextY / TILE_SIZE);

      if (rowY >= 0 && rowY < mRows && colX >= 0 && colX < mCols) {
        const t = engine.currentMap[rowY][colX];
        if (t !== TILE.SEA && t !== TILE.ROCK && t !== TILE.RUIN_WALL) {
          this.x = nextX;
          this.y = nextY;
        }
      }

      if (this.jumpTimer <= 0) {
        this.isJumping = false;
        this.jumpHeight = 0;
        for (let i = 0; i < 8; i++) {
          engine.particles.push(new Particle(
            this.x, this.y + 12, '#b0bec5',
            (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 1.5, 3, 16
          ));
        }
      }
    } else {
      this.jumpHeight = 0;
    }
  }

  attack(engine, customAngle = null) {
    if (this.inVehicle || this.swordCooldown > 0 || this.isDowned) return;

    // Sherikni qutqarish (Revive Downed Partner)
    const partner = this.id === 1 ? engine.player2 : engine.player;
    if (partner && partner.isDowned) {
      const distToPartner = Math.hypot(this.x - partner.x, this.y - partner.y);
      if (distToPartner < 55) {
        partner.isDowned = false;
        partner.hearts = 1;
        partner.invulnerableTimer = 90;
        sounds.playVictory();
        engine.addFloatText("QUTQARILDI! +1 ❤️", partner.x, partner.y - 30, '#00e676');
        engine.showToast(\`\${this.name} \${partner.name}ni qayta jangga qaytardi! 🤝❤️\`);
        for (let i = 0; i < 20; i++) {
          const spAngle = Math.random() * Math.PI * 2;
          const spd = 2 + Math.random() * 3;
          engine.particles.push(new Particle(
            partner.x, partner.y, '#00e676',
            Math.cos(spAngle) * spd, Math.sin(spAngle) * spd, 3.5, 25
          ));
        }
        engine.updateHUD();
        this.swordCooldown = 15;
        return;
      }
    }

    this.swordAttackTimer = 16;
    this.swordCooldown = 18;

    let angle = 0;
    if (customAngle !== null) {
      angle = customAngle;
      const deg = angle * (180 / Math.PI);
      if (deg >= -45 && deg <= 45) this.direction = 'right';
      else if (deg > 45 && deg < 135) this.direction = 'down';
      else if (deg >= -135 && deg < -45) this.direction = 'up';
      else this.direction = 'left';
    } else {
      switch (this.direction) {
        case 'right': angle = 0; break;
        case 'down': angle = Math.PI / 2; break;
        case 'left': angle = Math.PI; break;
        case 'up': angle = -Math.PI / 2; break;
      }
    }
    this.attackAngle = angle;

    sounds.playSword();
    engine.triggerScreenShake(3, 6);

    const strikeX = this.x + Math.cos(angle) * 32;
    const strikeY = this.y + Math.sin(angle) * 32;

    // Dushmanlarni zarb bilan urish
    engine.enemies.forEach(enemy => {
      if (!enemy.isAlive) return;
      const dist = Math.hypot(enemy.x - strikeX, enemy.y - strikeY);
      if (dist < 46) {
        enemy.hp -= 2;
        enemy.x += Math.cos(angle) * 24;
        enemy.y += Math.sin(angle) * 24;
        engine.addFloatText("-2 ⚔️", enemy.x, enemy.y - 20, '#ffeb3b');
        sounds.playCrash();

        for (let i = 0; i < 9; i++) {
          const spAngle = Math.random() * Math.PI * 2;
          const spd = 2 + Math.random() * 3;
          engine.particles.push(new Particle(
            enemy.x, enemy.y, '#ffd54f',
            Math.cos(spAngle) * spd, Math.sin(spAngle) * spd, 3, 20
          ));
        }

        if (enemy.hp <= 0) {
          enemy.isAlive = false;
          this.coins += 4;
          engine.addFloatText(\`\${this.id === 1 ? '👑 P1' : '⚔️ P2'} +4 🪙\`, enemy.x, enemy.y - 25, '#69f0ae');
          engine.showToast(\`\${this.name} dushmanni qilich zarbasidan qulatdi! ⚔️💀\`);
          for (let i = 0; i < 16; i++) {
            const spAngle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 4;
            engine.particles.push(new Particle(
              enemy.x, enemy.y, '#d32f2f',
              Math.cos(spAngle) * spd, Math.sin(spAngle) * spd, 4, 30
            ));
          }
          engine.updateHUD();
        }
      }
    });

    // Bochalarni urib sindirish
    const checkTiles = [
      { x: strikeX, y: strikeY },
      { x: this.x + Math.cos(angle) * 44, y: this.y + Math.sin(angle) * 44 }
    ];
    for (const pt of checkTiles) {
      const col = Math.floor(pt.x / TILE_SIZE);
      const row = Math.floor(pt.y / TILE_SIZE);
      if (row >= 0 && row < engine.mapRows && col >= 0 && col < engine.mapCols) {
        if (engine.currentMap[row][col] === TILE.BARREL) {
          engine.currentMap[row][col] = TILE.ROAD;
          sounds.playCrash();
          this.coins += 2;
          engine.addFloatText("+2 🪙", col * TILE_SIZE + 20, row * TILE_SIZE + 10, '#ffd54f');
          engine.showToast("Bochka sindirildi va tangalar olindi! 🪙");
          for (let i = 0; i < 12; i++) {
            const spAngle = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 3;
            engine.particles.push(new Particle(
              col * TILE_SIZE + 20, row * TILE_SIZE + 20, '#8d6e63',
              Math.cos(spAngle) * spd, Math.sin(spAngle) * spd, 3, 24
            ));
          }
          engine.updateHUD();
          break;
        }
      }
    }
  }

  takeDamage(amount = 1, engine) {
    if (this.invulnerableTimer > 0 || this.isDowned) return false;
    this.hearts = Math.max(0, this.hearts - amount);
    this.invulnerableTimer = 80;
    sounds.playHurt();
    if (engine) {
      engine.addFloatText(\`\${this.id === 1 ? '👑' : '⚔️'} -1 ❤️\`, this.x, this.y - 20, '#ff4d4d');
      engine.triggerScreenShake(4, 9);
      for (let i = 0; i < 9; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 1.5 + Math.random() * 2;
        engine.particles.push(new Particle(
          this.x, this.y, '#e53935',
          Math.cos(angle) * spd, Math.sin(angle) * spd, 3, 25
        ));
      }
    }

    if (this.hearts <= 0) {
      const partner = this.id === 1 ? engine.player2 : engine.player;
      if (partner && !partner.isDowned && partner.hearts > 0) {
        this.isDowned = true;
        if (this.inVehicle) {
          this.inVehicle = false;
        }
        sounds.playFall();
        engine.showToast(\`⚠️ \${this.name} yiqildi! Sherigi kelib uni qutqarishi kerak! 🆘\`);
        engine.addFloatText("YIQILDI! 🆘", this.x, this.y - 25, '#ff1744');
      } else {
        engine.gameOver();
      }
    }
    return true;
  }

  draw(ctx) {
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 6) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.inVehicle) {
      this.drawInCar(ctx);
    } else {
      this.drawOnFoot(ctx);
    }

    // Player ID Tag va Yiqilgan holat indikatori (P1 / P2)
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    if (this.isDowned) {
      const pulse = Math.sin(Date.now() * 0.01) * 2;
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(-38, -48 + pulse, 76, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText("🆘 QUTQARISH!", 0, -35 + pulse);
    } else {
      ctx.fillStyle = this.id === 1 ? 'rgba(183, 28, 28, 0.85)' : 'rgba(13, 71, 161, 0.85)';
      ctx.fillRect(-18, -42 - this.jumpHeight, 36, 15);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.id === 1 ? '👑 P1' : '⚔️ P2', 0, -31 - this.jumpHeight);
    }

    ctx.restore();
  }

  drawOnFoot(ctx) {
    const bob = (this.isMoving && !this.isJumping) ? Math.sin(this.walkAnim * 0.3) * 2.5 : 0;
    const legOffset = (this.isMoving && !this.isJumping) ? Math.sin(this.walkAnim * 0.3) * 5 : 0;

    const shadowScale = Math.max(0.4, 1 - (this.jumpHeight / 36));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 14 * shadowScale, 6.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, -this.jumpHeight);

    if (this.isDowned) {
      // Yiqilgan holat
      ctx.rotate(Math.PI / 2.5);
    }

    // Shohona Plash (P1: Qizil, P2: Moviy)
    const capeColor = this.id === 1 ? '#b71c1c' : '#0288d1';
    const capeBorder = this.id === 1 ? '#ffd54f' : '#b2ebf2';
    const capeSway = (this.isMoving || this.isJumping) ? Math.sin(this.walkAnim * 0.25) * 4 : 0;
    ctx.fillStyle = capeColor;
    ctx.beginPath();
    ctx.moveTo(-11, -3 + bob);
    ctx.quadraticCurveTo(-14 + capeSway, 14 + bob, -8 + capeSway, 18 + bob);
    ctx.lineTo(8 + capeSway, 18 + bob);
    ctx.quadraticCurveTo(14 + capeSway, 14 + bob, 11, -3 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = capeBorder;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Etiklar va oyoqlar
    ctx.fillStyle = this.id === 1 ? '#1e293b' : '#0d1b2a';
    ctx.fillRect(-8, 8 + legOffset, 5, 8);
    ctx.fillRect(3, 8 - legOffset, 5, 8);
    ctx.fillStyle = this.id === 1 ? '#ffc107' : '#cfd8dc';
    ctx.fillRect(-8, 12 + legOffset, 5, 2);
    ctx.fillRect(3, 12 - legOffset, 5, 2);

    // Kamzul (P1: Qizil baxmal, P2: Moviy admiral)
    const coatColor = this.id === 1 ? '#c62828' : '#1565c0';
    ctx.fillStyle = coatColor;
    ctx.beginPath();
    ctx.roundRect(-10, -5 + bob, 20, 16, 4);
    ctx.fill();

    ctx.fillStyle = this.id === 1 ? '#ffd54f' : '#eceff1';
    ctx.fillRect(-10, -1 + bob, 20, 2.5);
    ctx.fillRect(-10, 5 + bob, 20, 2.5);

    ctx.fillStyle = '#212121';
    ctx.fillRect(-10, 8 + bob, 20, 3.5);
    ctx.fillStyle = this.id === 1 ? '#ffd54f' : '#cfd8dc';
    ctx.fillRect(-3, 7.5 + bob, 6, 4.5);

    // Bosh va yuz
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, -11 + bob, 10, 0, Math.PI * 2);
    ctx.fill();

    // Ko'zlar
    ctx.fillStyle = '#111';
    if (this.direction === 'left') {
      ctx.beginPath();
      ctx.arc(-4, -11 + bob, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(-3, -11 + bob, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(4, -11 + bob, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(4, -11 + bob, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mo'ylov (Faqat P1 Qirol uchun)
    if (this.id === 1) {
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-5, -6 + bob);
      ctx.lineTo(0, -7 + bob);
      ctx.lineTo(5, -6 + bob);
      ctx.stroke();
    }

    // Qaroqchilar bosh kiyimi
    ctx.fillStyle = this.id === 1 ? '#1a202c' : '#0d47a1';
    ctx.beginPath();
    ctx.moveTo(-16, -15 + bob);
    ctx.quadraticCurveTo(0, -28 + bob, 16, -15 + bob);
    ctx.lineTo(12, -19 + bob);
    ctx.quadraticCurveTo(0, -21 + bob, -12, -19 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.id === 1 ? '#ffb300' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pat (Plume)
    ctx.fillStyle = this.id === 1 ? '#e53935' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-8, -20 + bob);
    ctx.quadraticCurveTo(-14, -28 + bob, -6, -26 + bob);
    ctx.fill();

    // TOJ / SARKARDA BELGISI (P1: Oltin toj, P2: Safir toj)
    ctx.fillStyle = this.id === 1 ? '#ffc107' : '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(-9, -21 + bob);
    ctx.lineTo(-9, -28 + bob);
    ctx.lineTo(-4, -24 + bob);
    ctx.lineTo(0, -30 + bob);
    ctx.lineTo(4, -24 + bob);
    ctx.lineTo(9, -28 + bob);
    ctx.lineTo(9, -21 + bob);
    ctx.closePath();
    ctx.fill();

    // Toj yoqutlari
    ctx.fillStyle = this.id === 1 ? '#d32f2f' : '#2979ff';
    ctx.beginPath();
    ctx.arc(-9, -28 + bob, 1.6, 0, Math.PI * 2);
    ctx.arc(0, -30 + bob, 2.0, 0, Math.PI * 2);
    ctx.arc(9, -28 + bob, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // QO'LIDAGI QUROL (P1: Qilich, P2: Rapiya)
    ctx.save();
    let handX = 8;
    let handY = 2 + bob;
    let baseAngle = 0.5;

    if (this.direction === 'left') {
      handX = -8;
      baseAngle = Math.PI - 0.5;
    } else if (this.direction === 'up') {
      handX = 6;
      handY = -4 + bob;
      baseAngle = -Math.PI / 2 + 0.3;
    } else if (this.direction === 'right') {
      handX = 8;
      baseAngle = 0.4;
    } else {
      handX = 8;
      baseAngle = Math.PI / 3;
    }

    if (this.swordAttackTimer > 0) {
      const progress = 1 - (this.swordAttackTimer / 16);
      baseAngle = this.attackAngle - 1.0 + progress * 2.0;

      ctx.save();
      ctx.strokeStyle = this.id === 1 ? 'rgba(255, 235, 59, 0.9)' : 'rgba(0, 229, 255, 0.9)';
      ctx.lineWidth = 4;
      ctx.shadowColor = this.id === 1 ? '#ffd700' : '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, bob, 32, this.attackAngle - 0.9, this.attackAngle + 0.9);
      ctx.stroke();
      ctx.restore();
    }

    ctx.translate(handX, handY);
    ctx.rotate(baseAngle);

    ctx.fillStyle = this.id === 1 ? '#ffb300' : '#cfd8dc';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.id === 1 ? '#ffd54f' : '#90a4ae';
    ctx.fillRect(-1.5, -4, 3, 8);

    ctx.fillStyle = '#eceff1';
    ctx.fillRect(0, -1.8, 22, 3.6);
    ctx.beginPath();
    ctx.moveTo(22, -1.8);
    ctx.lineTo(27, 0);
    ctx.lineTo(22, 1.8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, -1, 16, 1.2);

    ctx.restore();

    ctx.restore();
  }

  drawInCar(ctx) {
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, -6, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-3, -6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(3, -6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(3, -6, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.id === 1 ? '#1a202c' : '#0d47a1';
    ctx.beginPath();
    ctx.moveTo(-14, -10);
    ctx.quadraticCurveTo(0, -22, 14, -10);
    ctx.lineTo(10, -14);
    ctx.quadraticCurveTo(0, -16, -10, -14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.id === 1 ? '#ffc107' : '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(-6, -16);
    ctx.lineTo(-6, -22);
    ctx.lineTo(-3, -19);
    ctx.lineTo(0, -24);
    ctx.lineTo(3, -19);
    ctx.lineTo(6, -22);
    ctx.lineTo(6, -16);
    ctx.closePath();
    ctx.fill();
  }
}
`;

content = content.substring(0, playerStart) + newPlayerCode + '\n\n' + content.substring(carStart);
fs.writeFileSync(scriptPath, content, 'utf8');
console.log("Player class updated successfully!");

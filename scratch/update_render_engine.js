const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
let content = fs.readFileSync(scriptPath, 'utf8');

const threeRendererIdx = content.indexOf('class ThreeRenderer {');
const entryPointIdx = content.indexOf('// ===================================================================\n// 7. O\'YINNI ISHGA TUSHIRISH (ENTRY POINT)');

if (threeRendererIdx === -1 || entryPointIdx === -1) {
  console.error("Markers not found! threeRendererIdx:", threeRendererIdx, "entryPointIdx:", entryPointIdx);
  process.exit(1);
}

const replacementCode = `class ThreeRenderer {
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
      this.renderer.toneMappingExposure = 1.22;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (err) {
      console.warn("WebGL renderer initialize failed, 2D rejimga o'tildi:", err);
      this.enabled = false;
      return;
    }

    this.enabled = true;

    // 3D Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x38bdf8);
    this.scene.fog = new THREE.FogExp2(0x7dd3fc, 0.00045);

    // 3D Kamera
    this.camera = new THREE.PerspectiveCamera(46, 960 / 720, 10, 4200);
    this.camera.position.set(0, 320, 260);

    // Guruhlar
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);

    this.entitiesGroup = new THREE.Group();
    this.scene.add(this.entitiesGroup);

    this.enemyMeshes = new Map();
    this.allyMeshes = new Map();
    this.coinMeshes = new Map();
    this.keyMeshes = new Map();
    this.bulletMeshes = new Map();

    this.palmLeaves = [];
    this.lastBuiltLevel = -1;
    this.time = 0;

    this.setupLights();
    this.setupSkyAndClouds();
    this.setupOcean();
    this.setupPlayer1Mesh();
    this.setupPlayer2Mesh();
    this.setupCarMesh();
    this.setupChestMesh();
  }

  setupLights() {
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x0284c7, 0.65);
    this.scene.add(hemiLight);

    const ambLight = new THREE.AmbientLight(0xfff7ed, 0.55);
    this.scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.35);
    dirLight.position.set(300, 700, 420);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 50;
    dirLight.shadow.camera.far = 2400;
    const d = 850;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0006;
    this.scene.add(dirLight);
    this.scene.add(dirLight.target);
    this.sunLight = dirLight;
  }

  setupSkyAndClouds() {
    this.cloudsGroup = new THREE.Group();
    this.scene.add(this.cloudsGroup);
    this.clouds = [];

    const cloudGeo = new THREE.DodecahedronGeometry(1, 1);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    });

    for (let i = 0; i < 12; i++) {
      const cGrp = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(cloudGeo, cloudMat);
        const s = 14 + Math.random() * 18;
        puff.scale.set(s * 1.3, s * 0.75, s);
        puff.position.set(
          (p - puffCount / 2) * 16 + (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 14
        );
        cGrp.add(puff);
      }
      const initX = Math.random() * 2200 - 300;
      const initZ = Math.random() * 1600 - 300;
      const initY = 240 + Math.random() * 80;
      cGrp.position.set(initX, initY, initZ);
      cGrp.speed = 4 + Math.random() * 5;
      this.cloudsGroup.add(cGrp);
      this.clouds.push(cGrp);
    }
  }

  setupOcean() {
    const oceanGeo = new THREE.PlaneGeometry(4200, 4200, 44, 44);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0077be,
      roughness: 0.12,
      metalness: 0.45,
      flatShading: true
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.set(800, -6, 520);
    this.oceanMesh.receiveShadow = true;
    this.scene.add(this.oceanMesh);
    this.oceanGeo = oceanGeo;
    this.oceanPosBase = oceanGeo.attributes.position.array.slice();
  }

  createDownedBadge() {
    const grp = new THREE.Group();
    grp.position.set(0, 48, 0);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(8, 1.4, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd54f })
    );
    grp.add(ring);

    const cross1 = new THREE.Mesh(
      new THREE.BoxGeometry(10, 3, 2),
      new THREE.MeshBasicMaterial({ color: 0xff1744 })
    );
    grp.add(cross1);
    const cross2 = new THREE.Mesh(
      new THREE.BoxGeometry(3, 10, 2),
      new THREE.MeshBasicMaterial({ color: 0xff1744 })
    );
    grp.add(cross2);

    grp.visible = false;
    return grp;
  }

  setupPlayer1Mesh() {
    this.playerGroup = new THREE.Group();

    // Soya
    const shadowGeo = new THREE.CircleGeometry(16, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 });
    this.playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.playerShadow.position.y = 0.5;
    this.scene.add(this.playerShadow);

    // Oyoqlar / Etiklar
    const legMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 });
    this.playerLeftLeg = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 12), legMat);
    this.playerLeftLeg.position.set(-6, 6, 0);
    this.playerLeftLeg.castShadow = true;
    this.playerGroup.add(this.playerLeftLeg);

    this.playerRightLeg = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 12), legMat);
    this.playerRightLeg.position.set(6, 6, 0);
    this.playerRightLeg.castShadow = true;
    this.playerGroup.add(this.playerRightLeg);

    // Gavda (Qirol baxmal kamzuli - Crimson Velvet Coat)
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.5 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(18, 16, 12), coatMat);
    torso.position.y = 18;
    torso.castShadow = true;
    this.playerGroup.add(torso);

    // Kamar va Oltin to'qa
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(19, 3.5, 13), beltMat);
    belt.position.y = 12.5;
    this.playerGroup.add(belt);

    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 });
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(5.5, 5.5, 13.8), buckleMat);
    buckle.position.y = 12.5;
    this.playerGroup.add(buckle);

    // Oltin tugmalar va epauletlar
    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), buckleMat);
      btn.position.set(0, 15 + b * 4, 6.2);
      this.playerGroup.add(btn);
    }
    const epauletL = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 8), buckleMat);
    epauletL.position.set(-9.5, 25.5, 0);
    this.playerGroup.add(epauletL);
    const epauletR = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 8), buckleMat);
    epauletR.position.set(9.5, 25.5, 0);
    this.playerGroup.add(epauletR);

    // Bosh
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 14), headMat);
    head.position.y = 31;
    head.castShadow = true;
    this.playerGroup.add(head);

    // Qaroqchi ko'z bog'ichi
    const patchMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyePatch = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), patchMat);
    eyePatch.position.set(3, 32.5, 5.8);
    this.playerGroup.add(eyePatch);

    // 👑 QIROL TOJI (3D Golden Crown with Rubies)
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 36.8, 0);
    const crownRim = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4, 6.0, 3, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 })
    );
    crownGroup.add(crownRim);

    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 4.8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 })
      );
      spike.position.set(Math.cos(ang) * 5.8, 3.4, Math.sin(ang) * 5.8);
      crownGroup.add(spike);

      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xd50000, roughness: 0.1, metalness: 0.2, emissive: 0x600000 })
      );
      gem.position.set(Math.cos(ang) * 5.8, 5.4, Math.sin(ang) * 5.8);
      crownGroup.add(gem);
    }
    this.playerGroup.add(crownGroup);

    // 🚩 QIZIL SHOHONA PLASH (Flowing Crimson Cape)
    const capeGeo = new THREE.PlaneGeometry(16, 22, 4, 6);
    capeGeo.translate(0, -9, -7);
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0xc62828,
      side: THREE.DoubleSide,
      roughness: 0.5
    });
    this.playerCape = new THREE.Mesh(capeGeo, capeMat);
    this.playerCape.position.y = 25;
    this.playerCape.castShadow = true;
    this.playerGroup.add(this.playerCape);

    // ⚔️ AFSONAVIY QILICH (Steel Cutlass)
    this.swordGroup = new THREE.Group();
    this.swordGroup.position.set(12, 18, 5);

    const swordGuard = new THREE.Mesh(
      new THREE.BoxGeometry(2, 6, 2),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 })
    );
    this.swordGroup.add(swordGuard);

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 24, 4),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.95, roughness: 0.1 })
    );
    blade.position.set(0, 12, 0);
    blade.castShadow = true;
    this.swordGroup.add(blade);
    this.playerGroup.add(this.swordGroup);

    // Zarb effekti
    const slashGeo = new THREE.RingGeometry(18, 30, 20, 1, 0, Math.PI * 0.75);
    slashGeo.rotateX(-Math.PI / 2);
    const slashMat = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    this.slashMesh = new THREE.Mesh(slashGeo, slashMat);
    this.slashMesh.position.y = 18;
    this.playerGroup.add(this.slashMesh);

    // Downed Badge
    this.playerDownedBadge = this.createDownedBadge();
    this.playerGroup.add(this.playerDownedBadge);

    this.entitiesGroup.add(this.playerGroup);
  }

  setupPlayer2Mesh() {
    this.player2Group = new THREE.Group();

    // Soya
    const shadowGeo = new THREE.CircleGeometry(16, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 });
    this.player2Shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.player2Shadow.position.y = 0.5;
    this.scene.add(this.player2Shadow);

    // Oyoqlar / Etiklar (Navy & Silver)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0a192f, roughness: 0.8 });
    this.player2LeftLeg = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 12), legMat);
    this.player2LeftLeg.position.set(-6, 6, 0);
    this.player2LeftLeg.castShadow = true;
    this.player2Group.add(this.player2LeftLeg);

    this.player2RightLeg = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 12), legMat);
    this.player2RightLeg.position.set(6, 6, 0);
    this.player2RightLeg.castShadow = true;
    this.player2Group.add(this.player2RightLeg);

    // Gavda (Dengiz Shahzodasi Moviy Kamzuli - Azure Naval Coat)
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: 0.5 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(18, 16, 12), coatMat);
    torso.position.y = 18;
    torso.castShadow = true;
    this.player2Group.add(torso);

    // Kamar va Kumush to'qa
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1a237e });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(19, 3.5, 13), beltMat);
    belt.position.y = 12.5;
    this.player2Group.add(belt);

    const silverMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.95, roughness: 0.15 });
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(5.5, 5.5, 13.8), silverMat);
    buckle.position.y = 12.5;
    this.player2Group.add(buckle);

    // Kumush tugmalar
    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), silverMat);
      btn.position.set(0, 15 + b * 4, 6.2);
      this.player2Group.add(btn);
    }
    const epauletL = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 8), silverMat);
    epauletL.position.set(-9.5, 25.5, 0);
    this.player2Group.add(epauletL);
    const epauletR = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 8), silverMat);
    epauletR.position.set(9.5, 25.5, 0);
    this.player2Group.add(epauletR);

    // Bosh
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 14), headMat);
    head.position.y = 31;
    head.castShadow = true;
    this.player2Group.add(head);

    // ⚔️ SHAHZODA TOJI VA PATI (Sapphire Prince Circlet with Plume)
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 36.8, 0);
    const circlet = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4, 6.0, 3.2, 16, 1, true),
      silverMat
    );
    crownGroup.add(circlet);

    // Safir toshlari
    const gemMat = new THREE.MeshStandardMaterial({ color: 0x00bcd4, roughness: 0.1, metalness: 0.3, emissive: 0x004d40 });
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const gem = new THREE.Mesh(new THREE.SphereGeometry(1.4, 6, 6), gemMat);
      gem.position.set(Math.cos(ang) * 5.8, 1.6, Math.sin(ang) * 5.8);
      crownGroup.add(gem);
    }

    // Oq qat-qat pat (White Feather Plume)
    const plumeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const plume = new THREE.Mesh(new THREE.ConeGeometry(2.5, 9, 6), plumeMat);
    plume.position.set(-4, 5, -2);
    plume.rotation.z = 0.35;
    crownGroup.add(plume);
    this.player2Group.add(crownGroup);

    // 🌊 MOVIY SHOHONA PLASH (Azure Velvet Cape)
    const capeGeo = new THREE.PlaneGeometry(16, 22, 4, 6);
    capeGeo.translate(0, -9, -7);
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x0288d1,
      side: THREE.DoubleSide,
      roughness: 0.5
    });
    this.player2Cape = new THREE.Mesh(capeGeo, capeMat);
    this.player2Cape.position.y = 25;
    this.player2Cape.castShadow = true;
    this.player2Group.add(this.player2Cape);

    // 🗡️ KUMUSH RAPIYA (Silver Rapier with Brass Guard)
    this.sword2Group = new THREE.Group();
    this.sword2Group.position.set(12, 18, 5);

    const rapierGuard = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 8, 8, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 })
    );
    this.sword2Group.add(rapierGuard);

    const rapierBlade = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 26, 2),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.98, roughness: 0.08 })
    );
    rapierBlade.position.set(0, 13, 0);
    rapierBlade.castShadow = true;
    this.sword2Group.add(rapierBlade);
    this.player2Group.add(this.sword2Group);

    // Zarb effekti (Cyan slash)
    const slashGeo = new THREE.RingGeometry(18, 30, 20, 1, 0, Math.PI * 0.75);
    slashGeo.rotateX(-Math.PI / 2);
    const slashMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    this.slash2Mesh = new THREE.Mesh(slashGeo, slashMat);
    this.slash2Mesh.position.y = 18;
    this.player2Group.add(this.slash2Mesh);

    // Downed Badge
    this.player2DownedBadge = this.createDownedBadge();
    this.player2Group.add(this.player2DownedBadge);

    this.entitiesGroup.add(this.player2Group);
  }

  setupCarMesh() {
    this.carGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(32, 14, 22), bodyMat);
    body.position.y = 11;
    body.castShadow = true;
    this.carGroup.add(body);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
    this.carWheels = [];
    const wheelOffsets = [
      [-13, 6, -12], [13, 6, -12],
      [-13, 6, 12], [13, 6, 12]
    ];
    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, wy, wz);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 4, 14), wheelMat);
      tire.rotateZ(Math.PI / 2);
      tire.castShadow = true;
      wGroup.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 4.2, 10), rimMat);
      rim.rotateZ(Math.PI / 2);
      wGroup.add(rim);
      this.carGroup.add(wGroup);
      this.carWheels.push(wGroup);
    });

    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfff176 });
    const hl1 = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), headLightMat);
    hl1.position.set(16, 12, -7);
    this.carGroup.add(hl1);
    const hl2 = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), headLightMat);
    hl2.position.set(16, 12, 7);
    this.carGroup.add(hl2);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 28),
      new THREE.MeshStandardMaterial({ color: 0x424242 })
    );
    pole.position.set(-13, 20, 0);
    this.carGroup.add(pole);

    const flagGeo = new THREE.PlaneGeometry(12, 8);
    flagGeo.translate(6, 0, 0);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.DoubleSide });
    this.carFlag = new THREE.Mesh(flagGeo, flagMat);
    this.carFlag.position.set(-13, 30, 0);
    this.carGroup.add(this.carFlag);

    this.entitiesGroup.add(this.carGroup);
  }

  setupChestMesh() {
    this.chestGroup = new THREE.Group();

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(26, 14, 20), woodMat);
    base.position.y = 7;
    base.castShadow = true;
    this.chestGroup.add(base);

    const band = new THREE.Mesh(new THREE.BoxGeometry(26.4, 14.2, 5), goldMat);
    band.position.y = 7;
    this.chestGroup.add(band);

    this.chestLid = new THREE.Group();
    this.chestLid.position.set(0, 14, -10);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 26, 14, 1, false, 0, Math.PI), woodMat);
    lid.rotateZ(Math.PI / 2);
    lid.position.set(0, 0, 10);
    lid.castShadow = true;
    this.chestLid.add(lid);
    this.chestGroup.add(this.chestLid);

    this.chestLight = new THREE.PointLight(0xffd700, 0, 140);
    this.chestLight.position.set(0, 12, 0);
    this.chestGroup.add(this.chestLight);

    this.entitiesGroup.add(this.chestGroup);
  }

  buildMap(lvlIdx, currentMap) {
    if (this.lastBuiltLevel === lvlIdx && this.mapGroup.children.length > 0) return;
    this.lastBuiltLevel = lvlIdx;

    while (this.mapGroup.children.length > 0) {
      const obj = this.mapGroup.children[0];
      this.mapGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    this.palmLeaves = [];

    const rows = currentMap.length;
    const cols = currentMap[0].length;

    const sandMat = new THREE.MeshStandardMaterial({ color: 0xdfb76c, roughness: 0.85, metalness: 0.05 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7, metalness: 0.05 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.8, flatShading: true });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.75, flatShading: true });
    const barrelWoodMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.6 });
    const spikeWoodMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.7 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.85, roughness: 0.2 });
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x051b2c });

    const tileGeo = new THREE.BoxGeometry(40, 14, 40);
    const grassGeo = new THREE.BoxGeometry(40, 18, 40);
    const wallGeo = new THREE.BoxGeometry(38, 36, 38);
    const holeGeo = new THREE.CylinderGeometry(18, 14, 16, 16);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = currentMap[r][c];
        const wx = c * TILE_SIZE + 20;
        const wz = r * TILE_SIZE + 20;

        if (type === TILE.SAND) {
          const m = new THREE.Mesh(tileGeo, sandMat);
          m.position.set(wx, 7, wz);
          m.receiveShadow = true;
          this.mapGroup.add(m);
        } else if (type === TILE.GRASS) {
          const m = new THREE.Mesh(grassGeo, grassMat);
          m.position.set(wx, 9, wz);
          m.receiveShadow = true;
          this.mapGroup.add(m);

          if ((c * 17 + r * 31) % 19 === 0) {
            this.createPalmTree(wx, 18, wz);
          }
        } else if (type === TILE.ROCK) {
          const m = new THREE.Mesh(tileGeo, sandMat);
          m.position.set(wx, 7, wz);
          this.mapGroup.add(m);

          const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(18), rockMat);
          rk.position.set(wx, 20, wz);
          rk.castShadow = true;
          rk.receiveShadow = true;
          this.mapGroup.add(rk);
        } else if (type === TILE.RUIN_WALL) {
          const m = new THREE.Mesh(tileGeo, sandMat);
          m.position.set(wx, 7, wz);
          this.mapGroup.add(m);

          const wl = new THREE.Mesh(wallGeo, wallMat);
          wl.position.set(wx, 24, wz);
          wl.castShadow = true;
          wl.receiveShadow = true;
          this.mapGroup.add(wl);

          // Qal'a chirog'i (Castle Torch)
          if ((c + r) % 3 === 0) {
            const lantern = new THREE.Group();
            lantern.position.set(wx, 26, wz + 16);
            const lIron = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 3), ironMat);
            lantern.add(lIron);
            const lGlow = new THREE.Mesh(new THREE.SphereGeometry(1.6, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffa000 }));
            lantern.add(lGlow);
            this.mapGroup.add(lantern);
          }
        } else if (type === TILE.BARREL) {
          const m = new THREE.Mesh(tileGeo, sandMat);
          m.position.set(wx, 7, wz);
          this.mapGroup.add(m);

          const bGroup = new THREE.Group();
          bGroup.position.set(wx, 7, wz);
          const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(14, 15, 26, 12), barrelWoodMat);
          bCyl.position.y = 13;
          bCyl.castShadow = true;
          bGroup.add(bCyl);
          const bHoop1 = new THREE.Mesh(new THREE.CylinderGeometry(15.2, 15.2, 2.5, 12), ironMat);
          bHoop1.position.y = 8;
          bGroup.add(bHoop1);
          const bHoop2 = new THREE.Mesh(new THREE.CylinderGeometry(15.2, 15.2, 2.5, 12), ironMat);
          bHoop2.position.y = 18;
          bGroup.add(bHoop2);
          this.mapGroup.add(bGroup);
        } else if (type === TILE.SPIKES) {
          const m = new THREE.Mesh(tileGeo, sandMat);
          m.position.set(wx, 7, wz);
          this.mapGroup.add(m);

          const sGroup = new THREE.Group();
          sGroup.position.set(wx, 7, wz);
          const bar1 = new THREE.Mesh(new THREE.BoxGeometry(36, 4, 4), spikeWoodMat);
          bar1.position.y = 8;
          bar1.rotateY(Math.PI / 4);
          bar1.castShadow = true;
          sGroup.add(bar1);
          const bar2 = new THREE.Mesh(new THREE.BoxGeometry(36, 4, 4), spikeWoodMat);
          bar2.position.y = 8;
          bar2.rotateY(-Math.PI / 4);
          bar2.castShadow = true;
          sGroup.add(bar2);

          for (let sp = 0; sp < 4; sp++) {
            const ang = (sp / 4) * Math.PI * 2;
            const spike = new THREE.Mesh(new THREE.ConeGeometry(2.5, 14, 6), ironMat);
            spike.position.set(Math.cos(ang) * 11, 14, Math.sin(ang) * 11);
            spike.castShadow = true;
            sGroup.add(spike);
          }
          this.mapGroup.add(sGroup);
        } else if (type === TILE.HOLE) {
          const hl = new THREE.Mesh(holeGeo, holeMat);
          hl.position.set(wx, 0, wz);
          this.mapGroup.add(hl);
        }
      }
    }
  }

  createPalmTree(x, y, z) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.6, side: THREE.DoubleSide });

    let curY = 0;
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(4 - i * 0.4, 4.4 - i * 0.4, 12, 8), trunkMat);
      seg.position.set(Math.sin(i * 0.4) * 2, curY + 6, Math.cos(i * 0.4) * 2);
      seg.castShadow = true;
      treeGroup.add(seg);
      curY += 11;
    }

    const crown = new THREE.Group();
    crown.position.set(3, curY, 3);
    for (let f = 0; f < 6; f++) {
      const ang = (f / 6) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(8, 22), leafMat);
      leaf.rotateY(ang);
      leaf.rotateX(0.7);
      leaf.position.y = -2;
      leaf.castShadow = true;
      crown.add(leaf);
      this.palmLeaves.push(leaf);
    }

    // Kokos yong'oqlari
    const cocoMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.8 });
    for (let c = 0; c < 3; c++) {
      const cAng = (c / 3) * Math.PI * 2;
      const coco = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), cocoMat);
      coco.position.set(Math.cos(cAng) * 3, -1, Math.sin(cAng) * 3);
      crown.add(coco);
    }

    treeGroup.add(crown);
    this.mapGroup.add(treeGroup);
  }

  createEnemyMesh(enemy) {
    const grp = new THREE.Group();
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.7 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const redGlow = new THREE.MeshBasicMaterial({ color: 0xff1744 });

    let ragColor = 0x311b92;
    if (enemy.aiType === 'CHASER') ragColor = 0xb71c1c;
    if (enemy.aiType === 'GUNNER') ragColor = 0x004d40;
    const coat = new THREE.Mesh(new THREE.BoxGeometry(15, 15, 10), new THREE.MeshStandardMaterial({ color: ragColor }));
    coat.position.y = 15;
    coat.castShadow = true;
    grp.add(coat);

    const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 10), boneMat);
    lLeg.position.set(-4.5, 5, 0);
    grp.add(lLeg);
    const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 10), boneMat);
    rLeg.position.set(4.5, 5, 0);
    grp.add(rLeg);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 10), boneMat);
    skull.position.y = 26;
    skull.castShadow = true;
    grp.add(skull);

    const e1 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), redGlow);
    e1.position.set(2, 27, 5);
    grp.add(e1);
    const e2 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), redGlow);
    e2.position.set(-2, 27, 5);
    grp.add(e2);

    const hat = new THREE.Mesh(new THREE.CylinderGeometry(8, 7, 3, 10), hatMat);
    hat.position.y = 31;
    grp.add(hat);

    const wMat = new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.8 });
    const weapon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 18, 3), wMat);
    weapon.position.set(10, 16, 4);
    grp.add(weapon);

    this.entitiesGroup.add(grp);
    return grp;
  }

  createAllyMesh(ally) {
    const grp = new THREE.Group();
    let coatColor = 0x1565c0;
    if (ally.role === 'GUNNER') coatColor = 0x00695c;
    if (ally.role === 'GUARD') coatColor = 0x37474f;

    const coat = new THREE.Mesh(
      new THREE.BoxGeometry(16, 16, 11),
      new THREE.MeshStandardMaterial({ color: coatColor })
    );
    coat.position.y = 16;
    coat.castShadow = true;
    grp.add(coat);

    const helmMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.85, roughness: 0.2 });
    const helm = new THREE.Mesh(new THREE.SphereGeometry(6.5, 12, 12), helmMat);
    helm.position.y = 28;
    helm.castShadow = true;
    grp.add(helm);

    if (ally.role === 'GUARD' || ally.role === 'SWORD') {
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(3, 20, 14),
        new THREE.MeshStandardMaterial({ color: 0xffb300, metalness: 0.8, roughness: 0.3 })
      );
      shield.position.set(-10, 16, 3);
      grp.add(shield);
    }

    if (ally.role === 'GUNNER') {
      const musket = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 24),
        new THREE.MeshStandardMaterial({ color: 0x4e342e })
      );
      musket.rotateX(Math.PI / 2);
      musket.position.set(9, 16, 8);
      grp.add(musket);
    } else {
      const sword = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 20, 3.5),
        new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.9 })
      );
      sword.position.set(9, 16, 4);
      grp.add(sword);
    }

    this.entitiesGroup.add(grp);
    return grp;
  }

  createCoinMesh() {
    const grp = new THREE.Group();
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 9, 3, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.15 })
    );
    coin.rotateZ(Math.PI / 2);
    coin.castShadow = true;
    grp.add(coin);
    this.entitiesGroup.add(grp);
    return grp;
  }

  createKeyMesh() {
    const grp = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0x553300
    });

    const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 1.8, 8, 16), goldMat);
    ring.position.y = 12;
    grp.add(ring);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 16), goldMat);
    shaft.position.y = 2;
    grp.add(shaft);

    const bit = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 1.5), goldMat);
    bit.position.set(2, -3, 0);
    grp.add(bit);

    const kLight = new THREE.PointLight(0xffd54f, 0.8, 60);
    grp.add(kLight);

    this.entitiesGroup.add(grp);
    return grp;
  }

  createBulletMesh() {
    const bMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffeb3b })
    );
    this.entitiesGroup.add(bMesh);
    return bMesh;
  }

  toScreenPosition(x, y, z) {
    const p = new THREE.Vector3(x, y, z);
    p.project(this.camera);
    return {
      x: ((p.x + 1) * 960) / 2,
      y: ((-p.y + 1) * 720) / 2
    };
  }

  render(dt = 16) {
    if (!this.enabled) return;

    this.time += dt * 0.001;
    const game = this.game;

    if (this.lastBuiltLevel !== game.currentLevelIndex) {
      this.buildMap(game.currentLevelIndex, game.currentMap);
    }

    // 1. To'lqinlar harakati
    if (this.oceanGeo && this.oceanPosBase) {
      const pos = this.oceanGeo.attributes.position;
      const count = pos.count;
      for (let i = 0; i < count; i++) {
        const u = this.oceanPosBase[i * 3];
        const v = this.oceanPosBase[i * 3 + 2];
        pos.array[i * 3 + 1] = Math.sin(u * 0.012 + this.time * 2.2) * 3.8 +
                               Math.cos(v * 0.016 + this.time * 1.8) * 2.6;
      }
      pos.needsUpdate = true;
    }

    // 2. Bulutlar
    if (this.clouds) {
      this.clouds.forEach(c => {
        c.position.x += c.speed * dt * 0.008;
        if (c.position.x > 2200) {
          c.position.x = -400;
          c.position.z = Math.random() * 1600 - 300;
        }
      });
    }

    // 3. Palma barglari
    this.palmLeaves.forEach((leaf, idx) => {
      leaf.rotation.z = Math.sin(this.time * 2 + idx) * 0.06;
    });

    // 4. O'yinchi 1 (Qirol)
    const p1 = game.player;
    if (p1) {
      const jumpY = (p1.jumpHeight || 0) * 1.3;
      this.playerGroup.position.set(p1.x, jumpY, p1.y);
      this.playerShadow.position.set(p1.x, 0.5, p1.y);
      const sScale = Math.max(0.3, 1 - (p1.jumpHeight || 0) / 60);
      this.playerShadow.scale.set(sScale, sScale, sScale);

      let faceAngle = 0;
      if (p1.direction === 'right') faceAngle = Math.PI / 2;
      if (p1.direction === 'left') faceAngle = -Math.PI / 2;
      if (p1.direction === 'up') faceAngle = Math.PI;
      if (p1.direction === 'down') faceAngle = 0;
      if (p1.attackAngle !== undefined && p1.swordAttackTimer > 0) {
        faceAngle = p1.attackAngle + Math.PI / 2;
      }
      this.playerGroup.rotation.y = faceAngle;

      if (p1.isDowned) {
        this.playerGroup.rotation.x = -Math.PI / 2.2;
        this.playerGroup.position.y = 4;
        this.playerDownedBadge.visible = true;
        this.playerDownedBadge.rotation.y += 0.06;
        this.playerDownedBadge.position.y = 38 + Math.sin(this.time * 6) * 4;
        this.playerLeftLeg.rotation.x = 0;
        this.playerRightLeg.rotation.x = 0;
      } else {
        this.playerGroup.rotation.x = 0;
        this.playerDownedBadge.visible = false;

        if (p1.isMoving && !p1.isJumping) {
          const legSwing = Math.sin(p1.walkAnim * 0.3) * 0.35;
          this.playerLeftLeg.rotation.x = legSwing;
          this.playerRightLeg.rotation.x = -legSwing;
          this.playerCape.rotation.x = -0.2 - Math.abs(legSwing) * 0.3;
        } else {
          this.playerLeftLeg.rotation.x = 0;
          this.playerRightLeg.rotation.x = 0;
          this.playerCape.rotation.x = -0.1 + Math.sin(this.time * 3) * 0.05;
        }
      }

      if (p1.swordAttackTimer > 0) {
        const swingProgress = p1.swordAttackTimer / 16;
        this.swordGroup.rotation.y = (1 - swingProgress) * Math.PI * 0.9 - 0.4;
        this.swordGroup.rotation.z = 0.5;
        this.slashMesh.material.opacity = Math.sin(swingProgress * Math.PI) * 0.85;
      } else {
        this.swordGroup.rotation.y = 0.2;
        this.swordGroup.rotation.z = 0;
        this.slashMesh.material.opacity = 0;
      }

      this.playerGroup.visible = !p1.inVehicle;
    }

    // 5. O'yinchi 2 (Shahzoda)
    const p2 = game.player2;
    if (p2) {
      const jumpY = (p2.jumpHeight || 0) * 1.3;
      this.player2Group.position.set(p2.x, jumpY, p2.y);
      this.player2Shadow.position.set(p2.x, 0.5, p2.y);
      const sScale = Math.max(0.3, 1 - (p2.jumpHeight || 0) / 60);
      this.player2Shadow.scale.set(sScale, sScale, sScale);

      let faceAngle = 0;
      if (p2.direction === 'right') faceAngle = Math.PI / 2;
      if (p2.direction === 'left') faceAngle = -Math.PI / 2;
      if (p2.direction === 'up') faceAngle = Math.PI;
      if (p2.direction === 'down') faceAngle = 0;
      if (p2.attackAngle !== undefined && p2.swordAttackTimer > 0) {
        faceAngle = p2.attackAngle + Math.PI / 2;
      }
      this.player2Group.rotation.y = faceAngle;

      if (p2.isDowned) {
        this.player2Group.rotation.x = -Math.PI / 2.2;
        this.player2Group.position.y = 4;
        this.player2DownedBadge.visible = true;
        this.player2DownedBadge.rotation.y += 0.06;
        this.player2DownedBadge.position.y = 38 + Math.sin(this.time * 6) * 4;
        this.player2LeftLeg.rotation.x = 0;
        this.player2RightLeg.rotation.x = 0;
      } else {
        this.player2Group.rotation.x = 0;
        this.player2DownedBadge.visible = false;

        if (p2.isMoving && !p2.isJumping) {
          const legSwing = Math.sin(p2.walkAnim * 0.3) * 0.35;
          this.player2LeftLeg.rotation.x = legSwing;
          this.player2RightLeg.rotation.x = -legSwing;
          this.player2Cape.rotation.x = -0.2 - Math.abs(legSwing) * 0.3;
        } else {
          this.player2LeftLeg.rotation.x = 0;
          this.player2RightLeg.rotation.x = 0;
          this.player2Cape.rotation.x = -0.1 + Math.sin(this.time * 3) * 0.05;
        }
      }

      if (p2.swordAttackTimer > 0) {
        const swingProgress = p2.swordAttackTimer / 16;
        this.sword2Group.rotation.y = (1 - swingProgress) * Math.PI * 0.9 - 0.4;
        this.sword2Group.rotation.z = 0.5;
        this.slash2Mesh.material.opacity = Math.sin(swingProgress * Math.PI) * 0.85;
      } else {
        this.sword2Group.rotation.y = 0.2;
        this.sword2Group.rotation.z = 0;
        this.slash2Mesh.material.opacity = 0;
      }

      this.player2Group.visible = !p2.inVehicle;
    }

    // 6. Mashina
    const car = game.car;
    if (car) {
      this.carGroup.position.set(car.x, 0, car.y);
      let carAngle = 0;
      const driver = p1.inVehicle ? p1 : (p2 && p2.inVehicle ? p2 : null);
      if (driver) {
        if (driver.direction === 'right') carAngle = 0;
        if (driver.direction === 'down') carAngle = Math.PI / 2;
        if (driver.direction === 'left') carAngle = Math.PI;
        if (driver.direction === 'up') carAngle = -Math.PI / 2;
      }
      this.carGroup.rotation.y = carAngle;

      if (driver && driver.isMoving) {
        this.carWheels.forEach(w => { w.rotation.x += 0.2; });
      }
      this.carFlag.rotation.y = Math.sin(this.time * 5) * 0.25;
    }

    // 7. Sandiq
    const chest = game.chest;
    if (chest) {
      this.chestGroup.position.set(chest.x, 0, chest.y);
      if (chest.isOpen) {
        this.chestLid.rotation.x = THREE.MathUtils.lerp(this.chestLid.rotation.x, -Math.PI * 0.55, 0.1);
        this.chestLight.intensity = THREE.MathUtils.lerp(this.chestLight.intensity, 1.8, 0.08);
      } else {
        this.chestLid.rotation.x = 0;
        this.chestLight.intensity = Math.sin(this.time * 3) * 0.4 + 0.5;
      }
    }

    // 8. Tangalar
    const activeCoinSet = new Set();
    game.coins.forEach((coin, idx) => {
      if (coin.collected) return;
      activeCoinSet.add(idx);
      let cMesh = this.coinMeshes.get(idx);
      if (!cMesh) {
        cMesh = this.createCoinMesh();
        this.coinMeshes.set(idx, cMesh);
      }
      cMesh.position.set(coin.x, 10 + Math.sin(this.time * 4 + idx) * 3, coin.y);
      cMesh.rotation.y += 0.04;
    });
    this.coinMeshes.forEach((mesh, idx) => {
      if (!activeCoinSet.has(idx)) {
        this.entitiesGroup.remove(mesh);
        this.coinMeshes.delete(idx);
      }
    });

    // 9. Kalitlar
    const activeKeySet = new Set();
    game.keyItems.forEach((key) => {
      if (key.collected) return;
      activeKeySet.add(key.id);
      let kMesh = this.keyMeshes.get(key.id);
      if (!kMesh) {
        kMesh = this.createKeyMesh();
        this.keyMeshes.set(key.id, kMesh);
      }
      kMesh.position.set(key.x, 15 + Math.sin(this.time * 3 + key.id) * 3.5, key.y);
      kMesh.rotation.y += 0.025;
    });
    this.keyMeshes.forEach((mesh, id) => {
      if (!activeKeySet.has(id)) {
        this.entitiesGroup.remove(mesh);
        this.keyMeshes.delete(id);
      }
    });

    // 10. Dushmanlar
    const activeEnemySet = new Set();
    game.enemies.forEach((enemy) => {
      if (!enemy.isAlive) return;
      activeEnemySet.add(enemy.id);
      let eMesh = this.enemyMeshes.get(enemy.id);
      if (!eMesh) {
        eMesh = this.createEnemyMesh(enemy);
        this.enemyMeshes.set(enemy.id, eMesh);
      }
      eMesh.position.set(enemy.x, Math.sin(this.time * 6 + enemy.id) * 1.5, enemy.y);
      if (enemy.dirX !== 0 || enemy.dirY !== 0) {
        eMesh.rotation.y = Math.atan2(enemy.dirX, enemy.dirY);
      }
    });
    this.enemyMeshes.forEach((mesh, id) => {
      if (!activeEnemySet.has(id)) {
        this.entitiesGroup.remove(mesh);
        this.enemyMeshes.delete(id);
      }
    });

    // 11. Ittifoqchilar
    const activeAllySet = new Set();
    game.allies.forEach((ally, idx) => {
      if (!ally.isAlive) return;
      activeAllySet.add(idx);
      let aMesh = this.allyMeshes.get(idx);
      if (!aMesh) {
        aMesh = this.createAllyMesh(ally);
        this.allyMeshes.set(idx, aMesh);
      }
      aMesh.position.set(ally.x, Math.sin(this.time * 6 + idx) * 1.5, ally.y);
      if (ally.targetEnemy) {
        const dx = ally.targetEnemy.x - ally.x;
        const dy = ally.targetEnemy.y - ally.y;
        aMesh.rotation.y = Math.atan2(dx, dy);
      } else if (p1) {
        const dx = p1.x - ally.x;
        const dy = p1.y - ally.y;
        aMesh.rotation.y = Math.atan2(dx, dy);
      }
    });
    this.allyMeshes.forEach((mesh, idx) => {
      if (!activeAllySet.has(idx)) {
        this.entitiesGroup.remove(mesh);
        this.allyMeshes.delete(idx);
      }
    });

    // 12. O'qlar
    const activeBullets = new Set();
    game.bullets.forEach((bullet, idx) => {
      activeBullets.add(idx);
      let bMesh = this.bulletMeshes.get(idx);
      if (!bMesh) {
        bMesh = this.createBulletMesh();
        this.bulletMeshes.set(idx, bMesh);
      }
      bMesh.position.set(bullet.x, 15, bullet.y);
    });
    this.bulletMeshes.forEach((mesh, idx) => {
      if (!activeBullets.has(idx)) {
        this.entitiesGroup.remove(mesh);
        this.bulletMeshes.delete(idx);
      }
    });

    // 13. DINAMIK CO-OP KAMERA (2 KISHILIK MIDPOINT TRACKING)
    if (p1 && p2) {
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.y + p2.y) / 2;
      const pDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const zoom = Math.min(1.55, Math.max(1.0, pDist / 260));

      const targetCamX = midX;
      const targetCamZ = midZ + 240 * zoom;
      const targetCamY = 260 * zoom + Math.max(p1.jumpHeight || 0, p2.jumpHeight || 0) * 0.3;

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.08;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.08;

      let lookY = 16 + Math.max(p1.jumpHeight || 0, p2.jumpHeight || 0) * 0.2;
      if (game.shakeTimer > 0) {
        this.camera.position.x += (Math.random() - 0.5) * game.shakeIntensity * 2;
        this.camera.position.y += (Math.random() - 0.5) * game.shakeIntensity * 2;
      }
      this.camera.lookAt(midX, lookY, midZ);

      if (this.sunLight) {
        this.sunLight.position.set(midX + 300, 650, midZ + 350);
        this.sunLight.target.position.set(midX, 0, midZ);
        this.sunLight.target.updateMatrixWorld();
      }
    } else if (p1) {
      const targetCamX = p1.x;
      const targetCamZ = p1.y + 240;
      const targetCamY = 260 + (p1.jumpHeight || 0) * 0.4;
      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.08;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.08;
      this.camera.lookAt(p1.x, 16, p1.y);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// ===================================================================
// 6. ASOSIY O'YIN BOSHQARUVI VA MANTIG'I (GAME ENGINE - 2 KISHILIK)
// ===================================================================
class GameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.threeCanvas = document.getElementById('threeCanvas');
    this.hudCanvas = document.getElementById('hudCanvas');
    this.hudCtx = this.hudCanvas ? this.hudCanvas.getContext('2d') : null;
    this.btnDimensionToggle = document.getElementById('btn-dimension-toggle');
    
    // UI elementlari (2 Kishilik Ko'p O'yinchi)
    this.uiLevel = document.getElementById('level-display');
    this.uiP1Hearts = document.getElementById('p1-hearts-display') || document.getElementById('hearts-display');
    this.uiP1Coins = document.getElementById('p1-coins-count') || document.getElementById('coins-count');
    this.uiP2Hearts = document.getElementById('p2-hearts-display');
    this.uiP2Coins = document.getElementById('p2-coins-count');
    this.uiKeys = document.getElementById('keys-count');
    this.uiFuelContainer = document.getElementById('fuel-container');
    this.uiFuelBar = document.getElementById('fuel-bar-inner');
    this.uiFuelText = document.getElementById('fuel-text');
    this.uiStatusBadge = document.getElementById('player-status-badge');
    this.uiToast = document.getElementById('toast-notification');

    // Ekranlar
    this.screenStart = document.getElementById('start-screen');
    this.screenGameOver = document.getElementById('game-over-screen');
    this.screenVictory = document.getElementById('victory-screen');
    this.screenLevelComplete = document.getElementById('level-complete-screen');

    // Tugmalar
    this.btnStart = document.getElementById('btn-start-game');
    this.btnRestartGameOver = document.getElementById('btn-restart-gameover');
    this.btnRetryLevel = document.getElementById('btn-retry-level');
    this.btnRestartVictory = document.getElementById('btn-restart-victory');
    this.btnNextLevel = document.getElementById('btn-next-level');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.btnActionCar = document.getElementById('btn-action-car');
    this.btnActionRefuel = document.getElementById('btn-action-refuel');
    this.btnActionAttack = document.getElementById('btn-action-attack');
    this.btnActionJump = document.getElementById('btn-action-jump');

    // Smooth Camera tizimi (2D rejimda 2 kishilik markazni kuzatadi)
    this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };

    // Realistik atmosfera zarralari
    this.ambientParticles = [];
    for (let i = 0; i < 40; i++) {
      this.ambientParticles.push({
        x: Math.random() * 960,
        y: Math.random() * 720,
        radius: 1 + Math.random() * 2,
        speedX: -0.3 - Math.random() * 0.4,
        speedY: 0.15 + Math.random() * 0.3,
        alpha: 0.2 + Math.random() * 0.35,
        color: Math.random() > 0.5 ? '#ffe082' : '#80deea'
      });
    }

    // O'yin holati
    this.state = 'START';
    this.toastTimeout = null;
    this.chestToastCooldown = 0;
    this.lastP2InputTime = 0;

    // Ekran silkinishi
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    // Bosqichlar
    this.currentLevelIndex = 0;
    this.currentMap = LEVELS[0].map;

    // 2 O'yinchi uchun alohida tugmalar
    this.keysP1 = { up: false, down: false, left: false, right: false };
    this.keysP2 = { up: false, down: false, left: false, right: false };

    // 2 Kishilik Qahramonlar (P1: Qirol 👑, P2: Shahzoda ⚔️)
    this.player = new Player(4 * TILE_SIZE + 10, 15 * TILE_SIZE + 20, 'KING', 1);
    this.player2 = new Player(4 * TILE_SIZE + 35, 15 * TILE_SIZE + 20, 'PRINCE', 2);
    this.car = new Car(5 * TILE_SIZE + 20, 9 * TILE_SIZE + 20);
    this.chest = new TreasureChest(3 * TILE_SIZE + 20, 2 * TILE_SIZE + 20);
    
    this.enemies = [];
    this.bullets = [];
    this.allies = [];
    this.coins = [];
    this.keyItems = [];
    this.particles = [];
    this.floatTexts = [];

    this.allySpawnTimer = 0;
    this.enemySpawnTimer = 0;
    this.lastTime = 0;

    // 3D Three.js WebGL Renderer
    this.is3D = true;
    try {
      this.threeRenderer = new ThreeRenderer(this);
      if (!this.threeRenderer || !this.threeRenderer.enabled) {
        this.is3D = false;
      }
    } catch (err) {
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
      this.showToast("3D WebGL Rejimi faollashtirildi! 🌐");
    } else {
      if (this.threeCanvas) this.threeCanvas.style.display = 'none';
      if (this.canvas) this.canvas.style.display = 'block';
      if (btn) btn.textContent = '🗺️ 2D';
      this.showToast("2D Klassik Rejim faollashtirildi! 🗺️");
    }
  }

  bindEvents() {
    const resumeAudio = () => {
      sounds.init();
    };

    window.addEventListener('keydown', (e) => {
      resumeAudio();

      // P1 Boshqaruvi: W, A, S, D
      if (e.code === 'KeyW') this.keysP1.up = true;
      if (e.code === 'KeyS') this.keysP1.down = true;
      if (e.code === 'KeyA') this.keysP1.left = true;
      if (e.code === 'KeyD') this.keysP1.right = true;

      // P1 Harakatlari
      if (['Space', 'KeyF'].includes(e.code)) {
        e.preventDefault();
        this.player.attack(this);
      }
      if (e.code === 'ShiftLeft') {
        e.preventDefault();
        this.player.jump(this);
      }
      if (e.code === 'KeyE') this.toggleVehicle(this.player);
      if (e.code === 'KeyR') this.refuelVehicle(this.player);
      if (e.code === 'KeyH') {
        e.preventDefault();
        this.rallyOrSummonAllies(this.player);
      }

      // P2 Boshqaruvi: Arrow Keys
      if (e.code === 'ArrowUp') { this.keysP2.up = true; this.lastP2InputTime = Date.now(); }
      if (e.code === 'ArrowDown') { this.keysP2.down = true; this.lastP2InputTime = Date.now(); }
      if (e.code === 'ArrowLeft') { this.keysP2.left = true; this.lastP2InputTime = Date.now(); }
      if (e.code === 'ArrowRight') { this.keysP2.right = true; this.lastP2InputTime = Date.now(); }

      // P2 Harakatlari: Enter / L (Hujum), ShiftRight / K (Sakrash), P / O (Mashina), U (Yoqilg'i), Y (Yordamchi)
      if (['Enter', 'NumpadEnter', 'KeyL'].includes(e.code)) {
        e.preventDefault();
        this.lastP2InputTime = Date.now();
        this.player2.attack(this);
      }
      if (['ShiftRight', 'KeyK'].includes(e.code)) {
        e.preventDefault();
        this.lastP2InputTime = Date.now();
        this.player2.jump(this);
      }
      if (['KeyP', 'KeyO'].includes(e.code)) {
        this.lastP2InputTime = Date.now();
        this.toggleVehicle(this.player2);
      }
      if (e.code === 'KeyU') {
        this.lastP2InputTime = Date.now();
        this.refuelVehicle(this.player2);
      }
      if (e.code === 'KeyY') {
        e.preventDefault();
        this.lastP2InputTime = Date.now();
        this.rallyOrSummonAllies(this.player2);
      }

      // 3D / 2D Rejimni almashtirish
      if (e.code === 'KeyV') {
        e.preventDefault();
        this.toggleDimension();
      }
    });

    window.addEventListener('keyup', (e) => {
      // P1
      if (e.code === 'KeyW') this.keysP1.up = false;
      if (e.code === 'KeyS') this.keysP1.down = false;
      if (e.code === 'KeyA') this.keysP1.left = false;
      if (e.code === 'KeyD') this.keysP1.right = false;

      // P2
      if (e.code === 'ArrowUp') this.keysP2.up = false;
      if (e.code === 'ArrowDown') this.keysP2.down = false;
      if (e.code === 'ArrowLeft') this.keysP2.left = false;
      if (e.code === 'ArrowRight') this.keysP2.right = false;
    });

    window.addEventListener('blur', () => this.resetInputs());
    window.addEventListener('focus', () => this.resetInputs());

    // 3D / 2D Rejim tugmasi
    if (this.btnDimensionToggle) {
      const toggleDimHandler = (e) => {
        if (e) e.preventDefault();
        resumeAudio();
        this.toggleDimension();
      };
      this.btnDimensionToggle.addEventListener('click', toggleDimHandler);
      this.btnDimensionToggle.addEventListener('pointerdown', toggleDimHandler);
    }

    // Sensorli ekranning D-pad paneli (P1 uchun)
    const setupTouchBtn = (id, keyName) => {
      const btn = document.getElementById(id);
      if (!btn) return;

      const start = (e) => {
        e.preventDefault();
        resumeAudio();
        this.keysP1[keyName] = true;
        btn.classList.add('active');
      };

      const end = (e) => {
        e.preventDefault();
        this.keysP1[keyName] = false;
        btn.classList.remove('active');
      };

      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('touchcancel', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
    };

    setupTouchBtn('dpad-up', 'up');
    setupTouchBtn('dpad-down', 'down');
    setupTouchBtn('dpad-left', 'left');
    setupTouchBtn('dpad-right', 'right');

    const bindActionBtn = (btn, action) => {
      if (!btn) return;
      const handler = (e) => {
        if (e) e.preventDefault();
        resumeAudio();
        action();
      };
      btn.addEventListener('click', handler);
      btn.addEventListener('pointerdown', handler);
      btn.addEventListener('touchstart', handler, { passive: false });
    };

    bindActionBtn(this.btnActionCar, () => this.toggleVehicle(this.player));
    bindActionBtn(this.btnActionRefuel, () => this.refuelVehicle(this.player));

    if (this.btnActionAttack) {
      const doAttack = (e) => {
        if (e) e.preventDefault();
        resumeAudio();
        this.player.attack(this);
        this.btnActionAttack.classList.add('active');
        setTimeout(() => this.btnActionAttack.classList.remove('active'), 150);
      };
      this.btnActionAttack.addEventListener('click', doAttack);
      this.btnActionAttack.addEventListener('pointerdown', doAttack);
      this.btnActionAttack.addEventListener('touchstart', doAttack, { passive: false });
    }

    if (this.btnActionJump) {
      const doJump = (e) => {
        if (e) e.preventDefault();
        resumeAudio();
        this.player.jump(this);
        this.btnActionJump.classList.add('active');
        setTimeout(() => this.btnActionJump.classList.remove('active'), 150);
      };
      this.btnActionJump.addEventListener('click', doJump);
      this.btnActionJump.addEventListener('pointerdown', doJump);
      this.btnActionJump.addEventListener('touchstart', doJump, { passive: false });
    }

    // Sichqoncha bosilganda eng yaqin o'yinchi qilich uradi
    const handleAttackMouse = (e) => {
      resumeAudio();
      if (this.state !== 'PLAYING') return;
      const targetCanvas = (this.is3D && this.threeCanvas) ? this.threeCanvas : this.canvas;
      const rect = targetCanvas.getBoundingClientRect();
      const scaleX = targetCanvas.width / rect.width;
      const scaleY = targetCanvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      let attacker = this.player;
      if (this.player2 && !this.player2.isDowned) {
        let p1Screen = { x: this.player.x, y: this.player.y };
        let p2Screen = { x: this.player2.x, y: this.player2.y };
        if (this.is3D && this.threeRenderer && this.threeRenderer.enabled) {
          p1Screen = this.threeRenderer.toScreenPosition(this.player.x, 0, this.player.y);
          p2Screen = this.threeRenderer.toScreenPosition(this.player2.x, 0, this.player2.y);
        } else {
          p1Screen.x -= this.camera.x;
          p1Screen.y -= this.camera.y;
          p2Screen.x -= this.camera.x;
          p2Screen.y -= this.camera.y;
        }
        const d1 = Math.hypot(clickX - p1Screen.x, clickY - p1Screen.y);
        const d2 = Math.hypot(clickX - p2Screen.x, clickY - p2Screen.y);
        if (d2 < d1 && !this.player2.isDowned) attacker = this.player2;
      }

      let angle = 0;
      if (this.is3D && this.threeRenderer && this.threeRenderer.enabled) {
        const screenP = this.threeRenderer.toScreenPosition(attacker.x, 0, attacker.y);
        angle = Math.atan2(clickY - screenP.y, clickX - screenP.x);
      } else {
        const worldX = clickX + this.camera.x;
        const worldY = clickY + this.camera.y;
        angle = Math.atan2(worldY - attacker.y, worldX - attacker.x);
      }
      attacker.attack(this, angle);
    };

    this.canvas.addEventListener('mousedown', handleAttackMouse);
    if (this.threeCanvas) {
      this.threeCanvas.addEventListener('mousedown', handleAttackMouse);
    }

    const handleStart = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      resumeAudio();
      this.startFromFirstLevel();
    };

    if (this.btnStart) {
      this.btnStart.addEventListener('click', handleStart);
      this.btnStart.addEventListener('pointerdown', handleStart);
      this.btnStart.addEventListener('touchstart', handleStart, { passive: false });
    }

    window.addEventListener('keydown', (e) => {
      if (this.state === 'START' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStart();
      }
    });

    if (this.btnRetryLevel) {
      const handleRetry = (e) => {
        if (e) e.preventDefault();
        resumeAudio();
        this.player.hearts = 3;
        this.player2.hearts = 3;
        this.loadLevel(this.currentLevelIndex);
        this.state = 'PLAYING';
        if (this.screenGameOver) {
          this.screenGameOver.classList.remove('active');
          this.screenGameOver.style.display = 'none';
          this.screenGameOver.style.pointerEvents = 'none';
        }
      };
      this.btnRetryLevel.addEventListener('click', handleRetry);
      this.btnRetryLevel.addEventListener('pointerdown', handleRetry);
      this.btnRetryLevel.addEventListener('touchstart', handleRetry, { passive: false });
    }

    if (this.btnRestartGameOver) {
      this.btnRestartGameOver.addEventListener('click', handleStart);
      this.btnRestartGameOver.addEventListener('pointerdown', handleStart);
      this.btnRestartGameOver.addEventListener('touchstart', handleStart, { passive: false });
    }

    if (this.btnRestartVictory) {
      this.btnRestartVictory.addEventListener('click', handleStart);
      this.btnRestartVictory.addEventListener('pointerdown', handleStart);
      this.btnRestartVictory.addEventListener('touchstart', handleStart, { passive: false });
    }

    if (this.btnNextLevel) {
      const handleNext = (e) => {
        if (e) e.preventDefault();
        resumeAudio();
        this.goToNextLevel();
      };
      this.btnNextLevel.addEventListener('click', handleNext);
      this.btnNextLevel.addEventListener('pointerdown', handleNext);
      this.btnNextLevel.addEventListener('touchstart', handleNext, { passive: false });
    }

    if (this.btnSoundToggle) {
      this.btnSoundToggle.addEventListener('click', () => {
        resumeAudio();
        const muted = sounds.toggleMute();
        this.btnSoundToggle.textContent = muted ? '🔇' : '🔊';
        this.showToast(muted ? "Ovoz o'chirildi" : "Ovoz yoqildi");
      });
    }
  }

  resetInputs() {
    this.keysP1.up = false;
    this.keysP1.down = false;
    this.keysP1.left = false;
    this.keysP1.right = false;
    this.keysP2.up = false;
    this.keysP2.down = false;
    this.keysP2.left = false;
    this.keysP2.right = false;
    const activeBtns = document.querySelectorAll('.dpad-btn.active');
    activeBtns.forEach(b => b.classList.remove('active'));
  }

  // ===================================================================
  // BOSQICHLARNI YUKLASH VA BOSHQARISH (LEVEL SYSTEM)
  // ===================================================================
  startFromFirstLevel() {
    this.player.reset();
    this.player2.reset();
    this.loadLevel(0);
    this.state = 'PLAYING';

    [this.screenStart, this.screenGameOver, this.screenVictory, this.screenLevelComplete].forEach(s => {
      if (s) {
        s.classList.remove('active');
        s.style.display = 'none';
        s.style.pointerEvents = 'none';
      }
    });

    this.showToast("1-bosqich boshlandi! 2 kishilik jamoa bilan 3 ta kalitni to'plang.");
  }

  loadLevel(index) {
    this.currentLevelIndex = index;
    const lvl = LEVELS[index];
    this.currentMap = JSON.parse(JSON.stringify(lvl.map));
    this.mapRows = this.currentMap.length;
    this.mapCols = this.currentMap[0].length;

    const pX = lvl.playerSpawn.col * TILE_SIZE + 20;
    const pY = lvl.playerSpawn.row * TILE_SIZE + 20;

    // P1 (Qirol)
    this.player.spawnX = pX - 22;
    this.player.spawnY = pY;
    this.player.x = pX - 22;
    this.player.y = pY;
    this.player.keys = 0;
    this.player.inVehicle = false;
    this.player.isDowned = false;
    this.player.invulnerableTimer = 35;

    // P2 (Shahzoda)
    this.player2.spawnX = pX + 22;
    this.player2.spawnY = pY;
    this.player2.x = pX + 22;
    this.player2.y = pY;
    this.player2.keys = 0;
    this.player2.inVehicle = false;
    this.player2.isDowned = false;
    this.player2.invulnerableTimer = 35;

    const cX = lvl.carSpawn.col * TILE_SIZE + 20;
    const cY = lvl.carSpawn.row * TILE_SIZE + 20;
    this.car.reset(cX, cY);

    const chestX = lvl.chestPos.col * TILE_SIZE + 20;
    const chestY = lvl.chestPos.row * TILE_SIZE + 20;
    this.chest = new TreasureChest(chestX, chestY);

    // Kamerani o'yinchilar markaziga to'g'irlash
    const maxCamX = Math.max(0, this.mapCols * TILE_SIZE - this.canvas.width);
    const maxCamY = Math.max(0, this.mapRows * TILE_SIZE - this.canvas.height);
    this.camera.x = Math.max(0, Math.min(maxCamX, pX - this.canvas.width / 2));
    this.camera.y = Math.max(0, Math.min(maxCamY, pY - this.canvas.height / 2));
    this.camera.targetX = this.camera.x;
    this.camera.targetY = this.camera.y;

    this.enemies = lvl.enemies.map(e => new Enemy(
      e.id,
      e.col * TILE_SIZE + 20,
      e.row * TILE_SIZE + 20,
      e.dirX,
      e.dirY,
      e.dist,
      e.speed,
      e.hp,
      e.aiType
    ));

    this.keyItems = lvl.keys.map((k, i) => new KeyItem(
      i + 1,
      k.col * TILE_SIZE + 20,
      k.row * TILE_SIZE + 20
    ));

    this.coins = lvl.coins.map(([c, r]) => new Coin(
      c * TILE_SIZE + 20,
      r * TILE_SIZE + 20
    ));

    this.bullets = [];
    this.allies = [
      new AlliedKing(pX - 44, pY, 'SWORD'),
      new AlliedKing(pX + 44, pY, 'GUNNER'),
      new AlliedKing(pX, pY + 36, 'GUARD')
    ];
    this.particles = [];
    this.floatTexts = [];
    this.allySpawnTimer = 0;
    this.enemySpawnTimer = 0;
    this.resetInputs();

    this.updateHUD();
  }

  goToNextLevel() {
    const nextIdx = this.currentLevelIndex + 1;
    if (nextIdx < LEVELS.length) {
      this.screenLevelComplete.classList.remove('active');
      this.loadLevel(nextIdx);
      this.state = 'PLAYING';
      this.showToast(\`\${nextIdx + 1}-bosqich boshlandi! Omad, qaroqchilar!\`);
    } else {
      this.finalVictory();
    }
  }

  // ===================================================================
  // MASHINA BILAN ISHLASH (VEHICLE LOGIC - 2 KISHILIK)
  // ===================================================================
  toggleVehicle(p = this.player) {
    if (this.state !== 'PLAYING' || p.isDowned) return;

    if (!p.inVehicle) {
      const dist = Math.hypot(p.x - this.car.x, p.y - this.car.y);
      if (dist < 50) {
        p.inVehicle = true;
        this.car.occupied = true;
        p.x = this.car.x;
        p.y = this.car.y;
        sounds.playRefuel();
        this.showToast(\`\${p.name} mashinaga o'tirdi! 🚗\`);
        this.addFloatText("🚗 MASHINADA", p.x, p.y - 25, '#4fc3f7');
      } else {
        this.showToast(\`\${p.name} mashinaga yetarlicha yaqin emas!\`);
      }
    } else {
      const offsets = [
        { dx: 28, dy: 0 },
        { dx: -28, dy: 0 },
        { dx: 0, dy: 28 },
        { dx: 0, dy: -28 }
      ];

      let safePos = null;
      for (const off of offsets) {
        const testX = this.car.x + off.dx;
        const testY = this.car.y + off.dy;
        if (!this.checkTileCollision(testX, testY, p.radius) && !this.checkHoleCollision(testX, testY)) {
          safePos = { x: testX, y: testY };
          break;
        }
      }

      if (safePos) {
        p.inVehicle = false;
        p.x = safePos.x;
        p.y = safePos.y;
        this.car.occupied = this.player.inVehicle || this.player2.inVehicle;
        this.showToast(\`\${p.name} mashinadan tushdi.\`);
      } else {
        this.showToast("Mashinadan tushish uchun xavfsiz joy yo'q!");
      }
    }

    this.updateHUD();
  }

  refuelVehicle(p = this.player) {
    if (this.state !== 'PLAYING') return;

    const dist = Math.hypot(p.x - this.car.x, p.y - this.car.y);
    if (!p.inVehicle && dist >= 50) {
      this.showToast("Yoqilg'i quyish uchun mashina yonida bo'ling!");
      return;
    }

    if (this.car.fuel >= 100) {
      this.showToast("Yoqilg'i baki allaqachon to'la (100%)!");
      return;
    }

    if (p.coins >= this.car.refuelCost) {
      p.coins -= this.car.refuelCost;
      this.car.fuel = 100;
      sounds.playRefuel();
      this.showToast(\`\${p.name} yoqilg'i to'ldirdi! ⛽ 100% (-5 tanga)\`);
      this.addFloatText("⛽ 100%", this.car.x, this.car.y - 25, '#66bb6a');
      this.updateHUD();
    } else {
      sounds.playHurt();
      this.showToast(\`Tangalar yetarli emas! 5 tanga kerak (\${p.name}da: \${p.coins}🪙)\`);
    }
  }

  checkTileCollision(x, y, radius) {
    const leftTile = Math.floor((x - radius) / TILE_SIZE);
    const rightTile = Math.floor((x + radius) / TILE_SIZE);
    const topTile = Math.floor((y - radius) / TILE_SIZE);
    const bottomTile = Math.floor((y + radius) / TILE_SIZE);

    const mRows = this.mapRows || MAP_ROWS;
    const mCols = this.mapCols || MAP_COLS;

    for (let r = topTile; r <= bottomTile; r++) {
      for (let c = leftTile; c <= rightTile; c++) {
        if (r < 0 || r >= mRows || c < 0 || c >= mCols) {
          return true;
        }

        const tileType = this.currentMap[r][c];
        if (
          tileType === TILE.SEA ||
          tileType === TILE.ROCK ||
          tileType === TILE.PALM ||
          tileType === TILE.BARREL ||
          tileType === TILE.RUIN_WALL ||
          tileType === TILE.SPIKES
        ) {
          return true;
        }
      }
    }
    return false;
  }

  checkHoleCollision(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    const mRows = this.mapRows || MAP_ROWS;
    const mCols = this.mapCols || MAP_COLS;

    if (row >= 0 && row < mRows && col >= 0 && col < mCols) {
      if (this.currentMap[row][col] === TILE.HOLE) {
        const holeCenterX = col * TILE_SIZE + TILE_SIZE / 2;
        const holeCenterY = row * TILE_SIZE + TILE_SIZE / 2;
        const dist = Math.hypot(x - holeCenterX, y - holeCenterY);
        return dist < 12;
      }
    }
    return false;
  }

  // ===================================================================
  // ASOSIY O'YIN SIKLI: YANGILANISH (UPDATE LOGIC - 2 KISHILIK)
  // ===================================================================
  update(dt) {
    if (this.state !== 'PLAYING') return;

    this.player.update(this);
    this.player2.update(this);

    if (this.player.invulnerableTimer > 0) this.player.invulnerableTimer--;
    if (this.player2.invulnerableTimer > 0) this.player2.invulnerableTimer--;
    if (this.chestToastCooldown > 0) this.chestToastCooldown--;
    if (this.shakeTimer > 0) this.shakeTimer--;

    const currentLvlConfig = LEVELS[this.currentLevelIndex];

    // 1. O'YINCHI 1 HARAKATI (P1 - WASD)
    this.handlePlayerMovement(this.player, this.keysP1, currentLvlConfig);

    // 2. O'YINCHI 2 HARAKATI (P2 - ARROW KEYS YOKI HAMROH AI)
    const p2ManualActive = (Date.now() - this.lastP2InputTime < 3500);
    if (p2ManualActive) {
      this.handlePlayerMovement(this.player2, this.keysP2, currentLvlConfig);
    } else if (!this.player2.isDowned && !this.player2.inVehicle) {
      // P2 Companion AI: Agar 2-o'yinchi klaviaturada bosilmasa, sodiq hamroh sifatida yordam beradi
      if (this.player.isDowned) {
        // P1 yiqilsa, uni qutqarishga yuguradi!
        const dx = this.player.x - this.player2.x;
        const dy = this.player.y - this.player2.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 42) {
          this.applyMove(this.player2, (dx / dist) * this.player2.speed, (dy / dist) * this.player2.speed);
        } else {
          this.player2.attack(this);
        }
      } else {
        // P1 yaqinida hamroh bo'lib yuradi
        const targetX = this.player.x + 36;
        const targetY = this.player.y;
        const dx = targetX - this.player2.x;
        const dy = targetY - this.player2.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 55) {
          const spd = dist > 110 ? this.player2.speed * 1.3 : this.player2.speed;
          this.applyMove(this.player2, (dx / dist) * spd, (dy / dist) * spd);
        } else {
          this.player2.isMoving = false;
        }
      }
    }

    // 3. CHUQURGA TUSHIShNI TEKSHIRISH
    [this.player, this.player2].forEach(p => {
      if (!p.isJumping && !p.isDowned && this.checkHoleCollision(p.x, p.y)) {
        sounds.playFall();
        this.triggerScreenShake(5, 10);
        p.hearts = Math.max(0, p.hearts - 1);
        this.addFloatText(\`\${p.id === 1 ? '👑' : '⚔️'} CHUQUR! -1 ❤️\`, p.x, p.y - 25, '#f44336');
        this.showToast(\`\${p.name} chuqurga tushib ketdi!\`);

        if (p.inVehicle) {
          p.inVehicle = false;
          this.car.occupied = this.player.inVehicle || this.player2.inVehicle;
        }

        p.respawnAtSpawn();
        this.updateHUD();

        if (p.hearts <= 0) {
          const partner = p.id === 1 ? this.player2 : this.player;
          if (partner && !partner.isDowned && partner.hearts > 0) {
            p.isDowned = true;
            this.showToast(\`⚠️ \${p.name} chuqurda quladi! Sherigi qutqarishi kerak! 🆘\`);
          } else {
            this.gameOver();
          }
        }
      }
    });

    // 4. TANGALARNI YIG'ISH
    this.coins.forEach(coin => {
      if (!coin.collected) {
        [this.player, this.player2].forEach(p => {
          if (!p.isDowned && !coin.collected) {
            const dist = Math.hypot(p.x - coin.x, p.y - coin.y);
            if (dist < p.radius + coin.radius) {
              coin.collected = true;
              p.coins += 1;
              sounds.playCoin();
              this.addFloatText(\`\${p.id === 1 ? '👑' : '⚔️'} +1 🪙\`, coin.x, coin.y - 12, '#ffd54f');
              for (let i = 0; i < 5; i++) {
                this.particles.push(new Particle(
                  coin.x, coin.y, '#ffc107',
                  (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 2.5, 20
                ));
              }
              this.updateHUD();
            }
          }
        });
      }
    });

    // 5. KALITLARNI YIG'ISH
    this.keyItems.forEach(keyItem => {
      if (!keyItem.collected) {
        [this.player, this.player2].forEach(p => {
          if (!p.isDowned && !keyItem.collected) {
            const dist = Math.hypot(p.x - keyItem.x, p.y - keyItem.y);
            if (dist < p.radius + keyItem.radius) {
              keyItem.collected = true;
              p.keys += 1;
              sounds.playKey();
              this.triggerScreenShake(2, 6);
              const totalKeys = this.player.keys + this.player2.keys;
              this.addFloatText(\`\${p.id === 1 ? '👑' : '⚔️'} +1 🔑 KALIT!\`, keyItem.x, keyItem.y - 20, '#ff9800');
              this.showToast(\`\${p.name} oltin kalit topdi! (\${totalKeys}/\${currentLvlConfig.requiredKeys})\`);
              for (let i = 0; i < 14; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 2 + Math.random() * 2.5;
                this.particles.push(new Particle(
                  keyItem.x, keyItem.y, '#ffd54f',
                  Math.cos(angle) * spd, Math.sin(angle) * spd, 3.5, 35
                ));
              }
              this.updateHUD();
            }
          }
        });
      }
    });

    // 6. XAZINA SANDIG'I BILAN TO'QNASHUV
    const totalKeys = this.player.keys + this.player2.keys;
    const distP1 = Math.hypot(this.player.x - this.chest.x, this.player.y - this.chest.y);
    const distP2 = Math.hypot(this.player2.x - this.chest.x, this.player2.y - this.chest.y);
    if (distP1 < 42 || distP2 < 42) {
      if (totalKeys >= currentLvlConfig.requiredKeys) {
        if (!this.chest.isOpen) {
          this.chest.isOpen = true;
          sounds.playVictory();
          this.triggerScreenShake(6, 15);
          this.handleChestOpen();
        }
      } else {
        if (this.chestToastCooldown <= 0) {
          this.chestToastCooldown = 90;
          this.showToast(\`Sandiq qulflangan! \${currentLvlConfig.requiredKeys} ta kalit kerak (Jami: \${totalKeys}/\${currentLvlConfig.requiredKeys} 🔑)\`);
        }
      }
    }

    // 7. DUSHMANLAR HARAKATI VA HUJUMLARI
    this.enemies.forEach(enemy => {
      enemy.update(this);

      if (enemy.isAlive) {
        [this.player, this.player2].forEach(p => {
          if (enemy.isAlive && !p.isDowned) {
            const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
            if (dist < p.radius + enemy.radius) {
              if (p.inVehicle) {
                enemy.isAlive = false;
                sounds.playCrash();
                this.triggerScreenShake(5, 10);
                this.addFloatText("💥 YANCHILDI! +2 🪙", enemy.x, enemy.y - 20, '#ff3d00');
                this.showToast("Dushman mashina ostida yakson bo'ldi!");
                p.coins += 2;
                for (let i = 0; i < 16; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const spd = 2 + Math.random() * 3;
                  this.particles.push(new Particle(
                    enemy.x, enemy.y, '#d32f2f',
                    Math.cos(angle) * spd, Math.sin(angle) * spd, 4, 30
                  ));
                }
                this.updateHUD();
              } else {
                if (p.isJumping && p.jumpHeight > 10) return;
                p.takeDamage(1, this);
                this.updateHUD();
              }
            }
          }
        });
      }
    });

    this.enemies = this.enemies.filter(e => e.isAlive);

    // 8. TO'P O'QLARI
    this.bullets.forEach(b => b.update(this));
    this.bullets = this.bullets.filter(b => b.isAlive);

    // 9. Dushmanlar safini to'ldirish
    this.enemySpawnTimer++;
    if (this.enemySpawnTimer >= 800) {
      this.enemySpawnTimer = 0;
      if (this.enemies.length < Math.min(3, currentLvlConfig.enemies.length)) {
        const randSpawn = currentLvlConfig.enemies[Math.floor(Math.random() * currentLvlConfig.enemies.length)];
        const newEnemy = new Enemy(
          Date.now(),
          randSpawn.col * TILE_SIZE + 20,
          randSpawn.row * TILE_SIZE + 20,
          randSpawn.dirX,
          randSpawn.dirY,
          randSpawn.dist,
          randSpawn.speed,
          randSpawn.hp,
          randSpawn.aiType
        );
        this.enemies.push(newEnemy);
        this.addFloatText("YANGI DUSHMAN! 💀", newEnemy.x, newEnemy.y - 25, '#e53935');
      }
    }

    // 10. ITTIFOQCHILAR
    this.allySpawnTimer++;
    const fastAllyInterval = Math.floor(currentLvlConfig.allySpawnInterval * 0.45);
    if (this.allySpawnTimer >= fastAllyInterval) {
      this.allySpawnTimer = 0;
      const aliveAllies = this.allies.filter(a => a.isAlive).length;
      if (aliveAllies < 8) {
        const roles = ['SWORD', 'GUNNER', 'GUARD'];
        const chosenRole = roles[Math.floor(Math.random() * roles.length)];
        const spX = currentLvlConfig.allySpawn.col * TILE_SIZE + 20 + (Math.random() - 0.5) * 40;
        const spY = currentLvlConfig.allySpawn.row * TILE_SIZE + 20 + (Math.random() - 0.5) * 40;
        const newAlly = new AlliedKing(spX, spY, chosenRole);
        this.allies.push(newAlly);
        this.showToast("Yangi yordamchi armiyaga qo'shildi! 🛡️⚔️");
        this.addFloatText("YORDAMCHI KELDI! 🛡️", spX, spY - 25, '#64b5f6');
      }
    }

    this.allies.forEach(ally => ally.update(this));
    this.allies = this.allies.filter(a => a.isAlive);

    // 11. ZARRALAR VA MATNLAR
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);

    this.floatTexts.forEach(t => t.update());
    this.floatTexts = this.floatTexts.filter(t => t.life > 0);

    if (this.player.inVehicle || this.player2.inVehicle) {
      this.updateHUD();
    }
  }

  handlePlayerMovement(player, keys, currentLvlConfig) {
    if (player.isDowned) {
      player.isMoving = false;
      return;
    }

    let moveX = 0;
    let moveY = 0;
    if (keys.up) moveY -= 1;
    if (keys.down) moveY += 1;
    if (keys.left) moveX -= 1;
    if (keys.right) moveX += 1;

    player.isMoving = (moveX !== 0 || moveY !== 0);

    if (player.isMoving) {
      if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
      }

      if (Math.abs(moveX) > Math.abs(moveY)) {
        player.direction = moveX > 0 ? 'right' : 'left';
      } else {
        player.direction = moveY > 0 ? 'down' : 'up';
      }

      let currentSpeed = player.speed;

      if (player.inVehicle) {
        if (this.car.fuel > 0) {
          currentSpeed = player.carSpeed;
          this.car.fuel = Math.max(0, this.car.fuel - currentLvlConfig.fuelConsumption);

          if (Math.random() < 0.35) {
            this.particles.push(new Particle(
              player.x, player.y + 10,
              '#cfd8dc', (Math.random() - 0.5) * 1.5, Math.random() * 1.2, 3, 20
            ));
          }

          if (this.car.fuel <= 0) {
            sounds.playHurt();
            this.showToast("Yoqilg'i tugadi! Mashina to'xtadi. [R] yoki [U] bilan to'ldiring.");
          }
        } else {
          currentSpeed = 0;
        }
      }

      this.applyMove(player, moveX * currentSpeed, moveY * currentSpeed);
    }
  }

  applyMove(player, dx, dy) {
    const nextX = player.x + dx;
    const nextY = player.y + dy;

    if (!this.checkTileCollision(nextX, player.y, player.radius)) {
      player.x = nextX;
    }
    if (!this.checkTileCollision(player.x, nextY, player.radius)) {
      player.y = nextY;
    }

    player.walkAnim++;

    if (player.inVehicle) {
      this.car.x = player.x;
      this.car.y = player.y;
    }
  }

  // ===================================================================
  // HUD YANGILASH (2 KISHILIK)
  // ===================================================================
  updateHUD() {
    const lvl = LEVELS[this.currentLevelIndex];

    if (this.uiLevel) {
      this.uiLevel.textContent = \`\${lvl.level}-bosqich (\${this.currentLevelIndex + 1}/\${LEVELS.length})\`;
    }

    // P1 Hearts & Coins
    if (this.uiP1Hearts) {
      let str = '';
      for (let i = 0; i < this.player.maxHearts; i++) {
        str += i < this.player.hearts ? '❤️' : '🖤';
      }
      this.uiP1Hearts.textContent = str;
    }
    if (this.uiP1Coins) {
      this.uiP1Coins.textContent = this.player.coins;
    }

    // P2 Hearts & Coins
    if (this.uiP2Hearts) {
      let str = '';
      for (let i = 0; i < this.player2.maxHearts; i++) {
        str += i < this.player2.hearts ? '💙' : '🖤';
      }
      this.uiP2Hearts.textContent = str;
    }
    if (this.uiP2Coins) {
      this.uiP2Coins.textContent = this.player2.coins;
    }

    // Keys
    if (this.uiKeys) {
      const totalKeys = this.player.keys + this.player2.keys;
      this.uiKeys.textContent = \`\${totalKeys} / \${lvl.requiredKeys}\`;
    }

    // Fuel & Status
    const anyInVehicle = this.player.inVehicle || this.player2.inVehicle;
    if (anyInVehicle) {
      if (this.uiFuelContainer) this.uiFuelContainer.classList.remove('hidden');
      const fuelPct = Math.round(this.car.fuel);
      if (this.uiFuelBar) {
        this.uiFuelBar.style.width = \`\${fuelPct}%\`;
        this.uiFuelBar.classList.toggle('low', fuelPct < 25);
      }
      if (this.uiFuelText) this.uiFuelText.textContent = \`\${fuelPct}%\`;
      if (this.uiStatusBadge) {
        this.uiStatusBadge.textContent = '🚗 Mashinada';
        this.uiStatusBadge.classList.add('in-car');
      }
    } else {
      if (this.uiFuelContainer) this.uiFuelContainer.classList.add('hidden');
      if (this.uiStatusBadge) {
        this.uiStatusBadge.textContent = '🚶 2 Qaroqchi';
        this.uiStatusBadge.classList.remove('in-car');
      }
    }
  }

  // ===================================================================
  // SANDIQ OCHILGANDA (LEVEL COMPLETE YOKI FINAL G'ALABA)
  // ===================================================================
  handleChestOpen() {
    if (this.currentLevelIndex < LEVELS.length - 1) {
      this.state = 'LEVEL_COMPLETE';
      
      this.player.hearts = Math.min(this.player.maxHearts, this.player.hearts + 1);
      this.player2.hearts = Math.min(this.player2.maxHearts, this.player2.hearts + 1);
      this.player.isDowned = false;
      this.player2.isDowned = false;

      const elTitle = document.getElementById('lc-title');
      if (elTitle) elTitle.textContent = \`\${this.currentLevelIndex + 1}-BOSQICH YAKUNLANDI! 🏆\`;
      const elCoins = document.getElementById('lc-coins');
      if (elCoins) elCoins.textContent = \`P1: \${this.player.coins}🪙 | P2: \${this.player2.coins}🪙\`;
      
      const nextLvl = LEVELS[this.currentLevelIndex + 1];
      const elNext = document.getElementById('lc-next-title');
      if (elNext) elNext.textContent = nextLvl.title;

      if (this.screenLevelComplete) {
        this.screenLevelComplete.style.display = 'flex';
        this.screenLevelComplete.style.pointerEvents = 'auto';
        this.screenLevelComplete.classList.add('active');
      }
    } else {
      this.finalVictory();
    }

    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4.5;
      const colors = ['#ffd700', '#ff4081', '#00e676', '#00e5ff', '#ff9100'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(new Particle(
        this.chest.x, this.chest.y, color,
        Math.cos(angle) * speed, Math.sin(angle) * speed, 4, 60
      ));
    }
  }

  gameOver() {
    this.state = 'GAMEOVER';
    sounds.playGameOver();
    const lvl = LEVELS[this.currentLevelIndex];
    const elLvl = document.getElementById('go-level');
    if (elLvl) elLvl.textContent = \`\${lvl.level}-bosqich (\${lvl.title})\`;
    const elCoins = document.getElementById('go-coins');
    if (elCoins) elCoins.textContent = \`P1: \${this.player.coins}🪙 | P2: \${this.player2.coins}🪙\`;
    const elKeys = document.getElementById('go-keys');
    if (elKeys) elKeys.textContent = \`\${this.player.keys + this.player2.keys} / \${lvl.requiredKeys} 🔑\`;
    if (this.screenGameOver) {
      this.screenGameOver.style.display = 'flex';
      this.screenGameOver.style.pointerEvents = 'auto';
      this.screenGameOver.classList.add('active');
    }
  }

  rallyOrSummonAllies(p = this.player) {
    if (this.state !== 'PLAYING') return;

    sounds.playCoin();
    this.allies.forEach(ally => {
      if (ally.isAlive) {
        ally.offsetAngle = Math.random() * Math.PI * 2;
        ally.targetEnemy = null;
      }
    });

    const aliveCount = this.allies.filter(a => a.isAlive).length;
    if (aliveCount < 8 && p.coins >= 3) {
      p.coins -= 3;
      const roles = ['SWORD', 'GUNNER', 'GUARD'];
      const chosenRole = roles[Math.floor(Math.random() * roles.length)];
      const newAlly = new AlliedKing(p.x + (Math.random() - 0.5) * 50, p.y + (Math.random() - 0.5) * 50, chosenRole);
      this.allies.push(newAlly);
      this.showToast(\`\${p.name} yangi yordamchi yolladi! (-3🪙) 🛡️\`);
      this.addFloatText("YORDAMCHI! +1 🛡️", p.x, p.y - 35, '#69f0ae');
      this.updateHUD();
    } else {
      this.showToast("Barcha yordamchilar o'yinchilar atrofida saf tortdi! 🎺🛡️");
      this.addFloatText("SAFGA TIZILISH! 🎺", p.x, p.y - 35, '#ffd54f');
    }
  }

  finalVictory() {
    this.state = 'VICTORY';
    sounds.playVictory();
    const elHearts = document.getElementById('vic-hearts');
    if (elHearts) elHearts.textContent = \`👑 P1: \${'❤️'.repeat(Math.max(1, this.player.hearts))} | ⚔️ P2: \${'💙'.repeat(Math.max(1, this.player2.hearts))}\`;
    const elCoins = document.getElementById('vic-coins');
    if (elCoins) elCoins.textContent = \`P1: \${this.player.coins}🪙 | P2: \${this.player2.coins}🪙 (Jami: \${this.player.coins + this.player2.coins}🪙)\`;
    if (this.screenVictory) {
      this.screenVictory.style.display = 'flex';
      this.screenVictory.style.pointerEvents = 'auto';
      this.screenVictory.classList.add('active');
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

  drawFloatTexts(ctx) {
    if (!this.floatTexts || !ctx) return;
    this.floatTexts.forEach(t => {
      let screenX = t.x - this.camera.x;
      let screenY = t.y - this.camera.y;
      if (this.is3D && this.threeRenderer && this.threeRenderer.enabled) {
        const sp = this.threeRenderer.toScreenPosition(t.x, 22, t.y);
        screenX = sp.x;
        screenY = sp.y;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life / 20));
      ctx.font = 'bold 15px "Segoe UI", sans-serif';
      ctx.fillStyle = '#000000';
      ctx.fillText(t.text, screenX + 1, screenY + 1);
      ctx.fillStyle = t.color || '#ffd700';
      ctx.fillText(t.text, screenX, screenY);
      ctx.restore();
    });
  }

  // ===================================================================
  // KUCHLI CANVAS GRAFIKASI (ADVANCED GRAPHICS & RENDERING SYSTEM)
  // ===================================================================
  draw(dt = 16) {
    // 3D Rejim faol bo'lsa, Three.js orqali render qilish
    if (this.is3D && this.threeRenderer && this.threeRenderer.enabled) {
      this.threeRenderer.render(dt);

      if (this.hudCtx) {
        this.hudCtx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
        this.drawVignette(this.hudCtx);
        this.drawAmbient(this.hudCtx);
        this.drawMiniMap(this.hudCtx);
        this.drawFloatTexts(this.hudCtx);
      }
      return;
    }

    // 2D Rejimda klassik Canvas renderer
    if (this.hudCtx) {
      this.hudCtx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();

    if (this.shakeTimer > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    // Kamerani 2 o'yinchining o'rtasiga to'g'irlash
    const midX = (this.player.x + this.player2.x) / 2;
    const midY = (this.player.y + this.player2.y) / 2;
    const targetCamX = Math.max(0, Math.min(this.mapCols * TILE_SIZE - this.canvas.width, midX - this.canvas.width / 2));
    const targetCamY = Math.max(0, Math.min(this.mapRows * TILE_SIZE - this.canvas.height, midY - this.canvas.height / 2));
    this.camera.x += (targetCamX - this.camera.x) * 0.1;
    this.camera.y += (targetCamY - this.camera.y) * 0.1;

    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    const nowTime = Date.now();
    const mRows = this.mapRows || MAP_ROWS;
    const mCols = this.mapCols || MAP_COLS;

    const startCol = Math.max(0, Math.floor(this.camera.x / TILE_SIZE) - 1);
    const endCol = Math.min(mCols - 1, Math.ceil((this.camera.x + this.canvas.width) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(this.camera.y / TILE_SIZE) - 1);
    const endRow = Math.min(mRows - 1, Math.ceil((this.camera.y + this.canvas.height) / TILE_SIZE) + 1);

    // 1. XARITA GRAFIKASI
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        const type = this.currentMap[r][c];
        this.drawTile(ctx, type, x, y, c, r, nowTime);
      }
    }

    // 2. TANGALAR VA KALITLAR
    this.coins.forEach(coin => coin.draw(ctx));
    this.keyItems.forEach(key => key.draw(ctx));

    // 3. XAZINA SANDIG'I
    this.chest.draw(ctx);

    // 4. MASHINA
    if (!this.player.inVehicle && !this.player2.inVehicle) {
      this.car.draw(ctx, this);
    }

    // 5. ITTIFOQCHILAR, DUSHMANLAR VA O'QLAR
    this.allies.forEach(ally => ally.draw(ctx));
    this.enemies.forEach(enemy => enemy.draw(ctx));
    this.bullets.forEach(bullet => bullet.draw(ctx));

    // 6. O'YINCHILAR
    if (this.player.inVehicle || this.player2.inVehicle) {
      this.car.draw(ctx, this);
    }
    this.player.draw(ctx);
    this.player2.draw(ctx);

    // 7. ZARRALAR VA MATNLAR
    this.particles.forEach(p => p.draw(ctx));
    this.floatTexts.forEach(t => t.draw(ctx));

    ctx.restore();

    // 8. HUD ELEMENTLARI
    this.drawVignette(ctx);
    this.drawAmbient(ctx);
    this.drawMiniMap(ctx);
  }

  drawVignette(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, w * 0.72);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  drawAmbient(ctx) {
    if (!this.ambientParticles) return;
    ctx.save();
    for (const p of this.ambientParticles) {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawMiniMap(ctx) {
    const mapW = 160;
    const mapH = 104;
    const margin = 12;
    const x = this.canvas.width - mapW - margin;
    const y = margin;

    ctx.save();

    ctx.fillStyle = 'rgba(10, 22, 38, 0.88)';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, mapW, mapH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, mapW - 4, mapH - 4, 6);
    ctx.clip();

    const mRows = this.mapRows || MAP_ROWS;
    const mCols = this.mapCols || MAP_COLS;
    const scaleX = (mapW - 4) / (mCols * TILE_SIZE);
    const scaleY = (mapH - 4) / (mRows * TILE_SIZE);

    for (let r = 0; r < mRows; r++) {
      for (let c = 0; c < mCols; c++) {
        const t = this.currentMap[r][c];
        let color = '#0d47a1';
        if (t === TILE.SAND) color = '#d4a343';
        else if (t === TILE.GRASS) color = '#2e7d32';
        else if (t === TILE.ROAD) color = '#78909c';
        else if (t === TILE.ROCK || t === TILE.RUIN_WALL) color = '#37474f';
        else if (t === TILE.BARREL || t === TILE.SPIKES) color = '#8d6e63';
        else if (t === TILE.BRIDGE) color = '#a1887f';
        else if (t === TILE.HOLE) color = '#1a0d00';

        ctx.fillStyle = color;
        ctx.fillRect(
          x + 2 + c * TILE_SIZE * scaleX,
          y + 2 + r * TILE_SIZE * scaleY,
          Math.ceil(TILE_SIZE * scaleX) + 0.5,
          Math.ceil(TILE_SIZE * scaleY) + 0.5
        );
      }
    }

    // Kalitlar
    this.keyItems.forEach(k => {
      if (!k.collected) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(x + 2 + k.x * scaleX, y + 2 + k.y * scaleY, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Sandiq
    if (this.chest) {
      ctx.fillStyle = '#ffb300';
      ctx.fillRect(x + 2 + this.chest.x * scaleX - 2.5, y + 2 + this.chest.y * scaleY - 2.5, 5, 5);
    }

    // Mashina
    if (this.car && !this.player.inVehicle && !this.player2.inVehicle) {
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(x + 2 + this.car.x * scaleX, y + 2 + this.car.y * scaleY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dushmanlar (Qizil nuqtalar)
    this.enemies.forEach(e => {
      if (e.isAlive) {
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(x + 2 + e.x * scaleX, y + 2 + e.y * scaleY, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Yordamchilar (Moviy nuqtalar)
    this.allies.forEach(a => {
      if (a.isAlive) {
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(x + 2 + a.x * scaleX, y + 2 + a.y * scaleY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // O'yinchi 1 (Qirol - Yashil/Oltin)
    const p1X = x + 2 + this.player.x * scaleX;
    const p1Y = y + 2 + this.player.y * scaleY;
    const pulse = Math.sin(Date.now() * 0.008) * 1.5;

    ctx.fillStyle = 'rgba(76, 175, 80, 0.45)';
    ctx.beginPath();
    ctx.arc(p1X, p1Y, 5 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#76ff03';
    ctx.beginPath();
    ctx.arc(p1X, p1Y, 3, 0, Math.PI * 2);
    ctx.fill();

    // O'yinchi 2 (Shahzoda - Moviy/Moviy zangori)
    const p2X = x + 2 + this.player2.x * scaleX;
    const p2Y = y + 2 + this.player2.y * scaleY;

    ctx.fillStyle = 'rgba(2, 136, 209, 0.45)';
    ctx.beginPath();
    ctx.arc(p2X, p2Y, 5 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(p2X, p2Y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('👑P1', p1X - 8, p1Y - 6);
    ctx.fillStyle = '#80d8ff';
    ctx.fillText('⚔️P2', p2X - 8, p2Y - 6);

    ctx.restore();

    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📡 RADAR', x + 6, y + 12);

    ctx.restore();
  }

  drawTile(ctx, type, x, y, col, row, time) {
    switch (type) {
      case TILE.SEA: {
        const seaGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
        seaGrad.addColorStop(0, '#09315d');
        seaGrad.addColorStop(0.5, '#0d47a1');
        seaGrad.addColorStop(1, '#00695c');
        ctx.fillStyle = seaGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        const wave1 = Math.sin(time * 0.003 + col * 0.7 + row * 0.5) * 2.5;
        const wave2 = Math.cos(time * 0.0025 + col * 0.5 - row * 0.6) * 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.arc(x + 12 + wave1, y + 14 + wave2, 4.5, 0, Math.PI * 2);
        ctx.arc(x + 28 - wave2, y + 26 - wave1, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 20 + wave1);
        ctx.quadraticCurveTo(x + 20, y + 16 - wave2, x + 35, y + 22 + wave1);
        ctx.stroke();
        break;
      }

      case TILE.SAND: {
        const sandGrad = ctx.createRadialGradient(x + 20, y + 20, 2, x + 20, y + 20, 28);
        sandGrad.addColorStop(0, '#f9e79f');
        sandGrad.addColorStop(0.65, '#f4d03f');
        sandGrad.addColorStop(1, '#d4ac0d');
        ctx.fillStyle = sandGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = '#b7950b';
        ctx.fillRect(x + 7, y + 8, 2, 1.5);
        ctx.fillRect(x + 25, y + 12, 1.5, 2);
        ctx.fillRect(x + 14, y + 29, 2, 1.5);
        ctx.fillRect(x + 31, y + 31, 2, 2);

        if ((col + row * 3) % 7 === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x + 18, y + 18, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case TILE.GRASS: {
        const grassGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
        grassGrad.addColorStop(0, '#2e7d32');
        grassGrad.addColorStop(0.5, '#1b5e20');
        grassGrad.addColorStop(1, '#0d3813');
        ctx.fillStyle = grassGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 28); ctx.lineTo(x + 8, y + 18);
        ctx.moveTo(x + 10, y + 28); ctx.lineTo(x + 13, y + 19);
        ctx.moveTo(x + 26, y + 18); ctx.lineTo(x + 24, y + 10);
        ctx.moveTo(x + 26, y + 18); ctx.lineTo(x + 29, y + 11);
        ctx.stroke();

        ctx.fillStyle = '#81c784';
        ctx.fillRect(x + 18, y + 8, 2, 2);
        ctx.fillRect(x + 32, y + 28, 2, 2);
        break;
      }

      case TILE.ROAD: {
        const roadGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y);
        roadGrad.addColorStop(0, '#607d8b');
        roadGrad.addColorStop(0.5, '#78909c');
        roadGrad.addColorStop(1, '#546e7a');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = '#455a64';
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, 16, 14, 3);
        ctx.roundRect(x + 21, y + 4, 16, 14, 3);
        ctx.roundRect(x + 6, y + 20, 28, 16, 4);
        ctx.fill();

        ctx.strokeStyle = '#90a4ae';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 4, 14, 12, 2);
        ctx.roundRect(x + 22, y + 5, 14, 12, 2);
        ctx.roundRect(x + 7, y + 21, 26, 14, 3);
        ctx.stroke();
        break;
      }

      case TILE.ROCK: {
        ctx.fillStyle = '#dfb76c';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 29, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#37474f';
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 30);
        ctx.lineTo(x + 12, y + 10);
        ctx.lineTo(x + 24, y + 6);
        ctx.lineTo(x + 35, y + 14);
        ctx.lineTo(x + 33, y + 31);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#78909c';
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 10);
        ctx.lineTo(x + 24, y + 6);
        ctx.lineTo(x + 22, y + 18);
        ctx.lineTo(x + 11, y + 21);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case TILE.HOLE: {
        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        const holeGrad = ctx.createRadialGradient(x + 20, y + 20, 2, x + 20, y + 20, 16);
        holeGrad.addColorStop(0, '#000000');
        holeGrad.addColorStop(0.7, '#1a0000');
        holeGrad.addColorStop(1, '#5d4037');
        ctx.fillStyle = holeGrad;
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 20, 14, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 20, 14, 11, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ff5252';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️', x + 20, y + 24);
        break;
      }

      case TILE.PALM: {
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 34, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + 19, y + 34);
        ctx.quadraticCurveTo(x + 24, y + 20, x + 18, y + 10);
        ctx.stroke();

        ctx.fillStyle = '#3e2723';
        ctx.beginPath();
        ctx.arc(x + 16, y + 11, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 12, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1b5e20';
        ctx.lineWidth = 3.5;
        const wind = Math.sin(time * 0.003) * 2;
        ctx.beginPath();
        ctx.moveTo(x + 18, y + 10); ctx.quadraticCurveTo(x + 6 + wind, y + 4, x + 2 + wind, y + 16);
        ctx.moveTo(x + 18, y + 10); ctx.quadraticCurveTo(x + 30 + wind, y + 3, x + 37 + wind, y + 14);
        ctx.moveTo(x + 18, y + 10); ctx.quadraticCurveTo(x + 21 + wind, y - 4, x + 19 + wind, y - 7);
        ctx.stroke();
        break;
      }

      case TILE.BRIDGE: {
        const seaGrad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
        seaGrad.addColorStop(0, '#0d47a1');
        seaGrad.addColorStop(1, '#00695c');
        ctx.fillStyle = seaGrad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 4);
        ctx.fillRect(x + 2, y + TILE_SIZE - 6, TILE_SIZE - 4, 4);

        ctx.fillStyle = '#8d6e63';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(x + 4 + i * 8, y + 5, 7, TILE_SIZE - 10);
        }

        ctx.fillStyle = '#ffb300';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(x + 7 + i * 8, y + 7, 1.5, 1.5);
          ctx.fillRect(x + 7 + i * 8, y + TILE_SIZE - 9, 1.5, 1.5);
        }
        break;
      }

      case TILE.BARREL: {
        ctx.fillStyle = '#546e7a';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 33, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8d6e63';
        ctx.beginPath();
        ctx.roundRect(x + 8, y + 7, 24, 27, 6);
        ctx.fill();

        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(x + 15, y + 7, 2, 27);
        ctx.fillRect(x + 23, y + 7, 2, 27);

        ctx.fillStyle = '#263238';
        ctx.fillRect(x + 7, y + 11, 26, 3.5);
        ctx.fillRect(x + 7, y + 26, 26, 3.5);

        ctx.fillStyle = '#ffb300';
        ctx.fillRect(x + 10, y + 12, 2, 2);
        ctx.fillRect(x + 28, y + 12, 2, 2);
        ctx.fillRect(x + 10, y + 27, 2, 2);
        ctx.fillRect(x + 28, y + 27, 2, 2);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☠️', x + 20, y + 23);
        break;
      }

      case TILE.RUIN_WALL: {
        ctx.fillStyle = '#37474f';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(x, y + 33, TILE_SIZE, 7);

        ctx.fillStyle = '#546e7a';
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 20); ctx.lineTo(x + 38, y + 20);
        ctx.moveTo(x + 20, y + 2); ctx.lineTo(x + 20, y + 20);
        ctx.moveTo(x + 12, y + 20); ctx.lineTo(x + 12, y + 38);
        ctx.moveTo(x + 28, y + 20); ctx.lineTo(x + 28, y + 38);
        ctx.stroke();

        ctx.fillStyle = '#90a4ae';
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, 2);

        ctx.fillStyle = '#455a64';
        ctx.fillRect(x + 4, y - 1, 9, 4);
        ctx.fillRect(x + 27, y - 1, 9, 4);

        ctx.fillStyle = '#689f38';
        ctx.fillRect(x + 5, y + 17, 5, 3);
        break;
      }

      case TILE.SPIKES: {
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 31, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 32); ctx.lineTo(x + 34, y + 8);
        ctx.moveTo(x + 34, y + 32); ctx.lineTo(x + 6, y + 8);
        ctx.moveTo(x + 20, y + 34); ctx.lineTo(x + 20, y + 6);
        ctx.stroke();

        ctx.fillStyle = '#b0bec5';
        ctx.beginPath();
        ctx.arc(x + 34, y + 8, 3.5, 0, Math.PI * 2);
        ctx.arc(x + 6, y + 8, 3.5, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 6, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(x + 19, y + 8, 2, 3);
        break;
      }
    }
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    try {
      this.update(dt);
      this.draw(dt);
    } catch (err) {
      console.error("Game loop xatosi:", err);
      if (this.is3D) {
        this.is3D = false;
        if (this.threeCanvas) this.threeCanvas.style.display = 'none';
        if (this.canvas) this.canvas.style.display = 'block';
      }
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}
`;

content = content.substring(0, threeRendererIdx) + replacementCode + '\n\n' + content.substring(entryPointIdx);
fs.writeFileSync(scriptPath, content, 'utf8');
console.log("ThreeRenderer and GameEngine updated successfully!");

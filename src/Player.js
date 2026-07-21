import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CONFIG, PAL } from './config.js';
import { clamp } from './utils.js';
import {
  createTrumpFaceTexture,
  createTrumpHairTexture,
  createUSFlagTexture,
} from './textures.js';
import { assetUrl } from './assetUrl.js';

const MESHY_TRUMP_URL = assetUrl('models/trump-meshy.glb');
const TARGET_HEIGHT = 2.0;
const PODIUM_TOP_Y = 1.65;

/**
 * The Commander-in-Thief — Meshy GLB primary, Toy Story procedural fallback.
 */
export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.throwT = 1;
    this.aimYaw = 0;
    this.t = 0;
    /** Level-start intro: face camera, then turn to crowd. null = idle. */
    this.introPhase = null;
    this.introT = 0;
    this._modelReady = false;
    this._pendingIntro = false;
    this._waveArm = false;
    this._meshyMode = false;
    this._meshyRoot = null;

    this._buildPodium();
    this._loadMeshyTrump();

    this.group.position.set(0, 0, CONFIG.world.podiumZ);
    scene.add(this.group);
  }

  async _loadMeshyTrump() {
    try {
      const gltf = await new GLTFLoader().loadAsync(MESHY_TRUMP_URL);
      this._setupMeshyTrump(gltf.scene);
      console.info('[Player] Meshy Trump ready');
    } catch (err) {
      console.warn('[Player] Meshy Trump failed, using Toy Story fallback', err);
      this._buildToyStoryTrump();
    }
    if (this._pendingIntro) this.startLevelIntro();
  }

  /**
   * Place Meshy GLB ~2 units tall with feet on the podium.
   * Face +Z at intro (rotation.y = 0), crowd at Math.PI — same as Toy Story.
   * Model is not skinned; throw/aim animate the root + synthetic arm hooks.
   */
  _setupMeshyTrump(sceneRoot) {
    const t = new THREE.Group();
    t.position.y = PODIUM_TOP_Y;
    this.trump = t;
    this._meshyMode = true;

    const model = sceneRoot;
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m) continue;
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          m.side = THREE.FrontSide;
        }
      }
    });

    // Normalize scale/placement from authored node transforms
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = TARGET_HEIGHT / Math.max(size.y, 0.001);
    model.scale.setScalar(s);
    model.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(model);
    const center = box2.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -box2.min.y, -center.z);

    this._meshyRoot = model;
    t.add(model);

    // Intro camera target (~head height on a 2-unit figure)
    this.head = new THREE.Object3D();
    this.head.position.set(0, TARGET_HEIGHT * 0.78, 0.12);
    this._headScalePlay = 1;
    this._headScaleIntro = 1.05;
    t.add(this.head);

    // Synthetic arms so throw / wave / getThrowOrigin hooks keep working
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.55, TARGET_HEIGHT * 0.62, 0);
    t.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.55, TARGET_HEIGHT * 0.62, 0);
    const hand = new THREE.Object3D();
    hand.position.set(0, -0.55, 0.25);
    this.rightArm.add(hand);
    this.rightArm.userData.hand = hand;
    t.add(this.rightArm);

    // Default: face crowd (−Z). Intro sets rotation.y = 0 to face camera (+Z).
    t.rotation.y = Math.PI;
    this._modelReady = true;
    this.group.add(t);
  }

  _buildPodium() {
    const podium = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.7 })
    );
    podium.position.y = 0.9;
    podium.castShadow = true;
    podium.receiveShadow = true;
    this.group.add(podium);

    const seal = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 32),
      new THREE.MeshStandardMaterial({
        color: PAL.gold,
        emissive: 0x3a2600,
        metalness: 0.6,
        roughness: 0.4,
      })
    );
    seal.position.set(0, 1.0, 0.76);
    this.group.add(seal);
  }

  /**
   * Friendly Pixar/Toy Story Trump — soft plastic/felt materials,
   * slightly large cute head, warm peach skin, big catchlight eyes.
   */
  _buildToyStoryTrump() {
    const t = new THREE.Group();
    t.position.y = 1.65;
    this.trump = t;

    const faceTex = createTrumpFaceTexture({ expression: 'neutral', size: 512 });
    this._smileFaceTex = createTrumpFaceTexture({ expression: 'smile', size: 512 });
    this._shoutFaceTex = createTrumpFaceTexture({ expression: 'shout', size: 512 });
    this._neutralFaceTex = faceTex;
    const hairTex = createTrumpHairTexture(512);

    // Soft toy materials — warm peach, moderate roughness, slight gloss
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf8d2b0,
      roughness: 0.68,
      metalness: 0.0,
      emissive: 0x4a2818,
      emissiveIntensity: 0.05,
    });
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0x1c3058,
      roughness: 0.72,
      metalness: 0.04,
    });
    const pantMat = new THREE.MeshStandardMaterial({
      color: 0x152646,
      roughness: 0.75,
      metalness: 0.03,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xf8f4ec,
      roughness: 0.62,
      metalness: 0.0,
    });
    const tieMat = new THREE.MeshStandardMaterial({
      color: 0xe02232,
      roughness: 0.48,
      metalness: 0.05,
      emissive: 0x400010,
      emissiveIntensity: 0.1,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      map: hairTex,
      color: 0xffe8a0,
      roughness: 0.58,
      metalness: 0.02,
      emissive: 0x2a2200,
      emissiveIntensity: 0.05,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x1a120c,
      roughness: 0.4,
      metalness: 0.15,
    });

    // ---- Soft chibi body (rounded, toy proportions) ----
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.55, 8, 16), suitMat);
    torso.position.y = 0.48;
    torso.scale.set(1.15, 1.0, 0.85);
    torso.castShadow = true;
    t.add(torso);

    // Soft belly
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 16), suitMat);
    belly.position.set(0, 0.18, 0.1);
    belly.scale.set(1.25, 0.75, 0.9);
    belly.castShadow = true;
    t.add(belly);

    // Rounded shoulders
    [-0.55, 0.55].forEach((x) => {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), suitMat);
      sh.position.set(x, 0.95, 0);
      sh.scale.set(1.05, 0.85, 1.0);
      sh.castShadow = true;
      t.add(sh);
    });

    // Shirt placket
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.06), shirtMat);
    shirt.position.set(0, 0.55, 0.42);
    t.add(shirt);

    // Soft collar
    [-1, 1].forEach((s) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.05), shirtMat);
      col.position.set(s * 0.14, 1.0, 0.4);
      col.rotation.z = s * -0.35;
      col.rotation.x = -0.15;
      t.add(col);
    });

    // Long bright red tie (toy plastic)
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), tieMat);
    knot.position.set(0, 0.98, 0.44);
    knot.scale.set(1.1, 0.85, 0.7);
    t.add(knot);
    const tie = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.85, 4, 10), tieMat);
    tie.position.set(0, 0.4, 0.45);
    t.add(tie);

    // Lapels (soft, subtle)
    [-1, 1].forEach((s) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.05), suitMat);
      lapel.position.set(s * 0.26, 0.65, 0.4);
      lapel.rotation.z = s * -0.18;
      t.add(lapel);
    });

    // Flag pin
    const flagTex = createUSFlagTexture(64, 42);
    const pin = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.07),
      new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.5, metalness: 0.15 })
    );
    pin.position.set(-0.3, 0.8, 0.46);
    t.add(pin);

    // Soft neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 14), skinMat);
    neck.position.set(0, 1.18, 0.02);
    neck.castShadow = true;
    t.add(neck);

    // ---- CUTE oversized Pixar head (3D features — readable at distance) ----
    const head = new THREE.Group();
    head.position.y = 1.55;
    this._headScalePlay = 1.32;
    this._headScaleIntro = 1.48;
    head.scale.setScalar(this._headScalePlay);
    this.head = head;

    const blushMat = new THREE.MeshStandardMaterial({
      color: 0xf0b8a0,
      roughness: 0.7,
      metalness: 0.0,
      emissive: 0x301018,
      emissiveIntensity: 0.04,
    });
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xd07068,
      roughness: 0.55,
      metalness: 0.0,
    });
    const browMat = new THREE.MeshStandardMaterial({
      color: 0xe8c858,
      roughness: 0.55,
      metalness: 0.02,
    });

    // Soft peach skull — slightly oval (cute, not perfect ball)
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.52, 36, 28), skinMat);
    skull.scale.set(1.0, 1.12, 0.94);
    skull.position.set(0, 0.05, 0);
    skull.castShadow = true;
    head.add(skull);

    // Soft blush (tiny — Pixar cheeks, not clown spots)
    [-1, 1].forEach((s) => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), blushMat);
      cheek.position.set(s * 0.28, -0.08, 0.38);
      cheek.scale.set(1.1, 0.75, 0.55);
      head.add(cheek);
    });

    // Soft rounded nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), skinMat);
    nose.position.set(0, -0.02, 0.5);
    nose.scale.set(0.9, 0.95, 1.15);
    head.add(nose);

    // Soft chin (slight — cute, not heavy jowl)
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), skinMat);
    chin.position.set(0, -0.4, 0.24);
    chin.scale.set(1.05, 0.65, 0.85);
    head.add(chin);

    // Soft ears
    [-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), skinMat);
      ear.position.set(s * 0.5, 0.02, 0);
      ear.scale.set(0.38, 1.0, 0.6);
      head.add(ear);
    });

    // Keep canvas face textures for expression API (applied to a subtle front plate)
    // Primary read is 3D eyes/smile — plate is peach-tinted soft features only via map.
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    // Tiny nearly-invisible holder so _setExpression still swaps maps; features are 3D
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), faceMat);
    face.visible = false;
    head.add(face);
    this.face = face;

    // BIG friendly Pixar eyes with catchlights (pure geometry — no texture double-up)
    this._eyes = [];
    [-1, 1].forEach((s) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(s * 0.175, 0.1, 0.445);

      const white = new THREE.Mesh(
        new THREE.SphereGeometry(0.118, 20, 16),
        new THREE.MeshStandardMaterial({
          color: 0xfffaf6,
          roughness: 0.32,
          metalness: 0.0,
        })
      );
      white.scale.set(1.2, 1.25, 0.7);
      eyeGroup.add(white);

      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.072, 16, 14),
        new THREE.MeshStandardMaterial({
          color: 0x5eb4f0,
          roughness: 0.28,
          metalness: 0.08,
          emissive: 0x184878,
          emissiveIntensity: 0.18,
        })
      );
      iris.position.set(0, -0.008, 0.055);
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x141018, roughness: 0.4 })
      );
      pupil.position.set(0, -0.008, 0.095);
      eyeGroup.add(pupil);

      const catch1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      catch1.position.set(-0.028, 0.028, 0.12);
      eyeGroup.add(catch1);

      const catch2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.011, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      catch2.position.set(0.022, -0.018, 0.115);
      eyeGroup.add(catch2);

      // Soft upper lid — gentle squint so eyes feel kind, not stare-y
      const lid = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
        skinMat
      );
      lid.position.set(0, 0.07, 0.02);
      lid.scale.set(1.2, 0.45, 0.75);
      lid.rotation.x = 0.15;
      eyeGroup.add(lid);

      head.add(eyeGroup);
      this._eyes.push(eyeGroup);
    });

    // Soft arched blonde brows — friendly / \ (outer tips down), NOT angry furrow
    [-1, 1].forEach((s) => {
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.13, 4, 8), browMat);
      brow.position.set(s * 0.175, 0.265, 0.47);
      brow.rotation.z = s * 0.28;
      brow.rotation.x = -0.1;
      brow.scale.set(1.2, 1, 0.6);
      head.add(brow);
    });

    // Warm friendly smile — tube along a U-curve (reads as one smile, not twin blobs)
    const smilePts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const a = (u - 0.5) * Math.PI * 0.95;
      smilePts.push(new THREE.Vector3(Math.sin(a) * 0.16, -Math.cos(a) * 0.07 + 0.04, 0));
    }
    const smileCurve = new THREE.CatmullRomCurve3(smilePts);
    const smile = new THREE.Mesh(
      new THREE.TubeGeometry(smileCurve, 24, 0.018, 8, false),
      lipMat
    );
    smile.position.set(0, -0.2, 0.5);
    head.add(smile);
    this._smileMesh = smile;

    // Open mouth for shout expression
    const openMouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a2018, roughness: 0.6 })
    );
    openMouth.position.set(0, -0.22, 0.48);
    openMouth.scale.set(1.2, 0.85, 0.7);
    openMouth.visible = false;
    head.add(openMouth);
    this._openMouth = openMouth;

    // Soft blonde toy hair (chunky molded shapes — no stringy strands)
    const hair = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 16), hairMat);
    crown.position.set(0.04, 0.44, -0.06);
    crown.scale.set(1.2, 0.8, 1.14);
    crown.rotation.z = -0.18;
    hair.add(crown);

    const swoop = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), hairMat);
    swoop.position.set(0.2, 0.56, 0.14);
    swoop.scale.set(1.25, 0.5, 0.98);
    swoop.rotation.z = -0.68;
    hair.add(swoop);

    const frontFluff = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), hairMat);
    frontFluff.position.set(0.14, 0.5, 0.3);
    frontFluff.scale.set(1.35, 0.48, 0.72);
    frontFluff.rotation.z = -0.42;
    hair.add(frontFluff);

    const rear = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 14), hairMat);
    rear.position.set(-0.02, 0.24, -0.32);
    rear.scale.set(1.08, 0.68, 0.82);
    hair.add(rear);

    const nape = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), hairMat);
    nape.position.set(0, -0.04, -0.3);
    nape.scale.set(1.15, 0.42, 0.65);
    hair.add(nape);

    [-1, 1].forEach((s) => {
      const side = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), hairMat);
      side.position.set(s * 0.46, 0.14, -0.02);
      side.scale.set(0.5, 1.15, 0.85);
      hair.add(side);
    });

    hair.children.forEach((c) => {
      c.castShadow = true;
    });
    head.add(hair);
    t.add(head);

    // Short stubby legs (chibi)
    [-0.28, 0.28].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.35, 6, 12), pantMat);
      leg.position.set(x, -0.28, 0);
      leg.castShadow = true;
      t.add(leg);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), shoeMat);
      shoe.position.set(x, -0.62, 0.06);
      shoe.scale.set(1.1, 0.55, 1.35);
      t.add(shoe);
    });

    // Arms
    this.leftArm = this._arm(suitMat, skinMat, -1);
    this.leftArm.position.set(-0.72, 0.92, 0);
    t.add(this.leftArm);
    this.rightArm = this._arm(suitMat, skinMat, 1);
    this.rightArm.position.set(0.72, 0.92, 0);
    t.add(this.rightArm);

    t.rotation.y = Math.PI;
    this._modelReady = true;
    this.group.add(t);

    console.info('[Player] Toy Story Trump ready');
  }

  _arm(sleeveMat, handMat, side) {
    const arm = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.55, 6, 12), sleeveMat);
    upper.position.y = -0.38;
    upper.castShadow = true;
    arm.add(upper);
    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: 0xf8f4ec, roughness: 0.5 })
    );
    cuff.position.y = -0.78;
    arm.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), handMat);
    hand.position.y = -0.92;
    hand.scale.set(1.05, 0.9, 1.0);
    hand.castShadow = true;
    arm.add(hand);
    arm.userData.hand = hand;
    arm.rotation.z = side * -0.12;
    return arm;
  }

  getThrowOrigin(target = new THREE.Vector3()) {
    const hand = this.rightArm?.userData?.hand;
    if (hand) hand.getWorldPosition(target);
    else target.set(0, 3.2, CONFIG.world.podiumZ);
    return target;
  }

  triggerThrow() {
    if (this.isIntroActive) return;
    this.throwT = 0;
  }

  setAim(x) {
    this.aimYaw = clamp(x, -1, 1) * -0.4;
  }

  startLevelIntro() {
    if (!this._modelReady) {
      this._pendingIntro = true;
      return;
    }
    this._pendingIntro = false;
    this.introPhase = 'face';
    this.introT = 0;
    this.throwT = 1;
    this._waveArm = true;
    this._setExpression('smile');
    if (this.trump) {
      this.trump.rotation.y = 0; // face +Z / camera
      this.trump.rotation.x = 0;
    }
    if (this.head) {
      this.head.rotation.y = 0;
      this.head.rotation.z = 0;
      this.head.scale.setScalar(this._headScaleIntro || 1.42);
    }
  }

  get isIntroActive() {
    return this.introPhase === 'face' || this.introPhase === 'turn';
  }

  _setExpression(kind) {
    if (this._smileMesh) this._smileMesh.visible = kind !== 'shout';
    if (this._openMouth) this._openMouth.visible = kind === 'shout';
    const map =
      kind === 'smile'
        ? this._smileFaceTex
        : kind === 'shout'
          ? this._shoutFaceTex
          : this._neutralFaceTex;
    if (this.face?.material && map) {
      this.face.material.map = map;
      this.face.material.needsUpdate = true;
    }
  }

  update(dt) {
    this.t += dt;
    if (!this.trump) return;

    const bob = Math.sin(this.t * 2) * 0.03;
    this.trump.position.y = 1.65 + bob;

    if (this.introPhase === 'face') {
      this.introT += dt;
      this.trump.rotation.y = 0;
      if (this.head) this.head.scale.setScalar(this._headScaleIntro || 1.42);
      // Friendly wave with left arm while facing camera
      if (this.leftArm && this._waveArm) {
        this.leftArm.rotation.x = -1.8 + Math.sin(this.t * 8) * 0.35;
        this.leftArm.rotation.z = 0.35;
      }
      // Face camera ~1s then turn to throw
      if (this.introT >= 1.05) {
        this.introPhase = 'turn';
        this.introT = 0;
        this._waveArm = false;
        if (this.leftArm) {
          this.leftArm.rotation.x = 0;
          this.leftArm.rotation.z = -0.12;
        }
      }
    } else if (this.introPhase === 'turn') {
      this.introT += dt;
      const turnDur = 0.55;
      const u = Math.min(1, this.introT / turnDur);
      const eased = u * u * (3 - 2 * u);
      this.trump.rotation.y = THREE.MathUtils.lerp(0, Math.PI, eased);
      if (this.head) {
        const s0 = this._headScaleIntro || 1.42;
        const s1 = this._headScalePlay || 1.28;
        this.head.scale.setScalar(THREE.MathUtils.lerp(s0, s1, eased));
      }
      if (u >= 1) {
        this.introPhase = null;
        this._setExpression('neutral');
      }
    } else {
      const targetYaw = Math.PI + this.aimYaw;
      this.trump.rotation.y += (targetYaw - this.trump.rotation.y) * Math.min(1, dt * 8);
      if (this.head && this._headScalePlay) {
        const cur = this.head.scale.x;
        const target = this._headScalePlay;
        if (Math.abs(cur - target) > 0.002) {
          this.head.scale.setScalar(THREE.MathUtils.lerp(cur, target, Math.min(1, dt * 6)));
        }
      }
    }

    // Gentle bobblehead wobble
    if (this.head) {
      if (this.introPhase === 'face') {
        this.head.rotation.y = 0;
        this.head.rotation.z = 0;
      } else {
        this.head.rotation.y = Math.sin(this.t * 0.7) * 0.12;
        this.head.rotation.z = Math.sin(this.t * 1.1) * 0.025;
      }
    }

    if (this.throwT < 1 && !this.isIntroActive) {
      this.throwT = Math.min(1, this.throwT + dt * 4.5);
      const p = this.throwT;
      let rx;
      if (p < 0.3) rx = THREE.MathUtils.lerp(-0.12, -2.4, p / 0.3);
      else if (p < 0.6) rx = THREE.MathUtils.lerp(-2.4, 1.6, (p - 0.3) / 0.3);
      else rx = THREE.MathUtils.lerp(1.6, -0.12, (p - 0.6) / 0.4);

      if (this.rightArm?.rotation) this.rightArm.rotation.x = rx;
      this.trump.rotation.x = p > 0.3 && p < 0.7 ? -0.12 : 0;
      // Unskinned Meshy: wind-up / release as whole-body pitch
      if (this._meshyRoot) {
        const lean = p < 0.3 ? THREE.MathUtils.lerp(0, -0.35, p / 0.3)
          : p < 0.6 ? THREE.MathUtils.lerp(-0.35, 0.45, (p - 0.3) / 0.3)
          : THREE.MathUtils.lerp(0.45, 0, (p - 0.6) / 0.4);
        this._meshyRoot.rotation.x = lean;
      }
    } else {
      if (this.rightArm?.rotation && !this.isIntroActive) {
        this.rightArm.rotation.x += (-0.12 - this.rightArm.rotation.x) * Math.min(1, dt * 6);
      }
      this.trump.rotation.x += (0 - this.trump.rotation.x) * Math.min(1, dt * 6);
      if (this._meshyRoot) {
        this._meshyRoot.rotation.x += (0 - this._meshyRoot.rotation.x) * Math.min(1, dt * 6);
      }
    }

    if (this.leftArm?.rotation && !this._waveArm && !this.isIntroActive) {
      this.leftArm.rotation.x = Math.sin(this.t * 2) * 0.08;
    }

    // Meshy intro: slight greeting bob since there is no skinned wave arm
    if (this._meshyRoot && this.introPhase === 'face') {
      this._meshyRoot.rotation.z = Math.sin(this.t * 8) * 0.08;
    } else if (this._meshyRoot && this._meshyRoot.rotation.z) {
      this._meshyRoot.rotation.z += (0 - this._meshyRoot.rotation.z) * Math.min(1, dt * 6);
    }
  }

  celebrate() {
    if (this.leftArm) this.leftArm.rotation.x = -2.2;
    if (this.rightArm) this.rightArm.rotation.x = -2.2;
    this._setExpression('smile');
  }

  shout() {
    this._setExpression('shout');
  }
}

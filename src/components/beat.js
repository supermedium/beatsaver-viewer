import {BEAT_WARMUP_OFFSET, BEAT_WARMUP_SPEED, BEAT_WARMUP_TIME} from '../constants/beat';
const COLORS = require('../constants/colors.js');

const auxObj3D = new THREE.Object3D();
const collisionZThreshold = -1.65;
const BEAT_WARMUP_ROTATION_CHANGE = Math.PI / 5;
const BEAT_WARMUP_ROTATION_OFFSET = 0.4;
const BEAT_WARMUP_ROTATION_TIME = 750;
const DESTROYED_SPEED = 1.0;
const SWORD_OFFSET = 1.5;
const ONCE = {once: true};

const SCORE_POOL = {
  OK : 'pool__beatscoreok',
  GOOD : 'pool__beatscoregood',
  GREAT : 'pool__beatscoregreat',
  SUPER : 'pool__beatscoresuper'
};

function getHorizontalPosition (lineIndex) {
  return lineIndex / 3 * 1.5 - 0.75
}

function getVerticalPosition (lineLayer) {
  return lineLayer / 2 + 0.7;
}

/**
 * Bears, beats, Battlestar Galactica.
 * Create beat from pool, collision detection, movement, scoring.
 */
AFRAME.registerComponent('beat', {
  schema: {
    anticipationPosition: {default: 0},
    color: {default: 'red', oneOf: ['red', 'blue']},
    cutDirection: {default: 'down'},
    debug: {default: false},
    horizontalPosition: {default: 1},
    size: {default: 0.40},
    speed: {default: 8.0},
    type: {default: 'arrow', oneOf: ['arrow', 'dot', 'mine']},
    verticalPosition: {default: 1},
    warmupPosition: {default: 0},
  },

  materialColor: {
    blue: COLORS.BEAT_BLUE,
    red: COLORS.BEAT_RED
  },

  cutColor: {
    blue: '#fff',
    red: '#fff'
  },

  models: {
    arrow: 'beatObjTemplate',
    dot: 'beatObjTemplate',
    mine: 'mineObjTemplate'
  },

  signModels: {
    arrowred: 'arrowRedObjTemplate',
    arrowblue: 'arrowBlueObjTemplate',
    dotred: 'dotRedObjTemplate',
    dotblue: 'dotBlueObjTemplate'
  },

  orientations: [180, 0, 270, 90, 225, 135, 315, 45, 0],

  rotations: {
    up: 180,
    down: 0,
    left: 270,
    right: 90,
    upleft: 225,
    upright: 135,
    downleft: 315,
    downright: 45
  },

  init: function () {
    this.beams = document.getElementById('beams').components.beams;
    this.beatBoundingBox = new THREE.Box3();
    this.currentRotationWarmupTime = 0;
    this.cutDirection = new THREE.Vector3();
    this.destroyed = false;
    this.gravityVelocity = 0;
    this.hitEventDetail = {};
    this.hitBoundingBox = new THREE.Box3();
    this.poolName = undefined;
    this.returnToPoolTimeStart = undefined;
    this.rotationAxis = new THREE.Vector3();
    this.scoreEl = null;
    this.scoreElTime = undefined;
    this.startPositionZ = undefined;

    this.particles = document.getElementById('saberParticles');
    this.mineParticles = document.getElementById('mineParticles');
    this.explodeEventDetail = {position: new THREE.Vector3(), rotation: new THREE.Euler()};
    this.glow = null;

    this.initBlock();
    if (this.data.type === 'mine') {
      this.initMineFragments();
    }
  },

  update: function () {
    this.updateBlock();

    if (this.data.type === 'mine') {
      this.poolName = `pool__beat-mine`;
    } else {
      this.poolName = `pool__beat-${this.data.type}-${this.data.color}`;
    }
  },

  pause: function () {
    this.el.object3D.visible = false;
  },

  play: function () {
    this.glow = this.el.sceneEl.components['pool__beat-glow'].requestEntity();
    this.blockEl.object3D.visible = true;
    this.destroyed = false;
    this.el.object3D.visible = true;
  },

  tock: function (time, timeDelta) {
    const el = this.el;
    const data = this.data;
    const position = el.object3D.position;
    const rotation = el.object3D.rotation;

    if (this.returnToPoolTimeStart && time - this.returnToPoolTimeStart > 800) {
      this.returnToPool();
      this.returnToPoolTimeStart = undefined;
      return;
    }

    // Move.
    if (position.z < data.anticipationPosition) {
      let newPositionZ = position.z + BEAT_WARMUP_SPEED * (timeDelta / 1000);
      // Warm up / warp in.
      if (newPositionZ < data.anticipationPosition) {
        position.z = newPositionZ;
      } else {
        position.z = data.anticipationPosition;
        this.beams.newBeam(this.data.color, position);
      }
    } else {
      const oldPosition = position.z;

      // Standard moving.
      position.z += this.data.speed * (timeDelta / 1000);
      rotation.z = this.startRotationZ;

      if (oldPosition < -1 * SWORD_OFFSET && position.z >= -1 * SWORD_OFFSET) {
        this.returnToPoolTimeStart = time;
        if (this.data.type === 'mine') {
          this.destroyMine();
        } else {
          this.destroyBeat();
        }
      }
    }

    if (position.z > (data.anticipationPosition - BEAT_WARMUP_ROTATION_OFFSET) &&
        this.currentRotationWarmupTime < BEAT_WARMUP_ROTATION_TIME) {
      const progress = AFRAME.ANIME.easings.easeOutBack(
        this.currentRotationWarmupTime / BEAT_WARMUP_ROTATION_TIME);
      el.object3D.rotation.z = this.rotationZStart + (progress * this.rotationZChange);
      this.currentRotationWarmupTime += timeDelta;
    }
  },

  /**
   * Called when summoned by beat-generator.
   */
  onGenerate: function () {
    const data = this.data;
    const el = this.el;

    // Set position.
    el.object3D.position.set(
      getHorizontalPosition(data.horizontalPosition),
      getVerticalPosition(data.verticalPosition),
      data.anticipationPosition + data.warmupPosition
    );
    el.object3D.rotation.z = THREE.Math.degToRad(this.rotations[data.cutDirection]);

    // Set up rotation warmup.
    this.startRotationZ = this.el.object3D.rotation.z;
    this.currentRotationWarmupTime = 0;
    this.rotationZChange = BEAT_WARMUP_ROTATION_CHANGE;
    if (Math.random > 0.5) { this.rotationZChange *= -1; }
    this.el.object3D.rotation.z -= this.rotationZChange;
    this.rotationZStart = this.el.object3D.rotation.z;
    // Reset mine.
    if (data.type == 'mine') { this.resetMineFragments(); }

    this.returnToPoolTimeStart = undefined;
  },

  initBlock: function () {
    var el = this.el;
    var blockEl = this.blockEl = document.createElement('a-entity');
    var signEl = this.signEl = document.createElement('a-entity');

    blockEl.setAttribute('mixin', 'beatBlock');
    blockEl.setAttribute('mixin', 'beatSign');

    // Small offset to prevent z-fighting when the blocks are far away
    signEl.object3D.position.z += 0.02;
    blockEl.appendChild(signEl);
    el.appendChild(blockEl);
  },

  updateBlock: function () {
    const blockEl = this.blockEl;
    const signEl = this.signEl;
    if (!blockEl) { return; }

    blockEl.setAttribute('material', {
      metalness: 0.7,
      roughness: 0.1,
      sphericalEnvMap: '#envmapTexture',
      emissive: this.materialColor[this.data.color],
      emissiveIntensity: 0.05,
      color: this.materialColor[this.data.color]
    });
    this.setObjModelFromTemplate(blockEl, this.models[this.data.type]);

    // Model is 0.29 size. We make it 1.0 so we can easily scale based on 1m size.
    blockEl.object3D.scale.set(1, 1, 1);
    blockEl.object3D.scale.multiplyScalar(3.45).multiplyScalar(this.data.size);

    if (this.data.type === 'mine') {
      const model = blockEl.getObject3D('mesh');
      if (model) {
        model.material = this.el.sceneEl.systems.materials['mineMaterial' + this.data.color];
      } else {
        blockEl.addEventListener('model-loaded', () => {
          model.material = this.el.sceneEl.systems.materials['mineMaterial' + this.data.color];
        }, ONCE);
      }
    } else {
      signEl.setAttribute('materials', {name: 'stageAdditive'});
      this.setObjModelFromTemplate(signEl, this.signModels[this.data.type + this.data.color]);
    }
  },

  initMineFragments: function () {
    var fragment;
    var fragments = this.el.sceneEl.systems['mine-fragments-loader'].fragments.children;
    var material = this.el.sceneEl.systems.materials['mineMaterial' + this.data.color];

    this.randVec = new THREE.Vector3(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI);

    this.mineFragments = [];
    this.mineBroken = document.createElement('a-entity');
    this.el.appendChild(this.mineBroken);

    for (var i = 0; i < fragments.length; i++) {
      fragment = new THREE.Mesh(fragments[i].geometry, material);
      fragment.speed = new THREE.Vector3();
      fragment.speed.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      this.mineFragments.push(fragment);
      this.mineBroken.object3D.add(fragment);
    }
  },

  resetMineFragments: function () {
    if (this.data.type !== 'mine') { return; }
    for (let i = 0; i < this.mineFragments.length; i++) {
      let fragment = this.mineFragments[i];
      fragment.visible = false;
      fragment.position.set(0, 0, 0);
      fragment.scale.set(1, 1, 1);
      fragment.speed.set(
        Math.random() * 5 - 2.5,
        Math.random() * 5 - 2.5,
        Math.random() * 5 - 2.5);
    }
  },

  destroyMine: function () {
    for (let i = 0; i < this.mineFragments.length; i++) {
      this.mineFragments[i].visible = true;
    }

    this.blockEl.object3D.visible = false;
    this.destroyed = true;
    this.gravityVelocity = 0.1;
    this.returnToPoolTimer = 800;

    this.explodeEventDetail.position.copy(this.el.object3D.position);
    this.explodeEventDetail.rotation.copy(this.randVec);
    this.mineParticles.emit('explode', this.explodeEventDetail, false);
  },

  destroyBeat: function () {
    this.el.object3D.visible = false;

    this.el.parentNode.components['beat-hit-sound'].playSound(
      this.el, this.data.cutDirection);

    // Play sound and particles for viewer.
    this.explodeEventDetail.position.copy(this.el.object3D.position);
    this.explodeEventDetail.rotation.copy(this.el.object3D.rotation);
    this.particles.emit('explode', this.explodeEventDetail, false);

    if (this.glow) {
      this.glow.play();
      this.glow.object3D.visible = true;
      this.glow.object3D.position.copy(this.el.object3D.position);
      this.glow.object3D.rotation.z = Math.random() * 2.0;
      this.glow.emit('explode', null, false);

      if (this.data.type !== 'mine') {
        setTimeout(() => {
          this.el.sceneEl.components['pool__beat-glow'].returnEntity(this.glow);
        }, 350);
      }
    }
  },

  returnToPool: function () {
    this.el.sceneEl.components[this.poolName].returnEntity(this.el);
  },

  /**
   * Load OBJ from already parsed and loaded OBJ template.
   */
  setObjModelFromTemplate: (function () {
    const geometries = {};

    return function (el, templateId) {
      if (!geometries[templateId]) {
        const templateEl = document.getElementById(templateId);
        if (templateEl.getObject3D('mesh')) {
          geometries[templateId] = templateEl.getObject3D('mesh').children[0].geometry;
        } else {
          templateEl.addEventListener('model-loaded', () => {
            geometries[templateId] = templateEl.getObject3D('mesh').children[0].geometry;
            this.setObjModelFromTemplate(el, templateId);
          });
          return;
        }
      }

      if (!el.getObject3D('mesh')) { el.setObject3D('mesh', new THREE.Mesh()); }
      el.getObject3D('mesh').geometry = geometries[templateId];
    };
  })()
});

/**
 * Get velocity given current velocity using gravity acceleration.
 */
function getGravityVelocity (velocity, timeDelta) {
  const GRAVITY = -9.8;
  return velocity + (GRAVITY * (timeDelta / 1000));
}

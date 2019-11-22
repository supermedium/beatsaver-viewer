import {BEAT_WARMUP_OFFSET, BEAT_WARMUP_SPEED, BEAT_WARMUP_TIME} from '../constants/beat';

// So wall does not clip the stage ground.
const RAISE_Y_OFFSET = 0.15;

const CEILING_THICKNESS = 1.5;
const CEILING_HEIGHT = 1.4 + CEILING_THICKNESS / 2;
const CEILING_WIDTH = 4;

function getHorizontalPosition (lineIndex) {
  return lineIndex / 3 * 1.5 - 0.75
}

/**
 * Wall to dodge.
 */
AFRAME.registerComponent('wall', {
  schema: {
    anticipationPosition: {default: 0},
    durationSeconds: {default: 0},
    height: {default: 1.3},
    horizontalPosition: {default: 1},
    isCeiling: {default: false},
    speed: {default: 1.0},
    warmupPosition: {default: 0},
    width: {default: 1}
  },

  init: function () {
    this.maxZ = 10;
  },

  update: function () {
    const el = this.el;
    const data = this.data;
    const width = data.width;

    const halfDepth = data.durationSeconds * data.speed / 2;

    if (data.isCeiling) {
      el.object3D.position.set(
        getHorizontalPosition(data.horizontalPosition) + width / 2  - 0.25,
        CEILING_HEIGHT,
        data.anticipationPosition + data.warmupPosition - halfDepth
      );
      el.object3D.scale.set(
        width,
        CEILING_THICKNESS,
        data.durationSeconds * data.speed
      );
      return;
    }

    // Box geometry is constructed from the local 0,0,0 growing in the positive and negative
    // x and z axis. We have to shift by half width and depth to be positioned correctly.
    el.object3D.position.set(
      getHorizontalPosition(data.horizontalPosition) + width / 2  - 0.25,
      data.height + RAISE_Y_OFFSET,
      data.anticipationPosition + data.warmupPosition - halfDepth
    );
    el.object3D.scale.set(
      width,
      2.5,
      data.durationSeconds * data.speed
    );
  },

  setMappingExtensionsHeight: function (startHeight, height) {
    const data = this.data;
    const el = this.el;

    const halfDepth = data.durationSeconds * data.speed / 2;

    el.object3D.position.set(
      getHorizontalPosition(data.horizontalPosition) + data.width / 2  - 0.25,
      startHeight + RAISE_Y_OFFSET,
      data.anticipationPosition + data.warmupPosition - halfDepth
    );

    el.object3D.scale.set(
      data.width,
      height,
      data.durationSeconds * data.speed
    );
  },

  pause: function () {
    this.el.object3D.visible = false;
    this.el.removeAttribute('data-collidable-head');
  },

  play: function () {
    this.el.object3D.visible = true;
    this.el.setAttribute('data-collidable-head', '');
  },

  tock: function (time, timeDelta) {
    const data = this.data;
    const halfDepth = data.durationSeconds * data.speed / 2;
    const position = this.el.object3D.position;

    // Move.
    this.el.object3D.visible = true;
    if (position.z < (data.anticipationPosition - halfDepth)) {
      let newPositionZ = position.z + BEAT_WARMUP_SPEED * (timeDelta / 1000);
      // Warm up / warp in.
      if (newPositionZ < (data.anticipationPosition - halfDepth)) {
        position.z = newPositionZ;
      } else {
        position.z = data.anticipationPosition - halfDepth;
      }
    } else {
      // Standard moving.
      position.z += this.data.speed * (timeDelta / 1000);
    }

    if (this.el.object3D.position.z > (this.maxZ + halfDepth)) {
      this.returnToPool();
      return;
    }
  },

  returnToPool: function () {
    this.el.sceneEl.components.pool__wall.returnEntity(this.el);
    this.el.object3D.position.z = 9999;
    this.el.pause();
    this.el.removeAttribute('data-collidable-head');
  }
});

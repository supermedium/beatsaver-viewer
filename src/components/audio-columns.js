
const NUM_VALUES_PER_BOX = 90;

/**
 * Column bars moving in sync to the audio via audio analyser.
 */
AFRAME.registerComponent('audio-columns', {
  schema: {
    analyser: {type: 'selector', default: '#audioAnalyser'},
    height: {default: 1.0},
    mirror: {default: 3},
    scale: {default: 4.0},
    separation: {default: 0.3},
    thickness: {default: 0.1}
  },

  init: function () {
    var objData = document.getElementById('audiocolumnObj').data;
    var loader = new THREE.OBJLoader();
    var columnGeometry = loader.parse(objData).children[0].geometry;

    this.analyser = this.data.analyser.components.audioanalyser;

    // Number of levels is half the FFT size.
    this.frequencyBinCount = this.analyser.data.fftSize / 2;

    // Create boxes (one row on each side per level).
    const geometries = [];
    let zPosition = 0;
    for (let i = 0; i < this.frequencyBinCount; i++) {
      for (let side = 0; side < 2; side++) {
        const box = columnGeometry.clone();
        this.initBox(box, side === 0 ? 1 : -1, zPosition);
        geometries.push(box);
        // Move Z back.
        zPosition -= this.data.separation;
      }
    }

    this.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
    const mesh = new THREE.Mesh(this.geometry, this.el.sceneEl.systems.materials.stageNormal);
    this.el.setObject3D('mesh', mesh);
  },

  tick: function () {
    // Step by 2 since we create one box of each side per level.
    for (let i = 0; i < this.frequencyBinCount * 2; i += 2) {
      let yScale = (this.data.height / 2) + this.analyser.levels[Math.floor(i / 2)] / 256.0 *
                   this.data.scale;
      if (isNaN(yScale)) { return; }
      this.setBoxHeight(this.frequencyBinCount * 2 - i - 1, yScale);
      this.setBoxHeight(this.frequencyBinCount * 2 - i - 2, yScale);
      this.geometry.attributes.position.needsUpdate = true;
    }
  },

  /**
   * Initialize box by changing vertex buffer, to set position and scale.
   */
  initBox: function (box, flip, zPosition) {
    const data = this.data;

    // Set position and scale of box via vertices.
    for (let v = 0; v < box.attributes.position.array.length; v += 3) {
      // Apply thickness to X and Z.
      // box.attributes.position.array[v] *= data.thickness;
      // box.attributes.position.array[v + 2] *= data.thickness;
// Apply zPosition.
      box.attributes.position.array[v + 2] += zPosition;

      // Apply height to Y.
      box.attributes.position.array[v + 1] *= data.height / 2;

      // Change X vertex positions for mirroring.
      box.attributes.position.array[v] += flip * data.mirror;
    }
  },

  /**
   * Set Y of vertices.
   */
  setBoxHeight: function (boxNumber, height) {
    const boxIndex = boxNumber * NUM_VALUES_PER_BOX;
    for (let i = boxIndex; i < boxIndex + NUM_VALUES_PER_BOX; i += 3) {
      // Set Y.
      let yValue = this.geometry.attributes.position.array[i + 1];
      this.geometry.attributes.position.array[i + 1] = yValue >= 0
        ? height
        : -1 * height;
    }
  }
});

const NUM_VALUES_PER_SEGMENT = 75;

AFRAME.registerComponent('twister', {
  schema: {
    enabled: {default: false},
    twist: {default: 0},
    vertices: {default: 4, type: 'int'},
    count: {default: 12, type: 'int'},
    positionIncrement: {default: 1.4},
    radiusIncrement: {default: 0.40},
    thickness: {default: 0.37}
  },

  init: function () {
    this.currentTwist = 0;
    this.animate = false;
    this.geometry = null;
  },

  pulse: function (twist) {
    if (!this.data.enabled) { return; }
    if (twist == 0) { twist = 0.03 + Math.random() * 0.25; }
    else twist = Math.min(twist * 0.4, 0.4);
    twist *= Math.random() < 0.5 ? -1 : 1; // random direction
    this.el.setAttribute('twister', {twist: twist});
  },

  update: function (oldData) {
    var radius = 6;
    var segments = [];

    if (Math.abs(this.data.twist - this.currentTwist) > 0.001) {
      this.animate = true;
      return;
    }

    this.clear();

    for (var i = 0; i < this.data.count; i++) {
      let segment = this.createSegment(radius);
      segment.translate(0, this.data.positionIncrement * i, 0);
      segments.push(segment);
      radius += this.data.radiusIncrement;
    }
    this.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(segments);
    var material = this.el.sceneEl.systems.materials.stageNormal;
    var mesh = new THREE.Mesh(this.geometry, material);
    this.el.object3D.add(mesh);
  },

  createSegment: function (radius) {
    const R = this.data.thickness;
    var geometry;
    var points = [
      new THREE.Vector2(radius - R, R),
      new THREE.Vector2(radius - R, -R),
      new THREE.Vector2(radius + R, -R),
      new THREE.Vector2(radius + R, R),
      new THREE.Vector2(radius - R, R)
    ];
    geometry = new THREE.LatheBufferGeometry(points, this.data.vertices);
    // move uvs to a specific point in atlas.png
    for (let i = 0; i < geometry.attributes.uv.array.length; i += 2) {
      geometry.attributes.uv.array[i] = 0.77;
      geometry.attributes.uv.array[i + 1] = 0.001;
    }
    return geometry;
  },

  clear: function () {
    this.el.object3D.remove(this.el.object3D.children[0]);
    if (this.geometry) this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
  },

  tick: function (time, delta) {
    if (!this.animate) { return; }

    var posArray = this.geometry.attributes.position.array;
    var rotation;
    var x, y;
    var sin, cos;
    var diff;

    delta *= 0.001;

    diff = (this.data.twist - this.currentTwist) * delta;

    this.currentTwist += diff;
    rotation = diff * 3.0;

    for (var s = 0; s < this.data.count; s++) {
      for (var i = 0; i < NUM_VALUES_PER_SEGMENT; i += 3) {
        cos = Math.cos(rotation);
        sin = Math.sin(rotation);
        x = posArray[s * NUM_VALUES_PER_SEGMENT + i];
        y = posArray[s * NUM_VALUES_PER_SEGMENT + i + 2];
        posArray[s * NUM_VALUES_PER_SEGMENT + i] = x * cos - y * sin;
        posArray[s * NUM_VALUES_PER_SEGMENT + i + 2] = y * cos + x * sin;
      }
      rotation *= 1.05;
    }
    this.geometry.attributes.position.needsUpdate = true;

    if (Math.abs(this.data.twist - this.currentTwist) < 0.001){
      this.animate = false;
    }
  }
});

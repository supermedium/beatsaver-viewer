const NUM_PLANE_POSITIONS = 12;

const BLENDINGS = {
  normal: THREE.NormalBlending,
  additive: THREE.AdditiveBlending,
  substractive: THREE.SubstractiveBlending,
  multiply: THREE.MultiplyBlending
};

const SHADERS = {
  flat: THREE.MeshBasicMaterial,
  lambert: THREE.MeshLambertMaterial,
  phong: THREE.MeshPhongMaterial,
  standard: THREE.MeshStandardMaterial
};

const OFFSCREEN_VEC3 = new THREE.Vector3(-99999, -99999, -99999);

/**
 * Particle Player component for A-Frame.
 */
AFRAME.registerComponent('particleplayer', {
  schema: {
    blending: {
      default: 'additive',
      oneOf: ['normal', 'additive', 'multiply', 'substractive']
    },
    color: {default: '#fff', type: 'color'},
    count: {default: '100%'},
    delay: {default: 0, type: 'int'},
    dur: {default: 1000, type: 'int'},
    img: {type: 'selector'},
    interpolate: {default: false},
    loop: {default: 'false'},
    on: {default: 'init'},
    poolSize: {default: 5, type: 'int'}, // number of simultaneous particle systems
    protation: {type: 'vec3'},
    pscale: {default: 1.0, type: 'float'},
    scale: {default: 1.0, type: 'float'},
    initialScale: {type: 'vec3'},
    finalScale: {type: 'vec3'},
    animateScale: {default: false},
    shader: {
      default: 'flat',
      oneOf: ['flat', 'lambert', 'phong', 'standard']
    },
    src: {type: 'selector'}
  },

  multiple: true,

  init: function () {
    this.frame = 0;
    this.framedata = null;
    this.indexPool = null;
    this.lastFrame = 0;
    this.material = null;
    this.msPerFrame = 0;
    this.numFrames = 0;
    this.numParticles = 0; // total number of particles per system
    this.originalVertexPositions = [];
    this.particleCount = 0; // actual number of particles to spawn per event (data.count)
    this.particleSystems = [];
    this.protation = false;
    this.restPositions = []; // position at first frame each particle is alive
    this.restRotations = [];
    this.sprite_rotation = false;
    this.systems = null;
    this.useRotation = false;
    this.useAge = false;
    this.scaleAnim = new THREE.Vector3();
    this.partScale = new THREE.Vector3(1.0, 1.0, 1.0);
  },

  update: function (oldData) {
    const data = this.data;

    if (!data.src) {
      return;
    }

    if (oldData.on !== data.on) {
      if (oldData.on) {
        this.el.removeEventListener(oldData.on, this.start);
      }
      if (data.on !== 'play') {
        this.el.addEventListener(data.on, this.start.bind(this));
      }
    }

    this.partScale.set(1.0, 1.0, 1.0);

    this.loadParticlesJSON(data.src, data.scale);

    this.numFrames = this.framedata.length;
    this.numParticles = this.numFrames > 0 ? this.framedata[0].length : 0;

    if (data.count[data.count.length - 1] === '%') {
      this.particleCount = Math.floor(
        (parseInt(data.count) * this.numParticles) / 100.0
      );
    } else {
      this.particleCount = parseInt(data.count);
    }
    this.particleCount = Math.min(
      this.numParticles,
      Math.max(0, this.particleCount)
    );

    this.msPerFrame = data.dur / this.numFrames;

    this.indexPool = new Array(this.numParticles);

    const materialParams = {
      color: new THREE.Color(data.color),
      side: THREE.DoubleSide,
      blending: BLENDINGS[data.blending],
      map: data.img ? new THREE.TextureLoader().load(data.img.src) : null,
      depthWrite: false,
      opacity: data.opacity,
      transparent: !!data.img || data.blending !== 'normal' || data.opacity < 1
    };
    if (SHADERS[data.shader] !== undefined) {
      this.material = new SHADERS[data.shader](materialParams);
    } else {
      this.material = new SHADERS['flat'](materialParams);
    }

    this.createParticles(data.poolSize);

    if (data.on === 'init') {
      this.start();
    }
  },

  loadParticlesJSON: function (json, scale) {
    var alive;

    this.restPositions.length = 0;
    this.restRotations.length = 0;

    const jsonData = JSON.parse(json.data);
    const frames = jsonData.frames;
    const precision = jsonData.precision;

    this.useRotation = jsonData.rotation;
    this.useAge = jsonData['age'] !== undefined ? jsonData.age : false;

    if (jsonData.sprite_rotation !== false) {
      this.sprite_rotation = {
        x: jsonData.sprite_rotation[0] / precision,
        y: jsonData.sprite_rotation[1] / precision,
        z: jsonData.sprite_rotation[2] / precision
      };
    } else {
      this.sprite_rotation = false;
    }

    this.framedata = new Array(frames.length);
    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      this.framedata[frameIndex] = new Array(frames[frameIndex].length);
      for (
        let particleIndex = 0;
        particleIndex < frames[frameIndex].length;
        particleIndex++
      ) {
        let rawP = frames[frameIndex][particleIndex]; // data of particle i in frame f
        alive = rawP !== 0; // 0 means not alive yet this frame.

        let p = (this.framedata[frameIndex][particleIndex] = {
          position: alive
            ? {
              x: (rawP[0] / precision) * scale,
              y: (rawP[1] / precision) * scale,
              z: (rawP[2] / precision) * scale
            }
            : null,
          alive: alive
        });

        if (this.useRotation) {
          p.rotation = alive
            ? {
              x: rawP[3] / precision,
              y: rawP[4] / precision,
              z: rawP[5] / precision
            }
            : null;
        }

        if (this.useAge) {
          p.age = alive ? rawP[6] / precision : 0;
        }

        if (alive && frameIndex === 0) {
          this.restPositions[particleIndex] = p.position
            ? {x: p.position.y, y: p.position.y, z: p.position.z}
            : null;
          this.restRotations[particleIndex] = p.rotation
            ? {x: p.rotation.y, y: p.rotation.y, z: p.rotation.z}
            : null;
        }
      }
    }
  },

  createParticles: (function () {
    const tempGeometries = [];

    return function (numParticleSystems) {
      const data = this.data;
      var loop = parseInt(this.data.loop);

      this.particleSystems.length = 0;

      if (isNaN(loop)) {
        loop = this.data.loop === 'true' ? Number.MAX_VALUE : 0;
      }

      for (let i = 0; i < numParticleSystems; i++) {
        let particleSystem = {
          active: false,
          activeParticleIndices: new Array(this.particleCount),
          loopCount: 0,
          loopTotal: loop,
          mesh: null,
          time: 0
        };

        // Fill array of geometries to merge.
        const ratio = data.img ? data.img.width / data.img.height : 1;
        tempGeometries.length = 0;
        for (let p = 0; p < this.numParticles; p++) {
          let geometry = new THREE.PlaneBufferGeometry(
            0.1 * ratio * data.pscale,
            0.1 * data.pscale
          );
          if (this.sprite_rotation !== false) {
            geometry.rotateX(this.sprite_rotation.x);
            geometry.rotateY(this.sprite_rotation.y);
            geometry.rotateZ(this.sprite_rotation.z);
          } else {
            geometry.rotateX((this.data.protation.x * Math.PI) / 180);
            geometry.rotateY((this.data.protation.y * Math.PI) / 180);
            geometry.rotateZ((this.data.protation.z * Math.PI) / 180);
          }
          tempGeometries.push(geometry);
        }

        // Create merged geometry for whole particle system.
        let mergedBufferGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(
          tempGeometries
        );

        particleSystem.mesh = new THREE.Mesh(
          mergedBufferGeometry,
          this.material
        );
        particleSystem.mesh.visible = false;
        this.el.setObject3D(`particleplayer${i}`, particleSystem.mesh);
        copyArray(
          this.originalVertexPositions,
          mergedBufferGeometry.attributes.position.array
        );

        // Hide all particles by default.
        for (
          let i = 0;
          i < mergedBufferGeometry.attributes.position.array.length;
          i++
        ) {
          mergedBufferGeometry.attributes.position.array[i] = -99999;
        }

        for (let i = 0; i < particleSystem.activeParticleIndices.length; i++) {
          particleSystem.activeParticleIndices[i] = i;
        }

        this.particleSystems.push(particleSystem);
      }
    };
  })(),

  start: function (evt) {
    if (this.data.delay > 0) {
      setTimeout(() => this.startAfterDelay(evt), this.data.delay);
    } else {
      this.startAfterDelay(evt);
    }
  },

  startAfterDelay: function (evt) {
    // position, rotation
    var found = -1;
    var particleSystem;
    var oldestTime = 0;
    var position = evt ? evt.detail.position : null;
    var rotation = evt ? evt.detail.rotation : null;

    if (!(position instanceof THREE.Vector3)) {
      position = new THREE.Vector3();
    }
    if (!(rotation instanceof THREE.Euler)) {
      rotation = new THREE.Euler();
    }

    // find available (or oldest) particle system
    for (var i = 0; i < this.particleSystems.length; i++) {
      if (this.particleSystems[i].active === false) {
        found = i;
        break;
      }
      if (this.particleSystems[i].time > oldestTime) {
        found = i;
        oldestTime = this.particleSystems[i].time;
      }
    }

    if (found === -1) { return; }

    particleSystem = this.particleSystems[found];
    particleSystem.active = true;
    particleSystem.loopCount = 1;
    particleSystem.mesh.visible = true;
    particleSystem.mesh.position.copy(position);
    particleSystem.mesh.rotation.copy(rotation);
    particleSystem.time = 0;
    this.resetParticles(particleSystem);
    return particleSystem;
  },

  doLoop: function (particleSystem) {
    particleSystem.loopCount++;
    particleSystem.frame = -1;
    particleSystem.time = 0;
    this.resetParticles(particleSystem);
  },

  resetParticle: function (particleSystem, particleIndex) {
    const geometry = particleSystem.mesh.geometry;

    if (this.restPositions[particleIndex]) {
      transformPlane(
        particleIndex,
        geometry,
        this.originalVertexPositions,
        this.restPositions[particleIndex],
        this.useRotation && this.restRotations[particleIndex],
        null
      );
    } else {
      // Hide.
      transformPlane(
        particleIndex,
        geometry,
        this.originalVertexPositions,
        OFFSCREEN_VEC3,
        undefined,
        null
      );
    }

    // TODO: Can update transformPlane for lookAt.
    // lookAt does not support rotated or translated parents! :_(
    // part.lookAt(this.camera.position);
  },

  /**
   * When starting or finishing (looping) animation, this resets particles
   * to their initial position and, if user asked for replaying less than 100%
   * of particles, randomly choose them.
   */
  resetParticles: function (particleSystem) {
    var i;
    var rand;

    // no picking, just hide and reset
    if (this.particleCount === this.numParticles) {
      for (i = 0; i < this.numParticles; i++) {
        this.resetParticle(particleSystem, i);
      }
      return;
    }

    // hide particles from last animation and initialize indexPool
    const geometry = particleSystem.mesh.geometry;
    for (i = 0; i < this.numParticles; i++) {
      if (i < this.particleCount) {
        transformPlane(
          particleSystem.activeParticleIndices[i],
          geometry,
          this.originalVertexPositions,
          OFFSCREEN_VEC3,
          undefined,
          null
        );
      }
      this.indexPool[i] = i;
    }

    // scramble indexPool
    for (i = 0; i < this.particleCount; i++) {
      rand = i + Math.floor(Math.random() * (this.numParticles - i));
      particleSystem.activeParticleIndices[i] = this.indexPool[rand];
      this.indexPool[rand] = this.indexPool[i];
      this.resetParticle(
        particleSystem,
        particleSystem.activeParticleIndices[i]
      );
    }
  },

  tick: (function () {
    const helperPositionVec3 = new THREE.Vector3();

    return function (time, delta) {
      var frame; // current particle system frame
      var fdata; // all particles data in current frame
      var fdataNext; // next frame (for interpolation)
      var useRotation = this.useRotation;
      var frameTime; // time in current frame (for interpolation)
      var relTime; // current particle system relative time (0-1)
      var interpolate; // whether interpolate between frames or not
      const scaleSystem = this.data.animateScale && !this.useAge;
      const scaleParticle = this.data.animateScale && this.useAge;

      for (
        let particleSystemIndex = 0;
        particleSystemIndex < this.particleSystems.length;
        particleSystemIndex++
      ) {
        let particleSystem = this.particleSystems[particleSystemIndex];
        if (!particleSystem.active) {
          continue;
        }

        // if the duration is so short that there's no need to interpolate, don't do it
        // even if user asked for it.
        interpolate =
          this.data.interpolate && this.data.dur / this.numFrames > delta;
        relTime = particleSystem.time / this.data.dur;
        frame = relTime * this.numFrames;
        fdata = this.framedata[Math.floor(frame)];
        if (interpolate) {
          frameTime = frame - Math.floor(frame);
          fdataNext =
            frame < this.numFrames - 1
              ? this.framedata[Math.floor(frame) + 1]
              : null;
        }

        if (scaleSystem) {
          this.partScale.lerpVectors(this.data.initialScale, this.data.finalScale, relTime);
        }

        for (
          let activeParticleIndex = 0;
          activeParticleIndex < particleSystem.activeParticleIndices.length;
          activeParticleIndex++
        ) {
          let particleIndex =
            particleSystem.activeParticleIndices[activeParticleIndex];
          let rotation = useRotation && fdata[particleIndex].rotation;

          if (scaleParticle) {
            this.partScale.lerpVectors(this.data.initialScale, this.data.finalScale, fdata[particleIndex].age);
          }

          // TODO: Add vertex position to original position to all vertices of plane...
          if (!fdata[particleIndex].alive) {
            // Hide plane off-screen when not alive.
            transformPlane(
              particleIndex,
              particleSystem.mesh.geometry,
              this.originalVertexPositions,
              OFFSCREEN_VEC3,
              undefined,
              null
            );
            continue;
          }

          if (interpolate && fdataNext && fdataNext[particleIndex].alive) {
            helperPositionVec3.lerpVectors(
              fdata[particleIndex].position,
              fdataNext[particleIndex].position,
              frameTime
            );
            transformPlane(
              particleIndex,
              particleSystem.mesh.geometry,
              this.originalVertexPositions,
              helperPositionVec3,
              rotation,
              this.partScale
            );
          } else {
            transformPlane(
              particleIndex,
              particleSystem.mesh.geometry,
              this.originalVertexPositions,
              fdata[particleIndex].position,
              rotation,
              this.partScale
            );
          }
        }

        particleSystem.time += delta;
        if (particleSystem.time >= this.data.dur) {
          if (particleSystem.loopCount < particleSystem.loopTotal) {
            this.el.emit('particleplayerloop', null, false);
            this.doLoop(particleSystem);
          } else {
            this.el.emit('particleplayerfinished', null, false);
            particleSystem.active = false;
            particleSystem.mesh.visible = false;
          }
          continue;
        }
      }
    };
  })(),

  _transformPlane: transformPlane
});

// Use triangle geometry as a helper for rotating.
const tri = (function () {
  const tri = new THREE.Geometry();
  tri.vertices.push(new THREE.Vector3());
  tri.vertices.push(new THREE.Vector3());
  tri.vertices.push(new THREE.Vector3());
  tri.faces.push(new THREE.Face3(0, 1, 2));
  return tri;
})();

/**
 * Faces of a plane are v0, v2, v1 and v2, v3, v1.
 * Positions are 12 numbers: [v0, v1, v2, v3].
 */
function transformPlane (
  particleIndex,
  geometry,
  originalArray,
  position,
  rotation,
  scale
) {
  const array = geometry.attributes.position.array;
  const index = particleIndex * NUM_PLANE_POSITIONS;

  // Calculate first face (0, 2, 1).
  tri.vertices[0].set(
    originalArray[index + 0],
    originalArray[index + 1],
    originalArray[index + 2]
  );
  tri.vertices[1].set(
    originalArray[index + 3],
    originalArray[index + 4],
    originalArray[index + 5]
  );
  tri.vertices[2].set(
    originalArray[index + 6],
    originalArray[index + 7],
    originalArray[index + 8]
  );
  if (scale !== null) {
    tri.scale(scale.x, scale.y, scale.z);
  }
  if (rotation) {
    tri.rotateX(rotation.x);
    tri.rotateY(rotation.y);
    tri.rotateZ(rotation.z);
  }
  tri.vertices[0].add(position);
  tri.vertices[1].add(position);
  tri.vertices[2].add(position);
  array[index + 0] = tri.vertices[0].x;
  array[index + 1] = tri.vertices[0].y;
  array[index + 2] = tri.vertices[0].z;
  array[index + 3] = tri.vertices[1].x;
  array[index + 4] = tri.vertices[1].y;
  array[index + 5] = tri.vertices[1].z;
  array[index + 6] = tri.vertices[2].x;
  array[index + 7] = tri.vertices[2].y;
  array[index + 8] = tri.vertices[2].z;

  // Calculate second face (2, 3, 1) just for the last vertex.
  tri.vertices[0].set(
    originalArray[index + 3],
    originalArray[index + 4],
    originalArray[index + 5]
  );
  tri.vertices[1].set(
    originalArray[index + 6],
    originalArray[index + 7],
    originalArray[index + 8]
  );
  tri.vertices[2].set(
    originalArray[index + 9],
    originalArray[index + 10],
    originalArray[index + 11]
  );
  if (scale !== null) {
    tri.scale(scale.x, scale.y, scale.z);
  }
  if (rotation) {
    tri.rotateX(rotation.x);
    tri.rotateY(rotation.y);
    tri.rotateZ(rotation.z);
  }
  tri.vertices[0].add(position);
  tri.vertices[1].add(position);
  tri.vertices[2].add(position);
  array[index + 9] = tri.vertices[2].x;
  array[index + 10] = tri.vertices[2].y;
  array[index + 11] = tri.vertices[2].z;

  geometry.attributes.position.needsUpdate = true;
}
module.exports.transformPlane = transformPlane;

function copyArray (dest, src) {
  dest.length = 0;
  for (let i = 0; i < src.length; i++) {
    dest[i] = src[i];
  }
}

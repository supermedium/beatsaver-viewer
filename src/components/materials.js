const COLORS = require('../constants/colors.js');
const flatShaders = require('../../assets/shaders/flat.js');
const stageAdditiveShaders = require('../../assets/shaders/stageAdditive.js');
const stageNormalShaders = require('../../assets/shaders/stageNormal.js');

AFRAME.registerSystem('materials', {
  init: function () {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.createMaterials.bind(this));
    } else {
      this.createMaterials();
    }
  },

  createMaterials: function () {
    this.stageNormal = new THREE.ShaderMaterial({
      uniforms: {
        skyColor: {value: new THREE.Color(COLORS.SKY_BLUE)},
        backglowColor: {value: new THREE.Color(COLORS.BG_BLUE)},
        src: {
          value: new THREE.TextureLoader().load(document.getElementById('atlasImg').src)
        },
      },
      vertexShader: stageNormalShaders.vertexShader,
      fragmentShader: stageNormalShaders.fragmentShader,
      fog: false,
      transparent: true
    });

    this.stageAdditive = new THREE.ShaderMaterial({
      uniforms: {
        tunnelNeon: {value: new THREE.Color(COLORS.NEON_RED)},
        floorNeon: {value: new THREE.Color(COLORS.NEON_RED)},
        leftLaser: {value: new THREE.Color(COLORS.NEON_BLUE)},
        rightLaser: {value: new THREE.Color(COLORS.NEON_BLUE)},
        textGlow: {value: new THREE.Color(COLORS.TEXT_OFF)},
        src: {
          value: new THREE.TextureLoader().load(document.getElementById('atlasImg').src)
        },
      },
      vertexShader: stageAdditiveShaders.vertexShader,
      fragmentShader: stageAdditiveShaders.fragmentShader,
      blending: THREE.AdditiveBlending,
      fog: false,
      transparent: true
    });

    this.logo = new THREE.ShaderMaterial({
      uniforms: {
        src: {
          value: new THREE.TextureLoader().load(document.getElementById('logotexImg').src)
        },
      },
      vertexShader: flatShaders.vertexShader,
      fragmentShader: flatShaders.fragmentShader,
      fog: false,
      transparent: true
    });

    this.logoadditive = new THREE.ShaderMaterial({
      uniforms: {
        src: {
          value: new THREE.TextureLoader().load(document.getElementById('logotexImg').src)
        },
      },
      vertexShader: flatShaders.vertexShader,
      fragmentShader: flatShaders.fragmentShader,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      transparent: true
    });

    this.mineMaterialred = new THREE.MeshStandardMaterial({
      roughness: 0.38,
      metalness: 0.48,
      color: new THREE.Color(COLORS.MINE_RED),
      emissive: new THREE.Color(COLORS.MINE_RED_EMISSION),
      envMap: new THREE.TextureLoader().load('assets/img/mineenviro-red.jpg')
    });

    this.mineMaterialblue = new THREE.MeshStandardMaterial({
      roughness: 0.38,
      metalness: 0.48,
      color: new THREE.Color(COLORS.MINE_BLUE),
      emissive: new THREE.Color(COLORS.MINE_BLUE_EMISSION),
      envMap: new THREE.TextureLoader().load('assets/img/mineenviro-blue.jpg')
    });

  }
});

AFRAME.registerComponent('materials', {
  schema: {
    name: { default: ''},
    recursive: { default: true}
  },

  update: function () {
    if (this.data.name === '') { return; }

    const material = this.system[this.data.name];
    if (!material) {
      console.warn(`undefined material "${this.system[this.data.name]}"`);
      return;
    }

    const mesh = this.el.getObject3D('mesh');
    if (!mesh) {
      this.el.addEventListener('model-loaded', this.applyMaterial.bind(this));
    } else {
      this.applyMaterial(mesh);
    }
  },

  applyMaterial: function (obj) {
    const material = this.system[this.data.name];
    if (obj['detail']) { obj = obj.detail.model; }
    if (this.data.recursive) {
      obj.traverse(o => {
        if (o.type === 'Mesh') {
          o.material = material;
        }
      });
    } else {
      obj.material = material;
    }
  }
});

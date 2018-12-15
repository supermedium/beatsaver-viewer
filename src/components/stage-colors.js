function $ (id) { return document.getElementById(id); };

AFRAME.registerComponent('stage-colors', {
  dependencies: ['background'],

  schema: {
    color: {default: 'blue', oneOf: ['blue', 'red']}
  },

  init: function () {
    this.colorCodes = ['off', 'blue', 'blue', 'bluefade', '', 'red', 'red', 'redfade'];
    this.el.addEventListener('cleargame', this.resetColors.bind(this));
  },

  update: function (oldData) {
    this.updateColors(this.data.color);
  },

  setColor: function (target, code) {
    this.el.emit(`${target}color${this.colorCodes[code]}`, null, false);
  },

  resetColors: function () {
    this.updateColors('blue');
    this.el.emit('bgcolorblue', null, false);
    this.el.emit('tunnelcolorred', null, false);
    this.el.emit('floorcolorred', null, false);
    this.el.emit('leftlasercolorblue', null, false);
    this.el.emit('rightlasercolorblue', null, false);
  },

  updateColors: function (color) {
  }

/*
  init: function () {
    this.neonRed = new THREE.Color(0xff9999);
    this.neonBlue = new THREE.Color(0x9999ff);
    this.defaultRed = new THREE.Color(0xff0000);
    this.defaultBlue = new THREE.Color(0x0000ff);
    this.mineEnvMap = {
      red: new THREE.TextureLoader().load('assets/img/mineenviro-red.jpg', () => {
        this.el.sceneEl.emit('mineredenvmaploaded', null, false);
      }),
      blue: new THREE.TextureLoader().load('assets/img/mineenviro-blue.jpg', () => {
        this.el.sceneEl.emit('mineblueenvmaploaded', null, false);
      })
    };
    this.mineColor = {red: new THREE.Color(0x070304), blue: new THREE.Color(0x030407)};
    this.mineEmission = {red: new THREE.Color(0x090707), blue: new THREE.Color(0x070709)};
    this.mineMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.38,
      metalness: 0.48,
      color: this.mineColor[this.data.color],
      emissive: this.mineEmission[this.data.color],
      envMap: this.mineEnvMap[this.data.color]
    });
    this.sky = document.getElementById('sky');
    this.auxColor = new THREE.Color();

    this.targets = {};
    ['stageNormal',
     'tunnelNeon',
     'leftStageLaser0',
     'leftStageLaser1',
     'leftStageLaser2',
     'rightStageLaser0',
     'rightStageLaser1',
     'rightStageLaser2',
     'floor',
     'stageNeon'].forEach(id => {
        this.targets[id] = document.getElementById(id);
     });

    this.colorCodes = ['off', 'blue', 'blue', 'bluefade', '', 'red', 'red', 'redfade'];

    this.el.addEventListener('cleargame', this.resetColors.bind(this));
  },

  update: function (oldData) {
    this.updateColors(this.data.color);
  },

  setColor: function (target, code) {
    const mesh = this.targets[target].getObject3D('mesh');
    if (mesh) { mesh.material.opacity = 1; }
    this.targets[target].emit('color' + this.colorCodes[code], null, false);
  },

  resetColors: function () {
    this.updateColors('blue');
    for (let target in this.targets) {
      this.targets[target].emit('colorblue', null, false);
    }
  },

  updateColors: function (color) {
    const red = color === 'red';

    this.sky.getObject3D('mesh').material.color.set(red ? '#f10' : '#00acfc');
    this.el.sceneEl.object3D.background.set(red ? '#770100' : '#15252d');
    this.el.sceneEl.object3D.fog.color.set(red ? '#a00' : '#007cb9');

    this.el.sceneEl.systems.materials.neon.color = red ? this.neonRed : this.neonBlue;
    this.el.sceneEl.systems.materials.default.color = red ? this.defaultRed : this.defaultBlue;

    this.mineMaterial.color = this.mineColor[red ? 'red' : 'blue'];
    this.mineMaterial.emissive = this.mineEmission[red ? 'red' : 'blue'];
    this.mineMaterial.envMap = this.mineEnvMap[red ? 'red' : 'blue'];
    this.mineMaterial.needsUpdate = true;
  }

  */
});

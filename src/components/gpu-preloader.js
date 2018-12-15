let i = 0;

/**
 * Preload textures to GPU that are not visible from the start..
 * three.js renderer by default will not upload textures from non-visible entities.
 */
AFRAME.registerComponent('gpu-preloader', {
  dependencies: ['materials'],

  play: function () {
    this.preloadMineEnvMaps();

    setTimeout(() => {
      this.preloadAtlas();
      this.preloadBeamMap();
      this.preloadBeatEnvMap();
    }, 1000);
  },

  preloadAtlas: function () {
    const stage = document.querySelector('#stageObj');
    this.preloadTexture(stage.getObject3D('mesh').children[0].material.uniforms.src.value);
  },

  preloadBeamMap: function () {
    const beams = document.querySelector('[beams]');
    this.preloadTexture(beams.components.beams.texture);
  },

  preloadBeatEnvMap: function () {
    const beat = document.querySelector('#beatContainer [mixin~="beat"]');
    beat.object3D.traverse(node => {
      if (!node.material) { return; }
      if (node.material.envMap) {
        this.preloadTexture(node.material.envMap);
      }
      if (node.material.map) {
        this.preloadTexture(node.material.map);
      }
    });
  },

  preloadKeyboard: function () {
    const keyboard = document.getElementById('keyboard').components['super-keyboard'];
    this.preloadTexture(keyboard.kbImg.getObject3D('mesh').material.map);
    this.preloadTexture(keyboard.keyColorPlane.getObject3D('mesh').material.map);
  },

  preloadMineEnvMaps: function () {
    const stageColors = this.el.sceneEl.components['stage-colors'];
    this.el.sceneEl.addEventListener('mineredenvmaploaded', () => {
      this.preloadTexture(stageColors.mineEnvMap.red);
    });
    this.el.sceneEl.addEventListener('mineblueenvmaploaded', () => {
      this.preloadTexture(stageColors.mineEnvMap.blue);
    });
  },

  preloadWallMap: function () {
    const wall = document.querySelector('a-entity[wall]');
    this.preloadTexture(wall.getObject3D('mesh').material.uniforms.tex.value);
    this.preloadTexture(wall.getObject3D('mesh').material.uniforms.env.value);
  },

  preloadTexture: function (texture) {
    if (!texture || !texture.image) {
      console.warn('[gpu-preloader] Error preloading texture', texture);
      return;
    }
    if (!texture.image.complete) {
      console.warn('[gpu-preloader] Error preloading, image not loaded', texture);
      return;
    }
    this.el.renderer.setTexture2D(texture, i++ % 8);
  }
});

AFRAME.registerComponent('song-progress-ring', {
  dependencies: ['geometry', 'material'],

  schema: {
    enabled: {default: false}
  },

  init: function () {
    this.tick = AFRAME.utils.throttleTick(this.tick.bind(this), 1000);

    this.progress = this.el.getObject3D('mesh').material.uniforms.progress;
    this.el.sceneEl.addEventListener('cleargame', () => {
      this.progress.value = 0;
    });
  },

  update: function (oldData) {
    this.progress.value = 0;
  },

  updateRing: function () {
    const source = this.el.sceneEl.components.song.source;
    if (!source) { return; }

    const progress =
      this.el.sceneEl.components.song.getCurrentTime() /
      source.buffer.duration;
    this.progress.value = progress;
  },

  tick: function () {
    if (!this.data.enabled) { return; }
    this.updateRing();
  }
});

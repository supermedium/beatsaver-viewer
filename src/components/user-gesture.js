/**
 * Lame Chrome user gesture policy.
 */
AFRAME.registerComponent('user-gesture', {
  play: function () {
    document.addEventListener('click', evt => {
      this.el.sceneEl.emit('usergesturereceive', null, false);
    }, {once: true});
  }
});

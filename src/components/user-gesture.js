/**
 * Lame Chrome user gesture policy.
 */
AFRAME.registerComponent('user-gesture', {
  play: function () {
    document.addEventListener('click', evt => {
      if (evt.target.closest('#controls')) { return; }
      this.el.sceneEl.emit('usergesturereceive', null, false);
    });
  }
});

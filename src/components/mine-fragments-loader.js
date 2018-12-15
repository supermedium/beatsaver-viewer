const objLoader = new THREE.OBJLoader();

AFRAME.registerSystem('mine-fragments-loader', {
  init: function () {
    this.fragments = null;
    const objData = document.getElementById('mineBrokenObj');
    objData.addEventListener('loaded', evt => {
      this.fragments = objLoader.parse(evt.target.data);
    })
  }
});

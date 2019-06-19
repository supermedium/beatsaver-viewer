AFRAME.registerComponent('blob-texture', {
  dependencies: ['material'],

  schema: {
    src: {type: 'string'}
  },

  update: function () {
    var el = this.el;
    var data = this.data;

    if (!data.src) { return; }

    if (!data.src.startsWith('blob')) {
      el.setAttribute('material', 'src', data.src);
      return;
    } else {
      const image = new Image();
      image.onload = function () {
        const map = new THREE.Texture();
        map.image = image;
        el.setAttribute('material', 'src', '');
        el.getObject3D('mesh').material.map = map;
        el.getObject3D('mesh').material.needsUpdate = true;
        map.needsUpdate = true;
      };
      image.src = data.src;
    }
  }
});

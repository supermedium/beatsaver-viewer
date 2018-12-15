/**
 * Active color.
 */
AFRAME.registerComponent('active-color', {
  dependencies: ['material'],

  schema: {
    active: {default: false},
    color: {default: '#ffffff'}
  },

  init: function () {
    this.defaultColor = this.el.getAttribute('material').color;
    this.materialObj = {color: this.data.color, opacity: 1};
  },

  update: function () {
    var el = this.el;

    if (this.data.active) {
      el.setAttribute('material', this.materialObj);
      el.object3D.visible = true;
    } else {
      el.setAttribute('material', 'color', this.defaultColor);
      if (el.components.animation__mouseleave) {
        setTimeout(() => { el.emit('mouseleave', null, false); });
      }
    }
  }
});

AFRAME.registerComponent('active-text-color', {
  dependencies: ['text'],

  schema: {
    active: {default: false},
    color: {default: '#333'}
  },

  init: function () {
    this.defaultColor = this.el.getAttribute('text').color;
  },

  update: function () {
    var el = this.el;
    if (this.data.active) {
      el.setAttribute('text', 'color', this.data.color);
    } else {
      el.setAttribute('text', 'color', this.defaultColor);
    }
  }
});

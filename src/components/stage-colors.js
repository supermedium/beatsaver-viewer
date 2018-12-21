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

  setColor: function (target, code) {
    this.el.emit(`${target}color${this.colorCodes[code]}`, null, false);
  },

  resetColors: function () {
    this.el.emit('bgcolorblue', null, false);
    this.el.emit('tunnelcolorred', null, false);
    this.el.emit('floorcolorred', null, false);
    this.el.emit('leftlasercolorblue', null, false);
    this.el.emit('rightlasercolorblue', null, false);
  }
});

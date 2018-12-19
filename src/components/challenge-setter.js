const utils = require('../utils');

AFRAME.registerComponent('challenge-setter', {
  play: function () {
    // ID parameter.
    const idParam = AFRAME.utils.getUrlParameter('id');
    if (idParam) {
      this.setChallenge(
        idParam,
        AFRAME.utils.getUrlParameter('difficulty')
      );
      return;
    }

    // No parameter. Just Beat It!
    this.setChallenge(811, 'Expert');
  },

  setChallenge: function (id, difficulty) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', utils.getS3FileUrl(id, 'info.json'));
    xhr.addEventListener('load', () => {
      this.el.emit('challengeset', Object.assign(
        {id: id, difficulty: difficulty || 'Normal'},
        JSON.parse(xhr.responseText)
      ));
    });
    xhr.send();
  }
});

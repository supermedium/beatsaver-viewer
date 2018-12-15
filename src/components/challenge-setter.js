const utils = require('../utils');

AFRAME.registerComponent('challenge-setter', {
  play: function () {
    this.setChallenge(
      AFRAME.utils.getUrlParameter('id'),
      AFRAME.utils.getUrlParameter('difficulty')
    );
  },

  setChallenge: function (id, difficulty) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', utils.getS3FileUrl(id, 'info.json'));
    xhr.addEventListener('load', () => {
      this.el.emit('challengeset', Object.assign(
        {id: id, difficulty: difficulty},
        JSON.parse(xhr.responseText)
      ));
    });
    xhr.send();
  }
});

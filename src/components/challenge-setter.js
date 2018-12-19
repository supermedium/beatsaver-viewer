const utils = require('../utils');
import ZipLoader from 'zip-loader';

AFRAME.registerComponent('challenge-setter', {
  play: function () {
    const idParam = AFRAME.utils.getUrlParameter('id');
    const difficultyParam = AFRAME.utils.getUrlParameter('difficulty');

    if (idParam) {
      if (idParam.indexOf('-') !== -1) {
        // Fetch ZIP file directly.
        this.fetchZip(idParam, difficultyParam);
      } else {
        this.setChallenge(idParam, difficultyParam);
      }
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
  },

  fetchZip: function (id, difficulty) {
    const loader = new ZipLoader(`https://beatsaver.com/download/${id}`);
    loader.on('load', () => {
      let imageBlob;
      let songBlob;
      const event = {
        beats: '',
        image: '',
        info: '',
        song: ''
      };

      Object.keys(loader.files).forEach(filename => {
        if (filename.endsWith('info.json')) {
          event.info = loader.extractAsJSON(filename);
        }
        if (filename.endsWith(`${difficulty}.json`)) {
          event.beats = loader.extractAsJSON(filename);
        }
        if (filename.endsWith(`cover.jpg`)) {
          event.image = loader.extractAsBlobUrl(filename, 'image/jpg');
        }
        if (filename.endsWith(`song.ogg`)) {
          songBlob = loader.extractAsBlobUrl(filename, 'audio/ogg');
        }
      });

      this.el.emit('challengesetfromzip', event);
    });
    loader.load();
  }
});

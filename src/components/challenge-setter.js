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
    this.fetchZip('811-535', 'Expert');
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
    // Unzip.
    const [short] = id.split('-');
    const loader = new ZipLoader(`https://beatsaver.com/storage/songs/${short}/${id}.zip`);
    loader.on('load', () => {
      let imageBlob;
      let songBlob;
      const event = {
        audio: '',
        beats: '',
        difficulty: '',
        id: id,
        image: '',
        info: ''
      };

      // Process info first.
      Object.keys(loader.files).forEach(filename => {
        if (filename.endsWith('info.json')) {
          event.info = loader.extractAsJSON(filename);
        }
      });

      // Default to hardest.
      const difficulties = event.info.difficultyLevels;
      if (!difficulty) {
        difficulty = difficulties.sort(d => d.rank)[0].difficulty;
      }

      Object.keys(loader.files).forEach(filename => {
        if (filename.endsWith(`${difficulty}.json`)) {
          event.beats = loader.extractAsJSON(filename);
        }
        if (filename.endsWith('jpg')) {
          event.image = loader.extractAsBlobUrl(filename, 'image/jpg');
        }
        if (filename.endsWith('ogg')) {
          event.audio = loader.extractAsBlobUrl(filename, 'audio/ogg');
        }
      });

      this.el.emit('challengesetfromzip', event);
    });
    loader.load();
  }
});

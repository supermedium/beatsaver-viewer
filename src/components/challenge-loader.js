const utils = require('../utils');
import ZipLoader from 'zip-loader';

AFRAME.registerComponent('challenge-loader', {
  schema: {
    id: {default: AFRAME.utils.getUrlParameter('id')},
    difficulty: {default: AFRAME.utils.getUrlParameter('difficulty')}
  },

  update: function (oldData) {
    // Difficulty select.
    if (oldData.difficulty && oldData.difficulty !== this.data.difficulty) {
      this.fetchZip(this.data.id, this.data.difficulty);
      this.el.sceneEl.emit('cleargame', null, false);
    }
  },

  play: function () {
    this.loadingIndicator = document.getElementById('challengeLoadingIndicator');

    if (this.data.id) {
      this.fetchZip(this.data.id, this.data.difficulty);
      return;
    }

    // No parameter. Just Beat It!
    this.fetchZip('811-535', 'Expert');
  },

  fetchZip: function (id, difficulty) {
    this.el.emit('challengeloadstart', null, false);

    // Unzip.
    const [short] = id.split('-');
    const loader = new ZipLoader(`https://beatsaver.com/storage/songs/${short}/${id}.zip`);

    loader.on('progress', evt => {
      this.loadingIndicator.object3D.visible = true;
      this.loadingIndicator.setAttribute('material', 'progress',
                                         evt.loaded / evt.total);
    });

    loader.on('load', () => {
      let imageBlob;
      let songBlob;
      const event = {
        audio: '',
        beats: '',
        difficulty: difficulty,
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
      if (!event.difficulty) {
        event.difficulty = difficulties.sort(d => d.rank)[0].difficulty;
      }

      Object.keys(loader.files).forEach(filename => {
        if (filename.endsWith(`${event.difficulty}.json`)) {
          event.beats = loader.extractAsJSON(filename);
        }
        if (filename.endsWith('jpg')) {
          event.image = loader.extractAsBlobUrl(filename, 'image/jpg');
        }
        if (filename.endsWith('ogg')) {
          event.audio = loader.extractAsBlobUrl(filename, 'audio/ogg');
        }
      });

      this.el.emit('challengeloadend', event, false);
    });
    loader.load();
  }
});

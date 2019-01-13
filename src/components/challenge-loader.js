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

    loader.on('error', err => {
      this.el.emit('challengeloaderror', null);
    });

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
          event.info = jsonParseClean(loader.extractAsText(filename));
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
        if (filename.endsWith('png')) {
          event.image = loader.extractAsBlobUrl(filename, 'image/png');
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

/**
 * Beatsaver JSON sometimes have weird characters in front of JSON in utf16le encoding.
 */
function jsonParseClean (str) {
  try {
    str = str.replace(/\u0000/g, '').replace(/\u\d\d\d\d/g, '');
    str = str.replace('\b', ' ');
    if (str[0] !== '{') {
      str = str.substring(str.indexOf('{'), str.length);
    }

    // Remove Unicode escape sequences.
    let stringified = JSON.stringify(str);
    stringified = stringified.replace(/\\u..../g, ' ');

    return JSON.parse(JSON.parse(stringified));
  } catch (e) {
    // Should not reach here.
    console.log(e, str);
    return null;
  }
}

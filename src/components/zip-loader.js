const utils = require('../utils');
import ZipLoader from 'zip-loader';

const zipUrl = AFRAME.utils.getUrlParameter('zip');

AFRAME.registerComponent('zip-loader', {
  schema: {
    id: {default: AFRAME.utils.getUrlParameter('id') || '811-535'},
    isSafari: {default: false},
    difficulty: {default: AFRAME.utils.getUrlParameter('difficulty')}
  },

  update: function (oldData) {
    // Difficulty select.
    if (oldData.difficulty !== this.data.difficulty ||
        oldData.id !== this.data.id) {
      this.fetchZip(zipUrl || getZipUrl(this.data.id), this.data.difficulty);
      this.el.sceneEl.emit('cleargame', null, false);
    }

    this.el.sceneEl.emit('challengeset', this.data.id);
  },

  play: function () {
    this.loadingIndicator = document.getElementById('challengeLoadingIndicator');
    this.fetchZip(zipUrl || getZipUrl(this.data.id), this.data.difficulty);
  },

  fetchZip: function (zipUrl, difficulty) {
    if (this.data.isSafari) { return; }

    this.el.emit('challengeloadstart', null, false);

    // Fetch and unzip.
    const loader = new ZipLoader(zipUrl);

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
        id: this.data.id,
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
    str = str.trim();
    str = str.replace(/\u0000/g, '').replace(/\u\d\d\d\d/g, '');
    str = str.replace('\b', ' ');
    if (str[0] !== '{') {
      str = str.substring(str.indexOf('{'), str.length);
    }

    // Remove Unicode escape sequences.
    // stringified = stringified.replace(/\\u..../g, ' ');
    return jsonParseLoop(str, 0);
  } catch (e) {
    // Should not reach here.
    console.log(e, str);
    return null;
  }
}

const errorRe1 = /column (\d+)/m;
const errorRe2 = /position (\d+)/m;

function jsonParseLoop (str, i) {
  try {
    return JSON.parse(str);
  } catch (e) {
    let match = e.toString().match(errorRe1);
    if (!match) { match = e.toString().match(errorRe2); }
    if (!match) { throw e; }
    const errorPos = parseInt(match[1]);
    str = str.replace(str[errorPos], 'x');
    str = str.replace(str[errorPos + 1], 'x');
    str = str.replace(str[errorPos + 2], 'x');
    return jsonParseLoop(str, i + 1);
  }
}

function getZipUrl (id) {
  const [short] = id.split('-');
  return `https://beatsaver.com/storage/songs/${short}/${id}.zip`;
}

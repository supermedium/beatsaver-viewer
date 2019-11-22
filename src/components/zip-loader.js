const dragDrop = require('drag-drop')
const utils = require('../utils');
import ZipLoader from 'zip-loader';

const zipUrl = AFRAME.utils.getUrlParameter('zip');

AFRAME.registerComponent('zip-loader', {
  schema: {
    id: {default: zipUrl ? '' : (AFRAME.utils.getUrlParameter('id') || '22cc')},
    isSafari: {default: false},
    difficulty: {default: AFRAME.utils.getUrlParameter('difficulty')},
    mode: {default: AFRAME.utils.getUrlParameter('mode') || 'Standard'}
  },

  init: function () {
    this.fetchedZip = ''
    this.hash = '';

    if (zipUrl) {
      this.fetchZip(zipUrl);
    }

    dragDrop('#body', (files) => {
      this.readFile(files[0]);
    });
  },

  update: function (oldData) {
    this.el.sceneEl.emit('cleargame', null, false);

    if (!this.data.id) { return; }

    if ((oldData.id !== this.data.id)) {
      this.fetchData(this.data.id);
      this.el.sceneEl.emit('challengeset', this.data.id);
    }
  },

  play: function () {
    this.loadingIndicator = document.getElementById('challengeLoadingIndicator');
  },

  processFiles: function (loader, isDragDrop) {
    let imageBlob;
    let songBlob;
    const event = {
      audio: '',
      beatmaps: {Standard: {}},
      beatSpeeds: {Standard: {}},
      difficulties: {Standard: []},
      id: isDragDrop ? '' : this.data.id,
      image: '',
      info: '',
      isDragDrop: isDragDrop,
      mappingExtensions: {isEnabled: false}
    };

    // Process info first.
    Object.keys(loader.files).forEach(filename => {
      if (filename.endsWith('info.dat')) {
        event.info = jsonParseClean(loader.extractAsText(filename));
      }
    });

    // See whether we need mapping extensions (per difficulty).
    const customData = event.info._customData;
    if (customData &&
        customData._editorSettings &&
        customData._editorSettings.modSettings &&
        customData._editorSettings.modSettings.mappingExtensions &&
        customData._editorSettings.modSettings.mappingExtensions.isEnabled) {
      event.mappingExtensions = event.info._customData._editorSettings.modSettings.mappingExtensions;
    }

    // Index beatmaps (modes + difficulties).
    const beatmapSets = event.info._difficultyBeatmapSets;
    beatmapSets.forEach(set => {
      const mode = set._beatmapCharacteristicName;
      event.beatmaps[mode] = {};
      event.beatSpeeds[mode] = {};

      const diffBeatmaps = set._difficultyBeatmaps.sort(d => d._difficultyRank);
      diffBeatmaps.forEach(diff => {
        event.beatmaps[mode][diff._difficulty] = loader.extractAsJSON(diff._beatmapFilename);
        event.beatSpeeds[mode][diff._difficulty] = diff._noteJumpMovementSpeed;

        // TODO: Assume for now if one difficulty wants extensions, they all do. Fix later.
        if (diff._customData &&
            diff._customData._requirements &&
            diff._customData._requirements.indexOf('Mapping Extensions') !== -1) {
          event.mappingExtensions = {isEnabled: true};
        }
      });

      // Get difficulties.
      event.difficulties[mode] = diffBeatmaps;
    });

    // Default to hardest of first beatmap.
    if (!event.difficulty) {
      event.difficulty = this.data.difficulty || event.difficulties.Standard[0]._difficulty;
    }

    Object.keys(loader.files).forEach(filename => {
      // Only needed if loading ZIP directly and not from API.
      if (!this.data.id) {
        if (filename.endsWith('jpg')) {
          event.image = loader.extractAsBlobUrl(filename, 'image/jpg');
        }
        if (filename.endsWith('png')) {
          event.image = loader.extractAsBlobUrl(filename, 'image/png');
        }
      }
      if (filename.endsWith('egg') || filename.endsWith('ogg')) {
        event.audio = loader.extractAsBlobUrl(filename, 'audio/ogg');
      }
    });

    if (!event.image && !this.data.id) {
      event.image = 'assets/img/logo.png';
    }

    this.isFetching = '';
    console.log(event);
    this.el.emit('challengeloadend', event, false);
  },

  /**
   * Read API first to get hash and URLs.
   */
  fetchData: function (id) {
    return fetch(`https://beatsaver.com/api/maps/detail/${id}/`).then(res => {
      res.json().then(data => {
        this.hash = data.hash;
        this.el.sceneEl.emit(
          'challengeimage',
          `https://beatsaver.com${data.coverURL}`
        );
        this.fetchZip(zipUrl || `https://beatsaver.com/${data.directDownload}`);
      });
    });
  },

  fetchZip: function (zipUrl) {
    if (this.data.isSafari) { return; }

    // Already fetching.
    if (this.isFetching === zipUrl ||
        (this.data.id && this.fetchedZip & this.fetchedZip === this.data.id)) { return; }

    this.el.emit('challengeloadstart', this.data.id, false);
    this.isFetching = zipUrl;

    // Fetch and unzip.
    const loader = new ZipLoader(zipUrl);

    loader.on('error', err => {
      this.el.emit('challengeloaderror', null);
      this.isFetching = '';
    });

    loader.on('progress', evt => {
      this.loadingIndicator.object3D.visible = true;
      this.loadingIndicator.setAttribute('material', 'progress',
                                         evt.loaded / evt.total);
    });

    loader.on('load', () => {
      this.fetchedZip = this.data.id;
      this.processFiles(loader);
    });

    loader.load();
  },

  /**
    * From dragged ZIP.
    */
  readFile: function (file) {
    this.data.difficulty = '';
    this.data.id = '';
    this.el.emit('challengeloadstart', '', false);
    ZipLoader.unzip(file).then(loader => {
      Object.keys(loader.files).forEach(filename => {
        if (filename.endsWith('info.dat')) {
          const id = jsonParseClean(loader.extractAsText(filename)).id;
          this.el.emit('challengeloadstart', id, false);
        }
      });

      removeIdQueryParam();
      this.processFiles(loader, true);
    });
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

function getZipUrl (key, hash) {
  return `https://beatsaver.com/cdn/${key}/${hash}.zip`;
}

// Push state URL in browser.
const idRe = /&?id=[\d\w-]+/
function removeIdQueryParam () {
  let search = window.location.search.toString();
  search = search.replace(idRe, '');
  let url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  url += search;
  window.history.pushState({path: url},'', url);
}

/* global localStorage */
var utils = require('../utils');

const DEBUG_CHALLENGE = {
  author: 'Superman',
  difficulty: 'Expert',
  id: '31',
  image: 'assets/img/molerat.jpg',
  songName: 'Friday',
  songSubName: 'Rebecca Black'
};

const emptyChallenge = {
  audio: '',
  author: '',
  difficulty: '',
  id: '',
  image: 'assets/img/logo.png',
  songName: '',
  songNameMedium: '',
  songNameShort: '',
  songSubName: '',
  songSubNameShort: ''
};

const isSafari = navigator.userAgent.toLowerCase().indexOf('safari') !== -1 &&
                 navigator.userAgent.toLowerCase().indexOf('chrome') === -1;

let beatmaps;
let difficulties;

/**
 * State handler.
 *
 * 1. `handlers` is an object of events that when emitted to the scene will run the handler.
 *
 * 2. The handler function modifies the state.
 *
 * 3. Entities and components that are `bind`ed automatically update:
 *    `bind__<componentName>="<propertyName>: some.item.in.state"`
 */
AFRAME.registerState({
  initialState: {
    challenge: Object.assign({  // Actively playing challenge.
      hasLoadError: isSafari,
      isLoading: false,
      isBeatsPreloaded: false,  // Whether we have passed the negative time.
      loadErrorText: isSafari ? 'iOS and Safari support coming soon! We need to convert songs to MP3 first.' : '',
    }, emptyChallenge),
    hasReceivedUserGesture: false,
    inVR: false,
    isPaused: false,  // Playing, but paused.
    isPlaying: false,  // Actively playing.
    isSafari: isSafari,
    isSongBufferProcessing: false,
  },

  handlers: {
    beatloaderpreloadfinish: state => {
      state.challenge.isBeatsPreloaded = true;
    },

    challengeimage: (state, payload) => {
      state.challenge.image = payload;
    },

    challengeloadstart: (state, payload) => {
      state.challenge.isLoading = true;
    },

    challengeloadend: (state, payload) => {
      beatmaps = payload.beatmaps;
      difficulties = payload.difficulties;

      state.challenge.audio = payload.audio;
      state.challenge.author = payload.info._levelAuthorName;

      const mode = state.challenge.mode = payload.beatmaps.Standard
        ? 'Standard'
        : Object.keys(payload.beatmaps)[0];
      state.challenge.difficulties = difficulties[mode];

      if (!state.challenge.difficulty || !payload.beatmaps[mode][state.challenge.difficulty]) {
        state.challenge.difficulty = payload.difficulty;
      }

      state.challenge.id = payload.isDragDrop ? '' : payload.id;
      if (payload.image) {
        state.challenge.image = payload.image;
      }
      state.challenge.isLoading = false;
      state.challenge.songName = payload.info._songName;
      state.challenge.songNameShort = truncate(payload.info._songName, 18);
      state.challenge.songNameMedium = truncate(payload.info._songName, 30);

      state.challenge.songSubName = payload.info._songSubName || payload.info._songAuthorName;
      state.challenge.songSubNameShort = truncate(state.challenge.songSubName, 21);

      document.title = `BeatSaver Viewer | ${payload.info._songName}`;
    },

    challengeloaderror: (state, payload) => {
      state.challenge.hasLoadError = true;
      state.challenge.isLoading = false;
      state.challenge.loadErrorText = `Sorry, song ${AFRAME.utils.getUrlParameter('id')} was not found or ZIP requires CORS headers.`;
    },

    controllerconnected: (state, payload) => {
      state.controllerType = payload.name;
    },

    /**
     * ?debugstate=loading
     */
    debugloading: state => {
      DEBUG_CHALLENGE.id = '-1';
      Object.assign(state.challenge, DEBUG_CHALLENGE);
      state.challenge.isLoading = true;
    },

    difficultyselect: (state, payload) => {
      state.challenge.difficulty = payload;
      state.challenge.isBeatsPreloaded = false;
      state.isPaused = false;
    },

    gamemenuresume: state => {
      state.isPaused = false;
    },

    gamemenurestart: state => {
      state.challenge.isBeatsPreloaded = false;
      state.isPaused = false;
      state.isSongBufferProcessing = true;
    },

    modeselect: (state, payload) => {
      state.challenge.mode = payload;
      state.challenge.isBeatsPreloaded = false;
      state.isPaused = false;

      state.challenge.difficulties = difficulties[payload];
      state.challenge.difficulty = state.challenge.difficulties[0]._difficulty;
    },

    pausegame: state => {
      if (!state.isPlaying) { return; }
      state.isPaused = true;
    },

    songprocessingfinish: state => {
      state.isSongBufferProcessing = false;
    },

    songprocessingstart: state => {
      state.isSongBufferProcessing = true;
    },

    /**
     * From search.
     */
    songselect: (state, payload) => {
      state.challenge = Object.assign(state.challenge, emptyChallenge);
      state.challenge.id = payload.key;
      state.challenge.author = payload.metadata.levelAuthorName;
      state.challenge.image = `https://beatsaver.com${payload.coverURL}`;
      state.challenge.songName = payload.metadata.songName;
      state.challenge.songNameShort = truncate(payload.metadata.songName, 18);
      state.challenge.songNameMedium = truncate(payload.metadata.songName, 30);
      state.challenge.songSubName = payload.metadata.songSubName;
      state.challenge.songSubNameShort = truncate(payload.metadata.songSubName, 21);
      state.challenge.isBeatsPreloaded = false;
      state.challenge.isLoading = true;

      state.hasReceivedUserGesture = false;
      state.isPaused = false;
      state.isSongBufferProcessing = false;
    },

    usergesturereceive: state => {
      state.hasReceivedUserGesture = true;
    },

    'enter-vr': state => {
      state.inVR = true;
    },

    'exit-vr': state => {
      state.inVR = false;
    }
  },

  /**
   * Post-process the state after each action.
   */
  computeState: state => {
    state.isPlaying =
      !state.isPaused && !state.isSongBufferProcessing &&
      !state.challenge.isLoading && state.hasReceivedUserGesture;
  }
});

function truncate (str, length) {
  if (!str) { return ''; }
  if (str.length >= length) {
    return str.substring(0, length - 2) + '..';
  }
  return str;
}

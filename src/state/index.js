/* global localStorage */
var utils = require('../utils');

const challengeDataStore = {};
const SONG_NAME_TRUNCATE = 24;
const SONG_SUB_NAME_TRUNCATE = 32;

const DEBUG_CHALLENGE = {
  author: 'Superman',
  difficulty: 'Expert',
  id: '31',
  image: 'assets/img/molerat.jpg',
  songName: 'Friday',
  songSubName: 'Rebecca Black'
};

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
    challenge: {  // Actively playing challenge.
      author: '',
      difficulty: '',
      id: '',
      image: '',
      isLoading: false,
      isBeatsPreloaded: false,  // Whether we have passed the negative time.
      songName: '',
      songSubName: ''
    },
    hasReceivedUserGesture: false,
    inVR: false,
    isPaused: false,  // Playing, but paused. Not active during menu.
    isPlaying: false,  // Actively playing (slicing beats).
    isSongFetching: false,  // Fetching stage.
    isSongLoading: false  // Either fetching or decoding.
  },

  handlers: {
    beatloaderfinish: (state, payload) => {
      state.challenge.isLoading = false;
    },

    beatloaderpreloadfinish: state => {
      if (state.menuActive) { return; }  // Cancelled.
      state.challenge.isBeatsPreloaded = true;
    },

    beatloaderstart: state => {
      state.challenge.isBeatsPreloaded = false;
      state.challenge.isLoading = true;
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
      state.menuActive = false;
      state.isSongFetching = true;
      state.isSongLoading = true;
    },

    gamemenuresume: state => {
      state.isPaused = false;
    },

    gamemenurestart: state => {
      state.challenge.isBeatsPreloaded = false;
      state.isPaused = false;
      state.isSongLoading = true;
    },

    keyboardclose: state => {
      state.isSearching = false;
    },

    keyboardopen: state => {
      state.isSearching = true;
    },

    pausegame: state => {
      if (!state.isPlaying) { return; }
      state.isPaused = true;
    },

    /**
     * Start challenge.
     * Transfer staged challenge to the active challenge.
     */
    challengeset: (state, payload) => {
      // Set challenge. `beat-loader` is listening.
      state.challenge.id = payload.id;
      state.challenge.difficulty = payload.difficulty;
      state.challenge.image = utils.getS3FileUrl(payload.id, 'image.jpg');
      state.challenge.songName = payload.songName;
      state.challenge.songSubName = payload.songSubName;
      state.isSongLoading = true;
    },

    challengesetfromzip: (state, payload) => {
      state.challenge.id = payload.id;
      state.challenge.difficulty = payload.difficulty;
      state.challenge.image = payload.image
      state.challenge.author = payload.info.author;
      state.challenge.songName = payload.info.songName;
      state.challenge.songSubName = payload.info.songSubName;
      state.isSongLoading = true;
    },

    songfetchfinish: state => {
      state.isSongFetching = false;
    },

    songloadcancel: state => {
      state.challenge.isBeatsPreloaded = false;
      state.challenge.isLoading = false;
      state.isSongLoading = false;
      state.isSongFetching = false;
      state.menuActive = true;
    },

    songloadfinish: state => {
      state.isSongFetching = false;
      state.isSongLoading = false;
    },

    songloadstart: state => {
      state.isSongFetching = true;
      state.isSongLoading = true;
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
      !state.menuActive && !state.isPaused &&
      !state.challenge.isLoading && !state.isSongLoading && !!state.challenge.id &&
      state.hasReceivedUserGesture;

    const anyMenuOpen = state.menuActive || state.isPaused ||
                        state.isSongLoading || state.isSongFetching;

    // Song is decoding if it is loading, but not fetching.
    if (state.isSongLoading) {
      state.loadingText = state.isSongFetching ? 'Downloading song...' : 'Processing song...';
    } else {
      state.loadingText = '';
    }
  }
});

function truncate (str, length) {
  if (!str) { return ''; }
  if (str.length >= length) {
    return str.substring(0, length - 3) + '...';
  }
  return str;
}

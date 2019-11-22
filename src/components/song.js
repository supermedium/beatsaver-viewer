const utils = require('../utils');

const GAME_OVER_LENGTH = 3.5;
const ONCE = {once: true};

let skipDebug = AFRAME.utils.getUrlParameter('skip');
if (!!skipDebug) {
  skipDebug = parseInt(skipDebug) / 1000;
} else {
  skipDebug = 0;
}

/**
 * Active challenge song / audio.
 *
 * Order of song init in conjuction with beat-generator:
 *
 * 1. previewStartTime is playing
 * 2. songloadfinish
 * 3. beat-generator preloading
 * 4. preloaded beats generated
 * 5. beat-generator preloading finish
 * 6. startAudio / songStartTime is set
 * 7. beat-generator continues off song current time
 */
AFRAME.registerComponent('song', {
  schema: {
    audio: {default: ''},
    analyserEl: {type: 'selector', default: '#audioAnalyser'},
    difficulty: {default: ''},
    hasReceivedUserGesture: {default: false},
    isBeatsPreloaded: {default: false},
    isPaused: {default: false},
    isPlaying: {default: false},
    mode: {default: 'Standard'}
  },

  init: function () {
    this.analyserSetter = {buffer: true};
    this.audioAnalyser = this.data.analyserEl.components.audioanalyser;
    this.context = this.audioAnalyser.context;
    this.isPlaying = false;
    this.songLoadingIndicator = document.getElementById('songLoadingIndicator');
    this.songStartTime = 0;

    this.audioAnalyser.gainNode.gain.value =
      document.getElementById('volumeSlider').value || 0.35;

    this.el.addEventListener('gamemenurestart', this.onRestart.bind(this));
  },

  update: function (oldData) {
    const data = this.data;

    if (!this.el.sceneEl.isPlaying) { return; }

    // Resume.
    if (oldData.isPaused && !data.isPaused) {
      if (navigator.userAgent.indexOf('Chrome') !== -1) {
        this.source.playbackRate.value = 1;
      } else {
        this.audioAnalyser.resumeContext();
      }
      this.isPlaying = true;
    }

    // New challenge, load audio and play when ready.
    if (oldData.audio !== data.audio && data.audio) {
      this.el.sceneEl.emit('songprocessingstart', null, false);
      this.getAudio().then(source => {
        this.el.sceneEl.emit('songprocessingfinish', null, false);
      }).catch(console.error);
      return;
    }

    // Difficulty select
    if ((oldData.difficulty && oldData.difficulty !== data.difficulty) ||
        (oldData.mode && oldData.mode !== data.mode)) {
      this.onRestart();
    }

    // Play if we have loaded and were waiting for beats to preload.
    if (!oldData.isBeatsPreloaded && this.data.isBeatsPreloaded && this.source) {
      this.startAudio();
    }

    // Pause / stop.
    if (!oldData.isPaused && data.isPaused) {
      if (navigator.userAgent.indexOf('Chrome') !== -1) {
        // Stupid Chrome audio policies. Can't resume.
        this.source.playbackRate.value = 0.000000001;
      } else {
        this.audioAnalyser.suspendContext();
      }
      this.isPlaying = false;
    }
  },

  pause: function () {
    if (this.data.isPlaying) {
      this.audioAnalyser.suspendContext();
    }
  },

  play: function () {
    if (this.data.isPlaying) {
      this.audioAnalyser.resumeContext();
    }
  },

  getAudio: function () {
    const data = this.data;

    this.isPlaying = false;
    return new Promise(resolve => {
      data.analyserEl.addEventListener('audioanalyserbuffersource', evt => {
        // Finished decoding.
        this.source = evt.detail;
        resolve(this.source);
      }, ONCE);
      this.analyserSetter.src = this.data.audio;
      data.analyserEl.setAttribute('audioanalyser', this.analyserSetter);
    });
  },

  stopAudio: function () {
    if (!this.source) {
      console.warn('[song] Tried to stopAudio, but not playing.');
      return;
    }
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this.isPlaying = false;
  },

  onRestart: function () {
    this.isPlaying = false;

    // Restart, get new buffer source node and play.
    if (this.source) { this.source.disconnect(); }

    // Clear gain interpolation values from game over.
    const gain = this.audioAnalyser.gainNode.gain;
    gain.cancelScheduledValues(0);

    this.el.sceneEl.emit('songprocessingstart', null, false);
    this.data.analyserEl.addEventListener('audioanalyserbuffersource', evt => {
      this.source = evt.detail;
      this.el.sceneEl.emit('songprocessingfinish', null, false);
      if (this.data.isPlaying && this.data.isBeatsPreloaded) {
        this.startAudio();
      }
    }, ONCE);
    this.audioAnalyser.refreshSource();
  },

  startAudio: function (time) {
    const playTime = time || skipDebug || 0;
    this.songStartTime = this.context.currentTime - playTime;
    this.source.start(0, playTime);
    this.isPlaying = true;
    this.el.emit('songstartaudio');
  },

  getCurrentTime: function () {
    return this.context.currentTime - this.songStartTime;
  }
});

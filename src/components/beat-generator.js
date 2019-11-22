import {BEAT_WARMUP_OFFSET, BEAT_WARMUP_SPEED, BEAT_WARMUP_TIME} from '../constants/beat';
import utils from '../utils';

let skipDebug = AFRAME.utils.getUrlParameter('skip') || 0;
skipDebug = parseInt(skipDebug, 10);

const RIDICULOUS_MAP_EX_CONSTANT = 4001;
const WALL_HEIGHT_MIN = 0;
const WALL_HEIGHT_MAX = 1000;
const WALL_START_BASE = 100;
const WALL_START_MAX = 400;

/**
 * Load beat data (all the beats and such).
 */
AFRAME.registerComponent('beat-generator', {
  dependencies: ['stage-colors'],

  schema: {
    beatAnticipationTime: {default: 1.1},
    beatWarmupTime: {default: BEAT_WARMUP_TIME / 1000},
    beatWarmupSpeed: {default: BEAT_WARMUP_SPEED},
    difficulty: {type: 'string'},
    isPlaying: {default: false},
    mode: {default: 'Standard'}
  },

  orientationsHumanized: [
    'up',
    'down',
    'left',
    'right',
    'upleft',
    'upright',
    'downleft',
    'downright'
  ],

  horizontalPositions: [-0.75, -0.25, 0.25, 0.75],

  init: function () {
    this.audioAnalyserEl = document.getElementById('audioanalyser');
    this.beatData = null;
    this.beatDataProcessed = false;
    this.beatContainer = document.getElementById('beatContainer');
    this.beatsTime = undefined;
    this.beatsPreloadTime = 0;
    this.beatsPreloadTimeTotal =
      (this.data.beatAnticipationTime + this.data.beatWarmupTime) * 1000;
    this.bpm = undefined;
    this.stageColors = this.el.components['stage-colors'];
    // Beats arrive at sword stroke distance synced with the music.
    this.swordOffset = 1.5;
    this.twister = document.getElementById('twister');
    this.leftStageLasers = document.getElementById('leftStageLasers');
    this.rightStageLasers = document.getElementById('rightStageLasers');

    this.el.addEventListener('cleargame', this.clearBeats.bind(this));
    this.el.addEventListener('challengeloadend', evt => {
      this.beatmaps = evt.detail.beatmaps;
      this.beatData = this.beatmaps.Standard[this.data.difficulty || evt.detail.difficulty];
      this.beatSpeeds = evt.detail.beatSpeeds;
      this.info = evt.detail.info;
      this.processBeats();

      // Mapping extensions.
      // https://github.com/joshwcomeau/beatmapper/tree/master/src/helpers/obstacles.helpers.js
      if (evt.detail.mappingExtensions && evt.detail.mappingExtensions.isEnabled) {
        this.mappingExtensions = evt.detail.mappingExtensions;
        console.log(this.mappingExtensions);
      } else {
        this.mappingExtensions = null;
      }
    });
  },

  update: function (oldData) {
    if (!this.beatmaps) { return; }

    if (oldData.isPlaying && !this.data.isPlaying) {
      this.clearBeats(true);
    }

    if ((oldData.difficulty && oldData.difficulty !== this.data.difficulty) ||
        (oldData.mode && oldData.mode !== this.data.mode)) {
      this.beatData = this.beatmaps[this.data.mode][this.data.difficulty];
      this.processBeats();
    }
  },

  /**
   * Load the beat data into the game.
   */
  processBeats: function () {
    // Reset variables used during playback.
    // Beats spawn ahead of the song and get to the user in sync with the music.
    this.beatsTime = 0;
    this.beatsPreloadTime = 0;
    this.beatData._events.sort(lessThan);
    this.beatData._obstacles.sort(lessThan);
    this.beatData._notes.sort(lessThan);
    this.beatSpeed = this.beatSpeeds[this.data.mode][this.data.difficulty];
    this.bpm = this.info._beatsPerMinute;

    // Some events have negative time stamp to initialize the stage.
    const events = this.beatData._events;
    if (events.length && events[0]._time < 0) {
      for (let i = 0; events[i]._time < 0; i++) {
        this.generateEvent(events[i]);
      }
    }

    this.beatDataProcessed = true;
    console.log('[beat-generator] Finished processing beat data.');
  },

  /**
   * Generate beats and stuff according to timestamp.
   */
  tick: function (time, delta) {
    if (!this.data.isPlaying || !this.beatData) { return; }

    const song = this.el.components.song;
    const prevBeatsTime = this.beatsTime + skipDebug;
    const prevEventsTime = this.eventsTime + skipDebug;

    if (this.beatsPreloadTime === undefined) {
      // Get current song time.
      if (!song.isPlaying) { return; }
      this.beatsTime = (song.getCurrentTime() + this.data.beatAnticipationTime +
                        this.data.beatWarmupTime) * 1000;
      this.eventsTime = song.getCurrentTime() * 1000;
    } else {
      // Song is not playing and is preloading beats, use maintained beat time.
      this.beatsTime = this.beatsPreloadTime;
      this.eventsTime = song.getCurrentTime() * 1000;
    }

    // Skip a frame to update prevBeats data.
    if (this.isSeeking) {
      this.isSeeking = false;
      return;
    }

    // Load in stuff scheduled between the last timestamp and current timestamp.
    // Beats.
    const beatsTime = this.beatsTime + skipDebug;

    const msPerBeat = 1000 * 60 / this.bpm;
    const notes = this.beatData._notes;
    for (let i = 0; i < notes.length; ++i) {
      let noteTime = notes[i]._time * msPerBeat;
      if (noteTime > prevBeatsTime && noteTime <= beatsTime) {
        notes[i].time = noteTime;
        this.generateBeat(notes[i]);
      }
    }

    // Walls.
    const obstacles = this.beatData._obstacles;
    for (let i = 0; i < obstacles.length; ++i) {
      let noteTime = obstacles[i]._time * msPerBeat;
      if (noteTime > prevBeatsTime && noteTime <= beatsTime) {
        this.generateWall(obstacles[i]);
      }
    }

    // Stage events.
    const eventsTime = this.eventsTime + skipDebug;
    const events = this.beatData._events;
    for (let i = 0; i < events.length; ++i) {
      let noteTime = events[i]._time * msPerBeat;
      if (noteTime > prevEventsTime && noteTime <= eventsTime) {
        this.generateEvent(events[i]);
      }
    }

    if (this.beatsPreloadTime === undefined) { return; }

    if (this.beatsPreloadTime >= this.beatsPreloadTimeTotal) {
      // Finished preload.
      this.el.sceneEl.emit('beatloaderpreloadfinish', null, false);
      this.beatsPreloadTime = undefined;
    } else {
      // Continue preload.
      this.beatsPreloadTime += delta;
    }
  },

  seek: function (time) {
    this.clearBeats(true);
    this.beatsTime = (
      time +
      this.data.beatAnticipationTime +
      this.data.beatWarmupTime
    ) * 1000;
    this.isSeeking = true;
  },

  generateBeat: function (note) {
    const data = this.data;

    // if (Math.random() < 0.8) { note._type = 3; } // To debug mines.
    let color;
    let type = note._cutDirection === 8 ? 'dot' : 'arrow';
    if (note._type === 0) {
      color = 'red';
    } else if (note._type === 1) {
      color = 'blue';
    } else {
      type = 'mine';
      color = undefined;
    }

    const beatEl = this.requestBeat(type, color);
    if (!beatEl) { return; }

    if (!beatEl.components.beat || !beatEl.components.beat.data) {
      beatEl.addEventListener('loaded', () => {
        this.doGenerateBeat(beatEl, note, type, color);
      });
    } else {
      this.doGenerateBeat(beatEl, note, type, color);
    }
  },

  doGenerateBeat: (function () {
    const beatObj = {};

    return function (beatEl, note, type, color) {
      const data = this.data;

      // Apply sword offset. Blocks arrive on beat in front of the user.
      beatObj.anticipationPosition = -data.beatAnticipationTime * this.beatSpeed - this.swordOffset;
      beatObj.color = color;
      beatObj.cutDirection = this.orientationsHumanized[note._cutDirection];
      beatObj.speed = this.beatSpeed;
      beatObj.size = 0.4;
      beatObj.type = type;
      beatObj.warmupPosition = -data.beatWarmupTime * data.beatWarmupSpeed;

      if (this.mappingExtensions) {
        note._lineIndex = note._lineIndex < 0
          ? note._lineIndex / 1000 + 1
          : note._lineIndex / 1000 - 1;
        note._lineLayer = note._lineLayer < 0
          ? note._lineLayer / 1000 + 1
          : note._lineLayer / 1000 - 1;
        if (this.mappingExtensions.colWidth) {
          beatObj.size *= this.mappingExtensions.colWidth;
        }
      }
      beatObj.horizontalPosition = note._lineIndex;
      beatObj.verticalPosition = note._lineLayer,

      beatEl.setAttribute('beat', beatObj);
      beatEl.components.beat.onGenerate(this.mappingExtensions);
      beatEl.play();
    };
  })(),

  generateWall: (function () {
    const wallObj = {};
    const WALL_THICKNESS = 0.5;

    return function (wall) {
      const el = this.el.sceneEl.components.pool__wall.requestEntity();

      if (!el) { return; }

      const data = this.data;
      const speed = this.beatSpeed;

      const durationSeconds = 60 * (wall._duration / this.bpm);
      wallObj.anticipationPosition =
        -data.beatAnticipationTime * this.beatSpeed - this.swordOffset;
      wallObj.durationSeconds = durationSeconds;
      wallObj.horizontalPosition = wall._lineIndex;
      wallObj.isCeiling = wall._type === 1;
      wallObj.speed = speed;
      wallObj.warmupPosition = -data.beatWarmupTime * data.beatWarmupSpeed;
      // wall._width can be like 1 or 2. Map that to 0.5 thickness.
      wallObj.width = wall._width * WALL_THICKNESS;

      if (this.mappingExtensions) {
        wallObj.horizontalPosition = wall._lineIndex < 0
          ? wall._lineIndex / 1000 + 1
          : wall._lineIndex / 1000 - 1;
        wallObj.width = ((wall._width - 1000) / 1000) * WALL_THICKNESS
      }

      el.setAttribute('wall', wallObj);

      // Handle mapping extensions wall format.
      if (this.mappingExtensions) {
        const typeValue = wall._type - RIDICULOUS_MAP_EX_CONSTANT;
        let height = Math.round(typeValue / 1000);
        let startHeight = typeValue % 1000;

				height = roundToNearest(
					normalize(
						height,
						WALL_HEIGHT_MIN,
						WALL_HEIGHT_MAX,
						0,
						5
					),
					0.001
				);
				startHeight = roundToNearest(
					normalize(startHeight, WALL_START_BASE, WALL_START_MAX, 0, 1.3),
					0.01
				);

        el.components.wall.setMappingExtensionsHeight(startHeight, height);
      }

      el.play();
    };
  })(),

  generateEvent: function (event) {
    switch(event._type) {
      case 0:
        this.stageColors.setColor('bg', event._value);
        break;
      case 1:
        this.stageColors.setColor('tunnel', event._value);
        break;
      case 2:
        this.stageColors.setColor('leftlaser', event._value);
        break;
      case 3:
        this.stageColors.setColor('rightlaser', event._value);
        break;
      case 4:
        this.stageColors.setColor('floor', event._value);
        break;
      case 8:
        this.twister.components.twister.pulse(event._value);
        break;
      case 9:
        // zoom was a bit disturbing
        this.twister.components.twister.pulse(event._value);
        break;
      case 12:
        this.leftStageLasers.components['stage-lasers'].pulse(event._value);
        break;
      case 13:
        this.rightStageLasers.components['stage-lasers'].pulse(event._value);
        break;
    }
  },

  requestBeat: function (type, color) {
    var beatPoolName = 'pool__beat-' + type;
    var pool;
    if (color) { beatPoolName += '-' + color; }
    pool = this.el.sceneEl.components[beatPoolName];
    if (!pool) {
      console.warn('Pool ' + beatPoolName + ' unavailable');
      return;
    }
    return pool.requestEntity();
  },

  /**
   * Restart by returning all beats to pool.
   */
  clearBeats: function (isSeeking) {
    if (!isSeeking) {
      this.beatsPreloadTime = 0;
      this.beatsTime = 0;
      this.eventsTime = 0;
    }
    for (let i = 0; i < this.beatContainer.children.length; i++) {
      let child = this.beatContainer.children[i];
      if (child.components.beat) {
        child.components.beat.returnToPool();
      }
      if (child.components.wall) {
        child.components.wall.returnToPool();
      }
    }
  },
});

function lessThan (a, b) { return a._time - b._time; }

/**
 * Say I have a value, 15, out of a range between 0 and 30.
 * I might want to know what that is on a scale of 1-5 instead.
 */
function normalize (number, currentScaleMin, currentScaleMax, newScaleMin, newScaleMax) {
  // First, normalize the value between 0 and 1.
  const standardNormalization =
    (number - currentScaleMin) / (currentScaleMax - currentScaleMin);

  // Next, transpose that value to our desired scale.
  return (newScaleMax - newScaleMin) * standardNormalization + newScaleMin;
};

function roundToNearest (number, nearest) {
  return Math.round(number / nearest) * nearest;
}

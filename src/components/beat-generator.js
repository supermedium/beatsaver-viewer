import {BEAT_WARMUP_OFFSET, BEAT_WARMUP_SPEED, BEAT_WARMUP_TIME} from '../constants/beat';
import utils from '../utils';

let skipDebug = AFRAME.utils.getUrlParameter('skip') || 0;
skipDebug = parseInt(skipDebug, 10);

/**
 * Load beat data (all the beats and such).
 */
AFRAME.registerComponent('beat-generator', {
  dependencies: ['stage-colors'],

  schema: {
    beatAnticipationTime: {default: 1.1},
    beatSpeed: {default: 8.0},
    beatWarmupTime: {default: BEAT_WARMUP_TIME / 1000},
    beatWarmupSpeed: {default: BEAT_WARMUP_SPEED},
    difficulty: {type: 'string'},
    isPlaying: {default: false}
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

  horizontalPositionsHumanized: {
    0: 'left',
    1: 'middleleft',
    2: 'middleright',
    3: 'right'
  },

  positionHumanized: {
    topLeft: {layer: 2, index: 0},
    topCenterLeft: {layer: 2, index: 1},
    topCenterRight: {layer: 2, index: 2},
    topRight: {layer: 2, index: 3},

    middleLeft: {layer: 1, index: 0},
    middleCenterLeft: {layer: 1, index: 1},
    middleCenterRight: {layer: 1, index: 2},
    middleRight: {layer: 1, index: 3},

    bottomLeft: {layer: 0, index: 0},
    bottomCenterLeft: {layer: 0, index: 1},
    bottomCenterRight: {layer: 0, index: 2},
    bottomRight: {layer: 0, index: 3},
  },

  verticalPositionsHumanized: {
    0: 'bottom',
    1: 'middle',
    2: 'top'
  },

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
      this.allBeatData = evt.detail.beats;
      this.beatData = evt.detail.beats[this.data.difficulty || evt.detail.difficulty];
      this.info = evt.detail.info;
      this.processBeats();
    });
  },

  update: function (oldData) {
    if (oldData.difficulty && oldData.difficulty !== this.data.difficulty &&
        this.allBeatData) {
      this.beatData = this.allBeatData[this.data.difficulty];
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

  generateBeat: (function () {
    const beatObj = {};

    return function (noteInfo) {
      const data = this.data;

      // if (Math.random() < 0.8) { noteInfo._type = 3; } // To debug mines.
      let color;
      let type = noteInfo._cutDirection === 8 ? 'dot' : 'arrow';
      if (noteInfo._type === 0) {
        color = 'red';
      } else if (noteInfo._type === 1) {
        color = 'blue';
      } else {
        type = 'mine';
        color = undefined;
      }

      const beatEl = this.requestBeat(type, color);
      if (!beatEl) { return; }

      // Apply sword offset. Blocks arrive on beat in front of the user.
      beatObj.anticipationPosition = -data.beatAnticipationTime * data.beatSpeed - this.swordOffset;
      beatObj.color = color;
      beatObj.cutDirection = this.orientationsHumanized[noteInfo._cutDirection];
      beatObj.horizontalPosition = this.horizontalPositionsHumanized[noteInfo._lineIndex];
      beatObj.speed = this.data.beatSpeed;
      beatObj.type = type;
      beatObj.verticalPosition = this.verticalPositionsHumanized[noteInfo._lineLayer],
      beatObj.warmupPosition = -data.beatWarmupTime * data.beatWarmupSpeed;
      beatEl.setAttribute('beat', beatObj);

      beatEl.play();
      beatEl.components.beat.onGenerate();
    };
  })(),

  generateWall: (function () {
    const wallObj = {};
    const WALL_THICKNESS = 0.5;

    return function (wallInfo) {
      const el = this.el.sceneEl.components.pool__wall.requestEntity();

      if (!el) { return; }

      const data = this.data;
      const speed = this.data.beatSpeed;

      const durationSeconds = 60 * (wallInfo._duration / this.bpm);
      wallObj.anticipationPosition =
        -data.beatAnticipationTime * data.beatSpeed - this.swordOffset;
      wallObj.durationSeconds = durationSeconds;
      wallObj.horizontalPosition = this.horizontalPositionsHumanized[wallInfo._lineIndex];
      wallObj.isCeiling = wallInfo._type === 1;
      wallObj.speed = speed;
      wallObj.warmupPosition = -data.beatWarmupTime * data.beatWarmupSpeed;
      // wallInfo._width can be like 1 or 2. Map that to 0.5 thickness.
      wallObj.width = wallInfo._width * WALL_THICKNESS;
      el.setAttribute('wall', wallObj);
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

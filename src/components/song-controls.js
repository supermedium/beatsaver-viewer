const ONCE = {once: true};

let queryParamTime = AFRAME.utils.getUrlParameter('time').trim();
if (!queryParamTime || isNaN(queryParamTime)) {
  queryParamTime = undefined;
} else {
  queryParamTime = parseFloat(queryParamTime);
}

/**
 * Update the 2D UI. Handle pause and seek.
 */
AFRAME.registerComponent('song-controls', {
  dependencies: ['song'],

  schema: {
    difficulty: {default: ''},
    mode: {default: 'Standard'},
    songName: {default: ''},
    songSubName: {default: ''},
    songImage: {default: ''},
    isPlaying: {default: false}
  },

  init: function () {
    this.customDifficultyLabels = {};
    this.song = this.el.components.song;
    this.tick = AFRAME.utils.throttleTick(this.tick.bind(this), 100);

    // Seek to ?time if specified.
    if (queryParamTime !== undefined) {
      this.el.sceneEl.addEventListener('songstartaudio', () => {
        setTimeout(() => {
          this.seek(queryParamTime);
        }, 100);
      }, ONCE);
    }

    const analyser = document.getElementById('audioAnalyser');
    analyser.addEventListener('audioanalyserbuffersource', evt => {
      document.getElementById('songDuration').innerHTML =
        formatSeconds(evt.detail.buffer.duration);
    });

    this.songProgress = document.getElementById('songProgress');
  },

  update: function (oldData) {
    const data = this.data;

    if (!this.controls) { return; }

    if (data.isPlaying) {
      document.body.classList.add('isPlaying');
    } else {
      document.body.classList.remove('isPlaying');
    }

    document.getElementById('songImage').src = data.songImage;
    document.getElementById('songName').innerHTML = truncate(data.songName, 14);
    document.getElementById('songName').setAttribute('title', data.songName);
    document.getElementById('songSubName').innerHTML = truncate(data.songSubName, 15);
    document.getElementById('songSubName').setAttribute('title', data.songSubName);

    document.getElementById('controlsDifficulty').innerHTML =
      this.customDifficultyLabels[data.difficulty] || data.difficulty;
    document.getElementById('controlsMode').innerHTML = data.mode;

    if ((oldData.difficulty && oldData.difficulty !== data.difficulty) ||
        (oldData.mode && oldData.mode !== data.mode)) {
      removeTimeQueryParam();
    }

    if (oldData.mode && oldData.mode !== data.mode) {
      this.updateDifficultyOptions();
    }
  },

  play: function () {
    const controls = this.controls = document.getElementById('controls');
    this.difficulty = document.getElementById('controlsDifficulty');
    this.difficultyOptions = document.getElementById('controlsDifficultyOptions');
    this.modeDropdownEl = document.getElementById('controlsMode');
    this.modeOptionEls = document.getElementById('controlsModes');
    this.playhead = document.getElementById('playhead');
    const timeline = this.timeline = document.getElementById('timeline');
    const timelineHover = this.timelineHover = document.getElementById('timelineHover');

    const timelineWidth = timeline.offsetWidth;

    this.el.sceneEl.addEventListener('challengeloadend', evt => {
      this.beatmaps = evt.detail.beatmaps;
      this.difficulties = evt.detail.difficulties;
      this.info = evt.detail.info;

      this.customDifficultyLabels = {};

      // Show controls on load.
      controls.classList.add('challengeLoaded');

      this.updateDifficultyOptions();
      this.updateModeOptions();
    });

    // Seek.
    timeline.addEventListener('click', event => {
      if (!this.song.source) { return; }

      const marginLeft = (event.clientX - timeline.getBoundingClientRect().left);
      const percent = marginLeft / timeline.getBoundingClientRect().width;

      // Get new audio buffer source (needed every time audio is stopped).
      // Start audio at seek time.
      const time = percent * this.song.source.buffer.duration;
      this.seek(time);
      setTimeQueryParam(time);
    });

    // Seek hover.
    timeline.addEventListener('mouseenter', evt => {
      if (!this.song.source) { return; }
      timelineHover.classList.add('timelineHoverActive');
    });
    timeline.addEventListener('mousemove', evt => {
      const marginLeft = (evt.clientX - timeline.getBoundingClientRect().left);
      const percent = marginLeft / timeline.getBoundingClientRect().width;
      timelineHover.style.left = marginLeft - 17 + 'px';
      timelineHover.innerHTML = formatSeconds(percent * this.song.source.buffer.duration);
    });
    timeline.addEventListener('mouseleave', evt => {
      timelineHover.classList.remove('timelineHoverActive');
    });

    // Pause.
    document.getElementById('controlsPause').addEventListener('click', () => {
      this.el.sceneEl.emit('pausegame', null, false);
    });

    // Difficulty dropdown.
    this.difficulty.addEventListener('click', () => {
      controls.classList.remove('modeOptionsActive');
      controls.classList.toggle('difficultyOptionsActive');
    });
    this.el.sceneEl.addEventListener('click', evt => {
      controls.classList.remove('difficultyOptionsActive');
    });

    // Difficulty select.
    this.difficultyOptions.addEventListener('click', evt => {
      this.songProgress.innerHTML = formatSeconds(0);
      this.playhead.style.width = '0%';
      this.el.sceneEl.emit('difficultyselect', evt.target.dataset.difficulty, false);
      this.difficulty.innerHTML = evt.target.innerHTML;
      controls.classList.remove('difficultyOptionsActive');
    });

    // Mode dropdown.
    this.modeDropdownEl.addEventListener('click', () => {
      controls.classList.remove('difficultyOptionsActive');
      controls.classList.toggle('modeOptionsActive');
    });
    this.el.sceneEl.addEventListener('click', evt => {
      controls.classList.remove('modeOptionsActive');
    });

    // Mode select.
    this.modeOptionEls.addEventListener('click', evt => {
      this.songProgress.innerHTML = formatSeconds(0);
      this.playhead.style.width = '0%';
      this.el.sceneEl.emit('modeselect', evt.target.dataset.mode, false);
      this.modeDropdownEl.innerHTML = evt.target.innerHTML;
      controls.classList.remove('modeOptionsActive');
    });

    document.addEventListener('searchOpen', () => {
      controls.classList.remove('difficultyOptionsActive');
      controls.classList.remove('modeOptionsActive');
    });

    // Hide volume if click anywhere.
    document.addEventListener('click', evt => {
      if (evt.target.closest('#volumeSliderContainer') ||
          evt.target.closest('#controlsVolume')) { return; }
      const slider = document.getElementById('volumeSliderContainer');
      const active = slider.classList.contains('volumeActive');
      if (!active) { return; }
      slider.classList.remove('volumeActive');
    });

    // Toggle volume slider.
    document.getElementById('controlsVolume').addEventListener('click', evt => {
      document.getElementById('volumeSliderContainer').classList.toggle('volumeActive');
    });

    // Update volume.
    document.getElementById('volumeSlider').addEventListener('change', evt => {
      this.song.audioAnalyser.gainNode.gain.cancelScheduledValues(0);
      this.song.audioAnalyser.gainNode.gain.value = evt.target.value;
      document.getElementById('beatContainer').components['beat-hit-sound']
        .setVolume(evt.target.value);
    });
  },

  tick: function () {
    if (!this.song.isPlaying || !this.song.source) { return; }
    this.updatePlayhead();
    this.songProgress.innerHTML = formatSeconds(this.song.getCurrentTime());
  },

  seek: function (time) {
    if (this.data.isPlaying) { this.song.stopAudio();  }

    // Get new audio buffer source (needed every time audio is stopped).
    this.song.data.analyserEl.addEventListener('audioanalyserbuffersource', evt => {
      // Start audio at seek time.
      const source = this.song.source = evt.detail;

      this.song.startAudio(time);

      // Tell beat generator about seek.
      this.el.components['beat-generator'].seek(time);

      this.updatePlayhead();
    }, ONCE);

    this.song.audioAnalyser.refreshSource();
  },

  updateModeOptions: function () {
    // Update mode list.
    for (let i = 0; i < this.modeOptionEls.children.length; i++) {
      const option = this.modeOptionEls.children[i];
      option.style.display = 'none';
      option.innerHTML = option.dataset.mode;
    }
    Object.keys(this.beatmaps).forEach(mode => {
      const option = this.modeOptionEls.querySelector(`[data-mode="${mode}"]`);
      option.style.display = 'inline-block';
    });
  },

  updateDifficultyOptions: function () {
    // Update difficulty list.
    for (let i = 0; i < this.difficultyOptions.children.length; i++) {
      const option = this.difficultyOptions.children[i];
      option.style.display = 'none';
      option.innerHTML = option.dataset.difficulty;
    }
    this.difficulties[this.data.mode].forEach(difficulty => {
      const option = this.difficultyOptions.querySelector(`[data-difficulty="${difficulty._difficulty}"]`);
      option.style.display = 'inline-block';

      // Custom difficulty labels.
      if (!this.info._difficultyBeatmapSets) { return; }
      this.info._difficultyBeatmapSets.forEach(set => {
        if (set._beatmapCharacteristicName !== 'Standard') { return; }
        set._difficultyBeatmaps.forEach(diff => {
          const customLabel = diff._customData._difficultyLabel;
          if (!customLabel) { return; }

          this.customDifficultyLabels[diff._difficulty] = customLabel;
          if (this.difficulty.innerHTML === diff._difficulty) {
            this.difficulty.innerHTML = customLabel;
          }

          if (diff._difficulty !== difficulty._difficulty) { return; }
          option.innerHTML = customLabel;
        });
      });
    });
  },

  updatePlayhead: function () {
    const progress = Math.max(
      0,
      Math.min(100, 100 * (this.song.getCurrentTime() / this.song.source.buffer.duration)));
    this.playhead.style.width = progress + '%';
  }
});

function truncate (str, length) {
  if (!str) { return ''; }
  if (str.length >= length) {
    return str.substring(0, length - 2) + '..';
  }
  return str;
}

const timeRe = /time=\d+/
function setTimeQueryParam (time) {
  time = parseInt(time);
  let search = window.location.search.toString();
  if (search) {
    if (search.match(timeRe)) {
      search = search.replace(timeRe, `time=${time}`);
    } else {
      search += `&time=${time}`;
    }
  } else {
    search = `?time=${time}`;
  }

  let url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  url += search;
  window.history.pushState({path: url},'', url);
}

function formatSeconds (time) {
  // Hours, minutes, and seconds.
  const hrs = ~~(time / 3600);
  const mins = ~~((time % 3600) / 60);
  const secs = ~~time % 60;

  // Output like '1:01' or '4:03:59' or '123:03:59'.
  let ret = '';
  if (hrs > 0) {
    ret += '' + hrs + ':' + (mins < 10 ? '0' : '');
  }
  ret += '' + mins + ':' + (secs < 10 ? '0' : '');
  ret += '' + secs;
  return ret;
}

function removeTimeQueryParam () {
  let search = window.location.search.toString();
  search = search.replace(timeRe, '');
  let url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  url += search;
  window.history.pushState({path: url},'', url);
}

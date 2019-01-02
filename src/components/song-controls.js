/**
 * Update the 2D UI. Handle pause and seek.
 */
AFRAME.registerComponent('song-controls', {
  dependencies: ['song'],

  schema: {
    difficulty: {default: ''},
    songName: {default: ''},
    songSubName: {default: ''},
    songImage: {default: ''},
    isPlaying: {default: false}
  },

  init: function () {
    this.song = this.el.components.song;
    this.tick = AFRAME.utils.throttleTick(this.tick.bind(this), 100);
  },

  update: function () {
    if (!this.controls) { return; }

    if (this.data.isPlaying) {
      document.body.classList.add('isPlaying');
    } else {
      document.body.classList.remove('isPlaying');
    }

    document.getElementById('songImage').src = this.data.songImage;
    document.getElementById('songName').innerHTML = truncate(this.data.songName, 18);
    document.getElementById('songName').setAttribute('title', this.data.songName);
    document.getElementById('songSubName').innerHTML = truncate(this.data.songSubName, 21);
    document.getElementById('songSubName').setAttribute('title', this.data.songSubName);
    document.getElementById('controlsDifficulty').innerHTML = this.data.difficulty;
  },

  play: function () {
    this.controls = document.getElementById('controls');
    this.difficulty = document.getElementById('controlsDifficulty');
    this.difficultyOptions = document.getElementById('controlsDifficultyOptions');
    this.playhead = document.getElementById('playhead');
    const timeline = this.timeline = document.getElementById('timeline');

    const timelineWidth = timeline.offsetWidth;

    this.el.sceneEl.addEventListener('challengeloadend', evt => {
      // Show controls on load.
      this.controls.classList.add('challengeLoaded');

      // Update difficulty list.
      for (let i = 0; i < this.difficultyOptions.children.length; i++) {
        this.difficultyOptions.children[i].style.display = 'none';
      }
      evt.detail.info.difficultyLevels.forEach(difficulty => {
        const option = this.difficultyOptions.querySelector(`[data-difficulty="${difficulty.difficulty}"]`);
        option.style.display = 'inline-block';
      });
    });

    // Seek.
    timeline.addEventListener('click', event => {
      const marginLeft = (event.clientX - timeline.getBoundingClientRect().left);
      const percent = marginLeft / timeline.getBoundingClientRect().width;

      // Get new audio buffer source (needed every time audio is stopped).
      this.song.stopAudio();
      this.song.data.analyserEl.addEventListener('audioanalyserbuffersource', evt => {
        // Start audio at seek time.
        const source = this.song.source = evt.detail;

        // Tell beat generator about seek.
        this.el.components['beat-loader'].seek();

        const time = percent * source.buffer.duration;
        this.song.startAudio(time);

        this.updatePlayhead();
      }, {once: true});
      this.song.audioAnalyser.refreshSource();
    });

    // Pause.
    document.getElementById('controlsPause').addEventListener('click', () => {
      this.el.sceneEl.emit('pausegame', null, false);
    });

    // Difficulty dropdown.
    this.difficulty.addEventListener('click', () => {
      this.controls.classList.toggle('difficultyOptionsActive');
    });
    this.el.sceneEl.addEventListener('click', evt => {
      this.controls.classList.remove('difficultyOptionsActive');
    });

    // Difficulty select.
    this.difficultyOptions.addEventListener('click', evt => {
      this.el.sceneEl.emit('difficultyselect', evt.target.dataset.difficulty, false);
      this.controls.classList.remove('difficultyOptionsActive');
    });
  },

  tick: function () {
    if (!this.song.isPlaying || !this.song.source) { return; }
    this.updatePlayhead();
  },

  updatePlayhead: function () {
    const progress = Math.max(0, Math.min(100, 100 * (this.song.getCurrentTime() / this.song.source.buffer.duration)));
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

AFRAME.registerComponent('song-controls', {
  dependencies: ['song'],

  schema: {
    songName: {default: ''},
    songSubName: {default: ''},
    songImage: {default: ''},
    isPlaying: {default: false}
  },

  init: function () {
    this.song = this.el.components.song;
    this.tick = AFRAME.utils.throttleTick(this.tick.bind(this), 1000);
  },

  update: function () {
    if (!this.controls) { return; }

    if (this.data.isPlaying) {
      document.body.classList.add('isPlaying');
    } else {
      document.body.classList.remove('isPlaying');
    }

    document.getElementById('songImage').src = this.data.songImage;
    document.getElementById('songName').innerHTML = this.data.songName;
    document.getElementById('songSubName').innerHTML = this.data.songSubName;
  },

  play: function () {
    this.controls = document.getElementById('controls');
    this.playhead = document.getElementById('playhead');
    const timeline = this.timeline = document.getElementById('timeline');

    const timelineWidth = timeline.offsetWidth;

    // Seek.
    timeline.addEventListener('click', event => {
      const marginLeft = (event.clientX - timeline.getBoundingClientRect().left);
      const percent = marginLeft / timelineWidth;

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

    document.getElementById('controlsPause').addEventListener('click', () => {
      this.el.sceneEl.emit('pausegame', null, false);
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

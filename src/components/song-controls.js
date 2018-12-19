AFRAME.registerComponent('song-controls', {
  dependencies: ['song'],

  init: function () {
    this.song = this.el.components.song;
    this.tick = AFRAME.utils.throttleTick(this.tick.bind(this), 1000);
  },

  play: function () {
    this.playhead = document.getElementById('playhead');
    const timeline = this.timeline = document.getElementById('timeline');
    const timelineWidth = timeline.offsetWidth - this.playhead.offsetWidth;

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
  },

  tick: function () {
    if (!this.song.isPlaying || !this.song.source) { return; }
    this.updatePlayhead();
  },

  updatePlayhead: function () {
    const progress = 100 * (this.song.getCurrentTime() / this.song.source.buffer.duration);
    this.playhead.style.marginLeft = progress + '%';
  }
});

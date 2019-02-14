AFRAME.registerSystem('iframe', {
  init: function () {
    if (window.self !== window.top) {
      document.getElementById('vrButton').style.display = 'none';
    }
  }
});

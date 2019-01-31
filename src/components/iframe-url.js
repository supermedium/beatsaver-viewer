AFRAME.registerComponent('iframe-url', {
  init: function () {
    if (window.self === window.top) { return; }
    document.querySelector('#iframeUrl').innerHTML =
      window.location.toString()
        .replace('https://', '')
        .replace('http://', '');
  }
});

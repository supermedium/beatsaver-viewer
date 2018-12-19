# beatsaver-viewer

[A-Frame]: https://aframe.io

Web-based viewer for BeatSaver maps, built with [A-Frame] and JavaScript.

The viewer can be embedded on any webpage and works on desktop or mobile. It
can also be previewed within VR headsets.

## Development

```
npm install
npm run start
```

Then head to `localhost:9999` in your browser.

## Usage

I-Frame the viewer and pass a query parameter containing the song ID and difficulty:

```
<iframe src="http://localhost:9999/?id=31&difficulty=Expert">
```

*The viewer is an unofficial community project and not officially affiliated
with Beat Saber.*

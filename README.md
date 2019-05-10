# beatsaver-viewer

[A-Frame]: https://aframe.io
[visit]: https://supermedium.com/beatsaver-viewer/?id=811-535&difficulty=Expert

Web-based viewer for BeatSaver maps, built with [A-Frame] and JavaScript.


**[CLICK TO VIEW][visit]**

![https://supermedium.com/beatsaver-viewer/?id=811-535&difficulty=Expert](https://raw.githubusercontent.com/supermedium/beatsaver-viewer/master/assets/img/sshot.jpg)

The viewer works within a normal web browser and can be embedded on any
webpage. It can also be previewed within VR headsets on browsers that support
VR (e.g., [Supermedium](https://supermedium.com)).

Featured on [BeastSaber](https://bsaber.com) and the unofficial [Beat Saber
Songs](https://beatsaber-songs.herokuapp.com/top/all) site!

## Usage

You can [visit or link the viewer directly][visit].

Or if you have a site, you can I-Frame the viewer and pass a query parameter
containing the song ID and difficulty:

```
<iframe src="https://supermedium.com/beatsaver-viewer/?id=811-535&difficulty=Expert">
```

To directly preview a BeatSaver ZIP file, use the `?zip` parameter in the URL:

`https://supermedium.com/beatsaver-viewer/?zip={zipURL}`

Note the ZIP must be served with CORS header. An easy way to do this is to
prepend `https://cors-anywhere.herokuapp.com/` to your ZIP URL:

`https://supermedium.com/beatsaver-viewer/?zip=https://cors-anywhere.herokuapp.com/{YOUR_FULL_ZIP_URL}`

To directly link to a seeked time, use the `?time` parameter in the URL (seconds):

`https://supermedium.com/beatsaver-viewer/?time=15`

## Roadmap

- Safari support (BeatSaver currently serves OGGs which are not supported)
- Custom saber viewer

## Community

*The BeatSaver viewer is an unofficial community project and not officially
affiliated with Beat Saber.*

- [Supermedium Discord](https://supermedium.com/discord)
- [BeastSaber Discord](https://discordapp.com/invite/cZpFayw)
- [BeatSaber Songs](https://beatsaber-songs.herokuapp.com/top/all)

It is adopted officially by the community on the Discord though, used as the
official tool for sharing maps online and featured on [BeastSaber](bsaber.com):

![](https://user-images.githubusercontent.com/674727/57561078-abdc0300-733e-11e9-9476-88e1bc6b2867.png)

## Development

Built with [A-Frame](https://aframe.io), a web framework that we created for
building VR experiences. And JavaScript.

```
npm install
npm run start
```

Then head to `localhost:9999` in your browser.

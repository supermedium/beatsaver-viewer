import {h, render, Component} from 'preact';

let scene;

/** @jsx h */
class Search extends Component {
  constructor () {
    super();

    this.state = {
      open: false,
      results: [],
      url: 'supermedium.com/beatsaver-viewer'
    };

    // Close search when clicking anywhere else.
    document.addEventListener('click', evt => {
      if (!this.state.open) { return; }
      if (!evt.target.closest('#searchResultsContainer') &&
          !evt.target.closest('#searchInput') &&
          !evt.target.closest('#searchToggle')) {
        this.setState({open: false});
      }
    });

    // Open search.
    document.getElementById('searchToggle').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('searchOpen'));
      this.setState({open: !this.state.open});
      setTimeout(() => {
        document.getElementById('searchInput').focus();
      }, 15);
    });

    // Update URL.
    scene.addEventListener('challengeset', evt => {
      const id = evt.detail;
      if (!id) { return; }
      this.setState({url: `supermedium.com/beatsaver-viewer?id=${id}`});
      setIdQueryParam(id);
    });

    this.search = debounce(this.search.bind(this), 100);
    this.selectSong = this.selectSong.bind(this);
  }

  componentDidUpdate () {
    // Close difficulty menu when search is toggled.
    if (this.state.open) {
      document.getElementById('controlsDifficultyOptions')
        .classList.remove('.difficultyOptionsActive');
    }
  }

  search (evt) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://beatsaver.com/api/search/text/0?q=${evt.target.value}`);
    xhr.addEventListener('load', () => {
      this.setState({results: JSON.parse(xhr.responseText).docs});
      if (typeof ga !== 'undefined') { ga('send', 'event', 'search', 'search'); }
    });
    xhr.send();
  }

  selectSong (evt) {
    scene.emit(
      'songselect',
      this.state.results[evt.target.closest('.searchResult').dataset.i]);
    this.setState({open: false});

    // Count as a pageview.
    if (typeof ga !== 'undefined') { ga('send', 'pageview'); }

    document.getElementById('searchInput').value = '';
  }
  /*
    <p
      id="url"
      style={{display: this.state.open ? 'none' : 'block'}}>{this.state.url}</p>
  */
  render () {
    return (
      <div id="search">
        <div
          id="searchResultsContainer"
          style={{display: this.state.open && this.state.results.length ? 'flex' : 'none'}}>
          <h3>Search Results (beatsaver.com)</h3>
          <ul id="searchResults">
            {this.state.results.map((result, i) => (
              <li class="searchResult" data-id={result.key} onClick={this.selectSong}
                  key={result.key} data-i={i}>
                <img src={`https://beatsaver.com${result.coverURL}`}/>
                <p>
                  {result.metadata.songSubName && truncate(result.metadata.songSubName, 20) + ' \u2014 ' || '' }
                  {truncate(result.metadata.songName, 25)}</p>
              </li>
            ))}
          </ul>
        </div>
        <input
          id="searchInput"
          type="search"
          placeholder="Search BeatSaver songs..."
          onKeyUp={this.search}
          style={{display: this.state.open ? 'flex' : 'none'}} />
      </div>
    );
  }
}

AFRAME.registerSystem('search', {
  init: function () {
    scene = this.el;
    render(<Search/>, document.getElementById('controls'));
  }
});

function truncate (str, length) {
  if (!str) { return ''; }
  if (str.length >= length) {
    return str.substring(0, length - 2) + '..';
  }
  return str;
}

function debounce (func, wait, immediate) {
  var timeout;

  return function executedFunction () {
    let context = this;
    let args = arguments;
    let later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    let callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

// Push state URL in browser.
const idRe = /id=[\d\w-]+/
function setIdQueryParam (id) {
  let search = window.location.search.toString();
  if (search) {
    if (search.match(idRe)) {
      search = search.replace(idRe, `id=${id}`);
    } else {
      search += `&id=${id}`;
    }
  } else {
    search = `?id=${id}`;
  }

  let url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  url += search;
  window.history.pushState({path: url},'', url);
}

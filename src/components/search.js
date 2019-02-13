const algoliasearch = require('algoliasearch/lite');
import {h, render, Component} from 'preact';

const client = algoliasearch('QULTOY3ZWU', 'be07164192471df7e97e6fa70c1d041d');
const algolia = client.initIndex('beatsaver');

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
      this.setState({open: !this.state.open});
      setTimeout(() => {
        document.getElementById('searchInput').focus();
      }, 15);
    });

    // Update URL.
    scene.addEventListener('challengeset', evt => {
      const id = evt.detail;
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
    const queryObject = {hitsPerPage: 5, query: evt.target.value};
    algolia.search(queryObject, (err, content) => {
      this.setState({results: content.hits});
    });
  }

  selectSong (evt) {
    scene.emit('songselect', evt.target.closest('.searchResult').dataset.id);
    this.setState({open: false});

    // Count as a pageview.
    ga('send', 'pageview');

    document.getElementById('searchInput').value = '';
  }

  render () {
    return (
      <div id="search">
        <div
          id="searchResultsContainer"
          style={{display: this.state.open && this.state.results.length ? 'flex' : 'none'}}>
          <h3>Search Results (beatsaver.com)</h3>
          <ul id="searchResults">
            {this.state.results.map(result => (
              <li class="searchResult" data-id={result.version} onClick={this.selectSong}>
                <img src={`https://saber.supermedium.com/${result.id}-image.jpg`}/>
                <p>
                  {result.songSubName && truncate(result.songSubName, 20) + ' \u2014 ' || '' }
                  {truncate(result.songName, 30)}</p>
              </li>
            ))}
          </ul>
        </div>
        <p
          id="url"
          style={{display: this.state.open ? 'none' : 'block'}}
          onClick={() => this.setState({open: true})}>{this.state.url}</p>
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
const idRe = /id=[\d-]+/
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

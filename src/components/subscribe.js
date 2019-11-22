document.addEventListener('DOMContentLoaded', () => {
  initSubscribeForm();
});

/**
 * Init XHR handler to subscribe.
 */
function initSubscribeForm () {
  const form = document.querySelector('form');
  if (!form) { return; }

  if (localStorage.getItem('subscribeClosed') === 'true') {
    form.parentNode.parentNode.removeChild(form.parentNode);
    return;
  }

  const button = form.querySelector('.submit');
  const input = form.querySelector('input[type="email"]');
  const newsletterHeader = document.querySelector('#subscribeForm > h2');

  let originalHeaderText = '';
  if (newsletterHeader) {
    originalHeaderText = newsletterHeader.innerHTML;
  }

  document.querySelector('#subscribeForm .closeSubscribe').addEventListener('click', () => {
    localStorage.setItem('subscribeClosed', true);
    form.parentNode.parentNode.removeChild(form.parentNode);
  });

  form.addEventListener('submit', evt => {
    evt.preventDefault();

    // supermedium/superchimp
    const xhr = new XMLHttpRequest();
    let endpoint = 'http://localhost:5000/mail/subscribe';
    if (process.env.NODE_ENV === 'production') {
      endpoint = 'https://supermedium.com/mail/subscribe';
    }
    xhr.open('POST', endpoint);

    xhr.addEventListener('load', () => {
      if (parseInt(xhr.status, 10) !== 200) {
        window.location.href = 'https://supermedium/subscribe/';
      }
      if (button) {
        button.disabled = true;
        button.innerHTML = 'Subscribed!';
      }
      if (newsletterHeader) {
        newsletterHeader.innerHTML = 'Successfully subscribed, thank you!';
      }
    });

    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.send(JSON.stringify({
      email: document.querySelector('[name="email"]').value,
      source: 'beatsaverviewer'
    }));

    return false;
  });

  if (button) {
    input.addEventListener('keydown', () => {
      if (button.hasAttribute('disabled')) {
        button.innerHTML = 'Subscribe';
        button.removeAttribute('disabled');
      }
      if (newsletterHeader && originalHeaderText) {
        newsletterHeader.innerHTML = originalHeaderText;
      }
    });
  }
}

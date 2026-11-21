
(() => {
  const app = document.getElementById('app');

  const nav = document.getElementById('main-nav');

  const menu = document.querySelector('.menu-toggle');

  const API = '/api';

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  async function request(url, options = {}) {
    const response = await fetch(url, options);

    const contentType =
      response.headers.get('content-type') || '';

    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(
        data.error || 'Request failed'
      );
    }

    return data;
  }

  async function loadPage(slug, push = false) {
    app.innerHTML = '<div class="loading">Loading...</div>';

    try {
      const response = await request(
        `${API}/pages/${encodeURIComponent(slug)}`
      );

      // API templates are server-controlled and must never
      // interpolate untrusted user input without escaping.
      app.innerHTML = response;

      if (push) {
        history.pushState(
          { slug },
          '',
          slug === 'home' ? '/' : `/${slug}`
        );
      }

      document.title =
        `${slug} | Rosa Lomba Da Silva Foundation`;

      nav.querySelectorAll('a').forEach(link => {
        const target = link.getAttribute('href');

        if (
          target ===
          (slug === 'home' ? '/' : `/${slug}`)
        ) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });

      nav.classList.remove('open');

      menu.setAttribute('aria-expanded', 'false');

      app.focus({ preventScroll: true });

      if (slug === 'home' || slug === 'programs') {
        loadPrograms();
      }

      bindForms();

    } catch (error) {
      app.textContent = '';

      const heading = document.createElement('h2');
      heading.textContent = 'Unable to load page';

      const message = document.createElement('p');
      message.textContent = error.message;

      app.append(heading, message);
    }
  }

  async function loadPrograms() {
    const target = document.getElementById('program-list');

    if (!target) return;

    try {
      const html = await request(
        `${API}/components/programs`
      );

      target.innerHTML = html || '<p>No programs available.</p>';

    } catch {
      target.textContent =
        'Unable to load programs.';
    }
  }

  function bindForms() {
    const forms = [
      {
        id: 'donation-form',
        endpoint: '/donations'
      },
      {
        id: 'contact-form',
        endpoint: '/contact'
      },
      {
        id: 'newsletter-form',
        endpoint: '/newsletter'
      }
    ];

    for (const item of forms) {
      const form = document.getElementById(item.id);

      if (!form || form.dataset.bound) continue;

      form.dataset.bound = 'true';

      form.addEventListener('submit', async event => {
        event.preventDefault();

        const status =
          form.querySelector('.form-status');

        const button = form.querySelector('button');

        if (!form.reportValidity()) return;

        button.disabled = true;

        if (status) {
          status.textContent = 'Submitting...';
        }

        try {
          const payload = Object.fromEntries(
            new FormData(form).entries()
          );

          if (item.id === 'donation-form') {
            payload.amount = Number(payload.amount);
          }

          const result = await request(
            `${API}${item.endpoint}`,
            {
              method: 'POST',

              headers: {
                'Content-Type': 'application/json'
              },

              body: JSON.stringify(payload)
            }
          );

          if (status) {
            status.textContent =
              result.message +
              (result.reference
                ? ` Reference: ${result.reference}`
                : '');
          }

          form.reset();

        } catch (error) {
          if (status) {
            status.textContent = error.message;
          }

        } finally {
          button.disabled = false;
        }
      });
    }
  }

  // Internal website navigation
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-link]');

    if (!link) return;

    const url = new URL(link.href, location.origin);

    if (url.origin !== location.origin) return;

    event.preventDefault();

    const slug =
      url.pathname.replace(/^\/+|\/+$/g, '') || 'home';

    loadPage(slug, true);
  });

  // Mobile navigation
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');

    menu.setAttribute(
      'aria-expanded',
      String(open)
    );
  });

  // Browser back/forward
  window.addEventListener('popstate', () => {
    const slug =
      location.pathname.replace(/^\/+|\/+$/g, '') || 'home';

    loadPage(slug);
  });

  // Back to top
  document.querySelector('.back-top')
    .addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

  // Copyright year
  document.querySelectorAll('[data-year]')
    .forEach(element => {
      element.textContent = new Date().getFullYear();
    });

  // WebSocket
  let socket;
  let reconnectTimer;

  function connectWebSocket() {
    const protocol =
      location.protocol === 'https:' ? 'wss:' : 'ws:';

    socket = new WebSocket(
      `${protocol}//${location.host}/ws`
    );

    socket.addEventListener('open', () => {
      console.log('Realtime connection established');
    });

    socket.addEventListener('message', event => {
      try {
        const data = JSON.parse(event.data);

        window.dispatchEvent(
          new CustomEvent('foundation:update', {
            detail: data
          })
        );

      } catch {
        console.error('Invalid WebSocket message');
      }
    });

    socket.addEventListener('close', () => {
      clearTimeout(reconnectTimer);

      reconnectTimer = setTimeout(
        connectWebSocket,
        4000
      );
    });
  }

  connectWebSocket();

  // Start website
  const initialPage =
    location.pathname.replace(/^\/+|\/+$/g, '') || 'home';

  loadPage(initialPage);

})();


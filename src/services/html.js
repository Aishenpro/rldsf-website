
const sanitizeHtml = require('sanitize-html');

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function renderPrograms(programs) {
  return programs.map(program => `
    <article class="program-list-card">
      <img
        src="${escapeHTML(program.image || '/images/foundation-reference.jpg')}"
        alt=""
      >

      <div>
        <h3>${escapeHTML(program.title)}</h3>
        <p>${escapeHTML(program.summary)}</p>
      </div>
    </article>
  `).join('');
}

function renderPage(slug) {
  const pages = {

    home: `
      <section class="hero">
        <div class="hero-photo"></div>
        <div class="hero-shade"></div>

        <div class="hero-content">
          <p class="eyebrow">
            Restoring Hope, Transforming Lives
          </p>

          <h1>
            Together We Can
            <span>Make a Difference</span>
          </h1>

          <p>
            Supporting vulnerable children, people
            with disabilities, women and communities
            through compassion, dignity and
            sustainable development.
          </p>

          <div class="hero-actions">
            <a href="/donate" data-link class="btn purple">
              ♥ Donate Now
            </a>

            <a href="/contact" data-link class="btn green">
              Become a Volunteer
            </a>

            <a href="/about" data-link class="btn outline">
              Learn More →
            </a>
          </div>
        </div>
      </section>

      <section class="intro section-wrap">

        <div>
          <h2 class="section-title">Who We Are</h2>

          <p>
            The Rosa Lomba Da Silva Foundation is
            committed to improving the lives of
            vulnerable individuals and families.
          </p>

          <a href="/about" data-link class="btn purple">
            Read More →
          </a>
        </div>

        <img
          class="intro-image"
          src="/images/foundation-reference.jpg"
          alt="Foundation visual reference"
        >

        <div>
          <h2 class="section-title">Our Programs</h2>

          <div id="program-list" class="program-grid">
            <p>Loading programs...</p>
          </div>
        </div>

      </section>

      <section class="impact">
        <div>
          <strong>Child Welfare</strong>
          <span>Care and protection</span>
        </div>

        <div>
          <strong>Disability Support</strong>
          <span>Inclusion for all</span>
        </div>

        <div>
          <strong>Women Empowerment</strong>
          <span>Skills and support</span>
        </div>

        <div>
          <strong>Community Outreach</strong>
          <span>Health and development</span>
        </div>
      </section>

      <section class="values section-wrap">

        <article>
          <h3>◎ Our Mission</h3>
          <p>
            To restore hope and improve quality of
            life through compassion and empowerment.
          </p>
        </article>

        <article>
          <h3>◉ Our Vision</h3>
          <p>
            A society where everyone can live with
            dignity and equal opportunities.
          </p>
        </article>

        <article>
          <h3>✦ Our Core Values</h3>
          <p>
            Compassion, Integrity, Service,
            Equality, Respect and Sustainability.
          </p>
        </article>

        <article>
          <h3>▧ Our Gallery</h3>
          <img
            src="/images/foundation-reference.jpg"
            alt="Foundation design reference"
          >
        </article>

      </section>
    `,

    about: `
      <section class="page-banner">
        <h1>About Our Foundation</h1>
        <p>Restoring Hope, Transforming Lives.</p>
      </section>

      <section class="content-panel">
        <h2>Who We Are</h2>
        <p>
          The Rosa Lomba Da Silva Foundation is a
          community-focused non-profit initiative.
        </p>

        <h2>Our Mission</h2>
        <p>
          To improve quality of life through
          compassion, empowerment and sustainable
          development.
        </p>

        <h2>Our Core Values</h2>
        <p>
          Compassion, Integrity, Service, Equality,
          Respect and Sustainability.
        </p>
      </section>
    `,

    programs: `
      <section class="page-banner">
        <h1>Our Programs</h1>
        <p>Building stronger and healthier communities.</p>
      </section>

      <section class="content-panel">
        <div id="program-list" class="program-list">
          Loading programs...
        </div>
      </section>
    `,

    projects: `
      <section class="page-banner">
        <h1>Our Projects</h1>
        <p>Community initiatives and development.</p>
      </section>

      <section class="content-panel">
        <h2>Our Work</h2>
        <p>
          Project information and verified progress
          reports will be published here.
        </p>
      </section>
    `,

    gallery: `
      <section class="page-banner">
        <h1>Our Gallery</h1>
        <p>Moments of hope and community.</p>
      </section>

      <section class="content-panel">
        <img
          class="wide-gallery"
          src="/images/foundation-reference.jpg"
          alt="Foundation reference image"
        >
      </section>
    `,

    news: `
      <section class="page-banner">
        <h1>News & Events</h1>
        <p>Latest updates from our foundation.</p>
      </section>

      <section class="content-panel">
        <h2>Latest News</h2>
        <p>News and event announcements will appear here.</p>
      </section>
    `,

    donate: `
      <section class="page-banner">
        <h1>Make a Difference</h1>
        <p>Your support can help communities.</p>
      </section>

      <section class="content-panel form-panel">
        <form id="donation-form">

          <label>
            Your Name
            <input name="name" maxlength="100">
          </label>

          <label>
            Email Address
            <input
              name="email"
              type="email"
              maxlength="254"
              required
            >
          </label>

          <label>
            Amount
            <input
              name="amount"
              type="number"
              min="1"
              max="100000000"
              required
            >
          </label>

          <label>
            Currency
            <select name="currency">
              <option>UGX</option>
              <option>USD</option>
            </select>
          </label>

          <label>
            Message
            <textarea name="message" maxlength="500"></textarea>
          </label>

          <label class="consent">
            <input type="checkbox" required>
            I understand this is a donation pledge,
            not an immediate payment.
          </label>

          <button class="btn orange">
            Submit Donation Pledge
          </button>

          <p class="form-status" role="status"></p>
        </form>
      </section>
    `,

    contact: `
      <section class="page-banner">
        <h1>Contact Us</h1>
        <p>We would love to hear from you.</p>
      </section>

      <section class="content-panel">
        <form id="contact-form">

          <label>
            Name
            <input name="name" required maxlength="100">
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              required
              maxlength="254"
            >
          </label>

          <label>
            Subject
            <input name="subject" required maxlength="120">
          </label>

          <label>
            Message
            <textarea
              name="message"
              required
              maxlength="3000"
            ></textarea>
          </label>

          <button class="btn purple">
            Send Message
          </button>

          <p class="form-status" role="status"></p>
        </form>
      </section>
    `
  };

  return pages[slug] || null;
}

module.exports = {
  escapeHTML,
  renderPrograms,
  renderPage
};


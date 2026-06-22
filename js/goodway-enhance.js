/*!
 * Goodway — UX enhancement layer
 * Skip link, sticky navbar, scroll progress, reveal-on-scroll, smooth parallax,
 * back-to-top, WhatsApp CTA, cookie banner, animated counters, FAQ accordion,
 * breadcrumbs, form validation + toast, mobile menu, reduced-motion-safe slider.
 */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = function () { return window.innerWidth < 768; };
  var doc = document;
  var WHATSAPP_NUMBER = '971564423539';
  var WHATSAPP_MSG = 'Hi Goodway, I found your website and would like to discuss a supply enquiry.';

  /* ---------- Image base path + cache-bust ----------------------------
     IMG_BASE — defaults to the current /assets/images/ origin. Override
     before enhance.js loads to repoint at a CDN:
        <script>window.GW_IMG_BASE = 'https://cdn.goodway.ae/assets/images/';</script>
     IMG_VER — one version string governs every image on the site. Bump
     after replacing any file under /images/ or /assets/images/ to force
     a one-shot refresh. Applies to <img src>, <img data-src>, and
     <source srcset> within <picture>. */
  var IMG_VER  = '2026-04-26-instrumentation-jpg';

  /* ---------- SEO / marketing hook-ups ---------------------------------
     Paste tokens here once the client registers each service. Empty
     string = feature is skipped. All three propagate to every page
     through the runtime head injector in Section 16b. */
  var GSC_TOKEN       = '36t07jrNiYb68Bt07pT2VXVxlrjoXxUwRDcISDroaAI';    // Google Search Console "HTML tag" method — paste the content="..." value
  var GA_MEASUREMENT_ID = 'G-B3R0T45EM2';  // Google Analytics 4, format "G-XXXXXXXX"
  var GTM_ID          = '';    // Google Tag Manager, format "GTM-XXXXXX" (optional — only if using GTM instead of GA4 direct)

  /* Where the lead-capture POST goes. Leave empty to skip server capture
     and fall straight back to `mailto:` (useful on the static-only
     preview). In production point this at the Node server, eg:
       window.GW_LEAD_ENDPOINT = 'https://admin.goodway.ae/api/leads';
     A same-origin default is tried first if nothing is configured. */
  var LEAD_ENDPOINT = window.GW_LEAD_ENDPOINT || '/api/leads';
  var IMG_BASE = window.GW_IMG_BASE || null;   // null means "use existing path as-is"
  window.GW_IMG_VER = IMG_VER;

  /* Detect relative depth for pages in /divisions/, /office-supplies/ etc.
     so `data-src="hero/foo.jpg"` resolves to "../assets/images/hero/foo.jpg". */
  var DEPTH_PREFIX = (function () {
    var p = location.pathname.replace(/^\//, '');
    var slashes = (p.match(/\//g) || []).length;
    return slashes > 0 ? '../'.repeat(slashes) : '';
  })();

  function bust(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url) && url.indexOf(location.hostname) === -1) return url;
    var clean = url.split('?')[0];
    return clean + '?v=' + IMG_VER;
  }

  /* Broader selector — picks up logo + /images/ + /assets/images/ +
     relative variants (../images/, ../assets/images/) used on sub-folder pages. */
  doc.querySelectorAll(
    'img[src*="goodway-logo.png"],' +
    'img[src*="/images/"],' +
    'img[src*="/assets/images/"],' +
    'img[src^="images/"],' +
    'img[src^="assets/images/"],' +
    'img[src^="../images/"],' +
    'img[src^="../assets/images/"]'
  ).forEach(function (img) {
    if (img.src.indexOf('?v=') === -1) img.src = bust(img.src);
  });
  doc.querySelectorAll('picture source[srcset]').forEach(function (s) {
    if (s.srcset.indexOf('?v=') === -1) {
      s.srcset = s.srcset.split(',').map(function (piece) {
        var parts = piece.trim().split(/\s+/);
        parts[0] = bust(parts[0]);
        return parts.join(' ');
      }).join(', ');
    }
  });

  /* ---------- <picture> helper ----------------------------------------
     Upgrade plain <img data-src="hero/foo.jpg" data-widths="800,1200,1600">
     into a full <picture> with AVIF + WebP + JPG fallback. Sizes attr is
     optional (defaults to 100vw). Run once on DOM ready; idempotent. */
  /* Resolve a data-src value to a usable base.
     - Absolute URL or "/..." → leave as-is.
     - CDN override set (IMG_BASE) → prefix with CDN.
     - Otherwise → prefix with DEPTH_PREFIX + "assets/images/". */
  function resolveDataSrc(raw) {
    if (!raw) return raw;
    if (/^https?:\/\//i.test(raw) || raw.charAt(0) === '/') return raw;
    if (IMG_BASE) return IMG_BASE.replace(/\/$/, '') + '/' + raw.replace(/^\//, '');
    return DEPTH_PREFIX + 'assets/images/' + raw.replace(/^\//, '');
  }

  function gwUpgradePicture(img) {
    var src = img.getAttribute('data-src');
    if (!src) return;
    src = resolveDataSrc(src);
    var extMatch = src.match(/\.(jpg|jpeg|png)$/i);
    if (!extMatch) { img.src = bust(src); img.removeAttribute('data-src'); return; }
    var basePath = src.slice(0, -extMatch[0].length);
    var ext = extMatch[1].toLowerCase() === 'png' ? 'png' : 'jpg';
    var widths = (img.getAttribute('data-widths') || '').split(',').map(function (w) { return w.trim(); }).filter(Boolean);
    var sizes = img.getAttribute('data-sizes') || (widths.length ? '(max-width:640px) 100vw, (max-width:1200px) 80vw, 1200px' : '');

    function srcset(format) {
      if (!widths.length) return bust(basePath + '.' + format);
      return widths.map(function (w) { return bust(basePath + '-' + w + '.' + format) + ' ' + w + 'w'; }).join(', ');
    }

    var picture = doc.createElement('picture');
    var avif = doc.createElement('source');
    avif.type = 'image/avif';
    avif.srcset = srcset('avif');
    if (sizes) avif.sizes = sizes;
    picture.appendChild(avif);

    var webp = doc.createElement('source');
    webp.type = 'image/webp';
    webp.srcset = srcset('webp');
    if (sizes) webp.sizes = sizes;
    picture.appendChild(webp);

    var fallback = img.cloneNode(false);
    fallback.removeAttribute('data-src');
    fallback.removeAttribute('data-widths');
    fallback.removeAttribute('data-sizes');
    fallback.src = widths.length ? bust(basePath + '-' + widths[Math.floor(widths.length / 2)] + '.' + ext) : bust(basePath + '.' + ext);
    if (!fallback.loading) fallback.loading = img.getAttribute('data-priority') === 'high' ? 'eager' : 'lazy';
    if (!fallback.decoding) fallback.decoding = 'async';
    if (img.getAttribute('data-priority') === 'high') fallback.setAttribute('fetchpriority', 'high');
    picture.appendChild(fallback);

    img.replaceWith(picture);
  }
  doc.querySelectorAll('img[data-src]').forEach(gwUpgradePicture);
  window.gwUpgradePicture = gwUpgradePicture;  // exposed for dynamic content

  /* ============================================================
     1. Skip link + <main> landmark
     ============================================================ */
  if (!doc.querySelector('.gw-skip-link')) {
    var skip = doc.createElement('a');
    skip.href = '#main';
    skip.className = 'gw-skip-link';
    skip.textContent = 'Skip to main content';
    doc.body.insertBefore(skip, doc.body.firstChild);
  }
  /* If no <main> exists (legacy pages), tag the first non-nav section */
  if (!doc.querySelector('main')) {
    var firstSection = doc.querySelector('section:not(.footer-section)');
    if (firstSection && !firstSection.id) firstSection.id = 'main';
  }

  /* ============================================================
     2. Scroll progress bar
     ============================================================ */
  var progressBar = doc.createElement('div');
  progressBar.className = 'gw-scroll-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  doc.body.appendChild(progressBar);

  /* ============================================================
     3. Sticky navbar state
     ============================================================ */
  var navbar = doc.querySelector('.navbar');

  /* ============================================================
     4. Navigation — mobile hamburger + Divisions dropdown.
     Replaces webflow.js + jQuery (~220KB) with ~60 lines of vanilla.
     Toggles the same .w--open class the CSS already targets, so no
     style changes needed — just the interaction plumbing.
     ============================================================ */
  (function gwNav() {
    var hamburger = doc.querySelector('.menu-button.w-nav-button');
    var navMenu   = doc.querySelector('.nav-menu.w-nav-menu');
    var dropdowns = doc.querySelectorAll('.w-dropdown');
    if (!hamburger && !dropdowns.length) return;

    function setMobileOpen(open) {
      if (!hamburger || !navMenu) return;
      hamburger.classList.toggle('w--open', open);
      navMenu.classList.toggle('w--open', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      doc.documentElement.style.overflow = (open && window.innerWidth < 992) ? 'hidden' : '';
    }

    function setDropdownOpen(dd, open) {
      dd.classList.toggle('w--open', open);
      var toggle = dd.querySelector('.w-dropdown-toggle');
      var list   = dd.querySelector('.w-dropdown-list');
      if (toggle) {
        toggle.classList.toggle('w--open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      if (list) list.classList.toggle('w--open', open);
    }

    function closeAllDropdowns(except) {
      dropdowns.forEach(function (dd) { if (dd !== except) setDropdownOpen(dd, false); });
    }

    /* Hamburger toggle */
    if (hamburger) {
      hamburger.setAttribute('role', 'button');
      hamburger.setAttribute('tabindex', '0');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-controls', 'main-nav-menu');
      if (navMenu) navMenu.id = navMenu.id || 'main-nav-menu';
      hamburger.addEventListener('click', function () {
        setMobileOpen(!hamburger.classList.contains('w--open'));
      });
      hamburger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setMobileOpen(!hamburger.classList.contains('w--open'));
        }
      });
    }

    /* Close the mobile panel when a link inside it is clicked */
    if (navMenu) {
      navMenu.addEventListener('click', function (e) {
        var link = e.target.closest('a.nav-link, a.w-dropdown-link, a.button-outline');
        if (!link) return;
        if (window.innerWidth < 992) setMobileOpen(false);
      });
    }

    /* Dropdown toggles — click-only (matches site's data-hover="false") */
    dropdowns.forEach(function (dd) {
      var toggle = dd.querySelector('.w-dropdown-toggle');
      if (!toggle) return;
      toggle.setAttribute('role', 'button');
      toggle.setAttribute('tabindex', '0');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-haspopup', 'true');
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var wasOpen = dd.classList.contains('w--open');
        closeAllDropdowns(dd);
        setDropdownOpen(dd, !wasOpen);
      });
      toggle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.click();
        }
      });
    });

    /* Click outside any open dropdown → close */
    doc.addEventListener('click', function (e) {
      if (!e.target.closest('.w-dropdown')) closeAllDropdowns(null);
    });

    /* Escape closes mobile panel + any open dropdown */
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeAllDropdowns(null);
      if (hamburger && hamburger.classList.contains('w--open')) {
        setMobileOpen(false);
        hamburger.focus();
      }
    });

    /* Resize to desktop while the mobile panel is open → unlock scroll */
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 992 && hamburger && hamburger.classList.contains('w--open')) {
        setMobileOpen(false);
      }
    });
  })();

  /* ============================================================
     5. Reveal-on-scroll
     Elements above the fold are revealed synchronously on the first
     frame — NO dependency on the IntersectionObserver callback, which
     previously caused a "content stays invisible until you scroll"
     bug on certain viewport heights where above-fold elements didn't
     cross the 8% threshold on the observer's first tick.
     Below-fold elements still get the gentle fade-in-up on scroll.
     ============================================================ */
  var revealSelectors = [
    '.hero-left-header','.hero-right','.benefit-description','.benefit-img','.benefit-item',
    '.services-header','.service-card','.gallery-title','.gallery-item','.gallery-right',
    '.testimonial-heading','.our-work-heading','.our-work-step','.faq-heading','.faq-card',
    '.cta-content','.cta-wrap a','.gw-coverage-card','.gw-principal-tile',
    '.gw-industry','.gw-brand-card','.gw-industries-hero__stats > *','.gw-sector-close'
  ];
  var revealTargets = doc.querySelectorAll(revealSelectors.join(','));
  var vh = window.innerHeight || doc.documentElement.clientHeight;

  revealTargets.forEach(function (el) {
    el.classList.add('gw-reveal');
    /* If already in viewport, reveal immediately — no fade, no
       transitionDelay, just show it so first paint is correct. */
    var r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) {
      el.classList.add('is-visible');
    }
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var parent = e.target.parentElement;
        var idx = parent ? Array.prototype.indexOf.call(parent.children, e.target) : 0;
        e.target.style.transitionDelay = Math.min(idx * 40, 240) + 'ms';
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px 0px 0px', threshold: 0 });
    revealTargets.forEach(function (el) {
      /* Only observe the ones still hidden — above-fold elements
         are already visible and don't need watching. */
      if (!el.classList.contains('is-visible')) io.observe(el);
    });
  } else {
    /* No IO support → reveal everything immediately, accept the
       trade-off of no scroll animation over broken content. */
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Belt-and-braces: if anything is still hidden 1.5 s after load
     (e.g. an element got a 0-height during hydration and the observer
     ignored it), force-reveal it. Prevents a stranded empty hero. */
  setTimeout(function () {
    revealTargets.forEach(function (el) {
      if (!el.classList.contains('is-visible')) el.classList.add('is-visible');
    });
  }, 1500);

  /* ============================================================
     6. Parallax (rAF + lerp)
     ============================================================ */
  var parallaxTargets = [
    { sel: '.hero-right .hero-image', speed: -0.15 },
    { sel: '.hero-card',              speed: -0.07 },
    { sel: '.benefit-img',            speed:  0.10 },
    { sel: '.gallery-right',          speed: -0.12 },
    { sel: '.gallery-left .gallery-item:nth-child(1)', speed: -0.06 },
    { sel: '.gallery-left .gallery-item:nth-child(2)', speed:  0.06 },
    { sel: '.gallery-left .gallery-item:nth-child(3)', speed: -0.06 },
    { sel: '.gallery-left .gallery-item:nth-child(4)', speed:  0.06 },
    { sel: '.testimonial-img',        speed: -0.08 },
    { sel: '.our-work-img-left',      speed:  0.10 },
    { sel: '.our-work-img-right',     speed: -0.10 }
  ];
  var parallaxItems = [];
  if (!prefersReducedMotion && !isMobile()) {
    parallaxTargets.forEach(function (t) {
      doc.querySelectorAll(t.sel).forEach(function (el) {
        el.classList.add('gw-parallax');
        parallaxItems.push({ el: el, speed: t.speed, current: 0, target: 0 });
      });
    });
  }
  var heroSection = doc.querySelector('.hero-section');
  var vh = window.innerHeight;
  var docH = Math.max(doc.documentElement.scrollHeight - window.innerHeight, 1);
  var lerp = 0.16;
  function measure() {
    vh = window.innerHeight;
    docH = Math.max(doc.documentElement.scrollHeight - window.innerHeight, 1);
  }
  function updateStatic() {
    var y = window.scrollY || window.pageYOffset;
    if (navbar) navbar.classList.toggle('is-scrolled', y > 8);
    progressBar.style.transform = 'scaleX(' + Math.min(Math.max(y / docH, 0), 1).toFixed(4) + ')';
    if (toTopBtn) toTopBtn.classList.toggle('is-visible', y > 400);
    if (heroSection && !prefersReducedMotion && !isMobile()) {
      var rect = heroSection.getBoundingClientRect();
      if (rect.bottom > -200 && rect.top < vh + 200) {
        heroSection.style.setProperty('--gw-hero-bg-y', Math.round(rect.top * -0.18) + 'px');
      }
    }
  }
  var ticking = false, rafRunning = false;
  function animate() {
    updateStatic();
    var moving = false;
    for (var i = 0; i < parallaxItems.length; i++) {
      var it = parallaxItems[i];
      var rect = it.el.getBoundingClientRect();
      if (rect.bottom < -300 || rect.top > vh + 300) it.target = 0;
      else it.target = ((rect.top + rect.height / 2) - vh / 2) * it.speed;
      var delta = it.target - it.current;
      if (Math.abs(delta) > 0.05) {
        it.current += delta * lerp;
        moving = true;
        it.el.style.transform = 'translate3d(0,' + it.current.toFixed(2) + 'px,0)';
      } else if (it.current !== it.target) {
        it.current = it.target;
        it.el.style.transform = 'translate3d(0,' + it.current.toFixed(2) + 'px,0)';
      }
    }
    if (moving || ticking) window.requestAnimationFrame(animate);
    else rafRunning = false;
  }
  function onScroll() {
    ticking = true;
    if (!rafRunning) {
      rafRunning = true;
      window.requestAnimationFrame(function () { ticking = false; animate(); });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
  window.addEventListener('load', function () { measure(); onScroll(); });
  measure();

  /* ============================================================
     7. Back-to-top button
     ============================================================ */
  var toTopBtn = doc.createElement('button');
  toTopBtn.type = 'button';
  toTopBtn.className = 'gw-to-top';
  toTopBtn.setAttribute('aria-label', 'Back to top');
  toTopBtn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
  toTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
  doc.body.appendChild(toTopBtn);

  /* ============================================================
     8. WhatsApp floating CTA
     ============================================================ */
  var waLink = doc.createElement('a');
  waLink.className = 'gw-whatsapp';
  waLink.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(WHATSAPP_MSG);
  waLink.target = '_blank';
  waLink.rel = 'noopener';
  waLink.setAttribute('aria-label', 'Chat with Goodway on WhatsApp');
  waLink.innerHTML = '<svg aria-hidden="true" viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9.37 3 4 8.37 4 15c0 2.38.7 4.6 1.9 6.47L4 29l7.7-1.87C13.5 28.33 14.74 29 16 29c6.63 0 12-5.37 12-12S22.63 3 16 3zm0 22c-1.16 0-2.3-.3-3.3-.86l-.24-.14-4.57 1.1 1.12-4.46-.16-.26A9.97 9.97 0 016 15c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.42-7.48c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.66.15s-.76.97-.93 1.17c-.17.2-.34.22-.64.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.47.13-.62.14-.14.3-.34.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.9-2.2-.24-.57-.48-.5-.66-.5h-.56c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.1 4.48.71.3 1.26.48 1.7.62.71.22 1.36.2 1.88.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg>';
  doc.body.appendChild(waLink);

  /* ============================================================
     9. Cookie consent banner
     ============================================================ */
  (function () {
    var KEY = 'gw-cookie-consent';
    if (localStorage.getItem(KEY)) return;
    var banner = doc.createElement('div');
    banner.className = 'gw-cookie';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.setAttribute('aria-describedby', 'gw-cookie-text');
    banner.innerHTML =
      '<div class="gw-cookie__text" id="gw-cookie-text">We use essential cookies for site functionality and anonymous analytics to improve our service. See our <a href="privacy.html">Privacy Policy</a>.</div>' +
      '<div class="gw-cookie__actions">' +
        '<button type="button" class="gw-cookie__btn gw-cookie__btn--ghost" data-choice="reject">Reject</button>' +
        '<button type="button" class="gw-cookie__btn gw-cookie__btn--primary" data-choice="accept">Accept</button>' +
      '</div>';
    doc.body.appendChild(banner);
    var rejectBtn = banner.querySelector('[data-choice="reject"]');
    var acceptBtn = banner.querySelector('[data-choice="accept"]');
    setTimeout(function () {
      banner.classList.add('is-visible');
      doc.body.classList.add('gw-cookie-visible');
      /* Move focus into the banner so keyboard / SR users land on it */
      if (acceptBtn) acceptBtn.focus();
    }, 400);

    function dismiss(choice) {
      localStorage.setItem(KEY, choice);
      banner.classList.remove('is-visible');
      doc.body.classList.remove('gw-cookie-visible');
      doc.removeEventListener('keydown', onKeydown, true);
      setTimeout(function () { banner.remove(); }, 300);
      if (choice === 'accept' && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
      }
    }

    /* Escape = reject (the privacy-preserving default); Tab is trapped
       between the two buttons so focus can't wander behind the dialog. */
    function onKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); dismiss('reject'); return; }
      if (e.key !== 'Tab') return;
      var first = rejectBtn, last = acceptBtn;
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    doc.addEventListener('keydown', onKeydown, true);

    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-choice]');
      if (!btn) return;
      dismiss(btn.dataset.choice);
    });
  })();

  /* ============================================================
     10. Animated number counters (hero numbers)
     ============================================================ */
  (function () {
    var counters = doc.querySelectorAll('.hero-number .h3-default.hero-number');
    if (!counters.length || prefersReducedMotion) return;
    counters.forEach(function (el) {
      var raw = (el.textContent || '').trim();
      var m = raw.match(/(\d+)(.*)$/);
      if (!m) return;
      var target = parseInt(m[1], 10);
      var suffix = m[2] || '';
      el.dataset.gwFinal = raw;
      el.classList.add('gw-counter');
      el.textContent = '0' + suffix;
      var observer = new IntersectionObserver(function (entries, self) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          self.unobserve(entry.target);
          var start = null;
          var duration = 1100;
          function step(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) window.requestAnimationFrame(step);
            else el.textContent = raw;
          }
          window.requestAnimationFrame(step);
        });
      }, { threshold: 0.6 });
      observer.observe(el);
    });
  })();

  /* ============================================================
     11. FAQ accordion
     ============================================================ */
  (function () {
    var cards = doc.querySelectorAll('.faq-card');
    if (!cards.length) return;
    cards.forEach(function (card, i) {
      var text = card.querySelector('.faq-text');
      if (!text) return;
      var body = text.querySelector('.paragraph');
      if (!body) return;
      /* Wrap the body paragraph in a collapsible region */
      var wrap = doc.createElement('div');
      wrap.className = 'faq-body';
      var bodyId = 'faq-body-' + (i + 1);
      wrap.id = bodyId;
      body.parentNode.insertBefore(wrap, body);
      wrap.appendChild(body);
      /* Promote the heading to a button-like element */
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-expanded', 'false');
      card.setAttribute('aria-controls', bodyId);
      function toggle() {
        var open = card.getAttribute('aria-expanded') === 'true';
        card.setAttribute('aria-expanded', open ? 'false' : 'true');
      }
      card.addEventListener('click', function (e) {
        if (e.target.closest('a')) return; /* don't toggle when clicking a link */
        toggle();
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  })();

  /* ============================================================
     12. Form validation + mailto fallback + success toast
     ============================================================ */
  var toast = doc.createElement('div');
  toast.className = 'gw-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  doc.body.appendChild(toast);
  function showToast(msg, kind) {
    toast.textContent = msg;
    toast.classList.remove('gw-toast--success', 'gw-toast--error');
    toast.classList.add(kind === 'error' ? 'gw-toast--error' : 'gw-toast--success');
    toast.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove('is-visible'); }, 4200);
  }

  function validateField(field) {
    var msg = '';
    if (field.hasAttribute('required') && !field.value.trim()) msg = 'This field is required.';
    else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) msg = 'Please enter a valid email.';
    else if (field.type === 'tel' && field.value && !/^[+\d][\d\s()-]{5,}$/.test(field.value)) msg = 'Please enter a valid phone.';
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var err = field.parentNode.querySelector('.gw-field-error');
    if (msg) {
      if (!err) {
        err = doc.createElement('span');
        err.className = 'gw-field-error';
        err.setAttribute('role', 'alert');
        field.parentNode.appendChild(err);
      }
      err.textContent = msg;
      if (!field.id) field.id = 'gw-fld-' + Math.random().toString(36).slice(2, 7);
      err.id = field.id + '-err';
      field.setAttribute('aria-describedby', err.id);
      return false;
    } else if (err) {
      err.remove();
      field.removeAttribute('aria-describedby');
    }
    return true;
  }

  doc.querySelectorAll('form.gw-form').forEach(function (form) {
    var fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { if (f.value) validateField(f); });
      f.addEventListener('input', function () {
        if (f.getAttribute('aria-invalid') === 'true') validateField(f);
      });
    });
    form.addEventListener('submit', function (e) {
      var ok = true;
      fields.forEach(function (f) { if (!validateField(f)) ok = false; });
      if (!ok) {
        e.preventDefault();
        showToast('Please correct the highlighted fields.', 'error');
        var firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      /* Let the mailto action proceed; show success toast */
      showToast('Opening your email app — your message is ready to send.', 'success');
    });
  });

  /* Newsletter form (footer) — posts to /api/catalogue if available, else mailto. */
  var newsletterForm = doc.getElementById('email-form');
  if (newsletterForm) {
    /* Inject honeypot */
    if (!newsletterForm.querySelector('input[name="website"]')) {
      var hp = doc.createElement('input');
      hp.type = 'text'; hp.name = 'website'; hp.tabIndex = -1; hp.autocomplete = 'off';
      hp.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden';
      hp.setAttribute('aria-hidden', 'true');
      newsletterForm.appendChild(hp);
    }
    var CATALOGUE_API = window.GW_CATALOGUE_API || '/api/catalogue';
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = newsletterForm.querySelector('input[type="email"]');
      var website = newsletterForm.querySelector('input[name="website"]');
      if (website && website.value) return; /* bot */
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        showToast('Please enter a valid email.', 'error');
        if (email) email.focus();
        return;
      }
      var payload = new URLSearchParams({ email: email.value });
      fetch(CATALOGUE_API, { method: 'POST', body: payload })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (data) {
          showToast(data.message || 'Thanks — we will email the catalogue shortly.', 'success');
          if (data.url) setTimeout(function () { window.open(data.url, '_blank', 'noopener'); }, 400);
          newsletterForm.reset();
        })
        .catch(function () {
          /* Fallback: open user's mail client */
          var mailto = 'mailto:info@goodway.ae?subject=' + encodeURIComponent('Catalogue Request') +
            '&body=' + encodeURIComponent('Please send the Goodway PDF catalogue to: ' + email.value);
          window.location.href = mailto;
          showToast('Opening your email app to request the catalogue.', 'success');
        });
      email.value = '';
    });
  }

  /* ============================================================
     Gated document download — modal + navbar/footer triggers
     ============================================================ */
  (function gwDocDownload() {
    var CATALOGUE_API = window.GW_CATALOGUE_API || '/api/catalogue';
    var DOC_LABELS = { 'company-profile': 'Company Profile', 'brochure': 'Brochure' };
    /* Public PDF served from the same origin as the page, so the download works
       with no backend. Override the base before enhance.js loads to use a CDN:
         <script>window.GW_DOC_BASE = 'https://cdn.goodway.ae/assets/';</script> */
    var DOC_BASE = window.GW_DOC_BASE || '/assets/';
    var DOC_FILES = {
      'company-profile': DOC_BASE + 'goodway-company-profile.pdf',
      'brochure':        DOC_BASE + 'goodway-brochure.pdf'
    };
    var lastTrigger = null;

    /* --- Build the modal once --- */
    function buildModal() {
      if (doc.getElementById('gw-docmodal')) return doc.getElementById('gw-docmodal');
      var wrap = doc.createElement('div');
      wrap.className = 'gw-docmodal';
      wrap.id = 'gw-docmodal';
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.setAttribute('aria-labelledby', 'gw-docmodal-title');
      wrap.hidden = true;
      wrap.innerHTML =
        '<div class="gw-docmodal__backdrop" data-gw-doc-close></div>' +
        '<div class="gw-docmodal__dialog">' +
          '<button type="button" class="gw-docmodal__close" data-gw-doc-close aria-label="Close">&times;</button>' +
          '<h2 class="gw-docmodal__title" id="gw-docmodal-title">Download our documents</h2>' +
          '<p class="gw-docmodal__lede">Tell us who you are and your document downloads straight away.</p>' +
          '<form class="gw-docmodal__form" novalidate>' +
            '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" ' +
              'style="position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden">' +
            '<div class="gw-docmodal__field"><label for="gw-doc-company">Company name</label>' +
              '<input id="gw-doc-company" name="company" type="text" autocomplete="organization" required></div>' +
            '<div class="gw-docmodal__field"><label for="gw-doc-email">Email</label>' +
              '<input id="gw-doc-email" name="email" type="email" autocomplete="email" required></div>' +
            '<div class="gw-docmodal__field"><label for="gw-doc-phone">Contact number</label>' +
              '<input id="gw-doc-phone" name="phone" type="tel" autocomplete="tel" required></div>' +
            '<fieldset class="gw-docmodal__choice"><legend>Which document?</legend>' +
              '<div class="gw-docmodal__choice-row">' +
                '<label><input type="radio" name="doc" value="company-profile" checked><span>Company Profile</span></label>' +
                '<label><input type="radio" name="doc" value="brochure"><span>Brochure</span></label>' +
              '</div></fieldset>' +
            '<p class="gw-docmodal__error" data-gw-doc-error role="alert"></p>' +
            '<button type="submit" class="gw-docmodal__submit">Download now</button>' +
          '</form>' +
        '</div>';
      doc.body.appendChild(wrap);
      wrap.addEventListener('click', function (e) {
        if (e.target.hasAttribute('data-gw-doc-close')) closeModal();
      });
      doc.addEventListener('keydown', function (e) {
        if (!wrap.hidden && e.key === 'Escape') closeModal();
        if (!wrap.hidden && e.key === 'Tab') trapFocus(e, wrap);
      });
      wireSubmit(wrap);
      return wrap;
    }

    function focusables(root) {
      return Array.prototype.slice.call(root.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(function (el) { return el.offsetParent !== null || el === doc.activeElement; });
    }

    function trapFocus(e, wrap) {
      var f = focusables(wrap.querySelector('.gw-docmodal__dialog'));
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function openModal(preferDoc, trigger) {
      var wrap = buildModal();
      lastTrigger = trigger || null;
      if (preferDoc && DOC_LABELS[preferDoc]) {
        var radio = wrap.querySelector('input[name="doc"][value="' + preferDoc + '"]');
        if (radio) radio.checked = true;
      }
      wrap.hidden = false;
      var firstField = wrap.querySelector('#gw-doc-company');
      if (firstField) firstField.focus();
    }

    function closeModal() {
      var wrap = doc.getElementById('gw-docmodal');
      if (!wrap) return;
      wrap.hidden = true;
      var err = wrap.querySelector('[data-gw-doc-error]');
      if (err) err.textContent = '';
      if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    }

    /* Force a download of a same-origin file via a synthetic <a download>. */
    function triggerDownload(url) {
      var a = doc.createElement('a');
      a.href = url;
      a.download = '';
      a.rel = 'noopener';
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
    }

    function wireSubmit(wrap) {
      var form = wrap.querySelector('.gw-docmodal__form');
      if (!form || form.__gwWired) return;
      form.__gwWired = true;
      var errEl = form.querySelector('[data-gw-doc-error]');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        errEl.textContent = '';
        var company = form.company.value.trim();
        var email = form.email.value.trim();
        var phone = form.phone.value.trim();
        var docVal = (form.querySelector('input[name="doc"]:checked') || {}).value || 'company-profile';
        if (form.website && form.website.value) return; /* bot */
        if (!company) { errEl.textContent = 'Please enter your company name.'; form.company.focus(); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errEl.textContent = 'Please enter a valid email.'; form.email.focus(); return; }
        if (phone.replace(/[^0-9]/g, '').length < 6) { errEl.textContent = 'Please enter a valid contact number.'; form.phone.focus(); return; }

        var label = DOC_LABELS[docVal] || 'document';
        var fileUrl = DOC_FILES[docVal] || DOC_FILES['company-profile'];

        /* Capture the lead in the background — best-effort, never blocks the
           download. Works when the Node server is reachable; silently ignored
           otherwise (the document still downloads). */
        var payload = new URLSearchParams({ company: company, email: email, phone: phone, doc: docVal });
        try { fetch(CATALOGUE_API, { method: 'POST', body: payload, keepalive: true }).catch(function () {}); } catch (e) {}

        /* Deliver the document straight away. A HEAD check lets us show a
           friendly message if the PDF hasn't been uploaded yet, instead of a
           broken link. If HEAD itself is blocked (e.g. opened via file://),
           just attempt the download. */
        function ok() { if (typeof showToast === 'function') showToast('Thanks — your ' + label + ' is downloading.', 'success'); }
        fetch(fileUrl, { method: 'HEAD' })
          .then(function (r) {
            if (r.ok) { triggerDownload(fileUrl); ok(); }
            else if (typeof showToast === 'function') { showToast('Thanks — we will email your ' + label + ' shortly.', 'success'); }
          })
          .catch(function () { triggerDownload(fileUrl); ok(); });

        form.reset();
        closeModal();
      });
    }

    /* --- Trigger 1: navbar link --- */
    var navHost = doc.querySelector('.nav-menu .nav-menu-item');
    if (navHost && !navHost.querySelector('[data-gw-doc-trigger]')) {
      var navLink = doc.createElement('a');
      navLink.href = '#';
      navLink.className = 'nav-link w-nav-link';
      navLink.textContent = 'Company Profile';
      navLink.setAttribute('data-gw-doc-trigger', 'company-profile');
      navHost.appendChild(navLink);
    }

    /* --- Trigger 2: replace the footer "Request Catalogue" box --- */
    var footerForm = doc.getElementById('email-form');
    if (footerForm) {
      var cta = doc.createElement('button');
      cta.type = 'button';
      cta.className = 'gw-doc-cta';
      cta.textContent = 'Download Brochure / Company Profile';
      cta.setAttribute('data-gw-doc-trigger', 'company-profile');
      footerForm.parentNode.replaceChild(cta, footerForm);
    }

    /* --- Delegated open handler for any trigger --- */
    doc.addEventListener('click', function (e) {
      var t = e.target.closest('[data-gw-doc-trigger]');
      if (!t) return;
      e.preventDefault();
      openModal(t.getAttribute('data-gw-doc-trigger'), t);
    });

    window.__gwOpenDocModal = openModal; /* exposed for manual testing */
  })();

  /* ============================================================
     13. Breadcrumbs — auto-injected on division pages
     ============================================================ */
  (function () {
    var path = window.location.pathname;
    var isDivision = /\/divisions\//.test(path);
    if (!isDivision) return;
    var main = doc.querySelector('main') || doc.querySelector('section.hero-section');
    if (!main) return;
    /* Don't inject if one already exists */
    if (doc.querySelector('.gw-breadcrumb')) return;
    var slug = path.split('/').pop().replace('.html', '');
    var label = doc.querySelector('.hero-label');
    var labelText = label ? label.textContent.trim() : slug.replace(/-/g, ' ');
    var nav = doc.createElement('nav');
    nav.className = 'gw-breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.innerHTML =
      '<ol>' +
        '<li><a href="../index.html">Home</a></li>' +
        '<li><a href="../services.html">What We Do</a></li>' +
        '<li aria-current="page">' + labelText + '</li>' +
      '</ol>';
    main.parentNode.insertBefore(nav, main);
  })();

  /* ============================================================
     14. Testimonial slider — respect reduced motion
     ============================================================ */
  if (prefersReducedMotion) {
    var slider = doc.querySelector('.testimonial-slide.w-slider');
    if (slider) {
      slider.setAttribute('data-autoplay', 'false');
      slider.setAttribute('data-infinite', 'false');
    }
  }

  /* ============================================================
     15. Highlight active link in footer Quick Links
     ============================================================ */
  (function () {
    var here = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    doc.querySelectorAll('.footer-link').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
      if (href && href === here) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  })();

  /* ============================================================
     16. Google Analytics 4 — consent-gated auto-loader
     ------------------------------------------------------------
     PASTE THE MEASUREMENT ID BELOW when ready.
     Format: "G-XXXXXXXXXX"  (or leave empty to disable GA entirely)

     Example:  var GA_MEASUREMENT_ID = "G-AB12CD34EF";

     Behaviour:
       • If ID is empty → no network requests, nothing loaded.
       • If ID is set   → gtag.js loads ONLY after the cookie
                          banner "Accept" is clicked.
       • Default consent = "denied" — GDPR / UAE PDPL compliant.
       • Page-view fires automatically on consent grant + SPA route
         changes (for future PWA navigation).
     ============================================================ */
  /* GA_MEASUREMENT_ID is declared once at the top of the file (line ~30).
     The GA4 bootstrap below reads that outer-scope constant. */

  (function gwGA4() {
    /* Bootstrap the gtag queue even before the script loads.
       gwAnalytics() calls made early in the page will queue and
       flush once gtag arrives. */
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

    /* Default consent to DENIED so no cookies/pings before the user
       accepts the banner. This is the Google Consent Mode v2 pattern. */
    window.gtag('consent', 'default', {
      ad_storage:            'denied',
      ad_user_data:          'denied',
      ad_personalization:    'denied',
      analytics_storage:     'denied',
      functionality_storage: 'granted',
      security_storage:      'granted',
      wait_for_update:       500
    });
    window.gtag('js', new Date());

    function loadGA() {
      if (!GA_MEASUREMENT_ID) return;
      if (doc.querySelector('script[data-gw-ga]')) return;  // idempotent
      var s = doc.createElement('script');
      s.async = true;
      s.setAttribute('data-gw-ga', '');
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
      doc.head.appendChild(s);
      window.gtag('config', GA_MEASUREMENT_ID, {
        anonymize_ip: true,
        send_page_view: true
      });
    }

    function grantAndLoad() {
      window.gtag('consent', 'update', {
        ad_storage:         'granted',
        ad_user_data:       'granted',
        ad_personalization: 'granted',
        analytics_storage:  'granted'
      });
      loadGA();
    }

    /* If the user has previously accepted, load immediately. */
    if (localStorage.getItem('gw-cookie-consent') === 'accept') grantAndLoad();

    /* Watch for future acceptance via the existing cookie banner. */
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-choice="accept"]');
      if (btn) setTimeout(grantAndLoad, 100);
    });
  })();

  /* Public helper: gwAnalytics('event_name', { key: value }) */
  window.gwAnalytics = window.gwAnalytics || function (name, params) {
    if (localStorage.getItem('gw-cookie-consent') !== 'accept') return;
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  };

  /* ============================================================
     15b. Canonical reachability fix for local dev
     During local dev (127.0.0.1 / localhost / live-server ports),
     rewrite the canonical to point at the current origin so audit
     tools (SEOquake / SemRush / Lighthouse) can reach it. On the
     production domain goodway.ae this is a no-op and the static
     canonical in the HTML head remains authoritative.
     ============================================================ */
  (function gwCanonicalDev() {
    var host = location.hostname;
    var isLocal = !host || host === 'localhost' || /^127\./.test(host) || /\.local$/.test(host) || host === '';
    if (!isLocal) return;
    var canonical = doc.querySelector('link[rel="canonical"]');
    if (!canonical) return;
    var href = canonical.getAttribute('href') || '';
    /* Only rewrite if it points at the production domain */
    if (!/^https:\/\/goodway\.ae\//.test(href)) return;
    var pagePath = href.replace(/^https:\/\/goodway\.ae/, '');
    canonical.setAttribute('href', location.origin + pagePath);
  })();

  /* ============================================================
     0. INTRO OVERLAY — REMOVED (2026-04-24)
     The animated logo-reveal was responsible for recurring black /
     navy viewport bugs on mobile (pre-boot guard + lock classes +
     body-reveal opacity rules + fixed-position overlay = too many
     moving parts that occasionally stuck). Clearing any stale state
     from prior sessions so the site renders directly.
     ============================================================ */
  (function gwIntroPurge() {
    var h = doc.documentElement;
    h.classList.remove('gw-intro-lock');
    h.classList.remove('gw-intro-pending');
    h.classList.remove('gw-intro-done');
    /* Strip any overlay / scroll-cue left over in DOM by bfcache or
       a half-applied earlier build */
    var stuck = doc.querySelector('.gw-intro');
    if (stuck && stuck.parentNode) stuck.parentNode.removeChild(stuck);
    document.querySelectorAll('.gw-scroll-cue').forEach(function (c) {
      if (c.parentNode) c.parentNode.removeChild(c);
    });
  })();

  /* ============================================================
     Count-up — animates numeric stats on first visibility.
     Targets: .hero-numbers .h3-default, .gw-facts__num,
     .gw-division-hero__num — anything numeric. Non-numeric
     tokens (e.g. "NFPA 80", "HV / MV", "Ex") are left alone.
     ============================================================ */
  (function gwCountUp() {
    if (prefersReducedMotion) return;
    var selectors = [
      '.hero-numbers .h3-default',
      '.gw-facts__num',
      '.gw-division-hero__num',
      '.gw-coverage__num[data-gw-count]'   /* About-page milestones */
    ];
    var targets = doc.querySelectorAll(selectors.join(','));
    if (!targets.length) return;

    function parseNum(txt) {
      /* Pull the first numeric token; keep prefix/suffix around it. */
      var m = txt.match(/([^\d]*)(\d+(?:[.,]\d+)?)(.*)$/);
      if (!m) return null;
      return { pre: m[1], val: parseFloat(m[2].replace(',', '')), suf: m[3], raw: txt };
    }
    function format(val, orig) {
      /* Preserve integer-ness of the target */
      var intTarget = Number.isInteger(orig);
      return intTarget ? Math.round(val).toLocaleString('en-US') : val.toFixed(1);
    }
    function animate(el, parts) {
      var dur = 1100;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
        var current = parts.val * eased;
        el.textContent = parts.pre + format(current, parts.val) + parts.suf;
        if (p < 1) window.requestAnimationFrame(step);
        else el.textContent = parts.raw; /* final = original, preserves any special glyphs */
      }
      window.requestAnimationFrame(step);
    }
    var io = ('IntersectionObserver' in window)
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            io.unobserve(entry.target);
            var parts = parseNum((entry.target.textContent || '').trim());
            if (parts && parts.val > 0) animate(entry.target, parts);
          });
        }, { threshold: 0.5 })
      : null;
    targets.forEach(function (t) {
      if (io) io.observe(t);
      else {
        var parts = parseNum((t.textContent || '').trim());
        if (parts && parts.val > 0) animate(t, parts);
      }
    });
  })();

  /* ============================================================
     16a. Home-link injector — prepends a "Home" link to the primary
     nav on every page. Idempotent. Marks the link as current on the
     homepage itself. Runs before schema/breadcrumb so all downstream
     code sees the canonical nav.
     ============================================================ */
  (function gwHomeLink() {
    var list = doc.querySelector('.navbar .nav-menu-item');
    if (!list) return;
    if (list.querySelector('a[data-gw-home]')) return; // idempotent

    /* Depth-aware home href */
    var p = location.pathname.replace(/^\//, '').split('/');
    var depth = p.length > 1 ? '../'.repeat(p.length - 1) : '';
    var homeHref = depth + 'index.html';
    var isHome = /(^\/?$)|(^\/?index\.html$)/i.test(location.pathname);

    var a = doc.createElement('a');
    a.href = homeHref;
    a.className = 'nav-link w-nav-link' + (isHome ? ' w--current' : '');
    a.textContent = 'Home';
    a.setAttribute('data-gw-home', '');
    if (isHome) a.setAttribute('aria-current', 'page');
    list.insertBefore(a, list.firstChild);

    /* Team + Journal live in the footer only — not in the primary nav.
       Primary nav stays lean: Home · About · What We Do · Divisions · Principals · Industries · Contact. */
  })();

  /* ============================================================
     16b. Favicon / search-engine icon chain enricher
     Ensures every page carries the full icon set even without
     per-page HTML edits. Runs before the schema injector so
     Organization.logo refers to a valid image.
     ============================================================ */
  (function gwFavicons() {
    var depth = (function () {
      var p = location.pathname.replace(/^\//, '').split('/');
      return p.length > 1 ? '../'.repeat(p.length - 1) : '';
    })();
    var FAV  = depth + 'images/favicon/';
    var IMG  = depth + 'images/';
    var ICO  = IMG + 'favicon.ico';
    var MASK = FAV + 'safari-pinned-tab.svg';
    var MANIFEST = depth + 'site.webmanifest';
    var BROWSERCONFIG = depth + 'browserconfig.xml';

    function ensureLink(opts) {
      var sel = 'link[rel="' + opts.rel + '"]';
      if (opts.sizes) sel += '[sizes="' + opts.sizes + '"]';
      if (doc.head.querySelector(sel)) return;
      var l = doc.createElement('link');
      Object.keys(opts).forEach(function (k) { l.setAttribute(k, opts[k]); });
      doc.head.appendChild(l);
    }
    function ensureMeta(name, content, attr) {
      attr = attr || 'name';
      if (doc.head.querySelector('meta[' + attr + '="' + name + '"]')) return;
      var m = doc.createElement('meta');
      m.setAttribute(attr, name);
      m.setAttribute('content', content);
      doc.head.appendChild(m);
    }

    /* Classic favicon.ico (16/32/48 multi-resolution) */
    ensureLink({ rel: 'shortcut icon', type: 'image/x-icon', href: ICO });

    /* Standard PNG favicons — browsers pick the best match by size */
    ensureLink({ rel: 'icon', type: 'image/png', sizes: '16x16',   href: FAV + 'favicon-16x16.png' });
    ensureLink({ rel: 'icon', type: 'image/png', sizes: '32x32',   href: FAV + 'favicon-32x32.png' });
    ensureLink({ rel: 'icon', type: 'image/png', sizes: '48x48',   href: FAV + 'favicon-48x48.png' });
    ensureLink({ rel: 'icon', type: 'image/png', sizes: '96x96',   href: FAV + 'favicon-96x96.png' });
    ensureLink({ rel: 'icon', type: 'image/png', sizes: '192x192', href: FAV + 'android-chrome-192x192.png' });

    /* iOS home screen icons — properly scaled for every device model */
    ensureLink({ rel: 'apple-touch-icon', sizes: '57x57',   href: FAV + 'apple-touch-icon-57x57.png' });
    ensureLink({ rel: 'apple-touch-icon', sizes: '60x60',   href: FAV + 'apple-touch-icon-60x60.png' });
    ensureLink({ rel: 'apple-touch-icon', sizes: '72x72',   href: FAV + 'apple-touch-icon-72x72.png' });
    ensureLink({ rel: 'apple-touch-icon', sizes: '76x76',   href: FAV + 'apple-touch-icon-76x76.png' });
    ensureLink({ rel: 'apple-touch-icon', sizes: '114x114', href: FAV + 'apple-touch-icon-114x114.png' });
    ensureLink({ rel: 'apple-touch-icon', sizes: '120x120', href: FAV + 'apple-touch-icon-120x120.png' });
    ensureLink({ rel: 'apple-touch-icon', sizes: '144x144', href: FAV + 'apple-touch-icon-144x144.png' });
    ensureLink({ rel: 'apple-touch-icon', sizes: '152x152', href: FAV + 'apple-touch-icon-152x152.png' });
    ensureLink({ rel: 'apple-touch-icon', sizes: '167x167', href: FAV + 'apple-touch-icon-167x167.png' });
    ensureLink({ rel: 'apple-touch-icon', sizes: '180x180', href: FAV + 'apple-touch-icon-180x180.png' });

    /* Safari pinned tab (monochrome SVG mask) */
    ensureLink({ rel: 'mask-icon', href: MASK, color: '#0e1a2b' });

    /* PWA manifest */
    ensureLink({ rel: 'manifest', href: MANIFEST });

    /* Microsoft tiles (Windows Start / Edge pinned) */
    ensureMeta('msapplication-TileColor', '#0e1a2b');
    ensureMeta('msapplication-TileImage', FAV + 'mstile-150x150.png');
    ensureMeta('msapplication-config',    BROWSERCONFIG);
    ensureMeta('application-name',        'Goodway');
    ensureMeta('apple-mobile-web-app-title',         'Goodway');
    ensureMeta('apple-mobile-web-app-capable',       'yes');
    ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    ensureMeta('mobile-web-app-capable',  'yes');
    ensureMeta('format-detection',        'telephone=no');

    /* Theme color (already in static head on most pages; ensure present) */
    ensureMeta('theme-color', '#0e1a2b');
    /* Dark / light variants — optional but respected by modern browsers */
    if (!doc.head.querySelector('meta[name="theme-color"][media]')) {
      var tcLight = doc.createElement('meta');
      tcLight.setAttribute('name', 'theme-color');
      tcLight.setAttribute('media', '(prefers-color-scheme: light)');
      tcLight.setAttribute('content', '#faf6ec');
      doc.head.appendChild(tcLight);
      var tcDark = doc.createElement('meta');
      tcDark.setAttribute('name', 'theme-color');
      tcDark.setAttribute('media', '(prefers-color-scheme: dark)');
      tcDark.setAttribute('content', '#0e1a2b');
      doc.head.appendChild(tcDark);
    }

    /* ------------------------------------------------------------
       Upgrade og:image to the proper 1200×630 share card on every
       page. The static <meta og:image> points to the 516×484 logo,
       which social platforms (LinkedIn, Twitter, WhatsApp) render
       awkwardly. Swap to the dedicated share card if present.
       ------------------------------------------------------------ */
    var SHARE_CARD = 'https://goodway.ae/images/favicon/og-image-1200x630.png';
    var ogImg = doc.head.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.setAttribute('content', SHARE_CARD);
    else       ensureMeta('og:image', SHARE_CARD, 'property');
    /* Dimensions let Facebook/LinkedIn avoid a probe request */
    ensureMeta('og:image:width',  '1200', 'property');
    ensureMeta('og:image:height', '630',  'property');
    ensureMeta('og:image:alt',    'Good Way General Trading — authorised UAE distributor', 'property');
    /* Twitter large-card image alongside og:image */
    ensureMeta('twitter:image',   SHARE_CARD);
    ensureMeta('twitter:image:alt', 'Good Way General Trading — authorised UAE distributor');

    /* ------------------------------------------------------------
       og:url — mirror the page's canonical so shares resolve to the
       right URL variant. Always emit the PRODUCTION url even on dev,
       where gwCanonicalDev() has rewritten the canonical to the local
       origin: map localhost / 127.x back to https://goodway.ae.
       ------------------------------------------------------------ */
    var canonEl = doc.head.querySelector('link[rel="canonical"]');
    var pageUrl = canonEl ? (canonEl.getAttribute('href') || '') : '';
    pageUrl = pageUrl.replace(/^https?:\/\/(?:localhost|127\.[\d.]+)(?::\d+)?/, 'https://goodway.ae');
    if (pageUrl) {
      var ogUrl = doc.head.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', pageUrl);
      else       ensureMeta('og:url', pageUrl, 'property');
    }

    /* ------------------------------------------------------------
       Google Search Console verification — reads from the GSC_TOKEN
       constant at the top of this file. Once the client pastes the
       token there, the meta is injected on every page automatically.
       Empty string = no meta (GSC ignores empty values cleanly).
       ------------------------------------------------------------ */
    if (GSC_TOKEN && GSC_TOKEN.length > 8) {
      ensureMeta('google-site-verification', GSC_TOKEN);
    }
  })();

  /* ============================================================
     16c. Flip-card back faces — homepage Product Divisions grid
     Content lives here (not in HTML) so updating a fact in one
     place cascades to the whole grid. Each row maps a division's
     href to its back-face data.
     ============================================================ */
  (function gwDivisionFlip() {
    var grid = doc.querySelector('.services-section .gw-flip');
    if (!grid) return;

    var DATA = {
      'divisions/scientific-lab.html': {
        eyebrow: 'Division · 01',
        title: 'Scientific & Lab Instrumentation',
        facts: [
          'Fisher Scientific · Merck · WIKA',
          '15+ OEMs for measurement & analyzers',
          'Calibration-grade, ISO traceable',
          'Lead time · 2–8 weeks'
        ]
      },
      'divisions/mechanical.html': {
        eyebrow: 'Division · 02',
        title: 'Mechanical Items',
        facts: [
          'Caterpillar · Komatsu earth-moving spares',
          '50+ compressor OEMs supported',
          'Valves, flanges, bolts, lifting gear',
          'Lead time · 1–6 weeks'
        ]
      },
      'divisions/electrical.html': {
        eyebrow: 'Division · 03',
        title: 'Electrical',
        facts: [
          'ABB · Siemens · Westinghouse · WEG',
          '8 switchgear & control OEMs',
          'HV & MV motor supply',
          'Industrial cabling & wiring (Lütze)'
        ]
      },
      'divisions/instrumentation.html': {
        eyebrow: 'Division · 04',
        title: 'Instrumentation & Meteorological',
        facts: [
          'Efftec (AU) · ATMI (FR)',
          '5+ meteorological instrument classes',
          'Environmental-grade sensors',
          'Lead time · 3–8 weeks'
        ]
      },
      'divisions/building-material.html': {
        eyebrow: 'Division · 05',
        title: 'Building Material',
        facts: [
          'UAE Civil Defense approved',
          'NFPA 80 tested fire doors',
          '20 / 18 / 16 ga steel · ½–2 h rated',
          'Lead time · 4–8 weeks'
        ]
      },
      'divisions/chemicals-power.html': {
        eyebrow: 'Division · 06',
        title: 'Chemicals & Power Solutions',
        facts: [
          'AEES · Yuasa',
          'DC/AC power supplies & emergency lighting',
          'Sealed lead-acid standby batteries',
          'Authorised UAE distributor since 2014'
        ]
      },
      'divisions/heavy-equipment.html': {
        eyebrow: 'Division · 07',
        title: 'Heavy Equipment & Spares',
        facts: [
          'Caterpillar · Komatsu OEM spares',
          '55+ compressor OEMs (Atlas Copco, Sulzer)',
          'New & refurbished machines',
          'Lead time · 2–10 weeks'
        ]
      },
      'divisions/road-safety.html': {
        eyebrow: 'Division · 08',
        title: 'Road & Industrial Safety',
        facts: [
          'McMaster-Carr · UAE fabricators',
          '15+ SKU families · PPE & fall-arrest',
          'Barriers, cones, reflective workwear',
          'Lead time · 1–4 weeks'
        ]
      },
      'divisions/office-equipment.html': {
        eyebrow: 'Division · 09',
        title: 'Office Equipment & Stationery',
        facts: [
          '20,000+ SKUs across every category',
          '23 global brands: Brother, Leitz, 3M, Rexel',
          'Professional printing services',
          'Lead time · 1–3 weeks'
        ]
      }
    };

    grid.querySelectorAll('a[class*="link-block"]').forEach(function (anchor) {
      var href = (anchor.getAttribute('href') || '').split('?')[0].split('#')[0];
      var entry = DATA[href];
      if (!entry) return;
      if (anchor.querySelector('.gw-flip__back')) return;  // idempotent

      var back = doc.createElement('div');
      back.className = 'gw-flip__back';
      back.setAttribute('aria-hidden', 'true');
      back.innerHTML =
        '<div class="gw-flip__back-eyebrow">' + entry.eyebrow + '</div>' +
        '<h3 class="gw-flip__back-title">' + entry.title + '</h3>' +
        '<ul class="gw-flip__back-list">' +
          entry.facts.map(function (f) { return '<li>' + f + '</li>'; }).join('') +
        '</ul>' +
        '<span class="gw-flip__back-cta">See full division</span>';
      anchor.appendChild(back);

      /* Touch/keyboard flip toggle — for devices without :hover */
      anchor.addEventListener('click', function (e) {
        /* On coarse pointers the first tap flips, the second follows the link */
        if (matchMedia('(hover: none)').matches && !anchor.classList.contains('is-flipped')) {
          e.preventDefault();
          /* Close any other flipped card in the grid */
          grid.querySelectorAll('.is-flipped').forEach(function (x) { x.classList.remove('is-flipped'); });
          anchor.classList.add('is-flipped');
        }
      });

      anchor.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!anchor.classList.contains('is-flipped')) {
            e.preventDefault();
            anchor.classList.add('is-flipped');
          }
        } else if (e.key === 'Escape') {
          anchor.classList.remove('is-flipped');
        }
      });
    });
  })();

  /* ============================================================
     17. SEO / AEO / AIO — runtime schema injector
     Every page gets Organization + LocalBusiness + BreadcrumbList.
     Division pages also get Service schema derived from the
     .gw-division-hero content. Injecting at runtime means we don't
     have to edit 20 HTML files for each new schema update.
     ============================================================ */
  (function gwSchema() {
    var ORG_ID = 'https://goodway.ae/#organization';
    var LOC_ID = 'https://goodway.ae/#business';
    var BASE   = 'https://goodway.ae';

    function addJsonLd(obj) {
      var s = doc.createElement('script');
      s.type = 'application/ld+json';
      s.text = JSON.stringify(obj);
      doc.head.appendChild(s);
    }

    var hasOrg = !![].slice.call(doc.querySelectorAll('script[type="application/ld+json"]'))
      .find(function (s) { return (s.textContent || '').indexOf('"@id":"' + ORG_ID + '"') !== -1; });

    if (!hasOrg) {
      addJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization', '@id': ORG_ID,
            name: 'Good Way General Trading', alternateName: 'Goodway',
            url: BASE + '/', logo: BASE + '/images/goodway-logo.png',
            email: 'info@goodway.ae',
            telephone: '+971564423539',
            vatID: '100464283900003', taxID: 'CN-1843054',
            foundingDate: '2014',
            address: { '@type': 'PostalAddress', streetAddress: 'Office No. B33, Al Sarab Commercial Centre, Mussafah Industrial Area, M-14', addressLocality: 'Abu Dhabi', addressRegion: 'Abu Dhabi', postalCode: '10422', addressCountry: 'AE' },
            areaServed: { '@type': 'Country', name: 'United Arab Emirates' }
          },
          {
            '@type': 'LocalBusiness', '@id': LOC_ID,
            name: 'Good Way General Trading', image: BASE + '/images/goodway-logo.png',
            url: BASE + '/', telephone: '+971564423539', email: 'info@goodway.ae',
            priceRange: '$$',
            address: { '@type': 'PostalAddress', streetAddress: 'Office No. B33, Al Sarab Commercial Centre, Mussafah Industrial Area, M-14', postOfficeBoxNumber: '10422', addressLocality: 'Abu Dhabi', addressRegion: 'Abu Dhabi', addressCountry: 'AE' },
            openingHours: 'Mo-Sa 08:00-17:00'
          }
        ]
      });
    }

    /* BreadcrumbList — derived from URL path */
    var parts = location.pathname.replace(/^\//, '').replace(/\.html$/, '').split('/').filter(Boolean);
    if (parts.length) {
      var crumbs = [{ '@type': 'ListItem', position: 1, name: 'Home', item: BASE + '/' }];
      var acc = '';
      parts.forEach(function (seg, i) {
        acc += '/' + seg;
        crumbs.push({
          '@type': 'ListItem', position: i + 2,
          name: seg.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
          item: BASE + acc + (i === parts.length - 1 ? '.html' : '')
        });
      });
      addJsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs });
    }

    /* Division pages → Service schema */
    if (doc.body.classList.contains('gw-division')) {
      var titleEl = doc.querySelector('.gw-division-hero__title');
      var ledeEl  = doc.querySelector('.gw-division-hero__lede');
      if (titleEl && ledeEl) {
        addJsonLd({
          '@context': 'https://schema.org', '@type': 'Service',
          name: titleEl.textContent.trim().replace(/\s+/g, ' '),
          description: ledeEl.textContent.trim().replace(/\s+/g, ' '),
          provider: { '@id': ORG_ID },
          areaServed: { '@type': 'Country', name: 'United Arab Emirates' },
          url: BASE + location.pathname
        });
      }
    }

    /* FAQ page → FAQPage schema auto-built from existing .faq-card elements */
    var faqCards = doc.querySelectorAll('.faq-card');
    if (faqCards.length >= 2) {
      var qs = [];
      faqCards.forEach(function (card) {
        var q = card.querySelector('.h6-default, h3, h4');
        var a = card.querySelector('.faq-answer, .faq-body .paragraph, .faq-text .paragraph');
        if (q && a) {
          qs.push({
            '@type': 'Question', name: q.textContent.trim(),
            acceptedAnswer: { '@type': 'Answer', text: a.textContent.trim().replace(/\s+/g, ' ') }
          });
        }
      });
      if (qs.length) addJsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qs });
    }
  })();

  /* ============================================================
     18. Visible breadcrumbs injector — extends the existing
     division-only breadcrumb to ALL inner pages (about, services,
     principals, industries, contact, quote, privacy, terms).
     ============================================================ */
  (function gwInnerBreadcrumbs() {
    var path = location.pathname;
    if (path === '/' || /\/index\.html$/.test(path)) return;
    if (doc.querySelector('.gw-breadcrumb')) return; // already present
    var main = doc.querySelector('main') || doc.querySelector('section.hero-section');
    if (!main) return;
    var slug = path.split('/').pop().replace('.html', '');
    var label = doc.querySelector('.hero-label');
    var labelText = label ? label.textContent.trim() : slug.replace(/-/g, ' ');
    var nav = doc.createElement('nav');
    nav.className = 'gw-breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.innerHTML = '<ol><li><a href="/index.html">Home</a></li><li aria-current="page">' + labelText + '</li></ol>';
    main.parentNode.insertBefore(nav, main);
  })();

  /* ============================================================
     19. Principals page — category tab filter.
     Wires .gw-principals-tabs → .gw-brands-grid with:
       - click + keyboard (ArrowLeft/Right, Home, End, Enter/Space)
       - aria-selected state sync
       - .gw-brand-card--hidden class toggled by data-category match
       - group headings injected once, visible only on "all"
       - ?filter=<slug> URL param for deep-links (replaceState, no reload)
     Idempotent + no-op on pages without the tablist.
     ============================================================ */
  (function gwPrincipalsFilter() {
    var tablist = doc.querySelector('.gw-principals-tabs');
    var grid    = doc.querySelector('.gw-brands-grid');
    if (!tablist || !grid) return;

    var tabs  = Array.prototype.slice.call(tablist.querySelectorAll('.gw-principals-tabs__tab'));
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.gw-brand-card'));
    if (!tabs.length || !cards.length) return;

    /* Inject category group headings before the first card of each data-group.
       Run once — guarded by a data flag so re-entry is safe. */
    if (!grid.hasAttribute('data-gw-grouped')) {
      var seen = {};
      cards.forEach(function (card) {
        var group = card.getAttribute('data-group');
        var cat   = card.getAttribute('data-category');
        if (!group || seen[cat]) return;
        seen[cat] = true;
        var count = cards.filter(function (c) { return c.getAttribute('data-category') === cat; }).length;
        var heading = doc.createElement('div');
        heading.className = 'gw-brand-group-heading';
        heading.setAttribute('data-group-for', cat);
        heading.innerHTML = '<h3>' + group + '</h3><small>' + count + ' ' + (count === 1 ? 'brand' : 'brands') + '</small>';
        grid.insertBefore(heading, card);
      });
      grid.setAttribute('data-gw-grouped', 'true');
    }
    var headings = Array.prototype.slice.call(grid.querySelectorAll('.gw-brand-group-heading'));

    function applyFilter(filter) {
      var isAll = !filter || filter === 'all';
      cards.forEach(function (card) {
        var match = isAll || card.getAttribute('data-category') === filter;
        card.classList.toggle('gw-brand-card--hidden', !match);
      });
      headings.forEach(function (h) {
        h.classList.toggle('gw-brand-card--hidden', !isAll);
      });
      tabs.forEach(function (t) {
        var active = t.getAttribute('data-filter') === (isAll ? 'all' : filter);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
        t.setAttribute('tabindex', active ? '0' : '-1');
      });
    }

    function updateURL(filter) {
      if (!window.history || !history.replaceState) return;
      try {
        var url = new URL(location.href);
        if (!filter || filter === 'all') url.searchParams.delete('filter');
        else url.searchParams.set('filter', filter);
        history.replaceState(null, '', url.toString());
      } catch (e) { /* older browsers — silently skip */ }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        var f = tab.getAttribute('data-filter');
        applyFilter(f);
        updateURL(f);
        tab.focus();
      });
      tab.addEventListener('keydown', function (ev) {
        var key = ev.key;
        var next = -1;
        if (key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (key === 'Home') next = 0;
        else if (key === 'End') next = tabs.length - 1;
        else return;
        ev.preventDefault();
        tabs[next].focus();
        tabs[next].click();
      });
    });

    /* Deep-link initial state from ?filter=<slug>; fall back to the
       tab already marked aria-selected="true" in markup, else "all". */
    var params = new URLSearchParams(location.search);
    var initial = params.get('filter');
    var valid = tabs.some(function (t) { return t.getAttribute('data-filter') === initial; });
    if (!valid) {
      var preset = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      initial = preset ? preset.getAttribute('data-filter') : 'all';
    }
    applyFilter(initial);
  })();

  /* ============================================================
     20. Quote form — `?sector=<slug>` prefill.
     When a user arrives from an industry card (industries.html →
     request-a-quote.html?sector=oil-gas), surface a visible context
     pill above the form and inject a hidden <input name="sector">
     so the sector slug travels with the mailto body.
     No-op when the param is absent or the form is not on page.
     ============================================================ */
  (function gwQuoteSectorPrefill() {
    var form = doc.querySelector('form.gw-form[data-gw-form="quote"]');
    if (!form) return;
    var params = new URLSearchParams(location.search);
    var slug = (params.get('sector') || '').trim().toLowerCase();
    if (!slug) return;

    var LABELS = {
      'oil-gas':        'Oil & Gas (onshore & offshore)',
      'petrochemical':  'Petrochemical & Refining',
      'power':          'Power Generation & Transmission',
      'water':          'Water & Wastewater',
      'construction':   'Construction & Infrastructure',
      'government':     'Government & Civil Defence',
      'hospitality':    'Hospitality & Corporate',
      'manufacturing':  'Manufacturing & Industrial'
    };
    var label = LABELS[slug] || slug.replace(/-/g, ' ');

    /* Hidden input — travels with the mailto body */
    if (!form.querySelector('input[name="sector"]')) {
      var hidden = doc.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'sector';
      hidden.value = label;
      form.insertBefore(hidden, form.firstChild);
    }

    /* Visible context pill at the top of the form */
    if (!form.querySelector('.gw-form-context')) {
      var pill = doc.createElement('div');
      pill.className = 'gw-form-context';
      pill.setAttribute('role', 'note');
      pill.innerHTML =
        '<span class="gw-form-context__eyebrow">Requesting supply for</span>' +
        '<strong class="gw-form-context__label">' + label + '</strong>' +
        '<button type="button" class="gw-form-context__clear" aria-label="Clear sector">&times;</button>';
      form.insertBefore(pill, form.firstChild);
      pill.querySelector('.gw-form-context__clear').addEventListener('click', function () {
        pill.remove();
        var h = form.querySelector('input[name="sector"]');
        if (h) h.remove();
        if (window.history && history.replaceState) {
          var url = new URL(location.href);
          url.searchParams.delete('sector');
          history.replaceState(null, '', url.toString());
        }
      });
    }
  })();

  /* ============================================================
     20b. Logo img hygiene — fixes 2 perf bugs across all 20 pages
     without per-file edits:
       - The navbar-brand logo is above the fold; lazy-loading it
         delays LCP. Force eager + high fetch priority.
       - Several logo <img> tags lack intrinsic dimensions, causing
         CLS. Stamp the true 516×484 aspect (scaled to each tag's
         declared width when present, otherwise the source size).
     Idempotent: skips tags that already declare both dimensions.
     ============================================================ */
  (function gwImgHygiene() {
    var LOGO_W = 720, LOGO_H = 674;
    var logos = doc.querySelectorAll('img[src*="goodway-logo"]');
    logos.forEach(function (img, i) {
      var aboveFold = !!img.closest('.navbar, .logo-brand, .w-nav-brand, header');
      var onDarkSurface = !!img.closest('.footer, .footer-section, .cta-section, .benefit-section, .gallery-section, .our-work-section, .section-2');
      if (aboveFold) {
        img.setAttribute('loading', 'eager');
        img.setAttribute('fetchpriority', 'high');
        img.setAttribute('decoding', 'sync');
      } else if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      /* Swap to the light-wordmark variant on dark-surface contexts so
         the "GOOD WAY / GENERAL TRADING" text stays legible. */
      if (onDarkSurface && img.src.indexOf('goodway-logo-light') === -1) {
        img.src = img.src.replace(/goodway-logo\.(png|svg|webp|avif)/, 'goodway-logo-light.$1');
      }
      /* Stamp dimensions to eliminate CLS */
      var w = parseInt(img.getAttribute('width'), 10);
      var h = parseInt(img.getAttribute('height'), 10);
      if (w && !h)       img.setAttribute('height', Math.round(w * LOGO_H / LOGO_W));
      else if (!w && h)  img.setAttribute('width',  Math.round(h * LOGO_W / LOGO_H));
      else if (!w && !h) { img.setAttribute('width', LOGO_W); img.setAttribute('height', LOGO_H); }
    });
  })();

  /* ============================================================
     20d. On-site search — loaded lazily. Press "/" or Ctrl/⌘-K to open.
     Fetches /search-index.json on first use, keeps it in memory.
     ============================================================ */
  (function gwSearch() {
    var overlay = null, input = null, results = null, index = null, loaded = false;
    var DEPTH = DEPTH_PREFIX || '';

    function tokenise(s) { return (s || '').toLowerCase().match(/[a-z0-9]+/g) || []; }
    function score(entry, terms) {
      var hay = (entry.title + ' ' + entry.heading + ' ' + entry.description + ' ' + entry.body).toLowerCase();
      var total = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        if (!t) continue;
        if (entry.title.toLowerCase().indexOf(t)   !== -1) total += 10;
        if (entry.heading.toLowerCase().indexOf(t) !== -1) total += 5;
        if (hay.indexOf(t) !== -1) total += 1;
      }
      return total;
    }
    function snippet(entry, terms) {
      var body = entry.body || '';
      var first = terms[0] && entry.body.toLowerCase().indexOf(terms[0]);
      if (first == null || first < 0) return body.slice(0, 140) + (body.length > 140 ? '…' : '');
      var start = Math.max(0, first - 40);
      return (start > 0 ? '…' : '') + body.slice(start, start + 150) + '…';
    }
    function highlight(text, terms) {
      if (!terms.length) return text;
      var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
      return text.replace(new RegExp('(' + terms.map(esc).join('|') + ')', 'ig'), '<mark>$1</mark>');
    }

    function render(q) {
      var terms = tokenise(q);
      results.innerHTML = '';
      if (!index || !terms.length) { results.innerHTML = '<div class="gw-search__hint">Start typing to search the site.</div>'; return; }
      var hits = index
        .map(function (e) { return { e: e, s: score(e, terms) }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 10);
      if (!hits.length) { results.innerHTML = '<div class="gw-search__hint">No matches for "' + q + '".</div>'; return; }
      results.innerHTML = hits.map(function (h) {
        return '<a class="gw-search__hit" href="' + DEPTH + h.e.url.replace(/^\//, '') + '">' +
               '<div class="gw-search__title">' + highlight(h.e.title, terms) + '</div>' +
               '<div class="gw-search__url">' + h.e.url + '</div>' +
               '<div class="gw-search__snip">' + highlight(snippet(h.e, terms), terms) + '</div>' +
               '</a>';
      }).join('');
    }

    function open() {
      if (!overlay) build();
      overlay.classList.add('is-open');
      doc.body.style.overflow = 'hidden';
      setTimeout(function () { input.focus(); }, 30);
      if (!loaded) {
        loaded = true;
        fetch(DEPTH + 'search-index.json').then(r => r.json()).then(function (data) {
          index = data; render(input.value);
        }).catch(function () { results.innerHTML = '<div class="gw-search__hint">Search index unavailable.</div>'; });
      }
    }
    function close() {
      if (!overlay) return;
      overlay.classList.remove('is-open');
      doc.body.style.overflow = '';
    }

    function build() {
      overlay = doc.createElement('div');
      overlay.className = 'gw-search';
      overlay.innerHTML =
        '<div class="gw-search__backdrop" data-gw-search-close></div>' +
        '<div class="gw-search__panel" role="dialog" aria-modal="true" aria-label="Site search">' +
          '<div class="gw-search__bar">' +
            '<svg class="gw-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
            '<input class="gw-search__input" type="search" placeholder="Search principals, sectors, products…" aria-label="Search">' +
            '<button class="gw-search__close" type="button" aria-label="Close search" data-gw-search-close>ESC</button>' +
          '</div>' +
          '<div class="gw-search__results" id="gw-search-results"></div>' +
        '</div>';
      doc.body.appendChild(overlay);
      input = overlay.querySelector('.gw-search__input');
      results = overlay.querySelector('.gw-search__results');
      input.addEventListener('input', function () { render(input.value); });
      overlay.addEventListener('click', function (e) {
        if (e.target.hasAttribute('data-gw-search-close')) close();
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
      });
    }

    /* Keyboard trigger: "/" or Ctrl/Cmd+K, anywhere that isn't an input already */
    doc.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if (!typing && e.key === '/' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); open(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    });

    /* Click trigger: any element with data-gw-search-open */
    doc.querySelectorAll('[data-gw-search-open]').forEach(function (el) {
      el.addEventListener('click', function (ev) { ev.preventDefault(); open(); });
    });

    /* Auto-inject a search icon into the navbar on every page */
    var navItems = doc.querySelector('.navbar .button-menu') || doc.querySelector('.navbar .nav-menu');
    if (navItems && !navItems.querySelector('[data-gw-search-open]')) {
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'gw-nav-search';
      btn.setAttribute('data-gw-search-open', '');
      btn.setAttribute('aria-label', 'Search the site (press /)');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
      btn.addEventListener('click', function (ev) { ev.preventDefault(); open(); });
      navItems.insertBefore(btn, navItems.firstChild);
    }
  })();

  /* ============================================================
     20c. Form autosave — persists quote + contact forms to sessionStorage
     so a tab reload or accidental back-button doesn't lose 5 minutes
     of typing. Inserts a subtle status chip next to the submit button.
     Cleared on successful submit.
     ============================================================ */
  (function gwFormAutosave() {
    var forms = doc.querySelectorAll('form.gw-form[data-gw-form]');
    if (!forms.length) return;

    forms.forEach(function (form) {
      var kind = form.getAttribute('data-gw-form');
      var key = 'gw-form-' + kind;
      var submit = form.querySelector('input[type="submit"], button[type="submit"]');
      if (!submit) return;

      /* Status chip — sits next to the submit button */
      var chip = doc.createElement('span');
      chip.className = 'gw-autosave';
      chip.setAttribute('data-gw-autosave', 'idle');
      chip.setAttribute('aria-live', 'polite');
      submit.insertAdjacentElement('afterend', chip);

      function setStatus(state, label) {
        chip.setAttribute('data-gw-autosave', state);
        chip.textContent = label;
      }

      /* Restore */
      try {
        var saved = sessionStorage.getItem(key);
        if (saved) {
          var data = JSON.parse(saved);
          Object.keys(data).forEach(function (name) {
            var field = form.querySelector('[name="' + name + '"]');
            if (!field || field.type === 'hidden' || field.name === 'website') return;
            if (field.type === 'checkbox' || field.type === 'radio') field.checked = !!data[name];
            else if (!field.value) field.value = data[name];
          });
          setStatus('restored', 'Draft restored');
          setTimeout(function () { setStatus('saved', 'Draft saved'); }, 2200);
        }
      } catch (e) { /* ignore corrupt storage */ }

      /* Save on input, debounced */
      var t = null;
      form.addEventListener('input', function () {
        setStatus('saving', 'Saving…');
        clearTimeout(t);
        t = setTimeout(function () {
          var data = {};
          form.querySelectorAll('input, select, textarea').forEach(function (f) {
            if (!f.name || f.type === 'submit' || f.type === 'hidden' || f.name === 'website') return;
            if (f.type === 'checkbox' || f.type === 'radio') data[f.name] = f.checked;
            else data[f.name] = f.value;
          });
          try {
            sessionStorage.setItem(key, JSON.stringify(data));
            setStatus('saved', 'Draft saved');
          } catch (e) { setStatus('idle', ''); }
        }, 500);
      });

      /* Clear on successful submit */
      form.addEventListener('submit', function () {
        /* Clear AFTER a tick so the submit actually happens first */
        setTimeout(function () {
          try { sessionStorage.removeItem(key); } catch (e) {}
        }, 10);
      });
    });
  })();

  /* ============================================================
     22. Lead-capture submit — POSTs every gw-form to /api/leads
     and shows a success toast. If the server is unreachable
     (no admin backend deployed yet, or CORS block), transparently
     falls through to the form's original `mailto:` action so the
     user's enquiry still reaches the inbox.
     Idempotent: the gwFormAutosave IIFE above only listens to
     'submit' to clear its draft; this one intercepts with
     preventDefault() and handles the network call. No conflict.
     ============================================================ */
  (function gwFormSubmit() {
    var forms = doc.querySelectorAll('form.gw-form[data-gw-form]');
    if (!forms.length) return;

    forms.forEach(function (form) {
      form.addEventListener('submit', function (ev) {
        /* If submit is already in-flight, let the original fire */
        if (form.dataset.gwSubmitting === '1') return;

        /* Honeypot — if the hidden website field is filled, assume a bot
           and let the mailto go through (but don't POST server-side). */
        var honey = form.querySelector('input[name="website"]');
        if (honey && honey.value.trim()) return;

        /* Gather form data as a plain object */
        var data = {};
        new FormData(form).forEach(function (value, key) {
          if (key === 'website') return;
          data[key] = String(value).trim();
        });
        data.source = form.getAttribute('data-gw-form') || 'web';
        data.page = location.pathname;

        /* Minimum field check — the server also validates, but short-circuit
           here so the UI responds immediately on obviously-empty forms. */
        if (!data.name || !data.email) return;
        if (data.source === 'quote' && !data.spec) return;
        if (data.source === 'contact' && !data.message) return;

        /* Map "message" (contact form) to "spec" so the server schema
           accepts it — the quotes table uses `spec` as the body column. */
        if (data.message && !data.spec) { data.spec = data.message; delete data.message; }

        ev.preventDefault();
        form.dataset.gwSubmitting = '1';
        var submit = form.querySelector('input[type="submit"], button[type="submit"]');
        var oldVal = submit ? (submit.value || submit.textContent) : '';
        if (submit) {
          submit.disabled = true;
          if (submit.value !== undefined) submit.value = 'Sending…';
          else submit.textContent = 'Sending…';
        }

        function toast(msg, ok) {
          var t = doc.querySelector('.gw-toast') || (function () {
            var el = doc.createElement('div');
            el.className = 'gw-toast';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            doc.body.appendChild(el);
            return el;
          })();
          t.textContent = msg;
          t.style.setProperty('--gw-toast-bg', ok ? 'var(--gw-navy)' : '#8a2a2a');
          t.classList.add('is-visible');
          setTimeout(function () { t.classList.remove('is-visible'); }, 4200);
        }

        function fallbackToMailto() {
          form.dataset.gwSubmitting = '0';
          if (submit) { submit.disabled = false; if (submit.value !== undefined) submit.value = oldVal; else submit.textContent = oldVal; }
          /* Re-submit with the original action (mailto:) */
          form.submit();
        }

        if (!LEAD_ENDPOINT) return fallbackToMailto();

        /* 6-second timeout so a slow / offline server doesn't hang the UX */
        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timeout = setTimeout(function () { if (controller) controller.abort(); }, 6000);

        fetch(LEAD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data),
          signal: controller ? controller.signal : undefined,
          credentials: 'omit',
          mode: 'cors'
        })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
        .then(function (out) {
          clearTimeout(timeout);
          if (!out || out.ok !== true) throw new Error('Server declined');
          toast('Thanks — we received your enquiry and will reply within 48 hours.', true);
          try { sessionStorage.removeItem('gw-form-' + (form.getAttribute('data-gw-form'))); } catch (e) {}
          form.reset();
          form.dataset.gwSubmitting = '0';
          if (submit) { submit.disabled = false; if (submit.value !== undefined) submit.value = oldVal; else submit.textContent = oldVal; }
          /* Fire GA4 / GTM conversion event if either is configured */
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'generate_lead', { source: data.source });
          }
        })
        .catch(function (e) {
          clearTimeout(timeout);
          console.warn('[gw] lead POST failed, falling back to mailto:', e && e.message);
          fallbackToMailto();
        });
      }, true /* capture-phase so we run before the form default */);
    });
  })();

  /* ============================================================
     21. Footer auto-linker — turns plain-text contact lines in the
     shared footer into tel: / mailto: / wa.me anchors across all
     20 pages without editing each file.
     Idempotent: skips nodes that already contain an <a>.
     ============================================================ */
  (function gwFooterContactLinks() {
    var EMAIL_RE = /^gwayuae@outlook\.com$/i;
    var MOBILE_RE = /^\+?971\s*56\s*442\s*3539$/;
    var LANDLINE_RE = /^\+?971\s*2\s*245\s*0497$/;
    var nodes = doc.querySelectorAll('.footer-contact-item .paragraph.regular-gainsboro, .footer .contact-footer .paragraph');
    nodes.forEach(function (node) {
      if (node.querySelector('a')) return;
      var text = (node.textContent || '').trim();
      if (EMAIL_RE.test(text)) {
        node.innerHTML = '<a href="mailto:info@goodway.ae" class="gw-contact-link">' + text + '</a>';
      } else if (MOBILE_RE.test(text)) {
        node.innerHTML =
          '<a href="tel:+971564423539" class="gw-contact-link">+971 56 442 3539</a>' +
          ' <small style="opacity:0.7;">(mobile)</small>' +
          '<br><a href="tel:+97122450497" class="gw-contact-link">+971 2 245 0497</a>' +
          ' <small style="opacity:0.7;">(office)</small>' +
          ' &middot; <a href="https://wa.me/971564423539" target="_blank" rel="noopener" class="gw-contact-link">WhatsApp</a>';
      } else if (LANDLINE_RE.test(text)) {
        node.innerHTML = '<a href="tel:+97122450497" class="gw-contact-link">' + text + '</a>';
      }
    });
  })();

  /* ============================================================
     23. VELOCITY MARQUEE — principals row
     Two-direction, scroll-accelerated infinite ticker. Duplicates
     each row's children once (aria-hidden clones) so the track can
     loop seamlessly. rAF loop advances a per-row offset at a base
     speed (px/sec) modulated by recent scroll velocity. Pauses on
     pointer-hover and when the row is off-screen. Short-circuits
     entirely under prefers-reduced-motion.
     ============================================================ */
  (function gwMarquee() {
    var rows = doc.querySelectorAll('[data-gw-marquee]');
    if (!rows.length) return;
    if (prefersReducedMotion) return;

    var state = [];
    rows.forEach(function (row) {
      var track = row.querySelector('.gw-marquee__track');
      if (!track) return;
      var original = Array.prototype.slice.call(track.children);
      /* Clone children once so the track loops seamlessly. */
      original.forEach(function (el) {
        var c = el.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.setAttribute('tabindex', '-1');
        track.appendChild(c);
      });
      state.push({
        row: row,
        track: track,
        dir: row.getAttribute('data-dir') === 'right' ? 1 : -1,
        base: parseFloat(row.getAttribute('data-speed')) || 32,
        x: 0,
        halfWidth: 0,
        hovered: false,
        visible: true
      });
    });

    /* Measure half-width (one copy's total width incl. gaps).
       Re-measure on resize because tile widths flex with the viewport. */
    function measure() {
      state.forEach(function (s) {
        s.halfWidth = s.track.scrollWidth / 2;
        /* Normalise x so we don't jump on resize */
        if (s.halfWidth > 0) {
          if (s.x > 0) s.x = s.x % s.halfWidth;
          else s.x = -((-s.x) % s.halfWidth);
        }
      });
    }
    measure();
    window.addEventListener('resize', measure);

    /* Pause off-screen rows with IntersectionObserver */
    if ('IntersectionObserver' in window) {
      var vis = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var s = state.find(function (x) { return x.row === e.target; });
          if (s) s.visible = e.isIntersecting;
        });
      }, { threshold: 0 });
      state.forEach(function (s) { vis.observe(s.row); });
    }

    /* Pointer hover pauses just that row */
    state.forEach(function (s) {
      s.row.addEventListener('pointerenter', function () { s.hovered = true; });
      s.row.addEventListener('pointerleave', function () { s.hovered = false; });
    });

    /* Scroll-velocity tracker — the marquee speeds up while the user
       is actively scrolling, then decays back to base. dir of scroll
       determines which direction gets the boost. */
    var scrollBoost = 0;          /* px/sec bonus applied to all rows' dir */
    var lastScrollY = window.scrollY;
    var lastScrollT = performance.now();
    window.addEventListener('scroll', function () {
      var now = performance.now();
      var dy = window.scrollY - lastScrollY;
      var dt = Math.max(16, now - lastScrollT);  /* clamp at 60fps worst case */
      /* px/sec — clamp to avoid a single jerky scroll sending it wild */
      var v = Math.max(-1200, Math.min(1200, (dy / dt) * 1000));
      /* Boost multiplier tuned to feel noticeable but not chaotic */
      scrollBoost = v * 0.35;
      lastScrollY = window.scrollY;
      lastScrollT = now;
    }, { passive: true });

    var last = performance.now();
    function frame(now) {
      var dt = Math.max(0, Math.min(64, now - last)) / 1000;  /* seconds */
      last = now;
      /* Decay scrollBoost toward 0 — exponential-ish, ~0.5s half-life */
      scrollBoost *= Math.pow(0.06, dt);
      state.forEach(function (s) {
        if (!s.visible || s.hovered || !s.halfWidth) return;
        /* dir: -1 = leftward (negative x), +1 = rightward.
           Boost applies with the row's dir so a scroll-down makes
           both rows pick up speed in their respective directions. */
        var vel = (s.base + Math.abs(scrollBoost)) * s.dir;
        s.x += vel * dt;
        /* Wrap so we never accumulate huge x values */
        if (s.x <= -s.halfWidth) s.x += s.halfWidth;
        else if (s.x >= s.halfWidth) s.x -= s.halfWidth;
        s.track.style.transform = 'translate3d(' + s.x.toFixed(2) + 'px, 0, 0)';
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ============================================================
     27. INTRO SPLASH — first-visit logo reveal (CSS-only animation,
     JS just flips a sessionStorage flag and removes the element
     when its own animationend fires. No setTimeout chains, no
     state-class juggling — if JS never runs the CSS keyframe
     still completes and the element becomes non-blocking
     (opacity:0, pointer-events:none, visibility:hidden).
     ============================================================ */
  (function gwSplash() {
    var splash = doc.querySelector('[data-gw-splash]');
    if (!splash) return;

    /* Skip on repeat navigations in the same session + under
       prefers-reduced-motion (CSS also handles the latter). */
    try {
      if (sessionStorage.getItem('gw-splash-seen') === '1') {
        splash.parentNode && splash.parentNode.removeChild(splash);
        doc.documentElement.classList.add('gw-splash-seen');
        return;
      }
    } catch (e) { /* private-mode / disabled storage — fall through */ }

    if (prefersReducedMotion) {
      splash.parentNode && splash.parentNode.removeChild(splash);
      return;
    }

    /* Remove the node when its exit animation ends — named
       animation 'gw-splash-exit' is the one that owns the fade-out. */
    splash.addEventListener('animationend', function (ev) {
      if (ev.animationName !== 'gw-splash-exit') return;
      try { sessionStorage.setItem('gw-splash-seen', '1'); } catch (e) {}
      doc.documentElement.classList.add('gw-splash-seen');
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    });

    /* Belt-and-braces: if animationend never fires (ancient engine or
       the animation was cancelled), force-remove after 3s so the
       element can never strand the page. */
    setTimeout(function () {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
      doc.documentElement.classList.add('gw-splash-seen');
      try { sessionStorage.setItem('gw-splash-seen', '1'); } catch (e) {}
    }, 3000);
  })();

  /* ============================================================
     26. SECTION RAIL — desktop jump-nav on long pages.
     Phase 1: lives on /divisions/electrical.html only. If proven
     useful it'll roll to the other 8 divisions. Honours
     prefers-reduced-motion (no smooth-scroll) and clicks.
     ============================================================ */
  (function gwSectionRail() {
    var rail = doc.querySelector('[data-gw-rail]');
    if (!rail) return;
    var links = Array.prototype.slice.call(rail.querySelectorAll('[data-gw-rail-link]'));
    if (!links.length) return;

    /* Map each link to its target section by id */
    var entries = links.map(function (link) {
      var id = (link.getAttribute('href') || '').replace(/^#/, '');
      var section = id ? doc.getElementById(id) : null;
      return { link: link, section: section, id: id };
    }).filter(function (e) { return e.section; });
    if (!entries.length) return;

    function setActive(id) {
      entries.forEach(function (e) {
        e.link.classList.toggle('is-active', e.id === id);
        if (e.id === id) e.link.setAttribute('aria-current', 'true');
        else e.link.removeAttribute('aria-current');
      });
    }

    /* Click handler — smooth-scroll (respecting reduced-motion via CSS)
       and immediately set the active state so the UI responds before
       the observer catches up. */
    entries.forEach(function (e) {
      e.link.addEventListener('click', function (ev) {
        ev.preventDefault();
        setActive(e.id);
        var top = e.section.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        if (history.replaceState) history.replaceState(null, '', '#' + e.id);
      });
    });

    /* Scroll-linked active state — fires whichever section's top has
       crossed the 30% mark of the viewport most recently. Simpler
       than IntersectionObserver for this "scrollspy" use case. */
    var last = null;
    function onScroll() {
      var viewportAnchor = window.innerHeight * 0.3;
      var current = entries[0].id;
      for (var i = 0; i < entries.length; i++) {
        var r = entries[i].section.getBoundingClientRect();
        if (r.top <= viewportAnchor) current = entries[i].id;
        else break;
      }
      if (current !== last) { setActive(current); last = current; }
    }
    var raf = null;
    window.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = null; onScroll(); });
    }, { passive: true });
    onScroll();
  })();

  /* ============================================================
     25. CONTACT TABS — /contact.html#general vs /contact.html#quote
     Syncs aria-selected + .is-active on the tab buttons and the
     hidden attribute on the matching panel. Runs on load and on
     hashchange. Deep-linking (#quote via a division CTA) opens the
     correct tab without a page reload.
     ============================================================ */
  (function gwContactTabs() {
    var tabs = doc.querySelectorAll('.gw-form-tab');
    var panels = doc.querySelectorAll('.gw-form-panel');
    if (!tabs.length || !panels.length) return;

    function activate(hash) {
      var target = (hash || '').replace(/^#/, '') || 'general';
      if (target !== 'general' && target !== 'quote') target = 'general';
      tabs.forEach(function (t) {
        var isMe = t.id === 'tab-' + target;
        t.classList.toggle('is-active', isMe);
        t.setAttribute('aria-selected', isMe ? 'true' : 'false');
      });
      panels.forEach(function (p) {
        var isMe = p.id === 'panel-' + target;
        p.classList.toggle('is-active', isMe);
        if (isMe) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
      });
    }

    /* Click on a tab: update hash without scrolling */
    tabs.forEach(function (t) {
      t.addEventListener('click', function (ev) {
        ev.preventDefault();
        var h = t.getAttribute('href') || '#general';
        activate(h);
        if (history.replaceState) history.replaceState(null, '', h);
        else location.hash = h;
      });
    });
    window.addEventListener('hashchange', function () { activate(location.hash); });
    activate(location.hash);
  })();

  /* ============================================================
     24. PARALLAX WORDMARK — About "Milestones" giant background
     type translates at ~0.35x scroll speed relative to its band.
     Uses a CSS custom property (--gw-word-y) so the transform
     itself lives in CSS and the browser can composite it cheaply.
     ============================================================ */
  (function gwParallaxWord() {
    if (prefersReducedMotion) return;
    var bands = doc.querySelectorAll('.gw-timeline-band');
    if (!bands.length) return;

    /* How far the word travels relative to the band's own height.
       0.35 = moves 35% of the band's height across a full scroll-through. */
    var RATIO = 0.35;

    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight || 800;
      bands.forEach(function (band) {
        var rect = band.getBoundingClientRect();
        /* Progress: -1 when band is entirely below the fold, 0 when its
           centre meets the viewport centre, +1 when it's entirely above. */
        var progress = ((rect.top + rect.height / 2) - vh / 2) / (vh / 2 + rect.height / 2);
        progress = Math.max(-1, Math.min(1, progress));
        /* Translate the word in the OPPOSITE direction to scroll so it
           feels anchored to the background, like a billboard behind glass. */
        var y = -progress * rect.height * RATIO;
        var word = band.querySelector('.gw-timeline-band__word');
        if (word) word.style.setProperty('--gw-word-y', y.toFixed(1) + 'px');
      });
    }
    function onScrollOrResize() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    update();
  })();

  updateStatic();
  if (parallaxItems.length) onScroll();
})();

/* Ability Heating & Gas — interactions */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----- icons ----- */
  if (window.lucide) lucide.createIcons();

  /* ----- year ----- */
  const yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ----- smooth scroll (Lenis) ----- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* ----- anchor links ----- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      const top = el.getBoundingClientRect().top + window.pageYOffset - 70;
      if (lenis) lenis.scrollTo(top, { duration: 1.1 });
      else window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ----- navbar hide/show + scrolled ----- */
  const navbar = document.getElementById("navbar");
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const y = window.pageYOffset;
    navbar.classList.toggle("scrolled", y > 30);
    if (y > lastScroll && y > 280 && !menuOpen) navbar.style.transform = "translateY(-100%)";
    else navbar.style.transform = "translateY(0)";
    lastScroll = y;
  }, { passive: true });

  /* ----- mobile menu ----- */
  const toggle = document.querySelector(".navtoggle");
  const menu = document.getElementById("mobilemenu");
  let menuOpen = false;
  function openMenu() { menu.hidden = false; toggle.setAttribute("aria-expanded", "true"); menuOpen = true; }
  function closeMenu() { if (!menuOpen) return; menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); menuOpen = false; }
  toggle.addEventListener("click", () => (menuOpen ? closeMenu() : openMenu()));

  /* ----- reveal animations (GSAP if present, else IO) ----- */
  const reveals = document.querySelectorAll(".reveal:not(.reveal--hero)");
  if (window.gsap && window.ScrollTrigger && !reduce) {
    gsap.registerPlugin(ScrollTrigger);
    reveals.forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
        onStart: () => el.classList.add("is-in"),
      });
    });
    // hero stagger on load (immersive + boxed heroes)
    // hero copy uses a CSS-only rise (never hidden); just animate the floating trust cards
    gsap.from(".herox__trust .herox__tcard", { y: 20, opacity: 0, duration: 0.8, stagger: 0.15, ease: "power3.out", delay: 0.8 });

    // parallax backgrounds — bands drift against the page for depth on scroll
    gsap.utils.toArray(".parallax__bg").forEach((bg) => {
      gsap.fromTo(bg, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: bg.closest(".parallax"), start: "top bottom", end: "bottom top", scrub: true },
      });
    });
    // gentle drift on the home hero image as you scroll away from the top
    const heroBg = document.querySelector(".herox__bg");
    if (heroBg) {
      gsap.fromTo(heroBg, { yPercent: -6 }, {
        yPercent: 6, ease: "none",
        scrollTrigger: { trigger: ".herox", start: "top top", end: "bottom top", scrub: true },
      });
    }
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ----- count up ----- */
  const counters = document.querySelectorAll(".stat__num[data-count]");
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      cio.unobserve(el);
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      const plain = el.dataset.plain === "1";
      if (plain || reduce) { el.textContent = (dec ? target.toFixed(dec) : Math.round(target).toLocaleString()) + suffix; return; }
      const dur = 1600; const t0 = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        el.textContent = (dec ? val.toFixed(dec) : Math.round(val).toLocaleString()) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });
  counters.forEach((c) => cio.observe(c));

  /* ----- reviews slider ----- */
  if (window.Swiper) {
    new Swiper(".reviews__swiper", {
      slidesPerView: 1, spaceBetween: 24, loop: true, grabCursor: true,
      autoplay: { delay: 4500, disableOnInteraction: false },
      navigation: { prevEl: ".rev-prev", nextEl: ".rev-next" },
      breakpoints: { 700: { slidesPerView: 2 }, 1080: { slidesPerView: 3 } },
    });
  }

  /* ----- accordion: close others ----- */
  const items = document.querySelectorAll(".faq__item");
  items.forEach((it) => it.addEventListener("toggle", () => {
    if (it.open) items.forEach((o) => { if (o !== it) o.open = false; });
  }));

  /* ----- contact form (posts to n8n → branded email) ----- */
  const LEAD_WEBHOOK = "https://cerebro-u37879.vm.elestio.app/webhook/ability-heating-lead";
  const form = document.getElementById("quoteForm");
  const note = document.getElementById("formNote");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      note.className = "form-note";
      note.textContent = "";
      if (!form.name.value.trim() || !form.phone.value.trim() || !form.consent.checked) {
        note.textContent = "Please add your name, phone and tick the consent box.";
        note.classList.add("err"); return;
      }
      if (form.botcheck && form.botcheck.checked) return; // honeypot
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      const payload = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        service: form.service.value,
        message: form.message.value.trim(),
        page: location.href,
        page_title: document.title,
      };
      btn.disabled = true; btn.innerHTML = "Sending…";
      try {
        const res = await fetch(LEAD_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("status " + res.status);
        form.reset();
        note.textContent = "Thanks, we've got your request and will be in touch shortly.";
        note.classList.add("ok");
      } catch (err) {
        // Fallback so a lead never dead-ends if the endpoint is unreachable
        const body = `Name: ${payload.name}%0D%0APhone: ${payload.phone}%0D%0AEmail: ${payload.email}%0D%0AService: ${payload.service}%0D%0A%0D%0A${payload.message}`;
        window.location.href = `mailto:info@abilityheating.co.uk?subject=Quote%20request&body=${body}`;
        note.textContent = "Opening your email app, or call us on 07988 886674.";
        note.classList.add("ok");
      } finally { btn.disabled = false; btn.innerHTML = original; if (window.lucide) lucide.createIcons(); }
    });
  }

  /* ----- cookie note (essential only) ----- */
  const cookie = document.getElementById("cookie");
  const okBtn = document.getElementById("cookieOk");
  try {
    if (cookie && !localStorage.getItem("ah_cookie_ok")) {
      setTimeout(() => { cookie.hidden = false; }, 900);
    }
    if (okBtn) okBtn.addEventListener("click", () => { cookie.hidden = true; try { localStorage.setItem("ah_cookie_ok", "1"); } catch (e) {} });
  } catch (e) { if (cookie) cookie.hidden = true; }
})();

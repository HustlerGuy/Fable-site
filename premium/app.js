/* fiwoj.pl — Premium Business Card :: interakcje (czysty JS, 60 FPS) */
(function () {
  "use strict";

  /* --- Reveal przy przewijaniu (IntersectionObserver, bez nasłuchu scroll) --- */
  const revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealables.length) {
    const io = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-visible"));
  }

  /* --- Cień/obwódka headera zależne od pozycji (scroll spięty z rAF) --- */
  const header = document.querySelector("[data-header]");
  if (header) {
    let ticking = false;
    const sync = () => { header.toggleAttribute("data-scrolled", window.scrollY > 8); ticking = false; };
    addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    }, { passive: true });
    sync();
  }

  /* --- Menu mobilne --- */
  const toggle = document.querySelector("[data-navtoggle]");
  if (toggle && header) {
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    header.querySelectorAll(".mainnav a").forEach((a) =>
      a.addEventListener("click", () => {
        header.classList.remove("is-open");
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* --- Suwak przed/po: sterowany dostępnym <input type=range> (klawiatura + dotyk) --- */
  document.querySelectorAll("[data-ba]").forEach((ba) => {
    const range = ba.querySelector(".ba__range");
    if (!range) return;
    const apply = (v) => ba.style.setProperty("--pos", v + "%");
    apply(range.value);
    range.addEventListener("input", () => apply(range.value), { passive: true });
  });

  /* --- Rok w stopce --- */
  const yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();

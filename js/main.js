/* fiwoj.pl — interakcje strony */
(function () {
  "use strict";

  /* ---- Header shadow on scroll ---- */
  const header = document.querySelector(".header");
  const onScroll = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobile nav ---- */
  const burger = document.querySelector(".burger");
  const nav = document.querySelector(".nav");
  if (burger && nav) {
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      document.body.classList.toggle("nav-open", open);
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        document.body.classList.remove("nav-open");
      })
    );
  }

  /* ---- Reveal on scroll ---- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---- Before / After sliders ---- */
  document.querySelectorAll(".ba").forEach((ba) => {
    const after = ba.querySelector(".ba__after");
    const handle = ba.querySelector(".ba__handle");
    const grip = ba.querySelector(".ba__grip");
    let dragging = false;

    const setPos = (clientX) => {
      const rect = ba.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(2, Math.min(98, pct));
      after.style.clipPath = `inset(0 0 0 ${pct}%)`;
      handle.style.left = pct + "%";
      if (grip) grip.style.left = pct + "%";
    };

    const start = (e) => { dragging = true; ba.style.cursor = "ew-resize"; };
    const move = (e) => {
      if (!dragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      setPos(x);
    };
    const end = () => { dragging = false; };

    ba.addEventListener("mousedown", (e) => { start(e); setPos(e.clientX); });
    ba.addEventListener("touchstart", (e) => { start(e); setPos(e.touches[0].clientX); }, { passive: true });
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("mouseup", end);
    window.addEventListener("touchend", end);
  });

  /* ---- Animated counters ---- */
  const counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const target = parseFloat(el.dataset.count);
          const suffix = el.dataset.suffix || "";
          const dur = 1500;
          const startT = performance.now();
          const tick = (now) => {
            const p = Math.min((now - startT) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = target * eased;
            el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          cio.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll(".faq__q").forEach((q) => {
    q.addEventListener("click", () => {
      const item = q.closest(".faq__item");
      const ans = item.querySelector(".faq__a");
      const isOpen = item.classList.contains("open");
      item.classList.toggle("open");
      ans.style.maxHeight = isOpen ? null : ans.scrollHeight + "px";
    });
  });

  /* ---- Bubbles in hero ---- */
  document.querySelectorAll(".hero__bubbles").forEach((wrap) => {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const b = document.createElement("span");
      const size = 8 + ((i * 7) % 42);
      b.style.width = size + "px";
      b.style.height = size + "px";
      b.style.left = ((i * 13) % 100) + "%";
      b.style.animationDuration = 9 + ((i * 3) % 12) + "s";
      b.style.animationDelay = -((i * 2) % 14) + "s";
      b.style.opacity = 0.15 + ((i % 4) * 0.12);
      wrap.appendChild(b);
    }
  });

  /* ---- Contact / quote form (demo) ---- */
  document.querySelectorAll("form[data-quote]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const success = form.querySelector(".form-success");
      if (success) {
        success.classList.add("show");
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      form.reset();
    });
  });

  /* ---- Footer year ---- */
  const yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();

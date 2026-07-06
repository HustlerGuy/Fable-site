/* ============================================================================
   fiwoj.pl — Hero Engine (ES2024+)
   Architektura: hermetyzowane widżety + magistrala zdarzeń (Pub/Sub).
   Zasady: brak nasłuchu `scroll`; obserwacja przez IntersectionObserver /
   ResizeObserver; każdy widżet posiada destroy() zwalniający zasoby.
   ========================================================================== */

/* --- Magistrala zdarzeń (Pub/Sub oparty o natywny EventTarget) ------------ */
export class EventBus extends EventTarget {
  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  /** zwraca funkcję odpinającą — ułatwia rejestrację w cleanupie widżetu */
  on(type, handler, opts) {
    this.addEventListener(type, handler, opts);
    return () => this.removeEventListener(type, handler, opts);
  }
}

/* --- Bazowy widżet: rejestr teardownów -> jednolity kontrakt destroy() ---- */
class Widget {
  #disposers = new Set();
  #alive = true;
  /** rejestruje dowolną funkcję czyszczącą (listener, observer, rAF, timer) */
  track(dispose) { this.#disposers.add(dispose); return dispose; }
  get alive() { return this.#alive; }
  destroy() {
    if (!this.#alive) return;
    this.#alive = false;
    for (const dispose of this.#disposers) { try { dispose(); } catch { /* idempotentny */ } }
    this.#disposers.clear();
  }
}

const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)");

/* ============================================================================
   PointerField — interaktywne tło z fizyką opóźnienia (lerp).
   Zapisuje wygładzone --mx/--my; pętla rAF; automatyczny will-change.
   ========================================================================== */
export class PointerField extends Widget {
  #el; #bus;
  #target = { x: 0, y: 0 };   // surowa pozycja kursora [-0.5 .. 0.5]
  #value  = { x: 0, y: 0 };   // wartość wygładzona (renderowana)
  #raf = 0;
  #running = false;
  #last = 0;

  // Współczynnik wygładzania bazowy (dla 60 FPS). Wyższy = szybsze „dociąganie”.
  static #SMOOTHING = 0.12;
  // Próg zatrzymania pętli: gdy |target - value| < EPS i brak nowego inputu.
  static #EPS = 0.0004;

  constructor(el, bus) {
    super();
    this.#el = el; this.#bus = bus;
    if (REDUCED_MOTION.matches) return;   // brak ruchu → brak pętli

    const onMove = (e) => {
      const r = this.#el.getBoundingClientRect();
      // Normalizacja do [-0.5 .. 0.5] względem środka kontenera (nie viewportu).
      this.#target.x = (e.clientX - r.left) / r.width  - 0.5;
      this.#target.y = (e.clientY - r.top)  / r.height - 0.5;
      this.#wake();
    };
    const onLeave = () => { this.#target.x = 0; this.#target.y = 0; this.#wake(); };

    this.#el.addEventListener("pointermove", onMove, { passive: true });
    this.#el.addEventListener("pointerleave", onLeave, { passive: true });
    this.track(() => this.#el.removeEventListener("pointermove", onMove));
    this.track(() => this.#el.removeEventListener("pointerleave", onLeave));
    this.track(() => { if (this.#raf) cancelAnimationFrame(this.#raf); });
  }

  #wake() {
    if (this.#running) return;
    this.#running = true;
    this.#el.classList.add("is-pointer-active");   // aktywuje will-change (CSS)
    this.#last = performance.now();
    this.#raf = requestAnimationFrame(this.#tick);
  }

  #tick = (now) => {
    // dt w klatkach 60 FPS; korekta zależności lerpu od czasu klatki.
    const dt = Math.min((now - this.#last) / 16.667, 4);
    this.#last = now;
    // Wygładzanie wykładnicze niezależne od FPS:
    //   a = 1 - (1 - k)^dt   → dla dt=1 daje dokładnie k (klasyczny lerp 60 FPS)
    const a = 1 - Math.pow(1 - PointerField.#SMOOTHING, dt);
    this.#value.x += (this.#target.x - this.#value.x) * a;
    this.#value.y += (this.#target.y - this.#value.y) * a;

    this.#el.style.setProperty("--mx", this.#value.x.toFixed(4));
    this.#el.style.setProperty("--my", this.#value.y.toFixed(4));

    const dx = this.#target.x - this.#value.x;
    const dy = this.#target.y - this.#value.y;
    if (dx * dx + dy * dy > PointerField.#EPS * PointerField.#EPS) {
      this.#raf = requestAnimationFrame(this.#tick);
    } else {
      // Stan spoczynku: zatrzymaj pętlę i zdejmij will-change (oszczędność pamięci GPU).
      this.#running = false;
      this.#el.classList.remove("is-pointer-active");
      this.#bus?.emit("hero:field-idle");
    }
  };
}

/* ============================================================================
   TextSplitter — dzielenie tekstu na węzły w locie (linie/słowa/znaki).
   Nadaje --i (globalny indeks znaku) dla staggeru; zachowuje spacje/łamanie.
   ========================================================================== */
export class TextSplitter {
  /** @returns {{restore: () => void, count: number}} */
  static split(el) {
    const source = el.textContent ?? "";
    const original = source;
    const words = source.split(/(\s+)/);   // zachowuje separatory jako osobne tokeny
    const frag = document.createDocumentFragment();
    const line = document.createElement("span");
    line.className = "line";

    let charIndex = 0;
    for (const token of words) {
      if (/^\s+$/.test(token)) { line.append(document.createTextNode(token)); continue; }
      const word = document.createElement("span");
      word.className = "word";
      for (const glyph of token) {                 // iteracja po code-pointach (Unicode-safe)
        const ch = document.createElement("span");
        ch.className = "char";
        ch.style.setProperty("--i", String(charIndex++));
        ch.textContent = glyph;
        word.append(ch);
      }
      line.append(word);
    }
    frag.append(line);
    el.replaceChildren(frag);

    return {
      count: charIndex,
      restore: () => { el.textContent = original; },   // odtworzenie DOM w cleanupie
    };
  }
}

/* ============================================================================
   StaggerReveal — wyzwolenie animacji wejścia przez IntersectionObserver.
   Po ujawnieniu nasłuchuje transitionend, by zdjąć will-change ze znaków.
   ========================================================================== */
export class StaggerReveal extends Widget {
  #host; #bus;
  constructor(host, bus, { threshold = 0.25 } = {}) {
    super();
    this.#host = host; this.#bus = bus;

    if (REDUCED_MOTION.matches) { host.setAttribute("data-revealed", ""); return; }

    const io = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        host.setAttribute("data-revealed", "");
        this.#bus?.emit("hero:revealed", { target: host });
        obs.unobserve(host);       // jednorazowo — brak retriggerów
      }
    }, { threshold });
    io.observe(host);
    this.track(() => io.disconnect());

    // Sprzątanie will-change dokładnie po zakończeniu tranzycji danego znaku.
    const onEnd = (e) => {
      if (e.target instanceof HTMLElement && e.target.classList.contains("char")) {
        e.target.classList.add("is-settled");
      }
    };
    host.addEventListener("transitionend", onEnd);
    this.track(() => host.removeEventListener("transitionend", onEnd));
  }
}

/* ============================================================================
   ThemeController — płynne przełączanie palety zmiennych CSS (bez reloadu).
   Modyfikuje [data-theme] oraz imperatywnie nadpisuje tokeny na :root.
   ========================================================================== */
export class ThemeController extends Widget {
  #root; #bus; #theme;
  static #PALETTES = {
    dark:  { "--c-bg-0": "#071d30", "--c-bg-1": "#0b3f66", "--c-accent": "#17c3b2", "--c-ink": "#eef8fd", "--c-haze": "#0e7ea6" },
    light: { "--c-bg-0": "#eaf5fb", "--c-bg-1": "#bfe6f3", "--c-accent": "#0ea697", "--c-ink": "#0b2a3c", "--c-haze": "#7fd0e6" },
  };

  constructor({ root = document.documentElement, bus, toggle } = {}) {
    super();
    this.#root = root; this.#bus = bus;
    const mq = matchMedia("(prefers-color-scheme: light)");
    this.#theme = root.dataset.theme ?? (mq.matches ? "light" : "dark");
    this.apply(this.#theme);

    if (toggle) {
      const onClick = () => this.toggle();
      toggle.addEventListener("click", onClick);
      this.track(() => toggle.removeEventListener("click", onClick));
    }
    // Reakcja na zmianę preferencji systemu (z cleanupem).
    const onScheme = (e) => this.apply(e.matches ? "light" : "dark");
    mq.addEventListener("change", onScheme);
    this.track(() => mq.removeEventListener("change", onScheme));
  }

  get theme() { return this.#theme; }
  toggle() { this.apply(this.#theme === "dark" ? "light" : "dark"); }

  apply(theme) {
    const palette = ThemeController.#PALETTES[theme];
    if (!palette) return;
    this.#theme = theme;
    this.#root.dataset.theme = theme;
    // Nadpisanie tokenów <color> na :root — transition w CSS interpoluje zmianę.
    for (const [prop, val] of Object.entries(palette)) this.#root.style.setProperty(prop, val);
    this.#bus?.emit("theme:change", { theme });
  }
}

/* ============================================================================
   HeroController — orkiestracja cyklu życia i danych między widżetami.
   ResizeObserver skaluje amplitudę parallaxu do realnej szerokości komponentu.
   ========================================================================== */
export class HeroController extends Widget {
  #el; #bus = new EventBus(); #parts = new Set();

  constructor(el) {
    super();
    this.#el = el;

    const field = el.querySelector("[data-hero-field]") ?? el;

    // Split typografii — zapamiętujemy restore() do cleanupu DOM.
    const splits = [...el.querySelectorAll("[data-split]")].map((node) => TextSplitter.split(node));
    this.track(() => splits.forEach((s) => s.restore()));

    // Widżety składowe (motyw jest globalny — patrz js/theme.js; hero dziedziczy [data-theme] z <html>).
    this.#add(new PointerField(field, this.#bus));
    this.#add(new StaggerReveal(el, this.#bus));

    // ResizeObserver: amplituda parallaxu proporcjonalna do szerokości (≈6% i 5%).
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      el.style.setProperty("--field-amp-x", `${(w * 0.06).toFixed(1)}px`);
      el.style.setProperty("--field-amp-y", `${(w * 0.05).toFixed(1)}px`);
    });
    ro.observe(el);
    this.track(() => ro.disconnect());
  }

  get bus() { return this.#bus; }
  #add(widget) { this.#parts.add(widget); return widget; }

  destroy() {
    for (const part of this.#parts) part.destroy();
    this.#parts.clear();
    super.destroy();      // odpina observery, ResizeObserver, listenery, restore DOM
  }
}

/* --- Auto-inicjalizacja: instancja per [data-hero]; rejestr do destroy() --- */
export function initHero(scope = document) {
  const instances = [...scope.querySelectorAll("[data-hero]")].map((el) => new HeroController(el));
  return { instances, destroy: () => instances.forEach((i) => i.destroy()) };
}

if (document.readyState !== "loading") queueMicrotask(() => initHero());
else document.addEventListener("DOMContentLoaded", () => initHero(), { once: true });

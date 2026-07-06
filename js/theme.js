/* ============================================================================
   fiwoj.pl — Global Theme Manager (ES2024+)
   Jedno źródło prawdy dla motywu całej strony. Steruje [data-theme] na <html>,
   utrwala wybór w localStorage, spina wszystkie [data-theme-toggle] i emituje
   zdarzenie 'fiwoj:themechange' (Pub/Sub) dla modułów zależnych (np. hero).
   Kontrakt cyklu życia: destroy() odpina listenery i MediaQueryList.
   ========================================================================== */

const STORAGE_KEY = "fiwoj-theme";

export class ThemeManager {
  #root; #media; #theme; #disposers = new Set();

  constructor({ root = document.documentElement } = {}) {
    this.#root = root;
    this.#media = matchMedia("(prefers-color-scheme: dark)");
    this.#theme = this.#resolveInitial();
    this.#render(this.#theme, /* persist */ false);

    // Spięcie wszystkich przełączników obecnych w DOM (header, hero, ...).
    for (const btn of document.querySelectorAll("[data-theme-toggle]")) {
      const onClick = () => this.toggle();
      btn.addEventListener("click", onClick);
      this.#disposers.add(() => btn.removeEventListener("click", onClick));
    }

    // Reakcja na zmianę preferencji systemu tylko gdy użytkownik nie wybrał ręcznie.
    const onScheme = (e) => { if (!this.#stored()) this.#render(e.matches ? "dark" : "light", false); };
    this.#media.addEventListener("change", onScheme);
    this.#disposers.add(() => this.#media.removeEventListener("change", onScheme));
  }

  get theme() { return this.#theme; }
  toggle() { this.#render(this.#theme === "dark" ? "light" : "dark", true); }
  set(theme) { if (theme === "dark" || theme === "light") this.#render(theme, true); }

  #stored() { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } }
  #resolveInitial() { return this.#stored() ?? (this.#media.matches ? "dark" : "light"); }

  #render(theme, persist) {
    this.#theme = theme;
    this.#root.setAttribute("data-theme", theme);
    if (persist) { try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* tryb prywatny */ } }

    // Aktualizacja ikon/etykiet wszystkich przełączników (dostępność).
    const icon = theme === "dark" ? "☀️" : "🌙";
    const label = theme === "dark" ? "Włącz tryb jasny" : "Włącz tryb ciemny";
    for (const btn of document.querySelectorAll("[data-theme-toggle]")) {
      btn.textContent = icon;
      btn.setAttribute("aria-label", label);
      btn.title = label;
    }
    document.dispatchEvent(new CustomEvent("fiwoj:themechange", { detail: { theme } }));
  }

  destroy() { for (const dispose of this.#disposers) dispose(); this.#disposers.clear(); }
}

export function initTheme() { return new ThemeManager(); }

if (document.readyState !== "loading") queueMicrotask(() => initTheme());
else document.addEventListener("DOMContentLoaded", () => initTheme(), { once: true });

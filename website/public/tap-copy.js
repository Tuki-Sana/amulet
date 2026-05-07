(function () {
  // ---- Styles ----
  const style = document.createElement('style');
  style.textContent = `
    #tap-copy-toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(0.5rem);
      background: rgba(15, 23, 42, 0.95);
      color: #c5a059;
      border: 1px solid rgba(197, 160, 89, 0.45);
      padding: 0.45rem 1.25rem;
      border-radius: 8px;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
      pointer-events: none;
      z-index: 99999;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }
    #tap-copy-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* Homepage mini-terminal: ブロック全体をタップ */
    .mini-terminal {
      cursor: copy;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .mini-terminal:hover {
      border-color: rgba(197, 160, 89, 0.35) !important;
    }
    .mini-terminal.tap-copied {
      border-color: rgba(197, 160, 89, 0.6) !important;
      box-shadow: 0 0 12px rgba(197, 160, 89, 0.15);
    }

    /* Starlight docs: 1行ずつタップ */
    .expressive-code .ec-line {
      cursor: copy;
      transition: background 0.1s ease;
    }
    .expressive-code .ec-line:hover {
      background: rgba(197, 160, 89, 0.07) !important;
    }
    .expressive-code .ec-line.tap-copied {
      background: rgba(197, 160, 89, 0.2) !important;
      transition: none;
    }
  `;
  document.head.appendChild(style);

  // ---- Toast ----
  let toast = null;
  let toastTimer = null;

  function showToast() {
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tap-copy-toast';
      toast.textContent = 'Copied!';
      toast.setAttribute('aria-live', 'polite');
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 1400);
  }

  // ---- Copy ----
  async function copyText(text, feedbackEl) {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      await navigator.clipboard.writeText(trimmed);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = trimmed;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove();
    }

    showToast();

    if (feedbackEl) {
      feedbackEl.classList.add('tap-copied');
      setTimeout(() => feedbackEl.classList.remove('tap-copied'), 500);
    }
  }

  function hasSelection() {
    const sel = window.getSelection();
    return sel && sel.toString().length > 0;
  }

  // ---- Setup ----
  function setup() {
    // Homepage mini-terminals: 1ブロック = 1コマンドなのでブロック全体
    document.querySelectorAll('.mini-terminal').forEach(el => {
      if (el.dataset.tapCopy) return;
      el.dataset.tapCopy = '1';
      el.addEventListener('click', () => {
        if (hasSelection()) return;
        const code = el.querySelector('code');
        if (code) copyText(code.innerText, el);
      });
    });

    // Starlight expressive-code: 1行ずつ
    document.querySelectorAll('.expressive-code .ec-line').forEach(el => {
      if (el.dataset.tapCopy) return;
      el.dataset.tapCopy = '1';
      el.addEventListener('click', () => {
        if (hasSelection()) return;
        const text = el.querySelector('.code')?.innerText ?? el.innerText;
        if (text.trim()) copyText(text, el);
      });
    });
  }

  setup();
  document.addEventListener('astro:page-load', setup);
})();

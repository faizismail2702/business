/**
 * Trackora UI helpers — toast, modal, table-render, formatters.
 */
(function (global) {
  'use strict';

  // ----- Toast --------------------------------------------------
  function ensureToastContainer() {
    let c = document.getElementById('tk-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'tk-toast-container';
      c.className = 'fixed top-4 right-4 z-[1000] flex flex-col gap-2';
      document.body.appendChild(c);
    }
    return c;
  }

  function toast(message, type) {
    const c = ensureToastContainer();
    type = type || 'info';
    const colors = {
      success: 'bg-emerald-600 text-white',
      error:   'bg-rose-600 text-white',
      info:    'bg-slate-800 text-white',
      warn:    'bg-amber-500 text-slate-900'
    };
    const el = document.createElement('div');
    el.className = 'tk-toast rounded-lg shadow-lg px-4 py-3 text-sm flex items-start gap-2 max-w-sm ' +
                   (colors[type] || colors.info);
    el.setAttribute('data-testid', 'toast-' + type);
    el.innerHTML =
      '<span class="font-medium">' + escapeHtml(String(message)) + '</span>' +
      '<button class="ml-auto opacity-70 hover:opacity-100" aria-label="Close">&times;</button>';
    el.querySelector('button').addEventListener('click', () => el.remove());
    c.appendChild(el);
    setTimeout(() => el.classList.add('opacity-0'), 3500);
    setTimeout(() => el.remove(), 4200);
  }

  // ----- Confirm dialog ----------------------------------------
  function confirmDialog(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 px-4';
      overlay.setAttribute('data-testid', 'confirm-dialog');
      overlay.innerHTML =
        '<div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border border-slate-200">' +
          '<h3 class="text-base font-semibold text-slate-900 mb-2">Konfirmasi</h3>' +
          '<p class="text-sm text-slate-600 mb-5">' + escapeHtml(message) + '</p>' +
          '<div class="flex justify-end gap-2">' +
            '<button data-act="cancel" class="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">Batal</button>' +
            '<button data-act="ok" class="px-3 py-1.5 text-sm rounded-md bg-rose-600 text-white hover:bg-rose-700">Hapus</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { overlay.remove(); resolve(false); }
      });
      overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => { overlay.remove(); resolve(false); });
      overlay.querySelector('[data-act="ok"]').addEventListener('click',     () => { overlay.remove(); resolve(true);  });
    });
  }

  // ----- Loading wrapper ---------------------------------------
  async function withLoading(button, fn) {
    const original = button ? button.innerHTML : null;
    if (button) {
      button.disabled = true;
      button.innerHTML =
        '<span class="inline-block h-4 w-4 mr-2 align-middle border-2 border-white/40 border-t-white rounded-full animate-spin"></span>' +
        'Memproses...';
    }
    try { return await fn(); }
    finally {
      if (button) { button.disabled = false; button.innerHTML = original; }
    }
  }

  // ----- Format helpers ----------------------------------------
  function formatMoney(n, settings) {
    settings = settings || {};
    const decimals = Number(settings.currencyDecimalPlaces || 0);
    const sym      = settings.currencySymbol || 'Rp';
    const ts       = settings.currencyThousandSeparator || '.';
    const ds       = settings.currencyDecimalSeparator  || ',';
    const num      = Number(n || 0);
    const fixed    = num.toFixed(decimals);
    const parts    = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ts);
    return sym + ' ' + parts.join(ds);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function badge(text, tone) {
    const tones = {
      green:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
      red:    'bg-rose-50 text-rose-700 ring-rose-200',
      blue:   'bg-sky-50 text-sky-700 ring-sky-200',
      slate:  'bg-slate-100 text-slate-700 ring-slate-200',
      amber:  'bg-amber-50 text-amber-700 ring-amber-200',
      indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200'
    };
    return '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ' +
           (tones[tone] || tones.slate) + '">' + escapeHtml(text) + '</span>';
  }

  global.TrackoraUI = {
    toast, confirmDialog, withLoading, formatMoney, escapeHtml, badge
  };
})(window);

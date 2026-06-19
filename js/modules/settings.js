/**
 * Settings page logic.
 */
(function () {
  'use strict';

  const FIELDS = [
    'companyName', 'companyEmail', 'companyPhone', 'companyAddress',
    'currencyCode', 'currencySymbol', 'currencyDecimalPlaces',
    'currencyThousandSeparator', 'currencyDecimalSeparator',
    'p2pApAccount', 'p2pGrniAccount', 'p2pBankAccount', 'p2pExpenseAccount'
  ];
  const TOGGLES = ['modulePtoP', 'moduleOtoC'];

  let state = {};
  let coa = [];

  function accountOptions(selectedId, types) {
    const filtered = coa.filter((c) => !(c.isActive === false || String(c.isActive) === 'false') &&
      (!types || types.indexOf(c.accountType) >= 0));
    return '<option value="">— Pilih Akun —</option>' +
      filtered.map((c) => `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${c.accountNumber} — ${c.accountName}</option>`).join('');
  }

  function populateP2PSelects() {
    document.getElementById('f-p2pApAccount').innerHTML      = accountOptions(state.p2pApAccount,      ['Liability']);
    document.getElementById('f-p2pGrniAccount').innerHTML    = accountOptions(state.p2pGrniAccount,    ['Liability']);
    document.getElementById('f-p2pBankAccount').innerHTML    = accountOptions(state.p2pBankAccount,    ['Asset']);
    document.getElementById('f-p2pExpenseAccount').innerHTML = accountOptions(state.p2pExpenseAccount, ['Expense', 'Other Expense']);
  }

  function readForm() {
    const out = {};
    FIELDS.forEach((k) => {
      const el = document.getElementById('f-' + k);
      if (el) out[k] = el.value;
    });
    TOGGLES.forEach((k) => {
      const el = document.getElementById('f-' + k);
      if (el) out[k] = el.checked ? 'true' : 'false';
    });
    return out;
  }

  function writeForm(s) {
    FIELDS.forEach((k) => {
      const el = document.getElementById('f-' + k);
      if (el && s[k] != null) el.value = s[k];
    });
    TOGGLES.forEach((k) => {
      const el = document.getElementById('f-' + k);
      if (el) el.checked = String(s[k]) === 'true';
    });
    // Live preview
    const prev = document.getElementById('currency-preview');
    if (prev) prev.textContent = TrackoraUI.formatMoney(1234567.89, s);
  }

  async function load() {
    try {
      const results = await Promise.all([TrackoraAPI.getSettings(), TrackoraAPI.getCOA()]);
      state = results[0];
      coa = results[1];
      populateP2PSelects();
      writeForm(state);
    } catch (e) {
      TrackoraUI.toast('Gagal memuat pengaturan: ' + e.message, 'error');
    }
  }

  async function save(ev) {
    ev.preventDefault();
    const btn = document.getElementById('btn-save-settings');
    const payload = readForm();
    await TrackoraUI.withLoading(btn, async () => {
      try {
        await TrackoraAPI.bulkSaveSettings(payload);
        state = payload;
        writeForm(state);
        TrackoraUI.toast('Pengaturan tersimpan.', 'success');
      } catch (e) {
        TrackoraUI.toast('Gagal menyimpan: ' + e.message, 'error');
      }
    });
  }

  function bindPreview() {
    ['currencySymbol', 'currencyDecimalPlaces',
     'currencyThousandSeparator', 'currencyDecimalSeparator'
    ].forEach((k) => {
      const el = document.getElementById('f-' + k);
      if (el) el.addEventListener('input', () => {
        const prev = document.getElementById('currency-preview');
        if (prev) prev.textContent = TrackoraUI.formatMoney(1234567.89, readForm());
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Trackora.mountShell({
      activeId: 'settings',
      title: 'Settings',
      subtitle: 'Profil perusahaan, format mata uang, dan modul aktif'
    });
    const form = document.getElementById('settings-form');
    if (form) form.addEventListener('submit', save);
    bindPreview();
    await load();
  });
})();

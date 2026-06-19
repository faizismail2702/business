/**
 * General Ledger page.
 */
(function () {
  'use strict';

  let coa = [];

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function populateAccounts() {
    const sel = document.getElementById('f-account');
    sel.innerHTML = '<option value="">— Pilih Akun —</option>' +
      coa.map((c) => `<option value="${c.id}">${TrackoraUI.escapeHtml(c.accountNumber + ' — ' + c.accountName)}</option>`).join('');
  }

  async function bootstrap() {
    try {
      coa = await TrackoraAPI.getCOA();
      populateAccounts();
    } catch (e) {
      TrackoraUI.toast('Gagal memuat COA: ' + e.message, 'error');
    }
  }

  async function loadGL() {
    const accountId = document.getElementById('f-account').value;
    const dateFrom  = document.getElementById('f-from').value;
    const dateTo    = document.getElementById('f-to').value;
    if (!accountId) { TrackoraUI.toast('Pilih akun terlebih dahulu.', 'warn'); return; }
    const btn = document.getElementById('btn-load-gl');
    await TrackoraUI.withLoading(btn, async () => {
      try {
        const data = await TrackoraAPI.getGeneralLedger({
          accountId: accountId,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined
        });
        renderGL(data);
      } catch (e) {
        TrackoraUI.toast('Gagal: ' + e.message, 'error');
      }
    });
  }

  function renderGL(data) {
    document.getElementById('gl-summary').classList.remove('hidden');
    document.getElementById('gl-opening').textContent      = fmt(data.opening);
    document.getElementById('gl-total-debit').textContent  = fmt(data.totalDebit);
    document.getElementById('gl-total-credit').textContent = fmt(data.totalCredit);
    document.getElementById('gl-closing').textContent      = fmt(data.closing);

    const tbody = document.getElementById('gl-tbody');
    const empty = document.getElementById('gl-empty');
    if (!data.lines || data.lines.length === 0) {
      tbody.innerHTML = '';
      empty.textContent = 'Tidak ada transaksi pada periode ini.';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    const openingRow = `
      <tr class="border-b border-slate-100 bg-slate-50">
        <td class="py-2 px-3 text-xs italic text-slate-500" colspan="6">Opening Balance</td>
        <td class="py-2 px-3 text-right font-mono text-slate-700 pr-4">${fmt(data.opening)}</td>
      </tr>`;
    tbody.innerHTML = openingRow + data.lines.map((l) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="py-2 px-3 text-slate-700">${TrackoraUI.escapeHtml(l.date)}</td>
        <td class="py-2 px-3 font-mono text-xs text-slate-700">${TrackoraUI.escapeHtml(l.entryNumber)}</td>
        <td class="py-2 px-3 text-slate-900">${TrackoraUI.escapeHtml(l.lineDescription || l.memo || '')}</td>
        <td class="py-2 px-3 text-xs text-slate-500">${TrackoraUI.escapeHtml(l.reference || '')}</td>
        <td class="py-2 px-3 text-right font-mono text-slate-700">${l.debit  ? fmt(l.debit)  : '—'}</td>
        <td class="py-2 px-3 text-right font-mono text-slate-700">${l.credit ? fmt(l.credit) : '—'}</td>
        <td class="py-2 px-3 text-right font-mono font-semibold text-slate-900 pr-4">${fmt(l.balance)}</td>
      </tr>`).join('');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Trackora.mountShell({
      activeId: 'general-ledger',
      title: 'General Ledger',
      subtitle: 'Buku besar per akun'
    });
    document.getElementById('btn-load-gl').addEventListener('click', loadGL);
    await bootstrap();
  });
})();

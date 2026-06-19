/**
 * Trial Balance page.
 */
(function () {
  'use strict';

  const TYPE_ORDER = [
    'Asset', 'Liability', 'Equity',
    'Income', 'Other Income',
    'Cost of Goods Sold', 'Expense', 'Other Expense'
  ];

  const TYPE_TONE = {
    'Asset': 'green', 'Liability': 'red', 'Equity': 'indigo',
    'Income': 'blue', 'Other Income': 'blue',
    'Cost of Goods Sold': 'amber', 'Expense': 'amber', 'Other Expense': 'amber'
  };

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  async function loadTB() {
    const asOf = document.getElementById('f-asOfDate').value;
    const btn = document.getElementById('btn-load-tb');
    await TrackoraUI.withLoading(btn, async () => {
      try {
        const data = await TrackoraAPI.getTrialBalance(asOf || undefined);
        render(data);
      } catch (e) {
        TrackoraUI.toast('Gagal: ' + e.message, 'error');
      }
    });
  }

  function render(data) {
    const tbody = document.getElementById('tb-tbody');
    const tfoot = document.getElementById('tb-tfoot');
    const empty = document.getElementById('tb-empty');
    const status = document.getElementById('tb-status');

    if (!data.rows || data.rows.length === 0) {
      tbody.innerHTML = '';
      tfoot.innerHTML = '';
      empty.textContent = 'Tidak ada saldo per tanggal ini.';
      empty.classList.remove('hidden');
      status.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    status.className = 'p-3 rounded-md text-sm ' +
      (data.balanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                     : 'bg-rose-50 text-rose-700 border border-rose-200');
    status.textContent = data.balanced
      ? `✓ Trial Balance seimbang (Total Debit = Total Credit = ${fmt(data.totals.debit)}).`
      : `✗ Tidak seimbang. Selisih: ${fmt(data.totals.debit - data.totals.credit)}.`;
    status.classList.remove('hidden');

    // Group by type for display.
    const groups = {};
    data.rows.forEach((r) => {
      const k = r.accountType || 'Other';
      (groups[k] = groups[k] || []).push(r);
    });

    let html = '';
    TYPE_ORDER.concat(Object.keys(groups).filter((k) => TYPE_ORDER.indexOf(k) < 0))
      .forEach((type) => {
        const rows = groups[type];
        if (!rows || rows.length === 0) return;
        const subD = rows.reduce((s, r) => s + r.debit, 0);
        const subC = rows.reduce((s, r) => s + r.credit, 0);
        html += `
          <tr class="bg-slate-50 border-y border-slate-200">
            <td colspan="3" class="py-1.5 px-3 text-xs uppercase tracking-wider font-semibold text-slate-600">
              ${TrackoraUI.badge(type, TYPE_TONE[type] || 'slate')}
            </td>
            <td class="py-1.5 px-3 text-right font-mono text-xs text-slate-500">${fmt(subD)}</td>
            <td class="py-1.5 px-3 text-right font-mono text-xs text-slate-500 pr-4">${fmt(subC)}</td>
          </tr>`;
        html += rows.map((r) => `
          <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="py-2 px-3 font-mono text-xs text-slate-700">${TrackoraUI.escapeHtml(r.accountNumber)}</td>
            <td class="py-2 px-3 text-slate-900">${TrackoraUI.escapeHtml(r.accountName)}</td>
            <td class="py-2 px-3 text-xs text-slate-500">${TrackoraUI.escapeHtml(r.accountType)}</td>
            <td class="py-2 px-3 text-right font-mono text-slate-700">${r.debit  ? fmt(r.debit)  : '—'}</td>
            <td class="py-2 px-3 text-right font-mono text-slate-700 pr-4">${r.credit ? fmt(r.credit) : '—'}</td>
          </tr>`).join('');
      });

    tbody.innerHTML = html;
    tfoot.innerHTML = `
      <tr class="bg-slate-900 text-white">
        <td colspan="3" class="py-2.5 px-3 text-right text-xs uppercase tracking-wider font-semibold">Total</td>
        <td class="py-2.5 px-3 text-right font-mono font-semibold">${fmt(data.totals.debit)}</td>
        <td class="py-2.5 px-3 text-right font-mono font-semibold pr-4">${fmt(data.totals.credit)}</td>
      </tr>`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Trackora.mountShell({
      activeId: 'trial-balance',
      title: 'Trial Balance',
      subtitle: 'Ringkasan saldo per akun'
    });
    document.getElementById('f-asOfDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('btn-load-tb').addEventListener('click', loadTB);
    await loadTB();
  });
})();

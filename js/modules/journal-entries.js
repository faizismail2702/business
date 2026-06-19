/**
 * Journal Entries page — list + form with multi-line editor.
 */
(function () {
  'use strict';

  let coa = [];
  let entries = [];
  let editingId = null;
  let editingStatus = null;

  // ---------- helpers --------------------------------------------
  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function activeCoa() {
    return coa.filter((c) => !(c.isActive === false || String(c.isActive) === 'false'));
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function statusBadge(s) {
    if (s === 'posted') return TrackoraUI.badge('Posted', 'green');
    if (s === 'void')   return TrackoraUI.badge('Void',   'red');
    return TrackoraUI.badge('Draft', 'amber');
  }

  // ---------- LIST -----------------------------------------------
  function renderList() {
    const tbody = document.getElementById('je-tbody');
    const empty = document.getElementById('je-empty');
    const filter = (document.getElementById('je-filter-status') || {}).value || '';
    const rows = filter ? entries.filter((e) => String(e.status) === filter) : entries.slice();
    if (rows.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = rows.map((r) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50" data-testid="je-row-${TrackoraUI.escapeHtml(r.id)}">
        <td class="py-2.5 px-3 font-mono text-xs text-slate-700">${TrackoraUI.escapeHtml(r.entryNumber)}</td>
        <td class="py-2.5 px-3 text-slate-700">${TrackoraUI.escapeHtml(r.date)}</td>
        <td class="py-2.5 px-3 text-slate-900">${TrackoraUI.escapeHtml(r.memo || '')}</td>
        <td class="py-2.5 px-3 text-xs text-slate-500">${TrackoraUI.escapeHtml(r.reference || '')}</td>
        <td class="py-2.5 px-3 text-right font-mono text-slate-700">${fmt(r.totalDebit)}</td>
        <td class="py-2.5 px-3 text-right font-mono text-slate-700">${fmt(r.totalCredit)}</td>
        <td class="py-2.5 px-3">${statusBadge(r.status)}</td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">
          <button data-act="view" data-id="${TrackoraUI.escapeHtml(r.id)}"
                  data-testid="je-view-${TrackoraUI.escapeHtml(r.id)}"
                  class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100">${r.status === 'draft' ? 'Edit' : 'Lihat'}</button>
          ${r.status === 'draft' ? `
            <button data-act="post" data-id="${TrackoraUI.escapeHtml(r.id)}"
                    data-testid="je-post-${TrackoraUI.escapeHtml(r.id)}"
                    class="text-xs text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded hover:bg-emerald-50">Post</button>` : ''}
          ${r.status === 'posted' ? `
            <button data-act="void" data-id="${TrackoraUI.escapeHtml(r.id)}"
                    data-testid="je-void-${TrackoraUI.escapeHtml(r.id)}"
                    class="text-xs text-amber-700 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-50">Void</button>` : ''}
          ${r.status === 'draft' ? `
            <button data-act="del" data-id="${TrackoraUI.escapeHtml(r.id)}"
                    data-testid="je-del-${TrackoraUI.escapeHtml(r.id)}"
                    class="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50">Hapus</button>` : ''}
        </td>
      </tr>`).join('');
  }

  async function loadList() {
    try {
      const [c, j] = await Promise.all([TrackoraAPI.getCOA(), TrackoraAPI.getJournals()]);
      coa = c; entries = j;
      renderList();
    } catch (e) {
      TrackoraUI.toast('Gagal memuat: ' + e.message, 'error');
    }
  }

  // ---------- FORM -----------------------------------------------
  function showView(which) {
    document.getElementById('je-list-view').classList.toggle('hidden', which !== 'list');
    document.getElementById('je-form-view').classList.toggle('hidden', which !== 'form');
  }

  function accountOptions(selectedId) {
    return '<option value="">— Pilih Akun —</option>' +
      activeCoa().map((c) =>
        `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${TrackoraUI.escapeHtml(c.accountNumber + ' — ' + c.accountName)}</option>`
      ).join('');
  }

  function lineRowHtml(line, idx) {
    const readOnly = editingStatus === 'posted' || editingStatus === 'void';
    const dis = readOnly ? 'disabled' : '';
    return `
      <tr class="border-b border-slate-100" data-testid="je-line-${idx}">
        <td class="py-2 px-3 text-xs text-slate-500">${idx + 1}</td>
        <td class="py-2 px-3">
          <select class="tk-select line-account" data-field="accountId" ${dis}>${accountOptions(line.accountId)}</select>
        </td>
        <td class="py-2 px-3">
          <input class="tk-input line-desc" data-field="description" value="${TrackoraUI.escapeHtml(line.description || '')}" ${dis} />
        </td>
        <td class="py-2 px-3">
          <input class="tk-input text-right font-mono line-amt" data-field="debit"  type="number" step="0.01" min="0"
                 value="${Number(line.debit || 0) || ''}" ${dis} />
        </td>
        <td class="py-2 px-3">
          <input class="tk-input text-right font-mono line-amt" data-field="credit" type="number" step="0.01" min="0"
                 value="${Number(line.credit || 0) || ''}" ${dis} />
        </td>
        <td class="py-2 px-3 text-center">
          ${readOnly ? '' : `<button type="button" class="text-rose-500 hover:text-rose-700 text-xs btn-remove-line" data-testid="btn-remove-line-${idx}">✕</button>`}
        </td>
      </tr>`;
  }

  function renderLines(lines) {
    const tbody = document.getElementById('je-lines-tbody');
    tbody.innerHTML = lines.map((l, i) => lineRowHtml(l, i)).join('');
    recalcTotals();
  }

  function readLines() {
    const rows = document.querySelectorAll('#je-lines-tbody tr');
    return Array.from(rows).map((tr) => ({
      accountId:   tr.querySelector('[data-field="accountId"]').value,
      description: tr.querySelector('[data-field="description"]').value,
      debit:  Number(tr.querySelector('[data-field="debit"]').value  || 0),
      credit: Number(tr.querySelector('[data-field="credit"]').value || 0)
    }));
  }

  function recalcTotals() {
    const lines = readLines();
    const td = lines.reduce((s, l) => s + l.debit,  0);
    const tc = lines.reduce((s, l) => s + l.credit, 0);
    document.getElementById('je-total-debit').textContent  = fmt(td);
    document.getElementById('je-total-credit').textContent = fmt(tc);
    const diff = td - tc;
    const diffEl = document.getElementById('je-diff');
    diffEl.textContent = fmt(diff);
    diffEl.className = 'py-2 px-3 text-right font-mono text-sm ' +
      (Math.abs(diff) < 0.0001 ? 'text-emerald-600' : 'text-rose-600');
  }

  function openForm(je) {
    editingId = je ? je.id : null;
    editingStatus = je ? je.status : null;

    document.getElementById('je-form-title').textContent = je
      ? (je.status === 'draft' ? 'Edit Journal Entry' : 'Detail Journal Entry')
      : 'Journal Entry Baru';
    document.getElementById('je-form-meta').textContent = je
      ? `${je.entryNumber || ''} — ${je.status.toUpperCase()}`
      : '';

    document.getElementById('f-date').value = je ? je.date : todayISO();
    document.getElementById('f-memo').value = je ? (je.memo || '') : '';
    document.getElementById('f-reference').value = je ? (je.reference || '') : '';

    document.getElementById('f-date').disabled =
    document.getElementById('f-memo').disabled =
    document.getElementById('f-reference').disabled =
      (editingStatus === 'posted' || editingStatus === 'void');

    const isReadOnly = editingStatus === 'posted' || editingStatus === 'void';
    document.getElementById('btn-save-draft').classList.toggle('hidden', isReadOnly);
    document.getElementById('btn-save-post').classList.toggle('hidden', isReadOnly);
    document.getElementById('btn-add-line').classList.toggle('hidden', isReadOnly);

    const lines = (je && je.lines && je.lines.length) ? je.lines : [
      { accountId: '', description: '', debit: 0, credit: 0 },
      { accountId: '', description: '', debit: 0, credit: 0 }
    ];
    renderLines(lines);
    showView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addLine() {
    const tbody = document.getElementById('je-lines-tbody');
    const idx = tbody.querySelectorAll('tr').length;
    tbody.insertAdjacentHTML('beforeend', lineRowHtml({ accountId: '', description: '', debit: 0, credit: 0 }, idx));
    recalcTotals();
  }

  async function saveJournal(asPosted) {
    const payload = {
      id: editingId || undefined,
      date: document.getElementById('f-date').value,
      memo: document.getElementById('f-memo').value.trim(),
      reference: document.getElementById('f-reference').value.trim(),
      lines: readLines().filter((l) => l.accountId || l.debit > 0 || l.credit > 0),
      status: asPosted ? 'posted' : 'draft'
    };
    if (!payload.date) { TrackoraUI.toast('Tanggal wajib diisi.', 'warn'); return; }
    if (payload.lines.length < 2) {
      TrackoraUI.toast('Minimal 2 baris yang terisi.', 'warn');
      return;
    }
    const btn = document.getElementById(asPosted ? 'btn-save-post' : 'btn-save-draft');
    await TrackoraUI.withLoading(btn, async () => {
      try {
        await TrackoraAPI.saveJournal(payload);
        TrackoraUI.toast(asPosted ? 'Journal entry diposting.' : 'Draft tersimpan.', 'success');
        showView('list');
        await loadList();
      } catch (e) {
        TrackoraUI.toast('Gagal: ' + e.message, 'error');
      }
    });
  }

  // ---------- ACTIONS --------------------------------------------
  async function viewEntry(id) {
    try {
      const je = await TrackoraAPI.getJournal(id);
      openForm(je);
    } catch (e) {
      TrackoraUI.toast('Gagal memuat entry: ' + e.message, 'error');
    }
  }

  async function postEntry(id) {
    const ok = await TrackoraUI.confirmDialog('Posting entry ini? Setelah diposting tidak bisa diedit.');
    if (!ok) return;
    try {
      await TrackoraAPI.postJournal(id);
      TrackoraUI.toast('Entry diposting.', 'success');
      await loadList();
    } catch (e) { TrackoraUI.toast('Gagal post: ' + e.message, 'error'); }
  }

  async function voidEntry(id) {
    const ok = await TrackoraUI.confirmDialog('Batalkan (void) entry ini? Tidak akan masuk GL/Trial Balance.');
    if (!ok) return;
    try {
      await TrackoraAPI.voidJournal(id);
      TrackoraUI.toast('Entry di-void.', 'success');
      await loadList();
    } catch (e) { TrackoraUI.toast('Gagal void: ' + e.message, 'error'); }
  }

  async function deleteEntry(id) {
    const ok = await TrackoraUI.confirmDialog('Hapus draft ini secara permanen?');
    if (!ok) return;
    try {
      await TrackoraAPI.deleteJournal(id);
      TrackoraUI.toast('Draft dihapus.', 'success');
      await loadList();
    } catch (e) { TrackoraUI.toast('Gagal hapus: ' + e.message, 'error'); }
  }

  // ---------- BINDINGS -------------------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    await Trackora.mountShell({
      activeId: 'journal-entries',
      title: 'Journal Entries',
      subtitle: 'Pencatatan jurnal umum (debit = credit)'
    });

    document.getElementById('btn-new-je').addEventListener('click', () => openForm(null));
    document.getElementById('btn-back-list').addEventListener('click', () => showView('list'));
    document.getElementById('btn-add-line').addEventListener('click', addLine);
    document.getElementById('btn-save-draft').addEventListener('click', () => saveJournal(false));
    document.getElementById('je-form').addEventListener('submit', (e) => { e.preventDefault(); saveJournal(true); });
    document.getElementById('je-filter-status').addEventListener('change', renderList);

    document.getElementById('je-lines-tbody').addEventListener('input', (e) => {
      if (e.target.matches('.line-amt')) recalcTotals();
    });
    document.getElementById('je-lines-tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-line');
      if (!btn) return;
      const tr = btn.closest('tr');
      if (document.querySelectorAll('#je-lines-tbody tr').length <= 2) {
        TrackoraUI.toast('Minimal 2 baris.', 'warn'); return;
      }
      tr.remove();
      // re-number
      document.querySelectorAll('#je-lines-tbody tr').forEach((row, i) => {
        row.cells[0].textContent = i + 1;
      });
      recalcTotals();
    });

    document.getElementById('je-tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = btn.dataset.id;
      switch (btn.dataset.act) {
        case 'view': viewEntry(id); break;
        case 'post': postEntry(id); break;
        case 'void': voidEntry(id); break;
        case 'del':  deleteEntry(id); break;
      }
    });

    await loadList();
  });
})();

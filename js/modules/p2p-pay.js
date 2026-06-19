/**
 * Vendor Payments page — pays one or more AP Invoices.
 */
(function () {
  'use strict';

  let payments = [];
  let openInvoices = [];
  let entities = [];
  let coa = [];
  let editingId = null;
  let editingStatus = null;

  function fmt(n) { return P2P.fmt(n); }

  // ---------- LIST ----------
  function renderList() {
    const tbody = document.getElementById('pay-tbody');
    const empty = document.getElementById('pay-empty');
    const f = document.getElementById('pay-filter-status').value;
    const rows = f ? payments.filter((p) => String(p.status) === f) : payments.slice();
    if (rows.length === 0) {
      tbody.innerHTML = ''; empty.classList.remove('hidden'); return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = rows.map((r) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50" data-testid="pay-row-${TrackoraUI.escapeHtml(r.id)}">
        <td class="py-2.5 px-3 font-mono text-xs text-slate-700">${TrackoraUI.escapeHtml(r.docNumber)}</td>
        <td class="py-2.5 px-3 text-slate-700">${TrackoraUI.escapeHtml(r.date)}</td>
        <td class="py-2.5 px-3 text-slate-900">${TrackoraUI.escapeHtml(P2P.vendorLabel(entities, r.vendorId))}</td>
        <td class="py-2.5 px-3 text-xs text-slate-500">${TrackoraUI.escapeHtml(P2P.accountLabel(coa, r.bankAccountId))}</td>
        <td class="py-2.5 px-3 text-xs text-slate-500">${TrackoraUI.escapeHtml(r.memo || '')}</td>
        <td class="py-2.5 px-3 text-right font-mono text-slate-700">${fmt(r.total)}</td>
        <td class="py-2.5 px-3">${P2P.statusBadge(r.status)}</td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">
          <button data-act="view" data-id="${TrackoraUI.escapeHtml(r.id)}"
                  data-testid="pay-view-${TrackoraUI.escapeHtml(r.id)}"
                  class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100">${r.status === 'draft' ? 'Edit' : 'Lihat'}</button>
          ${r.status === 'draft' ? `
            <button data-act="post" data-id="${TrackoraUI.escapeHtml(r.id)}"
                    data-testid="pay-post-${TrackoraUI.escapeHtml(r.id)}"
                    class="text-xs text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded hover:bg-emerald-50">Post</button>
            <button data-act="del" data-id="${TrackoraUI.escapeHtml(r.id)}"
                    data-testid="pay-del-${TrackoraUI.escapeHtml(r.id)}"
                    class="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50">Hapus</button>` : ''}
          ${r.status === 'posted' ? `
            <button data-act="void" data-id="${TrackoraUI.escapeHtml(r.id)}"
                    data-testid="pay-void-${TrackoraUI.escapeHtml(r.id)}"
                    class="text-xs text-amber-700 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-50">Void</button>` : ''}
        </td>
      </tr>`).join('');
  }

  async function loadList() {
    try {
      const results = await Promise.all([
        TrackoraAPI.getPayments(),
        TrackoraAPI.getOpenAPInvoices(),
        TrackoraAPI.getEntities(),
        TrackoraAPI.getCOA()
      ]);
      payments = results[0];
      openInvoices = results[1];
      entities = results[2];
      coa = results[3];
      renderList();
    } catch (e) { TrackoraUI.toast('Gagal memuat: ' + e.message, 'error'); }
  }

  // ---------- FORM ----------
  function showView(which) {
    document.getElementById('list-view').classList.toggle('hidden', which !== 'list');
    document.getElementById('form-view').classList.toggle('hidden', which !== 'form');
  }

  function populateVendor(selectedId) {
    document.getElementById('f-vendorId').innerHTML = P2P.vendorOptions(entities, selectedId);
  }

  function populateBank(selectedId) {
    document.getElementById('f-bankAccountId').innerHTML = P2P.accountOptions(coa, selectedId, ['Asset']);
  }

  function invoiceOptionsForVendor(vendorId, selectedId) {
    const opts = openInvoices.filter((i) => !vendorId || String(i.vendorId) === String(vendorId));
    return '<option value="">— Pilih Invoice —</option>' + opts.map((i) => {
      const open = Number(i.total || 0) - Number(i.paidAmount || 0);
      return `<option value="${i.id}" data-open="${open}" ${String(i.id) === String(selectedId) ? 'selected' : ''}>${TrackoraUI.escapeHtml(i.docNumber + ' — ' + i.date + ' — Sisa ' + fmt(open))}</option>`;
    }).join('');
  }

  function payLineRowHtml(line, idx) {
    const vendorId = document.getElementById('f-vendorId').value;
    const ro = editingStatus === 'posted' || editingStatus === 'void';
    const dis = ro ? 'disabled' : '';
    return `
      <tr class="border-b border-slate-100" data-testid="pay-line-${idx}">
        <td class="py-2 px-3 text-xs text-slate-500">${idx + 1}</td>
        <td class="py-2 px-3"><select class="tk-select pay-line-field" data-field="apInvoiceId" ${dis}>${invoiceOptionsForVendor(vendorId, line.apInvoiceId)}</select></td>
        <td class="py-2 px-3 text-right font-mono pay-line-open" data-line-open>—</td>
        <td class="py-2 px-3"><input class="tk-input text-right font-mono pay-line-field pay-line-amt" data-field="amount" type="number" step="0.01" min="0" value="${Number(line.amount || 0) || ''}" ${dis} /></td>
        <td class="py-2 px-3"><input class="tk-input pay-line-field" data-field="notes" value="${TrackoraUI.escapeHtml(line.notes || '')}" ${dis} /></td>
        <td class="py-2 px-3 text-center">${ro ? '' : `<button type="button" class="text-rose-500 hover:text-rose-700 text-xs btn-remove-pay-line" data-testid="btn-remove-pay-line-${idx}">✕</button>`}</td>
      </tr>`;
  }

  function refreshOpenColumns() {
    Array.from(document.querySelectorAll('#pay-lines-tbody tr')).forEach((tr) => {
      const sel = tr.querySelector('[data-field="apInvoiceId"]');
      const opt = sel.selectedOptions[0];
      const open = opt && opt.dataset.open ? Number(opt.dataset.open) : 0;
      tr.querySelector('[data-line-open]').textContent = sel.value ? fmt(open) : '—';
    });
  }

  function recalcTotal() {
    const rows = document.querySelectorAll('#pay-lines-tbody tr');
    let t = 0;
    rows.forEach((tr) => { t += Number(tr.querySelector('[data-field="amount"]').value || 0); });
    document.getElementById('pay-total').textContent = fmt(t);
  }

  function renderLines(lines) {
    const tbody = document.getElementById('pay-lines-tbody');
    tbody.innerHTML = lines.map((l, i) => payLineRowHtml(l, i)).join('');
    refreshOpenColumns();
    recalcTotal();
  }

  async function openForm(pay) {
    editingId = pay ? pay.id : null;
    editingStatus = pay ? pay.status : null;
    const ro = editingStatus === 'posted' || editingStatus === 'void';

    document.getElementById('pay-form-title').textContent = pay
      ? (ro ? 'Detail Payment' : 'Edit Payment') : 'Vendor Payment Baru';
    document.getElementById('pay-form-meta').textContent = pay
      ? (pay.docNumber + ' — ' + String(pay.status).toUpperCase()) : '';

    populateVendor(pay ? pay.vendorId : '');
    populateBank(pay ? pay.bankAccountId : '');
    document.getElementById('f-date').value = pay ? pay.date : P2P.todayISO();
    document.getElementById('f-memo').value = pay ? (pay.memo || '') : '';
    document.getElementById('f-reference').value = pay ? (pay.reference || '') : '';

    ['f-vendorId','f-bankAccountId','f-date','f-memo','f-reference'].forEach((id) => {
      document.getElementById(id).disabled = ro;
    });
    document.getElementById('btn-save-draft').classList.toggle('hidden', ro);
    document.getElementById('btn-save-post').classList.toggle('hidden', ro);
    document.getElementById('btn-add-pay-line').classList.toggle('hidden', ro);

    // For posted payments, fetch full doc with lines.
    let lines = pay && pay.lines ? pay.lines : [{ apInvoiceId: '', amount: 0, notes: '' }];
    renderLines(lines);
    showView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function readLines() {
    return Array.from(document.querySelectorAll('#pay-lines-tbody tr')).map((tr) => ({
      apInvoiceId: tr.querySelector('[data-field="apInvoiceId"]').value,
      amount: Number(tr.querySelector('[data-field="amount"]').value || 0),
      notes: tr.querySelector('[data-field="notes"]').value
    }));
  }

  function addLine() {
    const tbody = document.getElementById('pay-lines-tbody');
    const idx = tbody.querySelectorAll('tr').length;
    tbody.insertAdjacentHTML('beforeend', payLineRowHtml({ apInvoiceId: '', amount: 0, notes: '' }, idx));
    refreshOpenColumns();
    recalcTotal();
  }

  async function save(asPosted) {
    const payload = {
      id: editingId || undefined,
      date: document.getElementById('f-date').value,
      vendorId: document.getElementById('f-vendorId').value,
      bankAccountId: document.getElementById('f-bankAccountId').value,
      memo: document.getElementById('f-memo').value,
      reference: document.getElementById('f-reference').value,
      lines: readLines().filter((l) => l.apInvoiceId && l.amount > 0)
    };
    if (!payload.date)     { TrackoraUI.toast('Tanggal wajib.', 'warn'); return; }
    if (!payload.vendorId) { TrackoraUI.toast('Vendor wajib.', 'warn'); return; }
    if (payload.lines.length === 0) { TrackoraUI.toast('Minimal 1 invoice diisi.', 'warn'); return; }
    const btn = document.getElementById(asPosted ? 'btn-save-post' : 'btn-save-draft');
    await TrackoraUI.withLoading(btn, async () => {
      try {
        const saved = await TrackoraAPI.savePayment(payload);
        if (asPosted) {
          await TrackoraAPI.postPayment(saved.id);
          TrackoraUI.toast('Payment diposting.', 'success');
        } else {
          TrackoraUI.toast('Draft tersimpan.', 'success');
        }
        showView('list');
        await loadList();
      } catch (e) { TrackoraUI.toast('Gagal: ' + e.message, 'error'); }
    });
  }

  // ---------- ACTIONS ----------
  async function viewPay(id) {
    try {
      const pay = await TrackoraAPI.getPayment(id);
      // For posted/void payments, also fetch closed invoices to label them.
      if (editingStatus !== 'draft') await loadList();
      await openForm(pay);
    } catch (e) { TrackoraUI.toast('Gagal: ' + e.message, 'error'); }
  }

  async function postPay(id) {
    const ok = await TrackoraUI.confirmDialog('Post payment ini? Akan generate journal entry.');
    if (!ok) return;
    try {
      await TrackoraAPI.postPayment(id);
      TrackoraUI.toast('Payment diposting.', 'success');
      await loadList();
    } catch (e) { TrackoraUI.toast('Gagal: ' + e.message, 'error'); }
  }

  async function voidPay(id) {
    const ok = await TrackoraUI.confirmDialog('Void payment ini? Journal & paid amount akan direverse.');
    if (!ok) return;
    try {
      await TrackoraAPI.voidPayment(id);
      TrackoraUI.toast('Payment di-void.', 'success');
      await loadList();
    } catch (e) { TrackoraUI.toast('Gagal: ' + e.message, 'error'); }
  }

  async function deletePay(id) {
    const ok = await TrackoraUI.confirmDialog('Hapus draft payment ini?');
    if (!ok) return;
    try {
      await TrackoraAPI.deletePayment(id);
      TrackoraUI.toast('Draft dihapus.', 'success');
      await loadList();
    } catch (e) { TrackoraUI.toast('Gagal: ' + e.message, 'error'); }
  }

  // ---------- BINDINGS ----------
  document.addEventListener('DOMContentLoaded', async () => {
    await Trackora.mountShell({
      activeId: 'p2p-pay', title: 'Vendor Payments',
      subtitle: 'Pembayaran ke vendor (kas keluar)'
    });

    document.getElementById('btn-new-pay').addEventListener('click', () => openForm(null));
    document.getElementById('btn-back-list').addEventListener('click', () => showView('list'));
    document.getElementById('btn-add-pay-line').addEventListener('click', addLine);
    document.getElementById('btn-save-draft').addEventListener('click', () => save(false));
    document.getElementById('btn-save-post').addEventListener('click', () => save(true));
    document.getElementById('pay-filter-status').addEventListener('change', renderList);

    document.getElementById('f-vendorId').addEventListener('change', () => {
      // Refresh invoice options for all line rows.
      Array.from(document.querySelectorAll('#pay-lines-tbody tr')).forEach((tr) => {
        const sel = tr.querySelector('[data-field="apInvoiceId"]');
        const cur = sel.value;
        sel.innerHTML = invoiceOptionsForVendor(document.getElementById('f-vendorId').value, cur);
      });
      refreshOpenColumns();
    });

    const lt = document.getElementById('pay-lines-tbody');
    lt.addEventListener('change', (e) => {
      if (e.target.matches('[data-field="apInvoiceId"]')) {
        const tr = e.target.closest('tr');
        const opt = e.target.selectedOptions[0];
        const open = opt && opt.dataset.open ? Number(opt.dataset.open) : 0;
        tr.querySelector('[data-line-open]').textContent = e.target.value ? fmt(open) : '—';
        // Auto-fill amount with full open balance if empty.
        const amtEl = tr.querySelector('[data-field="amount"]');
        if (!Number(amtEl.value) && open > 0) amtEl.value = open.toFixed(2);
        recalcTotal();
      }
    });
    lt.addEventListener('input', (e) => {
      if (e.target.matches('.pay-line-amt')) recalcTotal();
    });
    lt.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-pay-line');
      if (!btn) return;
      if (document.querySelectorAll('#pay-lines-tbody tr').length <= 1) {
        TrackoraUI.toast('Minimal 1 baris.', 'warn'); return;
      }
      btn.closest('tr').remove();
      P2P.reNumberRows(lt);
      recalcTotal();
    });

    document.getElementById('pay-tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = btn.dataset.id;
      switch (btn.dataset.act) {
        case 'view': viewPay(id); break;
        case 'post': postPay(id); break;
        case 'void': voidPay(id); break;
        case 'del':  deletePay(id); break;
      }
    });

    await loadList();
  });
})();

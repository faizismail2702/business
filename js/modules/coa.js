/**
 * Chart of Accounts (COA) page logic.
 */
(function () {
  'use strict';

  let rows = [];
  let editingId = null;

  const TYPE_TONE = {
    'Asset': 'green', 'Liability': 'red', 'Equity': 'indigo',
    'Income': 'blue', 'Expense': 'amber',
    'Cost of Goods Sold': 'amber', 'Other Income': 'blue', 'Other Expense': 'amber'
  };

  function populateTypeOptions() {
    const sel = document.getElementById('f-accountType');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Pilih Type —</option>' +
      TRACKORA_CONFIG.ACCOUNT_TYPES.map((t) => '<option value="' + t + '">' + t + '</option>').join('');
  }

  function render() {
    const tbody = document.getElementById('coa-tbody');
    const empty = document.getElementById('coa-empty');
    const search = (document.getElementById('coa-search') || {}).value || '';
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => !q || (
      String(r.accountNumber).toLowerCase().includes(q) ||
      String(r.accountName).toLowerCase().includes(q) ||
      String(r.accountType).toLowerCase().includes(q)
    ));

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = filtered.map((r) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50" data-testid="coa-row-${TrackoraUI.escapeHtml(r.id)}">
        <td class="py-2.5 px-3 font-mono text-xs text-slate-700">${TrackoraUI.escapeHtml(r.accountNumber)}</td>
        <td class="py-2.5 px-3 text-slate-900 font-medium">${TrackoraUI.escapeHtml(r.accountName)}</td>
        <td class="py-2.5 px-3">${TrackoraUI.badge(r.accountType, TYPE_TONE[r.accountType] || 'slate')}</td>
        <td class="py-2.5 px-3 text-xs text-slate-500">${TrackoraUI.escapeHtml(r.description || '')}</td>
        <td class="py-2.5 px-3">
          ${r.isActive === false || String(r.isActive) === 'false'
            ? TrackoraUI.badge('Inactive', 'slate')
            : TrackoraUI.badge('Active', 'green')}
        </td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">
          <button data-act="edit" data-id="${TrackoraUI.escapeHtml(r.id)}"
                  data-testid="coa-edit-${TrackoraUI.escapeHtml(r.id)}"
                  class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100">Edit</button>
          <button data-act="del" data-id="${TrackoraUI.escapeHtml(r.id)}"
                  data-testid="coa-del-${TrackoraUI.escapeHtml(r.id)}"
                  class="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50">Hapus</button>
        </td>
      </tr>`).join('');
  }

  async function load() {
    try {
      rows = await TrackoraAPI.getCOA();
      render();
    } catch (e) {
      TrackoraUI.toast('Gagal memuat COA: ' + e.message, 'error');
    }
  }

  function resetForm() {
    editingId = null;
    document.getElementById('coa-form').reset();
    document.getElementById('coa-form-title').textContent = 'Tambah Akun';
    document.getElementById('btn-cancel-edit').classList.add('hidden');
  }

  function fillForm(row) {
    editingId = row.id;
    document.getElementById('f-accountNumber').value = row.accountNumber || '';
    document.getElementById('f-accountName').value   = row.accountName   || '';
    document.getElementById('f-accountType').value   = row.accountType   || '';
    document.getElementById('f-description').value   = row.description   || '';
    document.getElementById('f-isActive').checked =
      !(row.isActive === false || String(row.isActive) === 'false');
    document.getElementById('coa-form-title').textContent = 'Edit Akun';
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const btn = document.getElementById('btn-save-coa');
    const payload = {
      id: editingId || undefined,
      accountNumber: document.getElementById('f-accountNumber').value.trim(),
      accountName:   document.getElementById('f-accountName').value.trim(),
      accountType:   document.getElementById('f-accountType').value,
      description:   document.getElementById('f-description').value.trim(),
      isActive:      document.getElementById('f-isActive').checked
    };
    if (!payload.accountNumber || !payload.accountName || !payload.accountType) {
      TrackoraUI.toast('Account Number, Name & Type wajib diisi.', 'warn');
      return;
    }
    await TrackoraUI.withLoading(btn, async () => {
      try {
        await TrackoraAPI.saveCOA(payload);
        TrackoraUI.toast(editingId ? 'Akun diperbarui.' : 'Akun ditambahkan.', 'success');
        resetForm();
        await load();
      } catch (e) {
        TrackoraUI.toast('Gagal menyimpan: ' + e.message, 'error');
      }
    });
  }

  function onTableClick(ev) {
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    const row = rows.find((r) => String(r.id) === String(id));
    if (!row) return;
    if (act === 'edit') fillForm(row);
    if (act === 'del') {
      TrackoraUI.confirmDialog(`Hapus akun "${row.accountName}"?`).then(async (ok) => {
        if (!ok) return;
        try {
          await TrackoraAPI.deleteCOA(id);
          TrackoraUI.toast('Akun dihapus.', 'success');
          await load();
        } catch (e) {
          TrackoraUI.toast('Gagal menghapus: ' + e.message, 'error');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Trackora.mountShell({
      activeId: 'master-coa',
      title: 'Chart of Accounts',
      subtitle: 'Struktur akun buku besar perusahaan'
    });
    populateTypeOptions();
    document.getElementById('coa-form').addEventListener('submit', onSubmit);
    document.getElementById('btn-cancel-edit').addEventListener('click', resetForm);
    document.getElementById('coa-tbody').addEventListener('click', onTableClick);
    document.getElementById('coa-search').addEventListener('input', render);
    await load();
  });
})();

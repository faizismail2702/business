/**
 * Items page logic.
 */
(function () {
  'use strict';

  let items = [];
  let coa = [];
  let editingId = null;

  function populateSelects() {
    const typeSel = document.getElementById('f-type');
    typeSel.innerHTML = TRACKORA_CONFIG.ITEM_TYPES.map(
      (t) => `<option value="${t}">${t}</option>`
    ).join('');

    const costSel = document.getElementById('f-costingMethod');
    costSel.innerHTML = TRACKORA_CONFIG.COSTING_METHODS.map(
      (t) => `<option value="${t}">${t}</option>`
    ).join('');

    const filterByType = (types) => coa
      .filter((c) => types.indexOf(c.accountType) >= 0 &&
                     !(c.isActive === false || String(c.isActive) === 'false'))
      .map((c) => `<option value="${c.id}">${TrackoraUI.escapeHtml(c.accountNumber + ' — ' + c.accountName)}</option>`)
      .join('');

    document.getElementById('f-incomeAccount').innerHTML =
      '<option value="">— Pilih —</option>' + filterByType(['Income', 'Other Income']);
    document.getElementById('f-assetAccount').innerHTML =
      '<option value="">— Pilih —</option>' + filterByType(['Asset']);
    document.getElementById('f-cogsAccount').innerHTML =
      '<option value="">— Pilih —</option>' + filterByType(['Cost of Goods Sold', 'Expense']);
  }

  function onTypeChange() {
    const type = document.getElementById('f-type').value;
    const isInv = type === 'Inventory';
    document.getElementById('inv-only').classList.toggle('hidden', !isInv);
  }

  function coaLabel(id) {
    const c = coa.find((x) => String(x.id) === String(id));
    return c ? (c.accountNumber + ' — ' + c.accountName) : '';
  }

  function render() {
    const tbody = document.getElementById('items-tbody');
    const empty = document.getElementById('items-empty');
    const q = ((document.getElementById('items-search') || {}).value || '').trim().toLowerCase();
    const filtered = items.filter((r) => !q || (
      String(r.sku).toLowerCase().includes(q) ||
      String(r.name).toLowerCase().includes(q) ||
      String(r.type).toLowerCase().includes(q)
    ));
    if (filtered.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = filtered.map((r) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50" data-testid="item-row-${TrackoraUI.escapeHtml(r.id)}">
        <td class="py-2.5 px-3 font-mono text-xs text-slate-700">${TrackoraUI.escapeHtml(r.sku)}</td>
        <td class="py-2.5 px-3 text-slate-900 font-medium">${TrackoraUI.escapeHtml(r.name)}</td>
        <td class="py-2.5 px-3">${TrackoraUI.badge(r.type, r.type === 'Inventory' ? 'blue' : 'slate')}</td>
        <td class="py-2.5 px-3 text-xs text-slate-600">${TrackoraUI.escapeHtml(r.costingMethod || '—')}</td>
        <td class="py-2.5 px-3 text-right text-slate-700">${Number(r.unitPrice||0).toLocaleString()}</td>
        <td class="py-2.5 px-3 text-right text-slate-700">${Number(r.cost||0).toLocaleString()}</td>
        <td class="py-2.5 px-3 text-xs text-slate-500">${TrackoraUI.escapeHtml(coaLabel(r.incomeAccount))}</td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">
          <button data-act="edit" data-id="${TrackoraUI.escapeHtml(r.id)}"
                  data-testid="item-edit-${TrackoraUI.escapeHtml(r.id)}"
                  class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100">Edit</button>
          <button data-act="del" data-id="${TrackoraUI.escapeHtml(r.id)}"
                  data-testid="item-del-${TrackoraUI.escapeHtml(r.id)}"
                  class="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50">Hapus</button>
        </td>
      </tr>`).join('');
  }

  async function load() {
    try {
      const [c, i] = await Promise.all([TrackoraAPI.getCOA(), TrackoraAPI.getItems()]);
      coa = c; items = i;
      populateSelects();
      onTypeChange();
      render();
    } catch (e) {
      TrackoraUI.toast('Gagal memuat data: ' + e.message, 'error');
    }
  }

  function resetForm() {
    editingId = null;
    document.getElementById('item-form').reset();
    document.getElementById('item-form-title').textContent = 'Tambah Item';
    document.getElementById('btn-cancel-edit').classList.add('hidden');
    onTypeChange();
  }

  function fillForm(r) {
    editingId = r.id;
    document.getElementById('f-sku').value = r.sku || '';
    document.getElementById('f-name').value = r.name || '';
    document.getElementById('f-type').value = r.type || 'Inventory';
    document.getElementById('f-costingMethod').value = r.costingMethod || 'Average';
    document.getElementById('f-unitPrice').value = r.unitPrice || 0;
    document.getElementById('f-cost').value = r.cost || 0;
    document.getElementById('f-incomeAccount').value = r.incomeAccount || '';
    document.getElementById('f-assetAccount').value = r.assetAccount || '';
    document.getElementById('f-cogsAccount').value = r.cogsAccount || '';
    document.getElementById('f-description').value = r.description || '';
    document.getElementById('f-isActive').checked =
      !(r.isActive === false || String(r.isActive) === 'false');
    document.getElementById('item-form-title').textContent = 'Edit Item';
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    onTypeChange();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const btn = document.getElementById('btn-save-item');
    const type = document.getElementById('f-type').value;
    const payload = {
      id: editingId || undefined,
      sku:  document.getElementById('f-sku').value.trim(),
      name: document.getElementById('f-name').value.trim(),
      type: type,
      costingMethod: type === 'Inventory' ? document.getElementById('f-costingMethod').value : '',
      unitPrice: Number(document.getElementById('f-unitPrice').value || 0),
      cost:      Number(document.getElementById('f-cost').value || 0),
      incomeAccount: document.getElementById('f-incomeAccount').value,
      assetAccount:  type === 'Inventory' ? document.getElementById('f-assetAccount').value : '',
      cogsAccount:   type === 'Inventory' ? document.getElementById('f-cogsAccount').value  : '',
      description:   document.getElementById('f-description').value.trim(),
      isActive: document.getElementById('f-isActive').checked
    };
    if (!payload.sku || !payload.name) {
      TrackoraUI.toast('SKU dan Nama Item wajib diisi.', 'warn');
      return;
    }
    await TrackoraUI.withLoading(btn, async () => {
      try {
        await TrackoraAPI.saveItem(payload);
        TrackoraUI.toast(editingId ? 'Item diperbarui.' : 'Item ditambahkan.', 'success');
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
    const row = items.find((r) => String(r.id) === String(id));
    if (!row) return;
    if (act === 'edit') fillForm(row);
    if (act === 'del') {
      TrackoraUI.confirmDialog(`Hapus item "${row.name}"?`).then(async (ok) => {
        if (!ok) return;
        try {
          await TrackoraAPI.deleteItem(id);
          TrackoraUI.toast('Item dihapus.', 'success');
          await load();
        } catch (e) {
          TrackoraUI.toast('Gagal menghapus: ' + e.message, 'error');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Trackora.mountShell({
      activeId: 'master-items',
      title: 'Items',
      subtitle: 'Produk & jasa — Inventory / Non-Inventory'
    });
    document.getElementById('f-type').addEventListener('change', onTypeChange);
    document.getElementById('item-form').addEventListener('submit', onSubmit);
    document.getElementById('btn-cancel-edit').addEventListener('click', resetForm);
    document.getElementById('items-tbody').addEventListener('click', onTableClick);
    document.getElementById('items-search').addEventListener('input', render);
    await load();
  });
})();

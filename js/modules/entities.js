/**
 * Entities page (Customers & Vendors) logic.
 */
(function () {
  'use strict';

  let entities = [];
  let editingId = null;
  let currentTab = 'Customer';

  function setTab(t) {
    currentTab = t;
    ['Customer', 'Vendor'].forEach((tab) => {
      const btn = document.getElementById('tab-' + tab);
      const active = tab === t;
      btn.className = 'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ' +
        (active
          ? 'border-slate-900 text-slate-900'
          : 'border-transparent text-slate-500 hover:text-slate-700');
    });
    document.getElementById('f-type').value = t;
    document.getElementById('btn-add-label').textContent =
      t === 'Customer' ? 'Customer baru' : 'Vendor baru';
    render();
  }

  function render() {
    const tbody = document.getElementById('entities-tbody');
    const empty = document.getElementById('entities-empty');
    const q = ((document.getElementById('entities-search') || {}).value || '').trim().toLowerCase();
    const filtered = entities.filter((r) =>
      String(r.type) === currentTab &&
      (!q || String(r.name).toLowerCase().includes(q)
          || String(r.code || '').toLowerCase().includes(q)
          || String(r.email || '').toLowerCase().includes(q))
    );
    if (filtered.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = filtered.map((r) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50" data-testid="entity-row-${TrackoraUI.escapeHtml(r.id)}">
        <td class="py-2.5 px-3 font-mono text-xs text-slate-700">${TrackoraUI.escapeHtml(r.code || '')}</td>
        <td class="py-2.5 px-3 text-slate-900 font-medium">${TrackoraUI.escapeHtml(r.name)}</td>
        <td class="py-2.5 px-3 text-xs text-slate-600">${TrackoraUI.escapeHtml(r.email || '')}</td>
        <td class="py-2.5 px-3 text-xs text-slate-600">${TrackoraUI.escapeHtml(r.phone || '')}</td>
        <td class="py-2.5 px-3 text-xs text-slate-500">${TrackoraUI.escapeHtml(r.taxId || '')}</td>
        <td class="py-2.5 px-3">
          ${r.isActive === false || String(r.isActive) === 'false'
            ? TrackoraUI.badge('Inactive', 'slate')
            : TrackoraUI.badge('Active', 'green')}
        </td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">
          <button data-act="edit" data-id="${TrackoraUI.escapeHtml(r.id)}"
                  data-testid="entity-edit-${TrackoraUI.escapeHtml(r.id)}"
                  class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100">Edit</button>
          <button data-act="del" data-id="${TrackoraUI.escapeHtml(r.id)}"
                  data-testid="entity-del-${TrackoraUI.escapeHtml(r.id)}"
                  class="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50">Hapus</button>
        </td>
      </tr>`).join('');
  }

  async function load() {
    try {
      entities = await TrackoraAPI.getEntities();
      render();
    } catch (e) {
      TrackoraUI.toast('Gagal memuat data: ' + e.message, 'error');
    }
  }

  function resetForm() {
    editingId = null;
    document.getElementById('entity-form').reset();
    document.getElementById('f-type').value = currentTab;
    document.getElementById('entity-form-title').textContent =
      'Tambah ' + currentTab;
    document.getElementById('btn-cancel-edit').classList.add('hidden');
    document.getElementById('f-isActive').checked = true;
  }

  function fillForm(r) {
    editingId = r.id;
    setTab(r.type);
    document.getElementById('f-type').value = r.type;
    document.getElementById('f-code').value = r.code || '';
    document.getElementById('f-name').value = r.name || '';
    document.getElementById('f-email').value = r.email || '';
    document.getElementById('f-phone').value = r.phone || '';
    document.getElementById('f-address').value = r.address || '';
    document.getElementById('f-taxId').value = r.taxId || '';
    document.getElementById('f-isActive').checked =
      !(r.isActive === false || String(r.isActive) === 'false');
    document.getElementById('entity-form-title').textContent = 'Edit ' + r.type;
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const btn = document.getElementById('btn-save-entity');
    const payload = {
      id: editingId || undefined,
      type:    document.getElementById('f-type').value,
      code:    document.getElementById('f-code').value.trim(),
      name:    document.getElementById('f-name').value.trim(),
      email:   document.getElementById('f-email').value.trim(),
      phone:   document.getElementById('f-phone').value.trim(),
      address: document.getElementById('f-address').value.trim(),
      taxId:   document.getElementById('f-taxId').value.trim(),
      isActive:document.getElementById('f-isActive').checked
    };
    if (!payload.name) {
      TrackoraUI.toast('Nama wajib diisi.', 'warn');
      return;
    }
    await TrackoraUI.withLoading(btn, async () => {
      try {
        await TrackoraAPI.saveEntity(payload);
        TrackoraUI.toast(editingId ? 'Data diperbarui.' : 'Data ditambahkan.', 'success');
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
    const row = entities.find((r) => String(r.id) === String(id));
    if (!row) return;
    if (act === 'edit') fillForm(row);
    if (act === 'del') {
      TrackoraUI.confirmDialog(`Hapus ${row.type} "${row.name}"?`).then(async (ok) => {
        if (!ok) return;
        try {
          await TrackoraAPI.deleteEntity(id);
          TrackoraUI.toast('Data dihapus.', 'success');
          await load();
        } catch (e) {
          TrackoraUI.toast('Gagal menghapus: ' + e.message, 'error');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Trackora.mountShell({
      activeId: 'master-entities',
      title: 'Customers & Vendors',
      subtitle: 'Master data mitra bisnis'
    });
    document.getElementById('tab-Customer').addEventListener('click', () => setTab('Customer'));
    document.getElementById('tab-Vendor').addEventListener('click',   () => setTab('Vendor'));
    document.getElementById('entity-form').addEventListener('submit', onSubmit);
    document.getElementById('btn-cancel-edit').addEventListener('click', resetForm);
    document.getElementById('entities-tbody').addEventListener('click', onTableClick);
    document.getElementById('entities-search').addEventListener('input', render);
    setTab('Customer');
    await load();
  });
})();

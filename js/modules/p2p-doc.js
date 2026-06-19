/**
 * Generic P2P document module — used for PR, PO, GRN, AP Invoice.
 * Each page constructs its own instance via P2PDoc(config).
 */
(function (global) {
  'use strict';

  function init(cfg) {
    // cfg = {
    //   navId, pageTitle, pageSubtitle,
    //   docType: 'PR'|'PO'|'GRN'|'APINV',
    //   hasVendor, hasReference, hasInvoiceFields, postable, approvable,
    //   apiList, apiGet, apiSave, apiAction1, apiAction1Name (e.g. approve|post),
    //   apiCancel, apiDelete
    // }

    var state = {
      docs: [],
      coa: [],
      items: [],
      entities: [],
      editing: null,
      editingStatus: null
    };

    // ---------- LIST RENDER ----------
    function renderList() {
      var tbody = document.getElementById('doc-tbody');
      var empty = document.getElementById('doc-empty');
      var f = (document.getElementById('doc-filter-status') || {}).value || '';
      var rows = f ? state.docs.filter(function (d) { return String(d.status) === f; }) : state.docs.slice();
      if (rows.length === 0) {
        tbody.innerHTML = ''; empty.classList.remove('hidden'); return;
      }
      empty.classList.add('hidden');
      tbody.innerHTML = rows.map(function (r) {
        var actions = [];
        actions.push(actionBtn('view', r.id, (r.status === 'draft' ? 'Edit' : 'Lihat'), 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'));
        if (r.status === 'draft' && cfg.approvable) {
          actions.push(actionBtn('act1', r.id, 'Approve', 'text-blue-700 hover:text-blue-800 hover:bg-blue-50'));
        }
        if (r.status === 'draft' && cfg.postable) {
          actions.push(actionBtn('act1', r.id, 'Post', 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'));
        }
        if (r.status === 'approved' && cfg.docType !== 'APINV' && cfg.docType !== 'GRN') {
          actions.push(actionBtn('cancel', r.id, 'Cancel', 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'));
        }
        if (r.status === 'posted') {
          actions.push(actionBtn('cancel', r.id, 'Void', 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'));
        }
        if (r.status === 'draft') {
          actions.push(actionBtn('del', r.id, 'Hapus', 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'));
        }
        return (
          '<tr class="border-b border-slate-100 hover:bg-slate-50" data-testid="doc-row-' + TrackoraUI.escapeHtml(r.id) + '">' +
            '<td class="py-2.5 px-3 font-mono text-xs text-slate-700">' + TrackoraUI.escapeHtml(r.docNumber) + '</td>' +
            '<td class="py-2.5 px-3 text-slate-700">' + TrackoraUI.escapeHtml(r.date) + '</td>' +
            (cfg.hasVendor ? '<td class="py-2.5 px-3 text-slate-900">' + TrackoraUI.escapeHtml(P2P.vendorLabel(state.entities, r.vendorId)) + '</td>' : '') +
            '<td class="py-2.5 px-3 text-xs text-slate-500">' + TrackoraUI.escapeHtml(r.memo || '') + '</td>' +
            '<td class="py-2.5 px-3 text-right font-mono text-slate-700">' + P2P.fmt(r.total) + '</td>' +
            '<td class="py-2.5 px-3">' + P2P.statusBadge(r.status) + '</td>' +
            '<td class="py-2.5 px-3 text-right whitespace-nowrap">' + actions.join('') + '</td>' +
          '</tr>'
        );
      }).join('');
    }

    function actionBtn(act, id, label, cls) {
      return '<button data-act="' + act + '" data-id="' + TrackoraUI.escapeHtml(id) + '" ' +
             'data-testid="doc-' + act + '-' + TrackoraUI.escapeHtml(id) + '" ' +
             'class="text-xs px-2 py-1 rounded ' + cls + '">' + label + '</button>';
    }

    async function loadList() {
      try {
        var results = await Promise.all([
          TrackoraAPI[cfg.apiList](),
          TrackoraAPI.getCOA(),
          TrackoraAPI.getItems(),
          TrackoraAPI.getEntities()
        ]);
        state.docs = results[0];
        state.coa  = results[1];
        state.items = results[2];
        state.entities = results[3];
        renderList();
      } catch (e) {
        TrackoraUI.toast('Gagal memuat: ' + e.message, 'error');
      }
    }

    // ---------- FORM ----------
    function showView(which) {
      document.getElementById('list-view').classList.toggle('hidden', which !== 'list');
      document.getElementById('form-view').classList.toggle('hidden', which !== 'form');
    }

    function buildLineCtx() {
      return {
        coa: state.coa,
        items: state.items,
        readOnly: state.editingStatus === 'posted' || state.editingStatus === 'void' ||
                  state.editingStatus === 'approved' || state.editingStatus === 'cancelled'
      };
    }

    function renderLines(lines) {
      var ctx = buildLineCtx();
      var tbody = document.getElementById('doc-lines-tbody');
      tbody.innerHTML = lines.map(function (l, i) { return P2P.itemLineRowHtml(l, i, ctx); }).join('');
      P2P.recalcItemTotals(tbody, document.getElementById('doc-total'));
    }

    function openForm(doc) {
      state.editing = doc ? doc.id : null;
      state.editingStatus = doc ? doc.status : null;
      var ro = state.editingStatus === 'posted' || state.editingStatus === 'void' ||
               state.editingStatus === 'approved' || state.editingStatus === 'cancelled';

      document.getElementById('form-title').textContent = doc
        ? (ro ? 'Detail ' + cfg.pageTitle.replace(/s$/, '') : 'Edit ' + cfg.pageTitle.replace(/s$/, ''))
        : cfg.pageTitle.replace(/s$/, '') + ' Baru';
      document.getElementById('form-meta').textContent = doc
        ? (doc.docNumber + ' — ' + String(doc.status).toUpperCase())
        : '';

      // Vendor select
      if (cfg.hasVendor) {
        var vsel = document.getElementById('f-vendorId');
        vsel.innerHTML = P2P.vendorOptions(state.entities, doc ? doc.vendorId : '');
        vsel.disabled = ro;
      }

      // common fields
      ['date', 'memo', 'reference', 'requestedBy', 'vendorInvoiceNumber', 'dueDate', 'grnRef', 'poRef', 'prRef']
        .forEach(function (k) {
          var el = document.getElementById('f-' + k);
          if (!el) return;
          el.value = doc ? (doc[k] || '') : (k === 'date' ? P2P.todayISO() : '');
          el.disabled = ro;
        });

      document.getElementById('btn-save-draft').classList.toggle('hidden', ro);
      var act1 = document.getElementById('btn-save-act1');
      if (act1) act1.classList.toggle('hidden', ro);
      document.getElementById('btn-add-line').classList.toggle('hidden', ro);

      var lines = (doc && doc.lines && doc.lines.length) ? doc.lines : [
        { itemId: '', accountId: '', description: '', qty: 1, unitPrice: 0 }
      ];
      renderLines(lines);
      showView('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function addLine() {
      var ctx = buildLineCtx();
      var tbody = document.getElementById('doc-lines-tbody');
      var idx = tbody.querySelectorAll('tr').length;
      tbody.insertAdjacentHTML('beforeend',
        P2P.itemLineRowHtml({ itemId: '', accountId: '', description: '', qty: 1, unitPrice: 0 }, idx, ctx));
      P2P.recalcItemTotals(tbody, document.getElementById('doc-total'));
    }

    async function save(autoAction) {
      var lines = P2P.readItemLines(document.getElementById('doc-lines-tbody'))
        .filter(function (l) { return l.itemId || l.accountId || l.qty > 0 || l.unitPrice > 0; });
      var payload = {
        id: state.editing || undefined,
        date: document.getElementById('f-date').value,
        memo: (document.getElementById('f-memo') || {}).value || '',
        lines: lines
      };
      if (cfg.hasVendor) payload.vendorId = document.getElementById('f-vendorId').value;
      ['reference', 'requestedBy', 'vendorInvoiceNumber', 'dueDate', 'grnRef', 'poRef', 'prRef']
        .forEach(function (k) {
          var el = document.getElementById('f-' + k);
          if (el && el.value) payload[k] = el.value;
        });

      if (!payload.date) { TrackoraUI.toast('Tanggal wajib diisi.', 'warn'); return; }
      if (cfg.hasVendor && !payload.vendorId) { TrackoraUI.toast('Vendor wajib dipilih.', 'warn'); return; }
      if (lines.length === 0) { TrackoraUI.toast('Minimal 1 baris terisi.', 'warn'); return; }

      var btn = document.getElementById(autoAction ? 'btn-save-act1' : 'btn-save-draft');
      await TrackoraUI.withLoading(btn, async function () {
        try {
          var saved = await TrackoraAPI[cfg.apiSave](payload);
          if (autoAction) {
            await TrackoraAPI[cfg.apiAct1](saved.id);
            TrackoraUI.toast(cfg.apiAct1Label + ' berhasil.', 'success');
          } else {
            TrackoraUI.toast('Draft tersimpan.', 'success');
          }
          showView('list');
          await loadList();
        } catch (e) {
          TrackoraUI.toast('Gagal: ' + e.message, 'error');
        }
      });
    }

    async function viewDoc(id) {
      try {
        var doc = await TrackoraAPI[cfg.apiGet](id);
        openForm(doc);
      } catch (e) { TrackoraUI.toast('Gagal: ' + e.message, 'error'); }
    }

    async function act1FromList(id) {
      var ok = await TrackoraUI.confirmDialog(cfg.apiAct1Label + ' dokumen ini?');
      if (!ok) return;
      try {
        await TrackoraAPI[cfg.apiAct1](id);
        TrackoraUI.toast(cfg.apiAct1Label + ' berhasil.', 'success');
        await loadList();
      } catch (e) { TrackoraUI.toast('Gagal: ' + e.message, 'error'); }
    }

    async function cancelDoc(id) {
      var ok = await TrackoraUI.confirmDialog(cfg.postable
        ? 'Void dokumen ini? Journal akan ikut di-void.'
        : 'Cancel dokumen ini?');
      if (!ok) return;
      try {
        await TrackoraAPI[cfg.apiCancel](id);
        TrackoraUI.toast('Selesai.', 'success');
        await loadList();
      } catch (e) { TrackoraUI.toast('Gagal: ' + e.message, 'error'); }
    }

    async function delDoc(id) {
      var ok = await TrackoraUI.confirmDialog('Hapus draft ini?');
      if (!ok) return;
      try {
        await TrackoraAPI[cfg.apiDelete](id);
        TrackoraUI.toast('Draft dihapus.', 'success');
        await loadList();
      } catch (e) { TrackoraUI.toast('Gagal: ' + e.message, 'error'); }
    }

    document.addEventListener('DOMContentLoaded', async function () {
      await Trackora.mountShell({ activeId: cfg.navId, title: cfg.pageTitle, subtitle: cfg.pageSubtitle });

      document.getElementById('btn-new-doc').addEventListener('click', function () { openForm(null); });
      document.getElementById('btn-back-list').addEventListener('click', function () { showView('list'); });
      document.getElementById('btn-add-line').addEventListener('click', addLine);
      document.getElementById('btn-save-draft').addEventListener('click', function () { save(false); });
      var act1 = document.getElementById('btn-save-act1');
      if (act1) act1.addEventListener('click', function () { save(true); });
      document.getElementById('doc-filter-status').addEventListener('change', renderList);

      var lt = document.getElementById('doc-lines-tbody');
      lt.addEventListener('input', function (e) {
        if (e.target.matches('.line-num')) P2P.recalcItemTotals(lt, document.getElementById('doc-total'));
      });
      lt.addEventListener('change', function (e) {
        if (e.target.matches('.line-field[data-field="itemId"]')) {
          // Autofill unit price + description from item
          var sel = e.target;
          var item = state.items.find(function (i) { return String(i.id) === sel.value; });
          if (item) {
            var tr = sel.closest('tr');
            var priceEl = tr.querySelector('[data-field="unitPrice"]');
            var descEl  = tr.querySelector('[data-field="description"]');
            if (priceEl && !Number(priceEl.value)) priceEl.value = Number(item.cost || item.unitPrice || 0);
            if (descEl  && !descEl.value)          descEl.value  = item.name;
            P2P.recalcItemTotals(lt, document.getElementById('doc-total'));
          }
        }
      });
      lt.addEventListener('click', function (e) {
        var btn = e.target.closest('.btn-remove-line');
        if (!btn) return;
        if (document.querySelectorAll('#doc-lines-tbody tr').length <= 1) {
          TrackoraUI.toast('Minimal 1 baris.', 'warn'); return;
        }
        btn.closest('tr').remove();
        P2P.reNumberRows(lt);
        P2P.recalcItemTotals(lt, document.getElementById('doc-total'));
      });

      document.getElementById('doc-tbody').addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var id = btn.dataset.id;
        switch (btn.dataset.act) {
          case 'view':   viewDoc(id); break;
          case 'act1':   act1FromList(id); break;
          case 'cancel': cancelDoc(id); break;
          case 'del':    delDoc(id); break;
        }
      });

      await loadList();
    });
  }

  global.P2PDoc = { init: init };
})(window);

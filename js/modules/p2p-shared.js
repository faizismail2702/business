/**
 * P2P shared helpers — used by PR, PO, GRN, AP, Payment modules.
 */
(function (global) {
  'use strict';

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  function statusBadge(s) {
    var map = {
      draft:     ['Draft',     'amber'],
      approved:  ['Approved',  'blue'],
      posted:    ['Posted',    'green'],
      paid:      ['Paid',      'green'],
      partial:   ['Partial',   'indigo'],
      cancelled: ['Cancelled', 'slate'],
      void:      ['Void',      'red']
    };
    var v = map[s] || [s, 'slate'];
    return TrackoraUI.badge(v[0], v[1]);
  }

  function paymentStatus(inv) {
    if (inv.status !== 'posted') return inv.status;
    var paid = Number(inv.paidAmount || 0);
    var total = Number(inv.total || 0);
    if (paid >= total - 0.0001) return 'paid';
    if (paid > 0) return 'partial';
    return 'posted';
  }

  function vendorOptions(entities, selectedId, placeholder) {
    return '<option value="">' + (placeholder || '— Pilih Vendor —') + '</option>' +
      entities
        .filter(function (e) { return String(e.type) === 'Vendor' && !(e.isActive === false || String(e.isActive) === 'false'); })
        .map(function (e) {
          return '<option value="' + e.id + '" ' + (String(e.id) === String(selectedId) ? 'selected' : '') + '>' +
                 TrackoraUI.escapeHtml((e.code ? e.code + ' — ' : '') + e.name) + '</option>';
        }).join('');
  }

  function vendorLabel(entities, id) {
    var e = entities.find(function (x) { return String(x.id) === String(id); });
    return e ? ((e.code ? e.code + ' — ' : '') + e.name) : '';
  }

  function activeCoa(coa) {
    return coa.filter(function (c) { return !(c.isActive === false || String(c.isActive) === 'false'); });
  }

  function itemOptions(items, selectedId) {
    return '<option value="">— Item (opsional) —</option>' +
      items
        .filter(function (i) { return !(i.isActive === false || String(i.isActive) === 'false'); })
        .map(function (i) {
          return '<option value="' + i.id + '" ' + (String(i.id) === String(selectedId) ? 'selected' : '') + '>' +
                 TrackoraUI.escapeHtml(i.sku + ' — ' + i.name) + '</option>';
        }).join('');
  }

  function accountOptions(coa, selectedId, types) {
    var filtered = activeCoa(coa);
    if (types && types.length) {
      filtered = filtered.filter(function (c) { return types.indexOf(c.accountType) >= 0; });
    }
    return '<option value="">— Pilih Akun —</option>' +
      filtered.map(function (c) {
        return '<option value="' + c.id + '" ' + (String(c.id) === String(selectedId) ? 'selected' : '') + '>' +
               TrackoraUI.escapeHtml(c.accountNumber + ' — ' + c.accountName) + '</option>';
      }).join('');
  }

  function accountLabel(coa, id) {
    var c = coa.find(function (x) { return String(x.id) === String(id); });
    return c ? (c.accountNumber + ' — ' + c.accountName) : '';
  }

  // ---------- ITEM LINE row ------------------------------------
  function itemLineRowHtml(line, idx, ctx) {
    var ro = ctx.readOnly ? 'disabled' : '';
    return (
      '<tr class="border-b border-slate-100" data-testid="line-' + idx + '">' +
        '<td class="py-2 px-3 text-xs text-slate-500">' + (idx + 1) + '</td>' +
        '<td class="py-2 px-3"><select class="tk-select line-field" data-field="itemId" ' + ro + '>' +
          itemOptions(ctx.items, line.itemId) + '</select></td>' +
        '<td class="py-2 px-3"><select class="tk-select line-field" data-field="accountId" ' + ro + '>' +
          accountOptions(ctx.coa, line.accountId) + '</select></td>' +
        '<td class="py-2 px-3"><input class="tk-input line-field line-text" data-field="description" value="' +
          TrackoraUI.escapeHtml(line.description || '') + '" ' + ro + ' /></td>' +
        '<td class="py-2 px-3"><input class="tk-input text-right font-mono line-field line-num" data-field="qty"' +
          ' type="number" step="0.001" min="0" value="' + (Number(line.qty || 0) || '') + '" ' + ro + ' /></td>' +
        '<td class="py-2 px-3"><input class="tk-input text-right font-mono line-field line-num" data-field="unitPrice"' +
          ' type="number" step="0.01" min="0" value="' + (Number(line.unitPrice || 0) || '') + '" ' + ro + ' /></td>' +
        '<td class="py-2 px-3 text-right font-mono line-amount" data-line-amount>' + fmt((Number(line.qty || 0)) * (Number(line.unitPrice || 0))) + '</td>' +
        '<td class="py-2 px-3 text-center">' +
          (ctx.readOnly ? '' :
            '<button type="button" class="text-rose-500 hover:text-rose-700 text-xs btn-remove-line" data-testid="btn-remove-line-' + idx + '">✕</button>') +
        '</td>' +
      '</tr>'
    );
  }

  function readItemLines(tbody) {
    return Array.from(tbody.querySelectorAll('tr')).map(function (tr) {
      var get = function (f) { return tr.querySelector('[data-field="' + f + '"]').value; };
      var qty = Number(get('qty') || 0);
      var price = Number(get('unitPrice') || 0);
      return {
        itemId:      get('itemId'),
        accountId:   get('accountId'),
        description: get('description'),
        qty: qty, unitPrice: price, amount: qty * price
      };
    });
  }

  function recalcItemTotals(tbody, totalEl) {
    var total = 0;
    Array.from(tbody.querySelectorAll('tr')).forEach(function (tr) {
      var qty = Number(tr.querySelector('[data-field="qty"]').value || 0);
      var price = Number(tr.querySelector('[data-field="unitPrice"]').value || 0);
      var amt = qty * price;
      tr.querySelector('[data-line-amount]').textContent = fmt(amt);
      total += amt;
    });
    if (totalEl) totalEl.textContent = fmt(total);
    return total;
  }

  function reNumberRows(tbody) {
    Array.from(tbody.querySelectorAll('tr')).forEach(function (row, i) {
      row.cells[0].textContent = i + 1;
    });
  }

  global.P2P = {
    fmt: fmt,
    todayISO: todayISO,
    statusBadge: statusBadge,
    paymentStatus: paymentStatus,
    vendorOptions: vendorOptions,
    vendorLabel: vendorLabel,
    accountOptions: accountOptions,
    accountLabel: accountLabel,
    itemOptions: itemOptions,
    itemLineRowHtml: itemLineRowHtml,
    readItemLines: readItemLines,
    recalcItemTotals: recalcItemTotals,
    reNumberRows: reNumberRows
  };
})(window);

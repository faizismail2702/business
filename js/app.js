/**
 * Trackora — Layout shell: injects sidebar + topbar into every page.
 * Pages call: Trackora.mountShell('settings'|'master-coa'|...)
 */
(function (global) {
  'use strict';

  const NAV = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard',  label: 'Dashboard',  href: 'index.html',                 icon: 'gauge'   }
      ]
    },
    {
      label: 'Master Data',
      items: [
        { id: 'master-coa',      label: 'Chart of Accounts', href: 'pages/master-coa.html',      icon: 'book'   },
        { id: 'master-items',    label: 'Items',             href: 'pages/master-items.html',    icon: 'box'    },
        { id: 'master-entities', label: 'Customers & Vendors', href: 'pages/master-entities.html', icon: 'users' }
      ]
    },
    {
      label: 'Transactions',
      items: [
        { id: 'journal-entries', label: 'Journal Entries', href: 'pages/journal-entries.html', icon: 'journal' }
      ]
    },
    {
      label: 'Procure-to-Pay',
      items: [
        { id: 'p2p-pr',  label: 'Purchase Requisitions', href: 'pages/p2p-pr.html',  icon: 'doc' },
        { id: 'p2p-po',  label: 'Purchase Orders',       href: 'pages/p2p-po.html',  icon: 'doc' },
        { id: 'p2p-grn', label: 'Goods Receipts',        href: 'pages/p2p-grn.html', icon: 'box' },
        { id: 'p2p-ap',  label: 'AP Invoices',           href: 'pages/p2p-ap.html',  icon: 'doc' },
        { id: 'p2p-pay', label: 'Payments',              href: 'pages/p2p-pay.html', icon: 'pay' }
      ]
    },
    {
      label: 'Reports',
      items: [
        { id: 'general-ledger', label: 'General Ledger', href: 'pages/general-ledger.html', icon: 'ledger' },
        { id: 'trial-balance',  label: 'Trial Balance',  href: 'pages/trial-balance.html',  icon: 'balance' }
      ]
    },
    {
      label: 'System',
      items: [
        { id: 'settings', label: 'Settings', href: 'pages/settings.html', icon: 'cog' }
      ]
    }
  ];

  // Inline SVG icons (Heroicons mini, stroke).
  const ICONS = {
    gauge: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z"/>',
    book:  '<path stroke-linecap="round" stroke-linejoin="round" d="M4 19V5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 1-2-2Zm0 0a2 2 0 0 1 2-2h11"/>',
    box:   '<path stroke-linecap="round" stroke-linejoin="round" d="m21 7-9-4-9 4 9 4 9-4Zm0 0v10l-9 4M3 7v10l9 4M12 11v10"/>',
    users: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m18 0v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/>',
    cog:   '<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317a1.724 1.724 0 0 1 3.35 0c.107.443.482.78.93.851.448.072.91-.13 1.15-.516a1.724 1.724 0 0 1 2.591 2.224c-.291.359-.34.86-.122 1.27.218.41.671.638 1.124.566a1.724 1.724 0 0 1 1.118 3.247c-.43.198-.69.65-.65 1.12.04.47.367.86.81.97a1.724 1.724 0 0 1-.42 3.413c-.456.06-.823.42-.91.87-.087.45.122.91.518 1.16a1.724 1.724 0 0 1-2.224 2.59c-.359-.29-.86-.34-1.27-.121-.41.218-.638.671-.566 1.124a1.724 1.724 0 0 1-3.247 1.118c-.198-.43-.65-.69-1.12-.65-.47.04-.86.367-.97.81a1.724 1.724 0 0 1-3.413-.42c-.06-.456-.42-.823-.87-.91-.45-.087-.91.122-1.16.518a1.724 1.724 0 0 1-2.59-2.224c.29-.359.34-.86.121-1.27-.218-.41-.671-.638-1.124-.566a1.724 1.724 0 0 1-1.118-3.247c.43-.198.69-.65.65-1.12-.04-.47-.367-.86-.81-.97a1.724 1.724 0 0 1 .42-3.413c.456-.06.823-.42.91-.87.087-.45-.122-.91-.518-1.16a1.724 1.724 0 0 1 2.224-2.59c.359.29.86.34 1.27.121.41-.218.638-.671.566-1.124ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>',
    journal:'<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h4"/>',
    doc:   '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"/>',
    pay:   '<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8M3 10V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M7 15h2"/>',
    ledger:'<path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M3 12h18M3 18h18"/>',
    balance:'<path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 12h12l3-12M3 6h18M3 6l9-3 9 3"/>'
  };

  function isRootPage() {
    return /\/index\.html$/.test(location.pathname) ||
           location.pathname.endsWith('/') ||
           !location.pathname.includes('/pages/');
  }

  function prefix(href) {
    if (isRootPage()) return href;
    // We're inside /pages/, so adjust relative links.
    if (href === 'index.html') return '../index.html';
    if (href.startsWith('pages/')) return '../' + href;
    return href;
  }

  function buildSidebar(activeId) {
    let html =
      '<div class="h-16 flex items-center gap-2 px-5 border-b border-slate-200">' +
        '<div class="h-8 w-8 rounded-md bg-slate-900 text-white grid place-items-center font-semibold">T</div>' +
        '<div class="leading-tight">' +
          '<p class="text-sm font-semibold text-slate-900">Trackora</p>' +
          '<p class="text-[11px] text-slate-500 -mt-0.5">Business ERP</p>' +
        '</div>' +
      '</div>' +
      '<nav class="px-3 py-4 space-y-5">';

    NAV.forEach((group) => {
      html += '<div>' +
        '<p class="px-2 mb-1 text-[11px] uppercase tracking-wider font-semibold text-slate-400">' +
          group.label + '</p>' +
        '<ul class="space-y-0.5">';
      group.items.forEach((it) => {
        const active = it.id === activeId;
        const cls = active
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
        html +=
          '<li><a href="' + prefix(it.href) + '" data-testid="nav-' + it.id + '" ' +
          'class="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition ' + cls + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">' +
              ICONS[it.icon] +
            '</svg>' + it.label +
          '</a></li>';
      });
      html += '</ul></div>';
    });

    html += '</nav>';
    return html;
  }

  function buildTopbar(title, subtitle) {
    return '' +
      '<header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">' +
        '<div>' +
          '<h1 class="text-lg font-semibold text-slate-900" data-testid="page-title">' +
            (title || '') + '</h1>' +
          '<p class="text-xs text-slate-500 -mt-0.5">' + (subtitle || '') + '</p>' +
        '</div>' +
        '<div class="flex items-center gap-3">' +
          '<button id="tk-ping-btn" data-testid="ping-btn" ' +
            'class="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">' +
            'Test API' +
          '</button>' +
          '<div class="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-xs font-semibold text-slate-700">TB</div>' +
        '</div>' +
      '</header>';
  }

  async function mountShell(opts) {
    opts = opts || {};
    const root = document.getElementById('tk-app');
    if (!root) return;
    const content = root.innerHTML; // preserve page content
    root.innerHTML = '' +
      '<div class="flex min-h-screen">' +
        '<aside class="w-60 shrink-0 bg-white border-r border-slate-200 hidden md:block">' +
          buildSidebar(opts.activeId) +
        '</aside>' +
        '<div class="flex-1 flex flex-col min-w-0">' +
          buildTopbar(opts.title, opts.subtitle) +
          '<main class="flex-1 p-6 bg-slate-50">' + content + '</main>' +
        '</div>' +
      '</div>';

    const pingBtn = document.getElementById('tk-ping-btn');
    if (pingBtn) {
      pingBtn.addEventListener('click', async () => {
        try {
          await TrackoraAPI.ping();
          TrackoraUI.toast('API terhubung.', 'success');
        } catch (e) {
          TrackoraUI.toast('API gagal: ' + e.message, 'error');
        }
      });
    }
  }

  global.Trackora = { mountShell };
})(window);

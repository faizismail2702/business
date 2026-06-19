/**
 * Trackora API Client — wraps fetch() to Google Apps Script.
 *
 * Why text/plain?
 *   Browsers send a CORS preflight (OPTIONS) for application/json,
 *   which Google Apps Script does not respond to. Sending the body
 *   as text/plain keeps the request "simple" so the preflight is
 *   skipped and the call succeeds.
 */
(function (global) {
  'use strict';

  const cfg = global.TRACKORA_CONFIG || {};
  const URL = cfg.GAS_API_URL;

  function _ensureUrl() {
    if (!URL || URL.indexOf('REPLACE_WITH_YOUR_GAS_WEBAPP_URL') === 0) {
      throw new Error(
        'GAS_API_URL is not configured. Edit js/config.js and paste your ' +
        'Google Apps Script Web App /exec URL.'
      );
    }
  }

  async function get(action, params) {
    _ensureUrl();
    const qs = new URLSearchParams(Object.assign({ action: action }, params || {}));
    const res = await fetch(URL + '?' + qs.toString(), { method: 'GET' });
    return _parse(res, action);
  }

  async function post(action, payload) {
    _ensureUrl();
    const body = JSON.stringify({ action: action, payload: payload || {} });
    const res = await fetch(URL, {
      method: 'POST',
      // text/plain → no CORS preflight
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      redirect: 'follow'
    });
    return _parse(res, action);
  }

  async function _parse(res, action) {
    let json;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error('Invalid JSON from API (' + action + '): ' + e.message);
    }
    if (!json || json.ok !== true) {
      throw new Error((json && json.error) || ('API error: ' + action));
    }
    return json.data;
  }

  global.TrackoraAPI = {
    ping:              ()        => get('ping'),

    getSettings:       ()        => get('getSettings'),
    saveSetting:       (kv)      => post('saveSetting', kv),
    bulkSaveSettings:  (obj)     => post('bulkSaveSettings', obj),

    getCOA:            ()        => get('getCOA'),
    saveCOA:           (data)    => post('saveCOA', data),
    deleteCOA:         (id)      => post('deleteCOA', { id }),

    getItems:          ()        => get('getItems'),
    saveItem:          (data)    => post('saveItem', data),
    deleteItem:        (id)      => post('deleteItem', { id }),

    getEntities:       (type)    => get('getEntities', type ? { type } : {}),
    saveEntity:        (data)    => post('saveEntity', data),
    deleteEntity:      (id)      => post('deleteEntity', { id }),

    getJournals:       (status)  => get('getJournals', status ? { status } : {}),
    getJournal:        (id)      => get('getJournal', { id }),
    saveJournal:       (data)    => post('saveJournal', data),
    postJournal:       (id)      => post('postJournal', { id }),
    voidJournal:       (id)      => post('voidJournal', { id }),
    deleteJournal:     (id)      => post('deleteJournal', { id }),

    getGeneralLedger:  (params)  => get('getGeneralLedger', params),
    getTrialBalance:   (asOfDate)=> get('getTrialBalance', asOfDate ? { asOfDate } : {}),

    // P2P
    getPRs:            ()        => get('getPRs'),
    getPR:             (id)      => get('getPR', { id }),
    savePR:            (data)    => post('savePR', data),
    approvePR:         (id)      => post('approvePR', { id }),
    cancelPR:          (id)      => post('cancelPR', { id }),
    deletePR:          (id)      => post('deletePR', { id }),

    getPOs:            ()        => get('getPOs'),
    getPO:             (id)      => get('getPO', { id }),
    savePO:            (data)    => post('savePO', data),
    approvePO:         (id)      => post('approvePO', { id }),
    cancelPO:          (id)      => post('cancelPO', { id }),
    deletePO:          (id)      => post('deletePO', { id }),

    getGRNs:           ()        => get('getGRNs'),
    getGRN:            (id)      => get('getGRN', { id }),
    saveGRN:           (data)    => post('saveGRN', data),
    postGRN:           (id)      => post('postGRN', { id }),
    voidGRN:           (id)      => post('voidGRN', { id }),
    deleteGRN:         (id)      => post('deleteGRN', { id }),

    getAPInvoices:     ()        => get('getAPInvoices'),
    getAPInvoice:      (id)      => get('getAPInvoice', { id }),
    getOpenAPInvoices: ()        => get('getOpenAPInvoices'),
    saveAPInvoice:     (data)    => post('saveAPInvoice', data),
    postAPInvoice:     (id)      => post('postAPInvoice', { id }),
    voidAPInvoice:     (id)      => post('voidAPInvoice', { id }),
    deleteAPInvoice:   (id)      => post('deleteAPInvoice', { id }),

    getPayments:       ()        => get('getPayments'),
    getPayment:        (id)      => get('getPayment', { id }),
    savePayment:       (data)    => post('savePayment', data),
    postPayment:       (id)      => post('postPayment', { id }),
    voidPayment:       (id)      => post('voidPayment', { id }),
    deletePayment:     (id)      => post('deletePayment', { id })
  };
})(window);

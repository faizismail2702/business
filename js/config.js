/**
 * Trackora Business — Frontend Config
 *
 * Replace GAS_API_URL with the `/exec` URL of your deployed
 * Google Apps Script Web App (see backend/Code.gs header).
 */
window.TRACKORA_CONFIG = {
  // Example: "https://script.google.com/macros/s/AKfycbx.../exec"
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbwEiABSi5IboKt251V2hYpy3__gDq4s_Ut8UTsQcZCaVIDcme3zCSYby9Wx5ZB_Bwg/exec',

  APP_NAME: 'Trackora Business',
  APP_VERSION: '0.1.0',

  ACCOUNT_TYPES: [
    'Asset',
    'Liability',
    'Equity',
    'Income',
    'Expense',
    'Cost of Goods Sold',
    'Other Income',
    'Other Expense'
  ],

  ITEM_TYPES: ['Inventory', 'Non-Inventory'],
  COSTING_METHODS: ['FIFO', 'Average'],
  ENTITY_TYPES: ['Customer', 'Vendor']
};

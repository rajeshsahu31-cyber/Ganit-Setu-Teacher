
/* =========================================
   GANIT SETU - CUSTOM APP POPUP
   Replaces browser alert() everywhere
========================================= */
(function () {
  function ensurePopup() {
    if (document.getElementById('ganitAppPopup')) return;

    const box = document.createElement('div');
    box.id = 'ganitAppPopup';
    box.className = 'ganit-popup-overlay';
    box.innerHTML = `
      <div class="ganit-popup-card" role="dialog" aria-modal="true">
        <div class="ganit-popup-icon">ℹ️</div>
        <div id="ganitPopupMessage" class="ganit-popup-message"></div>
        <button id="ganitPopupOk" type="button" class="ganit-popup-ok">ठीक है</button>
      </div>
    `;
    document.body.appendChild(box);

    document.getElementById('ganitPopupOk').addEventListener('click', function () {
      box.classList.remove('show');
    });

    box.addEventListener('click', function (e) {
      if (e.target === box) box.classList.remove('show');
    });
  }

  window.showAppAlert = function (message) {
    ensurePopup();
    const popup = document.getElementById('ganitAppPopup');
    const messageEl = document.getElementById('ganitPopupMessage');

    messageEl.textContent = String(message ?? '');
    popup.classList.add('show');

    setTimeout(function () {
      document.getElementById('ganitPopupOk')?.focus();
    }, 0);
  };

  // Override native browser alert so the page URL is not shown.
  window.alert = window.showAppAlert;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePopup);
  } else {
    ensurePopup();
  }
})();

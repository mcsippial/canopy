(function() {
  'use strict';

  // Find the script tag with data-key
  var scripts = document.getElementsByTagName('script');
  var currentScript = null;
  var embedKey = null;

  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].getAttribute('data-key')) {
      currentScript = scripts[i];
      embedKey = scripts[i].getAttribute('data-key');
      break;
    }
  }

  if (!embedKey) {
    console.warn('[Canopy] No data-key attribute found on badge script.');
    return;
  }

  // Determine base URL from script src
  var scriptSrc = currentScript ? currentScript.src : '';
  var baseUrl = '';
  try {
    var url = new URL(scriptSrc);
    baseUrl = url.origin;
  } catch(e) {
    baseUrl = window.location.origin;
  }

  // Fetch badge config
  fetch(baseUrl + '/api/badge/' + encodeURIComponent(embedKey))
    .then(function(res) {
      if (!res.ok) throw new Error('Badge not found');
      return res.json();
    })
    .then(function(config) {
      renderBadge(config);
    })
    .catch(function(err) {
      console.warn('[Canopy] Could not load badge:', err.message);
    });

  function formatCurrency(amount) {
    if (!amount) return 'N/A';
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
    return '$' + amount;
  }

  function renderBadge(config) {
    // Inject styles
    var style = document.createElement('style');
    style.textContent = [
      '.canopy-badge{position:fixed;bottom:20px;right:20px;z-index:999999;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
      '.canopy-badge-btn{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);transition:all 0.2s;}',
      '.canopy-badge-btn:hover{box-shadow:0 6px 20px rgba(0,0,0,0.15);transform:translateY(-1px);}',
      '.canopy-badge-icon{width:32px;height:32px;background:rgba(93,202,165,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
      '.canopy-badge-text-primary{font-size:13px;font-weight:600;color:#1a1a2e;line-height:1.2;}',
      '.canopy-badge-text-secondary{font-size:11px;color:#6b7280;}',
      '.canopy-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000000;display:flex;align-items:center;justify-content:center;padding:16px;}',
      '.canopy-modal{background:#fff;border-radius:20px;padding:28px;max-width:400px;width:100%;max-height:90vh;overflow-y:auto;}',
      '.canopy-modal-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;}',
      '.canopy-modal-logo{width:40px;height:40px;background:rgba(93,202,165,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;}',
      '.canopy-modal-title{font-size:16px;font-weight:700;color:#1a1a2e;}',
      '.canopy-modal-subtitle{font-size:12px;color:#6b7280;}',
      '.canopy-modal-coverage{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;padding:16px;background:#f9fafb;border-radius:12px;}',
      '.canopy-modal-cov-label{font-size:11px;color:#9ca3af;margin-bottom:2px;}',
      '.canopy-modal-cov-value{font-size:18px;font-weight:700;color:#1a1a2e;}',
      '.canopy-modal-links{display:flex;flex-direction:column;gap:8px;margin-top:16px;}',
      '.canopy-modal-link{display:block;text-align:center;padding:10px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;}',
      '.canopy-modal-link-primary{background:#5DCAA5;color:#fff;}',
      '.canopy-modal-link-secondary{border:1px solid #e5e7eb;color:#1a1a2e;}',
      '.canopy-modal-close{position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:20px;line-height:1;}'
    ].join('');
    document.head.appendChild(style);

    // Badge button
    var badge = document.createElement('div');
    badge.className = 'canopy-badge';
    badge.innerHTML = '<div class="canopy-badge-btn">' +
      '<div class="canopy-badge-icon">' +
        '<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><path d="M16 2L4 8v8c0 7.732 5.333 14.267 12 16 6.667-1.733 12-8.268 12-16V8L16 2z" fill="#5DCAA5" opacity="0.9"/><path d="M16 6L7 10.5v6c0 5.5 3.8 10.2 9 11.5 5.2-1.3 9-6 9-11.5v-6L16 6z" fill="#1a1a2e"/><path d="M16 10L10 13v4c0 3.5 2.4 6.5 6 7.5 3.6-1 6-4 6-7.5v-4L16 10z" fill="#5DCAA5" opacity="0.6"/></svg>' +
      '</div>' +
      '<div>' +
        '<div class="canopy-badge-text-primary">Protected by Canopy</div>' +
        '<div class="canopy-badge-text-secondary">Up to ' + formatCurrency(config.per_incident_limit) + ' per incident</div>' +
      '</div>' +
    '</div>';

    badge.addEventListener('click', function() {
      openModal(config);
    });

    document.body.appendChild(badge);
  }

  function openModal(config) {
    var overlay = document.createElement('div');
    overlay.className = 'canopy-modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'canopy-modal';
    modal.style.position = 'relative';

    modal.innerHTML =
      '<button class="canopy-modal-close" aria-label="Close">×</button>' +
      '<div class="canopy-modal-header">' +
        '<div class="canopy-modal-logo">' +
          '<svg width="22" height="22" viewBox="0 0 32 32" fill="none"><path d="M16 2L4 8v8c0 7.732 5.333 14.267 12 16 6.667-1.733 12-8.268 12-16V8L16 2z" fill="#5DCAA5" opacity="0.9"/><path d="M16 6L7 10.5v6c0 5.5 3.8 10.2 9 11.5 5.2-1.3 9-6 9-11.5v-6L16 6z" fill="#1a1a2e"/><path d="M16 10L10 13v4c0 3.5 2.4 6.5 6 7.5 3.6-1 6-4 6-7.5v-4L16 10z" fill="#5DCAA5" opacity="0.6"/></svg>' +
        '</div>' +
        '<div>' +
          '<div class="canopy-modal-title">' + escapeHtml(config.org_name) + '</div>' +
          '<div class="canopy-modal-subtitle">Protected by Canopy</div>' +
        '</div>' +
      '</div>' +
      '<p style="font-size:13px;color:#6b7280;margin-bottom:4px;">Users of this service are covered by Canopy\'s AI liability policy. If you experience harm caused by an AI agent, you may be eligible to file a claim.</p>' +
      '<div class="canopy-modal-coverage">' +
        '<div><div class="canopy-modal-cov-label">Coverage limit</div><div class="canopy-modal-cov-value">' + formatCurrency(config.coverage_limit) + '</div></div>' +
        '<div><div class="canopy-modal-cov-label">Per incident</div><div class="canopy-modal-cov-value">' + formatCurrency(config.per_incident_limit) + '</div></div>' +
      '</div>' +
      '<div class="canopy-modal-links">' +
        '<a href="' + baseUrl + '/claim/' + encodeURIComponent(embedKey) + '" class="canopy-modal-link canopy-modal-link-primary">Submit a claim</a>' +
        '<a href="' + baseUrl + '/verify/' + encodeURIComponent(embedKey) + '" class="canopy-modal-link canopy-modal-link-secondary">View coverage details</a>' +
      '</div>';

    overlay.appendChild(modal);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    modal.querySelector('.canopy-modal-close').addEventListener('click', function() {
      overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

})();

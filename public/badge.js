(function() {
  'use strict';

  // Find the script tag with data-key
  var scripts = document.getElementsByTagName('script');
  var currentScript = null;
  var embedKey = null;
  var position = 'bottom-right';
  var theme = 'dark';

  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].getAttribute('data-key')) {
      currentScript = scripts[i];
      embedKey = scripts[i].getAttribute('data-key');
      position = scripts[i].getAttribute('data-position') || 'bottom-right';
      theme = scripts[i].getAttribute('data-theme') || 'dark';
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

  var isDev = (baseUrl.indexOf('localhost') !== -1 || baseUrl.indexOf('127.0.0.1') !== -1);

  // Fetch badge config
  fetch(baseUrl + '/api/badge/' + encodeURIComponent(embedKey))
    .then(function(res) {
      return res.json();
    })
    .then(function(config) {
      var status = config.coverage_status;
      if (status === 'active') {
        renderBadge(config);
      } else if (status === 'pending') {
        renderPendingBadge(config);
      } else {
        // inactive or unknown — render nothing
        if (isDev) {
          console.warn('[Canopy] Badge not shown: coverage_status is "' + (status || 'inactive') + '" for key ' + embedKey);
        }
      }
    })
    .catch(function(err) {
      if (isDev) {
        console.warn('[Canopy] Could not load badge:', err.message);
      }
    });

  function formatCurrency(amount) {
    if (!amount) return 'N/A';
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
    return '$' + amount;
  }

  function getPositionStyle() {
    if (position === 'bottom-left') return 'bottom:20px;left:20px;';
    return 'bottom:20px;right:20px;';
  }

  var isLight = theme === 'light';

  function injectStyles() {
    if (document.getElementById('canopy-badge-styles')) return;
    var style = document.createElement('style');
    style.id = 'canopy-badge-styles';
    var bg = isLight ? '#f9fafb' : '#fff';
    var textPrimary = '#1a1a2e';
    style.textContent = [
      '.canopy-badge{position:fixed;' + getPositionStyle() + 'z-index:9999;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
      '.canopy-badge-btn{display:flex;align-items:center;gap:10px;background:' + bg + ';border:1px solid #e5e7eb;border-radius:12px;padding:10px 16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);transition:all 0.2s;}',
      '.canopy-badge-btn:hover{box-shadow:0 6px 20px rgba(0,0,0,0.15);transform:translateY(-1px);}',
      '.canopy-badge-pending .canopy-badge-btn{opacity:0.75;transform:scale(0.9);}',
      '.canopy-badge-icon{width:28px;height:28px;background:rgba(93,202,165,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
      '.canopy-badge-icon-grey{width:28px;height:28px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
      '.canopy-badge-text-primary{font-size:12px;font-weight:600;color:' + textPrimary + ';line-height:1.2;}',
      '.canopy-badge-text-secondary{font-size:10px;color:#6b7280;}',
      '.canopy-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;}',
      '.canopy-modal{background:#fff;border-radius:20px;padding:28px;max-width:400px;width:100%;max-height:90vh;overflow-y:auto;position:relative;}',
      '.canopy-modal-header{display:flex;align-items:center;gap:12px;margin-bottom:16px;}',
      '.canopy-modal-logo{width:40px;height:40px;background:rgba(93,202,165,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
      '.canopy-modal-title{font-size:15px;font-weight:700;color:#1a1a2e;}',
      '.canopy-modal-subtitle{font-size:12px;color:#6b7280;}',
      '.canopy-modal-limit{background:#5DCAA5;color:#fff;border-radius:12px;padding:12px 16px;margin:14px 0;text-align:center;}',
      '.canopy-modal-limit-label{font-size:11px;opacity:0.85;margin-bottom:2px;}',
      '.canopy-modal-limit-value{font-size:22px;font-weight:800;}',
      '.canopy-modal-events{margin:14px 0;}',
      '.canopy-modal-event{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;font-size:12px;color:#374151;}',
      '.canopy-modal-event-dot{width:6px;height:6px;background:#5DCAA5;border-radius:50%;flex-shrink:0;margin-top:4px;}',
      '.canopy-modal-links{display:flex;flex-direction:column;gap:8px;margin-top:16px;}',
      '.canopy-modal-link{display:block;text-align:center;padding:10px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;}',
      '.canopy-modal-link-primary{background:#5DCAA5;color:#fff;}',
      '.canopy-modal-link-primary:hover{background:#4ab894;}',
      '.canopy-modal-link-secondary{border:1px solid #e5e7eb;color:#1a1a2e;}',
      '.canopy-modal-small{font-size:10px;color:#9ca3af;text-align:center;margin-top:12px;}',
      '.canopy-modal-close{position:absolute;top:14px;right:16px;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:22px;line-height:1;padding:0;}'
    ].join('');
    document.head.appendChild(style);
  }

  var shieldSvg = '<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><path d="M16 2L4 8v8c0 7.732 5.333 14.267 12 16 6.667-1.733 12-8.268 12-16V8L16 2z" fill="#5DCAA5" opacity="0.9"/><path d="M16 6L7 10.5v6c0 5.5 3.8 10.2 9 11.5 5.2-1.3 9-6 9-11.5v-6L16 6z" fill="#1a1a2e"/><path d="M16 10L10 13v4c0 3.5 2.4 6.5 6 7.5 3.6-1 6-4 6-7.5v-4L16 10z" fill="#5DCAA5" opacity="0.6"/></svg>';
  var shieldSvgLarge = '<svg width="22" height="22" viewBox="0 0 32 32" fill="none"><path d="M16 2L4 8v8c0 7.732 5.333 14.267 12 16 6.667-1.733 12-8.268 12-16V8L16 2z" fill="#5DCAA5" opacity="0.9"/><path d="M16 6L7 10.5v6c0 5.5 3.8 10.2 9 11.5 5.2-1.3 9-6 9-11.5v-6L16 6z" fill="#1a1a2e"/><path d="M16 10L10 13v4c0 3.5 2.4 6.5 6 7.5 3.6-1 6-4 6-7.5v-4L16 10z" fill="#5DCAA5" opacity="0.6"/></svg>';
  var shieldSvgGrey = '<svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M16 2L4 8v8c0 7.732 5.333 14.267 12 16 6.667-1.733 12-8.268 12-16V8L16 2z" fill="#9ca3af" opacity="0.7"/><path d="M16 6L7 10.5v6c0 5.5 3.8 10.2 9 11.5 5.2-1.3 9-6 9-11.5v-6L16 6z" fill="#e5e7eb"/><path d="M16 10L10 13v4c0 3.5 2.4 6.5 6 7.5 3.6-1 6-4 6-7.5v-4L16 10z" fill="#9ca3af" opacity="0.5"/></svg>';

  function renderBadge(config) {
    injectStyles();

    var badge = document.createElement('div');
    badge.className = 'canopy-badge';
    badge.innerHTML =
      '<div class="canopy-badge-btn">' +
        '<div class="canopy-badge-icon">' + shieldSvg + '</div>' +
        '<div>' +
          '<div class="canopy-badge-text-primary">Protected by Canopy</div>' +
          '<div class="canopy-badge-text-secondary">Up to ' + formatCurrency(config.per_incident_limit) + ' per incident</div>' +
        '</div>' +
      '</div>';

    badge.addEventListener('click', function() {
      openActiveModal(config);
    });

    document.body.appendChild(badge);
  }

  function renderPendingBadge(config) {
    injectStyles();

    var badge = document.createElement('div');
    badge.className = 'canopy-badge canopy-badge-pending';
    badge.innerHTML =
      '<div class="canopy-badge-btn">' +
        '<div class="canopy-badge-icon-grey">' + shieldSvgGrey + '</div>' +
        '<div>' +
          '<div class="canopy-badge-text-primary" style="color:#6b7280;">Coverage Pending</div>' +
        '</div>' +
      '</div>';

    badge.addEventListener('click', function() {
      openPendingModal(config);
    });

    document.body.appendChild(badge);
  }

  function openActiveModal(config) {
    injectStyles();
    var overlay = document.createElement('div');
    overlay.className = 'canopy-modal-overlay';

    var eventsHtml = '';
    var events = config.covered_event_summary || [];
    for (var i = 0; i < events.length; i++) {
      eventsHtml += '<div class="canopy-modal-event"><div class="canopy-modal-event-dot"></div><span>' + escapeHtml(events[i]) + '</span></div>';
    }

    overlay.innerHTML =
      '<div class="canopy-modal">' +
        '<button class="canopy-modal-close" aria-label="Close">&times;</button>' +
        '<div class="canopy-modal-header">' +
          '<div class="canopy-modal-logo">' + shieldSvgLarge + '</div>' +
          '<div>' +
            '<div class="canopy-modal-title">' + escapeHtml(config.org_display_name || '') + '</div>' +
            '<div class="canopy-modal-subtitle">Active Canopy AI Agent Liability Policy</div>' +
          '</div>' +
        '</div>' +
        '<p style="font-size:12px;color:#6b7280;margin:0 0 4px;">This service is covered under an active Canopy AI Agent Liability Policy.</p>' +
        '<div class="canopy-modal-limit">' +
          '<div class="canopy-modal-limit-label">Per-incident coverage</div>' +
          '<div class="canopy-modal-limit-value">' + formatCurrency(config.per_incident_limit) + '</div>' +
        '</div>' +
        (eventsHtml ? '<div class="canopy-modal-events">' + eventsHtml + '</div>' : '') +
        '<div class="canopy-modal-links">' +
          '<a href="' + escapeHtml(config.claim_url) + '" class="canopy-modal-link canopy-modal-link-primary">File a Claim</a>' +
          '<a href="' + escapeHtml(config.verify_url) + '" class="canopy-modal-link canopy-modal-link-secondary">View Coverage Details</a>' +
        '</div>' +
        '<div class="canopy-modal-small">Coverage administered by Canopy Coverage Services, Inc.</div>' +
      '</div>';

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('.canopy-modal-close').addEventListener('click', function() {
      overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  function openPendingModal(config) {
    injectStyles();
    var overlay = document.createElement('div');
    overlay.className = 'canopy-modal-overlay';

    overlay.innerHTML =
      '<div class="canopy-modal">' +
        '<button class="canopy-modal-close" aria-label="Close">&times;</button>' +
        '<div class="canopy-modal-header">' +
          '<div class="canopy-modal-logo" style="background:#f3f4f6;">' + shieldSvgGrey + '</div>' +
          '<div>' +
            '<div class="canopy-modal-title">' + escapeHtml((config.org_display_name) || 'This service') + '</div>' +
            '<div class="canopy-modal-subtitle">Coverage Pending</div>' +
          '</div>' +
        '</div>' +
        '<p style="font-size:13px;color:#6b7280;margin:8px 0 0;">This service has applied for Canopy coverage. Coverage is not yet active.</p>' +
      '</div>';

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('.canopy-modal-close').addEventListener('click', function() {
      overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text)));
    return div.innerHTML;
  }

})();

// Explicit event collection: never pass form values, addresses or raw errors.
(function () {
  'use strict';
  var enabled = ['gakkumap.com', 'gakkumap-beta.pages.dev'].indexOf(location.hostname) !== -1;
  var allowed = /^(page_view|school_type_changed|prefecture_selected|municipality_selected|school_selected|boundary_requested|boundary_displayed|boundary_failed|place_search_submitted|place_candidates_returned|place_candidate_selected|place_search_failed|walking_route_requested|walking_route_succeeded|walking_route_failed|clear_clicked|sheet_toggled)$/;
  window.trackUsage = function (event, properties) {
    if (!enabled || !allowed.test(event)) return;
    var safe = {school_type: typeof activeSchoolType === 'string' && activeSchoolType === 'junior-high' ? 'junior-high' : 'elementary'};
    properties = properties || {};
    ['result_count', 'duration_ms'].forEach(function (key) {
      if (typeof properties[key] === 'number' && isFinite(properties[key]) && properties[key] >= 0) safe[key] = Math.round(properties[key]);
    });
    if (/^\d{2}$/.test(properties.prefecture_code || '')) safe.prefecture_code = properties.prefecture_code;
    if (/^\d{5}$/.test(properties.municipality_code || '')) safe.municipality_code = properties.municipality_code;
    if (['search', 'route', 'school', 'expand', 'collapse'].indexOf(properties.action) !== -1) safe.action = properties.action;
    // Explicit overrides prevent URL query strings/referrers leaking into events.
    safe.page_location = location.origin + location.pathname;
    safe.page_referrer = '';
    window.gtag('event', event, safe);
  };
  if (!enabled) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', 'G-BQH1G4QSHK', {
    send_page_view: false, allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: location.origin + location.pathname, page_referrer: ''
  });
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-BQH1G4QSHK';
  document.head.appendChild(script);
  trackUsage('page_view');
  document.addEventListener('DOMContentLoaded', function () {
    ['pref', 'city', 'gaiku'].forEach(function (id, index) {
      var element = document.getElementById(id);
      if (!element) return;
      element.addEventListener('change', function (event) {
        if (!event.isTrusted || element.value === '00') return;
        var properties = {};
        if (id === 'pref') properties.prefecture_code = element.value;
        if (id === 'city') properties.municipality_code = element.value;
        trackUsage(['prefecture_selected', 'municipality_selected', 'school_selected'][index], properties);
      });
    });
    [['place-clear', 'search'], ['walking-clear', 'route']].forEach(function (entry) {
      var button = document.getElementById(entry[0]);
      if (button) button.addEventListener('click', function () { trackUsage('clear_clicked', {action: entry[1]}); });
    });
  });
})();

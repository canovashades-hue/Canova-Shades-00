(function () {
  function pushEvent(payload) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
    } catch (error) {}
  }

  var fields = [
    'gclid', 'gbraid', 'wbraid', 'campaign_id', 'ad_group_id', 'ad_id',
    'keyword', 'match_type', 'device', 'utm_source', 'utm_medium',
    'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'msclkid', 'ttclid'
  ];
  var mapping = {};
  fields.forEach(function (field) { mapping[field] = field; });

  function readStore(store, key) {
    try { return JSON.parse(store.getItem(key) || '{}') || {}; } catch (error) { return {}; }
  }
  function writeStore(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (error) {}
  }
  function deviceType() {
    if (/Mobi|Android|iPhone|iPod|Windows Phone|webOS|BlackBerry/i.test(navigator.userAgent || '')) return 'mobile';
    if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(navigator.userAgent || '')) return 'tablet';
    return 'desktop';
  }
  function resolveTracking() {
    var params = new URLSearchParams(window.location.search);
    var incoming = {};
    Object.keys(mapping).forEach(function (key) {
      var value = params.get(key);
      if (value) incoming[mapping[key]] = value;
    });
    var last = readStore(sessionStorage, 'cs_attr_last');
    var first = readStore(localStorage, 'cs_attr_first');
    fields.forEach(function (key) { if (incoming[key]) last[key] = incoming[key]; });
    var path = window.location.pathname + (window.location.hash || '');
    var externalReferrer = document.referrer && document.referrer.indexOf(window.location.host) === -1 ? document.referrer : '';
    if (!last.landing_path) last.landing_path = path;
    if (last.referrer === undefined) last.referrer = externalReferrer;
    if (!first.first_visit_at) {
      first.first_visit_at = new Date().toISOString();
      first.first_landing_path = path;
      first.first_referrer = externalReferrer;
      fields.forEach(function (key) { if (incoming[key]) first[key] = incoming[key]; });
    }
    writeStore(sessionStorage, 'cs_attr_last', last);
    writeStore(localStorage, 'cs_attr_first', first);
    var result = {};
    fields.forEach(function (key) { result[key] = last[key] || first[key] || ''; });
    result.referrer = last.referrer || '';
    result.first_referrer = first.first_referrer || '';
    result.landing_path = last.landing_path || '';
    result.first_landing_path = first.first_landing_path || '';
    result.first_visit_at = first.first_visit_at || '';
    result.device_type = deviceType();
    result.form_name = 'contact_form';
    result.submission_time = new Date().toISOString();
    return result;
  }

  function populateTracking() {
    var tracking = resolveTracking();
    Object.keys(tracking).forEach(function (key) {
      var input = document.getElementById('tf-' + key);
      if (input) input.value = tracking[key];
    });
    return tracking;
  }

  window.handleSubmit = async function (event) {
    event.preventDefault();
    var form = event.target;
    var button = document.getElementById('submitLeadButton');
    var status = document.getElementById('formStatus');
    if (status) { status.className = 'form-status'; status.textContent = ''; }
    if (button) { button.disabled = true; button.textContent = 'SENDING...'; }
    var value = function (id) { var element = document.getElementById(id); return element ? (element.value || '').trim() : ''; };
    var tracking = populateTracking();
    var payload = {
      full_name: value('f-name'),
      company: value('f-company'),
      email: value('f-email'),
      phone: value('f-phone'),
      service_interested_in: value('f-service'),
      project_brief: value('f-brief')
    };
    Object.keys(tracking).forEach(function (key) { payload[key] = tracking[key]; });
    Object.keys(payload).forEach(function (key) { if (payload[key] === '' || payload[key] == null) delete payload[key]; });
    var saved = false;
    try {
      var response = await fetch('https://xmiwgymwwouztrqtylip.supabase.co/rest/v1/leads', {
        method: 'POST',
        headers: {
          'apikey': 'sb_publishable__6E3MEt6ED29EPLkS5V4kg_8BwCOD6i',
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Database rejected the enquiry (' + response.status + ')');
      saved = true;
    } catch (error) {
      console.error('lead submit failed', error);
      if (status) {
        status.className = 'form-status error';
        status.textContent = 'Enquiry save nahi hui. Please thodi der baad dobara try karein ya hume call karein.';
      }
    } finally {
      if (button) { button.disabled = false; button.textContent = 'SEND ENQUIRY'; }
    }
    if (!saved) return;
    pushEvent({
      event: 'generate_lead',
      form_name: 'enquiry_form',
      service_interested_in: payload.service_interested_in || '',
      lead_source: tracking.utm_source || (tracking.gclid ? 'google_ads' : 'website')
    });
    form.reset();
    var formCard = form.closest('.form-card');
    if (formCard) formCard.querySelector('form').style.display = 'none';
    var success = document.getElementById('formSuccess');
    if (success) success.classList.add('show');
  };

  window.filterProjects = function (button, category) {
    document.querySelectorAll('.chip').forEach(function (chip) { chip.classList.remove('active'); });
    button.classList.add('active');
    document.querySelectorAll('.project-card').forEach(function (card) {
      card.hidden = category !== 'all' && card.dataset.category !== category;
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    resolveTracking();
    var service = new URLSearchParams(window.location.search).get('service');
    var serviceField = document.getElementById('f-service');
    if (service && serviceField) serviceField.value = service;
    var toggle = document.querySelector('.mobile-toggle');
    var nav = document.querySelector('.nav-links');
    if (toggle && nav) toggle.addEventListener('click', function () { nav.classList.toggle('mobile-open'); });
  });
})();
// thred.js (CDN version - browserKey from src URL query param)

(function () {
    const THRED_BASE = 'https://api.thred.dev/v1';
    const CONFIG_ENDPOINT = `${THRED_BASE}/config`;
    const ENRICH_ENDPOINT = `${THRED_BASE}/customers/enrich`;
  
    // ────────────────────────────────────────────────
    // Early exit if not from ChatGPT
    // ────────────────────────────────────────────────
    function isFromChatGPT() {
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get('utm_source')?.toLowerCase() || '';
      const referrer = document.referrer.toLowerCase();
  
      const isChatGPTRef = referrer.includes('chat.openai.com') || referrer.includes('chatgpt.com');
      const isChatGPTUtm =
        utmSource === 'chatgpt' ||
        utmSource.includes('chatgpt') ||
        utmSource === 'chat.openai' ||
        utmSource === 'openai';
  
      return isChatGPTUtm || isChatGPTRef;
    }
  
    if (!isFromChatGPT()) return;
  
    // ────────────────────────────────────────────────
    // Get browserKey from THIS script's src URL query param
    // ────────────────────────────────────────────────
    const scripts = document.getElementsByTagName('script');
    let browserKey = null;
  
    for (let script of scripts) {
      if (script.src.includes('thred.js')) {
        const url = new URL(script.src);
        browserKey = url.searchParams.get('browserKey');
        break;
      }
    }
  
    if (!browserKey) {
      console.debug('[Thred] No browserKey found in script src URL - add ?browserKey=...');
      return;
    }
  
    // ────────────────────────────────────────────────
    // Reuse existing fingerprint if set
    // ────────────────────────────────────────────────
    if (window.thredFingerprint) {
      console.debug('[Thred] Reusing existing fingerprint:', window.thredFingerprint);
      proceedWithFingerprint(window.thredFingerprint, browserKey);
    } else {
      // Load FingerprintJS only if missing
      const fpPromise = import('https://fpjscdn.net/v3/YOUR_BROWSER_TOKEN')
        .then(FingerprintJS => FingerprintJS.load({ region: 'us' }))
        .catch(err => {
          console.debug('[Thred] FingerprintJS load failed:', err);
          return null;
        });
  
      fpPromise
        .then(async fp => {
          if (fp) {
            const result = await fp.get();
            window.thredFingerprint = result.visitorId;
            console.debug('[Thred] New fingerprint:', window.thredFingerprint);
            proceedWithFingerprint(window.thredFingerprint, browserKey);
          } else {
            proceedWithFingerprint(null, browserKey);
          }
        })
        .catch(err => {
          console.debug('[Thred] Fingerprint error:', err);
          proceedWithFingerprint(null, browserKey);
        });
    }
  
    // ────────────────────────────────────────────────
    // Main flow after fingerprint ready
    // ────────────────────────────────────────────────
    function proceedWithFingerprint(fingerprint, browserKey) {
      // POST config request with browserKey
      fetch(CONFIG_ENDPOINT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ browserKey })
      })
        .then(res => {
          if (!res.ok) throw new Error(`Config failed: ${res.status}`);
          return res.json();
        })
        .then(data => {
          const config = data;
          if (!config?.enabled || !config?.apiToken) {
            console.debug('[Thred] Config invalid - missing enabled/apiToken');
            return;
          }
  
          triggerInitialEnrich(fingerprint, config);
          initFormTracking(config);
        })
        .catch(err => {
          console.debug('[Thred] Config POST failed:', err);
        });
    }
  
    function triggerInitialEnrich(fingerprint, config) {
      if (!fingerprint) return;
  
      const payload = {
        fingerprint,
        leadData: {
          discovery: true,
          page_url: window.location.href
        }
      };
  
      fetch(ENRICH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(err => console.debug('[Thred] Initial enrich failed:', err));
    }
  
    function initFormTracking(config) {
      if (!config?.formId) return;
  
      const form = document.getElementById(config.formId);
      if (!form) {
        console.debug('[Thred] Form not found:', config.formId);
        return;
      }
  
      if (!form.dataset.thredTracked) {
        form.addEventListener('submit', (event) => handleFormSubmit(event, config), { capture: true });
        form.dataset.thredTracked = 'true';
      }
  
      const observer = new MutationObserver(() => {
        const f = document.getElementById(config.formId);
        if (f && !f.dataset.thredTracked) {
          f.addEventListener('submit', (event) => handleFormSubmit(event, config), { capture: true });
          f.dataset.thredTracked = 'true';
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  
    function handleFormSubmit(event, config) {
      const form = event.target;
      const formData = new FormData(form);
  
      const email   = formData.get(config.emailField)?.trim() || null;
      const name    = formData.get(config.nameField)?.trim()  || null;
      const company = formData.get(config.companyField)?.trim() || null;
  
      if (!email || !window.thredFingerprint) return;
  
      const payload = {
        fingerprint: window.thredFingerprint,
        leadData: {
          name,
          email,
          company,
          discovery: true
        }
      };
  
      fetch(ENRICH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(err => console.debug('[Thred] Form enrich failed:', err));
    }
  
  })();
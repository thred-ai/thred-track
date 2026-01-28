// thred.js (CDN version - browserKey is the auth key, no separate apiToken)

(function () {
  const THRED_BASE = "https://api.thred.dev/v1";
  const CONFIG_ENDPOINT = `${THRED_BASE}/config`;
  const ENRICH_ENDPOINT = `${THRED_BASE}/customers/enrich`;

  // Early exit if not from ChatGPT
  function isFromChatGPT() {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source")?.toLowerCase() || "";
    const referrer = document.referrer.toLowerCase();

    const isChatGPTRef =
      referrer.includes("chat.openai.com") || referrer.includes("chatgpt.com");
    const isChatGPTUtm =
      utmSource === "chatgpt" ||
      utmSource.includes("chatgpt") ||
      utmSource === "chat.openai" ||
      utmSource === "openai";

    return isChatGPTUtm || isChatGPTRef;
  }

  if (!isFromChatGPT()) return;

  // ────────────────────────────────────────────────
  // Get browserKey from THIS script's src URL
  // ────────────────────────────────────────────────
  const scripts = document.getElementsByTagName("script");
  let browserKey = null;

  for (let script of scripts) {
    if (script.src.includes("thred.js")) {
      const url = new URL(script.src);
      browserKey = url.searchParams.get("browserKey");
      break;
    }
  }

    if (!browserKey) {
      console.log("[Thred] No browserKey in script src - add ?browserKey=...");
      return;
    }

  // ────────────────────────────────────────────────
  // Reuse existing fingerprint if set
  // ────────────────────────────────────────────────
  if (window.thredFingerprint) {
    proceedWithFingerprint(window.thredFingerprint, browserKey);
  } else {
    const fpPromise =
      import("https://thredproxy.com/35ZCuyzokuT1YGd8/Hm7KPMHUZ4duyPRj?apiKey=iyqKVLQt2560EQUyjfxa")
        .then((FingerprintJS) =>
          FingerprintJS.load({
            endpoint: [
              "https://thredproxy.com/35ZCuyzokuT1YGd8/qbWl4nqUSCIDTor4",
              FingerprintJS.defaultEndpoint,
            ],
          }),
        )
        .catch((err) => {
          console.log("[Thred] FP load failed:", err);
          return null;
        });

    fpPromise
      .then(async (fp) => {
        if (fp) {
          const result = await fp.get();
          window.thredFingerprint = result.visitorId;
          proceedWithFingerprint(window.thredFingerprint, browserKey);
        } else {
          proceedWithFingerprint(null, browserKey);
        }
      })
      .catch((err) => {
        console.log("[Thred] FP error:", err);
        proceedWithFingerprint(null, browserKey);
      });
  }

  // ────────────────────────────────────────────────
  // Proceed with config fetch and enrich
  // ────────────────────────────────────────────────
  function proceedWithFingerprint(fingerprint, browserKey) {
    // POST to /config with browserKey (backend validates and returns config)

    fetch(CONFIG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ browserKey }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Config failed: ${res.status}`);
        return res.json();
      })
      .then((config) => {
        if (!config?.enabled) {
          console.log("[Thred] Config disabled");
          return;
        }

        triggerInitialEnrich(fingerprint, browserKey);
        initFormTracking(config);
      })
      .catch((err) => {
        console.log("[Thred] Config POST failed:", err);
      });
  }

  function triggerInitialEnrich(fingerprint, browserKey) {
    if (!fingerprint) return;

    const payload = {
      fingerprint,
      leadData: {
        discovery: true,
        page_url: window.location.href,
      },
    };

    // Use browserKey for auth on enrich calls (backend maps/verifies)
    fetch(ENRICH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Browser-Key": browserKey, // or Authorization: Bearer ${browserKey} if backend prefers
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((err) => null);
  }

  function initFormTracking(config) {
    if (!config?.formId) return;

    const form = document.getElementById(config.formId);
    if (!form) {
      console.log("[Thred] Form not found:", config.formId);
      return;
    }

    if (!form.dataset.thredTracked) {
      form.addEventListener(
        "submit",
        (event) => handleFormSubmit(event, config),
        { capture: true },
      );
      form.dataset.thredTracked = "true";
    }

    const observer = new MutationObserver(() => {
      const f = document.getElementById(config.formId);
      if (f && !f.dataset.thredTracked) {
        f.addEventListener(
          "submit",
          (event) => handleFormSubmit(event, config),
          { capture: true },
        );
        f.dataset.thredTracked = "true";
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function handleFormSubmit(event, config) {
    const form = event.target;
    const formData = new FormData(form);

    const email = formData.get(config.emailField)?.trim() || null;
    const name = formData.get(config.nameField)?.trim() || null;
    const company = formData.get(config.companyField)?.trim() || null;

    if (!email || !name || !window.thredFingerprint) return;

    const payload = {
      fingerprint: window.thredFingerprint,
      leadData: {
        name,
        email,
        company,
        discovery: true,
      },
    };

    fetch(ENRICH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Browser-Key": browserKey, // same auth header for form enrich
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((err) => null);
  }
})();

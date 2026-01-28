// thred.js (CDN version - browserKey as query param, proxied FP, page-view tracking)

(function () {
  const THRED_BASE = "https://api.thred.dev/v1";
  const CONFIG_ENDPOINT = `${THRED_BASE}/config`;
  const ENRICH_ENDPOINT = `${THRED_BASE}/customers/enrich`;
  const PAGE_VIEW_ENDPOINT = `${THRED_BASE}/events/page-view`;

  const FP_PROXY_URL =
    "https://thredproxy.com/35ZCuyzokuT1YGd8/Hm7KPMHUZ4duyPRj?apiKey=iyqKVLQt2560EQUyjfxa";
  const FP_PROXY_ENDPOINT =
    "https://thredproxy.com/35ZCuyzokuT1YGd8/qbWl4nqUSCIDTor4";

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

  // Get browserKey from script src URL
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
    console.debug("[Thred] No browserKey in script src - add ?browserKey=...");
    return;
  }

  // Reuse existing fingerprint if set
  if (window.thredFingerprint) {
    console.debug("[Thred] Reusing fingerprint:", window.thredFingerprint);
    proceedWithFingerprint(window.thredFingerprint, browserKey);
  } else {
    const fpPromise = import(FP_PROXY_URL)
      .then((FingerprintJS) =>
        FingerprintJS.load({
          endpoint: [FP_PROXY_ENDPOINT, FingerprintJS.defaultEndpoint],
        }),
      )
      .catch((err) => {
        console.debug("[Thred] FP load failed:", err);
        return null;
      });

    fpPromise
      .then(async (fp) => {
        if (fp) {
          const result = await fp.get();
          window.thredFingerprint = result.visitorId;
          console.debug("[Thred] Fingerprint stored:", window.thredFingerprint);
          proceedWithFingerprint(window.thredFingerprint, browserKey);
        } else {
          proceedWithFingerprint(null, browserKey);
        }
      })
      .catch((err) => {
        console.debug("[Thred] FP promise error:", err);
        proceedWithFingerprint(null, browserKey);
      });
  }

  // ────────────────────────────────────────────────
  // Main flow after fingerprint ready
  // ────────────────────────────────────────────────
  function proceedWithFingerprint(fingerprint, browserKey) {
    fetch(`${CONFIG_ENDPOINT}?browserKey=${encodeURIComponent(browserKey)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Config failed: ${res.status}`);
        return res.json();
      })
      .then((config) => {
        if (!config?.enabled) {
          console.debug("[Thred] Config disabled");
          return;
        }

        // Track minimal page-view event
        trackPageView(fingerprint, browserKey);

        // Attach form listener
        initFormTracking(config);
      })
      .catch((err) => {
        console.debug("[Thred] Config fetch failed:", err);
      });
  }

  // ────────────────────────────────────────────────
  // Send page view event (very minimal payload)
  // ────────────────────────────────────────────────
  function trackPageView(fingerprint, browserKey) {
    if (!fingerprint) {
      console.debug("[Thred] Skipping page-view - no fingerprint");
      return;
    }

    const payload = {
      event: "page_view",
      data: {
        url: window.location.href,
      },
      fingerprint,
    };

    fetch(
      `${PAGE_VIEW_ENDPOINT}?browserKey=${encodeURIComponent(browserKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      },
    ).catch((err) => {
      console.debug("[Thred] Page-view track failed:", err);
    });
  }

  function initFormTracking(config) {
    if (!config?.formId) {
      console.debug("[Thred] No formId in config");
      return;
    }

    const form = document.getElementById(config.formId);
    if (!form) {
      console.debug("[Thred] Form not found:", config.formId);
      return;
    }

    console.debug("[Thred] Attaching to form:", config.formId);

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

    if (!email || !name || !window.thredFingerprint) {
      console.debug("[Thred] Skipping enrich - missing email or fingerprint");
      return;
    }

    const payload = {
      fingerprint: window.thredFingerprint,
      leadData: {
        name,
        email,
        company,
        discovery: true,
      },
    };

    fetch(`${ENRICH_ENDPOINT}?browserKey=${encodeURIComponent(browserKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok) console.debug("[Thred] Enrich failed:", res.status);
      })
      .catch((err) => console.debug("[Thred] Enrich fetch error:", err));
  }
})();

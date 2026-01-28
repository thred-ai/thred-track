// thred.js (CDN version - with FingerprintJS Pro integration)

(function () {
  const THRED_BASE = "https://api.thred.dev/v1";
  const CONFIG_ENDPOINT = `${THRED_BASE}/config`;
  const ENRICH_ENDPOINT = `${THRED_BASE}/customers/enrich`;

  console.log("Thred loaded");

  // ────────────────────────────────────────────────
  // Early exit: only proceed if from ChatGPT
  // ────────────────────────────────────────────────
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

  console.log("isFromChatGPT", isFromChatGPT());

  if (!isFromChatGPT()) {
    return; // Silent exit
  }

  // ────────────────────────────────────────────────
  // FingerprintJS Pro init (shared promise)
  // Replace YOUR_BROWSER_TOKEN with the actual token from dashboard
  // ────────────────────────────────────────────────
  const fpPromise = import("https://fpjscdn.net/v3/iyqKVLQt2560EQUyjfxa")
    .then((FingerprintJS) => FingerprintJS.load({ region: "us" })) // Change to 'eu' or 'ap' if needed
    .catch((err) => {
      console.debug("[Thred] FingerprintJS load failed:", err);
      return null; // Graceful fallback - proceed without fp
    });

  // ────────────────────────────────────────────────
  // ChatGPT referral confirmed → proceed with Thred logic
  // ────────────────────────────────────────────────

  let config = null;

  const currentDomain = window.location.hostname.replace(/^www\./, "");
  const scriptEl = document.currentScript;
  const scriptKey = scriptEl?.dataset?.key || null;

  let configUrl = `${CONFIG_ENDPOINT}?domain=${encodeURIComponent(currentDomain)}`;
  if (scriptKey) {
    configUrl = `${CONFIG_ENDPOINT}?key=${encodeURIComponent(scriptKey)}`;
  }

  console.log("configUrl", configUrl);

//   fetch(configUrl, {
//     method: "GET",
//     headers: { Accept: "application/json" },
//     cache: "default",
//   })
//     .then((res) => {
//       if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
//       return res.json();
//     })
//     .then((data) => {
//       config = data;
//       if (!config?.enabled || !config?.apiToken) {
//         console.debug("[Thred] Tracking disabled or missing API token");
//         return;
//       }
//       initFormTracking();
//     })
//     .catch((err) => {
//       console.debug("[Thred] Could not load Thred config:", err);
//     });


setTimeout(() => {
    config = {
        formSelector: "#lead-form",
        emailField: "email",
        nameField: "name",
        companyField: "company",
    }
    console.log("config", config);
    initFormTracking()
}, 1000);



  function initFormTracking() {
    if (!config?.formSelector) return;

    const forms = document.querySelectorAll(config.formSelector);

    console.log("forms", forms);

    if (forms.length === 0) {
      console.debug(
        "[Thred] No forms found for selector:",
        config.formSelector,
      );
      return;
    }
    

    forms.forEach((form) => {
        console.log("form", form);
      if (!form.dataset.thredTracked) {
        form.addEventListener("submit", handleSubmit, { capture: true });
        form.dataset.thredTracked = "true";
      }
    });

    const observer = new MutationObserver(() => {
      document.querySelectorAll(config.formSelector).forEach((f) => {
        console.log("f", f);
        if (!f.dataset.thredTracked) {
          f.addEventListener("submit", handleSubmit, { capture: true });
          f.dataset.thredTracked = "true";
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function handleSubmit(event) {

    console.log("handleSubmit", event);
    const form = event.target;
    const formData = new FormData(form);

    const email = formData.get(config.emailField)?.trim() || null;
    const name = formData.get(config.nameField)?.trim() || null;
    const company = formData.get(config.companyField)?.trim() || null;

    console.log("email", email);
    console.log("name", name);
    console.log("company", company);

    if (!email) return;

    // Get fingerprint (wait for init; fallback to null if failed)
    const fp = await fpPromise;
    const result = await fp.get();
    const fingerprint = result ? result.visitorId : null;

    console.log("Fingerprint components:", result); // see visitorId & signals

    const payload = {
      fingerprint,
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
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((err) => {
      console.debug("[Thred] Enrich request failed:", err);
    });
  }
})();

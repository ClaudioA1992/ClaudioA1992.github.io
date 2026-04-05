(function () {
  const ANALYTICS_URL = "https://script.google.com/macros/s/AKfycbw_dymI8Vr622CGFPs4Q74erhLGmw7b36W9ZO63cC4NaYh3Pvo3gyPocSYS_62amas/exec";
  let visitorContext = null;
  let clickCount = 0;
  const MAX_CLICKS_PER_SESSION = 30;

  // CAPTURAR PARÁMETROS UTM
  const urlParams = new URLSearchParams(window.location.search);
  const utmData = {
    utmSource: urlParams.get('utm_source') || 'Direct',
    utmMedium: urlParams.get('utm_medium') || 'none',
    utmCampaign: urlParams.get('utm_campaign') || 'none',
    utmContent: urlParams.get('utm_content') || 'none',
    utmTerm: urlParams.get('utm_term') || 'none'
  };

  const baseEventData = {
    eventType: "pageview",
    pagePath: window.location.pathname,
    pageTitle: document.title,
    language: document.documentElement.getAttribute("data-lang") || document.documentElement.lang || "unknown",
    // AÑADIR UTM A TODOS LOS EVENTOS
    ...utmData
  };

  // Try ipinfo.io first (better CORS)
  fetch("https://ipinfo.io/json")
    .then((r) => r.json())
    .then((data) => {
      sendData({
        ...baseEventData,
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country,
      });
    })
    .catch(() => {
    // Fallback: try ipapi with JSONP or skip
      return tryJSONP();
    })
    .catch(() => {
      // Final fallback: no location data
      sendData({
        ...baseEventData,
        ip: "Unknown",
        city: "Unknown",
        region: "Unknown",
        country: "Unknown",
      });
    });

  function tryJSONP() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const cb = "cb_" + Date.now();
      window[cb] = function (d) {
        delete window[cb];
        document.head.removeChild(script);
        sendData({
          ip: d.ip,
          city: d.city,
          region: d.region,
          country: d.country_name,
        });
        resolve();
      };
      script.onerror = reject;
      script.src = `https://ipapi.co/jsonp?callback=${cb}`;
      document.head.appendChild(script);
      setTimeout(reject, 3000);
    });
  }

  function sendData(locationData) {
    const analyticsData = {
      ...locationData,
      ...utmData, // INCLUIR UTM EN CADA ENVÍO
      device: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? "Mobile" : "Desktop",
      browser: (function () {
        const ua = navigator.userAgent;
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
        if (ua.includes("Edge")) return "Edge";
        return "Other";
      })(),
      referrer: document.referrer || "Direct",
    };

    visitorContext = {
      ip: analyticsData.ip,
      city: analyticsData.city,
      region: analyticsData.region,
      country: analyticsData.country,
      device: analyticsData.device,
      browser: analyticsData.browser,
      referrer: analyticsData.referrer,
      utmSource: analyticsData.utmSource,
      utmMedium: analyticsData.utmMedium,
      utmCampaign: analyticsData.utmCampaign
    };

    fetch(ANALYTICS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analyticsData),
      keepalive: true,
    }).catch(() => {});
  }

  function getClickZone(target) {
    if (!target || !(target instanceof Element)) return "unknown";
    if (target.closest("#header")) return "header";
    if (target.closest("#quiensoy")) return "about";
    if (target.closest("#port")) return "portfolio";
    if (target.closest("#videos")) return "portfolio-videos";
    if (target.closest("#prod")) return "production";
    if (target.closest("#serv")) return "services";
    if (target.closest("#cont")) return "contact";
    if (target.closest(".analytics-notice")) return "privacy-notice";
    if (target.closest("#footer")) return "footer";
    if (target.closest("#container-credito")) return "credits";
    return "other";
  }

  function getTargetLabel(target) {
    const el = target && target.closest ? target.closest("a, button, h1, h2, h3, h4, p, li") : null;
    if (!el) return "unknown";
    if (el.tagName === "A") {
      const href = el.getAttribute("href") || "";
      return href ? `link:${href}` : "link";
    }
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    return text ? `${el.tagName.toLowerCase()}:${text.slice(0, 60)}` : el.tagName.toLowerCase();
  }

  function trackClick(event) {
    if (clickCount >= MAX_CLICKS_PER_SESSION) return;

    const target = event.target;
    const zone = getClickZone(target);
    const eventData = {
      ...(visitorContext || {
        ip: "Unknown",
        city: "Unknown",
        region: "Unknown",
        country: "Unknown",
        device: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? "Mobile" : "Desktop",
        browser: "Unknown",
        referrer: document.referrer || "Direct",
        utmSource: utmData.utmSource,
        utmMedium: utmData.utmMedium,
        utmCampaign: utmData.utmCampaign
      }),
      ...baseEventData,
      eventType: "click",
      zone: zone,
      target: getTargetLabel(target),
      x: event.clientX,
      y: event.clientY,
      xRatio: Number((event.clientX / Math.max(window.innerWidth, 1)).toFixed(4)),
      yRatio: Number((event.clientY / Math.max(window.innerHeight, 1)).toFixed(4)),
      timestamp: new Date().toISOString(),
    };

    clickCount += 1;
    fetch(ANALYTICS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
      keepalive: true,
    }).catch(() => {});
  }

  document.addEventListener("click", trackClick, { passive: true });
})();
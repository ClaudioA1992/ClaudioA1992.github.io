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

  function getElementPath(target) {
    if (!target || !(target instanceof Element)) return "unknown";

    const parts = [];
    let node = target;
    let depth = 0;

    while (node && node.nodeType === 1 && depth < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += `#${node.id}`;
        parts.unshift(part);
        break;
      }
      if (node.classList && node.classList.length) {
        part += `.${Array.from(node.classList).slice(0, 2).join(".")}`;
      }
      parts.unshift(part);
      node = node.parentElement;
      depth += 1;
    }

    return parts.join(" > ") || "unknown";
  }

  function getElementDetails(target) {
    if (!target || !(target instanceof Element)) return "unknown";

    const details = {
      tag: target.tagName.toLowerCase(),
      id: target.id || "",
      classes: target.className || "",
      path: getElementPath(target),
      href: target.getAttribute("href") || "",
      role: target.getAttribute("role") || "",
      name: target.getAttribute("name") || "",
      ariaLabel: target.getAttribute("aria-label") || "",
      text: (target.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
    };

    return JSON.stringify(details);
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
      targetDetail: getElementDetails(target),
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

  function setupInstagramIframeTracking() {
    let lastIframe = null;
    let lastSentAt = 0;
    let lastPointer = null;

    function isInstagramIframe(el) {
      return !!(
        el &&
        el.tagName === "IFRAME" &&
        el.closest &&
        el.closest(".instagram-media")
      );
    }

    function sendInstagramFocusEvent(iframe) {
      if (!isInstagramIframe(iframe)) return;
      if (clickCount >= MAX_CLICKS_PER_SESSION) return;

      const now = Date.now();
      // Evita duplicados cuando blur/focus se disparan más de una vez para el mismo click.
      if (iframe === lastIframe && now - lastSentAt < 1400) return;

      const rect = iframe.getBoundingClientRect();

      function getInstagramSubArea(nx, ny, profile) {
        const isReel = profile.contentType === "reel";

        if (isReel) {
          if (ny < 0.11) return "header-profile";
          if (ny < 0.79) {
            if (nx > 0.84 && ny > 0.38 && ny < 0.77) return "reel-actions-stack";
            return "reel-media";
          }
          if (ny < 0.9) {
            if (nx < 0.28) return "actions-like";
            if (nx < 0.42) return "actions-comment";
            if (nx < 0.56) return "actions-share";
            if (nx > 0.84) return "actions-save";
            return "reel-meta";
          }
          return "footer-link";
        }

        if (ny < 0.12) return "header-profile";
        if (ny < 0.7) return "media";
        if (ny < 0.82) {
          if (nx < 0.22) return "actions-like";
          if (nx < 0.35) return "actions-comment";
          if (nx < 0.48) return "actions-share";
          if (nx > 0.85) return "actions-save";
          return "actions-bar";
        }
        if (ny < 0.94) return "caption-comments";
        return "footer-link";
      }

      function getSubAreaConfidence(pointerSource, nx, ny) {
        if (!pointerSource) return 0.35;

        const edgeDistance = Math.min(nx, 1 - nx, ny, 1 - ny);
        if (edgeDistance < 0.03) return 0.62;
        if (edgeDistance < 0.07) return 0.75;
        return 0.9;
      }

      const hasFreshPointer = (
        lastPointer &&
        now - lastPointer.at < 1400 &&
        lastPointer.x >= rect.left &&
        lastPointer.x <= rect.right &&
        lastPointer.y >= rect.top &&
        lastPointer.y <= rect.bottom
      );

      const x = hasFreshPointer
        ? Math.round(lastPointer.x)
        : Math.max(0, Math.round(rect.left + rect.width / 2));
      const y = hasFreshPointer
        ? Math.round(lastPointer.y)
        : Math.max(0, Math.round(rect.top + Math.min(rect.height / 3, 180)));
      const localX = Math.max(0, Math.min(1, (x - rect.left) / Math.max(rect.width, 1)));
      const localY = Math.max(0, Math.min(1, (y - rect.top) / Math.max(rect.height, 1)));

      function getEmbedBlock(el) {
        if (!el) return null;

        if (el.closest) {
          const direct = el.closest(".instagram-media");
          if (direct) return direct;
        }

        const blocks = document.querySelectorAll(".instagram-media");
        for (let i = 0; i < blocks.length; i += 1) {
          if (blocks[i].contains(el)) return blocks[i];
        }

        return null;
      }

      function getPostPathFromUrl(url) {
        if (!url) return "";
        const cleanUrl = String(url).replace(/&amp;/g, "&");
        const match = cleanUrl.match(/\/(reel|p)\/([^\/?#]+)/i);
        if (!match) return "";
        return `${match[1].toLowerCase()}/${match[2]}`;
      }

      const embed = getEmbedBlock(iframe);
      const permalink = embed ? embed.getAttribute("data-instgrm-permalink") || "" : "";
      const hrefFallback = embed ? ((embed.querySelector("a[href]") || {}).href || "") : "";
      const iframeSrc = iframe.getAttribute("src") || "";

      const permalinkSource = permalink || hrefFallback || iframeSrc;
      const postPath = getPostPathFromUrl(permalinkSource);
      const contentType = postPath.startsWith("reel/") ? "reel" : "post";
      const viewportType = window.innerWidth < 768 ? "mobile" : "desktop";
      const profile = { contentType, viewportType };
      const allEmbeds = Array.from(document.querySelectorAll(".instagram-media"));
      const embedIndex = embed ? allEmbeds.indexOf(embed) + 1 : 0;
      const embedId = embedIndex > 0 ? `embed-${embedIndex}` : "embed-unknown";
      const subArea = getInstagramSubArea(localX, localY, profile);
      const subAreaConfidence = getSubAreaConfidence(hasFreshPointer, localX, localY);
      const confidenceTag = Math.round(subAreaConfidence * 100);
      const sourceTag = hasFreshPointer ? "ptr" : "fb";
      const targetLabel = postPath
        ? `instagram:${embedId}:${postPath}:${subArea}:c${confidenceTag}:${sourceTag}`
        : `instagram:${embedId}:${subArea}:c${confidenceTag}:${sourceTag}`;

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
          utmCampaign: utmData.utmCampaign,
        }),
        ...baseEventData,
        eventType: "click",
        zone: "portfolio-instagram",
        target: targetLabel,
        targetDetail: JSON.stringify({
          embedContainer: embedId,
          permalink: permalink || hrefFallback || "",
          postPath: postPath,
          subArea: subArea,
          subAreaConfidence: Number(subAreaConfidence.toFixed(2)),
          profile: `${contentType}-${viewportType}`,
          source: hasFreshPointer ? "pointer" : "fallback",
          localX: Number(localX.toFixed(4)),
          localY: Number(localY.toFixed(4)),
          iframeSrc: iframeSrc,
          iframePath: getElementPath(iframe),
        }),
        x: x,
        y: y,
        xRatio: Number((x / Math.max(window.innerWidth, 1)).toFixed(4)),
        yRatio: Number((y / Math.max(window.innerHeight, 1)).toFixed(4)),
        timestamp: new Date().toISOString(),
      };

      clickCount += 1;
      lastIframe = iframe;
      lastSentAt = now;

      fetch(ANALYTICS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
        keepalive: true,
      }).catch(() => {});

      lastPointer = null;
    }

    document.addEventListener(
      "pointermove",
      (event) => {
        lastPointer = {
          x: event.clientX,
          y: event.clientY,
          at: Date.now(),
        };
      },
      { passive: true, capture: true }
    );

    window.addEventListener("blur", () => {
      setTimeout(() => {
        sendInstagramFocusEvent(document.activeElement);
      }, 0);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      setTimeout(() => {
        sendInstagramFocusEvent(document.activeElement);
      }, 0);
    });
  }

  document.addEventListener("click", trackClick, { passive: true });
  setupInstagramIframeTracking();
})();
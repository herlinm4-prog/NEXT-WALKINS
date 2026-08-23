(() => {
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom >= 0 && r.top <= innerHeight;
  };
  const visualTokens = () => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!isVisible(el)) continue;
      if (el.children.length > 0) continue;
      const t = (el.innerText || el.textContent || '').replace(/\s+/g,' ').trim();
      if (!t || t.length > 40) continue;
      if (!/^\d{1,3}%$/.test(t) && !/^[A-Za-zÁÉÍÓÚáéíóúÑñ' -]{2,30}$/.test(t)) continue;
      const r = el.getBoundingClientRect();
      out.push({text:t,x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)});
      if (out.length >= 1500) break;
    }
    return out;
  };
  const snapshot = () => ({
    type: 'NEXT_WALKING_MEEVO_SNAPSHOT',
    at: new Date().toISOString(),
    url: location.href,
    title: document.title || '',
    // Read-only visible UI data only. No cookies, storage, password fields or auth tokens.
    visibleText: (document.body?.innerText || '').slice(0, 250000),
    visualTokens: visualTokens()
  });
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'NW_READ_VISIBLE_MEEVO') sendResponse(snapshot());
    return true;
  });
})();
(() => {
  const snapshot = () => {
    const text = document.body?.innerText || '';
    const title = document.title || '';
    return {
      type: 'NEXT_WALKING_MEEVO_SNAPSHOT',
      at: new Date().toISOString(),
      url: location.href,
      title,
      // Deliberately do not read cookies, localStorage, sessionStorage, password fields or auth tokens.
      visibleText: text.slice(0, 250000)
    };
  };
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'NW_READ_VISIBLE_MEEVO') sendResponse(snapshot());
    return true;
  });
})();
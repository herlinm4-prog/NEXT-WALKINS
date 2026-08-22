(() => {
  const emit = async () => {
    const { lastMeevoSnapshot } = await chrome.storage.local.get('lastMeevoSnapshot');
    if (!lastMeevoSnapshot) return;
    window.postMessage({
      source: 'NEXT_WALKING_MEEVO_BRIDGE',
      type: 'MEEVO_SNAPSHOT',
      payload: lastMeevoSnapshot
    }, location.origin);
  };
  emit();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lastMeevoSnapshot) emit();
  });
})();
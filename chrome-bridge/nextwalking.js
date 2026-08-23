(() => {
  const emit=async()=>{const {meevoSnapshots=[],lastMeevoSnapshot}=await chrome.storage.local.get(['meevoSnapshots','lastMeevoSnapshot']);const payload=meevoSnapshots.length?meevoSnapshots:(lastMeevoSnapshot?[lastMeevoSnapshot]:[]);if(!payload.length)return;window.postMessage({source:'NEXT_WALKING_MEEVO_BRIDGE',type:'MEEVO_SNAPSHOTS',payload},location.origin)};
  emit();
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.meevoSnapshots||changes.lastMeevoSnapshot))emit()});
})();
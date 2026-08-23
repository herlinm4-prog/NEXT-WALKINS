(() => {
  const emit=async()=>{const {meevoSnapshots=[],lastMeevoSnapshot}=await chrome.storage.local.get(['meevoSnapshots','lastMeevoSnapshot']);const payload=meevoSnapshots.length?meevoSnapshots:(lastMeevoSnapshot?[lastMeevoSnapshot]:[]);window.postMessage({source:'NEXT_WALKING_MEEVO_BRIDGE',type:'MEEVO_SNAPSHOTS',payload},location.origin)};
  window.addEventListener('message',event=>{if(event.source!==window||event.origin!==location.origin)return;if(event.data?.source==='NEXT_WALKING_APP'&&event.data?.type==='BRIDGE_READY')emit()});
  emit();
  setTimeout(emit,500);setTimeout(emit,1500);setTimeout(emit,3000);
  setInterval(emit,5000);
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.meevoSnapshots||changes.lastMeevoSnapshot))emit()});
})();
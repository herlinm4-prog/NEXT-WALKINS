const status=document.getElementById('status');
document.getElementById('read').addEventListener('click',async()=>{
  status.textContent='Reading…';
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!tab.url?.startsWith('https://na0.meevo.com/')){status.textContent='Open the authenticated Meevo tab first.';return;}
  try{
    const data=await chrome.tabs.sendMessage(tab.id,{type:'NW_READ_VISIBLE_MEEVO'});
    await chrome.storage.local.set({lastMeevoSnapshot:data});
    status.textContent=`Captured visible Meevo page at ${new Date(data.at).toLocaleTimeString()}.\n${data.visibleText.length.toLocaleString()} characters read.\nNo password, cookies or auth tokens captured.`;
  }catch(e){status.textContent='Could not read this tab. Reload Meevo once after installing the extension.';}
});
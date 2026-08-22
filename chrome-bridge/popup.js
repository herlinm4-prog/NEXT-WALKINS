const status=document.getElementById('status');
const NEXT_WALKING='https://herlinm4-prog.github.io/NEXT-WALKINS/?bridge=1';
document.getElementById('read').addEventListener('click',async()=>{
  status.textContent='Reading…';
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!tab.url?.startsWith('https://na0.meevo.com/')){status.textContent='Open the authenticated Meevo tab first.';return;}
  try{
    const data=await chrome.tabs.sendMessage(tab.id,{type:'NW_READ_VISIBLE_MEEVO'});
    await chrome.storage.local.set({lastMeevoSnapshot:data});
    const tabs=await chrome.tabs.query({url:'https://herlinm4-prog.github.io/NEXT-WALKINS/*'});
    if(tabs[0]?.id){await chrome.tabs.update(tabs[0].id,{active:true});}
    else{await chrome.tabs.create({url:NEXT_WALKING});}
    status.textContent=`Meevo captured at ${new Date(data.at).toLocaleTimeString()}. Opening Next Walking…`;
  }catch(e){status.textContent='Could not read this tab. Reload Meevo once after updating the extension.';}
});
(() => {
  const isRendered=(el)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
  const visualTokens=()=>{const out=[];for(const el of document.querySelectorAll('body *')){if(!isRendered(el)||el.children.length>0)continue;const t=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();if(!t||t.length>120)continue;const r=el.getBoundingClientRect();out.push({text:t,x:Math.round(r.left+scrollX),y:Math.round(r.top+scrollY),w:Math.round(r.width),h:Math.round(r.height),cls:String(el.className||'').slice(0,160),tag:el.tagName,title:el.getAttribute('title')||'',aria:el.getAttribute('aria-label')||''});if(out.length>=10000)break}return out};
  const snapshot=()=>({type:'NEXT_WALKING_MEEVO_SNAPSHOT',at:new Date().toISOString(),url:location.href,title:document.title||'',visibleText:(document.body?.innerText||'').slice(0,500000),visualTokens:visualTokens()});
  const keyFor=(s)=>{try{const u=new URL(s.url);return `${u.pathname}${u.search}`.slice(0,240)}catch{return s.title||s.url}};
  const persist=async(s)=>{const {meevoSnapshots=[]}=await chrome.storage.local.get('meevoSnapshots');const key=keyFor(s);const next=[s,...meevoSnapshots.filter(x=>keyFor(x)!==key)].slice(0,20);await chrome.storage.local.set({lastMeevoSnapshot:s,meevoSnapshots:next});};
  let timer=null;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>persist(snapshot()),900)};
  window.addEventListener('load',schedule);window.addEventListener('scroll',schedule,{passive:true});setTimeout(schedule,1500);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-label','title']});
  chrome.runtime.onMessage.addListener((msg,_sender,sendResponse)=>{if(msg?.type==='NW_READ_VISIBLE_MEEVO'){const s=snapshot();persist(s).then(()=>sendResponse(s));return true}return false});
})();
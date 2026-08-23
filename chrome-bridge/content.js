(() => {
  const clean=s=>(s||'').replace(/\s+/g,' ').trim();
  const rendered=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
  const visualTokens=()=>{const out=[];for(const el of document.querySelectorAll('body *')){if(!rendered(el)||el.children.length>0)continue;const t=clean(el.innerText||el.textContent);if(!t||t.length>160)continue;const r=el.getBoundingClientRect();out.push({text:t,x:Math.round(r.left+scrollX),y:Math.round(r.top+scrollY),w:Math.round(r.width),h:Math.round(r.height),cls:String(el.className||'').slice(0,160),tag:el.tagName,title:el.getAttribute('title')||'',aria:el.getAttribute('aria-label')||''});if(out.length>=12000)break}return out};
  const center=t=>t.x+t.w/2,num=s=>Number((s.match(/\d+/)||['0'])[0]);
  const reject=/(meevo|home|appointment|register|today|go|chair|default|smart center|client|service|checkout|calendar|book|more information|search|filter)/i;
  const isName=s=>/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' .-]{1,30}$/.test(s)&&!reject.test(s);
  function compileBarbers(tokens){
    const percentages=tokens.filter(t=>/^\d{1,3}\s*%$/.test(clean(t.text))&&num(t.text)<=100);if(!percentages.length)return[];
    const rows=[];for(const p of percentages.sort((a,b)=>a.y-b.y)){let row=rows.find(r=>Math.abs(r[0].y-p.y)<=20);if(!row){row=[];rows.push(row)}row.push(p)}
    const ps=(rows.sort((a,b)=>b.length-a.length)[0]||[]).sort((a,b)=>center(a)-center(b));if(!ps.length)return[];const hy=ps.reduce((s,p)=>s+p.y,0)/ps.length;
    const names=tokens.filter(t=>isName(clean(t.text))&&t.y>=hy-100&&t.y<=hy+105),anchors=[];
    for(const p of ps){const pc=center(p),n=names.map(n=>({n,dx:Math.abs(center(n)-pc),dy:Math.abs(n.y-p.y)})).filter(v=>v.dx<120).sort((a,b)=>(a.dx*5+a.dy)-(b.dx*5+b.dy))[0]?.n;if(n&&!anchors.some(a=>clean(a.name.text).toUpperCase()===clean(n.text).toUpperCase()))anchors.push({name:n,percent:p})}
    anchors.sort((a,b)=>center(a.percent)-center(b.percent));
    return anchors.map((a,i)=>{const c=center(a.percent),prev=i?center(anchors[i-1].percent):null,next=i<anchors.length-1?center(anchors[i+1].percent):null,left=prev==null?c-(next!=null?(next-c)/2:90):(prev+c)/2,right=next==null?c+(prev!=null?(c-prev)/2:90):(c+next)/2;const col=tokens.filter(t=>center(t)>=left&&center(t)<right&&t.y>hy+35),texts=col.map(t=>clean(t.text)).filter(Boolean),joined=texts.join(' | '),off=/(^|\| )(?:OFF|OFF SHIFT|NOT WORKING)(?: \||$)/i.test(joined),brk=/(^|\| )(?:LUNCH|BREAK)(?: \||$)/i.test(joined),busy=/(checked in|in progress|processing|with client)/i.test(joined);const appointmentYs=[];for(const t of col.filter(t=>/(signature cut|fade cut|hot lather|beard trim|haircut|shave|color|facial|permed|express facial|\bcut\b)/i.test(clean(t.text))).sort((a,b)=>a.y-b.y)){if(!appointmentYs.some(y=>Math.abs(y-t.y)<32))appointmentYs.push(t.y)}return{name:clean(a.name.text),occupancy:num(a.percent.text),appointments:appointmentYs.length,status:off?'OFF SHIFT':brk?'BREAK':busy?'WITH CLIENT':'AVAILABLE',column:{left,right},evidence:{headerY:hy,tokenCount:col.length}}})
  }
  const snapshot=()=>{const tokens=visualTokens();return{type:'NEXT_WALKING_MEEVO_SNAPSHOT',schemaVersion:2,at:new Date().toISOString(),url:location.href,title:document.title||'',visibleText:(document.body?.innerText||'').slice(0,500000),visualTokens:tokens,compiledBarbers:compileBarbers(tokens)}};
  const keyFor=s=>{try{const u=new URL(s.url);return `${u.pathname}${u.search}`.slice(0,240)}catch{return s.title||s.url}};
  const persist=async s=>{const {meevoSnapshots=[]}=await chrome.storage.local.get('meevoSnapshots');const key=keyFor(s);const next=[s,...meevoSnapshots.filter(x=>keyFor(x)!==key)].slice(0,20);await chrome.storage.local.set({lastMeevoSnapshot:s,meevoSnapshots:next})};
  let timer=null;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>persist(snapshot()),700)};
  window.addEventListener('load',schedule);window.addEventListener('scroll',schedule,{passive:true});setTimeout(schedule,1200);
  setInterval(()=>persist(snapshot()),5000);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-label','title','style']});
  chrome.runtime.onMessage.addListener((msg,_sender,sendResponse)=>{if(msg?.type==='NW_READ_VISIBLE_MEEVO'){const s=snapshot();persist(s).then(()=>sendResponse(s));return true}return false});
})();
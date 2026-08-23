import type { Barber } from './scoring';
export type VisualToken={text:string;x:number;y:number;w:number;h:number;cls?:string;tag?:string;title?:string;aria?:string};
export type MeevoBridgeSnapshot={at:string;url:string;title:string;visibleText:string;visualTokens?:VisualToken[]};
const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
const num=(s:string)=>Number((s.match(/-?[\d,.]+/)?.[0]||'0').replace(/,/g,''));
const headerName=(s:string)=>/^[A-Za-z][A-Za-z' -]{1,24}$/.test(s)&&!/(meevo|home|appointment|register|today|go|off|lunch|chair|default|smart center)/i.test(s);
const service=/(signature cut|fade cut|hot lather|beard trim|haircut|shave|color|facial|permed|express facial)/i;
function parseAppointmentBook(snapshot:MeevoBridgeSnapshot):Barber[]{
 const ts=snapshot.visualTokens||[];
 const perc=ts.filter(t=>/^\d{1,3}%$/.test(clean(t.text))&&num(t.text)<=100);
 if(!perc.length)return[];
 // Meevo renders each occupancy percentage in the same horizontal header row.
 const groups=new Map<number,VisualToken[]>();for(const p of perc){const k=Math.round(p.y/8)*8;groups.set(k,[...(groups.get(k)||[]),p])}
 const headerPerc=[...groups.values()].sort((a,b)=>b.length-a.length)[0]||[];if(headerPerc.length<2)return[];
 const headerY=headerPerc.reduce((s,p)=>s+p.y,0)/headerPerc.length;
 // Barber labels sit on the same colored header strip, normally slightly below/overlapping the percentage token.
 const candidates=ts.filter(t=>headerName(clean(t.text))&&t.y>=headerY-25&&t.y<=headerY+70);
 const anchors:Array<{name:VisualToken,percent:VisualToken}>=[];
 for(const p of headerPerc.sort((a,b)=>a.x-b.x)){const pc=p.x+p.w/2;const n=candidates.map(n=>({n,d:Math.abs((n.x+n.w/2)-pc),vy:Math.abs(n.y-p.y)})).filter(v=>v.d<95).sort((a,b)=>(a.d*4+vScore(a.vy))-(b.d*4+vScore(b.vy)))[0]?.n;if(n&&!anchors.some(a=>clean(a.name.text).toUpperCase()===clean(n.text).toUpperCase()))anchors.push({name:n,percent:p})}
 anchors.sort((a,b)=>(a.percent.x+a.percent.w/2)-(b.percent.x+b.percent.w/2));if(!anchors.length)return[];
 return anchors.map(({name:n,percent:p},i)=>{const center=p.x+p.w/2,prev=i?(anchors[i-1].percent.x+anchors[i-1].percent.w/2):null,next=i<anchors.length-1?(anchors[i+1].percent.x+anchors[i+1].percent.w/2):null,left=prev==null?center-(next!=null?(next-center)/2:70):(prev+center)/2,right=next==null?center-(prev!=null?(prev-center)/2:-70):(center+next)/2;
 const column=ts.filter(t=>{const c=t.x+t.w/2;return c>=left&&c<right&&t.y>headerY+45});const texts=column.map(t=>clean(t.text));const joined=texts.join(' | ');const off=texts.some(x=>/^OFF$/i.test(x));const lunch=texts.some(x=>/^LUNCH$/i.test(x));
 // Count appointment cards once by grouping service tokens that share a card/time block, rather than treating client names as staff.
 const serviceTokens=column.filter(t=>service.test(clean(t.text)));const cardYs:number[]=[];for(const t of serviceTokens.sort((a,b)=>a.y-b.y)){if(!cardYs.some(y=>Math.abs(y-t.y)<24))cardYs.push(t.y)}
 const name=clean(n.text).toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());return{id:10000+i,externalId:`bridge:${name.toUpperCase()}`,name,status:off?'OFF SHIFT':lunch?'BREAK':'AVAILABLE',appointments:cardYs.length,occupancy:num(p.text),revenue:0,completed:0,walkins:0,idle:0,next:0,rejections:0,breakMinutes:lunch?1:0,scheduledToday:!off};});
}
const vScore=(n:number)=>n;
function parseOne(s:MeevoBridgeSnapshot){return /appointment/i.test(`${s.title} ${s.url} ${s.visibleText.slice(0,500)}`)?parseAppointmentBook(s):[]}
export function parseBridgeSnapshots(snapshots:MeevoBridgeSnapshot[]):Barber[]{const latest=[...snapshots].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));for(const s of latest){const parsed=parseOne(s);if(parsed.length)return parsed}return[]}
export function listenForMeevoBridge(onSnapshot:(snapshot:MeevoBridgeSnapshot,barbers:Barber[])=>void){const handler=(event:MessageEvent)=>{if(event.origin!==location.origin||event.data?.source!=='NEXT_WALKING_MEEVO_BRIDGE')return;if(event.data?.type==='MEEVO_SNAPSHOTS'){const snapshots=event.data.payload as MeevoBridgeSnapshot[];if(snapshots?.length){const latest=[...snapshots].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];onSnapshot(latest,parseBridgeSnapshots(snapshots))}}};window.addEventListener('message',handler);window.postMessage({source:'NEXT_WALKING_APP',type:'BRIDGE_READY'},location.origin);return()=>window.removeEventListener('message',handler)}
import type { Barber } from './scoring';

export type VisualToken={text:string;x:number;y:number;w:number;h:number};
export type MeevoBridgeSnapshot={at:string;url:string;title:string;visibleText:string;visualTokens?:VisualToken[]};

const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
const blocked=new Set(['MEEVO','HOME','APPOINTMENT BOOK','REGISTER','TODAY','GO','LUNCH','OFF','CHAIR','DEFAULT','APPOINTMENTS','CLIENTS','SERVICES']);
const isName=(s:string)=>/^[A-Za-zÁÉÍÓÚáéíóúÑñ' -]{2,30}$/.test(s)&&!blocked.has(s.toUpperCase());
const isPercent=(s:string)=>/^\d{1,3}%$/.test(s)&&Number(s.replace('%',''))<=100;

function visualPairs(tokens:VisualToken[]){
 const names=tokens.filter(t=>isName(clean(t.text)));
 const percents=tokens.filter(t=>isPercent(clean(t.text)));
 const pairs=new Map<string,number>();
 for(const p of percents){
  const pcx=p.x+p.w/2;
  const nearby=names
   .map(n=>({n,dx:Math.abs((n.x+n.w/2)-pcx),dy:Math.abs(n.y-p.y)}))
   .filter(v=>v.dx<=Math.max(80,p.w*2)&&v.dy<=140)
   .sort((a,b)=>(a.dx*3+a.dy)-(b.dx*3+b.dy));
  const best=nearby[0]?.n;
  if(best){const name=clean(best.text).toUpperCase();pairs.set(name,Number(clean(p.text).replace('%','')))}
 }
 return pairs;
}

export function parseBridgeBarbers(snapshot:MeevoBridgeSnapshot):Barber[]{
 const candidates=snapshot.visualTokens?.length?visualPairs(snapshot.visualTokens):new Map<string,number>();
 const text=snapshot.visibleText||'';
 if(!candidates.size){
  const direct=/\b([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ' -]{2,28})\s+(\d{1,3})%\b/g;
  let m:RegExpExecArray|null;
  while((m=direct.exec(text))){const name=clean(m[1]);const occupancy=Number(m[2]);if(isName(name)&&occupancy<=100)candidates.set(name.toUpperCase(),occupancy)}
 }
 if(!candidates.size){
  const lines=text.split(/\r?\n/).map(clean).filter(Boolean);
  for(let i=0;i<lines.length-1;i++){
   if(isPercent(lines[i+1])&&isName(lines[i]))candidates.set(lines[i].toUpperCase(),Number(lines[i+1].replace('%','')));
  }
 }
 return [...candidates.entries()].map(([raw,occupancy],index)=>{
  const name=raw.toLowerCase().replace(/(^|\s)\S/g,s=>s.toUpperCase());
  return {id:10000+index,externalId:`bridge:${raw}`,name,status:'AVAILABLE',appointments:0,occupancy,revenue:0,completed:0,walkins:0,idle:0,next:90,rejections:0,breakMinutes:0,scheduledToday:true};
 });
}

export function listenForMeevoBridge(onSnapshot:(snapshot:MeevoBridgeSnapshot,barbers:Barber[])=>void){
 const handler=(event:MessageEvent)=>{
  if(event.origin!==location.origin||event.data?.source!=='NEXT_WALKING_MEEVO_BRIDGE'||event.data?.type!=='MEEVO_SNAPSHOT')return;
  const snapshot=event.data.payload as MeevoBridgeSnapshot;
  if(!snapshot?.visibleText)return;
  onSnapshot(snapshot,parseBridgeBarbers(snapshot));
 };
 window.addEventListener('message',handler);
 return()=>window.removeEventListener('message',handler);
}
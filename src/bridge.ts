import type { Barber } from './scoring';

export type MeevoBridgeSnapshot={at:string;url:string;title:string;visibleText:string};

const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
const blocked=new Set(['MEEVO','HOME','APPOINTMENT BOOK','REGISTER','TODAY','GO','LUNCH','OFF','CHAIR','DEFAULT']);

export function parseBridgeBarbers(snapshot:MeevoBridgeSnapshot):Barber[]{
 const text=snapshot.visibleText||'';
 const candidates=new Map<string,number>();
 const direct=/\b([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ' -]{2,28})\s+(\d{1,3})%\b/g;
 let m:RegExpExecArray|null;
 while((m=direct.exec(text))){const name=clean(m[1]);const occupancy=Number(m[2]);if(!blocked.has(name)&&name.length<=30)candidates.set(name,occupancy)}
 if(!candidates.size){
  const lines=text.split(/\r?\n/).map(clean).filter(Boolean);
  for(let i=0;i<lines.length-1;i++){
   if(/^\d{1,3}%$/.test(lines[i+1])&&/^[A-Za-zÁÉÍÓÚáéíóúÑñ' -]{2,30}$/.test(lines[i])){
    const name=lines[i].toUpperCase();if(!blocked.has(name))candidates.set(name,Number(lines[i+1].replace('%','')));
   }
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
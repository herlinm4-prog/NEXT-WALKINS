export type Status='AVAILABLE'|'WITH CLIENT'|'BREAK'|'APPOINTMENT SOON'|'OFF SHIFT';
export type Barber={id:number;name:string;status:Status;appointments:number;occupancy:number;revenue:number;completed:number;walkins:number;idle:number;next:number;rejections:number};
export type Strategy='BALANCED'|'FAIR'|'REVENUE';
export type Weights={availability:number;appointments:number;occupancy:number;revenue:number;idle:number;walkins:number;runway:number;rejections:number};
export const PRESETS:Record<Strategy,Weights>={
 BALANCED:{availability:25,appointments:18,occupancy:16,revenue:14,idle:12,walkins:8,runway:7,rejections:5},
 FAIR:{availability:22,appointments:22,occupancy:16,revenue:10,idle:14,walkins:12,runway:4,rejections:7},
 REVENUE:{availability:28,appointments:10,occupancy:12,revenue:24,idle:8,walkins:4,runway:14,rejections:3}
};
const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));
export function scoreBarber(b:Barber,w:Weights){
 if(b.status==='OFF SHIFT'||b.status==='WITH CLIENT'||b.status==='BREAK') return 0;
 const eligible=b.status==='AVAILABLE'||b.status==='APPOINTMENT SOON';
 if(!eligible) return 0;
 const parts={
  availability:(b.status==='AVAILABLE'?1:.35)*w.availability,
  appointments:(1-clamp(b.appointments/10))*w.appointments,
  occupancy:(1-clamp(b.occupancy/100))*w.occupancy,
  revenue:(1-clamp(b.revenue/700))*w.revenue,
  idle:clamp(b.idle/90)*w.idle,
  walkins:(1-clamp(b.walkins/6))*w.walkins,
  runway:clamp(b.next/90)*w.runway,
  rejections:-clamp(b.rejections/3)*w.rejections
 };
 const total=Object.values(parts).reduce((a,v)=>a+v,0);
 return Math.round(clamp(total/Math.max(1,Object.values(w).reduce((a,v)=>a+v,0)))*100);
}
export function explainBarber(b:Barber){
 const reasons:string[]=[];
 if(b.status==='AVAILABLE') reasons.push('disponible ahora');
 if(b.idle>=45) reasons.push(`${b.idle} min sin cliente`);
 if(b.walkins<=1) reasons.push('pocos walk-ins recibidos');
 if(b.occupancy<55) reasons.push(`ocupación baja (${b.occupancy}%)`);
 if(b.revenue<250) reasons.push(`ingresos bajos ($${b.revenue})`);
 if(b.next>=45) reasons.push(`${b.next} min hasta próxima cita`);
 return reasons.slice(0,4);
}

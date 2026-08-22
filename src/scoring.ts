export type Status='AVAILABLE'|'WITH CLIENT'|'BREAK'|'APPOINTMENT SOON'|'OFF SHIFT';
export type Barber={id:number;externalId?:string;name:string;status:Status;appointments:number;occupancy:number;revenue:number;completed:number;clients?:number;walkins:number;walkinRevenue?:number;walkinAssignments?:number;idle:number;next:number;rejections:number;breakMinutes?:number;scheduledToday?:boolean;shiftStart?:string;shiftEnd?:string};
export type Strategy='BALANCED'|'FAIR'|'REVENUE';
export type Weights={availability:number;appointments:number;occupancy:number;revenue:number;idle:number;walkins:number;runway:number;rejections:number;completed:number;breaks:number};
export const PRESETS:Record<Strategy,Weights>={
 BALANCED:{availability:25,appointments:14,occupancy:14,revenue:12,idle:13,walkins:9,runway:8,rejections:5,completed:7,breaks:3},
 FAIR:{availability:22,appointments:17,occupancy:15,revenue:8,idle:16,walkins:14,runway:5,rejections:7,completed:7,breaks:4},
 REVENUE:{availability:28,appointments:8,occupancy:10,revenue:25,idle:7,walkins:4,runway:15,rejections:3,completed:5,breaks:2}
};
const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));
export function isWorkingToday(b:Barber){return b.scheduledToday!==false&&b.status!=='OFF SHIFT'}
export function filterWorkingToday(barbers:Barber[]){return barbers.filter(isWorkingToday)}
export function isEligible(b:Barber){return isWorkingToday(b)&&(b.status==='AVAILABLE'||b.status==='APPOINTMENT SOON')}
export function scoreBreakdown(b:Barber,w:Weights){
 if(!isEligible(b))return {availability:0,appointments:0,occupancy:0,revenue:0,idle:0,walkins:0,runway:0,rejections:0,completed:0,breaks:0};
 return {
  availability:(b.status==='AVAILABLE'?1:.3)*w.availability,
  appointments:(1-clamp(b.appointments/10))*w.appointments,
  occupancy:(1-clamp(b.occupancy/100))*w.occupancy,
  revenue:(1-clamp(b.revenue/700))*w.revenue,
  idle:clamp(b.idle/90)*w.idle,
  walkins:(1-clamp(b.walkins/6))*w.walkins,
  runway:clamp(b.next/90)*w.runway,
  rejections:-clamp(b.rejections/3)*w.rejections,
  completed:(1-clamp(b.completed/10))*w.completed,
  breaks:-clamp((b.breakMinutes||0)/90)*w.breaks,
 };
}
export function scoreBarber(b:Barber,w:Weights){
 if(!isEligible(b))return 0;
 const parts=scoreBreakdown(b,w);const total=Object.values(parts).reduce((a,v)=>a+v,0);const max=Object.values(w).reduce((a,v)=>a+v,0);return Math.round(clamp(total/Math.max(1,max))*100);
}
export function explainBarber(b:Barber){const reasons:string[]=[];if(b.status==='AVAILABLE')reasons.push('disponible ahora');if(b.idle>=45)reasons.push(`${b.idle} min sin cliente`);if(b.walkins<=1)reasons.push('pocos walk-ins recibidos');if(b.occupancy<55)reasons.push(`ocupación baja (${b.occupancy}%)`);if(b.revenue<250)reasons.push(`ingresos bajos ($${b.revenue})`);if(b.completed<=3)reasons.push('menos servicios completados');if(b.next>=45)reasons.push(`${b.next} min hasta próxima cita`);if(b.rejections>0)reasons.push(`${b.rejections} rechazo${b.rejections===1?'':'s'} registrado${b.rejections===1?'':'s'}`);return reasons.slice(0,5)}

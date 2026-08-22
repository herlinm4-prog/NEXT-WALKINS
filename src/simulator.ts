import type { Barber, Status } from './scoring';

export type SimEvent=
 | {type:'ASSIGN_WALKIN';barberId:number}
 | {type:'CHECKOUT';barberId:number;amount:number}
 | {type:'APPOINTMENT_ADDED';barberId:number;minutesUntil:number}
 | {type:'APPOINTMENT_CANCELLED';barberId:number}
 | {type:'BREAK_TOGGLE';barberId:number}
 | {type:'STATUS';barberId:number;status:Status};

export function applyEvent(barbers:Barber[],event:SimEvent):Barber[]{
 return barbers.map(b=>{
  if(b.id!==event.barberId)return b;
  switch(event.type){
   case 'ASSIGN_WALKIN':return {...b,status:'WITH CLIENT',walkins:b.walkins+1,idle:0};
   case 'CHECKOUT':return {...b,status:'AVAILABLE',revenue:b.revenue+event.amount,completed:b.completed+1,idle:0};
   case 'APPOINTMENT_ADDED':return {...b,appointments:b.appointments+1,next:event.minutesUntil,occupancy:Math.min(100,b.occupancy+10)};
   case 'APPOINTMENT_CANCELLED':return {...b,appointments:Math.max(0,b.appointments-1),occupancy:Math.max(0,b.occupancy-10)};
   case 'BREAK_TOGGLE':return {...b,status:b.status==='BREAK'?'AVAILABLE':'BREAK'};
   case 'STATUS':return {...b,status:event.status};
  }
 });
}

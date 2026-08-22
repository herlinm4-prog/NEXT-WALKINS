import type { Barber, Status } from './scoring';

export type SimEvent=
 | {type:'ASSIGN_WALKIN';barberId:number}
 | {type:'REJECT_WALKIN';barberId:number}
 | {type:'CHECKOUT';barberId:number;amount:number}
 | {type:'APPOINTMENT_ADDED';barberId:number;minutesUntil:number}
 | {type:'APPOINTMENT_CANCELLED';barberId:number}
 | {type:'BREAK_TOGGLE';barberId:number}
 | {type:'STATUS';barberId:number;status:Status};

const inMinutes=(minutes:number)=>new Date(Date.now()+minutes*60_000).toISOString();

export function applyEvent(barbers:Barber[],event:SimEvent):Barber[]{
 return barbers.map(b=>{
  if(b.id!==event.barberId)return b;
  switch(event.type){
   case 'ASSIGN_WALKIN':return {...b,status:'WITH CLIENT',walkins:b.walkins+1,walkinAssignments:(b.walkinAssignments||0)+1,idle:0,localStatusReason:'WALKIN',localStatusUntil:inMinutes(90)};
   case 'REJECT_WALKIN':return {...b,rejections:b.rejections+1};
   case 'CHECKOUT':return {...b,status:'AVAILABLE',revenue:b.revenue+event.amount,localRevenueDelta:(b.localRevenueDelta||0)+event.amount,walkinRevenue:(b.walkinRevenue||0)+event.amount,completed:b.completed+1,clients:(b.clients||b.completed)+1,idle:0,localStatusReason:undefined,localStatusUntil:undefined};
   case 'APPOINTMENT_ADDED':return {...b,appointments:b.appointments+1,next:event.minutesUntil,occupancy:Math.min(100,b.occupancy+10)};
   case 'APPOINTMENT_CANCELLED':return {...b,appointments:Math.max(0,b.appointments-1),occupancy:Math.max(0,b.occupancy-10)};
   case 'BREAK_TOGGLE':return b.status==='BREAK'?{...b,status:'AVAILABLE',localStatusReason:undefined,localStatusUntil:undefined}:{...b,status:'BREAK',localStatusReason:'BREAK',localStatusUntil:inMinutes(120)};
   case 'STATUS':return {...b,status:event.status};
  }
 });
}

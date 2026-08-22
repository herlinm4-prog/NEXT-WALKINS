import type { Barber } from './scoring';
import { idleMinutes, minutesUntil, occupancyPercent, type MeevoShopSnapshot } from './meevoDataModel';

/** Converts a full Meevo refresh into provider-independent ranking state. */
export function mapMeevoSnapshot(snapshot:MeevoShopSnapshot):Barber[]{
  return snapshot.employees.map((e,index)=>({
    id:numericEmployeeId(e.employeeId,index),
    externalId:e.employeeId,
    name:e.name,
    status:e.status,
    appointments:e.appointmentsToday,
    occupancy:occupancyPercent(e),
    revenue:e.revenueToday,
    completed:e.completedServicesToday,
    clients:e.completedClientsToday,
    walkins:e.walkinsToday,
    walkinRevenue:e.walkinRevenueToday,
    walkinAssignments:e.walkinAssignmentsToday,
    idle:idleMinutes(e.lastServiceEndedAt,e.status),
    next:minutesUntil(e.nextAppointmentAt),
    rejections:e.walkinRejectionsToday,
    breakMinutes:e.breakMinutesToday,
    scheduledToday:e.scheduledToday,
    shiftStart:e.shiftStart,
    shiftEnd:e.shiftEnd,
  }));
}

function numericEmployeeId(value:string,index:number){
  const parsed=Number(value);
  if(Number.isSafeInteger(parsed))return parsed;
  let hash=0;
  for(let i=0;i<value.length;i++)hash=((hash<<5)-hash+value.charCodeAt(i))|0;
  return Math.abs(hash)||index+1;
}

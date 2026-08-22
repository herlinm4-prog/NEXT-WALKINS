import type { Barber, Status } from './scoring';
import type { MeevoConnection } from './connection';

const API_BASE=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
const api=(path:string)=>`${API_BASE}${path}`;

const list=(value:any):any[]=>Array.isArray(value)?value:Array.isArray(value?.data)?value.data:Array.isArray(value?.items)?value.items:Array.isArray(value?.Data)?value.Data:Array.isArray(value?.Items)?value.Items:[];
const text=(...values:any[])=>String(values.find(v=>v!==undefined&&v!==null&&String(v).trim())??'').trim();
const num=(...values:any[])=>{const v=values.find(x=>x!==undefined&&x!==null&&x!=='');const n=Number(v);return Number.isFinite(n)?n:0};
const bool=(...values:any[])=>Boolean(values.find(v=>v!==undefined&&v!==null));

function employeeName(e:any){return text(e.DisplayName,e.displayName,e.Nickname,e.nickname,[e.FirstName,e.LastName].filter(Boolean).join(' '),[e.firstName,e.lastName].filter(Boolean).join(' '),'Meevo Employee')}
function employeeId(e:any,index:number){return text(e.EmployeeId,e.employeeId,e.Id,e.id,index+1)}
function statusFrom(e:any):Status{
 const raw=text(e.NextWalkingStatus,e.status,e.Status).toUpperCase();
 if(raw.includes('BREAK'))return 'BREAK';
 if(raw.includes('CLIENT')||raw.includes('SERVICE'))return 'WITH CLIENT';
 if(raw.includes('SOON'))return 'APPOINTMENT SOON';
 if(raw.includes('OFF')||raw.includes('TERMINATED'))return 'OFF SHIFT';
 return 'AVAILABLE';
}

export function mapMeevoEmployees(payload:any):Barber[]{
 return list(payload).map((e,index)=>({
  id:index+1,
  externalId:employeeId(e,index),
  name:employeeName(e),
  status:statusFrom(e),
  appointments:num(e.AppointmentsToday,e.appointmentsToday),
  occupancy:num(e.Occupancy,e.occupancy,e.Utilization,e.utilization),
  revenue:num(e.RevenueToday,e.revenueToday),
  completed:num(e.CompletedToday,e.completedToday),
  walkins:num(e.WalkinsToday,e.walkinsToday),
  idle:num(e.IdleMinutes,e.idleMinutes),
  next:num(e.MinutesToNextAppointment,e.minutesToNextAppointment),
  rejections:num(e.RejectionsToday,e.rejectionsToday),
  breakMinutes:num(e.BreakMinutes,e.breakMinutes),
  scheduledToday:!bool(e.IsTerminated,e.isTerminated),
  shiftStart:text(e.ShiftStart,e.shiftStart)||undefined,
  shiftEnd:text(e.ShiftEnd,e.shiftEnd)||undefined
 }));
}

export async function fetchMeevoBarbers(connection:MeevoConnection):Promise<Barber[]>{
 if(!connection.tenantId||!connection.locationId)return [];
 const response=await fetch(api('/api/meevo/employees'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId:connection.tenantId,locationId:connection.locationId})});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(payload.error||'Meevo employee sync failed.');
 return mapMeevoEmployees(payload.employees);
}

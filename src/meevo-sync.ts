import type { Barber, Status } from './scoring';
import type { MeevoConnection } from './connection';

const API_BASE=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
const api=(path:string)=>`${API_BASE}${path}`;
const list=(value:any):any[]=>Array.isArray(value)?value:Array.isArray(value?.data)?value.data:Array.isArray(value?.items)?value.items:Array.isArray(value?.Data)?value.Data:Array.isArray(value?.Items)?value.Items:[];
const text=(...values:any[])=>String(values.find(v=>v!==undefined&&v!==null&&String(v).trim())??'').trim();
const num=(...values:any[])=>{const v=values.find(x=>x!==undefined&&x!==null&&x!=='');const n=Number(v);return Number.isFinite(n)?n:0};

function employeeName(e:any){return text(e.name,e.DisplayName,e.displayName,e.Nickname,e.nickname,[e.FirstName,e.LastName].filter(Boolean).join(' '),'Meevo Employee')}
function employeeId(e:any,index:number){return text(e.externalId,e.EmployeeId,e.employeeId,e.Id,e.id,index+1)}
function statusFrom(e:any):Status{const raw=text(e.status,e.Status).toUpperCase();if(raw.includes('BREAK'))return'BREAK';if(raw.includes('CLIENT')||raw.includes('SERVICE'))return'WITH CLIENT';if(raw.includes('SOON'))return'APPOINTMENT SOON';if(raw.includes('OFF')||raw.includes('TERMINATED'))return'OFF SHIFT';return'AVAILABLE'}
const formatTime=(raw:any)=>{if(!raw)return undefined;const d=new Date(raw);if(Number.isNaN(d.getTime()))return String(raw);return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})};

export function mapMeevoEmployees(payload:any):Barber[]{return list(payload).map((e,index)=>({
 id:num(e.id,e.Id,index+1)||index+1,
 externalId:employeeId(e,index),name:employeeName(e),status:statusFrom(e),
 appointments:num(e.appointments,e.AppointmentsToday,e.appointmentsToday),
 occupancy:num(e.occupancy,e.Occupancy,e.Utilization,e.utilization),
 revenue:num(e.revenue,e.RevenueToday,e.revenueToday),
 completed:num(e.completed,e.CompletedToday,e.completedToday),
 walkins:num(e.walkins,e.WalkinsToday,e.walkinsToday),
 idle:num(e.idle,e.IdleMinutes,e.idleMinutes),
 next:num(e.next,e.MinutesToNextAppointment,e.minutesToNextAppointment),
 rejections:num(e.rejections,e.RejectionsToday,e.rejectionsToday),
 breakMinutes:num(e.breakMinutes,e.BreakMinutes),
 scheduledToday:e.scheduledToday!==false,
 shiftStart:formatTime(e.shiftStart??e.ShiftStart),shiftEnd:formatTime(e.shiftEnd??e.ShiftEnd)
}));}

export function mergeMeevoWithLocal(live:Barber[],local:Barber[]):Barber[]{
 const byExternal=new Map(local.filter(b=>b.externalId).map(b=>[String(b.externalId),b]));
 return live.map(b=>{const prev=b.externalId?byExternal.get(String(b.externalId)):undefined;if(!prev)return b;return{
  ...b,
  walkins:prev.walkins||0,
  walkinAssignments:prev.walkinAssignments||0,
  walkinRevenue:prev.walkinRevenue||0,
  rejections:prev.rejections||0,
  breakMinutes:Math.max(b.breakMinutes||0,prev.breakMinutes||0)
 };});
}

async function post(path:string,connection:MeevoConnection,extra:Record<string,unknown>={}){if(!connection.tenantId||!connection.locationId)return null;const response=await fetch(api(path),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId:connection.tenantId,locationId:connection.locationId,...extra})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Meevo synchronization failed.');return payload;}

export async function fetchMeevoBarbers(connection:MeevoConnection):Promise<Barber[]>{
 try{const operations=await post('/api/meevo/operations',connection);if(operations?.employees?.length)return mapMeevoEmployees(operations.employees)}catch(error){console.warn('Operational snapshot unavailable, falling back to employees endpoint.',error)}
 const payload=await post('/api/meevo/employees',connection);return mapMeevoEmployees(payload?.employees);
}

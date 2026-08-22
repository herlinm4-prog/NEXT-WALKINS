import http from 'node:http';
import crypto from 'node:crypto';
import {verifyMeevoLocation,meevoGet} from './meevo-client.mjs';

const port=Number(process.env.PORT||8787);
const allowedOrigin=process.env.APP_ORIGIN||'*';
const json=(res,status,payload)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':allowedOrigin,'access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'});res.end(JSON.stringify(payload))};
const readBody=async req=>{let data='';for await(const chunk of req)data+=chunk;if(data.length>20_000)throw new Error('Request too large');return data?JSON.parse(data):{}};
const positiveInt=value=>{const n=Number(value);return Number.isInteger(n)&&n>0?n:null};
const rows=value=>Array.isArray(value)?value:Array.isArray(value?.data)?value.data:Array.isArray(value?.items)?value.items:Array.isArray(value?.Data)?value.Data:Array.isArray(value?.Items)?value.Items:Array.isArray(value?.Results)?value.Results:[];
const value=(o,...keys)=>{for(const k of keys)if(o?.[k]!==undefined&&o?.[k]!==null)return o[k];return undefined};
const numberValue=(o,...keys)=>{const n=Number(value(o,...keys));return Number.isFinite(n)?n:0};
const employeeId=e=>String(value(e,'EmployeeId','employeeId','Id','id')||'');
const employeeName=e=>String(value(e,'DisplayName','displayName','Nickname','nickname')||[value(e,'FirstName','firstName'),value(e,'LastName','lastName')].filter(Boolean).join(' ')||'Meevo Employee');
const appointmentEmployeeId=a=>String(value(a,'EmployeeId','employeeId','ServiceProviderEmployeeId','serviceProviderEmployeeId','BookedEmployeeId','bookedEmployeeId','ProviderId','providerId')||'');
const saleEmployeeId=s=>String(value(s,'EmployeeId','employeeId','ServiceProviderEmployeeId','serviceProviderEmployeeId','ProviderId','providerId')||'');
const dateValue=(o,...keys)=>{const raw=value(o,...keys);if(!raw)return null;const d=new Date(raw);return Number.isNaN(d.getTime())?null:d};
const minutes=(a,b)=>Math.round((b.getTime()-a.getTime())/60000);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const text=(o,...keys)=>String(value(o,...keys)||'').toLowerCase();
const isBreakLike=a=>/break|lunch|meal|off|blocked|personal/.test(text(a,'ServiceName','serviceName','AppointmentTypeName','appointmentTypeName','Description','description','Title','title','StatusName','statusName'));
const isCancelled=a=>/cancel|deleted|no show/.test(text(a,'Status','status','StatusName','statusName','AppointmentStatus','appointmentStatus'));
const saleAmount=s=>numberValue(s,'NetTotal','netTotal','Total','total','Amount','amount','GrandTotal','grandTotal','ServiceTotal','serviceTotal');

async function bootstrap(tenantId,locationId){
 const verified=await verifyMeevoLocation(tenantId,locationId);
 const employees=await meevoGet('/v1/employees',{tenantId,locationId,params:{PageNumber:0,ItemsPerPage:100,IsTerminated:false}});
 return{business:verified.business,locations:verified.locations,employees};
}

async function readDeltas(tenantId,locationId,since){
 const start=since||new Date(Date.now()-10*60*1000).toISOString();
 const attempts=[['/v1/dds/appointments',{StartDate:start}],['/v1/dds/employees',{StartDate:start}],['/v1/dds/sales',{StartDate:start}]];
 const result={appointments:null,employees:null,sales:null};
 for(const [path,params] of attempts){const key=path.split('/').pop();try{result[key]=await meevoGet(path,{tenantId,locationId,params})}catch(error){result[key]={unavailable:true,message:error instanceof Error?error.message:'DDS unavailable'}}}
 return{since:start,receivedAt:new Date().toISOString(),...result};
}

function buildOperationalEmployees(employeesPayload,appointmentsPayload,salesPayload){
 const now=new Date();
 const dayStart=new Date(now);dayStart.setHours(0,0,0,0);
 const dayEnd=new Date(now);dayEnd.setHours(23,59,59,999);
 const employees=rows(employeesPayload),appointments=rows(appointmentsPayload),sales=rows(salesPayload);
 return employees.map((e,index)=>{
  const eid=employeeId(e);
  const mine=appointments.filter(a=>appointmentEmployeeId(a)===eid&&!isCancelled(a));
  const timed=mine.map(a=>({raw:a,start:dateValue(a,'StartTime','startTime','StartDateTime','startDateTime','ServiceStartTime','serviceStartTime','BeginDateTime','beginDateTime'),end:dateValue(a,'EndTime','endTime','EndDateTime','endDateTime','ServiceEndTime','serviceEndTime','FinishDateTime','finishDateTime')})).filter(x=>x.start&&x.start>=dayStart&&x.start<=dayEnd);
  const serviceTimed=timed.filter(x=>!isBreakLike(x.raw));
  const breakTimed=timed.filter(x=>isBreakLike(x.raw));
  const currentService=serviceTimed.find(x=>x.start<=now&&(!x.end||x.end>now));
  const currentBreak=breakTimed.find(x=>x.start<=now&&(!x.end||x.end>now));
  const future=serviceTimed.filter(x=>x.start>now).sort((a,b)=>a.start-b.start);
  const next=future[0];const nextMinutes=next?.start?Math.max(0,minutes(now,next.start)):999;
  const completed=serviceTimed.filter(x=>x.end&&x.end<=now).length;
  const lastCompleted=serviceTimed.filter(x=>x.end&&x.end<=now).sort((a,b)=>b.end-a.end)[0];
  const idle=lastCompleted?.end&&!currentService&&!currentBreak?Math.max(0,minutes(lastCompleted.end,now)):0;
  const bookedMinutes=serviceTimed.reduce((sum,x)=>sum+(x.start&&x.end?Math.max(0,minutes(x.start,x.end)):0),0);
  const breakMinutes=breakTimed.reduce((sum,x)=>sum+(x.start&&x.end?Math.max(0,minutes(x.start,x.end)):0),0);
  const shiftStart=dateValue(e,'ShiftStart','shiftStart','ScheduleStart','scheduleStart','StartTime','startTime');
  const shiftEnd=dateValue(e,'ShiftEnd','shiftEnd','ScheduleEnd','scheduleEnd','EndTime','endTime');
  const scheduledMinutes=shiftStart&&shiftEnd?Math.max(60,minutes(shiftStart,shiftEnd)):Math.max(480,bookedMinutes+breakMinutes);
  const occupancy=Math.round(clamp(bookedMinutes/Math.max(1,scheduledMinutes)*100,0,100));
  const mySales=sales.filter(s=>saleEmployeeId(s)===eid);
  const revenue=Math.round(mySales.reduce((sum,s)=>sum+saleAmount(s),0)*100)/100;
  const isTerminated=Boolean(value(e,'IsTerminated','isTerminated'));
  const isOff=/off/.test(text(currentBreak?.raw,'ServiceName','serviceName','Description','description','Title','title'));
  const status=isTerminated||isOff?'OFF SHIFT':currentBreak?'BREAK':currentService?'WITH CLIENT':nextMinutes<=30?'APPOINTMENT SOON':'AVAILABLE';
  return{
   id:index+1,externalId:eid,name:employeeName(e),status,
   appointments:serviceTimed.length,occupancy,revenue,completed,idle,
   next:nextMinutes===999?0:nextMinutes,breakMinutes,scheduledToday:!isTerminated,
   shiftStart:shiftStart?shiftStart.toISOString():undefined,shiftEnd:shiftEnd?shiftEnd.toISOString():undefined,
   source:'meevo'
  };
 });
}

async function operationalSnapshot(tenantId,locationId,since){
 const employees=await meevoGet('/v1/employees',{tenantId,locationId,params:{PageNumber:0,ItemsPerPage:100,IsTerminated:false}});
 const deltas=await readDeltas(tenantId,locationId,since||new Date(Date.now()-24*60*60*1000).toISOString());
 const operational=buildOperationalEmployees(employees,deltas.appointments,deltas.sales);
 return{employees:operational,deltas,syncedAt:new Date().toISOString()};
}

const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS')return json(res,204,{});
 try{
  if(req.method==='GET'&&req.url==='/api/health')return json(res,200,{ok:true,service:'next-walking-api',mode:'read-only',meevoConfigured:Boolean(process.env.MEEVO_APP_ID&&process.env.MEEVO_APP_SECRET)});
  if(req.method==='POST'&&req.url==='/api/meevo/connect/start'){const body=await readBody(req);const tenantId=positiveInt(body.tenantId||body.companyCode);if(!tenantId)return json(res,400,{ok:false,error:'Enter a valid Meevo Tenant / Company ID.'});return json(res,200,{ok:true,organizationId:crypto.randomUUID(),tenantId:String(tenantId),requiresLocation:true,readOnly:true,message:'Tenant accepted. Verify one accessible location to initialize read-only synchronization.'});}
  if(req.method==='POST'&&req.url==='/api/meevo/connect/verify'){const body=await readBody(req);const tenantId=positiveInt(body.tenantId||body.companyCode),locationId=positiveInt(body.locationId);if(!tenantId||!locationId)return json(res,400,{ok:false,error:'Valid Tenant and Location IDs are required.'});const verified=await verifyMeevoLocation(tenantId,locationId);return json(res,200,{ok:true,readOnly:true,tenantId:String(tenantId),locationId:String(locationId),business:verified.business,locations:verified.locations});}
  if(req.method==='POST'&&req.url==='/api/meevo/bootstrap'){const body=await readBody(req);const tenantId=positiveInt(body.tenantId),locationId=positiveInt(body.locationId);if(!tenantId||!locationId)return json(res,400,{ok:false,error:'Valid Tenant and Location IDs are required.'});const data=await bootstrap(tenantId,locationId);return json(res,200,{ok:true,readOnly:true,syncedAt:new Date().toISOString(),tenantId:String(tenantId),locationId:String(locationId),...data});}
  if(req.method==='POST'&&req.url==='/api/meevo/employees'){const body=await readBody(req);const tenantId=positiveInt(body.tenantId),locationId=positiveInt(body.locationId);if(!tenantId||!locationId)return json(res,400,{ok:false,error:'Valid Tenant and Location IDs are required.'});const employees=await meevoGet('/v1/employees',{tenantId,locationId,params:{PageNumber:0,ItemsPerPage:100,IsTerminated:false}});return json(res,200,{ok:true,employees,count:rows(employees).length});}
  if(req.method==='POST'&&req.url==='/api/meevo/sync'){const body=await readBody(req);const tenantId=positiveInt(body.tenantId),locationId=positiveInt(body.locationId);if(!tenantId||!locationId)return json(res,400,{ok:false,error:'Valid Tenant and Location IDs are required.'});const deltas=await readDeltas(tenantId,locationId,body.since);return json(res,200,{ok:true,readOnly:true,deltas});}
  if(req.method==='POST'&&req.url==='/api/meevo/operations'){const body=await readBody(req);const tenantId=positiveInt(body.tenantId),locationId=positiveInt(body.locationId);if(!tenantId||!locationId)return json(res,400,{ok:false,error:'Valid Tenant and Location IDs are required.'});const snapshot=await operationalSnapshot(tenantId,locationId,body.since);return json(res,200,{ok:true,readOnly:true,tenantId:String(tenantId),locationId:String(locationId),...snapshot});}
  return json(res,404,{ok:false,error:'Not found'});
 }catch(error){console.error(error);return json(res,500,{ok:false,error:error instanceof Error?error.message:'Server error'})}
});
server.listen(port,()=>console.log(`Next Walking API listening on ${port} (read-only)`));

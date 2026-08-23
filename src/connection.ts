export type MeevoPermission='VIEW_ALL_EMPLOYEES'|'VIEW_APPOINTMENTS'|'VIEW_SALES'|'VIEW_SCHEDULES';
export type MeevoConnectionStatus='DEMO'|'NOT_CONFIGURED'|'CONNECTING'|'CONNECTED'|'PERMISSIONS_REQUIRED'|'ERROR';
export type MeevoRegion='NA0'|'NA1'|'EU';
export type MeevoLocation={id:string;name:string;selected:boolean};
export type MeevoConnection={status:MeevoConnectionStatus;organizationId?:string;businessName?:string;companyCode?:string;region?:MeevoRegion;tenantId?:string;locationId?:string;displayName?:string;locations?:MeevoLocation[];permissions:MeevoPermission[];lastSyncAt?:string;message?:string};
export type ApiHealth={ok:boolean;service?:string;mode?:string;meevoConfigured?:boolean};

const KEY='next-walking:meevo-connection:v3';
const API_BASE=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
const api=(path:string)=>`${API_BASE}${path}`;
export const REQUIRED_PERMISSIONS:MeevoPermission[]=['VIEW_ALL_EMPLOYEES','VIEW_APPOINTMENTS','VIEW_SALES','VIEW_SCHEDULES'];
export const MEEVO_REGIONS:{id:MeevoRegion;label:string;baseUrl:string}[]=[{id:'NA0',label:'North America · NA0',baseUrl:'https://na0.meevo.com'},{id:'NA1',label:'North America · NA1',baseUrl:'https://na1.meevo.com'},{id:'EU',label:'Europe',baseUrl:'https://meevo.com'}];
export const getApiBase=()=>API_BASE;
const disconnected=():MeevoConnection=>({status:'NOT_CONFIGURED',permissions:[],message:'Meevo not connected'});
export function loadConnection():MeevoConnection{try{return JSON.parse(localStorage.getItem(KEY)||'null')||disconnected()}catch{return disconnected()}}
export function saveConnection(connection:MeevoConnection){localStorage.setItem(KEY,JSON.stringify(connection))}
export function missingPermissions(connection:MeevoConnection){return REQUIRED_PERMISSIONS.filter(p=>!connection.permissions.includes(p))}
export function validateConnection(connection:MeevoConnection){const missing=missingPermissions(connection);return{ready:connection.status==='CONNECTED'&&missing.length===0,missing}}
export function resetConnection():MeevoConnection{return disconnected()}
export function createDemoConnectedState():MeevoConnection{return{status:'DEMO',organizationId:'demo-org',businessName:'Demo Barbershop',companyCode:'DEMO',region:'NA0',tenantId:'DEMO-TENANT',locationId:'1',displayName:'Demo Barbershop · Main Location',locations:[{id:'1',name:'Main Location',selected:true}],permissions:[],lastSyncAt:new Date().toISOString(),message:'Development preview only'}}
async function request(path:string,options?:RequestInit){const response=await fetch(api(path),options);const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`Request failed (${response.status})`);return payload}
export async function checkApiHealth():Promise<ApiHealth>{try{return await request('/api/health') as ApiHealth}catch{return{ok:false}}}
export async function startMeevoConnection(input:{businessName:string;companyCode:string;region:MeevoRegion}){return await request('/api/meevo/connect/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}) as {ok:true;organizationId:string;tenantId:string;requiresLocation:boolean;message:string}}
export async function verifyMeevoConnection(input:{tenantId:string;locationId:string}){return await request('/api/meevo/connect/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}) as {ok:true;tenantId:string;locationId:string;business:any;locations:any}}
export function selectLocation(connection:MeevoConnection,locationId:string):MeevoConnection{return{...connection,locationId,locations:(connection.locations||[]).map(l=>({...l,selected:l.id===locationId})),lastSyncAt:undefined,message:'Location selected. Synchronizing…'}}

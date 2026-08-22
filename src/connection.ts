export type MeevoPermission='VIEW_ALL_EMPLOYEES'|'VIEW_APPOINTMENTS'|'VIEW_SALES'|'VIEW_SCHEDULES';
export type MeevoConnectionStatus='DEMO'|'NOT_CONFIGURED'|'CONNECTING'|'CONNECTED'|'PERMISSIONS_REQUIRED'|'ERROR';
export type MeevoRegion='NA0'|'NA1'|'EU';
export type MeevoLocation={id:string;name:string;selected:boolean};
export type MeevoConnection={
 status:MeevoConnectionStatus;
 organizationId?:string;
 businessName?:string;
 companyCode?:string;
 region?:MeevoRegion;
 tenantId?:string;
 locationId?:string;
 displayName?:string;
 locations?:MeevoLocation[];
 permissions:MeevoPermission[];
 lastSyncAt?:string;
 message?:string;
};

const KEY='next-walking:meevo-connection:v2';
const API_BASE=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
const api=(path:string)=>`${API_BASE}${path}`;
export const REQUIRED_PERMISSIONS:MeevoPermission[]=['VIEW_ALL_EMPLOYEES','VIEW_APPOINTMENTS','VIEW_SALES','VIEW_SCHEDULES'];
export const MEEVO_REGIONS:{id:MeevoRegion;label:string;baseUrl:string}[]=[
 {id:'NA0',label:'North America · NA0',baseUrl:'https://na0.meevo.com'},
 {id:'NA1',label:'North America · NA1',baseUrl:'https://na1.meevo.com'},
 {id:'EU',label:'Europe',baseUrl:'https://meevo.com'}
];

export function loadConnection():MeevoConnection{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{status:'NOT_CONFIGURED',permissions:[],message:'Meevo no conectado'}}catch{return{status:'NOT_CONFIGURED',permissions:[],message:'Meevo no conectado'}}}
export function saveConnection(connection:MeevoConnection){localStorage.setItem(KEY,JSON.stringify(connection))}
export function missingPermissions(connection:MeevoConnection){return REQUIRED_PERMISSIONS.filter(p=>!connection.permissions.includes(p))}
export function validateConnection(connection:MeevoConnection){const missing=missingPermissions(connection);return{ready:connection.status==='CONNECTED'&&missing.length===0,missing}}
export function resetConnection():MeevoConnection{return{status:'NOT_CONFIGURED',permissions:[],message:'Meevo no conectado'}}
export function createDemoConnectedState():MeevoConnection{return{status:'CONNECTED',organizationId:'demo-org',businessName:'Barbería Demo',companyCode:'DEMO',region:'NA0',tenantId:'DEMO-TENANT',locationId:'1',displayName:'Barbería Demo · Main Location',locations:[{id:'1',name:'Main Location',selected:true}],permissions:[...REQUIRED_PERMISSIONS],lastSyncAt:new Date().toISOString(),message:'Conexión simulada para desarrollo'}}

export async function startMeevoConnection(input:{businessName:string;companyCode:string;region:MeevoRegion}){
 const response=await fetch(api('/api/meevo/connect/start'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(payload.error||'No se pudo iniciar la conexión segura con Meevo.');
 return payload as {ok:true;organizationId:string;tenantId:string;requiresLocation:boolean;message:string};
}

export async function verifyMeevoConnection(input:{tenantId:string;locationId:string}){
 const response=await fetch(api('/api/meevo/connect/verify'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(payload.error||'No se pudo verificar la ubicación de Meevo.');
 return payload as {ok:true;tenantId:string;locationId:string;business:any;locations:any};
}

export type MeevoPermission='VIEW_ALL_EMPLOYEES'|'VIEW_APPOINTMENTS'|'VIEW_SALES'|'VIEW_SCHEDULES';
export type MeevoConnectionStatus='DEMO'|'CONNECTING'|'CONNECTED'|'PERMISSIONS_REQUIRED'|'ERROR';
export type MeevoConnection={status:MeevoConnectionStatus;tenantId?:string;locationId?:string;displayName?:string;permissions:MeevoPermission[];lastSyncAt?:string;message?:string};
const KEY='next-walking:meevo-connection:v1';
export const REQUIRED_PERMISSIONS:MeevoPermission[]=['VIEW_ALL_EMPLOYEES','VIEW_APPOINTMENTS','VIEW_SALES','VIEW_SCHEDULES'];
export function loadConnection():MeevoConnection{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{status:'DEMO',permissions:[],message:'Modo demo activo'}}catch{return{status:'DEMO',permissions:[],message:'Modo demo activo'}}}
export function saveConnection(connection:MeevoConnection){localStorage.setItem(KEY,JSON.stringify(connection))}
export function missingPermissions(connection:MeevoConnection){return REQUIRED_PERMISSIONS.filter(p=>!connection.permissions.includes(p))}
export function validateConnection(connection:MeevoConnection){const missing=missingPermissions(connection);return{ready:connection.status==='CONNECTED'&&missing.length===0,missing}}
export function createDemoConnectedState():MeevoConnection{return{status:'CONNECTED',tenantId:'DEMO-TENANT',locationId:'1',displayName:'Barbería Demo',permissions:[...REQUIRED_PERMISSIONS],lastSyncAt:new Date().toISOString(),message:'Conexión simulada para desarrollo'}}
const TOKEN_SKEW_MS=60_000;
let cachedToken=null;

function required(name){const value=process.env[name];if(!value)throw new Error(`Missing server secret ${name}`);return value}

export function meevoConfig(){return{
  clientId:required('MEEVO_APP_ID'),
  clientSecret:required('MEEVO_APP_SECRET'),
  tokenUrl:required('MEEVO_TOKEN_URL'),
  apiBaseUrl:required('MEEVO_API_BASE_URL').replace(/\/$/,'')
}}

export async function getMeevoToken(){
  if(cachedToken&&cachedToken.expiresAt-Date.now()>TOKEN_SKEW_MS)return cachedToken.value;
  const cfg=meevoConfig();
  const body=new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.clientSecret});
  const response=await fetch(cfg.tokenUrl,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body});
  if(!response.ok)throw new Error(`Meevo authentication failed (${response.status})`);
  const json=await response.json();
  if(!json.access_token)throw new Error('Meevo did not return an access token');
  cachedToken={value:json.access_token,expiresAt:Date.now()+Number(json.expires_in||3600)*1000};
  return cachedToken.value;
}

export async function meevoGet(path,{tenantId,locationId,params={}}){
  const token=await getMeevoToken();
  const cfg=meevoConfig();
  const url=new URL(cfg.apiBaseUrl+path);
  url.searchParams.set('TenantId',String(tenantId));
  url.searchParams.set('LocationId',String(locationId));
  url.searchParams.set('RequestId',crypto.randomUUID());
  for(const [key,value] of Object.entries(params))if(value!==undefined&&value!==null)url.searchParams.set(key,String(value));
  const response=await fetch(url,{headers:{Accept:'application/json',Authorization:`Bearer ${token}`}});
  if(!response.ok){const text=await response.text();throw new Error(`Meevo API ${response.status}: ${text.slice(0,240)}`)}
  return response.json();
}

export async function verifyMeevoLocation(tenantId,locationId){
  const [business,locations]=await Promise.all([
    meevoGet('/v1/businessInformation',{tenantId,locationId}),
    meevoGet('/v1/locations',{tenantId,locationId,params:{PageNumber:0,ItemsPerPage:100}})
  ]);
  return{business,locations};
}

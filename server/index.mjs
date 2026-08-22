import http from 'node:http';
import crypto from 'node:crypto';
import {verifyMeevoLocation,meevoGet} from './meevo-client.mjs';

const port=Number(process.env.PORT||8787);
const allowedOrigin=process.env.APP_ORIGIN||'*';
const json=(res,status,payload)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':allowedOrigin,'access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'});res.end(JSON.stringify(payload))};
const readBody=async req=>{let data='';for await(const chunk of req)data+=chunk;if(data.length>20_000)throw new Error('Request too large');return data?JSON.parse(data):{}};
const positiveInt=value=>{const n=Number(value);return Number.isInteger(n)&&n>0?n:null};

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS')return json(res,204,{});
  try{
    if(req.method==='GET'&&req.url==='/api/health')return json(res,200,{ok:true,service:'next-walking-api',meevoConfigured:Boolean(process.env.MEEVO_APP_ID&&process.env.MEEVO_APP_SECRET)});

    if(req.method==='POST'&&req.url==='/api/meevo/connect/start'){
      const body=await readBody(req);
      const tenantId=positiveInt(body.tenantId||body.companyCode);
      if(!tenantId)return json(res,400,{ok:false,error:'Enter a valid Meevo Tenant / Company ID.'});
      const organizationId=crypto.randomUUID();
      return json(res,200,{ok:true,organizationId,tenantId:String(tenantId),requiresLocation:true,message:'Tenant accepted. Enter one accessible Meevo Location ID to discover all available locations.'});
    }

    if(req.method==='POST'&&req.url==='/api/meevo/connect/verify'){
      const body=await readBody(req);
      const tenantId=positiveInt(body.tenantId||body.companyCode);
      const locationId=positiveInt(body.locationId);
      if(!tenantId||!locationId)return json(res,400,{ok:false,error:'Valid Tenant and Location IDs are required.'});
      const verified=await verifyMeevoLocation(tenantId,locationId);
      return json(res,200,{ok:true,tenantId:String(tenantId),locationId:String(locationId),business:verified.business,locations:verified.locations});
    }

    if(req.method==='POST'&&req.url==='/api/meevo/employees'){
      const body=await readBody(req);const tenantId=positiveInt(body.tenantId),locationId=positiveInt(body.locationId);
      if(!tenantId||!locationId)return json(res,400,{ok:false,error:'Valid Tenant and Location IDs are required.'});
      const employees=await meevoGet('/v1/employees',{tenantId,locationId,params:{PageNumber:0,ItemsPerPage:100,IsTerminated:false}});
      return json(res,200,{ok:true,employees});
    }

    return json(res,404,{ok:false,error:'Not found'});
  }catch(error){console.error(error);return json(res,500,{ok:false,error:error instanceof Error?error.message:'Server error'})}
});
server.listen(port,()=>console.log(`Next Walking API listening on ${port}`));

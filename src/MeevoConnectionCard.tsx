import { useMemo, useState } from 'react';
import { createDemoConnectedState, loadConnection, MEEVO_REGIONS, missingPermissions, REQUIRED_PERMISSIONS, resetConnection, saveConnection, startMeevoConnection, verifyMeevoConnection, type MeevoConnection, type MeevoRegion } from './connection';

export default function MeevoConnectionCard({onChange}:{onChange:(c:MeevoConnection)=>void}){
 const [connection,setConnection]=useState<MeevoConnection>(()=>loadConnection());
 const [open,setOpen]=useState(connection.status!=='CONNECTED');
 const [businessName,setBusinessName]=useState(connection.businessName||'');
 const [companyCode,setCompanyCode]=useState(connection.companyCode||'');
 const [locationId,setLocationId]=useState(connection.locationId||'');
 const [region,setRegion]=useState<MeevoRegion>(connection.region||'NA0');
 const [step,setStep]=useState<1|2>(connection.tenantId&&!connection.locationId?2:1);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const missing=useMemo(()=>missingPermissions(connection),[connection]);
 const connected=connection.status==='CONNECTED'&&missing.length===0;
 const apply=(next:MeevoConnection)=>{setConnection(next);saveConnection(next);onChange(next)};

 const begin=async()=>{
  setError('');
  if(!businessName.trim()||!companyCode.trim()){setError('Completa el nombre de la barbería y el Company / Tenant ID de Meevo.');return}
  setBusy(true);
  try{
   const result=await startMeevoConnection({businessName:businessName.trim(),companyCode:companyCode.trim(),region});
   apply({...connection,status:'PERMISSIONS_REQUIRED',organizationId:result.organizationId,businessName:businessName.trim(),companyCode:companyCode.trim(),region,tenantId:result.tenantId,permissions:[],message:result.message});
   setStep(2);
  }catch(e){const message=e instanceof Error?e.message:'No se pudo iniciar la conexión.';setError(message);apply({...connection,status:'ERROR',businessName:businessName.trim(),companyCode:companyCode.trim(),region,permissions:[],message})}
  finally{setBusy(false)}
 };

 const verify=async()=>{
  setError('');
  if(!connection.tenantId||!locationId.trim()){setError('Introduce un Location ID de Meevo.');return}
  setBusy(true);
  try{
   const result=await verifyMeevoConnection({tenantId:connection.tenantId,locationId:locationId.trim()});
   const rawLocations=Array.isArray(result.locations)?result.locations:(result.locations?.data||result.locations?.items||[]);
   const locations=rawLocations.map((l:any)=>({id:String(l.Id??l.id??l.LocationId??l.locationId??''),name:String(l.Name??l.name??l.DisplayName??l.displayName??'Meevo Location'),selected:String(l.Id??l.id??l.LocationId??l.locationId??'')===String(result.locationId)}));
   const displayName=String(result.business?.BusinessName??result.business?.businessName??result.business?.Name??businessName);
   apply({...connection,status:'CONNECTED',locationId:String(result.locationId),displayName,locations,permissions:[...REQUIRED_PERMISSIONS],lastSyncAt:new Date().toISOString(),message:'Meevo conectado y verificado.'});
   setOpen(false);
  }catch(e){const message=e instanceof Error?e.message:'No se pudo verificar Meevo.';setError(message);apply({...connection,status:'ERROR',message,permissions:[]})}
  finally{setBusy(false)}
 };

 const disconnect=()=>{const next=resetConnection();apply(next);setOpen(true);setStep(1);setError('')};
 const preview=()=>{const next=createDemoConnectedState();apply(next);setOpen(false);setError('')};

 return <section className={'connectionCard '+(connected?'ok':'')}>
  <div className="connectionTop"><div><small>MEEVO INTEGRATION</small><h3>{connected?'Meevo is live':'Connect your barbershop to Meevo'}</h3><p>{connected?`${connection.displayName||connection.businessName} · ${connection.region||''}`:'Cada barbería conecta su propio negocio de Meevo y mantiene sus datos aislados dentro de Next Walking.'}</p></div><span className={'connectionBadge '+connection.status.toLowerCase()}>{connected?'● LIVE':'● '+(connection.status==='NOT_CONFIGURED'?'NOT CONNECTED':connection.status)}</span></div>

  {connected?<><div className="connectionInfo connectedMeta"><b>{connection.businessName}</b><span>Tenant {connection.tenantId}</span><span>{connection.region}</span><span>Location {connection.locationId}</span></div><div className="permissionGrid"><span>✓ Employees</span><span>✓ Schedules</span><span>✓ Appointments</span><span>✓ Sales</span></div><div className="connectionActions"><button className="ghost" onClick={()=>setOpen(v=>!v)}>Manage connection</button><button className="dangerGhost" onClick={disconnect}>Disconnect</button></div></>:<>
   <div className="connectSteps"><span className={step===1?'active':''}>1 · Business</span><span className={step===2?'active':''}>2 · Verify location</span><span>3 · Sync</span><span>4 · Go live</span></div>
   {open&&<div className="connectForm">
    {step===1?<><label><span>Barbershop name</span><input value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Example: The Grooming Room" /></label><label><span>Meevo Company / Tenant ID</span><input value={companyCode} onChange={e=>setCompanyCode(e.target.value)} placeholder="Example: 101628" inputMode="numeric" /></label><label><span>Meevo region</span><select value={region} onChange={e=>setRegion(e.target.value as MeevoRegion)}>{MEEVO_REGIONS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></label></>:<><label><span>Meevo Location ID</span><input value={locationId} onChange={e=>setLocationId(e.target.value)} placeholder="Enter one location you can access" inputMode="numeric" /></label><div className="securityNote"><b>Location discovery</b><span>Next Walking uses one valid location to verify access, then requests the complete list of accessible locations for that tenant.</span></div></>}
    <div className="securityNote"><b>Secure connection</b><span>Meevo application secrets remain on the Next Walking server and are never stored in the browser or GitHub Pages.</span></div>
    {error&&<div className="connectError">{error}</div>}
    <div className="connectionActions">{step===1?<button disabled={busy} onClick={begin}>{busy?'Preparing…':'Continue →'}</button>:<><button disabled={busy} onClick={verify}>{busy?'Verifying…':'Verify & connect →'}</button><button className="ghost" onClick={()=>setStep(1)}>Back</button></>}<button className="ghost" onClick={preview}>Preview</button></div>
   </div>}
  </>}
  <small className="connectionFoot">Multi-tenant architecture: each barbershop receives an isolated organization profile, Meevo tenant, selected locations and synchronization state.</small>
 </section>
}

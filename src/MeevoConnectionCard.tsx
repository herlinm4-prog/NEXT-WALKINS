import { useMemo, useState } from 'react';
import { createDemoConnectedState, loadConnection, MEEVO_REGIONS, missingPermissions, resetConnection, saveConnection, startMeevoConnection, type MeevoConnection, type MeevoRegion } from './connection';

export default function MeevoConnectionCard({onChange}:{onChange:(c:MeevoConnection)=>void}){
 const [connection,setConnection]=useState<MeevoConnection>(()=>loadConnection());
 const [open,setOpen]=useState(connection.status!=='CONNECTED');
 const [businessName,setBusinessName]=useState(connection.businessName||'');
 const [companyCode,setCompanyCode]=useState(connection.companyCode||'');
 const [region,setRegion]=useState<MeevoRegion>(connection.region||'NA0');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const missing=useMemo(()=>missingPermissions(connection),[connection]);
 const connected=connection.status==='CONNECTED'&&missing.length===0;
 const apply=(next:MeevoConnection)=>{setConnection(next);saveConnection(next);onChange(next)};

 const begin=async()=>{
  setError('');
  if(!businessName.trim()||!companyCode.trim()){setError('Completa el nombre de la barbería y el Company Code de Meevo.');return}
  setBusy(true);
  apply({...connection,status:'CONNECTING',businessName:businessName.trim(),companyCode:companyCode.trim(),region,permissions:[],message:'Preparando autorización segura…'});
  try{
   const result=await startMeevoConnection({businessName:businessName.trim(),companyCode:companyCode.trim(),region});
   if(result.authorizationUrl){window.location.assign(result.authorizationUrl);return}
   apply({...connection,status:'PERMISSIONS_REQUIRED',organizationId:result.organizationId,businessName:businessName.trim(),companyCode:companyCode.trim(),region,permissions:[],message:'Autorización iniciada. Completa el acceso de Meevo.'});
  }catch(e){
   const message=e instanceof Error?e.message:'No se pudo iniciar la conexión.';
   setError(message);
   apply({...connection,status:'ERROR',businessName:businessName.trim(),companyCode:companyCode.trim(),region,permissions:[],message});
  }finally{setBusy(false)}
 };

 const disconnect=()=>{const next=resetConnection();apply(next);setOpen(true);setError('')};
 const preview=()=>{const next=createDemoConnectedState();apply(next);setOpen(false);setError('')};

 return <section className={'connectionCard '+(connected?'ok':'')}>
  <div className="connectionTop">
   <div><small>MEEVO INTEGRATION</small><h3>{connected?'Meevo is live':'Connect your barbershop to Meevo'}</h3><p>{connected?`${connection.displayName||connection.businessName} · ${connection.region||''}`:'Cada barbería conecta su propio negocio de Meevo. Next Walking mantiene cada organización, ubicación y datos completamente separados.'}</p></div>
   <span className={'connectionBadge '+connection.status.toLowerCase()}>{connected?'● LIVE':'● '+(connection.status==='NOT_CONFIGURED'?'NOT CONNECTED':connection.status)}</span>
  </div>

  {connected?<>
   <div className="connectionInfo connectedMeta"><b>{connection.businessName}</b><span>Company {connection.companyCode}</span><span>{connection.region}</span><span>{connection.locationId?'Location '+connection.locationId:'Location linked'}</span></div>
   <div className="permissionGrid"><span>✓ Employees</span><span>✓ Schedules</span><span>✓ Appointments</span><span>✓ Sales</span></div>
   <div className="connectionActions"><button className="ghost" onClick={()=>setOpen(v=>!v)}>Manage connection</button><button className="dangerGhost" onClick={disconnect}>Disconnect</button></div>
  </>:<>
   <div className="connectSteps"><span className="active">1 · Business</span><span>2 · Authorize</span><span>3 · Locations</span><span>4 · Go live</span></div>
   {open&&<div className="connectForm">
    <label><span>Barbershop name</span><input value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Example: The Grooming Room" /></label>
    <label><span>Meevo Company Code</span><input value={companyCode} onChange={e=>setCompanyCode(e.target.value)} placeholder="Example: 101628" inputMode="numeric" /></label>
    <label><span>Meevo region</span><select value={region} onChange={e=>setRegion(e.target.value as MeevoRegion)}>{MEEVO_REGIONS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
    <div className="securityNote"><b>Secure connection</b><span>Passwords and Meevo secrets will never be stored in GitHub Pages or browser storage. Authorization is handled by the Next Walking backend.</span></div>
    {error&&<div className="connectError">{error}</div>}
    <div className="connectionActions"><button disabled={busy} onClick={begin}>{busy?'Connecting…':'Connect Meevo securely →'}</button><button className="ghost" onClick={preview}>Preview onboarding</button></div>
   </div>}
  </>}
  <small className="connectionFoot">Multi-tenant architecture: each barbershop receives an isolated organization profile, Meevo connection, selected locations and synchronization state.</small>
 </section>
}

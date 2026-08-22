import { useMemo, useState } from 'react';
import { createDemoConnectedState, loadConnection, missingPermissions, saveConnection, type MeevoConnection } from './connection';

export default function MeevoConnectionCard({onChange}:{onChange:(c:MeevoConnection)=>void}){
 const [connection,setConnection]=useState<MeevoConnection>(()=>loadConnection());
 const missing=useMemo(()=>missingPermissions(connection),[connection]);
 const apply=(next:MeevoConnection)=>{setConnection(next);saveConnection(next);onChange(next)};
 const connectDemo=()=>apply(createDemoConnectedState());
 const reset=()=>apply({status:'DEMO',permissions:[],message:'Modo demo activo'});
 const connected=connection.status==='CONNECTED'&&missing.length===0;
 return <section className={'connectionCard '+(connected?'ok':'')}>
   <div className="connectionTop"><div><small>FUENTE DE DATOS</small><h3>{connected?'Meevo conectado':'Conectar Meevo'}</h3><p>{connected?`${connection.displayName} · Tenant ${connection.tenantId}`:'Next Walking necesita una cuenta autorizada de esta barbería para cargar horarios, citas, ventas y empleados.'}</p></div><span className={'connectionBadge '+connection.status.toLowerCase()}>{connected?'● CONECTADO':'● '+connection.status}</span></div>
   {connected?<div className="permissionGrid"><span>✓ Empleados</span><span>✓ Horarios</span><span>✓ Citas</span><span>✓ Ventas</span></div>:<div className="connectionInfo"><b>Permisos mínimos</b><span>Ver todos los empleados</span><span>Ver citas</span><span>Ver ventas</span><span>Ver horarios</span></div>}
   <div className="connectionActions">{!connected&&<button onClick={connectDemo}>Probar conexión demo</button>}<button className="ghost" onClick={reset}>{connected?'Desconectar':'Restablecer'}</button></div>
   {!connected&&<small className="connectionFoot">La conexión real no guardará contraseñas ni cookies en el navegador. Este botón simula el flujo mientras se implementa el adaptador oficial.</small>}
 </section>
}
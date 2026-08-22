import { useEffect, useMemo, useState } from 'react';
import { PRESETS, explainBarber, filterWorkingToday, scoreBarber, type Barber, type Strategy } from './scoring';
import { applyEvent } from './simulator';
import { appendHistory, loadBarbers, loadHistory, saveBarbers, type HistoryEvent } from './persistence';
import { publish, subscribe } from './realtime';
import MeevoConnectionCard from './MeevoConnectionCard';
import { loadConnection, type MeevoConnection } from './connection';

const initial:Barber[]=[
{id:1,name:'Mike',status:'AVAILABLE',appointments:3,occupancy:42,revenue:185,completed:3,walkins:1,idle:48,next:80,rejections:0,scheduledToday:true,shiftStart:'09:00',shiftEnd:'18:00'},
{id:2,name:'David',status:'AVAILABLE',appointments:4,occupancy:51,revenue:230,completed:4,walkins:0,idle:62,next:55,rejections:0,scheduledToday:true,shiftStart:'09:00',shiftEnd:'18:00'},
{id:3,name:'Alex',status:'WITH CLIENT',appointments:5,occupancy:63,revenue:310,completed:4,walkins:2,idle:0,next:70,rejections:0,scheduledToday:true,shiftStart:'10:00',shiftEnd:'19:00'},
{id:4,name:'Carlos',status:'AVAILABLE',appointments:7,occupancy:79,revenue:420,completed:6,walkins:3,idle:18,next:25,rejections:0,scheduledToday:true,shiftStart:'09:00',shiftEnd:'18:00'},
{id:5,name:'Jordan',status:'OFF SHIFT',appointments:0,occupancy:0,revenue:0,completed:0,walkins:0,idle:0,next:0,rejections:0,scheduledToday:false}
];

export default function App(){
 const [barbers,setBarbers]=useState<Barber[]>(()=>loadBarbers(initial));
 const [history,setHistory]=useState<HistoryEvent[]>(()=>loadHistory());
 const [updated,setUpdated]=useState(new Date());
 const [strategy,setStrategy]=useState<Strategy>('BALANCED');
 const [connection,setConnection]=useState<MeevoConnection>(()=>loadConnection());
 const weights=PRESETS[strategy];
 useEffect(()=>{saveBarbers(barbers)},[barbers]);
 useEffect(()=>subscribe(()=>{setBarbers(loadBarbers(initial));setHistory(loadHistory());setUpdated(new Date())}),[]);
 useEffect(()=>{const t=setInterval(()=>{setBarbers(x=>x.map(b=>({...b,next:Math.max(0,b.next-1),idle:b.status==='AVAILABLE'?b.idle+1:b.idle})));setUpdated(new Date())},60000);return()=>clearInterval(t)},[]);
 const working=useMemo(()=>filterWorkingToday(barbers),[barbers]);
 const ranked=useMemo(()=>working.map(b=>({...b,score:scoreBarber(b,weights)})).sort((a,b)=>b.score-a.score),[working,weights]);
 const top=ranked[0];
 const reasons=top?explainBarber(top):[];
 const dispatch=(event:Parameters<typeof applyEvent>[1],detail:string)=>{const barber=barbers.find(b=>b.id===event.barberId);setBarbers(x=>{const next=applyEvent(x,event);saveBarbers(next);return next});if(barber)setHistory(appendHistory({type:event.type,barberId:barber.id,barberName:barber.name,detail}));setUpdated(new Date());publish('STATE_CHANGED')};
 const assign=(id:number)=>dispatch({type:'ASSIGN_WALKIN',barberId:id},'Walk-in asignado');
 const checkout=(id:number)=>{const amount=Number(prompt('Total cobrado por el servicio ($):','45')||0);dispatch({type:'CHECKOUT',barberId:id,amount},`Checkout $${amount}`)};
 const toggleBreak=(id:number)=>dispatch({type:'BREAK_TOGGLE',barberId:id},'Cambio de break');
 const addAppointment=(id:number)=>{const minutes=Number(prompt('Minutos hasta la nueva cita:','60')||60);dispatch({type:'APPOINTMENT_ADDED',barberId:id,minutesUntil:minutes},`Nueva cita en ${minutes} min`)};
 const cancelAppointment=(id:number)=>dispatch({type:'APPOINTMENT_CANCELLED',barberId:id},'Cita cancelada');
 const isConnected=connection.status==='CONNECTED';
 return <div className="app">
  <aside><div className="brand"><span>✂</span><div>NEXT<br/><b>WALKING</b></div></div><nav><b>◉ Ranking en vivo</b><span>▣ Historial</span><span>♙ Barberos</span><span>⚙ Configuración</span></nav><div className="strategy"><small>ESTRATEGIA</small><select value={strategy} onChange={e=>setStrategy(e.target.value as Strategy)}><option value="BALANCED">Balanced</option><option value="FAIR">Fair Distribution</option><option value="REVENUE">Maximum Revenue</option></select></div><div className="live"><i/> {isConnected?'MEEVO EN VIVO':'MODO DEMO'}<small>{working.length} barberos trabajando hoy<br/>Actualizado {updated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</small></div></aside>
  <main><header><div><p>BARBERÍA · OPERACIÓN EN TIEMPO REAL</p><h1>¿Quién recibe el próximo <em>walk-in?</em></h1></div><div className="clock">{new Date().toLocaleDateString('es-US',{weekday:'long',month:'short',day:'numeric'})}</div></header>
  <MeevoConnectionCard onChange={setConnection}/>
  {top?<><section className="hero"><div><label>PRÓXIMO WALK-IN</label><h2>{top.name}</h2><p>{top.status==='AVAILABLE'?'Disponible ahora':'Estado: '+top.status} · próxima cita en {top.next} min</p><div className="why">{reasons.join(' · ')||'Prioridad calculada con el estado operativo actual.'}</div><button disabled={top.score===0} onClick={()=>assign(top.id)}>Asignar walk-in a {top.name} →</button></div><div className="score"><strong>{top.score}</strong><span>/100</span><small>FAIRNESS SCORE</small></div></section><div className="title"><h3>Ranking permanente</h3><span>Solo barberos programados para trabajar hoy</span></div><section className="ranking">{ranked.map((b,i)=><article className={i===0?'first':''} key={b.id}><div className="rank">#{i+1}</div><div className="avatar">{b.name[0]}</div><div className="person"><b>{b.name}</b><span className={'status '+b.status.replaceAll(' ','-').toLowerCase()}>{b.status}</span></div><Metric n={`${b.score}`} l="SCORE"/><Metric n={`${b.appointments}`} l="CITAS"/><Metric n={`${b.occupancy}%`} l="OCUPACIÓN"/><Metric n={`$${b.revenue}`} l="INGRESOS"/><Metric n={`${b.walkins}`} l="WALK-INS"/><Metric n={`${b.idle}m`} l="LIBRE"/><Metric n={`${b.next}m`} l="PRÓX. CITA"/><div className="actions">{b.status==='WITH CLIENT'?<button onClick={()=>checkout(b.id)}>Cobrar</button>:b.status==='AVAILABLE'?<button onClick={()=>assign(b.id)}>Asignar</button>:null}<button className="ghost" onClick={()=>toggleBreak(b.id)}>{b.status==='BREAK'?'Fin break':'Break'}</button></div></article>)}</section></>:<section className="hero"><div><label>SIN TURNO ACTIVO</label><h2>No hay barberos trabajando</h2><p>Next Walking esperará la jornada programada en Meevo.</p></div></section>}
  <section className="simulator"><div><b>SIMULADOR EN TIEMPO REAL</b><p>Prueba eventos antes de conectar Meevo.</p></div><div className="simcontrols"><select id="simBarber">{working.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><button onClick={()=>{const id=Number((document.getElementById('simBarber') as HTMLSelectElement).value);addAppointment(id)}}>+ Cita</button><button onClick={()=>{const id=Number((document.getElementById('simBarber') as HTMLSelectElement).value);cancelAppointment(id)}}>Cancelar cita</button><button onClick={()=>{const id=Number((document.getElementById('simBarber') as HTMLSelectElement).value);toggleBreak(id)}}>Break</button></div></section>
  <section className="history"><div className="title"><h3>Actividad reciente</h3><span>Persistente en este dispositivo</span></div>{history.slice(0,6).map(h=><div className="historyRow" key={h.id}><b>{h.barberName}</b><span>{h.detail}</span><small>{new Date(h.at).toLocaleTimeString()}</small></div>)}{!history.length&&<p className="empty">Todavía no hay eventos registrados.</p>}</section>
  <section className="footerCards"><div><b>📅 TURNO DEL DÍA</b><p>Quien descansa queda completamente fuera del ranking.</p></div><div><b>⚡ EVENT-DRIVEN</b><p>Asignaciones y cobros reordenan el ranking inmediatamente.</p></div><div><b>🔌 MEEVO READY</b><p>La barbería vinculada determina empleados, citas y operación.</p></div></section></main>
 </div>}
function Metric({n,l}:{n:string,l:string}){return <div className="metric"><b>{n}</b><small>{l}</small></div>}

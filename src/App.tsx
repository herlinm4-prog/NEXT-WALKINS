import { useEffect, useMemo, useState } from 'react';
import { PRESETS, explainBarber, scoreBarber, type Barber, type Strategy } from './scoring';
import { applyEvent } from './simulator';
import { appendHistory, loadBarbers, loadHistory, saveBarbers, type HistoryEvent } from './persistence';
import { publish, subscribe } from './realtime';
import MeevoConnectionCard from './MeevoConnectionCard';
import { loadConnection, type MeevoConnection } from './connection';

const initial:Barber[]=[
{id:1,name:'Mike',status:'AVAILABLE',appointments:3,occupancy:42,revenue:185,completed:3,walkins:1,idle:48,next:80,rejections:0,breakMinutes:15,scheduledToday:true,shiftStart:'09:00',shiftEnd:'18:00'},
{id:2,name:'David',status:'AVAILABLE',appointments:4,occupancy:51,revenue:230,completed:4,walkins:0,idle:62,next:55,rejections:0,breakMinutes:0,scheduledToday:true,shiftStart:'09:00',shiftEnd:'18:00'},
{id:3,name:'Alex',status:'WITH CLIENT',appointments:5,occupancy:63,revenue:310,completed:4,walkins:2,idle:0,next:70,rejections:0,breakMinutes:10,scheduledToday:true,shiftStart:'10:00',shiftEnd:'19:00'},
{id:4,name:'Carlos',status:'APPOINTMENT SOON',appointments:7,occupancy:79,revenue:420,completed:6,walkins:3,idle:18,next:25,rejections:0,breakMinutes:20,scheduledToday:true,shiftStart:'09:00',shiftEnd:'18:00'},
{id:5,name:'Jordan',status:'OFF SHIFT',appointments:0,occupancy:0,revenue:0,completed:0,walkins:0,idle:0,next:0,rejections:0,scheduledToday:false},
{id:6,name:'Andre',status:'BREAK',appointments:4,occupancy:58,revenue:265,completed:4,walkins:1,idle:0,next:95,rejections:0,breakMinutes:28,scheduledToday:true,shiftStart:'10:00',shiftEnd:'19:00'},
{id:7,name:'Luis',status:'AVAILABLE',appointments:2,occupancy:35,revenue:120,completed:2,walkins:1,idle:39,next:110,rejections:1,breakMinutes:0,scheduledToday:true,shiftStart:'11:00',shiftEnd:'20:00'},
{id:8,name:'Chris',status:'WITH CLIENT',appointments:6,occupancy:72,revenue:390,completed:5,walkins:2,idle:0,next:50,rejections:0,breakMinutes:12,scheduledToday:true,shiftStart:'09:00',shiftEnd:'18:00'}
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
 const ranked=useMemo(()=>barbers.map(b=>({...b,score:scoreBarber(b,weights)})).sort((a,b)=>b.score-a.score),[barbers,weights]);
 const top=ranked.find(b=>b.score>0);
 const reasons=top?explainBarber(top):[];
 const dispatch=(event:Parameters<typeof applyEvent>[1],detail:string)=>{const barber=barbers.find(b=>b.id===event.barberId);setBarbers(x=>{const next=applyEvent(x,event);saveBarbers(next);return next});if(barber)setHistory(appendHistory({type:event.type,barberId:barber.id,barberName:barber.name,detail}));setUpdated(new Date());publish('STATE_CHANGED')};
 const assign=(id:number)=>dispatch({type:'ASSIGN_WALKIN',barberId:id},'Walk-in asignado');
 const reject=(id:number)=>dispatch({type:'REJECT_WALKIN',barberId:id},'Walk-in rechazado');
 const checkout=(id:number)=>{const amount=Number(prompt('Total cobrado por el servicio ($):','45')||0);dispatch({type:'CHECKOUT',barberId:id,amount},`Checkout $${amount}`)};
 const toggleBreak=(id:number)=>dispatch({type:'BREAK_TOGGLE',barberId:id},'Cambio de break');
 const addAppointment=(id:number)=>{const minutes=Number(prompt('Minutos hasta la nueva cita:','60')||60);dispatch({type:'APPOINTMENT_ADDED',barberId:id,minutesUntil:minutes},`Nueva cita en ${minutes} min`)};
 const cancelAppointment=(id:number)=>dispatch({type:'APPOINTMENT_CANCELLED',barberId:id},'Cita cancelada');
 const isConnected=connection.status==='CONNECTED';
 return <div className="app">
  <aside><div className="brand"><span>✂</span><div>NEXT<br/><b>WALKING</b></div></div><nav><b>◉ Ranking en vivo</b><span>▣ Historial</span><span>♙ Barberos</span><span>⚙ Configuración</span></nav><div className="strategy"><small>ESTRATEGIA</small><select value={strategy} onChange={e=>setStrategy(e.target.value as Strategy)}><option value="BALANCED">Balanced</option><option value="FAIR">Fair Distribution</option><option value="REVENUE">Maximum Revenue</option></select></div><div className="live"><i/> {isConnected?'MEEVO EN VIVO':'MODO DEMO'}<small>{barbers.filter(b=>b.scheduledToday!==false).length} trabajando hoy · {barbers.length} visibles<br/>Actualizado {updated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</small></div></aside>
  <main><header><div><p>BARBERÍA · OPERACIÓN EN TIEMPO REAL</p><h1>¿Quién recibe el próximo <em>walk-in?</em></h1></div><div className="clock">{new Date().toLocaleDateString('es-US',{weekday:'long',month:'short',day:'numeric'})}</div></header>
  <MeevoConnectionCard onChange={setConnection}/>
  {top?<section className="hero"><div><label>NEXT WALK-IN · PRIORIDAD #1</label><h2>{top.name}</h2><p>{top.status==='AVAILABLE'?'Disponible ahora':'Estado: '+top.status} · próxima cita en {top.next} min</p><div className="why">{reasons.join(' · ')||'Prioridad calculada con el estado operativo actual.'}</div><div className="heroActions"><button onClick={()=>assign(top.id)}>Asignar walk-in a {top.name} →</button><button className="reject" onClick={()=>reject(top.id)}>Rechazó walk-in</button></div></div><div className="score"><strong>{top.score}</strong><span>/100</span><small>FAIRNESS SCORE</small></div></section>:<section className="hero"><div><label>SIN BARBERO ELEGIBLE</label><h2>Esperando disponibilidad</h2><p>Todos permanecen visibles. Next Walking recalculará al recibir el próximo evento.</p></div></section>}
  <div className="title"><h3>Ranking permanente</h3><span>Todos los barberos permanecen visibles, incluso break, con cliente y fuera de turno.</span></div>
  <section className="ranking">{ranked.map((b,i)=><article className={b.id===top?.id?'first':''} key={b.id}><div className="rank">#{i+1}</div><div className="avatar">{b.name[0]}</div><div className="person"><b>{b.name}</b><span className={'status '+b.status.split(' ').join('-').toLowerCase()}>{b.status}</span></div><Metric n={`${b.score}`} l="SCORE"/><Metric n={`${b.appointments}`} l="CITAS"/><Metric n={`${b.occupancy}%`} l="OCUPACIÓN"/><Metric n={`$${b.revenue}`} l="INGRESOS"/><Metric n={`${b.walkins}`} l="WALK-INS"/><Metric n={`${b.idle}m`} l="LIBRE"/><Metric n={b.status==='OFF SHIFT'?'—':`${b.next}m`} l="PRÓX. CITA"/><div className="actions">{b.status==='WITH CLIENT'?<button onClick={()=>checkout(b.id)}>Cobrar</button>:b.score>0?<button onClick={()=>assign(b.id)}>Asignar</button>:null}<button className="ghost" disabled={b.status==='OFF SHIFT'} onClick={()=>toggleBreak(b.id)}>{b.status==='BREAK'?'Fin break':'Break'}</button></div></article>)}</section>
  <section className="simulator"><div><b>SIMULADOR OPERATIVO</b><p>Permite validar el motor mientras conectamos la fuente real de Meevo.</p></div><div className="simcontrols"><select id="simBarber">{barbers.filter(b=>b.scheduledToday!==false).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><button onClick={()=>{const id=Number((document.getElementById('simBarber') as HTMLSelectElement).value);addAppointment(id)}}>+ Cita</button><button onClick={()=>{const id=Number((document.getElementById('simBarber') as HTMLSelectElement).value);cancelAppointment(id)}}>Cancelar cita</button><button onClick={()=>{const id=Number((document.getElementById('simBarber') as HTMLSelectElement).value);toggleBreak(id)}}>Break</button></div></section>
  <section className="history"><div className="title"><h3>Actividad reciente</h3><span>Asignaciones · cobros · rechazos · breaks · citas</span></div>{history.slice(0,8).map(h=><div className="historyRow" key={h.id}><b>{h.barberName}</b><span>{h.detail}</span><small>{new Date(h.at).toLocaleTimeString()}</small></div>)}{!history.length&&<p className="empty">Todavía no hay eventos registrados.</p>}</section>
  <section className="footerCards"><div><b>📅 TURNO DEL DÍA</b><p>OFF SHIFT queda sin elegibilidad, pero continúa visible en el tablero.</p></div><div><b>⚡ RECÁLCULO INMEDIATO</b><p>Asignaciones, cobros, rechazos y cambios de estado alteran la prioridad.</p></div><div><b>🔌 MEEVO DATA LAYER</b><p>Empleados, citas, ingresos, servicios, breaks y walk-ins entrarán por un adaptador independiente.</p></div></section></main>
 </div>}
function Metric({n,l}:{n:string,l:string}){return <div className="metric"><b>{n}</b><small>{l}</small></div>}

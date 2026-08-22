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
 const isConnected=connection.status==='CONNECTED';
 const working=barbers.filter(b=>b.scheduledToday!==false).length;
 const available=barbers.filter(b=>b.status==='AVAILABLE').length;
 const dayRevenue=barbers.reduce((s,b)=>s+b.revenue,0);
 const walkins=barbers.reduce((s,b)=>s+b.walkins,0);

 return <div className="site-shell">
  <header className="topbar"><div className="logoMark"><span>NW</span><div><b>NEXT WALKING</b><small>Intelligent Walk-In Distribution</small></div></div><nav className="topnav"><a href="#live">Live</a><a href="#ranking">Ranking</a><a href="#activity">Activity</a></nav><div className="topActions"><div className={'sourcePill '+(isConnected?'connected':'')}><i/>{isConnected?'Meevo Live':'Demo Mode'}</div><select value={strategy} onChange={e=>setStrategy(e.target.value as Strategy)}><option value="BALANCED">Balanced</option><option value="FAIR">Fair Distribution</option><option value="REVENUE">Maximum Revenue</option></select></div></header>

  <main className="websiteMain">
   <section className="landingHero" id="live">
    <div className="heroCopy"><div className="eyebrow">REAL-TIME WALK-IN INTELLIGENCE</div><h1>Every walk-in goes to the <span>right barber.</span></h1><p>Next Walking balances availability, fairness, revenue, appointments and idle time in real time — so your shop never has to guess who is next.</p><div className="heroStats"><div><strong>{working}</strong><span>Working today</span></div><div><strong>{available}</strong><span>Available now</span></div><div><strong>${dayRevenue}</strong><span>Revenue today</span></div><div><strong>{walkins}</strong><span>Walk-ins assigned</span></div></div></div>
    <div className="featureCard">{top?<><div className="featureTop"><span className="liveDot">LIVE PRIORITY</span><span className="scoreBadge">{top.score}/100</span></div><div className="featureIdentity"><div className="profileOrb">{top.name.slice(0,1)}</div><div><small>NEXT WALK-IN</small><h2>{top.name}</h2><p>{top.status==='AVAILABLE'?'Available now':top.status} · next appointment in {top.next} min</p></div></div><div className="reasonChips">{reasons.slice(0,4).map(r=><span key={r}>{r}</span>)}</div><div className="featureActions"><button onClick={()=>assign(top.id)}>Assign walk-in</button><button className="secondary" onClick={()=>reject(top.id)}>Declined</button></div></>:<><div className="featureTop"><span className="liveDot">LIVE PRIORITY</span></div><h2>Waiting for availability</h2></>}</div>
   </section>

   <section className="trustStrip"><span>Explainable Fairness Score</span><span>Real-time Meevo sync</span><span>Live barber status</span><span>Revenue-aware routing</span></section>

   <MeevoConnectionCard onChange={setConnection}/>

   <section className="rankingSection" id="ranking"><div className="sectionHeading"><div><small>LIVE OPERATIONS</small><h3>Barber priority board</h3></div><p>Everyone stays visible. Priority updates after every assignment, checkout, break, rejection and appointment change.</p></div><div className="barberGrid">{ranked.map((b,i)=><article className={'barberCard '+(b.id===top?.id?'featured':'')} key={b.id}><div className="cardTop"><span className="position">#{i+1}</span><span className={'status '+b.status.split(' ').join('-').toLowerCase()}>{b.status}</span></div><div className="barberIdentity"><div className="profileOrb small">{b.name[0]}</div><div><h4>{b.name}</h4><span>{b.shiftStart&&b.shiftEnd?`${b.shiftStart}–${b.shiftEnd}`:'Off shift'}</span></div><strong>{b.score}</strong></div><div className="miniMetrics"><div><b>{b.appointments}</b><span>Appointments</span></div><div><b>{b.occupancy}%</b><span>Occupancy</span></div><div><b>${b.revenue}</b><span>Revenue</span></div><div><b>{b.walkins}</b><span>Walk-ins</span></div></div><div className="cardFoot"><span>{b.status==='OFF SHIFT'?'Not eligible':`${b.idle} min idle · ${b.next} min to next`}</span><div>{b.status==='WITH CLIENT'?<button onClick={()=>checkout(b.id)}>Checkout</button>:b.score>0?<button onClick={()=>assign(b.id)}>Assign</button>:null}<button className="textButton" disabled={b.status==='OFF SHIFT'} onClick={()=>toggleBreak(b.id)}>{b.status==='BREAK'?'End break':'Break'}</button></div></div></article>)}</div></section>

   <section className="lowerGrid" id="activity"><div className="activityPanel"><div className="sectionHeading compact"><div><small>RECENT ACTIVITY</small><h3>Operational timeline</h3></div></div>{history.slice(0,6).map(h=><div className="activityRow" key={h.id}><div className="activityIcon">•</div><div><b>{h.barberName}</b><span>{h.detail}</span></div><time>{new Date(h.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div>)}{!history.length&&<div className="emptyState">No activity yet. Use the live controls to simulate operations.</div>}</div><div className="insightPanel"><small>WHY NEXT WALKING</small><h3>Fair distribution without slowing down the shop.</h3><p>The ranking is not random and it is not only based on who has been waiting longest. It continuously weighs the full operating picture and explains the decision.</p><div className="insightGrid"><span>Availability</span><span>Idle time</span><span>Appointments</span><span>Occupancy</span><span>Revenue</span><span>Walk-ins</span><span>Rejections</span><span>Breaks</span></div><small className="updatedAt">Updated {updated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</small></div></section>
  </main>
 </div>}

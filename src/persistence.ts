import type { Barber } from './scoring';

const STATE_KEY='next-walking:barbers:v2';
const HISTORY_KEY='next-walking:history:v2';
const scope=(base:string,organizationId?:string,locationId?:string)=>`${base}:${organizationId||'demo'}:${locationId||'default'}`;
export type HistoryEvent={id:string;at:string;type:string;barberId:number;barberName:string;detail:string};
export function loadBarbers(fallback:Barber[],organizationId?:string,locationId?:string):Barber[]{try{const raw=localStorage.getItem(scope(STATE_KEY,organizationId,locationId));return raw?JSON.parse(raw):fallback}catch{return fallback}}
export function saveBarbers(barbers:Barber[],organizationId?:string,locationId?:string){localStorage.setItem(scope(STATE_KEY,organizationId,locationId),JSON.stringify(barbers))}
export function loadHistory(organizationId?:string,locationId?:string):HistoryEvent[]{try{return JSON.parse(localStorage.getItem(scope(HISTORY_KEY,organizationId,locationId))||'[]')}catch{return []}}
export function appendHistory(event:Omit<HistoryEvent,'id'|'at'>,organizationId?:string,locationId?:string):HistoryEvent[]{const key=scope(HISTORY_KEY,organizationId,locationId);let current:HistoryEvent[]=[];try{current=JSON.parse(localStorage.getItem(key)||'[]')}catch{}const next=[{...event,id:crypto.randomUUID(),at:new Date().toISOString()},...current].slice(0,500);localStorage.setItem(key,JSON.stringify(next));return next}
export function clearOperationalState(organizationId?:string,locationId?:string){localStorage.removeItem(scope(STATE_KEY,organizationId,locationId));localStorage.removeItem(scope(HISTORY_KEY,organizationId,locationId))}

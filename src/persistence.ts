import type { Barber } from './scoring';

const STATE_KEY='next-walking:barbers:v1';
const HISTORY_KEY='next-walking:history:v1';
export type HistoryEvent={id:string;at:string;type:string;barberId:number;barberName:string;detail:string};
export function loadBarbers(fallback:Barber[]):Barber[]{try{const raw=localStorage.getItem(STATE_KEY);return raw?JSON.parse(raw):fallback}catch{return fallback}}
export function saveBarbers(barbers:Barber[]){localStorage.setItem(STATE_KEY,JSON.stringify(barbers))}
export function loadHistory():HistoryEvent[]{try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{return []}}
export function appendHistory(event:Omit<HistoryEvent,'id'|'at'>):HistoryEvent[]{const next=[{...event,id:crypto.randomUUID(),at:new Date().toISOString()},...loadHistory()].slice(0,500);localStorage.setItem(HISTORY_KEY,JSON.stringify(next));return next}
export function clearOperationalState(){localStorage.removeItem(STATE_KEY);localStorage.removeItem(HISTORY_KEY)}
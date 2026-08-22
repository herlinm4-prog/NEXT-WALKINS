import type { Status } from './scoring';

/** Canonical data Next Walking needs from Meevo. Provider-specific payloads are mapped here. */
export interface MeevoEmployeeSnapshot {
  employeeId: string;
  name: string;
  scheduledToday: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  status: Status;
  nextAppointmentAt?: string;
  appointmentsToday: number;
  bookedMinutesToday: number;
  availableShiftMinutesToday: number;
  revenueToday: number;
  completedServicesToday: number;
  completedClientsToday: number;
  lastServiceEndedAt?: string;
  walkinsToday: number;
  walkinRevenueToday: number;
  walkinAssignmentsToday: number;
  walkinRejectionsToday: number;
  breakStartedAt?: string;
  breakMinutesToday: number;
}

export interface MeevoShopSnapshot {
  locationId: string;
  businessDate: string;
  capturedAt: string;
  employees: MeevoEmployeeSnapshot[];
}

export const MEEVO_REQUIRED_DATA = [
  'employees working today and shift start/end',
  'employee availability/current service state',
  'today appointments, start/end/status and assigned employee',
  'next appointment per employee',
  'completed services and clients',
  'today sales/revenue by employee',
  'walk-in assignment history and revenue',
  'walk-in rejections',
  'breaks and employee status changes',
] as const;

export function occupancyPercent(e:MeevoEmployeeSnapshot){
  if(e.availableShiftMinutesToday<=0)return 0;
  return Math.max(0,Math.min(100,Math.round((e.bookedMinutesToday/e.availableShiftMinutesToday)*100)));
}

export function minutesUntil(iso?:string,now=Date.now()){
  if(!iso)return 999;
  return Math.max(0,Math.round((new Date(iso).getTime()-now)/60000));
}

export function idleMinutes(lastServiceEndedAt?:string,status?:Status,now=Date.now()){
  if(status!=='AVAILABLE'||!lastServiceEndedAt)return 0;
  return Math.max(0,Math.round((now-new Date(lastServiceEndedAt).getTime())/60000));
}

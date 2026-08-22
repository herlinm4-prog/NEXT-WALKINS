export type MeevoEventType='APPOINTMENT_ADDED'|'APPOINTMENT_CANCELLED'|'SERVICE_STARTED'|'SERVICE_CHECKED_OUT'|'BREAK_STARTED'|'BREAK_ENDED'|'EMPLOYEE_STATUS_CHANGED';
export interface MeevoRealtimeEvent{type:MeevoEventType;employeeId:string;occurredAt:string;payload:Record<string,unknown>}
export interface MeevoAdapter{
  connect():Promise<void>;
  disconnect():Promise<void>;
  subscribe(listener:(event:MeevoRealtimeEvent)=>void):()=>void;
  refreshToday():Promise<void>;
}
// Production implementation will connect the official Meevo data sources here.
// The ranking engine/UI must remain independent of the provider transport.

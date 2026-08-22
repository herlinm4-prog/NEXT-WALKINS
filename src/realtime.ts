export type RealtimeMessage={source:string;type:'STATE_CHANGED'|'MEEVO_EVENT';at:string};
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('next-walking-live'):null;
export function publish(type:RealtimeMessage['type']){channel?.postMessage({source:'next-walking',type,at:new Date().toISOString()} satisfies RealtimeMessage)}
export function subscribe(fn:(m:RealtimeMessage)=>void){if(!channel)return()=>{};const listener=(e:MessageEvent<RealtimeMessage>)=>fn(e.data);channel.addEventListener('message',listener);return()=>channel.removeEventListener('message',listener)}
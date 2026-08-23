const SESSION='nw-admin-session-v1';const PIN_HASH='nw-admin-pin-v1';
async function hash(v:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export function isAdminAuthenticated(){const until=Number(sessionStorage.getItem(SESSION)||0);return until>Date.now()}
export async function hasAdminPin(){return !!localStorage.getItem(PIN_HASH)}
export async function createAdminPin(pin:string){if(!/^\d{4,8}$/.test(pin))throw new Error('PIN must contain 4–8 digits');localStorage.setItem(PIN_HASH,await hash(pin));sessionStorage.setItem(SESSION,String(Date.now()+30*60*1000))}
export async function loginAdmin(pin:string){const saved=localStorage.getItem(PIN_HASH);if(!saved)return false;const ok=(await hash(pin))===saved;if(ok)sessionStorage.setItem(SESSION,String(Date.now()+30*60*1000));return ok}
export function logoutAdmin(){sessionStorage.removeItem(SESSION)}

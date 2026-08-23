export type AppTheme='dark'|'light'|'system';
export type BrandTheme='emerald'|'gold'|'blue'|'burgundy'|'violet'|'classic';
export type AppSettings={appearance:AppTheme;brandTheme:BrandTheme;shopName:string;protectMinutes:number;notifications:boolean;compactCards:boolean};
export const DEFAULT_SETTINGS:AppSettings={appearance:'dark',brandTheme:'emerald',shopName:'NEXT WALKING',protectMinutes:15,notifications:true,compactCards:false};
const KEY='next-walking-settings-v2';
export function loadSettings():AppSettings{try{return{...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return DEFAULT_SETTINGS}}
export function saveSettings(s:AppSettings){localStorage.setItem(KEY,JSON.stringify(s))}
export function applySettings(s:AppSettings){const root=document.documentElement;const dark=s.appearance==='system'?matchMedia('(prefers-color-scheme: dark)').matches:s.appearance==='dark';root.dataset.appearance=dark?'dark':'light';root.dataset.brand=s.brandTheme;root.dataset.density=s.compactCards?'compact':'comfortable';root.lang='en'}

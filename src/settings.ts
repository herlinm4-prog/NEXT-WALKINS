export type AppTheme='dark'|'light'|'system';
export type BrandTheme='emerald'|'gold'|'blue'|'burgundy'|'violet'|'classic';
export type FontTheme='inter'|'manrope'|'montserrat'|'poppins'|'system';
export type AppSettings={appearance:AppTheme;brandTheme:BrandTheme;fontTheme:FontTheme;shopName:string;protectMinutes:number;notifications:boolean;compactCards:boolean;companyLegalName:string;companyOwner:string;companyPhone:string;companyEmail:string;companyWebsite:string;companyAddress:string;companyCity:string;companyState:string;companyZip:string;companyTaxId:string;companyNotes:string};
export const DEFAULT_SETTINGS:AppSettings={appearance:'dark',brandTheme:'emerald',fontTheme:'inter',shopName:'NEXT WALKING',protectMinutes:15,notifications:true,compactCards:false,companyLegalName:'',companyOwner:'',companyPhone:'',companyEmail:'',companyWebsite:'',companyAddress:'',companyCity:'',companyState:'',companyZip:'',companyTaxId:'',companyNotes:''};
const KEY='next-walking-settings-v2';
export function loadSettings():AppSettings{try{return{...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return DEFAULT_SETTINGS}}
export function saveSettings(s:AppSettings){localStorage.setItem(KEY,JSON.stringify(s))}
export function applySettings(s:AppSettings){const root=document.documentElement;const dark=s.appearance==='system'?matchMedia('(prefers-color-scheme: dark)').matches:s.appearance==='dark';root.dataset.appearance=dark?'dark':'light';root.dataset.brand=s.brandTheme;root.dataset.font=s.fontTheme;root.dataset.density=s.compactCards?'compact':'comfortable';root.lang='en'}

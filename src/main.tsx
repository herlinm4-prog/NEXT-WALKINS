import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root=document.getElementById('root');
if(!root)throw new Error('Next Walking root element not found');

if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations()
    .then(registrations=>registrations.forEach(registration=>registration.unregister()))
    .catch(()=>undefined);
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

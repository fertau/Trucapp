import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('main.tsx: Entry point reached');

const rootElement = document.getElementById('root');
console.log('main.tsx: Root element found:', !!rootElement);

if (rootElement) {
  rootElement.innerHTML = '<div style="background:purple;color:white;padding:20px;position:fixed;top:0;left:0;z-index:9999">STUNT CONTENT: main.tsx is running</div>';
  createRoot(rootElement).render(
    <App />
  );
} else {
  console.error('main.tsx: Root element NOT found!');
}

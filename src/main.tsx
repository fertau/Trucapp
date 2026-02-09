import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('main.tsx: Entry point reached');

const rootElement = document.getElementById('root');
console.log('main.tsx: Root element found:', !!rootElement);

if (rootElement) {
  createRoot(rootElement).render(
    <App />
  );
} else {
  console.error('main.tsx: Root element NOT found!');
}

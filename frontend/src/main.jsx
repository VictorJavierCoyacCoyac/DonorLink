import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('🔧 main.jsx loaded');
const rootElement = document.getElementById('root');
console.log('🔧 root element:', rootElement);

if (!rootElement) {
  console.error('❌ Failed: root element not found');
  document.body.innerHTML = '<h1>Error: root element not found</h1>';
} else {
  console.log('✓ Creating root...');
  const root = createRoot(rootElement);
  console.log('✓ Root created');
  
  root.render(
    <App />
  );
  console.log('✓ App rendered');
}

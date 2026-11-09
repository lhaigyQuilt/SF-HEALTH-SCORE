import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './theme.css';
import App from './App.jsx';
import { OrgProvider } from './state/OrgContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <OrgProvider>
        <App />
      </OrgProvider>
    </BrowserRouter>
  </StrictMode>
);

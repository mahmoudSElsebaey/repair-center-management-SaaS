import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '@/store';
import App from '@/App';
// Load the Fixer design tokens before shared styles so all Tailwind utilities resolve correctly.
import '@/styles/tokens.css';
import '@/styles/vendor.css';
import '@/styles/index.css';
import '@/i18n';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root not found');
}

createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>
);

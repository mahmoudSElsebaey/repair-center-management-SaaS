import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

// Vendor styles first so the RepairFlow token layer always wins.
import 'swiper/css';
import 'swiper/css/pagination';

import './styles/tokens.css';
import './styles/index.css';
import './styles/vendor.css';

// Side-effect import: initialises i18next and applies <html lang/dir>.
import './i18n';

import App from './App';
import { store } from './store';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </StrictMode>
);

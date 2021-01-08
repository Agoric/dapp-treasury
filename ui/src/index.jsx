import './install-ses-lockdown';
import React from 'react';
import { render } from 'react-dom';

import ApplicationContextProvider from './contexts/Application';
import VaultContextProvider from './contexts/Vault';
import App from './pages/App';

render(
  <ApplicationContextProvider>
    <VaultContextProvider>
      <App />
    </VaultContextProvider>
  </ApplicationContextProvider>,
  document.getElementById('root'),
);

/* eslint-disable import/no-extraneous-dependencies */
import '@endo/eventual-send/shim';
import 'json5';
import React from 'react';
import { render } from 'react-dom';

import ApplicationContextProvider from './contexts/Application';
import App from './pages/App';

render(
  <ApplicationContextProvider>
    <App />
  </ApplicationContextProvider>,
  document.getElementById('root'),
);

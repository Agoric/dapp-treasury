import React from 'react';

import { CssBaseline } from '@material-ui/core';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';

import Top from './Top';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#ab2328',
    },
    secondary: {
      main: '#ffc600',
    },
  },
});

function App() {
  return (
    <>
      <CssBaseline />
      <ThemeProvider theme={theme}>
        <Top />
      </ThemeProvider>
    </>
  );
}

export default App;

import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import AppHeader from '../components/AppHeader';
import ResponsiveNavigation from '../components/ResponsiveNavigation';

import NavDrawer from '../components/NavDrawer';

// import Shuttle from './Shuttle';
// import Vault from './Vault';
import Swap from '../components/Swap';
import Web3Status from '../components/Web3Status';

const navigationDrawerWidth = 200;

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    display: 'flex',
    flexDirection: 'row',
  },
  content: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(3),
  },
}));

function Top() {
  const [isOpen, setIsOpen] = React.useState(false);
  const handleDrawerToggle = () => setIsOpen(!isOpen);

  const classes = useStyles();

  return (
    <Router>
      <div className={classes.root}>
        <AppHeader
          handleDrawerToggle={handleDrawerToggle}
          drawerWidth={navigationDrawerWidth}
        >
          <Web3Status />
        </AppHeader>
        <div className={classes.body}>
          <ResponsiveNavigation
            drawerWidth={navigationDrawerWidth}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
          >
            <NavDrawer />
          </ResponsiveNavigation>

          <main className={classes.content}>
            <Switch>
              <Route path="/pegasus">Pegasus</Route>
              <Route path="/treasury">Treasury</Route>
              <Route path="/rewards">Rewards</Route>
              <Route path="/swap">
                <Swap />
              </Route>
              <Route path="/">Vault</Route>
            </Switch>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default Top;

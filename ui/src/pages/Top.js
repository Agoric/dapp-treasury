import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import AppHeader from '../components/AppHeader';
import ResponsiveNavigation from '../components/ResponsiveNavigation';

import NavDrawer from '../components/NavDrawer';

import Swap from '../components/Swap';
import NewVault from '../components/vault/NewVault';
import Treasury from '../components/Treasury';
import VaultManagement from '../components/vault/VaultManagement/VaultManagement';
import GetRun from '../components/getRun/GetRun';

const navigationDrawerWidth = 240;

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    display: 'flex',
    flexDirection: 'row',
    margin: '0',
    float: 'none !important',
  },
  content: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(1),
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
        ></AppHeader>
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
              {/* <Route path="/pegasus">Pegasus</Route> */}
              <Route path="/vaults">
                <Treasury />
              </Route>
              {/* <Route path="/rewards">Rewards</Route> */}
              {/* <Route path="/gov">Governance</Route> */}
              <Route path="/swap">
                <Swap />
              </Route>
              <Route path="/manageVault">
                <VaultManagement />
              </Route>
              <Route path="/getRUN">
                <GetRun />
              </Route>
              <Route path="/">
                <NewVault />
              </Route>
            </Switch>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default Top;

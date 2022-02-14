import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { NavLink } from 'react-router-dom';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

// import AirportShuttleIcon from '@material-ui/icons/AirportShuttle';
// import FlightTakeoffIcon from '@material-ui/icons/FlightTakeoff';
import MonetizationIcon from '@material-ui/icons/MonetizationOn';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import SwapIcon from '@material-ui/icons/SwapHoriz';
import AccountBalanceWallet from '@material-ui/icons/AccountBalanceWallet';
import { useApplicationContext } from '../contexts/Application';
import { AGORIC_LOGO_URL } from '../constants';
// import TrendingUpIcon from '@material-ui/icons/TrendingUp';
// import HowToVoteIcon from '@material-ui/icons/HowToVote';

const useStyles = makeStyles(_theme => ({
  selected: {
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  logo: {
    margin: '8px 8px 0 8px',
    display: 'flex',
    padding: '4px 4px 0 4px',
    alignItems: 'center',
    flexDirection: 'row',
    height: '60px',
    [_theme.breakpoints.down('xs')]: {
      display: 'none',
    },
  },
  logoImage: {
    transform: 'scale(0.85)',
  },
  sectionHeader: {
    padding: '16px',
    fontSize: '16px',
    fontFamily: 'Montserrat,Arial,sans-serif',
    fontWeight: 700,
    letterSpacing: '0.15px',
  },
  divider: {
    width: '80%',
    margin: 'auto',
    padding: 0,
    height: '1px',
    backgroundColor: '#eee',
    [_theme.breakpoints.down('sm')]: {
      display: 'none',
    },
  },
}));

function ListItemLink(props) {
  const { icon, primary, to, replace } = props;

  const classes = useStyles();

  const renderLink = React.useMemo(() => {
    const listRouterLink = (itemProps, ref) => (
      <NavLink
        to={to}
        ref={ref}
        exact
        replace={replace}
        {...itemProps}
        activeClassName={classes.selected}
      />
    );
    listRouterLink.displayName = `listRouterLink(RouterLink)`;
    return React.forwardRef(listRouterLink);
  }, [to, replace]);

  return (
    <ListItem button component={renderLink}>
      {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
      <ListItemText primary={primary} />
    </ListItem>
  );
}

function NavDrawer() {
  const classes = useStyles();
  const {
    state: { useGetRUN },
  } = useApplicationContext();

  return (
    <div>
      <div className={classes.logo}>
        <a href="https://agoric.com">
          <img
            className={classes.logoImage}
            src={AGORIC_LOGO_URL}
            alt="Agoric"
            width="200"
          ></img>
        </a>
      </div>
      <List>
        <div className={classes.divider} />
        <div className={classes.sectionHeader}>Core Economy</div>
        <ListItemLink
          icon={<MonetizationIcon />}
          primary="New Vault"
          to="/"
          replace
        />
        <ListItemLink
          icon={<AccountBalanceIcon />}
          primary="Vaults"
          to="/vaults"
          replace
        />
        {useGetRUN && (
          <ListItemLink
            icon={<AccountBalanceWallet />}
            primary="getRUN"
            to="/getRUN"
            replace
          />
        )}
        {/* <ListItemLink
          icon={<FlightTakeoffIcon />}
          primary="Pegasus"
          to="/pegasus"
          replace
        /> */}
        <ListItemLink
          icon={<SwapIcon />}
          primary="Autoswap"
          to="/swap"
          replace
        />
        {/* <ListItemLink
          icon={<TrendingUpIcon />}
          primary="Rewards"
          to="/rewards"
          replace
        />
        <ListItemLink
          icon={<HowToVoteIcon />}
          primary="Governance"
          to="/gov"
          replace
        /> */}
      </List>
    </div>
  );
}

export default NavDrawer;

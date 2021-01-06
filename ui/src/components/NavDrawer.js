import React from 'react';

import { Link as RouterLink } from 'react-router-dom';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

// import AirportShuttleIcon from '@material-ui/icons/AirportShuttle';
import FlightTakeoffIcon from '@material-ui/icons/FlightTakeoff';
import MonetizationIcon from '@material-ui/icons/MonetizationOn';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import SwapIcon from '@material-ui/icons/SwapHoriz';
import TrendingUpIcon from '@material-ui/icons/TrendingUp';
import HowToVoteIcon from '@material-ui/icons/HowToVote';

function ListItemLink(props) {
  const { icon, primary, to, replace } = props;

  const renderLink = React.useMemo(() => {
    const listRouterLink = (itemProps, ref) => (
      <RouterLink to={to} ref={ref} replace={replace} {...itemProps} />
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
  return (
    <div>
      <Divider />
      <List>
        <ListItemLink
          icon={<MonetizationIcon />}
          primary="New Vault"
          to="/"
          replace
        />
        <ListItemLink
          icon={<AccountBalanceIcon />}
          primary="Treasury"
          to="/treasury"
          replace
        />
        <ListItemLink
          icon={<FlightTakeoffIcon />}
          primary="Pegasus"
          to="/pegasus"
          replace
        />
        <ListItemLink
          icon={<SwapIcon />}
          primary="Autoswap"
          to="/swap"
          replace
        />
        <ListItemLink
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
        />
      </List>
    </div>
  );
}

export default NavDrawer;

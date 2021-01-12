import React from 'react';

// import { Link as RouterLink } from 'react-router-dom';
import Divider from '@material-ui/core/Divider';
// import List from '@material-ui/core/List';
// import ListItem from '@material-ui/core/ListItem';
// import ListItemIcon from '@material-ui/core/ListItemIcon';
// import ListItemText from '@material-ui/core/ListItemText';

// import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
// import Typography from '@material-ui/core/Typography';

// import AirportShuttleIcon from '@material-ui/icons/AirportShuttle';
// import FlightTakeoffIcon from '@material-ui/icons/FlightTakeoff';
// import MonetizationIcon from '@material-ui/icons/MonetizationOn';
// import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
// import SwapIcon from '@material-ui/icons/SwapHoriz';
// import TrendingUpIcon from '@material-ui/icons/TrendingUp';
// import HowToVoteIcon from '@material-ui/icons/HowToVote';

import { useApplicationContext } from '../contexts/Application';

import { VaultSummary } from './VaultSummary';

// const useStyles = makeStyles({
//   root: {
//     minWidth: 275,
//   },
//   bullet: {
//     display: 'inline-block',
//     margin: '0 2px',
//     transform: 'scale(0.8)',
//   },
//   title: {
//     fontSize: 14,
//   },
//   pos: {
//     marginBottom: 12,
//   },
// });

function VaultList() {
  const {
    state: { vaults },
  } = useApplicationContext();
  return (
    <div>
      <Divider />
      <List>
        {Object.entries(vaults).map(([key, v]) => (
          <ListItem key={key}>
            <Card key={key}>
              <CardContent>
                <VaultSummary vault={v}></VaultSummary>
              </CardContent>
              <CardActions>
                <Button size="small">Manage Debt</Button>
                <Button size="small">Manage Collateral</Button>
              </CardActions>
            </Card>
          </ListItem>
        ))}
      </List>
    </div>
  );
}

export default VaultList;

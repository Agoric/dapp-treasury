import React from 'react';

import { Paper } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
// import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';

import { makeStyles } from '@material-ui/core/styles';

import DepositCollateral from './DepositCollateral';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
}));

const TabPanel = props => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
};

const ManageVaultTabs = ({ purses, walletP, vaultToManageId }) => {
  const classes = useStyles();
  const [value, setValue] = React.useState(0);

  const handleChange = (_event, newValue) => {
    setValue(newValue);
  };

  return (
    <Paper elevation={3}>
      <div className={classes.root}>
        <AppBar position="static">
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="simple tabs example"
          >
            <Tab label="Deposit Collateral" />
            <Tab label="Withdraw Collateral" />
            <Tab label="Borrow Moe" />
            <Tab label="Pay back Moe" />
          </Tabs>
        </AppBar>
        <TabPanel value={value} index={0}>
          <DepositCollateral
            purses={purses}
            walletP={walletP}
            vaultToManageId={vaultToManageId}
            offerBeingMade={false}
          />
        </TabPanel>
        <TabPanel value={value} index={1}>
          Withdraw Collateral
        </TabPanel>
        <TabPanel value={value} index={2}>
          Borrow Moe
        </TabPanel>
        <TabPanel value={value} index={3}>
          Pay back Moe
        </TabPanel>
      </div>
    </Paper>
  );
};

export default ManageVaultTabs;

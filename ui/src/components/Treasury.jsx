import React, { useState } from 'react';

import { Redirect } from 'react-router-dom';

import Divider from '@material-ui/core/Divider';

import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Grid from '@material-ui/core/Grid';

import { useApplicationContext } from '../contexts/Application';

import { VaultSummary } from './VaultSummary';

import { setVaultToManageId } from '../store';

function VaultList() {
  const {
    state: { vaults },
    dispatch,
  } = useApplicationContext();

  const [redirect, setRedirect] = useState(false);

  const handleOnClick = key => {
    dispatch(setVaultToManageId(key));
    setRedirect('/manageVault');
  };

  if (redirect) {
    return <Redirect to={redirect} />;
  }
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
                <Grid container justify="flex-end">
                  <Grid item>
                    <Button size="small" onClick={() => handleOnClick(key)}>
                      Manage Vault
                    </Button>
                  </Grid>
                </Grid>
              </CardActions>
            </Card>
          </ListItem>
        ))}
      </List>
    </div>
  );
}

export default VaultList;

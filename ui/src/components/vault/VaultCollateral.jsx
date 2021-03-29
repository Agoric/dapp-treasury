import React from 'react';

import {
  FormControl,
  FormLabel,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@material-ui/core';

import { stringifyValue } from '@agoric/ui-components';

import '../../types/types';

import { setVaultCollateral } from '../../store';
import { getInfoForBrand } from '../helpers';
import { toPrintedPercent } from '../../utils/helper';

const displayPetname = petname =>
  Array.isArray(petname) ? petname[1] : petname;

const collateralAvailable = c => Array.isArray(c) && c.length > 0;
const noCollateralAvailableDiv = (
  <div>No assets are available to use as collateral.</div>
);

const headCells = [
  { id: 'petname', label: 'Asset' },
  { id: 'marketPrice', label: 'Market Price' },
  { id: 'initialMargin', label: 'Collateral Ratio' },
  { id: 'liqMargin', label: 'Liquidation Ratio' },
  { id: 'stabilityFee', label: 'Interest Rate' },
];

const makeHeaderCell = data => (
  <TableCell key={data.id}>{data.label}</TableCell>
);

const percentCell = x => (
  <TableCell align="right">{toPrintedPercent(x, 2n)}%</TableCell>
);

/**
 * Display a row per brand of potential collateral
 *
 * @param {(collateralInfo) => () => void} makeOnClick
 * @param {CollateralInfo} row
 * @param {Array<Array<Brand, BrandInfo>>} brandToInfo
 * @returns {import('react').ReactComponentElement}
 */
const makeCollateralRow = (makeOnClick, row, brandToInfo) => {
  const collateralInfo = getInfoForBrand(brandToInfo, row.brand);
  const collateralPetname = collateralInfo.petname;

  const moeBrandInfo = getInfoForBrand(
    brandToInfo,
    row.marketPrice.numerator.brand,
  );
  return (
    <TableRow key={JSON.stringify(collateralPetname)}>
      <TableCell padding="checkbox">
        <Radio onClick={makeOnClick(row)} />
      </TableCell>
      <TableCell>{displayPetname(collateralPetname)}</TableCell>
      <TableCell align="right">
        $
        {stringifyValue(
          row.marketPrice.numerator.value,
          moeBrandInfo.mathKind,
          moeBrandInfo.decimalPlaces,
        )}
      </TableCell>
      {percentCell(row.initialMargin)}
      {percentCell(row.liquidationMargin)}
      {percentCell(row.stabilityFee)}
    </TableRow>
  );
};

/**
 * Make the table of collateral options to choose from.
 *
 * @param {Collaterals} collaterals
 * @param {(CollateralInfo) => () => void} makeOnClick
 * @param {Array<Array<Brand, BrandInfo>>} brandToInfo
 * @returns {import('react').ReactComponentElement}
 */
const makeCollateralTable = (collaterals, makeOnClick, brandToInfo) => {
  const makeRow = row => makeCollateralRow(makeOnClick, row, brandToInfo);
  return (
    <div>
      <FormControl component="fieldset">
        <FormLabel component="legend">Choose collateral</FormLabel>{' '}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                {headCells.map(makeHeaderCell)}
              </TableRow>
            </TableHead>
            <TableBody>{collaterals.map(makeRow)}</TableBody>
          </Table>
        </TableContainer>
      </FormControl>
    </div>
  );
};

function VaultCollateral({ dispatch, collaterals, brandToInfo }) {
  const makeOnClick = row => _ev => {
    dispatch(setVaultCollateral(row));
  };

  if (!collateralAvailable(collaterals)) {
    return noCollateralAvailableDiv;
  }

  return makeCollateralTable(collaterals, makeOnClick, brandToInfo);
}

export default VaultCollateral;

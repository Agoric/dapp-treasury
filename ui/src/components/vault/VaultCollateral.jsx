// @ts-check
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

import '../../types/types';

import { setVaultCollateral } from '../../store';
import { makeDisplayFunctions } from '../helpers';

/** @param { unknown } c */
const collateralAvailable = c => Array.isArray(c) && c.length > 0;
const standByForCollateralDiv = <div>Looking up collateral...</div>;
const noCollateralAvailableDiv = (
  <div>No assets are available to use as collateral.</div>
);

const headCells = [
  { id: 'petname', label: 'Asset' },
  { id: 'marketPrice', label: 'Market Price' },
  { id: 'initialMargin', label: 'Min Collateralization Ratio' },
  { id: 'liqMargin', label: 'Liquidation Ratio' },
  { id: 'stabilityFee', label: 'Interest Rate' },
];

const makeHeaderCell = data => (
  <TableCell key={data.id}>{data.label}</TableCell>
);

/**
 * @param {Object} info
 * @param {TreasuryDispatch} info.dispatch
 * @param {PursesJSONState[]} info.purses
 * @param {Collateral[]} info.collaterals
 * @param {Collateral} info.runLoCTerms
 * @param {Iterable<[Brand, BrandInfo]>} info.brandToInfo
 */
function VaultCollateral({
  dispatch,
  purses,
  collaterals: collateralsRaw,
  runLoCTerms,
  brandToInfo,
}) {
  const {
    displayRatio,
    displayPercent,
    displayBrandPetname,
  } = makeDisplayFunctions(brandToInfo);

  /** @param {Collateral} row */
  const makeOnClick = row => _ev => {
    dispatch(setVaultCollateral(row));
  };

  // Filter out brands that the wallet does not have purses for
  const purseBrands = new Set(purses && purses.map(p => p.brand));
  const collaterals =
    collateralsRaw && collateralsRaw.filter(c => purseBrands.has(c.brand));

  if (!collaterals) {
    return standByForCollateralDiv;
  } else if (!collateralAvailable(collaterals)) {
    return noCollateralAvailableDiv;
  }

  /** @param { Ratio } x */
  const percentCell = x => (
    <TableCell align="right">{displayPercent(x)}%</TableCell>
  );

  /**
   * Display a row per brand of potential collateral
   *
   * @param {CollateralInfo} row
   * @returns {import('react').ReactComponentElement}
   */
  const makeCollateralRow = row => {
    const marketPriceDisplay = displayRatio(row.marketPrice);
    const collateralPetnameDisplay = displayBrandPetname(row.brand);

    return (
      <TableRow key={collateralPetnameDisplay}>
        <TableCell padding="checkbox">
          <Radio onClick={makeOnClick(row)} />
        </TableCell>
        <TableCell>{collateralPetnameDisplay}</TableCell>
        <TableCell align="right">${marketPriceDisplay}</TableCell>
        {percentCell(row.initialMargin)}
        {percentCell(row.liquidationMargin)}
        {percentCell(row.stabilityFee)}
      </TableRow>
    );
  };

  /** @param {Collateral} row */
  const makeRunLoCRow = row => {
    const marketPriceDisplay = displayRatio(row.marketPrice);
    const collateralPetnameDisplay = displayBrandPetname(row.brand);
    return (
      <TableRow key="RUNLoC">
        <TableCell padding="checkbox">
          <Radio onClick={makeOnClick(row)} />
        </TableCell>
        <TableCell>{collateralPetnameDisplay}</TableCell>
        <TableCell align="right">${marketPriceDisplay}</TableCell>
        {percentCell(row.initialMargin)}
        <TableCell align="right">
          <span title="RUN Line of Credit">0%*</span>
        </TableCell>
        {percentCell(row.stabilityFee)}
      </TableRow>
    );
  };

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
            <TableBody>
              {runLoCTerms && makeRunLoCRow(runLoCTerms)}
              {collaterals.map(makeCollateralRow)}
            </TableBody>
          </Table>
        </TableContainer>
      </FormControl>
    </div>
  );
}

export default VaultCollateral;

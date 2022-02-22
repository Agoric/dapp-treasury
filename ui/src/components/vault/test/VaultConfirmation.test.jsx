/* eslint-disable import/no-extraneous-dependencies */
import { mount } from 'enzyme';

import VaultConfirmation from '../VaultConfirmation';

const state = {};

const useApplicationContext = () => ({
  state,
});

jest.mock('../../../contexts/Application', () => ({ useApplicationContext }));

jest.mock('../../../store', () => ({
  setVaultCollateral: jest.fn(),
  setLoadTreasuryError: jest.fn(),
}));

jest.mock('../../helpers', () => ({
  makeDisplayFunctions: _brandToInfo => ({
    displayPercent: (val, _places) => `${val}`,
    displayAmount: amount => `${amount}`,
  }),
  displayPetname: petname => `${petname}`,
}));

const vaultConfiguration = {
  fundPurse: { pursePetname: 'my BLD purse', brandPetname: 'BLD' },
  dstPurse: { pursePetname: 'my RUN purse', brandPetname: 'RUN' },
  toBorrow: 48,
  collateralPercent: '200',
  toLock: 24,
  interestRate: '2',
  stabilityFee: '0.01',
  liquidationMargin: '125',
};
const brandToInfo = {};

test('renders the interest rate', () => {
  const component = mount(
    <VaultConfirmation
      vaultConfiguration={vaultConfiguration}
      brandToInfo={brandToInfo}
    />,
  );

  const rows = component.find('tr');
  expect(
    rows
      .at(2)
      .find('td')
      .at(1)
      .text(),
  ).toContain(`${vaultConfiguration.interestRate}%`);
});

test('renders the stability fee', () => {
  const component = mount(
    <VaultConfirmation
      vaultConfiguration={vaultConfiguration}
      brandToInfo={brandToInfo}
    />,
  );

  const rows = component.find('tr');
  expect(
    rows
      .at(3)
      .find('td')
      .at(1)
      .text(),
  ).toContain(`${vaultConfiguration.stabilityFee}%`);
});

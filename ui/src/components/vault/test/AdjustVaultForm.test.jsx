/* eslint-disable import/no-extraneous-dependencies */
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { AmountMath } from '@agoric/ertp';
import AdjustVaultForm from '../VaultManagement/AdjustVaultForm';
import NatPurseAmountInput from '../VaultManagement/NatPurseAmountInput';
import CollateralActionChoice from '../VaultManagement/CollateralActionChoice';
import DebtActionChoice from '../VaultManagement/DebtActionChoice';

jest.mock('@agoric/ertp', () => ({
  AmountMath: {
    make: jest.fn(),
    add: jest.fn(),
    subtract: jest.fn(),
  },
}));

jest.mock('../VaultManagement/NatPurseAmountInput', () => () =>
  'NatPurseAmountInput',
);

jest.mock('../VaultManagement/makeAdjustVaultOffer', () => ({
  makeAdjustVaultOffer: jest.fn(),
}));

test('shows an error when withdrawing more than locked', () => {
  const locked = { brand: 'BLD', value: 100n };
  const debt = { brand: 'RUN', value: 50n };
  AmountMath.subtract.mockImplementation(() => {
    throw new Error();
  });

  const component = mount(<AdjustVaultForm locked={locked} debt={debt} />);
  const collateralActionChoice = component.find(CollateralActionChoice);
  act(() => collateralActionChoice.props().setCollateralAction('withdraw'));

  let lockedInput = component.find(NatPurseAmountInput).at(0);
  expect(lockedInput.props().error).toEqual(null);

  act(() => lockedInput.props().onAmountChange(0n));
  component.update();
  lockedInput = component.find(NatPurseAmountInput).at(0);
  expect(lockedInput.props().error).toEqual('Insufficient locked balance');
});

test('shows an error when repaying more than borrowed', () => {
  const locked = { brand: 'BLD', value: 100n };
  const debt = { brand: 'RUN', value: 50n };
  AmountMath.subtract.mockImplementation(() => {
    throw new Error();
  });

  const component = mount(<AdjustVaultForm locked={locked} debt={debt} />);
  const debtActionChoice = component.find(DebtActionChoice);
  act(() => debtActionChoice.props().setDebtAction('repay'));

  let debtInput = component.find(NatPurseAmountInput).at(1);
  expect(debtInput.props().error).toEqual(null);

  act(() => debtInput.props().onAmountChange(0n));
  component.update();
  debtInput = component.find(NatPurseAmountInput).at(1);
  expect(debtInput.props().error).toEqual('Insufficient debt balance');
});

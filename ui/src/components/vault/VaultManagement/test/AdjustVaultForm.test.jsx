/* eslint-disable import/no-extraneous-dependencies */
import { mount } from 'enzyme';

import Button from '@material-ui/core/Button';

import AdjustVaultForm from '../AdjustVaultForm';
import NatPurseAmountInput from '../NatPurseAmountInput';

jest.mock('@agoric/ertp', () => ({
  AmountMath: {
    make: jest.fn(),
    add: jest.fn(),
    subtract: jest.fn(),
  },
}));

jest.mock('../NatPurseAmountInput', () => () => 'NatPurseAmountInput');

test('enables the button when a valid offer can be made', () => {
  const component = mount(
    <AdjustVaultForm collateralAction="noaction" debtAction="noaction" />,
  );
  let button = component.find(Button).at(1);
  expect(button.props().disabled).toBeTruthy();

  component.setProps({
    collateralAction: 'borrow',
    debtAction: 'repay',
    lockedDelta: { brand: 'BLD', value: 100n },
    debtDelta: { brand: 'RUN', value: 100n },
    runPurseSelected: 'purse1',
    collateralPurseSelected: 'purse2',
  });
  component.update();

  button = component.find(Button).at(1);
  expect(button.props().disabled).toBeFalsy();
});

test('shows an error when withdrawing more than locked', () => {
  const component = mount(
    <AdjustVaultForm lockedInputError="Insufficient locked balance" />,
  );

  const lockedInput = component.find(NatPurseAmountInput).at(0);
  const button = component.find(Button).at(1);
  expect(lockedInput.props().error).toEqual('Insufficient locked balance');
  expect(button.props().disabled).toBeTruthy();
});

test('shows an error when repaying more than borrowed', () => {
  const component = mount(
    <AdjustVaultForm debtInputError="Insufficient debt balance" />,
  );

  const debtInput = component.find(NatPurseAmountInput).at(1);
  const button = component.find(Button).at(1);
  expect(debtInput.props().error).toEqual('Insufficient debt balance');
  expect(button.props().disabled).toBeTruthy();
});

test('disables the button when the offer is invalid', () => {
  const component = mount(<AdjustVaultForm invalidOffer={true} />);

  const button = component.find(Button).at(1);
  expect(button.props().disabled).toBeTruthy();
});

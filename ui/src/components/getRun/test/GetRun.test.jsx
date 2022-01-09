/* eslint-disable import/no-extraneous-dependencies */
import { mount } from 'enzyme';
import GetRun from '../GetRun';

test('renders the header', () => {
  const component = mount(<GetRun />);

  expect(component.find('h3').text()).toContain('getRUN');
});

import { RouterFormProps } from 'components/flow/props';
import DescriptionAlert from 'components/flow/routers/smart/DescriptionAlert/DescriptionAlert';
import { composeComponentTestUtils } from 'testUtils';
import { getRouterFormProps, createMatchRouter } from 'testUtils/assetCreators';
import { shallowToJson } from 'enzyme-to-json';

const routerNode = createMatchRouter(['Red']);

const { setup } = composeComponentTestUtils<RouterFormProps>(
  DescriptionAlert,
  getRouterFormProps(routerNode),
);

describe(DescriptionAlert.name, () => {
  it('should render', () => {
    const { wrapper } = setup(true);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});

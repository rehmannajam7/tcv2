import * as React from 'react';
import { AssetType } from 'store/flowContext';
import {
  render,
  fireUnnnicInputChangeText,
  getUnnnicInputValue,
  fireEvent,
  act,
} from 'test/utils';
import { mock } from 'testUtils';
import {
  createClassifyRouter,
  getRouterFormProps,
} from 'testUtils/assetCreators';
import * as utils from 'utils';
import ClassifyRouterForm from './ClassifyRouterForm';
import * as external from 'external';

mock(
  external,
  'fetchAsset',
  utils.fetchAsset({
    id: 'purrington',
    name: 'Purrington',
    type: AssetType.Classifier,
    content: {
      intents: ['fact', 'opinion'],
    },
  }),
);

mock(utils, 'createUUID', utils.seededUUIDs());

const routerNode = createClassifyRouter();

const getProps = () => {
  const formProps = getRouterFormProps(routerNode);
  formProps.assetStore.classifiers = {
    type: AssetType.Classifier,
    items: {},
    endpoint: '/assets/classifiers.json',
  };
  return formProps;
};

describe(ClassifyRouterForm.name, () => {
  it('should render', async () => {
    let rendered: any;
    await act(async () => {
      rendered = render(<ClassifyRouterForm {...getProps()} />);
      return undefined;
    });
    expect(rendered.baseElement).toMatchSnapshot();
  });

  it('defaults to correct result name', async () => {
    const props = getProps();
    props.nodeSettings.originalNode.node.router.result_name =
      'Initial Result Name';
    let rendered: any;
    await act(async () => {
      rendered = render(<ClassifyRouterForm {...props} />);
      return undefined;
    });

    const result = rendered.getByTestId('Save as result');
    expect(getUnnnicInputValue(result)).toEqual('Initial Result Name');
  });

  it('updates the result name', async () => {
    let rendered: any;
    await act(async () => {
      rendered = render(<ClassifyRouterForm {...getProps()} />);
      return undefined;
    });

    const result = rendered.getByTestId('Save as result');
    fireUnnnicInputChangeText(result, 'Updated Result Name');
    expect(getUnnnicInputValue(result)).toEqual('Updated Result Name');
  });

  it('should change to classifier input tab on label click', async () => {
    let rendered: any;
    await act(async () => {
      rendered = render(<ClassifyRouterForm {...getProps()} />);
      return undefined;
    });
    expect(rendered.baseElement).toMatchSnapshot();
    fireEvent.click(rendered.getByText('@input'));
    expect(rendered.baseElement).toMatchSnapshot();
  });

  it('should cancel', async () => {
    const props = getProps();
    let rendered: any;
    await act(async () => {
      rendered = render(<ClassifyRouterForm {...props} />);
      return undefined;
    });
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.click(rendered.getByText('Cancel'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('should save with desired changes', async () => {
    const props = getProps();
    (props.nodeSettings.originalNode.node.actions[0] as any).classifier = null;
    (props.nodeSettings.originalNode.node.actions[0] as any).input =
      '@input.text';
    let rendered: any;
    await act(async () => {
      rendered = render(<ClassifyRouterForm {...props} />);
      return undefined;
    });
    expect(rendered.baseElement).toMatchSnapshot();

    //try to save without a classifier
    fireEvent.click(rendered.getByText('Confirm'));

    // should not save
    expect(props.updateRouter).not.toHaveBeenCalled();

    // change the classifier
    fireEvent.click(rendered.getByText('Purrington'));

    expect(rendered.baseElement).toMatchSnapshot();

    // go to next tab to change the operand
    fireEvent.click(rendered.getByText('Classifier input'));
    fireUnnnicInputChangeText(rendered.getByTestId('Operand'), 'New input');

    expect(props.updateRouter).not.toHaveBeenCalled();

    // save
    fireEvent.click(rendered.getByText('Confirm'));

    expect(props.updateRouter).toHaveBeenCalled();
    expect(props.updateRouter).toMatchSnapshot();
  });

  it('should render without cases', () => {
    const props = getProps();
    (props.nodeSettings.originalNode.node.router as any).cases = null;
    const rendered = render(<ClassifyRouterForm {...props} />);
    expect(rendered.baseElement).toMatchSnapshot();
  });

  it('should render with incorrect node type', () => {
    const props = getProps();
    (props.nodeSettings.originalNode.ui.type as any) = 'not a classifier';
    const rendered = render(<ClassifyRouterForm {...props} />);
    expect(rendered.baseElement).toMatchSnapshot();
  });
});

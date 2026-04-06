import { RouterFormProps } from 'components/flow/props';
import { Types } from 'config/interfaces';
import {
  createSubflowNode,
  createStartFlowAction,
} from 'testUtils/assetCreators';
import { getTypeConfig } from 'config';
import {
  render,
  mock,
  fireEvent,
  waitFor,
  getUpdatedNode,
  fireUnnnicInputChangeText,
  act,
} from 'test/utils';
import * as React from 'react';
import * as utils from 'utils';
import { RenderNode, AssetType } from 'store/flowContext';
import SubflowRouterForm from './SubflowRouterForm';
import * as external from 'external';
import { describe, vi, it, expect } from 'vitest';

mock(utils, 'createUUID', utils.seededUUIDs());

const getRouterFormProps = (
  type: Types,
  originalNode: RenderNode,
): RouterFormProps => {
  return {
    nodeSettings: {
      originalNode,
    },
    typeConfig: getTypeConfig(type),
    assetStore: { flows: { items: {}, type: AssetType.Flow } },
    updateRouter: vi.fn(),
    onTypeChange: vi.fn(),
    onClose: vi.fn(),
    helpArticles: {},
    issues: [],
  };
};

const subflowProps = getRouterFormProps(
  Types.split_by_subflow,
  createSubflowNode(createStartFlowAction()),
);

mock(
  external,
  'fetchAsset',
  utils.fetchAsset({
    id: 'my-subflow',
    name: 'My Subflow Flow',
    type: AssetType.Flow,
    content: {
      parent_refs: ['max', 'min'],
    },
  }),
);

describe(SubflowRouterForm.name, () => {
  it('should render', () => {
    const { baseElement } = render(<SubflowRouterForm {...subflowProps} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should init parameter tab', async () => {
    const { baseElement } = render(<SubflowRouterForm {...subflowProps} />);
    // let our mount event to render our tabs
    await waitFor(() => expect(baseElement).toMatchSnapshot());
  });

  it('should create result actions for parameters', async () => {
    const { baseElement, getByText, getByTestId } = render(
      <SubflowRouterForm {...subflowProps} />,
    );
    await waitFor(() => expect(baseElement).toMatchSnapshot());

    // open the parameter tab
    fireEvent.click(getByText('Parameters'));

    const min = getByTestId('min');
    const max = getByTestId('max');

    // enter some values
    fireUnnnicInputChangeText(min, '1');
    fireUnnnicInputChangeText(max, '100');

    await waitFor(() => expect(baseElement).toMatchSnapshot());

    fireEvent.click(getByText('Confirm'));
    let actions = getUpdatedNode(subflowProps).node.actions;

    // should have a run result action for each parameter, plus an enter flow action
    expect(actions.length).toEqual(3);
    expect(actions[0].type).toEqual(Types.set_run_result);
    expect(actions[1].type).toEqual(Types.set_run_result);
    expect(actions[2].type).toEqual(Types.enter_flow);
    expect(subflowProps.updateRouter).toMatchSnapshot();

    // remove a parameter
    await act(async () => {
      fireUnnnicInputChangeText(min, '');
    });

    fireEvent.click(getByText('Confirm'));
    // now only two actions
    actions = getUpdatedNode(subflowProps).node.actions;
    expect(actions.length).toEqual(2);
    expect(actions[0].type).toEqual(Types.set_run_result);
    expect(actions[1].type).toEqual(Types.enter_flow);
  });
});

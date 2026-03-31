import { RouterFormProps } from 'components/flow/props';
import { getTypeConfig } from 'config';
import { Types } from 'config/interfaces';
import * as React from 'react';
import { fireEvent, fireUnnnicInputChangeText, render } from 'test/utils';
import { composeComponentTestUtils, mock } from 'testUtils';
import {
  createRandomNode,
  createRenderNode,
  createSendMsgAction,
  getRouterFormProps,
} from 'testUtils/assetCreators';
import * as utils from 'utils';
import userEvent from '@testing-library/user-event';
import { shallowToJson } from 'enzyme-to-json';

import RandomRouterForm from './RandomRouterForm';

mock(utils, 'createUUID', utils.seededUUIDs());

const { setup } = composeComponentTestUtils<RouterFormProps>(
  RandomRouterForm,
  getRouterFormProps(createRandomNode(2)),
);

describe(RandomRouterForm.name, () => {
  it('should render', () => {
    const { wrapper } = setup(true);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  it('should initialize existing random', () => {
    const props: RouterFormProps = {
      nodeSettings: {
        originalNode: createRandomNode(5),
      },
      typeConfig: getTypeConfig(Types.split_by_random),
      assetStore: null,
      updateRouter: vi.fn(),
      onTypeChange: vi.fn(),
      onClose: vi.fn(),
      issues: [],
      helpArticles: {},
    };

    const { baseElement } = render(<RandomRouterForm {...props} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should remove exits when shrinking', async () => {
    const props: RouterFormProps = {
      nodeSettings: {
        originalNode: createRandomNode(5),
      },
      typeConfig: getTypeConfig(Types.split_by_random),
      assetStore: null,
      updateRouter: vi.fn(),
      onTypeChange: vi.fn(),
      onClose: vi.fn(),
      helpArticles: {},
      issues: [],
    };

    const { baseElement, getByText } = render(<RandomRouterForm {...props} />);

    // we start off with five input boxes for our buckets plus 2 considering the select elements inputs
    expect(baseElement.querySelectorAll('input').length).toEqual(7);

    // choose 3 buckets
    userEvent.click(getByText('3 buckets'));

    // now we should only have three input buckets plus 2 from the select elements inputs
    expect(baseElement.querySelectorAll('input').length).toEqual(5);
    expect(baseElement).toMatchSnapshot();

    // now lets save our form
    fireEvent.click(getByText('Confirm'));

    expect(props.updateRouter).toMatchSnapshot();
  });

  it('should convert from a non-random node', () => {
    const { wrapper, instance, props } = setup(true, {
      nodeSettings: {
        $set: {
          originalAction: createSendMsgAction({ text: '' }),
          originalNode: createRenderNode({
            actions: [createSendMsgAction({ text: 'A message' })],
            exits: [{ uuid: utils.createUUID() }],
            ui: {
              type: Types.execute_actions,
              position: { left: 100, top: 100 },
            },
          }),
        },
      },
    });
    instance.handleUpdateResultName('New Result');

    instance.handleSave();

    // our orginal node should still only have one exit
    expect(props.nodeSettings.originalNode.node.exits.length).toBe(1);

    expect(shallowToJson(wrapper)).toMatchSnapshot();
    expect(props.updateRouter).toMatchSnapshot();
    expect(props.nodeSettings.originalNode).toMatchSnapshot();
  });

  it('should change bucket names and save', async () => {
    const randomNode = createRandomNode(5);
    const props: RouterFormProps = {
      nodeSettings: {
        originalNode: randomNode,
      },
      typeConfig: getTypeConfig(Types.split_by_random),
      assetStore: null,
      updateRouter: vi.fn(),
      onTypeChange: vi.fn(),
      onClose: vi.fn(),
      helpArticles: {},
      issues: [],
    };

    const { baseElement, getByText, getByTestId } = render(
      <RandomRouterForm {...props} />,
    );

    // get a bucket name input
    const bucketNameInput = getByTestId(
      randomNode.node.router.categories[0].uuid,
    );
    // change the value to an empty string
    fireUnnnicInputChangeText(bucketNameInput, '');

    // now we should should not be allowed to save
    fireEvent.click(getByText('Confirm'));
    expect(props.updateRouter).not.toHaveBeenCalled();

    // change the value to a non-empty string
    fireUnnnicInputChangeText(bucketNameInput, 'New Bucket Name');

    expect(baseElement).toMatchSnapshot();

    // now lets save our form
    fireEvent.click(getByText('Confirm'));

    expect(props.updateRouter).toMatchSnapshot();
  });

  it('should cancel', () => {
    const { instance, props } = setup(true, {
      $merge: { updateRouter: vi.fn(), onClose: vi.fn() },
    });

    instance.handleUpdateResultName('Dont save me!');
    instance.getButtons().secondary.onClick();
    expect(props.onClose).toHaveBeenCalled();
    expect(props.updateRouter).not.toHaveBeenCalled();
  });
});

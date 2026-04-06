import { RouterFormProps } from 'components/flow/props';
import WeniGPTRouterForm from 'components/flow/routers/wenigpt/WeniGPTRouterForm';
import { Types } from 'config/interfaces';
import { AssetType, RenderNode } from 'store/flowContext';
import { composeComponentTestUtils, mock } from 'testUtils';
import {
  createWebhookRouterNode,
  getRouterFormProps,
} from 'testUtils/assetCreators';
import * as utils from 'utils';
import * as React from 'react';
import {
  render,
  fireEvent,
  fireUnnnicInputChangeText,
  fireUnnnicTextAreaChangeText,
  act,
} from 'test/utils';
import userEvent from '@testing-library/user-event';
import { shallowToJson } from 'enzyme-to-json';

const mockedKnowledgeBases = require('test/assets/knowledge_bases.json');
mockedKnowledgeBases.forEach((kb: any) => {
  kb.content = kb;
});

mock(utils, 'createUUID', utils.seededUUIDs());

const weniGPTForm = getRouterFormProps({
  node: createWebhookRouterNode(),
  ui: { type: Types.call_wenigpt },
} as RenderNode);

weniGPTForm.assetStore.knowledgeBases = {
  type: AssetType.KnowledgeBase,
  items: mockedKnowledgeBases,
};

const { setup } = composeComponentTestUtils<RouterFormProps>(
  WeniGPTRouterForm,
  weniGPTForm,
);

describe(WeniGPTRouterForm.name, () => {
  it('should render', () => {
    const { wrapper } = setup(true);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  describe('updates', () => {
    it('should save changes', async () => {
      const { getByText, getByTestId } = render(
        <WeniGPTRouterForm {...weniGPTForm} />,
      );

      const okButton = getByText('Save');

      // our fields are required
      fireEvent.click(okButton);
      expect(weniGPTForm.updateRouter).not.toBeCalled();

      // set our result
      const resultName = getByTestId('Save as result');
      await act(async () => {
        fireUnnnicInputChangeText(resultName, 'My Webhook Result');
      });

      // set our knowledge_base
      userEvent.click(getByText('Intelligence 2 - Base 1'));

      // set our expression input
      const expressionInput = getByTestId(
        'Insert an expression to be used as input',
      );
      await act(async () => {
        fireUnnnicTextAreaChangeText(
          expressionInput,
          'Updated expression input data',
        );
      });

      userEvent.click(okButton);
      expect(weniGPTForm.updateRouter).toBeCalled();
      expect(weniGPTForm.updateRouter).toMatchSnapshot();
    });
  });

  it('should cancel', () => {
    const { instance, props } = setup(true, {
      $merge: { onClose: vi.fn(), updateRouter: vi.fn() },
    });
    instance.getButtons().secondary.onClick();
    expect(props.onClose).toHaveBeenCalled();
    expect(props.updateRouter).not.toHaveBeenCalled();
  });

  it('should redirect', () => {
    const { getByText } = render(<WeniGPTRouterForm {...weniGPTForm} />);

    window.postMessage = vi.fn();

    expect(window.postMessage).not.toHaveBeenCalled();
    const redirectButton = getByText('Click here');
    userEvent.click(redirectButton);

    expect(window.postMessage).toBeCalled();
  });
});

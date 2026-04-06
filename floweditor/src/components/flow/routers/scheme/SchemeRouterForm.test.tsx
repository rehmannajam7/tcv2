import { render, mock, fireEvent, getUpdatedNode, act } from 'test/utils';
import * as React from 'react';
import * as utils from 'utils';
import SchemeRouterForm from './SchemeRouterForm';
import {
  createSchemeRouter,
  getRouterFormProps,
} from 'testUtils/assetCreators';
import { SCHEMES } from 'config/typeConfigs';
import { getSmartOrSwitchRouter } from '../helpers';
import { Operators } from 'config/interfaces';
import userEvent from '@testing-library/user-event';

mock(utils, 'createUUID', utils.seededUUIDs());

const routerProps = getRouterFormProps(createSchemeRouter(SCHEMES.slice(0, 3)));

describe(SchemeRouterForm.name, () => {
  it('should render', () => {
    const { baseElement } = render(<SchemeRouterForm {...routerProps} />);
    expect(baseElement).toMatchSnapshot();
  });

  it('should reuse ids on updates', () => {
    const { getByText } = render(<SchemeRouterForm {...routerProps} />);
    fireEvent.click(getByText('Confirm'));

    expect(getUpdatedNode(routerProps).node).toEqual(
      routerProps.nodeSettings.originalNode.node,
    );
  });

  it('should select schemes', async () => {
    let rendered: any;
    await act(async () => {
      rendered = render(<SchemeRouterForm {...routerProps} />);
    });

    userEvent.click(rendered.getAllByText('WhatsApp')[0]);

    await act(async () => {
      fireEvent.click(rendered.getByText('Confirm'));
    });

    const router = getSmartOrSwitchRouter(getUpdatedNode(routerProps).node);

    expect(router.cases.length).toBe(2);
    expect(router.cases[0].arguments[0]).toBe('tel');
    expect(router.cases[0].type).toBe(Operators.has_only_phrase);
    expect(router.cases[1].arguments[0]).toBe('facebook');
    expect(router.cases[1].type).toBe(Operators.has_only_phrase);
    expect(routerProps.updateRouter).toMatchSnapshot();
  });
});

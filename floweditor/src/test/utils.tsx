// test-utils.js
import { render, fireEvent } from '@testing-library/react';
import ConfigProvider from 'config';
import { FlowDefinition, FlowNode, SPEC_VERSION } from 'flowTypes';
import React from 'react';
import { Provider } from 'react-redux';
import createStore from 'store/createStore';
import { AssetType, RenderNode } from 'store/flowContext';
import { initialState } from 'store/state';
import { createUUID } from 'utils';

import config from './config';
import { RouterFormProps } from 'components/flow/props';
const completionResp = require('test/assets/completion.json');

export const TEST_NODE: FlowNode = {
  uuid: createUUID(),
  actions: [],
  exits: [{ uuid: createUUID() }],
};

export const TEST_DEFINITION: FlowDefinition = {
  uuid: createUUID(),
  spec_version: SPEC_VERSION,
  language: 'eng',
  name: 'Favorites',
  nodes: [TEST_NODE],
  localization: {},
  revision: 1,
  _ui: null,
};

export const EMPTY_TEST_ASSETS = {
  channels: { items: {}, type: AssetType.Channel },
  fields: { items: {}, type: AssetType.Field },
  languages: { items: {}, type: AssetType.Language },
  labels: { items: {}, type: AssetType.Label },
  results: { items: {}, type: AssetType.Result },
  flows: { items: {}, type: AssetType.Flow },
  recipients: {
    items: {},
    type: AssetType.Contact || AssetType.Group || AssetType.URN,
  },
  ticketers: { items: {}, type: AssetType.Ticketer },
  externalServices: { items: {}, type: AssetType.ExternalService },
  completion: { items: completionResp, type: AssetType.Expression },
  revisions: {
    items: {},
    type: AssetType.Revision,
    endpoint: '/assets/revisions.json/',
  },
  groups: { items: {}, type: AssetType.Group },
};

const initial = initialState;
initial.flowContext.definition = TEST_DEFINITION;
initial.flowContext.assetStore = { ...EMPTY_TEST_ASSETS };

export const store = createStore(initial);

const AllTheProviders = ({ children }: { children: any }) => {
  return (
    <ConfigProvider config={config as any}>
      <Provider store={store as any}>{children}</Provider>
    </ConfigProvider>
  );
};

const customRender = (ui: any, options?: any) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export const renderWithCustomProvider = (
  ui: any,
  providers: React.JSXElementConstructor<{ children: React.ReactElement }>,
  options?: any,
) => render(ui, { wrapper: providers, ...options });

export const getUnnnicInputValue = (ele: any) => {
  return ele.querySelector('input').value;
};

export const getUnnnicSelectValue = (ele: any) => {
  return ele.__vue__.value;
};

export const fireUnnnicSwitch = (ele: any) => {
  const icon = ele.querySelector('.unnnic-switch__icon');

  fireEvent.click(icon);
};

export const fireChangeText = (ele: any, value: string): void => {
  fireEvent.change(ele, { currentTarget: { value }, target: { value } });
};

export const fireUnnnicInputChangeText = (ele: any, value: string): void => {
  fireEvent.input(ele.querySelector('input'), {
    currentTarget: { value },
    target: { value },
  });
};

export const fireUnnnicTextAreaChangeText = (ele: any, value: string): void => {
  fireEvent.input(ele.querySelector('textarea'), {
    currentTarget: { value },
    target: { value },
  });
};

export const fireUnnicInputKeyPress = (ele: any, key: string): void => {
  fireEvent.keyPress(ele.querySelector('input'), { key });
};

export const fireUnnnicKeyDown = (ele: any, key: string): void => {
  fireEvent.keyDown(ele.querySelector('input'), { key });
};

export const fireUnnnicTagDelete = (ele: any): void => {
  fireEvent.click(ele.querySelector('.unnnic-tag__icon'));
};

export const fireUnnnicSelect = (ele: any, value: any, valueKey: string) => {
  const result: any = { value: null };
  result.value = value[valueKey];

  ele.__vue__.reactWrapperRef.vueRef.onSelectOption(result);
};

export const fireUnnnicAutocompleteSelect = (
  ele: any,
  value: any,
  valueKey: string,
) => {
  const result: any = value;
  result.value = value[valueKey];

  ele.__vue__.reactWrapperRef.vueRef.toggle(result);
};

export const fireUnnnicAutocompleteSelectWithArray = (ele: any, value: any) => {
  ele.__vue__.reactWrapperRef.vueRef.toggle(value);
};

export const fireOptionSelect = (ele: HTMLElement, value: any) => {
  const event = new CustomEvent('select', { detail: value });
  fireEvent(ele, event);
};

export const getDomElement = (ele: HTMLElement, selector: string) => {
  return ele.querySelector(selector);
};

export const fireTembaSelect = (ele: HTMLElement, value: any) => {
  (ele as any).values = Array.isArray(value) ? value : [{ value }];
  const evt = document.createEvent('HTMLEvents');
  evt.initEvent('change', false, true);
  ele.dispatchEvent(evt);
};

export const fireCustomEvent = (
  ele: HTMLElement,
  eventName: string,
  eventData: any,
) => {
  const event = new CustomEvent(eventName, { detail: eventData });
  fireEvent(ele, event);
};

export const mock = <T extends {}, K extends keyof T>(
  object: T,
  property: K,
  value: T[K],
) => {
  Object.defineProperty(object, property, { get: () => value });
};

export const getCallParams = (mockCall: any) => {
  return mockCall.mock.calls[0];
};

export const getUpdatedNode = (props: RouterFormProps): RenderNode => {
  const calls = (props.updateRouter as any).mock.calls;
  return calls[calls.length - 1][0];
};

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };

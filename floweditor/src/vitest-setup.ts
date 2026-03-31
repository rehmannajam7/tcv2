// <reference types="vitest" />
/* eslint-disable no-redeclare */
/* eslint-disable no-undef */
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { cleanup } from '@testing-library/react';
import * as jestMatchers from '@testing-library/jest-dom/matchers';
import matchers from 'testUtils/matchers';
import { setupServer } from 'msw/node';
import { HttpResponse, http } from 'msw';
import { config } from 'test/config';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import * as utils from 'utils';
import { mock } from 'testUtils';
import { Console } from 'console';

expect.extend(jestMatchers);

expect.extend(matchers);

mock(utils, 'createUUID', utils.seededUUIDs());

// mock navigator clipboard
const writeText = vi.fn();

Object.assign(navigator, {
  clipboard: {
    writeText,
  },
});

const seededRandom = new utils.SeededRandom(1);
mock(Math, 'random', () => seededRandom.random());

// Configure Enzyme adapter
configure({ adapter: new Adapter() });

global.console = new Console(process.stderr, process.stderr);

// tslint:disable-next-line:ban-types
(global as any).requestAnimationFrame = (callback: Function) => {
  setTimeout(callback, 0);
};

const MockIntersectionObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  takeRecords: vi.fn(),
  unobserve: vi.fn(),
}));
vi.stubGlobal(`IntersectionObserver`, MockIntersectionObserver);

const endpoints = config.endpoints;
export const restHandlers = [
  http.get(endpoints.flows, () => {
    return HttpResponse.json(require('test/assets/flows.json'));
  }),
  http.get(endpoints.groups, () => {
    return HttpResponse.json(require('test/assets/groups.json'));
  }),
  http.get(endpoints.recipients, () => {
    return HttpResponse.json(require('test/assets/contacts.json'));
  }),
  http.get(endpoints.fields, () => {
    return HttpResponse.json(require('test/assets/fields.json'));
  }),
  http.get(endpoints.labels, () => {
    return HttpResponse.json(require('test/assets/labels.json'));
  }),
  http.get(endpoints.revisions, () => {
    return HttpResponse.json(require('test/assets/revisions.json'));
  }),
  http.get(endpoints.external_services_calls, () => {
    return HttpResponse.json(
      require('test/assets/external_services_calls.json'),
    );
  }),
  http.get(endpoints.completion, () => {
    return HttpResponse.json(require('test/assets/completion.json'));
  }),
  http.get(endpoints.users, () => {
    return HttpResponse.json(require('test/assets/users.json'));
  }),
  http.get(endpoints.topics, () => {
    return HttpResponse.json(require('test/assets/topics.json'));
  }),
  http.get(endpoints.knowledgeBases, () => {
    return HttpResponse.json(require('test/assets/knowledge_bases.json'));
  }),
  http.get(endpoints.whatsapp_products, () => {
    return HttpResponse.json(require('test/assets/whatsapp_products.json'));
  }),
  http.get(endpoints.ticketers, () => {
    return HttpResponse.json(require('test/assets/ticketers.json'));
  }),
  http.get(endpoints.ticketer_queues, () => {
    return HttpResponse.json(require('test/assets/ticketer_queues.json'));
  }),
  http.post(endpoints.simulateStart, () => {
    return HttpResponse.json(require('test/assets/simulate_start.json'));
  }),
  http.post(endpoints.simulateResume, () => {
    return HttpResponse.json(require('test/assets/simulate_resume.json'));
  }),
  http.get(endpoints.classifiers, () => {
    return HttpResponse.json(require('test/assets/classifiers.json'));
  }),
  http.get(`${endpoints.revisions}`, () => {
    return HttpResponse.json(require('test/assets/revisions.json'));
  }),
  http.get(`${endpoints.revisions}{/:id}`, () => {
    return HttpResponse.json(require('test/assets/flow_details.json'));
  }),
  http.get(endpoints.activity, () => {
    return HttpResponse.json(require('test/assets/activity.json'));
  }),
  http.get(endpoints.brain, () => {
    return HttpResponse.json(require('test/assets/brain.json'));
  }),
  http.post(endpoints.revisions, () => {
    return HttpResponse.json(require('test/assets/save_revisions.json'));
  }),
];

const server = setupServer(...restHandlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

//  Close server after all tests
afterAll(() => server.close());

// Reset handlers after each test `important for test isolation`
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

import { render } from 'test/utils';
import * as React from 'react';
import LogEvent, { EventProps } from './LogEvent';

const commonEventProps: EventProps = {
  uuid: '51e6f864-a16f-4be7-839f-945afc857559',
  step_uuid: '6de81ff6-f541-4099-8ad7-03214d15b07d',
  created_on: '2020-01-29T10:43:30.123456789Z',
};

const testEventRender = (eventProps: EventProps) => {
  const props: EventProps = {
    ...eventProps,
  };
  const { baseElement } = render(<LogEvent {...props} />);

  expect(baseElement).toMatchSnapshot();
};

describe(LogEvent.name, () => {
  it('should render broadcast_created event', () => {
    testEventRender({
      type: 'broadcast_created',
      groups: [
        { uuid: '3a3e061e-dad5-4454-88e4-ccbd0ef0e475', name: 'U-Reporters' },
      ],
      translations: {
        eng: {
          text: 'Hi there',
        },
        spa: {
          text: 'Hola',
        },
      },
      base_language: 'eng',
      ...commonEventProps,
    });
  });
  it('should render broadcast_created event with attachment', () => {
    testEventRender({
      type: 'broadcast_created',
      groups: [
        { uuid: '3a3e061e-dad5-4454-88e4-ccbd0ef0e475', name: 'U-Reporters' },
      ],
      translations: {
        eng: {
          text: 'Hi there',
        },
        spa: {
          text: 'Hola',
        },
      },
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        text: 'Hi there',
        urn: 'tel:+1123456789',
        attachments: ['image/jpeg:http://temba.io/test.jpg'],
      },
      base_language: 'eng',
      ...commonEventProps,
    });
  });
  it('should render contact_field_changed event', () => {
    testEventRender({
      type: 'contact_field_changed',
      field: { key: 'age', name: 'Age' },
      value: { text: '38' },
      ...commonEventProps,
    });
  });
  it('should render contact_field_changed event with null value', () => {
    testEventRender({
      type: 'contact_field_changed',
      field: { key: 'age', name: 'Age' },
      value: null,
      ...commonEventProps,
    });
  });
  it('should render contact_groups_changed event', () => {
    testEventRender({
      type: 'contact_groups_changed',
      groups_added: [
        { uuid: '3a3e061e-dad5-4454-88e4-ccbd0ef0e475', name: 'U-Reporters' },
        { uuid: 'd749781c-bb3a-4894-81fb-683b6368b29c', name: 'Youth' },
      ],
      groups_removed: [
        { uuid: '669ce0aa-0444-4597-87a0-feb82401a31d', name: 'Unregistered' },
        { uuid: '58d99177-15f4-4a25-9b35-222e09252387', name: 'Missing Name' },
      ],
      ...commonEventProps,
    });
  });
  it('should render contact_groups_changed event without groups added and removed', () => {
    testEventRender({
      type: 'contact_groups_changed',
      ...commonEventProps,
    });
  });
  it('should render contact_name_changed event', () => {
    testEventRender({
      type: 'contact_name_changed',
      name: 'Bobby',
      ...commonEventProps,
    });
  });
  it('should render contact_language_changed event', () => {
    testEventRender({
      type: 'contact_language_changed',
      language: 'eng',
      ...commonEventProps,
    });
  });
  it('should render contact_status_changed event', () => {
    testEventRender({
      type: 'contact_status_changed',
      status: 'blocked',
      ...commonEventProps,
    });
  });
  it('should render contact_urns_changed event', () => {
    testEventRender({
      type: 'contact_urns_changed',
      urns: ['tel:+1234567890', 'twitter:bobby'],
      ...commonEventProps,
    });
  });
  it('should render email_sent event', () => {
    testEventRender({
      type: 'email_sent',
      subject: 'Party time',
      body: 'Dear Sir/Madam',
      to: ['fun@temba.io', 'events@temba.io'],
      ...commonEventProps,
    });
  });
  it('should render email_created event', () => {
    testEventRender({
      type: 'email_created',
      subject: 'Party time',
      body: 'Dear Sir/Madam',
      addresses: ['fun@temba.io', 'events@temba.io'],
      ...commonEventProps,
    });
  });
  it('should render error event', () => {
    testEventRender({
      type: 'error',
      text: "I'm an error",
      ...commonEventProps,
    });
  });
  it('should render failure event', () => {
    testEventRender({
      type: 'failure',
      text: "I'm a failure",
      ...commonEventProps,
    });
  });
  it('should render input_labels_added event', () => {
    testEventRender({
      type: 'input_labels_added',
      labels: [
        { uuid: '3a3e061e-dad5-4454-88e4-ccbd0ef0e475', name: 'Spam' },
        { uuid: 'd749781c-bb3a-4894-81fb-683b6368b29c', name: 'Important' },
      ],
      ...commonEventProps,
    });
  });
  it('should render ivr_created event', () => {
    testEventRender({
      type: 'ivr_created',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Thanks for getting in touch',
        attachments: ['image/jpeg:http://temba.io/test.wav'],
      },
      ...commonEventProps,
    });
  });
  it('should render msg_created event', () => {
    testEventRender({
      type: 'msg_created',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Hi there',
        attachments: ['image/jpeg:http://temba.io/test.jpg'],
      },
      ...commonEventProps,
    });
  });
  it('should render msg_received event', () => {
    testEventRender({
      type: 'msg_received',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Thanks for getting in touch',
        attachments: ['image/jpeg:http://temba.io/test.jpg'],
      },
      ...commonEventProps,
    });
  });
  it('should render msg_wait event', () => {
    testEventRender({
      type: 'msg_wait',
      ...commonEventProps,
    });
  });
  it('should render resthook_called event', () => {
    testEventRender({
      type: 'resthook_called',
      resthook: 'new-registration',
      ...commonEventProps,
    });
  });
  it('should render run_result_changed event', () => {
    testEventRender({
      type: 'run_result_changed',
      name: 'Response 1',
      value: 'yes',
      ...commonEventProps,
    });
  });
  it('should render webhook_called event', () => {
    testEventRender({
      type: 'webhook_called',
      url: 'https://temba.io/webhook',
      request: 'POST /webhook HTTP/1.1\r\nHost: temba.io\r\n\r\n',
      response: 'HTTP/1.0 200 OK\r\nContent-Length: 127\r\n\r\n{"status":"ok"}',
      ...commonEventProps,
    });
  });
  it('should filter authorization from api.bothub.it requests', () => {
    testEventRender({
      type: 'webhook_called',
      url: 'https://api.bothub.it/webhook',
      request:
        'POST /webhook HTTP/1.1\r\nHost: api.bothub.it \r\nAuthorization: Bearer 123',
      response: 'HTTP/1.0 200 OK\r\nContent-Length: 127\r\n\r\n{"status":"ok"}',
      ...commonEventProps,
    });
  });
  it('should not render webhook_called event without url', () => {
    testEventRender({
      type: 'webhook_called',
      request: 'POST /webhook HTTP/1.1\r\nHost: temba.io\r\n\r\n',
      response: 'HTTP/1.0 200 OK\r\nContent-Length: 127\r\n\r\n{"status":"ok"}',
      ...commonEventProps,
    });
  });
  it('should render service_called event', () => {
    testEventRender({
      type: 'service_called',
      service: 'classifier',
      classifier: {
        uuid: 'a67d9cc0-15bb-4a92-b387-554e28726472',
        name: 'Booking (Wit)',
      },
      http_logs: [
        {
          url: 'https://api.wit.ai/message?v=20170307&q=Hi+everybody',
          request:
            'GET /message?v=20170307&q=Hi+everybody HTTP/1.1\r\nHost: api.wit.ai\r\nUser-Agent: Go-http-client/1.1\r\nAuthorization: Bearer 123456789\r\nAccept-Encoding: gzip\r\n\r\n',
          response:
            'HTTP/1.0 200 OK\r\nContent-Length: 127\r\n\r\n{"_text":"Hi everyone","entities":{"intent":[{"confidence":0.84709152161066,"value":"greeting"}]},"msg_id":"1M7fAcDWag76OmgDI"}',
        },
      ],
      ...commonEventProps,
    });
  });
  it('should not render service_called event with unknown type', () => {
    testEventRender({
      type: 'service_called',
      service: 'unknown',
      ...commonEventProps,
    });
  });
  it('should render ticket_opened event', () => {
    testEventRender({
      type: 'ticket_opened',
      ticketer: {
        uuid: '15892014-144c-4721-a611-c80b38481055',
        name: 'Email Support',
      },
      ticket: {
        topic: {
          uuid: 'ee1e36a8-dd42-4464-b6b2-37418a26db1f',
          name: 'Support',
        },
        body: 'Where are my cookies?',
      },
      result_name: 'Ticket',
      ...commonEventProps,
    });
  });
  it('should render audio msg attachments', () => {
    testEventRender({
      type: 'msg_created',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Hi there',
        attachments: ['audio/mpeg:http://temba.io/test.mp3'],
      },
      ...commonEventProps,
    });
  });
  it('should render documents msg attachments', () => {
    testEventRender({
      type: 'msg_created',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Hi there',
        attachments: ['application/pdf:http://temba.io/test.pdf'],
      },
      ...commonEventProps,
    });
  });
  it('should render geo msg attachments', () => {
    testEventRender({
      type: 'msg_created',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Hi there',
        attachments: ['geo:http://temba.io/test.geojson'],
      },
      ...commonEventProps,
    });
  });
  it('should render video msg attachments', () => {
    testEventRender({
      type: 'msg_created',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Hi there',
        attachments: ['video/mp4:http://temba.io/test.mp4'],
      },
      ...commonEventProps,
    });
  });
  it('should not render unknown attachment type', () => {
    testEventRender({
      type: 'msg_created',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Hi there',
        attachments: ['http://temba.io/test.unknown'],
      },
      ...commonEventProps,
    });
  });
  it('should not render invalid attachment type', () => {
    testEventRender({
      type: 'msg_created',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Hi there',
        attachments: ['temba.io/test.unknown'],
      },
      ...commonEventProps,
    });
  });
  it('should render msg_created event with no attachments', () => {
    testEventRender({
      type: 'msg_created',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Hi there',
      },
      ...commonEventProps,
    });
  });
  it('should not render msg_created event without text', () => {
    testEventRender({
      type: 'msg_created',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: null,
      },
      ...commonEventProps,
    });
  });
  it('should render classification event with intents and entities', () => {
    testEventRender({
      type: 'classification',
      extra: {
        intents: [
          { value: 'greeting', confidence: 0.84709152161066 },
          { value: 'goodbye', confidence: 0.123456789 },
        ],
        entities: {
          name: [
            {
              value: 'Bobby',
              confidence: 0.999999999,
            },
          ],
          age: [
            {
              value: '38',
              confidence: 0.999999999,
            },
          ],
        },
      },
      ...commonEventProps,
    });
  });
  it('should render msg_wpp_created event', () => {
    testEventRender({
      type: 'msg_wpp_created',
      style: 'whatsapp',
      msg: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        urn: 'tel:+1123456789',
        text: 'Hi there',
        attachments: ['image/jpeg:http://temba.io/test.jpg'],
      },
      ...commonEventProps,
    });
  });
  it('should render flow_entered event', () => {
    testEventRender({
      type: 'flow_entered',
      flow: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        name: 'My Flow',
      },
      ...commonEventProps,
    });
  });
  it('should render session_triggered event', () => {
    testEventRender({
      type: 'session_triggered',
      flow: {
        uuid: 'c166c2cb-290c-4805-a5af-052ad2858288',
        name: 'My Flow',
      },
      ...commonEventProps,
    });
  });
  it('should render info event', () => {
    testEventRender({
      type: 'info',
      text: 'I am informative',
      ...commonEventProps,
    });
  });
  it('should render environment_refreshed event', () => {
    testEventRender({
      type: 'environment_refreshed',
      ...commonEventProps,
    });
  });
  it('should render airtime_transferred event', () => {
    testEventRender({
      type: 'airtime_transferred',
      currency: 'USD',
      actual_amount: 10,
      recipient: 'tel:+1234567890',
      ...commonEventProps,
    });
  });
});

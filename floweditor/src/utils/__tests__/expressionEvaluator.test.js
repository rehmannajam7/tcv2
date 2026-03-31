/**
 * Tests for expression evaluation functionality
 */

import { ExpressionEvaluator } from '../expressionEvaluator';
import { excellent } from '../excellent';

describe('ExpressionEvaluator', () => {
  let evaluator;
  let parser;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
    excellent(); // Initialize the excellent function to attach Parser
    parser = new excellent.Parser('@', ['contact', 'flow', 'step', 'channel', 'date']);
  });

  describe('Contact Variables', () => {
    const contactContext = {
      contact: {
        name: 'John Doe',
        first_name: 'John',
        tel: '+1234567890',
        tel_e164: '+1234567890',
        email: 'john@example.com',
        address: '123 Main St',
        urn: 'tel:+1234567890',
        urns: ['tel:+1234567890', 'mailto:john@example.com'],
        uuid: 'contact-123',
        fields: {
          age: '30',
          city: 'New York'
        },
        groups: ['Customers', 'VIP']
      }
    };

    it('should evaluate @contact.name', () => {
      evaluator.setContext(contactContext);
      expect(evaluator.evaluate('@contact.name')).toBe('John Doe');
    });

    it('should evaluate @contact.first_name', () => {
      evaluator.setContext(contactContext);
      expect(evaluator.evaluate('@contact.first_name')).toBe('John');
    });

    it('should evaluate @contact.tel', () => {
      evaluator.setContext(contactContext);
      expect(evaluator.evaluate('@contact.tel')).toBe('+1234567890');
    });

    it('should evaluate @contact.tel_e164', () => {
      evaluator.setContext(contactContext);
      expect(evaluator.evaluate('@contact.tel_e164')).toBe('+1234567890');
    });

    it('should evaluate @contact.email', () => {
      evaluator.setContext(contactContext);
      expect(evaluator.evaluate('@contact.email')).toBe('john@example.com');
    });

    it('should evaluate @contact.address', () => {
      evaluator.setContext(contactContext);
      expect(evaluator.evaluate('@contact.address')).toBe('123 Main St');
    });

    it('should evaluate @contact.uuid', () => {
      evaluator.setContext(contactContext);
      expect(evaluator.evaluate('@contact.uuid')).toBe('contact-123');
    });

    it('should evaluate @contact.fields.age', () => {
      evaluator.setContext(contactContext);
      expect(evaluator.evaluate('@contact.fields.age')).toBe('30');
    });

    it('should evaluate @contact.fields.city', () => {
      evaluator.setContext(contactContext);
      expect(evaluator.evaluate('@contact.fields.city')).toBe('New York');
    });
  });

  describe('Flow Variables', () => {
    const flowContext = {
      flow: {
        name: 'Customer Survey',
        uuid: 'flow-456',
        'favorite_color': 'blue',
        'favorite_color.category': 'Primary Colors'
      }
    };

    it('should evaluate @flow.name', () => {
      evaluator.setContext(flowContext);
      expect(evaluator.evaluate('@flow.name')).toBe('Customer Survey');
    });

    it('should evaluate @flow.uuid', () => {
      evaluator.setContext(flowContext);
      expect(evaluator.evaluate('@flow.uuid')).toBe('flow-456');
    });

    it('should evaluate @flow.favorite_color', () => {
      evaluator.setContext(flowContext);
      expect(evaluator.evaluate('@flow.favorite_color')).toBe('blue');
    });

    it('should evaluate @flow.favorite_color.category', () => {
      evaluator.setContext(flowContext);
      expect(evaluator.evaluate('@flow.favorite_color.category')).toBe('Primary Colors');
    });
  });

  describe('Step Variables', () => {
    const stepContext = {
      step: {
        value: 'hello world',
        text: 'hello world',
        date: '2023-01-01T12:00:00Z',
        contact: {
          name: 'Jane Smith'
        }
      }
    };

    it('should evaluate @step.value', () => {
      evaluator.setContext(stepContext);
      expect(evaluator.evaluate('@step.value')).toBe('hello world');
    });

    it('should evaluate @step.text', () => {
      evaluator.setContext(stepContext);
      expect(evaluator.evaluate('@step.text')).toBe('hello world');
    });

    it('should evaluate @step.date', () => {
      evaluator.setContext(stepContext);
      expect(evaluator.evaluate('@step.date')).toBe('2023-01-01T12:00:00Z');
    });

    it('should evaluate @step.contact.name', () => {
      evaluator.setContext(stepContext);
      expect(evaluator.evaluate('@step.contact.name')).toBe('Jane Smith');
    });
  });

  describe('Date Variables', () => {
    const dateContext = {
      date: {
        today: '2023-01-01',
        now: '2023-01-01T12:00:00Z',
        yesterday: '2022-12-31',
        tomorrow: '2023-01-02'
      }
    };

    it('should evaluate @date.today', () => {
      evaluator.setContext(dateContext);
      expect(evaluator.evaluate('@date.today')).toBe('2023-01-01');
    });

    it('should evaluate @date.now', () => {
      evaluator.setContext(dateContext);
      expect(evaluator.evaluate('@date.now')).toBe('2023-01-01T12:00:00Z');
    });

    it('should evaluate @date.yesterday', () => {
      evaluator.setContext(dateContext);
      expect(evaluator.evaluate('@date.yesterday')).toBe('2022-12-31');
    });

    it('should evaluate @date.tomorrow', () => {
      evaluator.setContext(dateContext);
      expect(evaluator.evaluate('@date.tomorrow')).toBe('2023-01-02');
    });
  });

  describe('Text with Embedded Expressions', () => {
    const context = {
      contact: { name: 'John', tel: '+1234567890' },
      flow: { name: 'Survey' }
    };

    it('should evaluate text with embedded expressions', () => {
      evaluator.setContext(context);
      expect(evaluator.evaluate('Hello @contact.name, your phone is @contact.tel'))
        .toBe('Hello John, your phone is +1234567890');
    });

    it('should evaluate text with flow variables', () => {
      evaluator.setContext(context);
      expect(evaluator.evaluate('Welcome to @flow.name flow, @contact.name!'))
        .toBe('Welcome to Survey flow, John!');
    });
  });

  describe('Expression Functions', () => {
    const context = {
      contact: { name: 'john doe', age: '30' }
    };

    it('should evaluate UPPER function', () => {
      evaluator.setContext(context);
      expect(evaluator.evaluate('@(UPPER(contact.name))')).toBe('JOHN DOE');
    });

    it('should evaluate LOWER function', () => {
      evaluator.setContext(context);
      expect(evaluator.evaluate('@(LOWER("HELLO WORLD"))')).toBe('hello world');
    });

    it('should evaluate LEN function', () => {
      evaluator.setContext(context);
      expect(evaluator.evaluate('@(LEN(contact.name))')).toBe('8');
    });

    it('should evaluate MAX function', () => {
      expect(evaluator.evaluate('@(MAX(10, 20, 5))')).toBe(20);
    });

    it('should evaluate MIN function', () => {
      expect(evaluator.evaluate('@(MIN(10, 20, 5))')).toBe(5);
    });
  });

  describe('Excellent Parser Integration', () => {
    const context = {
      contact: { name: 'John Doe', tel: '+1234567890' },
      flow: { name: 'Customer Survey' }
    };

    it('should evaluate expressions through parser', () => {
      parser.setContext(context);
      expect(parser.evaluate('@contact.name')).toBe('John Doe');
      expect(parser.evaluate('@flow.name')).toBe('Customer Survey');
    });

    it('should evaluate text with expressions through parser', () => {
      parser.setContext(context);
      expect(parser.evaluateText('Hello @contact.name!')).toBe('Hello John Doe!');
    });
  });

  describe('Context Creation', () => {
    it('should create context from various data sources', () => {
      const contact = {
        name: 'John Doe',
        phone_number: '+1234567890',
        email: 'john@example.com'
      };

      const flow = { name: 'Survey', uuid: 'flow-123' };
      const step = { value: 'hello', date: '2023-01-01T12:00:00Z' };
      const channel = { name: 'SMS Channel', tel: '+1234567890' };

      const context = ExpressionEvaluator.createContext(contact, flow, step, channel);

      expect(context.contact.name).toBe('John Doe');
      expect(context.contact.tel_e164).toBe('+1234567890');
      expect(context.contact.email).toBe('john@example.com');
      expect(context.flow.name).toBe('Survey');
      expect(context.step.value).toBe('hello');
      expect(context.channel.name).toBe('SMS Channel');
      expect(context.date.today).toBeDefined();
      expect(context.date.now).toBeDefined();
    });
  });
});
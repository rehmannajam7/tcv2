import { ExpressionEvaluator } from '../expressionEvaluator';

describe('Flow Variable Expression Evaluation', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
  });

  describe('Flow Results with Categories', () => {
    it('should evaluate @flow.variable-name', () => {
      const context = {
        flow: {
          name: 'Test Flow',
          uuid: '12345',
          results: {
            'color': { value: 'red', category: 'Primary' },
            'size': { value: 'large', category: 'Big' }
          }
        }
      };
      
      evaluator.setContext(context);
      expect(evaluator.evaluate('@flow.color')).toBe('red');
      expect(evaluator.evaluate('@flow.size')).toBe('large');
    });

    it('should evaluate @flow.variable-name.category', () => {
      const context = {
        flow: {
          name: 'Test Flow',
          uuid: '12345',
          results: {
            'color': { value: 'red', category: 'Primary' },
            'size': { value: 'large', category: 'Big' }
          }
        }
      };
      
      evaluator.setContext(context);
      expect(evaluator.evaluate('@flow.color.category')).toBe('Primary');
      expect(evaluator.evaluate('@flow.size.category')).toBe('Big');
    });

    it('should evaluate @flow.name and @flow.uuid', () => {
      const context = {
        flow: {
          name: 'Customer Survey',
          uuid: '550e8400-e29b-41d4-a716-446655440000'
        }
      };
      
      evaluator.setContext(context);
      expect(evaluator.evaluate('@flow.name')).toBe('Customer Survey');
      expect(evaluator.evaluate('@flow.uuid')).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle missing flow results gracefully', () => {
      const context = {
        flow: {
          name: 'Test Flow',
          results: {
            'existing': { value: 'value1', category: 'cat1' }
          }
        }
      };
      
      evaluator.setContext(context);
      expect(evaluator.evaluate('@flow.missing')).toBe('');
      expect(evaluator.evaluate('@flow.missing.category')).toBe('');
    });

    it('should handle flow results without categories', () => {
      const context = {
        flow: {
          name: 'Test Flow',
          results: {
            'simple': { value: 'simple_value' }
          }
        }
      };
      
      evaluator.setContext(context);
      expect(evaluator.evaluate('@flow.simple')).toBe('simple_value');
      expect(evaluator.evaluate('@flow.simple.category')).toBe('');
    });
  });

  describe('Complex Flow Expressions', () => {
    it('should evaluate expressions with flow variables in text', () => {
      const context = {
        contact: { name: 'John' },
        flow: {
          name: 'Survey Flow',
          results: {
            'response': { value: 'yes', category: 'Positive' }
          }
        }
      };
      
      evaluator.setContext(context);
      expect(evaluator.evaluate('Hello @contact.name, your response was @flow.response')).toBe('Hello John, your response was yes');
      expect(evaluator.evaluate('Category: @flow.response.category')).toBe('Category: Positive');
    });

    it('should evaluate function expressions with flow variables', () => {
      const context = {
        flow: {
          results: {
            'input': { value: 'hello world', category: 'Text' }
          }
        }
      };
      
      evaluator.setContext(context);
      expect(evaluator.evaluate('@(UPPER(@flow.input))')).toBe('HELLO WORLD');
      expect(evaluator.evaluate('@(LOWER(@flow.input))')).toBe('hello world');
    });

    it('should evaluate arithmetic expressions with flow variables', () => {
      const context = {
        flow: {
          results: {
            'score': { value: '85', category: 'High' },
            'bonus': { value: '15', category: 'Extra' }
          }
        }
      };
      
      evaluator.setContext(context);
      expect(evaluator.evaluate('@(1 + 1)')).toBe(2);
      expect(evaluator.evaluate('@(5 * 3)')).toBe(15);
    });
  });

  describe('Integration with Contact Variables', () => {
    it('should evaluate mixed contact and flow variables', () => {
      const context = {
        contact: {
          name: 'Alice Smith',
          tel: '+1234567890',
          email: 'alice@example.com'
        },
        flow: {
          name: 'Registration Flow',
          results: {
            'status': { value: 'completed', category: 'Success' },
            'score': { value: '95', category: 'Excellent' }
          }
        }
      };
      
      evaluator.setContext(context);
      expect(evaluator.evaluate('@contact.name has @flow.status the @flow.name')).toBe('Alice Smith has completed the Registration Flow');
      expect(evaluator.evaluate('Score: @flow.score (@flow.score.category)')).toBe('Score: 95 (Excellent)');
    });
  });

  describe('Context Creation', () => {
    it('should create context with flow results properly', () => {
      const contact = { name: 'Bob' };
      const flow = {
        name: 'Test Flow',
        uuid: '12345',
        results: {
          'choice': { value: 'option1', category: 'Selected' }
        }
      };
      
      const context = ExpressionEvaluator.createContext(contact, flow);
      evaluator.setContext(context);
      
      expect(evaluator.evaluate('@flow.choice')).toBe('option1');
      expect(evaluator.evaluate('@flow.choice.category')).toBe('Selected');
      expect(evaluator.evaluate('@flow.name')).toBe('Test Flow');
    });
  });
});
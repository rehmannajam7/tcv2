import { ExpressionEvaluator } from '../expressionEvaluator';

describe('Step Variables', () => {
  it('should resolve step variables correctly', () => {
    const evaluator = new ExpressionEvaluator();
    
    const step = {
      value: 'yes',
      text: 'User responded with yes',
      date: '2025-11-17T10:30:00Z',
      contact: {
        name: 'John Doe',
        phone: '+1234567890'
      }
    };
    
    const context = ExpressionEvaluator.createContext({}, {}, step);
    evaluator.setContext(context);
    
    // Test basic step variables
    expect(evaluator.evaluate('@step.value')).toBe('yes');
    expect(evaluator.evaluate('@step.text')).toBe('User responded with yes');
    expect(evaluator.evaluate('@step.date')).toBe('2025-11-17T10:30:00Z');
    
    // Test step contact variables
    expect(evaluator.evaluate('@step.contact.name')).toBe('John Doe');
    expect(evaluator.evaluate('@step.contact.phone')).toBe('+1234567890');
  });

  it('should handle step variables in text expressions', () => {
    const evaluator = new ExpressionEvaluator();
    
    const step = {
      value: 'hello world',
      text: 'User said hello world'
    };
    
    const context = ExpressionEvaluator.createContext({}, {}, step);
    evaluator.setContext(context);
    
    // Test embedded expressions
    expect(evaluator.evaluate('You said: @step.value')).toBe('You said: hello world');
    expect(evaluator.evaluate('Text: @step.text')).toBe('Text: User said hello world');
  });

  it('should handle missing step variables gracefully', () => {
    const evaluator = new ExpressionEvaluator();
    
    const step = {
      value: 'test'
    };
    
    const context = ExpressionEvaluator.createContext({}, {}, step);
    evaluator.setContext(context);
    
    // Test missing step variables
    expect(evaluator.evaluate('@step.missing')).toBe('');
    expect(evaluator.evaluate('@step.contact.missing')).toBe('');
  });
});
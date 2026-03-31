import { ExpressionEvaluator } from '../expressionEvaluator';

describe('Channel Variables', () => {
  it('should resolve channel variables correctly', () => {
    const evaluator = new ExpressionEvaluator();
    
    const channel = {
      name: 'WhatsApp Channel',
      uuid: '12345-67890',
      address: '1234567890',
      tel: '+1234567890'
    };
    
    const context = ExpressionEvaluator.createContext({}, {}, {}, channel);
    evaluator.setContext(context);
    
    // Test basic channel variables
    expect(evaluator.evaluate('@channel.name')).toBe('WhatsApp Channel');
    expect(evaluator.evaluate('@channel.uuid')).toBe('12345-67890');
    expect(evaluator.evaluate('@channel.address')).toBe('1234567890');
    expect(evaluator.evaluate('@channel.tel')).toBe('+1234567890');
  });

  it('should handle channel variables in text expressions', () => {
    const evaluator = new ExpressionEvaluator();
    
    const channel = {
      name: 'SMS Channel',
      tel: '+9876543210'
    };
    
    const context = ExpressionEvaluator.createContext({}, {}, {}, channel);
    evaluator.setContext(context);
    
    // Test embedded expressions
    expect(evaluator.evaluate('Channel: @channel.name')).toBe('Channel: SMS Channel');
    expect(evaluator.evaluate('Phone: @channel.tel')).toBe('Phone: +9876543210');
  });

  it('should handle missing channel variables gracefully', () => {
    const evaluator = new ExpressionEvaluator();
    
    const channel = {
      name: 'Test Channel'
    };
    
    const context = ExpressionEvaluator.createContext({}, {}, {}, channel);
    evaluator.setContext(context);
    
    // Test missing channel variables
    expect(evaluator.evaluate('@channel.missing')).toBe('');
    expect(evaluator.evaluate('@channel.uuid')).toBe('');
  });

  it('should handle empty channel context', () => {
    const evaluator = new ExpressionEvaluator();
    
    const context = ExpressionEvaluator.createContext();
    evaluator.setContext(context);
    
    // Test with empty channel context
    expect(evaluator.evaluate('@channel.name')).toBe('');
    expect(evaluator.evaluate('@channel.uuid')).toBe('');
    expect(evaluator.evaluate('@channel.address')).toBe('');
    expect(evaluator.evaluate('@channel.tel')).toBe('');
  });
});
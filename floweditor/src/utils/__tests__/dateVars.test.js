import { ExpressionEvaluator } from '../expressionEvaluator';

describe('Date Variables', () => {
  it('should resolve date variables correctly', () => {
    const evaluator = new ExpressionEvaluator();
    
    // Create context with specific date values
    const dateContext = {
      today: '2025-11-17',
      now: '2025-11-17T10:30:00.000Z',
      yesterday: '2025-11-16',
      tomorrow: '2025-11-18'
    };
    
    const context = ExpressionEvaluator.createContext({}, {}, {}, {}, dateContext);
    evaluator.setContext(context);
    
    // Test basic date variables
    expect(evaluator.evaluate('@date.today')).toBe('2025-11-17');
    expect(evaluator.evaluate('@date.now')).toBe('2025-11-17T10:30:00.000Z');
    expect(evaluator.evaluate('@date.yesterday')).toBe('2025-11-16');
    expect(evaluator.evaluate('@date.tomorrow')).toBe('2025-11-18');
  });

  it('should handle date variables in text expressions', () => {
    const evaluator = new ExpressionEvaluator();
    
    const dateContext = {
      today: '2025-11-17',
      tomorrow: '2025-11-18'
    };
    
    const context = ExpressionEvaluator.createContext({}, {}, {}, {}, dateContext);
    evaluator.setContext(context);
    
    // Test embedded expressions
    expect(evaluator.evaluate('Today is @date.today')).toBe('Today is 2025-11-17');
    expect(evaluator.evaluate('Tomorrow is @date.tomorrow')).toBe('Tomorrow is 2025-11-18');
  });

  it('should handle missing date variables gracefully', () => {
    const evaluator = new ExpressionEvaluator();
    
    const dateContext = {
      today: '2025-11-17'
    };
    
    const context = ExpressionEvaluator.createContext({}, {}, {}, {}, dateContext);
    evaluator.setContext(context);
    
    // Test missing date variables - missing ones should return empty string
    expect(evaluator.evaluate('@date.missing')).toBe('');
    // Note: @date.now gets a default value even when not provided in context
    expect(evaluator.evaluate('@date.now')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); // ISO format
  });

  it('should use current date when no date context provided', () => {
    const evaluator = new ExpressionEvaluator();
    
    // Create context without date values to test defaults
    const context = ExpressionEvaluator.createContext();
    evaluator.setContext(context);
    
    // Test that defaults are provided
    expect(evaluator.evaluate('@date.today')).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    expect(evaluator.evaluate('@date.now')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); // ISO format
    expect(evaluator.evaluate('@date.yesterday')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(evaluator.evaluate('@date.tomorrow')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should calculate relative dates correctly', () => {
    const evaluator = new ExpressionEvaluator();
    
    // Create context with a specific date to test relative calculations
    const dateContext = {
      today: '2025-11-17'
    };
    
    const context = ExpressionEvaluator.createContext({}, {}, {}, {}, dateContext);
    evaluator.setContext(context);
    
    // Test that yesterday and tomorrow are calculated correctly relative to today
    expect(evaluator.evaluate('@date.yesterday')).toBe('2025-11-16');
    expect(evaluator.evaluate('@date.tomorrow')).toBe('2025-11-18');
  });
});
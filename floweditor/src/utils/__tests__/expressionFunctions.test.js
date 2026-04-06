import { ExpressionEvaluator } from '../expressionEvaluator';

describe('Expression Functions', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
  });

  describe('Text Functions', () => {
    it('should handle UPPER function', () => {
      expect(evaluator.evaluate('@(UPPER("hello world"))')).toBe('HELLO WORLD');
    });

    it('should handle LOWER function', () => {
      expect(evaluator.evaluate('@(LOWER("HELLO WORLD"))')).toBe('hello world');
    });

    it('should handle PROPER function', () => {
      expect(evaluator.evaluate('@(PROPER("john doe"))')).toBe('John Doe');
    });

    it('should handle TRIM function', () => {
      expect(evaluator.evaluate('@(TRIM("  hello world  "))')).toBe('hello world');
    });

    it('should handle SUBSTITUTE function', () => {
      expect(evaluator.evaluate('@(SUBSTITUTE("hello world", "world", "universe"))')).toBe('hello universe');
    });

    it('should handle FIND function', () => {
      expect(evaluator.evaluate('@(FIND("world", "hello world"))')).toBe(7);
    });

    it('should handle SEARCH function (case-insensitive)', () => {
      expect(evaluator.evaluate('@(SEARCH("WORLD", "hello world"))')).toBe(7);
    });

    it('should handle LEN function', () => {
      expect(evaluator.evaluate('@(LEN("hello"))')).toBe(5);
    });

    it('should handle LEFT function', () => {
      expect(evaluator.evaluate('@(LEFT("hello world", 5))')).toBe('hello');
    });

    it('should handle RIGHT function', () => {
      expect(evaluator.evaluate('@(RIGHT("hello world", 5))')).toBe('world');
    });

    it('should handle MID function', () => {
      expect(evaluator.evaluate('@(MID("hello world", 7, 5))')).toBe('world');
    });

    it('should handle CONCATENATE function', () => {
      expect(evaluator.evaluate('@(CONCATENATE("hello", " ", "world"))')).toBe('hello world');
    });

    it('should handle TEXT function', () => {
      expect(evaluator.evaluate('@(TEXT(123.456, "0.00"))')).toBe('123.46');
    });

    it('should handle VALUE function', () => {
      expect(evaluator.evaluate('@(VALUE("$123.45"))')).toBe(123.45);
    });
  });

  describe('Date Functions', () => {
    it('should handle DATE function', () => {
      expect(evaluator.evaluate('@(DATE(2023, 12, 25))')).toBe('2023-12-25');
    });

    it('should handle DATEVALUE function', () => {
      expect(evaluator.evaluate('@(DATEVALUE("2023-12-25"))')).toBe('2023-12-25');
    });

    it('should handle DAY function', () => {
      expect(evaluator.evaluate('@(DAY("2023-12-25"))')).toBe(25);
    });

    it('should handle EDATE function', () => {
      expect(evaluator.evaluate('@(EDATE("2023-12-25", 1))')).toBe('2024-01-25');
    });

    it('should handle HOUR function', () => {
      const testDate = '2023-12-25T14:30:00Z';
      expect(evaluator.evaluate(`@(HOUR("${testDate}"))`)).toBe(14);
    });

    it('should handle MINUTE function', () => {
      const testDate = '2023-12-25T14:30:00Z';
      expect(evaluator.evaluate(`@(MINUTE("${testDate}"))`)).toBe(30);
    });

    it('should handle MONTH function', () => {
      expect(evaluator.evaluate('@(MONTH("2023-12-25"))')).toBe(12);
    });

    it('should handle YEAR function', () => {
      expect(evaluator.evaluate('@(YEAR("2023-12-25"))')).toBe(2023);
    });
  });

  describe('Math Functions', () => {
    it('should handle MAX function', () => {
      expect(evaluator.evaluate('@(MAX(1, 5, 3, 9, 2))')).toBe(9);
    });

    it('should handle MIN function', () => {
      expect(evaluator.evaluate('@(MIN(1, 5, 3, 9, 2))')).toBe(1);
    });

    it('should handle ABS function', () => {
      expect(evaluator.evaluate('@(ABS(-5))')).toBe(5);
    });

    it('should handle ROUND function', () => {
      expect(evaluator.evaluate('@(ROUND(3.14159, 2))')).toBe('3.14');
    });
  });

  describe('Logical Functions', () => {
    it('should handle IF function with true condition', () => {
      expect(evaluator.evaluate('@(IF(5 > 3, "yes", "no"))')).toBe('yes');
    });

    it('should handle IF function with false condition', () => {
      expect(evaluator.evaluate('@(IF(3 > 5, "yes", "no"))')).toBe('no');
    });

    it('should handle AND function', () => {
      expect(evaluator.evaluate('@(AND(5 > 3, 2 < 4))')).toBe(true);
      expect(evaluator.evaluate('@(AND(5 > 3, 2 > 4))')).toBe(false);
    });

    it('should handle OR function', () => {
      expect(evaluator.evaluate('@(OR(5 > 3, 2 > 4))')).toBe(true);
      expect(evaluator.evaluate('@(OR(5 < 3, 2 > 4))')).toBe(false);
    });

    it('should handle NOT function', () => {
      expect(evaluator.evaluate('@(NOT(5 > 3))')).toBe(false);
      expect(evaluator.evaluate('@(NOT(3 > 5))')).toBe(true);
    });
  });

  describe('Functions with Variables', () => {
    it('should handle functions with variable references', () => {
      const context = ExpressionEvaluator.createContext(
        { name: 'John Doe', age: 30 },
        { result: 'pass' },
        { value: 'hello world' }
      );
      evaluator.setContext(context);

      expect(evaluator.evaluate('@(UPPER(@contact.name))')).toBe('JOHN DOE');
      expect(evaluator.evaluate('@(LEN(@step.value))')).toBe(11);
      expect(evaluator.evaluate('@(IF(@contact.age > 25, "adult", "young"))')).toBe('adult');
    });
  });
});
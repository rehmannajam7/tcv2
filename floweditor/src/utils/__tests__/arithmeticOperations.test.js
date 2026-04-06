import { ExpressionEvaluator } from '../expressionEvaluator.js';

describe('Arithmetic Operations', () => {
  let evaluator;

  beforeEach(() => {
    const context = {
      contact: {
        age: '30',
        height: '175.5',
        weight: '70'
      },
      flow: {
        quantity: '10',
        price: '25.50',
        discount: '5'
      }
    };
    evaluator = new ExpressionEvaluator(context);
  });

  describe('Basic Arithmetic Operations', () => {
    test('should evaluate simple addition', () => {
      expect(evaluator.evaluate('5 + 3')).toBe(8);
      expect(evaluator.evaluate('10 + 15')).toBe(25);
    });

    test('should evaluate simple subtraction', () => {
      expect(evaluator.evaluate('10 - 3')).toBe(7);
      expect(evaluator.evaluate('25 - 15')).toBe(10);
    });

    test('should evaluate simple multiplication', () => {
      expect(evaluator.evaluate('4 * 3')).toBe(12);
      expect(evaluator.evaluate('7 * 8')).toBe(56);
    });

    test('should evaluate simple division', () => {
      expect(evaluator.evaluate('12 / 3')).toBe(4);
      expect(evaluator.evaluate('20 / 4')).toBe(5);
    });

    test('should evaluate exponentiation', () => {
      expect(evaluator.evaluate('2 ^ 3')).toBe(8);
      expect(evaluator.evaluate('5 ^ 2')).toBe(25);
    });
  });

  describe('Arithmetic with Variables', () => {
    test('should evaluate addition with contact variables', () => {
      expect(evaluator.evaluate('@contact.age + 5')).toBe(35);
      expect(evaluator.evaluate('10 + @contact.age')).toBe(40);
    });

    test('should evaluate subtraction with flow variables', () => {
      expect(evaluator.evaluate('@flow.quantity - 3')).toBe(7);
      expect(evaluator.evaluate('20 - @flow.quantity')).toBe(10);
    });

    test('should evaluate multiplication with variables', () => {
      expect(evaluator.evaluate('@flow.quantity * 2')).toBe(20);
      expect(evaluator.evaluate('3 * @flow.quantity')).toBe(30);
    });

    test('should evaluate division with variables', () => {
      expect(evaluator.evaluate('@flow.quantity / 2')).toBe(5);
      expect(evaluator.evaluate('100 / @flow.quantity')).toBe(10);
    });

    test('should evaluate expressions with decimal numbers', () => {
      expect(evaluator.evaluate('@contact.height + 10')).toBe(185.5);
      expect(evaluator.evaluate('@flow.price * 2')).toBe(51);
    });
  });

  describe('Complex Arithmetic Expressions', () => {
    test('should evaluate expressions with parentheses', () => {
      expect(evaluator.evaluate('(5 + 3) * 2')).toBe(16);
      expect(evaluator.evaluate('10 / (2 + 3)')).toBe(2);
    });

    test('should evaluate expressions with multiple operations', () => {
      expect(evaluator.evaluate('5 + 3 * 2')).toBe(11); // 5 + 6
      expect(evaluator.evaluate('10 - 2 + 3')).toBe(11);
      expect(evaluator.evaluate('2 * 3 + 4 * 5')).toBe(26); // 6 + 20
    });

    test('should evaluate expressions with variables and parentheses', () => {
      expect(evaluator.evaluate('(@contact.age + 5) * 2')).toBe(70);
      expect(evaluator.evaluate('@flow.quantity * (@flow.price - @flow.discount)')).toBe(205); // 10 * (25.5 - 5) = 10 * 20.5 = 205
    });

    test('should handle order of operations correctly', () => {
      expect(evaluator.evaluate('2 + 3 * 4')).toBe(14); // 2 + 12
      expect(evaluator.evaluate('(2 + 3) * 4')).toBe(20);
      expect(evaluator.evaluate('2 ^ 3 + 1')).toBe(9); // 8 + 1
    });
  });

  describe('Arithmetic in Function Expressions', () => {
    test('should evaluate arithmetic within function calls', () => {
      expect(evaluator.evaluate('@(UPPER("result: " & (@contact.age + 5)))')).toBe('RESULT: 35');
      expect(evaluator.evaluate('@(TEXT(@flow.quantity * 2))')).toBe('20');
    });

    test('should evaluate arithmetic in IF conditions', () => {
      expect(evaluator.evaluate('@(IF(@contact.age + 5 > 30, "older", "younger"))')).toBe('older');
      expect(evaluator.evaluate('@(IF(@flow.quantity * 2 = 20, "double", "not double"))')).toBe('double');
    });
  });

  describe('Error Handling', () => {
    test('should return 0 for invalid arithmetic expressions', () => {
      expect(evaluator.evaluate('5 / 0')).toBe(0);
      expect(evaluator.evaluate('invalid + 5')).toBe(0);
    });

    test('should handle missing variables gracefully', () => {
      expect(evaluator.evaluate('@contact.missing + 5')).toBe(5);
      expect(evaluator.evaluate('5 + @flow.nonexistent')).toBe(5);
    });
  });

  describe('Real-world Scenarios', () => {
    test('should calculate total price with discount', () => {
      expect(evaluator.evaluate('@flow.quantity * (@flow.price - @flow.discount)')).toBe(205);
    });

    test('should calculate age difference', () => {
      expect(evaluator.evaluate('@contact.age - 25')).toBe(5);
    });

    test('should calculate BMI (Body Mass Index)', () => {
      // BMI = weight / (height/100)^2
      expect(evaluator.evaluate('@contact.weight / ((@contact.height / 100) ^ 2)')).toBeCloseTo(22.7, 1);
    });

    test('should calculate compound interest', () => {
      // Simple compound: principal * (1 + rate)^time
      expect(evaluator.evaluate('1000 * (1 + 0.05) ^ 2')).toBeCloseTo(1102.5, 1);
    });
  });
});
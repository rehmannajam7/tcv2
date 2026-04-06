import ExcellentParser from 'components/form/textinput/ExcellentParser';

const parser = new ExcellentParser('@', [
  'channel',
  'child',
  'parent',
  'contact',
  'date',
  'extra',
  'flow',
  'step',
]);

describe(ExcellentParser.name, () => {
  describe('expression context', () => {
    it('extracts expressions', () => {
      expect(parser.expressionContext('this @contact.na')).toBe('contact.na');
      expect(parser.expressionContext('@contact.begin')).toBe('contact.begin');
    });

    it('ignores complete expressions', () => {
      expect(
        parser.expressionContext('you have @(max(contact.balance, 50))'),
      ).toBeNull();
      expect(
        parser.expressionContext('Hi @contact.name, how are you?'),
      ).toBeNull();
    });

    it('identifies last incomplete expression', () => {
      expect(
        parser.expressionContext('this @contact.name is @contact.age'),
      ).toBe('contact.age');
    });

    it('identifies open functions', () => {
      expect(
        parser.expressionContext('you have @(max(contact.balance, 50)'),
      ).toBe('(max(contact.balance, 50)');
    });

    it('requires expression character', () => {
      expect(parser.expressionContext('contact.begin')).toBeNull();
    });

    it('handles string literals', () => {
      expect(parser.expressionContext('"this @contact.name"')).toBeNull();
    });

    it('handles empty string literals', () => {
      expect(parser.expressionContext('@("")')).toBeNull();
    });

    it('handles ignores multiple expression prefixes', () => {
      expect(parser.expressionContext('this @@contact.name')).toBeNull();
    });
  });

  describe('autoComplete context', () => {
    it('extracts autoComplete context', () => {
      expect(parser.autoCompleteContext('this @contac')).toBe('contac');
      expect(parser.autoCompleteContext('@contact.begin')).toBe(
        'contact.begin',
      );
    });

    it('should handle incomplete string literals', () => {
      expect(parser.autoCompleteContext('"this @contac')).toBeNull();
    });

    it('should handle functions', () => {
      expect(parser.autoCompleteContext('this @(max(min(10, 1)')).toBe('#max');
    });

    it('should handle functions 2', () => {
      expect(parser.autoCompleteContext('this @(max(min(10,')).toBe('#min');
    });

    it('should handle functions with string literals', () => {
      expect(
        parser.autoCompleteContext('This @(max(min("im not a number",'),
      ).toBe('#min');
    });
  });

  describe('function context', () => {
    it('extracts function context', () => {
      expect(parser.functionContext('@(max(min(1, 0), 0')).toBe('max');
    });

    it('ignores incomplete functions', () => {
      expect(parser.functionContext('@')).toBe('');
    });

    it('handles string literals', () => {
      expect(parser.functionContext('@(max(min("im not a number"')).toBe('min');
    });

    it('handles incomplete string literals', () => {
      expect(parser.functionContext('@(max(min("im not a number')).toBe('min');
    });

    it('handles nested functions', () => {
      expect(parser.functionContext('@(max(')).toBe('max');
    });

    it('handles empty text', () => {
      expect(parser.functionContext('')).toBe('');
    });
  });

  describe('getContactFields', () => {
    it('returns contact fields', () => {
      expect(parser.getContactFields('@contact.fields.name')).toEqual(['name']);
    });

    it('returns multiple contact fields', () => {
      expect(
        parser.getContactFields('@contact.fields.name and @contact.fields.age'),
      ).toEqual(['name', 'age']);
    });

    it('returns empty array for non-contact fields', () => {
      expect(parser.getContactFields('@contact')).toEqual([]);
    });

    it('ignores webhook expressions', () => {
      expect(
        parser.getContactFields(
          '@contact.fields.name and @contact.fields.webhook',
        ),
      ).toEqual(['name']);
    });
  });

  describe('standalone @ symbol handling', () => {
    it('detects standalone @ as partial expression', () => {
      const expressions = parser.findExpressions('@');
      expect(expressions.length).toBe(1);
      expect(expressions[0].text).toBe('@');
      expect(expressions[0].closed).toBe(false);
    });

    it('returns expression context for standalone @', () => {
      expect(parser.expressionContext('@')).toBeNull();
    });
  });
});

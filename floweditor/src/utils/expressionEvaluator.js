/**
 * Expression evaluator for RapidPro-compliant expressions
 * Resolves variables like @contact.name, @flow.variable-name, etc. to actual values
 */

export class ExpressionEvaluator {
  constructor(context = {}) {
    this.context = context;
    this.setupDefaultFunctions();
  }

  /**
   * Set up default expression functions
   */
  setupDefaultFunctions() {
    this.functions = {
      // Text functions
      UPPER: text => String(text).toUpperCase(),
      LOWER: text => String(text).toLowerCase(),
      PROPER: text =>
        String(text).replace(
          /\w\S*/g,
          txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
        ),
      TRIM: text => String(text).trim(),
      SUBSTITUTE: (text, old_text, new_text, instance_num) => {
        const str = String(text);
        const old = String(old_text);
        const newStr = String(new_text);

        if (instance_num) {
          // Replace specific instance
          const index = Number(instance_num) - 1;
          const parts = str.split(old);
          if (index >= 0 && index < parts.length - 1) {
            parts[index] = parts[index] + newStr + parts[index + 1];
            parts.splice(index + 1, 1);
          }
          return parts.join(old);
        } else {
          // Replace all occurrences
          return str.split(old).join(newStr);
        }
      },
      FIND: (find_text, within_text, start_num) => {
        const find = String(find_text);
        const within = String(within_text);
        const start = start_num ? Number(start_num) - 1 : 0;
        const index = within.indexOf(find, start);
        return index === -1 ? -1 : index + 1; // Excel uses 1-based indexing
      },
      SEARCH: (find_text, within_text, start_num) => {
        const find = String(find_text).toLowerCase();
        const within = String(within_text).toLowerCase();
        const start = start_num ? Number(start_num) - 1 : 0;
        const index = within.indexOf(find, start);
        return index === -1 ? -1 : index + 1; // Excel uses 1-based indexing
      },
      LEN: text => String(String(text).length),

      // Date functions
      TODAY: () => {
        const now = new Date();
        return now.toISOString().split('T')[0];
      },

      NOW: () => new Date().toISOString(),

      DATE: (year, month, day) => {
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        return date.toISOString().split('T')[0];
      },

      DATEVALUE: text => {
        const date = new Date(String(text));
        return date.toISOString().split('T')[0];
      },

      DAY: date => {
        const d = new Date(String(date));
        return d.getDate();
      },

      EDATE: (date, months) => {
        const d = new Date(String(date));
        d.setMonth(d.getMonth() + Number(months));
        return d.toISOString().split('T')[0];
      },

      HOUR: datetime => {
        const d = new Date(String(datetime));
        return d.getHours();
      },

      MINUTE: datetime => {
        const d = new Date(String(datetime));
        return d.getMinutes();
      },

      MONTH: date => {
        const d = new Date(String(date));
        return d.getMonth() + 1; // Excel uses 1-based months
      },

      YEAR: date => {
        const d = new Date(String(date));
        return d.getFullYear();
      },

      // Math functions
      MAX: (...args) => Math.max(...args.map(Number)),
      MIN: (...args) => Math.min(...args.map(Number)),
      ABS: num => Math.abs(Number(num)),
      ROUND: (num, digits = 0) => Number(num).toFixed(digits),

      // String functions
      LEFT: (text, num_chars) => String(text).substring(0, Number(num_chars)),
      RIGHT: (text, num_chars) =>
        String(text).substring(String(text).length - Number(num_chars)),
      MID: (text, start_num, num_chars) => {
        const str = String(text);
        const start = Number(start_num) - 1;
        const length = Number(num_chars);
        return str.substring(start, start + length);
      },
      CONCATENATE: (...args) => args.map(String).join(''),
      TEXT: (value, format) => {
        // Simple text formatting - can be expanded
        const val = Number(value);
        if (format === '0') return Math.round(val).toString();
        if (format === '0.00') return val.toFixed(2);
        if (format === '0.0') return val.toFixed(1);
        return String(value);
      },
      VALUE: text => {
        const num = Number(String(text).replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
      },

      // Logical functions
      IF: (condition, true_value, false_value) => {
        return this.evaluateCondition(condition) ? true_value : false_value;
      },
      AND: (...args) => args.every(arg => this.evaluateCondition(arg)),
      OR: (...args) => args.some(arg => this.evaluateCondition(arg)),
      NOT: logical => !this.evaluateCondition(logical),

      // Contact functions
      PHONE: contact => {
        // Extract phone number from contact URN
        if (contact && contact.urns && contact.urns.length > 0) {
          const telUrn = contact.urns.find(urn => urn.startsWith('tel:'));
          if (telUrn) {
            return telUrn.replace('tel:', '');
          }
        }
        return '';
      },
    };
  }

  /**
   * Set context data for variable resolution
   */
  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Evaluate a complete expression string
   */
  evaluate(expression) {
    if (!expression || typeof expression !== 'string') {
      return expression;
    }

    // Handle @(function calls) format
    if (expression.startsWith('@(') && expression.endsWith(')')) {
      const functionBody = expression.substring(2, expression.length - 1);
      return this.evaluateFunctionExpression(functionBody);
    }

    // Check if it's an arithmetic expression (before simple variable check)
    if (this.isArithmeticExpression(expression)) {
      return this.evaluateArithmeticExpression(expression);
    }

    // Handle @variable format
    if (expression.startsWith('@')) {
      const variablePath = expression.substring(1);
      return this.resolveVariable(variablePath);
    }

    // Handle regular text with embedded expressions
    return this.evaluateTextWithExpressions(expression);
  }

  /**
   * Evaluate function expressions like @(UPPER(contact.name))
   */
  evaluateFunctionExpression(functionBody) {
    try {
      // Handle IF function specially to parse condition properly
      const ifMatch = functionBody.match(
        /^IF\s*\(([^,]+),\s*([^,]+),\s*([^)]+)\)$/i,
      );
      if (ifMatch) {
        const condition = ifMatch[1].trim();
        const trueValue = ifMatch[2].trim();
        const falseValue = ifMatch[3].trim();

        // Evaluate condition with variable resolution
        const conditionResult = this.evaluateCondition(condition);

        // Resolve true/false values if they are variables
        const trueResult = trueValue.startsWith('@')
          ? this.resolveVariable(trueValue.substring(1))
          : trueValue.startsWith('"') && trueValue.endsWith('"')
          ? trueValue.slice(1, -1)
          : trueValue;
        const falseResult = falseValue.startsWith('@')
          ? this.resolveVariable(falseValue.substring(1))
          : falseValue.startsWith('"') && falseValue.endsWith('"')
          ? falseValue.slice(1, -1)
          : falseValue;

        return conditionResult ? trueResult : falseResult;
      }

      // Simple function parsing - in a real implementation this would be more sophisticated
      const functionMatch = functionBody.match(/^(\w+)\s*\((.*)\)$/);
      if (functionMatch) {
        const functionName = functionMatch[1].toUpperCase();
        const argsString = functionMatch[2];

        if (this.functions[functionName]) {
          // Parse arguments (simple comma separation for now)
          const args = this.parseFunctionArguments(argsString);
          return this.functions[functionName](...args);
        }
      }

      // If not a function, try to evaluate as arithmetic expression
      return this.evaluateArithmeticExpression(functionBody);
    } catch (error) {
      console.warn(
        'Error evaluating function expression:',
        functionBody,
        error,
      );
      return functionBody;
    }
  }

  /**
   * Parse function arguments from a string
   */
  parseFunctionArguments(argsString) {
    const args = [];
    let currentArg = '';
    let inQuotes = false;
    let parenthesesDepth = 0;

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (char === '"' && argsString[i - 1] !== '\\') {
        inQuotes = !inQuotes;
      }

      if (!inQuotes) {
        if (char === '(') parenthesesDepth++;
        if (char === ')') parenthesesDepth--;

        if (char === ',' && parenthesesDepth === 0) {
          args.push(this.evaluateArgument(currentArg.trim()));
          currentArg = '';
          continue;
        }
      }

      currentArg += char;
    }

    if (currentArg.trim()) {
      args.push(this.evaluateArgument(currentArg.trim()));
    }

    return args;
  }

  /**
   * Evaluate a single function argument
   */
  evaluateArgument(arg) {
    // Remove surrounding quotes if present
    if (arg.startsWith('"') && arg.endsWith('"')) {
      return arg.slice(1, -1);
    }

    // Check if it's an arithmetic expression (including string concatenation with &) first
    if (this.isArithmeticExpression(arg) || arg.includes('&')) {
      return this.evaluateArithmeticExpression(arg);
    }

    // If it's a variable reference, resolve it
    if (arg.startsWith('@')) {
      return this.resolveVariable(arg.substring(1));
    }

    // If it looks like a variable path (contains dots), resolve it as a variable
    if (arg.includes('.') && !arg.includes(' ')) {
      return this.resolveVariable(arg);
    }

    // If it's a number, convert it
    if (!isNaN(arg)) {
      return Number(arg);
    }

    // Otherwise return as string
    return arg;
  }

  /**
   * Evaluate arithmetic expressions
   */
  evaluateArithmeticExpression(expression) {
    try {
      // Handle string concatenation with & operator first
      if (expression.includes('&')) {
        return this.evaluateStringConcatenation(expression);
      }

      // Replace variable references with their values
      let processedExpression = expression.replace(/@\w+(\.\w+)*/g, match => {
        const variablePath = match.substring(1);
        const value = this.resolveVariable(variablePath);
        return typeof value === 'string' && !isNaN(Number(value))
          ? Number(value)
          : typeof value === 'number'
          ? value
          : 0;
      });

      // Replace ^ with ** for exponentiation
      processedExpression = processedExpression.replace(/\^/g, '**');

      // Check for division by zero
      if (processedExpression.includes('/0')) {
        return 0;
      }

      // Evaluate the arithmetic expression
      const result = Function(
        '"use strict"; return (' + processedExpression + ')',
      )();

      // Handle Infinity and NaN results
      if (!isFinite(result)) {
        return 0;
      }

      return result;
    } catch (error) {
      console.warn(
        'Error evaluating arithmetic expression:',
        expression,
        error,
      );
      return 0;
    }
  }

  /**
   * Resolve a variable path like "contact.name" to its actual value
   */
  resolveVariable(variablePath) {
    // Handle cases where the key itself contains dots (e.g., "favorite_color.category")
    // by trying progressively longer paths first, then falling back to split logic
    const parts = variablePath.split('.');

    // Debug logging
    console.log('Resolving variable path:', variablePath);
    console.log('Context available:', Object.keys(this.context));
    console.log('Flow object:', this.context.flow);

    // Try progressively longer paths first
    for (let i = parts.length; i > 0; i--) {
      const pathToTry = parts.slice(0, i).join('.');
      console.log('Trying path:', pathToTry);

      // Navigate to the parent context
      let current = this.context;
      let found = true;

      // Navigate through the parts to get to the parent object
      for (let j = 0; j < parts.length - i; j++) {
        const part = parts[j];
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          found = false;
          break;
        }
      }

      if (found && current && typeof current === 'object') {
        // Check if the remaining path exists as a key in the current object
        const remainingPath = parts.slice(parts.length - i).join('.');
        console.log(
          'Checking for remaining path:',
          remainingPath,
          'in current object keys:',
          Object.keys(current),
        );
        if (remainingPath in current) {
          const value = current[remainingPath];
          const result =
            value !== undefined && value !== null ? String(value) : '';
          console.log(
            'Found with progressive path:',
            remainingPath,
            'value:',
            result,
          );
          return result;
        }
      }
    }

    // If no progressive path worked, try the traditional split approach
    let current = this.context;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      console.log(
        'Looking for part:',
        part,
        'in',
        current ? Object.keys(current) : 'null',
      );

      if (current && typeof current === 'object' && part in current) {
        current = current[part];
        console.log('Found part:', part, 'value:', current);
      } else {
        console.log('Part not found:', part);
        return ''; // Return empty string if variable not found
      }
    }

    const result =
      current !== undefined && current !== null ? String(current) : '';
    console.log('Final result:', result);
    return result;
  }

  /**
   * Evaluate text with embedded expressions like "Hello @contact.name!"
   */
  evaluateTextWithExpressions(text) {
    // Find all expressions in the text
    const expressionRegex = /@\w+(\.\w+)*/g;

    return text.replace(expressionRegex, match => {
      const variablePath = match.substring(1);
      const value = this.resolveVariable(variablePath);
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * Evaluate condition for IF function
   */
  evaluateCondition(condition) {
    // Replace variable references with their values
    const processedCondition = condition.replace(/@\w+(\.\w+)*/g, match => {
      const variablePath = match.substring(1);
      const value = this.resolveVariable(variablePath);
      return typeof value === 'string' && !isNaN(Number(value))
        ? Number(value)
        : typeof value === 'number'
        ? value
        : `"${value}"`;
    });

    // Check if the condition contains arithmetic operations that need evaluation
    // This includes expressions with comparison operators like =, <>, >, <, >=, <=
    if (
      this.isArithmeticExpression(processedCondition) ||
      processedCondition.includes('=') ||
      processedCondition.includes('<>') ||
      processedCondition.includes('>') ||
      processedCondition.includes('<') ||
      processedCondition.includes('>=') ||
      processedCondition.includes('<=')
    ) {
      try {
        // Replace = with === for JavaScript comparison
        let jsCondition = processedCondition.replace(/=([^=])/g, '===$1');
        jsCondition = jsCondition.replace(/<>/g, '!==');

        // Evaluate the condition
        const result = Function('"use strict"; return (' + jsCondition + ')')();
        return Boolean(result);
      } catch (error) {
        return false;
      }
    }

    // Simple condition evaluation - can be expanded
    try {
      return Function('"use strict"; return (' + processedCondition + ')')();
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if expression is an arithmetic expression
   */
  isArithmeticExpression(expression) {
    // Check for arithmetic operators and numbers/variables
    const arithmeticPattern = /^[\s\d+\-*/^().@\w]+$/;
    const hasOperator = /[+\-*/^]/;

    return arithmeticPattern.test(expression) && hasOperator.test(expression);
  }

  /**
   * Evaluate string concatenation with & operator
   */
  evaluateStringConcatenation(expression) {
    try {
      // Split by & operator, but handle parentheses and quotes
      const parts = this.splitByConcatenationOperator(expression);
      let result = '';

      for (let part of parts) {
        part = part.trim();

        // Handle quoted strings
        if (part.startsWith('"') && part.endsWith('"')) {
          result += part.slice(1, -1);
        }
        // Handle arithmetic expressions within concatenation
        else if (this.isArithmeticExpression(part)) {
          const arithmeticResult = this.evaluateArithmeticExpression(part);
          result += String(arithmeticResult);
        }
        // Handle variables
        else if (part.startsWith('@')) {
          const variableValue = this.resolveVariable(part.substring(1));
          result += String(variableValue);
        }
        // Handle plain text
        else {
          result += part;
        }
      }

      return result;
    } catch (error) {
      return expression;
    }
  }

  /**
   * Split expression by & operator, respecting parentheses and quotes
   */
  splitByConcatenationOperator(expression) {
    const parts = [];
    let currentPart = '';
    let inQuotes = false;
    let parenthesesDepth = 0;

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      if (char === '"' && expression[i - 1] !== '\\') {
        inQuotes = !inQuotes;
      }

      if (!inQuotes) {
        if (char === '(') parenthesesDepth++;
        if (char === ')') parenthesesDepth--;

        if (char === '&' && parenthesesDepth === 0) {
          parts.push(currentPart);
          currentPart = '';
          continue;
        }
      }

      currentPart += char;
    }

    if (currentPart.trim()) {
      parts.push(currentPart);
    }

    return parts;
  }

  /**
   * Create a context object from contact, flow, step, and channel data
   */
  static createContext(
    contact = {},
    flow = {},
    step = {},
    channel = {},
    date = {},
  ) {
    return {
      contact: {
        name: contact.name || '',
        first_name: contact.first_name || contact.name?.split(' ')[0] || '',
        tel: contact.phone_number || contact.tel || '',
        tel_e164: contact.tel_e164 || contact.phone_number || '',
        email: contact.email || '',
        address: contact.address || '',
        urn: contact.urn || '',
        urns: contact.urns || [],
        uuid: contact.uuid || '',
        fields: contact.fields || {},
        groups: contact.groups || [],
        ...contact,
      },
      flow: {
        name: flow.name || '',
        uuid: flow.uuid || '',
        // Handle flow results with category support
        ...Object.keys(flow.results || {}).reduce((acc, key) => {
          const result = flow.results[key];
          acc[key] = result.value || '';
          if (result.category !== undefined) {
            acc[`${key}.category`] = result.category;
          }
          return acc;
        }, {}),
        results: flow.results || {},
      },
      step: {
        value: step.value || '',
        text: step.text || step.value || '',
        date: step.date || new Date().toISOString(),
        contact: step.contact || {},
        ...step,
      },
      channel: {
        name: channel.name || '',
        uuid: channel.uuid || '',
        address: channel.address || '',
        tel: channel.tel || '',
        ...channel,
      },
      date: {
        today: date.today || new Date().toISOString().split('T')[0],
        now: date.now || new Date().toISOString(),
        yesterday:
          date.yesterday ||
          new Date(Date.now() - 86400000).toISOString().split('T')[0],
        tomorrow:
          date.tomorrow ||
          new Date(Date.now() + 86400000).toISOString().split('T')[0],
        ...date,
      },
    };
  }
}

export default ExpressionEvaluator;

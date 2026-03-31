const { ExpressionEvaluator } = require('./src/utils/expressionEvaluator');

console.log('Starting debug test...');

const evaluator = new ExpressionEvaluator();

const flow = {
  name: 'Test Flow',
  uuid: '12345',
  results: {
    'color': { value: 'red', category: 'Primary' }
  }
};

console.log('Flow object:', JSON.stringify(flow, null, 2));

const context = ExpressionEvaluator.createContext({}, flow);
console.log('Full context:', JSON.stringify(context, null, 2));
console.log('Flow object in context:', JSON.stringify(context.flow, null, 2));

evaluator.setContext(context);

console.log('Evaluating @flow.color:');
const result = evaluator.evaluate('@flow.color');
console.log('Result:', result);

// Let's manually check the path
console.log('Manual path check:');
console.log('context.flow:', context.flow);
console.log('context.flow.color:', context.flow.color);
console.log('context.flow["color"]:', context.flow['color']);
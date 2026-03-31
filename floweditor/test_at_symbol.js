const ExcellentParser = require('./src/components/form/textinput/ExcellentParser.ts').default;

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

console.log('Testing standalone @ symbol:');
const expressions = parser.findExpressions('@');
console.log('Expressions found:', expressions);

console.log('\nTesting @ with space after:');
const expressions2 = parser.findExpressions('@ ');
console.log('Expressions found:', expressions2);

console.log('\nTesting @contact:');
const expressions3 = parser.findExpressions('@contact');
console.log('Expressions found:', expressions3);
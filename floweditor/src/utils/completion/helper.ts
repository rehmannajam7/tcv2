import ExcellentParser, {
  Expression,
} from '../../components/form/textinput/ExcellentParser';
import { TembaStore } from '../../temba-components';

const MESSAGE_TOP_LEVELS = ['contact', 'fields', 'globals', 'urns'];
const SESSION_TOP_LEVELS = [
  'contact',
  'fields',
  'globals',
  'urns',
  'results',
  'input',
  'run',
  'child',
  'parent',
  'node',
  'webhook',
  'ticket',
  'trigger',
  'resume',
];

const messageParser = new ExcellentParser('@', MESSAGE_TOP_LEVELS);
const sessionParser = new ExcellentParser('@', SESSION_TOP_LEVELS);

export interface Position {
  top: number;
  left: number;
}

export interface FunctionExample {
  template: string;
  output: string;
}

export interface CompletionOption {
  name?: string;
  summary: string;

  // functions
  signature?: string;
  detail?: string;
  examples?: FunctionExample[];
}

export interface CompletionResult {
  // anchorPosition: Position;
  query: string;
  options: CompletionOption[];
  currentFunction: CompletionOption;
}

export interface CompletionProperty {
  key: string;
  help: string;
  type: string;
}

export interface CompletionType {
  name: string;

  key_source?: string;
  property_template?: CompletionProperty;
  properties?: CompletionProperty[];
}

export interface CompletionSchema {
  types: CompletionType[];
  root: CompletionProperty[];
  root_no_session: CompletionProperty[];
}

export interface KeyedAssets {
  [assetType: string]: string[];
}

export const getFunctions = (
  functions: CompletionOption[],
  query: string,
): CompletionOption[] => {
  const list = Array.isArray(functions) ? functions : [];
  if (!query) {
    return list;
  }
  const q = (query || '').toLowerCase();
  return list.filter((option: CompletionOption) => {
    if (option.signature) {
      return option.signature.toLowerCase().indexOf(q) === 0;
    }
    return false;
  });
};

/**
 * Takes a dot query and returns the completions options at the current level
 * @param dotQuery query such as "contact.first_n"
 */
export const getCompletions = (
  schema: CompletionSchema,
  dotQuery: string,
  keyedAssets: KeyedAssets = {},
  session: boolean,
): CompletionOption[] => {
  if (!schema) {
    return [];
  }
  const parts = (dotQuery || '').split('.');
  let currentProps: CompletionProperty[] = session
    ? schema.root
    : schema.root_no_session;

  if (!currentProps) {
    return [];
  }

  // If query is empty (user just typed @), return all root properties
  if (!dotQuery || dotQuery === '') {
    return currentProps.map((prop: CompletionProperty) => {
      return { name: prop.key, summary: prop.help };
    });
  }

  let prefix = '';
  let part = '';
  while (parts.length > 0) {
    part = parts.shift();
    if (part) {
      // eslint-disable-next-line
      const nextProp = currentProps.find((prop: CompletionProperty) => prop.key === part);
      if (nextProp) {
        // eslint-disable-next-line
        const nextType = schema.types.find((type: CompletionType) => type.name === nextProp.type);
        if (nextType && nextType.properties) {
          currentProps = nextType.properties;
          prefix += part + '.';
        } else if (nextType && nextType.property_template) {
          prefix += part + '.';
          const template = nextType.property_template;
          if (keyedAssets[nextType.name]) {
            currentProps = keyedAssets[nextType.name].map((key: string) => ({
              key: template.key.replace('{key}', key),
              help: template.help.replace('{key}', key),
              type: template.type,
            }));
          } else {
            currentProps = [];
          }
        } else {
          // eslint-disable-next-line
          currentProps = currentProps.filter((prop: CompletionProperty) =>
            prop.key.startsWith(part.toLowerCase()),
          );
          break;
        }
      } else {
        // eslint-disable-next-line
        currentProps = currentProps.filter((prop: CompletionProperty) =>
          prop.key.startsWith(part.toLowerCase()),
        );
        break;
      }
    }
  }

  return currentProps.map((prop: CompletionProperty) => {
    const name =
      prop.key === '__default__'
        ? prefix.substr(0, prefix.length - 1)
        : prefix + prop.key;
    return { name, summary: prop.help };
  });
};

export const updateInputElementWithCompletion = (
  currentQuery: string,
  ele: HTMLInputElement,
  option: CompletionOption,
) => {
  let insertText = '';

  if (option.signature) {
    // they selected a function
    insertText = option.signature.substr(0, option.signature.indexOf('(') + 1);
  } else {
    insertText = option.name;
  }

  const queryLength = currentQuery.length;

  if (ele) {
    const value = ele.value;
    const insertionPoint = ele.selectionStart - queryLength;

    // strip out our query
    const leftSide = value.substr(0, insertionPoint);
    const remaining = value.substr(insertionPoint + queryLength);
    const caret = leftSide.length + insertText.length;

    // set our value and our new caret
    ele.value = leftSide + insertText + remaining;
    ele.setSelectionRange(caret, caret);

    ele.dispatchEvent(new Event('input'));
    ele.focus();
  }
};

export const executeCompletionQuery = (
  ele: HTMLInputElement | HTMLTextAreaElement,
  store: TembaStore,
  session: boolean,
  functions: CompletionOption[],
  context: CompletionSchema,
): CompletionResult => {
  const result: CompletionResult = {
    currentFunction: null,
    options: [],
    query: null,
  };

  if (!ele) {
    return result;
  }

  const cursor = ele.selectionStart;
  const input = ele.value.substring(0, cursor);

  const parser = session ? sessionParser : messageParser;
  const expressions = parser.findExpressions(input);
  const currentExpression = expressions.find(
    (expr: Expression) =>
      expr.start <= cursor &&
      (expr.end > cursor || (expr.end === cursor && !expr.closed)),
  );

  if (currentExpression) {
    const includeFunctions = currentExpression.text.indexOf('(') > -1;
    if (includeFunctions) {
      const functionQuery = parser.functionContext(currentExpression.text);
      if (functionQuery) {
        const fns = getFunctions(functions || [], functionQuery);
        if (fns.length > 0) {
          result.currentFunction = fns[0];
        }
      }
    }

    for (let i = currentExpression.text.length; i >= 0; i--) {
      const curr = currentExpression.text[i];
      if (
        curr === '@' ||
        curr === '(' ||
        curr === ' ' ||
        curr === ',' ||
        curr === ')' ||
        i === 0
      ) {
        // don't include non-expression chars
        if (
          curr === '@' ||
          curr === '(' ||
          curr === ' ' ||
          curr === ',' ||
          curr === ')'
        ) {
          i++;
        }

        result.query = currentExpression.text.substr(
          i,
          currentExpression.text.length - i,
        );

        const keyedAssets: KeyedAssets = store ? store.getKeyedAssets() : {};
        const schema = context || ({} as any);
        let optionsContext: CompletionOption[] = [];
        const hasSchema =
          !!schema &&
          ((session && (schema as any).root) ||
            (!session && (schema as any).root_no_session));
        if (hasSchema) {
          optionsContext = getCompletions(
            schema as any,
            result.query,
            keyedAssets,
            session,
          );
          // Augment top-level when schema misses some contexts
          const q = (result.query || '').toLowerCase();
          const tops = session ? SESSION_TOP_LEVELS : MESSAGE_TOP_LEVELS;
          const TOP_HELP: Record<string, string> = {
            contact: 'Contact information and attributes',
            fields: 'Custom contact fields in this workspace',
            globals: 'Global variables available in the flow',
            urns: 'Identifiers and addresses (phone, WhatsApp, etc.)',
            results: 'Results from previous flow steps',
            input: 'Input captured at this node',
            run: 'Current flow run metadata',
            child: 'Child flow context',
            parent: 'Parent flow context',
            node: 'Current node metadata',
            webhook: 'Latest webhook invocation data',
            ticket: 'Latest ticket information',
            trigger: 'Trigger context for this run',
            resume: 'Resume context and metadata',
          };
          const missingTopLevels = tops
            .filter(k => (q ? k.startsWith(q) : true))
            .filter(k => !optionsContext.some(op => op.name === k));
          if (missingTopLevels.length > 0) {
            optionsContext = [
              ...optionsContext,
              ...missingTopLevels.map(k => ({
                name: k,
                summary: TOP_HELP[k] || '',
              })),
            ];
          }
        } else {
          const tops = session ? SESSION_TOP_LEVELS : MESSAGE_TOP_LEVELS;
          const q = (result.query || '').toLowerCase();
          const filtered = q ? tops.filter(k => k.startsWith(q)) : tops;
          const TOP_HELP: Record<string, string> = {
            contact: 'Contact information and attributes',
            fields: 'Custom contact fields in this workspace',
            globals: 'Global variables available in the flow',
            urns: 'Identifiers and addresses (phone, WhatsApp, etc.)',
            results: 'Results from previous flow steps',
            input: 'Input captured at this node',
            run: 'Current flow run metadata',
            child: 'Child flow context',
            parent: 'Parent flow context',
            node: 'Current node metadata',
            webhook: 'Latest webhook invocation data',
            ticket: 'Latest ticket information',
            trigger: 'Trigger context for this run',
            resume: 'Resume context and metadata',
          };
          optionsContext = filtered.map(k => ({
            name: k,
            summary: TOP_HELP[k] || '',
          }));

          // Fallback children for top-levels when schema is missing
          const suffixOf = (prefix: string) =>
            q.indexOf('.') >= 0
              ? q
                  .split('.')
                  .slice(1)
                  .join('.')
              : '';

          const addChildren = (
            prefix: string,
            props: { key: string; help: string }[],
          ) => {
            if (!q.startsWith(prefix)) return;
            const suffix = suffixOf(prefix);
            const filteredProps = suffix
              ? props.filter(p => p.key.startsWith(suffix))
              : props;
            const items = filteredProps.map(p => ({
              name: `${prefix}.${p.key}`,
              summary: p.help,
            }));
            optionsContext = [...optionsContext, ...items];
          };

          addChildren('contact', [
            { key: 'uuid', help: 'The UUID of the contact' },
            { key: 'id', help: 'The numeric ID of the contact' },
            { key: 'first_name', help: 'The first name of the contact' },
            { key: 'last_name', help: 'The last name of the contact' },
            { key: 'name', help: 'The name or URN' },
            { key: 'language', help: 'The language code of the contact' },
            { key: 'urn', help: 'The primary URN of the contact' },
          ]);

          addChildren('fields', [
            { key: 'age', help: 'Custom field age' },
            { key: 'email', help: 'Custom field email' },
            { key: 'phone', help: 'Custom field phone' },
          ]);

          addChildren('globals', [
            { key: 'date', help: 'Current date' },
            { key: 'time', help: 'Current time' },
            { key: 'datetime', help: 'Current date and time' },
            { key: 'timezone', help: 'Current timezone' },
          ]);

          addChildren('urns', [
            { key: 'tel', help: 'Telephone number URN' },
            { key: 'whatsapp', help: 'WhatsApp URN' },
            { key: 'mailto', help: 'Email URN' },
            { key: 'twitter', help: 'Twitter handle URN' },
          ]);

          if (q.startsWith('results')) {
            const keys =
              keyedAssets && (keyedAssets as any).results
                ? (keyedAssets as any).results
                : [];
            const suffix = suffixOf('results');
            const names = suffix
              ? keys.filter((k: string) => k.startsWith(suffix))
              : keys;
            const resOptions: CompletionOption[] = [];
            names.forEach((name: string) => {
              resOptions.push({
                name: `results.${name}.value`,
                summary: 'Result value',
              });
              resOptions.push({
                name: `results.${name}.category`,
                summary: 'Result category',
              });
              resOptions.push({
                name: `results.${name}.input`,
                summary: 'Original user input',
              });
            });
            optionsContext = [...optionsContext, ...resOptions];
          }

          addChildren('input', [
            { key: 'text', help: 'Text input at this node' },
            { key: 'value', help: 'Parsed value at this node' },
            { key: 'attachments', help: 'Attachments captured at this node' },
          ]);

          addChildren('run', [
            { key: 'uuid', help: 'The UUID of the run' },
            { key: 'flow_uuid', help: 'The UUID of the flow' },
            { key: 'start_time', help: 'Run start time' },
            { key: 'end_time', help: 'Run end time' },
            { key: 'status', help: 'Run status' },
          ]);

          addChildren('node', [
            { key: 'uuid', help: 'Current node UUID' },
            { key: 'name', help: 'Current node name' },
            { key: 'entered_at', help: 'Time entered current node' },
          ]);

          addChildren('webhook', [
            { key: 'status_code', help: 'HTTP status code' },
            { key: 'result', help: 'Webhook response body' },
            { key: 'url', help: 'Invoked webhook URL' },
          ]);

          addChildren('ticket', [
            { key: 'id', help: 'Ticket ID' },
            { key: 'url', help: 'Ticket URL' },
            { key: 'title', help: 'Ticket title' },
            { key: 'status', help: 'Ticket status' },
          ]);

          addChildren('trigger', [
            { key: 'type', help: 'Trigger type' },
            { key: 'text', help: 'Trigger text' },
            { key: 'category', help: 'Trigger category' },
          ]);

          addChildren('resume', [
            { key: 'time', help: 'Resume time' },
            { key: 'reason', help: 'Resume reason' },
            { key: 'user', help: 'Resuming user' },
          ]);
        }

        // Augment with contact sub-properties when schema is present but lacks typed children
        const qLower = (result.query || '').toLowerCase();
        if (qLower.startsWith('contact')) {
          const hasChildSuggestions = optionsContext.some(
            op => op.name.indexOf('contact.') === 0,
          );
          if (!hasChildSuggestions) {
            const CONTACT_PROPS2: { key: string; help: string }[] = [
              { key: 'uuid', help: 'The UUID of the contact' },
              { key: 'id', help: 'The numeric ID of the contact' },
              { key: 'first_name', help: 'The first name of the contact' },
              { key: 'last_name', help: 'The last name of the contact' },
              { key: 'name', help: 'The name or URN' },
              { key: 'language', help: 'The language code of the contact' },
              { key: 'urn', help: 'The primary URN of the contact' },
            ];
            const suffix2 =
              qLower.indexOf('.') >= 0
                ? qLower
                    .split('.')
                    .slice(1)
                    .join('.')
                : '';
            const filteredProps2 = suffix2
              ? CONTACT_PROPS2.filter(p => p.key.startsWith(suffix2))
              : CONTACT_PROPS2;
            const contactOptions2 = filteredProps2.map(p => ({
              name: `contact.${p.key}`,
              summary: p.help,
            }));
            // Deduplicate by name
            const existingNames = new Set(optionsContext.map(op => op.name));
            const merged = [
              ...optionsContext,
              ...contactOptions2.filter(op => !existingNames.has(op.name)),
            ];
            optionsContext = merged;
          }
        }
        // Ensure children for other contexts as well when schema lacks them
        const ensureChildren = (
          prefix: string,
          props: { key: string; help: string }[],
        ) => {
          if (!qLower.startsWith(prefix)) return;
          const hasChildSuggestions = optionsContext.some(
            op => op.name.indexOf(prefix + '.') === 0,
          );
          if (!hasChildSuggestions) {
            const suffix =
              qLower.indexOf('.') >= 0
                ? qLower
                    .split('.')
                    .slice(1)
                    .join('.')
                : '';
            const filtered = suffix
              ? props.filter(p => p.key.startsWith(suffix))
              : props;
            const items = filtered.map(p => ({
              name: `${prefix}.${p.key}`,
              summary: p.help,
            }));
            const existing = new Set(optionsContext.map(op => op.name));
            optionsContext = [
              ...optionsContext,
              ...items.filter(op => !existing.has(op.name)),
            ];
          }
        };
        ensureChildren('fields', [
          { key: 'age', help: 'Custom field age' },
          { key: 'email', help: 'Custom field email' },
          { key: 'phone', help: 'Custom field phone' },
        ]);
        ensureChildren('globals', [
          { key: 'date', help: 'Current date' },
          { key: 'time', help: 'Current time' },
          { key: 'datetime', help: 'Current date and time' },
          { key: 'timezone', help: 'Current timezone' },
        ]);
        ensureChildren('urns', [
          { key: 'tel', help: 'Telephone number URN' },
          { key: 'whatsapp', help: 'WhatsApp URN' },
          { key: 'mailto', help: 'Email URN' },
          { key: 'twitter', help: 'Twitter handle URN' },
        ]);
        // results: dynamic children based on keyed assets
        if (qLower.startsWith('results')) {
          const hasChildSuggestions = optionsContext.some(
            op => op.name.indexOf('results.') === 0,
          );
          if (!hasChildSuggestions) {
            const keys =
              keyedAssets && (keyedAssets as any).results
                ? (keyedAssets as any).results
                : [];
            const suffix =
              qLower.indexOf('.') >= 0
                ? qLower
                    .split('.')
                    .slice(1)
                    .join('.')
                : '';
            const names = suffix
              ? keys.filter((k: string) => k.startsWith(suffix))
              : keys;
            const resOptions: CompletionOption[] = [];
            names.forEach((name: string) => {
              resOptions.push({
                name: `results.${name}.value`,
                summary: 'Result value',
              });
              resOptions.push({
                name: `results.${name}.category`,
                summary: 'Result category',
              });
              resOptions.push({
                name: `results.${name}.input`,
                summary: 'Original user input',
              });
            });
            const existing = new Set(optionsContext.map(op => op.name));
            optionsContext = [
              ...optionsContext,
              ...resOptions.filter(op => !existing.has(op.name)),
            ];
          }
        }
        ensureChildren('input', [
          { key: 'text', help: 'Text input at this node' },
          { key: 'value', help: 'Parsed value at this node' },
          { key: 'attachments', help: 'Attachments captured at this node' },
        ]);
        ensureChildren('run', [
          { key: 'uuid', help: 'The UUID of the run' },
          { key: 'flow_uuid', help: 'The UUID of the flow' },
          { key: 'start_time', help: 'Run start time' },
          { key: 'end_time', help: 'Run end time' },
          { key: 'status', help: 'Run status' },
        ]);
        ensureChildren('node', [
          { key: 'uuid', help: 'Current node UUID' },
          { key: 'name', help: 'Current node name' },
          { key: 'entered_at', help: 'Time entered current node' },
        ]);
        ensureChildren('webhook', [
          { key: 'status_code', help: 'HTTP status code' },
          { key: 'result', help: 'Webhook response body' },
          { key: 'url', help: 'Invoked webhook URL' },
        ]);
        ensureChildren('ticket', [
          { key: 'id', help: 'Ticket ID' },
          { key: 'url', help: 'Ticket URL' },
          { key: 'title', help: 'Ticket title' },
          { key: 'status', help: 'Ticket status' },
        ]);
        ensureChildren('trigger', [
          { key: 'type', help: 'Trigger type' },
          { key: 'text', help: 'Trigger text' },
          { key: 'category', help: 'Trigger category' },
        ]);
        ensureChildren('resume', [
          { key: 'time', help: 'Resume time' },
          { key: 'reason', help: 'Resume reason' },
          { key: 'user', help: 'Resuming user' },
        ]);
        const optionsFns = includeFunctions
          ? getFunctions(functions || [], result.query)
          : [];
        result.options = [...optionsContext, ...optionsFns];

        return result;
      }
    }
  } else {
    result.options = [];
    result.query = '';
  }
  return result;
};

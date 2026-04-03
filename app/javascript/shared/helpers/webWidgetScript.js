/**
 * Normalizes website widget embed snippets for display/copy in the dashboard.
 * Keeps UI consistent when the API still returns legacy Chatwoot global names.
 */
export const normalizeWebWidgetScript = script => {
  if (!script || typeof script !== 'string') {
    return script;
  }

  return script
    .replace(/window\.chatwootSDK\.run/g, 'window.thumbcrowdSDK.run')
    .replace(/window\.chatwootSettings/g, 'window.thumbcrowdSettings');
};

import * as Sentry from '@sentry/react';

const initSentry = (dsn: string) => {
  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.httpClientIntegration({
        failedRequestStatusCodes: [[400, 499], [500, 599]],
      }),
      Sentry.replayIntegration(),
      Sentry.replayCanvasIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
};

export default initSentry;

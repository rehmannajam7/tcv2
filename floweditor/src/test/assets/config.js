const config = {
  flow: 'boring'
};

export const merged =
  process.env.NODE_ENV === 'preview'
    ? Object.assign({}, config, {
        localStorage: true,
        endpoints: {
          flows: 'flows',
          groups: 'groups',
          contacts: 'contacts',
          classifiers: 'classifiers',
          ticketers: 'ticketers',
          ticketers_queues: 'ticketers_queues',
          external_services: 'external_services',
          fields: 'fields',
          labels: 'labels',
          environment: 'environment',
          editor: 'editor',
          activity: '',
          engine: '',
          simulateStart: 'simulate_start',
          simulateResume: 'simulate_resume'
        }
      })
    : Object.assign({}, config, {
        localStorage: true,
        endpoints: {
          flows: '/assets/flows',
          groups: '/assets/groups',
          contacts: '/assets/contacts',
          classifiers: '/assets/classifiers',
          ticketers: '/assets/ticketers',
          ticketers_queues: '/assets/ticketers_queues',
          external_services: '/assets/external_services',
          fields: '/assets/fields',
          labels: '/assets/labels',
          environment: '/assets/environment',
          editor: 'editor',
          activity: '',
          engine: '',
          simulateStart: '/assets/simulate_start',
          simulateResume: '/assets/simulate_resume'
        }
      });

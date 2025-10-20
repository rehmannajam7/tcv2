import { frontendURL } from '../../../helper/URLHelper';
import FlowEditor from './FlowEditor.vue';
import FlowsList from './FlowsList.vue';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/flows'),
    name: 'flows_list',
    component: FlowsList,
    meta: {
      permissions: ['administrator', 'agent', 'custom_role'],
    },
  },
  {
    path: frontendURL('accounts/:accountId/flows/editor/:flowId?'),
    name: 'flow_editor',
    component: FlowEditor,
    meta: {
      permissions: ['administrator', 'agent', 'custom_role'],
    },
    props: route => ({
      flowId: route.params.flowId ? String(route.params.flowId) : null,
    }),
  },
];
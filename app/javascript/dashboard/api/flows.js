/* global axios */
import ApiClient from './ApiClient';

class FlowsAPI extends ApiClient {
  constructor() {
    super('flows', { accountScoped: true });
  }

  getFlows() {
    return axios.get(this.url);
  }

  getFlow(flowId) {
    return axios.get(`${this.url}/${flowId}`);
  }

  createFlow(flowData) {
    return axios.post(this.url, {
      flow: flowData,
    });
  }

  create(flowData) {
    return this.createFlow(flowData);
  }

  updateFlow(flowId, flowData) {
    return axios.patch(`${this.url}/${flowId}`, {
      flow: flowData,
    });
  }

  deleteFlow(flowId) {
    return axios.delete(`${this.url}/${flowId}`);
  }

  // FlowEditor specific endpoints
  getFlowRevisions(flowId) {
    return axios.get(`${this.url}/${flowId}/revisions`);
  }

  saveFlowRevision(flowId, definition) {
    return axios.post(`${this.url}/${flowId}/save_revision`, {
      definition: definition,
    });
  }
}

export default new FlowsAPI();
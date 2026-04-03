import express from 'express';
import {
  authenticateChatwootToken,
  requireChatwootAccountAccess,
} from '../middleware/chatwootAuth.js';
import {
  validateRequest,
  validateQuery,
  flowDefinitionSchema,
  flowDefinitionUpdateSchema,
  flowRevisionSchema,
  paginationSchema,
} from '../middleware/validation.js';
import {
  createFlowDefinition,
  getFlowDefinitions,
  getFlowDefinition,
  updateFlowDefinition,
  deleteFlowDefinition,
  createFlowRevision,
  getFlowRevisions,
  getFlowRevision,
} from '../controllers/flowDefinitionsController.js';

const router = express.Router();

// Apply Chatwoot authentication and account access middleware to all routes
router.use(authenticateChatwootToken);
router.use(requireChatwootAccountAccess);

// Flow definitions routes
router.post('/', validateRequest(flowDefinitionSchema), createFlowDefinition);

router.get('/', validateQuery(paginationSchema), getFlowDefinitions);

router.get('/:uuid', getFlowDefinition);

router.put(
  '/:uuid',
  validateRequest(flowDefinitionUpdateSchema),
  updateFlowDefinition,
);

router.delete('/:uuid', deleteFlowDefinition);

// Flow revisions routes
router.post(
  '/:uuid/revisions',
  validateRequest(flowRevisionSchema),
  createFlowRevision,
);

router.get(
  '/:uuid/revisions',
  validateQuery(paginationSchema),
  getFlowRevisions,
);

router.get('/:uuid/revisions/:revisionNumber', getFlowRevision);

// Add save_revision endpoint for FlowEditor compatibility
router.post(
  '/:uuid/save_revision',
  validateRequest(flowRevisionSchema),
  createFlowRevision,
);

export default router;

import FlowDefinition from '../models/FlowDefinition.js';
import FlowRevision from '../models/FlowRevision.js';
import logger from '../config/logger.js';

export const createFlowDefinition = async (req, res) => {
  const startTime = Date.now();
  const correlationId = req.correlationId;

  try {
    const flowData = {
      ...req.validatedBody,
      account_id: req.account_id,
    };

    logger.info('Creating flow definition', {
      correlationId,
      account_id: req.account_id,
      user_id: req.user.id,
      flow_name: flowData.name,
    });

    const flow = await FlowDefinition.create(flowData, req.user.id);
    const createDuration = Date.now() - startTime;

    // Create initial revision
    const revisionStartTime = Date.now();
    await FlowRevision.create(
      flow.uuid,
      {
        definition_json: flow.definition_json,
        version: flow.version,
        change_summary: 'Initial version',
      },
      req.user.id,
    );
    const revisionDuration = Date.now() - revisionStartTime;

    const totalDuration = Date.now() - startTime;

    logger.logPerformance('Create Flow Definition', totalDuration, {
      correlationId,
      account_id: req.account_id,
      user_id: req.user.id,
      flow_uuid: flow.uuid,
      create_duration: createDuration,
      revision_duration: revisionDuration,
    });

    res.status(201).json({
      success: true,
      data: flow,
      message: 'Flow definition created successfully',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logError(error, {
      correlationId,
      operation: 'createFlowDefinition',
      duration,
      user_id: req.user.id,
      account_id: req.account_id,
    });

    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Flow name already exists in this account',
        code: 'DUPLICATE_FLOW_NAME',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create flow definition',
      code: 'CREATION_FAILED',
    });
  }
};

export const getFlowDefinitions = async (req, res) => {
  const startTime = Date.now();
  const correlationId = req.correlationId;

  try {
    logger.info('Fetching flow definitions', {
      correlationId,
      account_id: req.account_id,
      user_id: req.user.id,
      query: req.validatedQuery,
    });

    const result = await FlowDefinition.findByAccountId(
      req.account_id,
      req.validatedQuery,
    );
    const duration = Date.now() - startTime;

    logger.logPerformance('Get Flow Definitions', duration, {
      correlationId,
      account_id: req.account_id,
      user_id: req.user.id,
      flow_count: result.flows.length,
      total_count: result.pagination.total,
    });

    res.json({
      success: true,
      data: result.flows,
      pagination: result.pagination,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logError(error, {
      correlationId,
      operation: 'getFlowDefinitions',
      duration,
      user_id: req.user.id,
      account_id: req.account_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch flow definitions',
      code: 'FETCH_FAILED',
    });
  }
};

export const getFlowDefinition = async (req, res) => {
  const startTime = Date.now();
  const correlationId = req.correlationId;

  try {
    const { uuid } = req.params;

    logger.info('Fetching flow definition', {
      correlationId,
      account_id: req.account_id,
      user_id: req.user.id,
      flow_uuid: uuid,
    });

    const flow = await FlowDefinition.findByUuid(uuid, req.account_id);
    const duration = Date.now() - startTime;

    if (!flow) {
      logger.warn('Flow definition not found', {
        correlationId,
        flow_uuid: uuid,
        account_id: req.account_id,
        user_id: req.user.id,
        duration,
      });

      return res.status(404).json({
        success: false,
        error: 'Flow definition not found',
        code: 'FLOW_NOT_FOUND',
      });
    }

    logger.logPerformance('Get Flow Definition', duration, {
      correlationId,
      account_id: req.account_id,
      user_id: req.user.id,
      flow_uuid: uuid,
    });

    res.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logError(error, {
      correlationId,
      operation: 'getFlowDefinition',
      duration,
      uuid: req.params.uuid,
      user_id: req.user.id,
      account_id: req.account_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch flow definition',
      code: 'FETCH_FAILED',
    });
  }
};

export const updateFlowDefinition = async (req, res) => {
  try {
    const { uuid } = req.params;
    const updateData = req.validatedBody;

    const flow = await FlowDefinition.update(
      uuid,
      req.account_id,
      updateData,
      req.user.id,
    );

    if (!flow) {
      return res.status(404).json({
        success: false,
        error: 'Flow definition not found',
        code: 'FLOW_NOT_FOUND',
      });
    }

    // Create revision if definition_json was updated
    if (updateData.definition_json) {
      await FlowRevision.create(
        flow.uuid,
        {
          definition_json: flow.definition_json,
          version: flow.version,
          change_summary:
            updateData.change_summary || 'Updated flow definition',
        },
        req.user.id,
      );
    }

    res.json({
      success: true,
      data: flow,
      message: 'Flow definition updated successfully',
    });
  } catch (error) {
    logger.error('Error updating flow definition', {
      error: error.message,
      uuid: req.params.uuid,
      user_id: req.user.id,
      account_id: req.account_id,
    });

    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Flow name already exists in this account',
        code: 'DUPLICATE_FLOW_NAME',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update flow definition',
      code: 'UPDATE_FAILED',
    });
  }
};

export const deleteFlowDefinition = async (req, res) => {
  try {
    const { uuid } = req.params;
    const flow = await FlowDefinition.delete(uuid, req.account_id, req.user.id);

    if (!flow) {
      return res.status(404).json({
        success: false,
        error: 'Flow definition not found',
        code: 'FLOW_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      message: 'Flow definition deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting flow definition', {
      error: error.message,
      uuid: req.params.uuid,
      user_id: req.user.id,
      account_id: req.account_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete flow definition',
      code: 'DELETE_FAILED',
    });
  }
};

export const createFlowRevision = async (req, res) => {
  try {
    const { uuid } = req.params;

    // Verify flow exists and belongs to account; auto-create if missing
    let flow = await FlowDefinition.findByUuid(uuid, req.account_id);
    if (!flow) {
      const def = req.validatedBody?.definition_json || {};
      const flowData = {
        uuid,
        account_id: req.account_id,
        name: def.name || 'Untitled Flow',
        description: def.description || null,
        definition_json: def,
        version: req.validatedBody?.version || '1.0.0',
        status: 'draft',
      };

      try {
        flow = await FlowDefinition.create(flowData, req.user.id);
        logger.info('Auto-created flow definition during save_revision', {
          account_id: req.account_id,
          user_id: req.user.id,
          flow_uuid: uuid,
        });
      } catch (createError) {
        logger.error('Failed to auto-create flow definition', {
          error: createError.message,
          account_id: req.account_id,
          user_id: req.user.id,
          flow_uuid: uuid,
        });

        if (createError.code === '23505') {
          return res.status(409).json({
            success: false,
            error: 'Flow name already exists in this account',
            code: 'DUPLICATE_FLOW_NAME',
          });
        }

        return res.status(500).json({
          success: false,
          error: 'Failed to auto-create flow definition',
          code: 'AUTO_CREATE_FAILED',
        });
      }
    }

    const revision = await FlowRevision.create(
      uuid,
      req.validatedBody,
      req.user.id,
    );

    res.status(201).json({
      success: true,
      data: revision,
      message: 'Flow revision created successfully',
    });
  } catch (error) {
    logger.error('Error creating flow revision', {
      error: error.message,
      uuid: req.params.uuid,
      user_id: req.user.id,
      account_id: req.account_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create flow revision',
      code: 'CREATION_FAILED',
    });
  }
};

export const getFlowRevisions = async (req, res) => {
  try {
    const { uuid } = req.params;

    // Verify flow exists and belongs to account
    const flow = await FlowDefinition.findByUuid(uuid, req.account_id);
    if (!flow) {
      return res.status(404).json({
        success: false,
        error: 'Flow definition not found',
        code: 'FLOW_NOT_FOUND',
      });
    }

    const result = await FlowRevision.findByFlowDefinition(
      uuid,
      req.validatedQuery,
    );

    res.json({
      success: true,
      data: result.revisions,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching flow revisions', {
      error: error.message,
      uuid: req.params.uuid,
      user_id: req.user.id,
      account_id: req.account_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch flow revisions',
      code: 'FETCH_FAILED',
    });
  }
};

export const getFlowRevision = async (req, res) => {
  try {
    const { uuid, revisionNumber } = req.params;

    // Verify flow exists and belongs to account
    const flow = await FlowDefinition.findByUuid(uuid, req.account_id);
    if (!flow) {
      return res.status(404).json({
        success: false,
        error: 'Flow definition not found',
        code: 'FLOW_NOT_FOUND',
      });
    }

    const revision = await FlowRevision.findByRevisionNumber(
      uuid,
      parseInt(revisionNumber),
    );

    if (!revision) {
      return res.status(404).json({
        success: false,
        error: 'Flow revision not found',
        code: 'REVISION_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: revision,
    });
  } catch (error) {
    logger.error('Error fetching flow revision', {
      error: error.message,
      uuid: req.params.uuid,
      revision_number: req.params.revisionNumber,
      user_id: req.user.id,
      account_id: req.account_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch flow revision',
      code: 'FETCH_FAILED',
    });
  }
};

import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

class FlowRevision {
  static tableName = 'flow_revisions';

  static async create(flowDefinitionUuid, data, userId) {
    try {
      // Get the next revision number
      const lastRevision = await db(this.tableName)
        .where('flow_definition_uuid', flowDefinitionUuid)
        .orderBy('revision_number', 'desc')
        .first();

      const revisionNumber = lastRevision
        ? lastRevision.revision_number + 1
        : 1;

      const revisionData = {
        uuid: uuidv4(),
        flow_definition_uuid: flowDefinitionUuid,
        revision_number: revisionNumber,
        definition_json: JSON.stringify(data.definition_json),
        version: data.version,
        change_summary: data.change_summary || null,
        created_by: userId,
      };

      const [revision] = await db(this.tableName)
        .insert(revisionData)
        .returning('*');

      logger.info('Flow revision created', {
        revision_uuid: revision.uuid,
        flow_definition_uuid: flowDefinitionUuid,
        revision_number: revisionNumber,
        created_by: userId,
      });

      return this.formatRevision(revision);
    } catch (error) {
      logger.error('Failed to create flow revision', {
        error: error.message,
        flow_definition_uuid: flowDefinitionUuid,
        user_id: userId,
      });
      throw error;
    }
  }

  static async findByFlowDefinition(flowDefinitionUuid, options = {}) {
    try {
      const { page = 1, limit = 20, order = 'desc' } = options;

      const total = await db(this.tableName)
        .where('flow_definition_uuid', flowDefinitionUuid)
        .count('* as count')
        .first();

      const totalCount = parseInt(total.count);

      const revisions = await db(this.tableName)
        .where('flow_definition_uuid', flowDefinitionUuid)
        .orderBy('revision_number', order)
        .limit(limit)
        .offset((page - 1) * limit);

      return {
        revisions: revisions.map(revision => this.formatRevision(revision)),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to fetch flow revisions', {
        error: error.message,
        flow_definition_uuid: flowDefinitionUuid,
        options,
      });
      throw error;
    }
  }

  static async findByRevisionNumber(flowDefinitionUuid, revisionNumber) {
    try {
      const revision = await db(this.tableName)
        .where('flow_definition_uuid', flowDefinitionUuid)
        .where('revision_number', revisionNumber)
        .first();

      return revision ? this.formatRevision(revision) : null;
    } catch (error) {
      logger.error('Failed to fetch flow revision by number', {
        error: error.message,
        flow_definition_uuid: flowDefinitionUuid,
        revision_number: revisionNumber,
      });
      throw error;
    }
  }

  static async findLatest(flowDefinitionUuid) {
    try {
      const revision = await db(this.tableName)
        .where('flow_definition_uuid', flowDefinitionUuid)
        .orderBy('revision_number', 'desc')
        .first();

      return revision ? this.formatRevision(revision) : null;
    } catch (error) {
      logger.error('Failed to fetch latest flow revision', {
        error: error.message,
        flow_definition_uuid: flowDefinitionUuid,
      });
      throw error;
    }
  }

  static async compareRevisions(flowDefinitionUuid, fromRevision, toRevision) {
    try {
      const revisions = await db(this.tableName)
        .where('flow_definition_uuid', flowDefinitionUuid)
        .whereIn('revision_number', [fromRevision, toRevision])
        .orderBy('revision_number', 'asc');

      if (revisions.length !== 2) {
        return null;
      }

      return {
        from: this.formatRevision(revisions[0]),
        to: this.formatRevision(revisions[1]),
        changes: this.calculateChanges(revisions[0], revisions[1]),
      };
    } catch (error) {
      logger.error('Failed to compare flow revisions', {
        error: error.message,
        flow_definition_uuid: flowDefinitionUuid,
        from_revision: fromRevision,
        to_revision: toRevision,
      });
      throw error;
    }
  }

  static calculateChanges(fromRevision, toRevision) {
    // Basic change detection - can be enhanced with more sophisticated diff algorithms
    const fromDef =
      typeof fromRevision.definition_json === 'string'
        ? JSON.parse(fromRevision.definition_json)
        : fromRevision.definition_json;

    const toDef =
      typeof toRevision.definition_json === 'string'
        ? JSON.parse(toRevision.definition_json)
        : toRevision.definition_json;

    return {
      version_changed: fromRevision.version !== toRevision.version,
      definition_changed: JSON.stringify(fromDef) !== JSON.stringify(toDef),
      summary: toRevision.change_summary,
    };
  }

  static formatRevision(revision) {
    return {
      uuid: revision.uuid,
      flow_definition_uuid: revision.flow_definition_uuid,
      revision_number: revision.revision_number,
      definition_json:
        typeof revision.definition_json === 'string'
          ? JSON.parse(revision.definition_json)
          : revision.definition_json,
      version: revision.version,
      change_summary: revision.change_summary,
      created_by: revision.created_by,
      created_at: revision.created_at,
    };
  }
}

export default FlowRevision;

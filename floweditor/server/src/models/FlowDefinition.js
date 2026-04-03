import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

class FlowDefinition {
  static tableName = 'flow_definitions';

  static async create(data, userId) {
    try {
      const flowData = {
        // Use provided UUID if available to keep consistency with client-side
        uuid: data.uuid || uuidv4(),
        account_id: data.account_id,
        name: data.name,
        description: data.description || null,
        definition_json: JSON.stringify(data.definition_json),
        version: data.version || '1.0.0',
        revision: 1,
        status: data.status || 'draft',
        created_by: userId,
        updated_by: userId,
      };

      const [flow] = await db(this.tableName)
        .insert(flowData)
        .returning('*');

      logger.info('Flow definition created', {
        flow_uuid: flow.uuid,
        account_id: flow.account_id,
        created_by: userId,
      });

      return this.formatFlow(flow);
    } catch (error) {
      logger.error('Failed to create flow definition', {
        error: error.message,
        data,
        user_id: userId,
      });
      throw error;
    }
  }

  static async findByAccountId(accountId, options = {}) {
    try {
      // Check database connection state
      await db.raw('SELECT 1');

      // Build base query
      let query = db(this.tableName)
        .where('account_id', accountId)
        .where('is_active', true);

      // Apply status filter if provided
      if (options.status) {
        query = query.where('status', options.status);
      }

      // Apply search filter if provided
      if (options.search) {
        query = query.where(function() {
          this.where('name', 'like', `%${options.search}%`).orWhere(
            'description',
            'like',
            `%${options.search}%`,
          );
        });
      }

      // Get total count for pagination
      const totalResult = await query
        .clone()
        .count('* as count')
        .first();
      const total = parseInt(totalResult.count);

      // Calculate pagination
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 10;
      const offset = (page - 1) * limit;
      const pages = Math.ceil(total / limit);

      // Apply pagination and sorting
      const sort = options.sort || 'updated_at';
      const order = options.order || 'desc';

      const flows = await query
        .orderBy(sort, order)
        .limit(limit)
        .offset(offset);

      return {
        flows: flows.map(flow => this.formatFlow(flow)),
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch flows by account', {
        error: error.message,
        account_id: accountId,
        options,
      });
      throw error;
    }
  }

  static async findByUuid(uuid, accountId) {
    try {
      const flow = await db(this.tableName)
        .where('uuid', uuid)
        .where('account_id', accountId)
        .where('is_active', true)
        .first();

      return flow ? this.formatFlow(flow) : null;
    } catch (error) {
      logger.error('Failed to fetch flow by UUID', {
        error: error.message,
        uuid,
        account_id: accountId,
      });
      throw error;
    }
  }

  static async update(uuid, accountId, data, userId) {
    try {
      const updateData = {
        updated_by: userId,
        updated_at: new Date(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.definition_json !== undefined) {
        updateData.definition_json = JSON.stringify(data.definition_json);
        updateData.revision = db.raw('revision + 1');
      }
      if (data.version !== undefined) updateData.version = data.version;
      if (data.status !== undefined) updateData.status = data.status;

      const [flow] = await db(this.tableName)
        .where('uuid', uuid)
        .where('account_id', accountId)
        .where('is_active', true)
        .update(updateData)
        .returning('*');

      if (!flow) {
        return null;
      }

      logger.info('Flow definition updated', {
        flow_uuid: uuid,
        account_id: accountId,
        updated_by: userId,
      });

      return this.formatFlow(flow);
    } catch (error) {
      logger.error('Failed to update flow definition', {
        error: error.message,
        uuid,
        account_id: accountId,
        user_id: userId,
      });
      throw error;
    }
  }

  static async delete(uuid, accountId, userId) {
    try {
      const [flow] = await db(this.tableName)
        .where('uuid', uuid)
        .where('account_id', accountId)
        .where('is_active', true)
        .update({
          is_active: false,
          updated_by: userId,
          updated_at: new Date(),
        })
        .returning('*');

      if (!flow) {
        return null;
      }

      logger.info('Flow definition deleted (soft delete)', {
        flow_uuid: uuid,
        account_id: accountId,
        deleted_by: userId,
      });

      return this.formatFlow(flow);
    } catch (error) {
      logger.error('Failed to delete flow definition', {
        error: error.message,
        uuid,
        account_id: accountId,
        user_id: userId,
      });
      throw error;
    }
  }

  static formatFlow(flow) {
    return {
      uuid: flow.uuid,
      account_id: flow.account_id,
      name: flow.name,
      description: flow.description,
      definition_json:
        typeof flow.definition_json === 'string'
          ? JSON.parse(flow.definition_json)
          : flow.definition_json,
      version: flow.version,
      revision: flow.revision,
      status: flow.status,
      is_active: flow.is_active,
      created_by: flow.created_by,
      updated_by: flow.updated_by,
      created_at: flow.created_at,
      updated_at: flow.updated_at,
    };
  }
}

export default FlowDefinition;

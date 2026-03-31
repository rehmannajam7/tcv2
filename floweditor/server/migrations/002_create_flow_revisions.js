export const up = async knex => {
  return knex.schema.createTable('flow_revisions', table => {
    table.string('uuid', 36).primary();
    table
      .string('flow_definition_uuid', 36)
      .notNullable()
      .references('uuid')
      .inTable('flow_definitions')
      .onDelete('CASCADE');
    table.integer('revision_number').notNullable();
    table.text('definition_json').notNullable(); // SQLite doesn't have native JSON type
    table.string('version').notNullable();
    table.text('change_summary');
    table.string('created_by', 36).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['flow_definition_uuid', 'revision_number']);
    table.index(['flow_definition_uuid', 'created_at']);
    table.index(['created_by']);

    // Unique constraint for revision number per flow
    table.unique(['flow_definition_uuid', 'revision_number']);
  });
};

export const down = async knex => {
  return knex.schema.dropTable('flow_revisions');
};

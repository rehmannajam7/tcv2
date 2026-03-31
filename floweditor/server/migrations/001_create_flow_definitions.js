export const up = async knex => {
  return knex.schema.createTable('flow_definitions', table => {
    table.string('uuid', 36).primary();
    table
      .integer('account_id')
      .notNullable()
      .index();
    table.string('name').notNullable();
    table.text('description');
    table.text('definition_json').notNullable(); // SQLite doesn't have native JSON type
    table
      .string('version')
      .notNullable()
      .defaultTo('1.0.0');
    table
      .integer('revision')
      .notNullable()
      .defaultTo(1);
    table
      .boolean('is_active')
      .notNullable()
      .defaultTo(true);
    table
      .string('status')
      .notNullable()
      .defaultTo('draft'); // draft, published, archived
    table.string('created_by', 36).notNullable();
    table.string('updated_by', 36).notNullable();
    table.timestamps(true, true);

    // Indexes for performance
    table.index(['account_id', 'is_active']);
    table.index(['account_id', 'status']);
    table.index(['created_by']);
    table.index(['updated_by']);

    // Unique constraint for name per account
    table.unique(['account_id', 'name']);
  });
};

export const down = async knex => {
  return knex.schema.dropTable('flow_definitions');
};

import knex from 'knex';
import knexConfig from '../../knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

// Create database instance but don't initialize connection
// This FlowEditor server acts as a proxy to Chatwoot, so we don't need direct DB access
const db = knex(config);

// Add query logging for debugging (only when database is actually used)
db.on('query', queryData => {
  console.log('🔍 SQL Query:', queryData.sql);
  console.log('🔍 Bindings:', queryData.bindings);
});

// Skip database connection test since we're operating as a proxy
console.log('ℹ️  FlowEditor server running in proxy mode - database connection test skipped');

export default db;

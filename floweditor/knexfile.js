// knexfile.js
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './dev.sqlite3',
    },
    migrations: {
      directory: './migrations',
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: './seeds',
    },
    useNullAsDefault: true,
  },

  test: {
    client: 'sqlite3',
    connection: ':memory:',
    migrations: {
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
    useNullAsDefault: true,
  },

  production: {
    client: 'postgresql',
    connection: {
      database: process.env.DATABASE_NAME || 'floweditor',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || '',
      host: process.env.DATABASE_HOST || 'localhost',
      port: process.env.DATABASE_PORT || 5432,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
};

#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { Client } = require('pg');
const { MongoClient } = require('mongodb');
const { createClient } = require('redis');

class DatabaseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'database-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.pgClient = null;
    this.mongoClient = null;
    this.redisClient = null;

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'postgresql_query',
            description: 'Execute PostgreSQL queries for the DaorsAgro platform',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'SQL query to execute' },
                database_url: { type: 'string', description: 'PostgreSQL connection URL' },
              },
              required: ['query'],
            },
          },
          {
            name: 'mongodb_query',
            description: 'Execute MongoDB queries for the DaorsAgro platform',
            inputSchema: {
              type: 'object',
              properties: {
                collection: { type: 'string', description: 'MongoDB collection name' },
                operation: { type: 'string', enum: ['find', 'insertOne', 'updateOne', 'deleteOne'], description: 'MongoDB operation' },
                query: { type: 'object', description: 'Query/filter object' },
                data: { type: 'object', description: 'Data for insert/update operations' },
                mongodb_url: { type: 'string', description: 'MongoDB connection URL' },
              },
              required: ['collection', 'operation'],
            },
          },
          {
            name: 'redis_operation',
            description: 'Execute Redis operations for the DaorsAgro platform',
            inputSchema: {
              type: 'object',
              properties: {
                operation: { type: 'string', enum: ['get', 'set', 'del', 'keys', 'hget', 'hset'], description: 'Redis operation' },
                key: { type: 'string', description: 'Redis key' },
                value: { type: 'string', description: 'Value for set operations' },
                field: { type: 'string', description: 'Field for hash operations' },
                redis_url: { type: 'string', description: 'Redis connection URL' },
              },
              required: ['operation', 'key'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'postgresql_query':
            return await this.handlePostgreSQLQuery(args);
          case 'mongodb_query':
            return await this.handleMongoDBQuery(args);
          case 'redis_operation':
            return await this.handleRedisOperation(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    });
  }

  async handlePostgreSQLQuery(args) {
    const { query, database_url } = args;
    const url = database_url || process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/daorsagro';

    try {
      if (!this.pgClient) {
        this.pgClient = new Client({ connectionString: url });
        await this.pgClient.connect();
      }

      const result = await this.pgClient.query(query);
      return {
        content: [
          {
            type: 'text',
            text: `PostgreSQL Query Result:\n${JSON.stringify(result.rows, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`PostgreSQL query failed: ${error.message}`);
    }
  }

  async handleMongoDBQuery(args) {
    const { collection, operation, query = {}, data, mongodb_url } = args;
    const url = mongodb_url || process.env.MONGODB_URL || 'mongodb://localhost:27017/daorsagro';

    try {
      if (!this.mongoClient) {
        this.mongoClient = new MongoClient(url);
        await this.mongoClient.connect();
      }

      const db = this.mongoClient.db();
      const coll = db.collection(collection);

      let result;
      switch (operation) {
        case 'find':
          result = await coll.find(query).toArray();
          break;
        case 'insertOne':
          result = await coll.insertOne(data || query);
          break;
        case 'updateOne':
          result = await coll.updateOne(query, { $set: data });
          break;
        case 'deleteOne':
          result = await coll.deleteOne(query);
          break;
        default:
          throw new Error(`Unsupported MongoDB operation: ${operation}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `MongoDB ${operation} Result:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`MongoDB operation failed: ${error.message}`);
    }
  }

  async handleRedisOperation(args) {
    const { operation, key, value, field, redis_url } = args;
    const url = redis_url || process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      if (!this.redisClient) {
        this.redisClient = createClient({ url });
        await this.redisClient.connect();
      }

      let result;
      switch (operation) {
        case 'get':
          result = await this.redisClient.get(key);
          break;
        case 'set':
          result = await this.redisClient.set(key, value);
          break;
        case 'del':
          result = await this.redisClient.del(key);
          break;
        case 'keys':
          result = await this.redisClient.keys(key);
          break;
        case 'hget':
          result = await this.redisClient.hGet(key, field);
          break;
        case 'hset':
          result = await this.redisClient.hSet(key, field, value);
          break;
        default:
          throw new Error(`Unsupported Redis operation: ${operation}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Redis ${operation} Result: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Redis operation failed: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Database MCP Server running on stdio');
  }

  async cleanup() {
    if (this.pgClient) {
      await this.pgClient.end();
    }
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down Database MCP Server...');
  if (global.serverInstance) {
    await global.serverInstance.cleanup();
  }
  process.exit(0);
});

async function main() {
  const server = new DatabaseMCPServer();
  global.serverInstance = server;
  await server.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start Database MCP Server:', error);
    process.exit(1);
  });
}

module.exports = DatabaseMCPServer;
#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

class FilesystemMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'filesystem-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.projectRoot = process.cwd();
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'read_file',
            description: 'Read the contents of a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the file to read' },
                encoding: { type: 'string', default: 'utf8', description: 'File encoding' },
              },
              required: ['path'],
            },
          },
          {
            name: 'write_file',
            description: 'Write content to a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the file to write' },
                content: { type: 'string', description: 'Content to write to the file' },
                encoding: { type: 'string', default: 'utf8', description: 'File encoding' },
              },
              required: ['path', 'content'],
            },
          },
          {
            name: 'list_directory',
            description: 'List contents of a directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the directory to list' },
                recursive: { type: 'boolean', default: false, description: 'Whether to list recursively' },
              },
              required: ['path'],
            },
          },
          {
            name: 'create_directory',
            description: 'Create a new directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path of the directory to create' },
                recursive: { type: 'boolean', default: true, description: 'Whether to create parent directories' },
              },
              required: ['path'],
            },
          },
          {
            name: 'delete_file',
            description: 'Delete a file or directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the file/directory to delete' },
                recursive: { type: 'boolean', default: false, description: 'Whether to delete recursively' },
              },
              required: ['path'],
            },
          },
          {
            name: 'search_files',
            description: 'Search for files matching a pattern',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: { type: 'string', description: 'Glob pattern to match files' },
                cwd: { type: 'string', description: 'Current working directory for search' },
              },
              required: ['pattern'],
            },
          },
          {
            name: 'grep_search',
            description: 'Search for text content in files',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: { type: 'string', description: 'Regex pattern to search for' },
                path: { type: 'string', description: 'Path to search in' },
                include: { type: 'string', description: 'File pattern to include' },
                exclude: { type: 'string', description: 'File pattern to exclude' },
              },
              required: ['pattern'],
            },
          },
          {
            name: 'get_file_info',
            description: 'Get information about a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the file' },
              },
              required: ['path'],
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
          case 'read_file':
            return await this.handleReadFile(args);
          case 'write_file':
            return await this.handleWriteFile(args);
          case 'list_directory':
            return await this.handleListDirectory(args);
          case 'create_directory':
            return await this.handleCreateDirectory(args);
          case 'delete_file':
            return await this.handleDeleteFile(args);
          case 'search_files':
            return await this.handleSearchFiles(args);
          case 'grep_search':
            return await this.handleGrepSearch(args);
          case 'get_file_info':
            return await this.handleGetFileInfo(args);
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

  async handleReadFile(args) {
    const { path: filePath, encoding = 'utf8' } = args;
    const fullPath = path.resolve(this.projectRoot, filePath);

    // Security check - ensure path is within project root
    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    const content = await fs.readFile(fullPath, encoding);
    return {
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
    };
  }

  async handleWriteFile(args) {
    const { path: filePath, content, encoding = 'utf8' } = args;
    const fullPath = path.resolve(this.projectRoot, filePath);

    // Security check - ensure path is within project root
    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    await fs.writeFile(fullPath, content, encoding);
    return {
      content: [
        {
          type: 'text',
          text: `File written successfully: ${filePath}`,
        },
      ],
    };
  }

  async handleListDirectory(args) {
    const { path: dirPath, recursive = false } = args;
    const fullPath = path.resolve(this.projectRoot, dirPath);

    // Security check - ensure path is within project root
    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    const items = recursive
      ? await this.listDirectoryRecursive(fullPath)
      : await fs.readdir(fullPath);

    const result = items.map(item => {
      const itemPath = recursive ? item : path.join(dirPath, item);
      return {
        name: recursive ? path.relative(fullPath, item) : item,
        path: itemPath,
        type: 'file', // We'll determine this in a more sophisticated way if needed
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async listDirectoryRecursive(dirPath) {
    const items = [];

    async function scan(currentPath) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        items.push(fullPath);

        if (entry.isDirectory()) {
          await scan(fullPath);
        }
      }
    }

    await scan(dirPath);
    return items;
  }

  async handleCreateDirectory(args) {
    const { path: dirPath, recursive = true } = args;
    const fullPath = path.resolve(this.projectRoot, dirPath);

    // Security check - ensure path is within project root
    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    await fs.mkdir(fullPath, { recursive });
    return {
      content: [
        {
          type: 'text',
          text: `Directory created successfully: ${dirPath}`,
        },
      ],
    };
  }

  async handleDeleteFile(args) {
    const { path: filePath, recursive = false } = args;
    const fullPath = path.resolve(this.projectRoot, filePath);

    // Security check - ensure path is within project root
    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      await fs.rmdir(fullPath, { recursive });
    } else {
      await fs.unlink(fullPath);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Deleted successfully: ${filePath}`,
        },
      ],
    };
  }

  async handleSearchFiles(args) {
    const { pattern, cwd = this.projectRoot } = args;
    const fullCwd = path.resolve(this.projectRoot, cwd);

    // Security check - ensure path is within project root
    if (!fullCwd.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    const files = await glob(pattern, { cwd: fullCwd, absolute: true });
    const relativeFiles = files.map(file => path.relative(this.projectRoot, file));

    return {
      content: [
        {
          type: 'text',
          text: `Found ${files.length} files:\n${relativeFiles.join('\n')}`,
        },
      ],
    };
  }

  async handleGrepSearch(args) {
    const { pattern, path: searchPath = '.', include, exclude } = args;
    const fullPath = path.resolve(this.projectRoot, searchPath);

    // Security check - ensure path is within project root
    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    // This is a simplified grep implementation
    // In a real implementation, you'd use a proper grep library or tool
    const results = await this.simpleGrep(fullPath, pattern, include, exclude);

    return {
      content: [
        {
          type: 'text',
          text: `Search results for "${pattern}":\n${results.join('\n')}`,
        },
      ],
    };
  }

  async simpleGrep(dirPath, pattern, include, exclude) {
    const results = [];
    const regex = new RegExp(pattern, 'g');

    async function search(currentPath) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await search(fullPath);
        } else {
          // Check include/exclude patterns
          const relativePath = path.relative(dirPath, fullPath);

          if (include && !relativePath.match(new RegExp(include))) continue;
          if (exclude && relativePath.match(new RegExp(exclude))) continue;

          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
              if (regex.test(line)) {
                results.push(`${relativePath}:${index + 1}:${line.trim()}`);
              }
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }

    await search(dirPath);
    return results;
  }

  async handleGetFileInfo(args) {
    const { path: filePath } = args;
    const fullPath = path.resolve(this.projectRoot, filePath);

    // Security check - ensure path is within project root
    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    const stats = await fs.stat(fullPath);
    const info = {
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      permissions: stats.mode.toString(8),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Filesystem MCP Server running on stdio');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down Filesystem MCP Server...');
  process.exit(0);
});

async function main() {
  const server = new FilesystemMCPServer();
  await server.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start Filesystem MCP Server:', error);
    process.exit(1);
  });
}

module.exports = FilesystemMCPServer;
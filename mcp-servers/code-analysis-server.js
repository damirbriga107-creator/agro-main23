#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

class CodeAnalysisMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'code-analysis-server',
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
            name: 'analyze_typescript_file',
            description: 'Analyze a TypeScript/JavaScript file for structure and patterns',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the TypeScript/JavaScript file' },
              },
              required: ['path'],
            },
          },
          {
            name: 'find_functions',
            description: 'Find all function definitions in a file or directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to file or directory to analyze' },
                pattern: { type: 'string', description: 'Function name pattern to search for' },
              },
              required: ['path'],
            },
          },
          {
            name: 'find_classes',
            description: 'Find all class definitions in a file or directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to file or directory to analyze' },
                pattern: { type: 'string', description: 'Class name pattern to search for' },
              },
              required: ['path'],
            },
          },
          {
            name: 'analyze_dependencies',
            description: 'Analyze package.json dependencies and their usage',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', default: '.', description: 'Path to directory containing package.json' },
              },
            },
          },
          {
            name: 'find_todo_comments',
            description: 'Find TODO and FIXME comments in the codebase',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', default: '.', description: 'Path to search in' },
              },
            },
          },
          {
            name: 'analyze_code_quality',
            description: 'Analyze code quality metrics for a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the file to analyze' },
              },
              required: ['path'],
            },
          },
          {
            name: 'find_duplicate_code',
            description: 'Find potential code duplication in the project',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', default: '.', description: 'Path to search in' },
                min_lines: { type: 'number', default: 6, description: 'Minimum lines for duplication detection' },
              },
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
          case 'analyze_typescript_file':
            return await this.handleAnalyzeTypeScriptFile(args);
          case 'find_functions':
            return await this.handleFindFunctions(args);
          case 'find_classes':
            return await this.handleFindClasses(args);
          case 'analyze_dependencies':
            return await this.handleAnalyzeDependencies(args);
          case 'find_todo_comments':
            return await this.handleFindTodoComments(args);
          case 'analyze_code_quality':
            return await this.handleAnalyzeCodeQuality(args);
          case 'find_duplicate_code':
            return await this.handleFindDuplicateCode(args);
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

  async handleAnalyzeTypeScriptFile(args) {
    const { path: filePath } = args;
    const fullPath = path.resolve(this.projectRoot, filePath);

    // Security check
    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    const content = await fs.readFile(fullPath, 'utf8');
    const analysis = this.analyzeTypeScriptContent(content, filePath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  analyzeTypeScriptContent(content, filePath) {
    const lines = content.split('\n');
    const analysis = {
      file: filePath,
      totalLines: lines.length,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      complexity: 0,
    };

    let inMultilineComment = false;
    let braceDepth = 0;
    let complexity = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const originalLine = lines[i];

      // Count different line types
      if (line === '') {
        analysis.blankLines++;
      } else if (line.startsWith('//') || (line.startsWith('/*') && line.endsWith('*/'))) {
        analysis.commentLines++;
      } else if (line.startsWith('/*') && !line.endsWith('*/')) {
        analysis.commentLines++;
        inMultilineComment = true;
      } else if (inMultilineComment && line.endsWith('*/')) {
        analysis.commentLines++;
        inMultilineComment = false;
      } else if (inMultilineComment) {
        analysis.commentLines++;
      } else {
        analysis.codeLines++;

        // Analyze code patterns
        if (line.includes('function') || line.includes('=>') || line.includes('const') || line.includes('let')) {
          const funcMatch = line.match(/(?:function\s+|const\s+|let\s+|var\s+)(\w+)/);
          if (funcMatch) {
            analysis.functions.push({
              name: funcMatch[1],
              line: i + 1,
              type: line.includes('function') ? 'function' : 'arrow/lambda',
            });
          }
        }

        if (line.includes('class ')) {
          const classMatch = line.match(/class\s+(\w+)/);
          if (classMatch) {
            analysis.classes.push({
              name: classMatch[1],
              line: i + 1,
            });
          }
        }

        if (line.startsWith('import ')) {
          analysis.imports.push({
            statement: line,
            line: i + 1,
          });
        }

        if (line.startsWith('export ')) {
          analysis.exports.push({
            statement: line,
            line: i + 1,
          });
        }

        // Calculate complexity
        if (line.includes('if ') || line.includes('else') || line.includes('for ') ||
            line.includes('while ') || line.includes('case ') || line.includes('catch') ||
            line.includes('&&') || line.includes('||')) {
          complexity++;
        }

        // Track brace depth for complexity
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        braceDepth += openBraces - closeBraces;
      }
    }

    analysis.complexity = complexity;
    return analysis;
  }

  async handleFindFunctions(args) {
    const { path: searchPath, pattern = '' } = args;
    const fullPath = path.resolve(this.projectRoot, searchPath);

    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    const functions = await this.findInFiles(fullPath, /(?:function\s+|const\s+|let\s+|var\s+)(\w+)\s*[=:\(]/g, pattern);

    return {
      content: [
        {
          type: 'text',
          text: `Found ${functions.length} functions:\n${functions.map(f => `${f.file}:${f.line}:${f.match}`).join('\n')}`,
        },
      ],
    };
  }

  async handleFindClasses(args) {
    const { path: searchPath, pattern = '' } = args;
    const fullPath = path.resolve(this.projectRoot, searchPath);

    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    const classes = await this.findInFiles(fullPath, /class\s+(\w+)/g, pattern);

    return {
      content: [
        {
          type: 'text',
          text: `Found ${classes.length} classes:\n${classes.map(c => `${c.file}:${c.line}:${c.match}`).join('\n')}`,
        },
      ],
    };
  }

  async findInFiles(searchPath, regex, namePattern = '') {
    const results = [];
    const files = await glob('**/*.{ts,js,tsx,jsx}', { cwd: searchPath, absolute: true });

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(this.projectRoot, file);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let match;
          regex.lastIndex = 0; // Reset regex state

          while ((match = regex.exec(line)) !== null) {
            const matchedName = match[1] || match[0];
            if (!namePattern || matchedName.includes(namePattern)) {
              results.push({
                file: relativePath,
                line: i + 1,
                match: matchedName,
                fullMatch: match[0],
              });
            }
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return results;
  }

  async handleAnalyzeDependencies(args) {
    const { path: dirPath = '.' } = args;
    const fullPath = path.resolve(this.projectRoot, dirPath);
    const packageJsonPath = path.join(fullPath, 'package.json');

    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const analysis = {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        totalDeps: (packageJson.dependencies ? Object.keys(packageJson.dependencies).length : 0) +
                  (packageJson.devDependencies ? Object.keys(packageJson.devDependencies).length : 0),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to analyze package.json: ${error.message}`);
    }
  }

  async handleFindTodoComments(args) {
    const { path: searchPath = '.' } = args;
    const fullPath = path.resolve(this.projectRoot, searchPath);

    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    const todos = await this.findInFiles(fullPath, /(?:\/\/|\/\*\*?|\*)\s*(TODO|FIXME|XXX|HACK)/gi);

    return {
      content: [
        {
          type: 'text',
          text: `Found ${todos.length} TODO comments:\n${todos.map(t => `${t.file}:${t.line}:${t.fullMatch}`).join('\n')}`,
        },
      ],
    };
  }

  async handleAnalyzeCodeQuality(args) {
    const { path: filePath } = args;
    const analysis = await this.handleAnalyzeTypeScriptFile(args);

    const quality = {
      file: filePath,
      score: this.calculateQualityScore(analysis.content[0].text),
      issues: this.identifyQualityIssues(analysis.content[0].text),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(quality, null, 2),
        },
      ],
    };
  }

  calculateQualityScore(analysisJson) {
    try {
      const analysis = JSON.parse(analysisJson);
      let score = 100;

      // Deduct points for various issues
      if (analysis.complexity > 20) score -= 20;
      if (analysis.functions.length > 10) score -= 10; // Too many functions in one file
      if (analysis.commentLines / analysis.totalLines < 0.1) score -= 15; // Low comment ratio
      if (analysis.codeLines > 500) score -= 10; // File too long

      return Math.max(0, score);
    } catch (error) {
      return 0;
    }
  }

  identifyQualityIssues(analysisJson) {
    try {
      const analysis = JSON.parse(analysisJson);
      const issues = [];

      if (analysis.complexity > 20) {
        issues.push('High cyclomatic complexity - consider breaking down into smaller functions');
      }
      if (analysis.functions.length > 10) {
        issues.push('Too many functions in one file - consider splitting into multiple files');
      }
      if (analysis.commentLines / analysis.totalLines < 0.1) {
        issues.push('Low comment ratio - add more documentation');
      }
      if (analysis.codeLines > 500) {
        issues.push('File is too long - consider splitting into multiple files');
      }

      return issues;
    } catch (error) {
      return ['Unable to analyze file'];
    }
  }

  async handleFindDuplicateCode(args) {
    const { path: searchPath = '.', min_lines = 6 } = args;
    const fullPath = path.resolve(this.projectRoot, searchPath);

    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: Path outside project root');
    }

    // Simplified duplicate detection - in a real implementation, you'd use a proper code analysis tool
    const duplicates = await this.simpleDuplicateDetection(fullPath, min_lines);

    return {
      content: [
        {
          type: 'text',
          text: `Found ${duplicates.length} potential duplicate code blocks:\n${duplicates.join('\n')}`,
        },
      ],
    };
  }

  async simpleDuplicateDetection(searchPath, minLines) {
    const files = await glob('**/*.{ts,js,tsx,jsx}', { cwd: searchPath, absolute: true });
    const codeBlocks = [];
    const duplicates = [];

    // Extract code blocks from each file
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(this.projectRoot, file);

        for (let i = 0; i <= lines.length - minLines; i++) {
          const block = lines.slice(i, i + minLines).join('\n').trim();
          if (block.length > 50) { // Only consider substantial blocks
            codeBlocks.push({
              file: relativePath,
              startLine: i + 1,
              content: block,
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Find duplicates (simplified approach)
    for (let i = 0; i < codeBlocks.length; i++) {
      for (let j = i + 1; j < codeBlocks.length; j++) {
        if (this.calculateSimilarity(codeBlocks[i].content, codeBlocks[j].content) > 0.8) {
          duplicates.push(
            `Duplicate found:\n  ${codeBlocks[i].file}:${codeBlocks[i].startLine}\n  ${codeBlocks[j].file}:${codeBlocks[j].startLine}`
          );
        }
      }
    }

    return duplicates;
  }

  calculateSimilarity(str1, str2) {
    // Simple similarity calculation - in practice, you'd use a more sophisticated algorithm
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Code Analysis MCP Server running on stdio');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down Code Analysis MCP Server...');
  process.exit(0);
});

async function main() {
  const server = new CodeAnalysisMCPServer();
  await server.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start Code Analysis MCP Server:', error);
    process.exit(1);
  });
}

module.exports = CodeAnalysisMCPServer;
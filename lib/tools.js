import fs from 'node:fs/promises';
import path from 'node:path';

export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Reads the content of a file.",
      parameters: {
        type: "object",
        properties: {
          filepath: {
            type: "string",
            description: "The path of the file to read, relative to the workspace."
          }
        },
        required: ["filepath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Writes content to a file. Creates the parent directories if they don't exist.",
      parameters: {
        type: "object",
        properties: {
          filepath: {
            type: "string",
            description: "The path of the file to write, relative to the workspace."
          },
          content: {
            type: "string",
            description: "The complete content to write to the file."
          }
        },
        required: ["filepath", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "Lists the child files and directories in a directory.",
      parameters: {
        type: "object",
        properties: {
          dirpath: {
            type: "string",
            description: "The directory path to list, relative to the workspace. Use '.' for the root."
          }
        },
        required: ["dirpath"]
      }
    }
  }
];

function sanitizePath(baseDir, requestPath) {
  // Normalize path and prevent directory traversal
  const normalizedBase = path.normalize(baseDir);
  const normalizedTarget = path.normalize(path.join(baseDir, requestPath));
  
  if (!normalizedTarget.startsWith(normalizedBase)) {
    throw new Error(`Directory traversal blocked: unauthorized path ${requestPath}`);
  }
  
  return normalizedTarget;
}

export async function executeToolCall(toolCall, workspaceDir = path.join(process.cwd(), 'workdir')) {
  // Ensure the workspace exists
  await fs.mkdir(workspaceDir, { recursive: true });

  const functionName = toolCall.function.name;
  let args;
  
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch (err) {
    return `Error parsing arguments for ${functionName}: ${err.message}`;
  }

  try {
    if (functionName === 'read_file') {
      const targetPath = sanitizePath(workspaceDir, args.filepath);
      const content = await fs.readFile(targetPath, 'utf8');
      return content;
      
    } else if (functionName === 'write_file') {
      const targetPath = sanitizePath(workspaceDir, args.filepath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, args.content, 'utf8');
      return `Successfully wrote to ${args.filepath}`;
      
    } else if (functionName === 'list_dir') {
      const targetPath = sanitizePath(workspaceDir, args.dirpath);
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const format = entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\\n');
      return format || '(empty directory)';
      
    } else {
      return `Error: Unknown function name '${functionName}'`;
    }
  } catch (error) {
    return `Error executing ${functionName}: ${error.message}`;
  }
}

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  githubCreateIssue,
  githubListIssues,
  githubAddComment,
  jiraCreateIssue,
  jiraListIssues,
  jiraAddComment
} from './integrations.js';

export const TOOL_SCHEMAS = [
  // ─── Filesystem Tools ─────────────────────────────────────────────────────
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
  },

  // ─── GitHub Tools ─────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "github_create_issue",
      description: "Creates a new GitHub issue in the specified repository.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "GitHub repository owner (org or user)." },
          repo: { type: "string", description: "GitHub repository name." },
          title: { type: "string", description: "Issue title." },
          body: { type: "string", description: "Issue body/description in Markdown." },
          labels: { type: "array", items: { type: "string" }, description: "Optional list of label names." }
        },
        required: ["owner", "repo", "title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "github_list_issues",
      description: "Lists open or closed issues in a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "GitHub repository owner." },
          repo: { type: "string", description: "GitHub repository name." },
          state: { type: "string", enum: ["open", "closed", "all"], description: "Filter by issue state." },
          limit: { type: "number", description: "Max number of issues to return (default 10)." }
        },
        required: ["owner", "repo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "github_add_comment",
      description: "Adds a comment to an existing GitHub issue.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "GitHub repository owner." },
          repo: { type: "string", description: "GitHub repository name." },
          issue_number: { type: "number", description: "The issue number to comment on." },
          body: { type: "string", description: "Comment body in Markdown." }
        },
        required: ["owner", "repo", "issue_number", "body"]
      }
    }
  },

  // ─── Jira Tools ──────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "jira_create_issue",
      description: "Creates a new issue/ticket in a Jira project.",
      parameters: {
        type: "object",
        properties: {
          project: { type: "string", description: "Jira project key (e.g. 'GT'). Falls back to JIRA_DEFAULT_PROJECT env var." },
          summary: { type: "string", description: "Issue summary / title." },
          description: { type: "string", description: "Issue description." },
          issue_type: { type: "string", enum: ["Task", "Bug", "Story", "Epic"], description: "Issue type (default: Task)." },
          priority: { type: "string", enum: ["Highest", "High", "Medium", "Low", "Lowest"], description: "Priority (default: Medium)." }
        },
        required: ["summary"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "jira_list_issues",
      description: "Lists issues from a Jira project, optionally filtered by status.",
      parameters: {
        type: "object",
        properties: {
          project: { type: "string", description: "Jira project key. Falls back to JIRA_DEFAULT_PROJECT." },
          status: { type: "string", description: "Filter by status name (e.g. 'In Progress', 'Done')." },
          limit: { type: "number", description: "Max results to return (default 10)." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "jira_add_comment",
      description: "Adds a comment to an existing Jira issue.",
      parameters: {
        type: "object",
        properties: {
          issue_key: { type: "string", description: "The Jira issue key (e.g. 'GT-42')." },
          body: { type: "string", description: "Comment text." }
        },
        required: ["issue_key", "body"]
      }
    }
  }
];

// ─── Path Sanitization ────────────────────────────────────────────────────────

function sanitizePath(baseDir, requestPath) {
  const normalizedBase = path.normalize(baseDir);
  const normalizedTarget = path.normalize(path.join(baseDir, requestPath));
  
  if (!normalizedTarget.startsWith(normalizedBase)) {
    throw new Error(`Directory traversal blocked: unauthorized path ${requestPath}`);
  }
  
  return normalizedTarget;
}

// ─── Unified Tool Executor ────────────────────────────────────────────────────

const FALLBACK_WORKDIR = process.env.WORKDIR || (process.env.VERCEL ? "/tmp/agentic-workdir" : path.join(process.cwd(), 'workdir'));

export async function executeToolCall(toolCall, workspaceDir = FALLBACK_WORKDIR) {
  try {
    await fs.mkdir(workspaceDir, { recursive: true });
  } catch (err) {
    return `Workspace not available: ${err.message}`;
  }

  const functionName = toolCall.function.name;
  let args;
  
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch (err) {
    return `Error parsing arguments for ${functionName}: ${err.message}`;
  }

  try {
    // ── Filesystem Tools ──
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

    // ── GitHub Tools ──
    } else if (functionName === 'github_create_issue') {
      const result = await githubCreateIssue(args);
      return `Created GitHub issue #${result.number}: ${result.url}`;

    } else if (functionName === 'github_list_issues') {
      const issues = await githubListIssues(args);
      if (!issues.length) return 'No issues found.';
      return issues.map(i => `#${i.number} [${i.state}] ${i.title} — ${i.url}`).join('\n');

    } else if (functionName === 'github_add_comment') {
      const result = await githubAddComment(args);
      return `Comment posted: ${result.url}`;

    // ── Jira Tools ──
    } else if (functionName === 'jira_create_issue') {
      const result = await jiraCreateIssue(args);
      return `Created Jira issue ${result.key}: ${result.url}`;

    } else if (functionName === 'jira_list_issues') {
      const issues = await jiraListIssues(args);
      if (!issues.length) return 'No issues found.';
      return issues.map(i => `${i.key} [${i.status}] ${i.summary} — ${i.url}`).join('\n');

    } else if (functionName === 'jira_add_comment') {
      const result = await jiraAddComment(args);
      return `Comment added (ID: ${result.id})`;

    } else {
      return `Error: Unknown function name '${functionName}'`;
    }
  } catch (error) {
    return `Error executing ${functionName}: ${error.message}`;
  }
}

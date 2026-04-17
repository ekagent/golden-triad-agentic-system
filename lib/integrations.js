/**
 * lib/integrations.js
 * 
 * Two responsibilities:
 *  1. Integration Registry — used by catalog.js, storage.js, cache.js, health.js
 *     to check which integrations are configured and surface their credentials.
 *  2. API Execution Layer — GitHub + Jira REST clients for omnichannel tool use.
 */

// ─── Integration Registry ─────────────────────────────────────────────────────

const REGISTRY = [
  {
    id: "postgres",
    label: "PostgreSQL",
    description: "Primary persistence layer for runs history.",
    envKeys: ["DATABASE_URL"],
    get configured() { return Boolean(process.env.DATABASE_URL); },
    get secretValue() { return process.env.DATABASE_URL; }
  },
  {
    id: "redis",
    label: "Redis",
    description: "Optional response cache layer.",
    envKeys: ["REDIS_URL"],
    get configured() { return Boolean(process.env.REDIS_URL); },
    get secretValue() { return process.env.REDIS_URL; }
  },
  {
    id: "glm",
    label: "GLM (Zhipu AI)",
    description: "Primary direct LLM provider.",
    envKeys: ["GLM_API_KEY"],
    get configured() { return Boolean(process.env.GLM_API_KEY); },
    get baseUrl() { return process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4"; },
    get secretValue() { return process.env.GLM_API_KEY; }
  },
  {
    id: "memo",
    label: "Memo / MiMo",
    description: "Secondary direct LLM provider.",
    envKeys: ["MEMO_API_KEY", "MIMO_API_KEY"],
    get configured() { return Boolean(process.env.MEMO_API_KEY || process.env.MIMO_API_KEY); },
    get baseUrl() { return process.env.MEMO_BASE_URL || process.env.MIMO_BASE_URL || "https://api.mimo.ai/v1"; },
    get secretValue() { return process.env.MEMO_API_KEY || process.env.MIMO_API_KEY; }
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Fallback multi-model gateway.",
    envKeys: ["OPENROUTER_API_KEY"],
    get configured() { return Boolean(process.env.OPENROUTER_API_KEY); },
    get baseUrl() { return process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"; },
    get secretValue() { return process.env.OPENROUTER_API_KEY; }
  },
  {
    id: "minimax",
    label: "MiniMax",
    description: "Optional direct LLM provider.",
    envKeys: ["MINIMAX_API_KEY"],
    get configured() { return Boolean(process.env.MINIMAX_API_KEY); },
    get baseUrl() { return process.env.MINIMAX_BASE_URL || "https://api.minimax.chat/v1"; },
    get secretValue() { return process.env.MINIMAX_API_KEY; }
  },
  {
    id: "github",
    label: "GitHub",
    description: "Omnichannel: create issues, list repos, post comments.",
    envKeys: ["GITHUB_PERSONAL_TOKEN"],
    get configured() { return Boolean(process.env.GITHUB_PERSONAL_TOKEN); }
  },
  {
    id: "jira",
    label: "Jira",
    description: "Omnichannel: create tickets, update statuses, add comments.",
    envKeys: ["JIRA_API_TOKEN"],
    get configured() { return Boolean(process.env.JIRA_API_TOKEN && process.env.JIRA_HOST && process.env.JIRA_EMAIL); }
  }
];

export function getIntegrationConfig(id) {
  const entry = REGISTRY.find((r) => r.id === id);
  if (!entry) return { id, configured: false };
  return entry;
}

export function listIntegrationRegistry() {
  return REGISTRY;
}

// ─── GitHub API ───────────────────────────────────────────────────────────────

const GITHUB_API_BASE = "https://api.github.com";

function githubHeaders() {
  const token = process.env.GITHUB_PERSONAL_TOKEN;
  if (!token) throw new Error("GITHUB_PERSONAL_TOKEN is not configured.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

export async function githubCreateIssue({ owner, repo, title, body = "", labels = [] }) {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({ title, body, labels })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub createIssue failed: ${res.status} ${err.message || ""}`);
  }
  const data = await res.json();
  return { number: data.number, url: data.html_url, title: data.title };
}

export async function githubListIssues({ owner, repo, state = "open", limit = 10 }) {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=${state}&per_page=${limit}`, {
    headers: githubHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub listIssues failed: ${res.status} ${err.message || ""}`);
  }
  const data = await res.json();
  return data.map((i) => ({ number: i.number, title: i.title, url: i.html_url, state: i.state }));
}

export async function githubAddComment({ owner, repo, issue_number, body }) {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issue_number}/comments`, {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({ body })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub addComment failed: ${res.status} ${err.message || ""}`);
  }
  const data = await res.json();
  return { id: data.id, url: data.html_url };
}

// ─── Jira API ─────────────────────────────────────────────────────────────────

function jiraHeaders() {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const host = process.env.JIRA_HOST;
  if (!email || !token || !host) {
    throw new Error("Jira credentials not configured. Set JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN.");
  }
  return {
    Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}

function jiraBase() {
  const host = process.env.JIRA_HOST;
  if (!host) throw new Error("JIRA_HOST is not configured.");
  return `https://${host}/rest/api/3`;
}

export async function jiraCreateIssue({ project, summary, description = "", issue_type = "Task", priority = "Medium" }) {
  const projectKey = project || process.env.JIRA_DEFAULT_PROJECT;
  if (!projectKey) throw new Error("Jira project key not provided and JIRA_DEFAULT_PROJECT not set.");

  const res = await fetch(`${jiraBase()}/issue`, {
    method: "POST",
    headers: jiraHeaders(),
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary,
        description: {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: description }] }]
        },
        issuetype: { name: issue_type },
        priority: { name: priority }
      }
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Jira createIssue failed: ${res.status} ${JSON.stringify(err.errors || err)}`);
  }
  const data = await res.json();
  return {
    key: data.key,
    url: `https://${process.env.JIRA_HOST}/browse/${data.key}`,
    summary
  };
}

export async function jiraListIssues({ project, status, limit = 10 }) {
  const projectKey = project || process.env.JIRA_DEFAULT_PROJECT;
  if (!projectKey) throw new Error("Jira project key not provided.");

  const jql = status
    ? `project = "${projectKey}" AND status = "${status}" ORDER BY created DESC`
    : `project = "${projectKey}" ORDER BY created DESC`;

  const res = await fetch(`${jiraBase()}/search?jql=${encodeURIComponent(jql)}&maxResults=${limit}&fields=summary,status,priority,assignee`, {
    headers: jiraHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Jira listIssues failed: ${res.status} ${err.errorMessages?.join(", ") || ""}`);
  }
  const data = await res.json();
  return data.issues.map((i) => ({
    key: i.key,
    summary: i.fields.summary,
    status: i.fields.status?.name,
    priority: i.fields.priority?.name,
    url: `https://${process.env.JIRA_HOST}/browse/${i.key}`
  }));
}

export async function jiraAddComment({ issue_key, body }) {
  const res = await fetch(`${jiraBase()}/issue/${issue_key}/comment`, {
    method: "POST",
    headers: jiraHeaders(),
    body: JSON.stringify({
      body: {
        type: "doc",
        version: 1,
        content: [{ type: "paragraph", content: [{ type: "text", text: body }] }]
      }
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Jira addComment failed: ${res.status} ${err.errorMessages?.join(", ") || ""}`);
  }
  const data = await res.json();
  return { id: data.id };
}

// ─── Connection Health Checks ─────────────────────────────────────────────────

export async function checkGitHubConnection() {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/user`, { headers: githubHeaders() });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, login: data.login };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function checkJiraConnection() {
  try {
    const res = await fetch(`${jiraBase()}/myself`, { headers: jiraHeaders() });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, email: data.emailAddress, displayName: data.displayName };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

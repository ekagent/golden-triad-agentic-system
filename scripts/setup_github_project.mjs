import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'ekagent'; // Derived from your git remote
const REPO_NAME = 'golden-triad-agentic-system';

if (!GITHUB_TOKEN) {
  console.error("Error: Please export GITHUB_TOKEN environment variable.");
  console.error("Example: export GITHUB_TOKEN='ghp_xxx'");
  process.exit(1);
}

const issues = [
  // Epics
  { title: "Epic: [AUTON] Autonomous Execution Engine", body: "Enable agents to interact with the environment (FileSystem, Shell, Browser).", labels: ["epic"] },
  { title: "Epic: [MONY] Multi-User Monetization", body: "Infrastructure to scale to customers and accept payments.", labels: ["epic"] },
  { title: "Epic: [MEMY] Long-Term Project Memory", body: "Agents that 'remember' previous work and project architecture.", labels: ["epic"] },
  { title: "Epic: [ECOS] Omni-Ecosystem Integrations", body: "Enable seamless participation and data sync across GitHub, Atlassian, Trello, and Notion.", labels: ["epic"] },

  // AUTON Tasks
  { title: "AUTON-1: Implement Function Calling layer in Orchestrator", body: "Agents can output tool calls instead of only text.", labels: ["enhancement"] },
  { title: "AUTON-2: Filesystem Tool Integration", body: "Agents can read/write files in a sandboxed directory.", labels: ["enhancement"] },
  { title: "AUTON-3: Shell Execution (Node.js/Python)", body: "Builder agent can run code it generates to verify correctness.", labels: ["enhancement"] },
  
  // ECOS Tasks
  { title: "ECOS-1: Omni-Channel Task Management", body: "Agents can read/update tasks seamlessly across Jira, Trello, and GitHub Projects.", labels: ["enhancement"] },
  { title: "ECOS-2: Version Control & Review Automation", body: "Agents can create issues, draft PRs, and respond to code reviews.", labels: ["enhancement"] },
  { title: "ECOS-3: Cloud Development Environment (CDE)", body: "Execute code within GitHub Codespaces for isolated test logic.", labels: ["enhancement"] },
];

async function createIssue(issue) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(issue)
  });

  if (!res.ok) {
    console.error(`Failed to create issue: ${issue.title}`);
    console.error(await res.text());
  } else {
    const data = await res.json();
    console.log(`Created: ${data.html_url}`);
  }
}

async function main() {
  console.log("Setting up GitHub Issues...");
  for (const issue of issues) {
    await createIssue(issue);
    // Add brief delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("\\nDone! You can now map these to a GitHub Project Board (Kanban view).");
}

main();

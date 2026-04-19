// Agentic Coordination Layer Integration for Golden Triad
// Bridges the orchestrator with the cross-IDE coordination system
// Does NOT modify existing behavior - adds coordination on top

import fs from "fs";
import path from "path";
import os from "os";

let COORD_DIR;
try {
  // 1. Check for manual override
  // 2. Try home dir (default)
  // 3. Fallback to local project dir if others fail or aren't writable
  const homeCoord = path.join(os.homedir(), ".agentic-system", "coordination");
  COORD_DIR = process.env.AGENTIC_COORD_DIR || homeCoord;
} catch (e) {
  COORD_DIR = path.join(process.cwd(), ".coordination");
}

const LOCK_FILE = path.join(COORD_DIR, "LOCK");
const STATE_FILE = path.join(COORD_DIR, "STATE.md");
const CHANGES_FILE = path.join(COORD_DIR, "CHANGES.md");

function ensureCoordinationDir() {
  try {
    if (!fs.existsSync(COORD_DIR)) {
      fs.mkdirSync(COORD_DIR, { recursive: true });
    }
    
    // Initialize files if they don't exist
    if (!fs.existsSync(LOCK_FILE)) {
      fs.writeFileSync(LOCK_FILE, JSON.stringify({ version: "3.0.0", locks: [], history: [] }, null, 2));
    }
    if (!fs.existsSync(STATE_FILE)) {
      fs.writeFileSync(STATE_FILE, "# Agentic Coordination State\n\n## Current Task\n- Status: Idle\n");
    }
    if (!fs.existsSync(CHANGES_FILE)) {
      fs.writeFileSync(CHANGES_FILE, "# Change Log\n\n_No changes recorded yet._\n");
    }
  } catch (err) {
    // If we can't create the dir, we might be in a read-only environment.
    // We log it but don't crash the whole app.
    console.warn(`[Coordination] Could not initialize coordination directory at ${COORD_DIR}: ${err.message}. Coordination features will be limited.`);
  }
}


function readLock() {
  ensureCoordinationDir();
  if (!fs.existsSync(LOCK_FILE)) {
    return { version: "3.0.0", locks: [], history: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
  } catch {
    return { version: "3.0.0", locks: [], history: [] };
  }
}

function writeLock(data) {
  ensureCoordinationDir();
  fs.writeFileSync(LOCK_FILE, JSON.stringify(data, null, 2));
}

/**
 * Acquire a lock for a file operation
 * @param {string} file - File path to lock
 * @param {string} agentId - Agent identifier (e.g., "golden-triad:architect")
 * @param {string} operation - What the agent will do
 * @returns {{ ok: boolean, lockedBy?: string, message?: string, lock?: object }}
 */
export function acquireLock(file, agentId, operation = "read/write") {
  ensureCoordinationDir();
  const lock = readLock();

  // Clean expired locks first
  const now = new Date();
  lock.locks = lock.locks.filter(l => new Date(l.expires) > now);

  const existing = lock.locks.find(l => l.file === file);

  if (existing && existing.agent !== agentId) {
    return {
      ok: false,
      lockedBy: existing.agent,
      message: `File ${file} is locked by ${existing.agent} until ${existing.expires}`
    };
  }

  const lockEntry = {
    file,
    agent: agentId,
    acquired: new Date().toISOString(),
    expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
    operation
  };

  lock.locks.push(lockEntry);
  lock.history.push({ action: "acquire", timestamp: new Date().toISOString(), ...lockEntry });
  writeLock(lock);

  return { ok: true, lock: lockEntry };
}

/**
 * Release a lock
 * @param {string} file - File path to unlock
 * @param {string} agentId - Agent that holds the lock
 * @returns {{ ok: boolean, message?: string }}
 */
export function releaseLock(file, agentId) {
  ensureCoordinationDir();
  const lock = readLock();
  const index = lock.locks.findIndex(l => l.file === file && l.agent === agentId);

  if (index === -1) {
    return { ok: false, message: `No lock found for ${file} held by ${agentId}` };
  }

  const removed = lock.locks.splice(index, 1)[0];
  lock.history.push({ action: "release", timestamp: new Date().toISOString(), ...removed });
  writeLock(lock);

  return { ok: true, released: removed };
}

/**
 * Log a change to the audit trail
 * @param {string} agentId - Agent that made the change
 * @param {string[]} files - Files that were changed
 * @param {string} notes - Description of changes
 */
export function logChange(agentId, files, notes) {
  ensureCoordinationDir();
  const timestamp = new Date().toISOString().split("T")[0];
  const time = new Date().toISOString().split("T")[1].split(".")[0];
  const entry = `\n### ${time} - ${agentId}\n- **Files**: ${files.join(", ")}\n- **Notes**: ${notes}\n`;

  if (!fs.existsSync(CHANGES_FILE)) {
    fs.writeFileSync(CHANGES_FILE, `# Change Log\n\n## ${timestamp}\n${entry}`);
  } else {
    let content = fs.readFileSync(CHANGES_FILE, "utf8");
    if (content.includes(`## ${timestamp}`)) {
      content = content.replace(`## ${timestamp}`, `## ${timestamp}${entry}`);
      fs.writeFileSync(CHANGES_FILE, content);
    } else {
      fs.appendFileSync(CHANGES_FILE, `\n## ${timestamp}${entry}`);
    }
  }
}

/**
 * Update the current state
 * @param {string} task - Current task description
 * @param {string} agentId - Active agent
 * @param {string} status - Task status
 * @param {string} phase - Current phase
 */
export function updateState(task, agentId, status, phase) {
  ensureCoordinationDir();
  const state = `# Agentic Coordination State

## Current Task
- **Task**: ${task}
- **Agent**: ${agentId}
- **Status**: ${status}
- **Phase**: ${phase}
- **Updated**: ${new Date().toISOString()}
`;
  fs.writeFileSync(STATE_FILE, state);
}

/**
 * Log a decision
 * @param {string} agentId - Agent making the decision
 * @param {string} decision - What was decided
 * @param {string} context - Why this decision
 * @param {string} options - Alternatives considered
 * @param {string} impact - What this affects
 */
export function logDecision(agentId, decision, context, options, impact) {
  ensureCoordinationDir();
  const decisionsFile = path.join(COORD_DIR, "DECISIONS.md");
  const timestamp = new Date().toISOString().split("T")[0];
  const time = new Date().toISOString().split("T")[1].split(".")[0];

  const entry = `
### ${time} - ${agentId}
- **Decision**: ${decision}
- **Context**: ${context}
- **Options**: ${options}
- **Impact**: ${impact}
`;

  if (!fs.existsSync(decisionsFile)) {
    fs.writeFileSync(decisionsFile, `# Decision Log\n\n## ${timestamp}${entry}`);
  } else {
    let content = fs.readFileSync(decisionsFile, "utf8");
    if (content.includes(`## ${timestamp}`)) {
      content = content.replace(`## ${timestamp}`, `## ${timestamp}${entry}`);
      fs.writeFileSync(decisionsFile, content);
    } else {
      fs.appendFileSync(decisionsFile, `\n## ${timestamp}${entry}`);
    }
  }
}

/**
 * Clean up expired locks
 * @returns {{ active: number, expired: number }}
 */
export function cleanupExpiredLocks() {
  ensureCoordinationDir();
  const lock = readLock();
  const now = new Date();
  const active = lock.locks.filter(l => new Date(l.expires) > now);
  const expired = lock.locks.filter(l => new Date(l.expires) <= now);

  if (expired.length > 0) {
    lock.locks = active;
    expired.forEach(l => {
      lock.history.push({ action: "expired", timestamp: new Date().toISOString(), ...l });
    });
    writeLock(lock);
  }

  return { active: active.length, expired: expired.length };
}

/**
 * Get current lock state
 * @returns {{ locks: array, history: array }}
 */
export function getLockState() {
  ensureCoordinationDir();
  return readLock();
}

/**
 * Update task queue
 * @param {string} status - in_progress, ready, blocked, done
 * @param {string} task - Task description
 * @param {string} agentId - Assigned agent (optional)
 */
export function updateQueue(status, task, agentId = "unassigned") {
  ensureCoordinationDir();
  const queueFile = path.join(COORD_DIR, "QUEUE.md");
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const entry = `- [${status === "done" ? "x" : " "}] ${task} (@${agentId}) - ${timestamp}\n`;

  if (!fs.existsSync(queueFile)) {
    fs.writeFileSync(queueFile, `# Task Queue\n\n## ${status.replace("_", " ").toUpperCase()}\n${entry}`);
  } else {
    let content = fs.readFileSync(queueFile, "utf8");
    const section = `## ${status.replace("_", " ").toUpperCase()}`;
    if (content.includes(section)) {
      content = content.replace(section, `${section}\n${entry}`);
      fs.writeFileSync(queueFile, content);
    } else {
      fs.appendFileSync(queueFile, `\n${section}\n${entry}`);
    }
  }
}

export default {
  acquireLock,
  releaseLock,
  logChange,
  logDecision,
  updateState,
  updateQueue,
  cleanupExpiredLocks,
  getLockState
};

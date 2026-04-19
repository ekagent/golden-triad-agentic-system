// Agentic Coordination Layer Integration for Golden Triad
// Bridges the orchestrator with the cross-IDE coordination system
// Does NOT modify existing behavior - adds coordination on top

import fs from "fs";
import path from "path";
import os from "os";

const DEFAULT_LOCK_STATE = { version: "3.0.0", locks: [], history: [] };
const warnedMessages = new Set();
const failedCoordDirs = new Set();
let cachedCoordDir;

function warnOnce(message) {
  if (warnedMessages.has(message)) {
    return;
  }

  warnedMessages.add(message);
  console.warn(message);
}

function getCoordinationCandidates() {
  const candidates = [];

  if (process.env.AGENTIC_COORD_DIR) {
    candidates.push(process.env.AGENTIC_COORD_DIR);
  }

  try {
    const homeDir = os.homedir();
    if (homeDir) {
      candidates.push(path.join(homeDir, ".agentic-system", "coordination"));
    }
  } catch {
    // Ignore home-directory lookup failures and continue to fallbacks.
  }

  candidates.push(path.join(process.cwd(), ".coordination"));

  try {
    candidates.push(path.join(os.tmpdir(), "agentic-system", "coordination"));
  } catch {
    // Ignore temp-directory lookup failures and continue without it.
  }

  return [...new Set(candidates.filter(Boolean))];
}

function markCoordDirFailed(coordDir, err) {
  if (!coordDir) {
    return;
  }

  failedCoordDirs.add(coordDir);
  if (cachedCoordDir === coordDir) {
    cachedCoordDir = undefined;
  }

  if (err instanceof Error) {
    warnOnce(
      `[Coordination] Could not use coordination directory at ${coordDir}: ${err.message}. Trying a fallback.`
    );
  }
}

function getCoordinationPaths(coordDir) {
  return {
    lockFile: path.join(coordDir, "LOCK"),
    stateFile: path.join(coordDir, "STATE.md"),
    changesFile: path.join(coordDir, "CHANGES.md"),
    decisionsFile: path.join(coordDir, "DECISIONS.md"),
    queueFile: path.join(coordDir, "QUEUE.md")
  };
}

function resolveCoordinationDir() {
  if (cachedCoordDir && !failedCoordDirs.has(cachedCoordDir)) {
    return cachedCoordDir;
  }

  for (const coordDir of getCoordinationCandidates()) {
    if (failedCoordDirs.has(coordDir)) {
      continue;
    }

    try {
      fs.mkdirSync(coordDir, { recursive: true });
      fs.accessSync(coordDir, fs.constants.R_OK | fs.constants.W_OK);
      cachedCoordDir = coordDir;
      return coordDir;
    } catch (err) {
      markCoordDirFailed(coordDir, err);
    }
  }

  warnOnce(
    "[Coordination] No writable coordination directory is available in this runtime. Continuing without persistent coordination metadata."
  );
  return null;
}

function ensureCoordinationDir() {
  while (true) {
    const coordDir = resolveCoordinationDir();

    if (!coordDir) {
      return null;
    }

    const { lockFile, stateFile, changesFile } = getCoordinationPaths(coordDir);

    try {
      if (!fs.existsSync(lockFile)) {
        fs.writeFileSync(lockFile, JSON.stringify(DEFAULT_LOCK_STATE, null, 2));
      }
      if (!fs.existsSync(stateFile)) {
        fs.writeFileSync(stateFile, "# Agentic Coordination State\n\n## Current Task\n- Status: Idle\n");
      }
      if (!fs.existsSync(changesFile)) {
        fs.writeFileSync(changesFile, "# Change Log\n\n_No changes recorded yet._\n");
      }

      return coordDir;
    } catch (err) {
      markCoordDirFailed(coordDir, err);
    }
  }
}

function withCoordinationDir(operation) {
  while (true) {
    const coordDir = ensureCoordinationDir();

    if (!coordDir) {
      return null;
    }

    try {
      return operation(coordDir, getCoordinationPaths(coordDir));
    } catch (err) {
      markCoordDirFailed(coordDir, err);
    }
  }
}


function readLock() {
  return withCoordinationDir((_coordDir, { lockFile }) => {
    if (!fs.existsSync(lockFile)) {
      return { ...DEFAULT_LOCK_STATE };
    }

    try {
      return JSON.parse(fs.readFileSync(lockFile, "utf8"));
    } catch {
      return { ...DEFAULT_LOCK_STATE };
    }
  }) || { ...DEFAULT_LOCK_STATE };
}

function writeLock(data) {
  return withCoordinationDir((_coordDir, { lockFile }) => {
    fs.writeFileSync(lockFile, JSON.stringify(data, null, 2));
    return true;
  }) === true;
}

/**
 * Acquire a lock for a file operation
 * @param {string} file - File path to lock
 * @param {string} agentId - Agent identifier (e.g., "golden-triad:architect")
 * @param {string} operation - What the agent will do
 * @returns {{ ok: boolean, lockedBy?: string, message?: string, lock?: object }}
 */
export function acquireLock(file, agentId, operation = "read/write") {
  const coordDir = ensureCoordinationDir();
  if (!coordDir) {
    return {
      ok: true,
      message: "Coordination storage unavailable; proceeding without a persisted lock."
    };
  }

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
  const persisted = writeLock(lock);

  return persisted
    ? { ok: true, lock: lockEntry }
    : {
        ok: true,
        lock: lockEntry,
        message: "Coordination storage became unavailable; lock was not persisted."
      };
}

/**
 * Release a lock
 * @param {string} file - File path to unlock
 * @param {string} agentId - Agent that holds the lock
 * @returns {{ ok: boolean, message?: string }}
 */
export function releaseLock(file, agentId) {
  const coordDir = ensureCoordinationDir();
  if (!coordDir) {
    return {
      ok: true,
      message: "Coordination storage unavailable; release skipped."
    };
  }

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
  withCoordinationDir((_coordDir, { changesFile }) => {
    const timestamp = new Date().toISOString().split("T")[0];
    const time = new Date().toISOString().split("T")[1].split(".")[0];
    const entry = `\n### ${time} - ${agentId}\n- **Files**: ${files.join(", ")}\n- **Notes**: ${notes}\n`;

    if (!fs.existsSync(changesFile)) {
      fs.writeFileSync(changesFile, `# Change Log\n\n## ${timestamp}\n${entry}`);
      return;
    }

    let content = fs.readFileSync(changesFile, "utf8");
    if (content.includes(`## ${timestamp}`)) {
      content = content.replace(`## ${timestamp}`, `## ${timestamp}${entry}`);
      fs.writeFileSync(changesFile, content);
    } else {
      fs.appendFileSync(changesFile, `\n## ${timestamp}${entry}`);
    }
  });
}

/**
 * Update the current state
 * @param {string} task - Current task description
 * @param {string} agentId - Active agent
 * @param {string} status - Task status
 * @param {string} phase - Current phase
 */
export function updateState(task, agentId, status, phase) {
  withCoordinationDir((_coordDir, { stateFile }) => {
    const state = `# Agentic Coordination State

## Current Task
- **Task**: ${task}
- **Agent**: ${agentId}
- **Status**: ${status}
- **Phase**: ${phase}
- **Updated**: ${new Date().toISOString()}
`;
    fs.writeFileSync(stateFile, state);
  });
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
  withCoordinationDir((_coordDir, { decisionsFile }) => {
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
  });
}

/**
 * Clean up expired locks
 * @returns {{ active: number, expired: number }}
 */
export function cleanupExpiredLocks() {
  const coordDir = ensureCoordinationDir();
  if (!coordDir) {
    return { active: 0, expired: 0 };
  }

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
  return readLock();
}

/**
 * Update task queue
 * @param {string} status - in_progress, ready, blocked, done
 * @param {string} task - Task description
 * @param {string} agentId - Assigned agent (optional)
 */
export function updateQueue(status, task, agentId = "unassigned") {
  withCoordinationDir((_coordDir, { queueFile }) => {
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
  });
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

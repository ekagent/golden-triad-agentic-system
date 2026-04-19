import { getIntegrationConfig } from "./integrations.js";

const MCP_SERVER_CONFIG = {
  enabled: Boolean(process.env.MCP_SERVER_URL),
  url: process.env.MCP_SERVER_URL || null,
  auth: process.env.MCP_SERVER_AUTH || null
};

export function getMcpConfig() {
  return {
    configured: MCP_SERVER_CONFIG.enabled,
    url: MCP_SERVER_CONFIG.url,
    hasAuth: Boolean(MCP_SERVER_CONFIG.auth)
  };
}

export async function listMcpTools() {
  if (!MCP_SERVER_CONFIG.enabled || !MCP_SERVER_CONFIG.url) {
    return { tools: [], error: "MCP server not configured" };
  }

  try {
    const response = await fetch(`${MCP_SERVER_CONFIG.url}/tools`, {
      method: "GET",
      headers: MCP_SERVER_CONFIG.auth
        ? { Authorization: `Bearer ${MCP_SERVER_CONFIG.auth}` }
        : {}
    });

    if (!response.ok) {
      return { tools: [], error: `MCP server returned ${response.status}` };
    }

    const data = await response.json();
    return { tools: data.tools || [], error: null };
  } catch (e) {
    return { tools: [], error: e.message };
  }
}

export async function callMcpTool(toolName, args = {}) {
  if (!MCP_SERVER_CONFIG.enabled || !MCP_SERVER_CONFIG.url) {
    throw new Error("MCP server not configured");
  }

  try {
    const response = await fetch(`${MCP_SERVER_CONFIG.url}/tools/${toolName}/call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(MCP_SERVER_CONFIG.auth
          ? { Authorization: `Bearer ${MCP_SERVER_CONFIG.auth}` }
          : {})
      },
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`MCP tool ${toolName} failed: ${response.status} ${errText}`);
    }

    const result = await response.json();
    return result;
  } catch (e) {
    throw new Error(`MCP tool call failed: ${e.message}`);
  }
}

export async function checkMcpConnection() {
  if (!MCP_SERVER_CONFIG.enabled || !MCP_SERVER_CONFIG.url) {
    return { ok: false, error: "MCP server not configured" };
  }

  try {
    const response = await fetch(`${MCP_SERVER_CONFIG.url}/health`, {
      method: "GET",
      headers: MCP_SERVER_CONFIG.auth
        ? { Authorization: `Bearer ${MCP_SERVER_CONFIG.auth}` }
        : {}
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { ok: true, version: data.version || "unknown" };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export function getMcpToolSchemas() {
  if (!MCP_SERVER_CONFIG.enabled) {
    return [];
  }

  return [];
}
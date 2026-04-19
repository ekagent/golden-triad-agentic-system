import { execSync } from "child_process";
import { SYNC_KEYS } from "./secrets-manifest.js";

const isCI = process.env.GITHUB_ACTIONS === "true";

function runCommand(command, env = {}) {
  try {
    console.log(`Executing: ${command.replace(/--value .*?(?=\s|$)/, "--value [HIDDEN]")}`);
    execSync(command, { stdio: "inherit", env: { ...process.env, ...env } });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    if (!isCI) throw error;
  }
}

async function syncToVercel(key, value) {
  const envs = ["production"]; // Only sync production by default to save time in CI
  for (const env of envs) {

    // Vercel CLI command to add env var. 
    // We use a trick to pass the value via stdin or if available via argument.
    // Recent Vercel CLI supports: vercel env add KEY ENV VALUE
    // To be safe and handle special characters, we can use a temporary file or specific quoting.
    try {
      // First try to remove if exists to avoid "already exists" error in a simple way
      // Or just use 'vercel env rm KEY ENV -y' but that might fail if not exists.
      // Better: Use the fact that 'vercel env add' prints errors if exists.
      runCommand(`npx -y vercel env rm ${key} ${env} -y || true`, {
        VERCEL_ORG_ID: process.env.VERCEL_ORG_ID,
        VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
        VERCEL_TOKEN: process.env.VERCEL_TOKEN
      });
      
      // Use printf to handle special characters and pass to vercel env add
      // vercel env add [name] [environment] [value]
      runCommand(`printf "%s" "${value.replace(/"/g, '\\"')}" | npx -y vercel env add ${key} ${env}`, {
        VERCEL_ORG_ID: process.env.VERCEL_ORG_ID,
        VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
        VERCEL_TOKEN: process.env.VERCEL_TOKEN
      });

    } catch (e) {
      console.warn(`Failed to sync ${key} to Vercel ${env}: ${e.message}`);
    }
  }
}

async function syncToRailway(keyValuePairs) {
  if (keyValuePairs.length === 0) return;
  
  // Railway CLI: railway variables set KEY1=VALUE1 KEY2=VALUE2
  // We need to be careful with shell escaping.
  const args = keyValuePairs.map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`).join(" ");
  try {
    runCommand(`railway variables set ${args}`, {
      RAILWAY_TOKEN: process.env.RAILWAY_TOKEN
    });
  } catch (e) {
    console.warn(`Failed to sync to Railway: ${e.message}`);
  }
}

async function main() {
  console.log("Starting secret synchronization...");
  
  let secretsSource = {};
  
  // SUPPORT SINGLE JSON BUNDLE
  if (process.env.SYNC_SECRETS_JSON) {
    try {
      console.log("Found SYNC_SECRETS_JSON. Parsing bundle...");
      secretsSource = JSON.parse(process.env.SYNC_SECRETS_JSON);
      console.log(`Loaded ${Object.keys(secretsSource).length} keys from JSON bundle.`);
    } catch (e) {
      console.error("Failed to parse SYNC_SECRETS_JSON. Ensure it is a valid JSON string.");
      process.exit(1);
    }
  }

  const toSync = [];
  
  // Use keys from manifest, but pull from secretsSource first, then process.env
  for (const key of SYNC_KEYS) {
    const value = secretsSource[key] || process.env[key];
    if (value) {
      toSync.push([key, value]);
    } else {
      console.log(`Skipping ${key}: No value found in bundle or environment.`);
    }
  }


  if (toSync.length === 0) {
    console.log("No secrets found to sync. Check your GitHub Secrets mapping.");
    return;
  }

  console.log(`Found ${toSync.length} secrets to synchronize.`);

  // Sync to Vercel
  for (const [key, value] of toSync) {
    await syncToVercel(key, value);
  }

  // Sync to Railway
  await syncToRailway(toSync);

  console.log("Synchronization complete!");
}

main().catch(console.error);

import fs from "node:fs/promises";
import path from "node:path";

const ENV_FILE = ".env.local";
const OUTPUT_FILE = "secrets.json";

async function main() {
  try {
    const content = await fs.readFile(ENV_FILE, "utf8");
    const lines = content.split("\n");
    const secrets = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const firstEqual = trimmed.indexOf("=");
      if (firstEqual === -1) continue;

      const key = trimmed.slice(0, firstEqual);
      let value = trimmed.slice(firstEqual + 1);

      // Handle quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      secrets[key] = value;
    }

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(secrets, null, 2));
    console.log(`Successfully generated ${OUTPUT_FILE} with ${Object.keys(secrets).length} keys.`);
  } catch (error) {
    console.error(`Error generating secrets.json: ${error.message}`);
    process.exit(1);
  }
}

main();

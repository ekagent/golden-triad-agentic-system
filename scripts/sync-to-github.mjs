import fs from "node:fs/promises";
import path from "node:path";
import _libsodium from "libsodium-wrappers";

const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_TOKEN || process.env.GITHUB_TOKEN;
const REPO_OWNER = "ekagent";
const REPO_NAME = "golden-triad-agentic-system";
const SECRET_NAME = "SYNC_SECRETS_JSON";
const JSON_FILE = "secrets.json";

async function main() {
  if (!GITHUB_TOKEN) {
    console.error("Error: GITHUB_TOKEN or GITHUB_PERSONAL_TOKEN not found in environment.");
    process.exit(1);
  }

  await _libsodium.ready;
  const libsodium = _libsodium;

  try {
    const secretValue = await fs.readFile(JSON_FILE, "utf8");

    // 1. Get Public Key from GitHub
    console.log(`Fetching public key for ${REPO_OWNER}/${REPO_NAME}...`);
    const pkResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/public-key`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!pkResponse.ok) {
      throw new Error(`Failed to fetch public key: ${pkResponse.statusText}`);
    }

    const { key, key_id } = await pkResponse.json();
    console.log("Successfully retrieved public key.");

    // 2. Encrypt the secret
    const binkey = libsodium.from_base64(key, libsodium.base64_variants.ORIGINAL);
    const binsec = libsodium.from_string(secretValue);
    const encBytes = libsodium.crypto_box_seal(binsec, binkey);
    const output = libsodium.to_base64(encBytes, libsodium.base64_variants.ORIGINAL);

    // 3. PUT the secret to GitHub
    console.log(`Pushing ${SECRET_NAME} to GitHub...`);
    const putResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/${SECRET_NAME}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          encrypted_value: output,
          key_id: key_id,
        }),
      }
    );

    if (putResponse.ok) {
      console.log(`Successfully updated ${SECRET_NAME} in GitHub Secrets.`);
    } else {
      const errData = await putResponse.json();
      throw new Error(`Failed to update secret: ${JSON.stringify(errData)}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();

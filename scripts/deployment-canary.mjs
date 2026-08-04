import { productSurfaces } from "../src/product-manifest.js";

const deploymentUrl = process.env.DEPLOYMENT_URL || process.argv[2];
if (!deploymentUrl) throw new Error("DEPLOYMENT_URL is required");
const baseUrl = new URL(deploymentUrl.endsWith("/") ? deploymentUrl : `${deploymentUrl}/`);
const attempts = Math.max(1, Number(process.env.CANARY_ATTEMPTS) || 8);
const delayMs = Math.max(250, Number(process.env.CANARY_DELAY_MS) || 5000);

let lastError;
let passed = false;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    await verifyDeployment(baseUrl);
    passed = true;
    break;
  } catch (error) {
    lastError = error;
    if (attempt < attempts) await wait(delayMs);
  }
}
if (!passed) throw lastError;
console.log(`Deployment canary passed for ${baseUrl.href}`);

async function verifyDeployment(base) {
  const routes = [...new Set(productSurfaces.map(({ file }) => file === "index.html" ? "" : file))];
  for (const route of routes) {
    const url = new URL(route, base);
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) throw new Error(`canary_http_${response.status}:${url.href}`);
    const html = await response.text();
    if (!/<title>[^<]+<\/title>/i.test(html) || !/<script[^>]+type=["']module["']/i.test(html)) {
      throw new Error(`canary_invalid_html:${url.href}`);
    }
  }

  const configResponse = await fetch(new URL("runtime-config.json", base), { cache: "no-store" });
  if (!configResponse.ok) throw new Error(`canary_runtime_config_${configResponse.status}`);
  const config = await configResponse.json();
  if (config.schemaVersion !== 1 || typeof config.apiBaseUrl !== "string") {
    throw new Error("canary_invalid_runtime_config");
  }
  if (config.apiBaseUrl) {
    const health = await fetch(`${config.apiBaseUrl}/api/health`, {
      headers: { origin: base.origin },
    });
    if (!health.ok || !(await health.json()).ok) throw new Error("canary_remote_api_unhealthy");
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

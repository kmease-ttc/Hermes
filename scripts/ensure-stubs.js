/**
 * Ensures stub packages exist for workspace-only dependencies
 * that don't exist outside Replit. Runs as postinstall hook.
 */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const stubs = [
  {
    dir: join(root, "node_modules/@arclo/kbase-client"),
    pkg: { name: "@arclo/kbase-client", version: "0.0.1", main: "index.js", type: "module" },
    code: `export class KBaseClient {
  constructor() {}
  static fromEnv() { return new KBaseClient(); }
  async query() { return { results: [] }; }
  async ingest() { return { ok: true }; }
  async search() { return { results: [] }; }
}
export class KBaseEvent {
  constructor(type, data) { this.type = type; this.data = data; }
}
export function getKbaseClient() { return new KBaseClient(); }
export default KBaseClient;
`,
  },
  {
    dir: join(root, "node_modules/queue-client"),
    pkg: { name: "queue-client", version: "0.0.1", main: "index.js", type: "module" },
    code: `export class QueueClient {
  constructor() {}
  async initialize() { return this; }
  async publishJob() { return { ok: true }; }
  async close() {}
}
export default QueueClient;
`,
  },
];

for (const stub of stubs) {
  if (!existsSync(join(stub.dir, "index.js"))) {
    mkdirSync(stub.dir, { recursive: true });
    writeFileSync(join(stub.dir, "package.json"), JSON.stringify(stub.pkg, null, 2) + "\n");
    writeFileSync(join(stub.dir, "index.js"), stub.code);
    console.log(`[stubs] Created ${stub.pkg.name}`);
  }
}

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

// Load .env manually
const env = readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

console.log("Clearing all rows from Circular table...");
await client.execute(`DELETE FROM "Circular"`);
console.log("Done. DB is empty — click Fetch Now to repopulate.");
client.close();

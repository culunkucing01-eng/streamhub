import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@workspace/db";
import app from "./app";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  try {
    console.log("Running database migrations...");
    await migrate(db, { migrationsFolder, migrationsSchema: "public", migrationsTable: "__drizzle_migrations" });
    console.log("Migrations complete.");
  } catch (err) {
    console.error("Migration failed (tables may already exist):", (err as Error).message);
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

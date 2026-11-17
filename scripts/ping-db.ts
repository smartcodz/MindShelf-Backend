import "dotenv/config";
import pg from "pg";

type Target = { label: string; url: string | undefined };

const targets: Target[] = [
  { label: "DATABASE_URL (pooled)", url: process.env.DATABASE_URL },
  {
    label: "DATABASE_URL_DIRECT (direct)",
    url: process.env.DATABASE_URL_DIRECT,
  },
];

async function ping(target: Target): Promise<boolean> {
  if (!target.url) {
    console.error(`${target.label}: missing in .env`);
    return false;
  }

  const client = new pg.Client({ connectionString: target.url });
  try {
    await client.connect();
    const result = await client.query<{ now: Date; db: string }>(
      "SELECT now() AS now, current_database() AS db",
    );
    const row = result.rows[0];
    // We print the database name and time only. Never the connection string.
    console.log(
      `${target.label}: OK (database "${row?.db}", time ${row?.now.toISOString()})`,
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${target.label}: FAILED - ${message}`);
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

let allOk = true;
for (const target of targets) {
  const ok = await ping(target);
  if (!ok) allOk = false;
}

process.exitCode = allOk ? 0 : 1;

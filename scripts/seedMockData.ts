/*
  Usage:
  - Set CONVEX_URL (e.g. https://YOUR-DEPLOYMENT.convex.cloud) in env
  - Optionally set CONVEX_ADMIN_KEY if required by your backend (if secured)
  - Run with ts-node or build: 
      pnpm ts-node scripts/seedMockData.ts 
    or
      node -r esbuild-register scripts/seedMockData.ts
*/

import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";

async function main() {
  const url = process.env.CONVEX_URL;
  if (!url) {
    console.error(
      "Missing CONVEX_URL. Set it in .env (CONVEX_URL=https://...)",
    );
    process.exit(1);
  }
  const client = new ConvexHttpClient(url);
  const { api } = await import("../convex/_generated/api");

  const customers = Number(process.env.SEED_CUSTOMERS ?? 5);
  const vehiclesPerCustomer = Number(process.env.SEED_VEHICLES_PER_CUSTOMER ?? 2);
  const visitsPerVehicle = Number(process.env.SEED_VISITS_PER_VEHICLE ?? 1);
  const invoicesPerVisit = Number(process.env.SEED_INVOICES_PER_VISIT ?? 1);

  const res = await client.action(api.seed.run, {
    customers,
    vehiclesPerCustomer,
    visitsPerVehicle,
    invoicesPerVisit,
  } as any);

  console.log("Seed complete:", res);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auditLogs from "../auditLogs.js";
import type * as customers from "../customers.js";
import type * as dashboard from "../dashboard.js";
import type * as invoices from "../invoices.js";
import type * as schedule from "../schedule.js";
import type * as seed from "../seed.js";
import type * as vehicles from "../vehicles.js";
import type * as visits from "../visits.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auditLogs: typeof auditLogs;
  customers: typeof customers;
  dashboard: typeof dashboard;
  invoices: typeof invoices;
  schedule: typeof schedule;
  seed: typeof seed;
  vehicles: typeof vehicles;
  visits: typeof visits;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

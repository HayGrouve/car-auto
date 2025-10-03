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
import type * as animals from "../animals.js";
import type * as auditLogs from "../auditLogs.js";
import type * as dashboard from "../dashboard.js";
import type * as invoices from "../invoices.js";
import type * as owners from "../owners.js";
import type * as seed from "../seed.js";
import type * as visits from "../visits.js";
import type * as weights from "../weights.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  animals: typeof animals;
  auditLogs: typeof auditLogs;
  dashboard: typeof dashboard;
  invoices: typeof invoices;
  owners: typeof owners;
  seed: typeof seed;
  visits: typeof visits;
  weights: typeof weights;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

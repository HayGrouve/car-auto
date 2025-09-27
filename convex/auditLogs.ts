import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByEntity = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("auditLogs").collect();
    const filtered = all.filter((l: any) => l.entityType === args.entityType && String(l.entityId) === String(args.entityId));
    const sorted = filtered.sort((a: any, b: any) => (b.at ?? b.createdAt ?? 0) - (a.at ?? a.createdAt ?? 0));
    const limit = args.limit ?? 10;
    return sorted.slice(0, limit);
  },
});

export const reportBreach = mutation({
  args: {
    details: v.optional(v.string()),
    severity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      at: Date.now(),
      actor: "system",
      entityType: "system",
      entityId: "global",
      action: "breach",
      details: { severity: args.severity ?? "info", message: args.details ?? "" },
    } as any);
    return { ok: true } as const;
  },
});



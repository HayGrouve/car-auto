import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("visits").collect();
    const sorted = items.sort((a: any, b: any) => b.createdAt - a.createdAt);
    return sorted.slice(0, args.limit ?? 50);
  },
});

export const create = mutation({
  args: {
    ownerId: v.id("owners"),
    animalId: v.optional(v.id("animals")),
    soap: v.object({
      s: v.optional(v.string()),
      o: v.optional(v.string()),
      a: v.optional(v.string()),
      p: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("visits", {
      ownerId: args.ownerId,
      animalId: args.animalId ?? null,
      soap: args.soap,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    } as any);
    return { ok: true, id } as const;
  },
});

export const finalize = mutation({
  args: { id: v.id("visits") },
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.id as any);
    if (!visit) return { ok: false } as const;
    await ctx.db.patch(args.id as any, { status: "finalized", updatedAt: Date.now() });
    return { ok: true } as const;
  },
});



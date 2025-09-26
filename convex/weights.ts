import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const add = mutation({
  args: {
    animalId: v.id("animals"),
    kg: v.number(),
    notedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("weights", {
      animalId: args.animalId,
      kg: args.kg,
      notedAt: args.notedAt ?? now,
      createdAt: now,
    } as any);
    return { ok: true, id } as const;
  },
});

export const listByAnimal = query({
  args: { animalId: v.id("animals") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("weights").collect();
    return all
      .filter((w: any) => w.animalId === args.animalId)
      .sort((a: any, b: any) => (b.notedAt ?? b.createdAt) - (a.notedAt ?? a.createdAt));
  },
});

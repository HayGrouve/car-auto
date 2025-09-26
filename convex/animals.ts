import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("animals").collect();
    const s = args.search?.toLowerCase() ?? "";
    if (!s) return all.sort((a: any, b: any) => b.createdAt - a.createdAt);
    return all
      .filter((a: any) => [a.name, a.species, a.breed, a.microchip]
        .filter(Boolean).some((v: string) => v.toLowerCase().includes(s)))
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    species: v.string(),
    breed: v.optional(v.string()),
    sex: v.optional(v.string()),
    neutered: v.optional(v.boolean()),
    dob: v.optional(v.number()),
    microchip: v.optional(v.string()),
    ownerId: v.optional(v.id("owners")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const micro = args.microchip?.trim();
    if (micro) {
      const dup = (await ctx.db
        .query("animals")
        .filter((q) => q.eq(q.field("microchip"), micro))
        .collect())[0];
      if (dup) return { ok: false, reason: "microchip" } as any;
    }
    const id = await ctx.db.insert("animals", {
      name: args.name,
      species: args.species,
      breed: args.breed ?? null,
      sex: args.sex ?? null,
      neutered: args.neutered ?? false,
      dob: args.dob ?? null,
      microchip: micro ?? null,
      ownerId: args.ownerId ?? null,
      createdAt: now,
    } as any);
    return { ok: true, id } as any;
  },
});



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

export const getById = query({
  args: { id: v.id("animals") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("animals"),
    name: v.optional(v.string()),
    species: v.optional(v.string()),
    breed: v.optional(v.union(v.string(), v.null())),
    sex: v.optional(v.union(v.string(), v.null())),
    neutered: v.optional(v.boolean()),
    dob: v.optional(v.union(v.number(), v.null())),
    microchip: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.species !== undefined) patch.species = args.species;
    if (args.breed !== undefined) patch.breed = args.breed;
    if (args.sex !== undefined) patch.sex = args.sex;
    if (args.neutered !== undefined) patch.neutered = args.neutered;
    if (args.dob !== undefined) patch.dob = args.dob;
    if (args.microchip !== undefined) patch.microchip = args.microchip?.trim() || null;
    await ctx.db.patch(args.id, patch);
    return { ok: true } as const;
  },
});

export const listByOwner = query({
  args: { ownerId: v.id("owners") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("animals").collect();
    return all.filter((a: any) => a.ownerId === args.ownerId);
  },
});



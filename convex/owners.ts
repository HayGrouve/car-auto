import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("owners").collect();
    const search = args.search?.toLowerCase() ?? "";
    if (!search) return all.sort((a: any, b: any) => b.createdAt - a.createdAt);
    return all
      .filter((o: any) =>
        [o.name, o.phone, o.email].filter(Boolean).some((v: string) => v.toLowerCase().includes(search))
      )
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    gdprConsent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const phoneNormalized = args.phone.replace(/\D/g, "");
    // Prevent duplicates by phone or email (if provided)
    const dupByPhone = (await ctx.db
      .query("owners")
      .filter((q) => q.eq(q.field("phone"), phoneNormalized))
      .collect())[0];
    if (dupByPhone) {
      return { ok: false, reason: "phone" } as any;
    }
    if (args.email) {
      const dupByEmail = (await ctx.db
        .query("owners")
        .filter((q) => q.eq(q.field("email"), args.email))
        .collect())[0];
      if (dupByEmail) {
        return { ok: false, reason: "email" } as any;
      }
    }
    const doc = {
      name: args.name,
      phone: phoneNormalized,
      email: args.email ?? null,
      address: args.address ?? null,
      gdprConsent: args.gdprConsent,
      createdAt: now,
      deletedAt: null,
    } as any;
    const id = await ctx.db.insert("owners", doc);
    return { ok: true, id } as any;
  },
});

export const getById = query({
  args: { id: v.id("owners") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("owners"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.union(v.string(), v.null())),
    address: v.optional(v.union(v.string(), v.null())),
    gdprConsent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.phone !== undefined) patch.phone = args.phone?.replace(/\D/g, "");
    if (args.email !== undefined) patch.email = args.email ?? null;
    if (args.address !== undefined) patch.address = args.address ?? null;
    if (args.gdprConsent !== undefined) patch.gdprConsent = args.gdprConsent;
    await ctx.db.patch(args.id, patch);
    return { ok: true } as const;
  },
});



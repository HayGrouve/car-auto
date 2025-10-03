import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateHumanCode(prefix: string): string {
  const num = Math.floor(100000 + Math.random() * 900000); // 6 digits
  const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${prefix}${num}-${letters}`;
}

export const list = query({
  args: {
    unpaidOnly: v.optional(v.boolean()),
    ownerId: v.optional(v.id("owners")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sort: v.optional(v.union(v.literal("createdAtAsc"), v.literal("createdAtDesc"), v.literal("totalAsc"), v.literal("totalDesc"))),
    includePaid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("invoices").collect();
    let filtered = all;
    if (args.unpaidOnly) filtered = filtered.filter((i: any) => !i.paid);
    if (args.includePaid === false) filtered = filtered.filter((i: any) => !i.paid);
    if (args.ownerId) filtered = filtered.filter((i: any) => String(i.ownerId) === String(args.ownerId));
    if (args.from) filtered = filtered.filter((i: any) => i.createdAt >= args.from!);
    if (args.to) filtered = filtered.filter((i: any) => i.createdAt <= args.to!);
    const sorted = filtered.sort((a: any, b: any) => {
      switch (args.sort) {
        case "createdAtAsc":
          return a.createdAt - b.createdAt;
        case "totalAsc":
          return (a.total ?? 0) - (b.total ?? 0);
        case "totalDesc":
          return (b.total ?? 0) - (a.total ?? 0);
        case "createdAtDesc":
        default:
          return b.createdAt - a.createdAt;
      }
    });
    const start = Math.max(0, args.offset ?? 0);
    const end = (args.limit ?? sorted.length) + start;
    return sorted.slice(start, end);
  },
});

export const invoicesSummary = query({
  args: {},
  handler: async (ctx) => {
    const invoices = await ctx.db.query("invoices").collect();
    const unpaid = invoices.filter((i: any) => !i.paid);
    const totals = unpaid.reduce(
      (acc: { total: number; latest?: number }, inv: any) => {
        acc.total += inv.total ?? 0;
        acc.latest = Math.max(acc.latest ?? 0, inv.createdAt ?? 0);
        return acc;
      },
      { total: 0, latest: undefined }
    );
    return {
      unpaidCount: unpaid.length,
      unpaidTotal: totals.total,
      latestCreatedAt: totals.latest,
    } as const;
  },
});

export const create = mutation({
  args: {
    ownerId: v.id("owners"),
    animalId: v.optional(v.id("animals")),
    visitId: v.optional(v.id("visits")),
    items: v.array(v.object({ description: v.string(), quantity: v.number(), price: v.number(), total: v.number() })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const total = args.items.reduce((sum, it) => sum + it.total, 0);
    // Generate a human-friendly code and attempt to avoid collisions
    const existing = await ctx.db.query("invoices").collect();
    let code = "";
    for (let i = 0; i < 5; i++) {
      const cand = generateHumanCode("INV-");
      if (!existing.some((d: any) => d.code === cand)) { code = cand; break; }
    }
    const id = await ctx.db.insert("invoices", {
      ownerId: args.ownerId,
      animalId: args.animalId ?? null,
      visitId: args.visitId ?? null,
      code,
      items: args.items,
      total,
      paid: false,
      paidAt: null,
      createdAt: now,
    } as any);
    return { ok: true, id, code } as const;
  },
});

export const markPaid = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { paid: true, paidAt: Date.now() } as any);
    return { ok: true } as const;
  },
});

export const totals = query({
  args: { day: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const list = await ctx.db.query("invoices").collect();
    const dayStart = args.day ? new Date(args.day) : new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const rows = list.filter((i: any) => i.createdAt >= dayStart.getTime() && i.createdAt <= dayEnd.getTime());
    const paidTotal = rows.filter((r: any) => r.paid).reduce((s: number, r: any) => s + (r.total ?? 0), 0);
    const unpaidTotal = rows.filter((r: any) => !r.paid).reduce((s: number, r: any) => s + (r.total ?? 0), 0);
    return { paidTotal, unpaidTotal, count: rows.length } as const;
  },
});

export const getById = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});



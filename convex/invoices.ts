import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateHumanCode(prefix: string): string {
  const num = Math.floor(100000 + Math.random() * 900000); // 6 digits
  const letters =
    String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
    String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${prefix}${num}-${letters}`;
}

export const list = query({
  args: {
    unpaidOnly: v.optional(v.boolean()),
    customerId: v.optional(v.id("customers")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sort: v.optional(
      v.union(
        v.literal("createdAtAsc"),
        v.literal("createdAtDesc"),
        v.literal("totalAsc"),
        v.literal("totalDesc"),
      ),
    ),
    includePaid: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("invoices").collect();
    const translitMap: Record<string, string> = {
      А: "A", а: "a", Б: "B", б: "b", В: "V", в: "v", Г: "G", г: "g",
      Д: "D", д: "d", Е: "E", е: "e", Ж: "zh", ж: "zh", З: "Z", з: "z",
      И: "i", и: "i", Й: "y", й: "y", К: "k", к: "k", Л: "l", л: "l",
      М: "m", м: "m", Н: "n", н: "n", О: "o", о: "o", П: "p", п: "p",
      Р: "r", р: "r", С: "s", с: "s", Т: "t", т: "t", У: "u", у: "u",
      Ф: "f", ф: "f", Х: "h", х: "h", Ц: "ts", ц: "ts", Ч: "ch", ч: "ch",
      Ш: "sh", ш: "sh", Щ: "sht", щ: "sht", Ъ: "a", ъ: "a", Ь: "", ь: "",
      Ю: "yu", ю: "yu", Я: "ya", я: "ya",
    };
    const toAscii = (s: string) =>
      Array.from(String(s))
        .map((ch) => translitMap[ch] ?? ch)
        .join("");
    const normalizePair = (s: string) => {
      const base = String(s ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("bg")
        .replace(/["'`„""]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const ascii = toAscii(base).toLowerCase();
      return { base, ascii };
    };
    const queryPair = normalizePair(args.search ?? "");
    const matchesSearch = (value: unknown) => {
      if (!queryPair.base && !queryPair.ascii) return true;
      const p = normalizePair(String(value ?? ""));
      return (
        (p.base && queryPair.base && p.base.includes(queryPair.base)) ||
        (p.ascii && queryPair.ascii && p.ascii.includes(queryPair.ascii)) ||
        (p.base && queryPair.ascii && p.base.includes(queryPair.ascii)) ||
        (p.ascii && queryPair.base && p.ascii.includes(queryPair.base))
      );
    };

    let filtered = all;
    if (args.unpaidOnly) filtered = filtered.filter((i: any) => !i.paid);
    if (args.includePaid === false)
      filtered = filtered.filter((i: any) => !i.paid);
    if (args.customerId)
      filtered = filtered.filter(
        (i: any) => String(i.customerId) === String(args.customerId),
      );
    if (args.from)
      filtered = filtered.filter((i: any) => i.createdAt >= args.from!);
    if (args.to)
      filtered = filtered.filter((i: any) => i.createdAt <= args.to!);
    if (queryPair.base || queryPair.ascii) {
      filtered = filtered.filter((i: any) => {
        const haystacks = [
          i.code ?? i._id,
          ...(i.parts ?? []).map((item: any) => item.name ?? ""),
          ...(i.labor ?? []).map((item: any) => item.name ?? ""),
        ];
        return haystacks.some((v: any) => matchesSearch(v));
      });
    }
    const sorted = filtered.sort((a: any, b: any) => {
      switch (args.sort) {
        case "createdAtAsc":
          return a.createdAt - b.createdAt;
        case "totalAsc":
          return (a.totalAmount ?? 0) - (b.totalAmount ?? 0);
        case "totalDesc":
          return (b.totalAmount ?? 0) - (a.totalAmount ?? 0);
        case "createdAtDesc":
        default:
          return b.createdAt - a.createdAt;
      }
    });
    const total = sorted.length;
    const start = Math.max(0, args.offset ?? 0);
    const limit = args.limit ?? total;
    const end = limit + start;
    const items = sorted.slice(start, end);
    const hasMore = end < total;
    return { items, total, hasMore };
  },
});

export const invoicesSummary = query({
  args: {},
  handler: async (ctx) => {
    const invoices = await ctx.db.query("invoices").collect();
    const unpaid = invoices.filter((i: any) => !i.paid);
    const totals = unpaid.reduce(
      (acc: { total: number; latest?: number }, inv: any) => {
        acc.total += inv.totalAmount ?? 0;
        acc.latest = Math.max(acc.latest ?? 0, inv.createdAt ?? 0);
        return acc;
      },
      { total: 0, latest: undefined },
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
    customerId: v.id("customers"),
    vehicleId: v.optional(v.id("vehicles")),
    visitId: v.optional(v.id("visits")),
    parts: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        price: v.number(),
        // Accepted for backwards compatibility; ignored (totals use price × quantity).
        total: v.optional(v.number()),
      }),
    ),
    labor: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        price: v.number(),
        total: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normParts = args.parts.map(({ name, quantity, price }) => ({
      name,
      quantity,
      price,
    }));
    const normLabor = args.labor.map(({ name, quantity, price }) => ({
      name,
      quantity,
      price,
    }));
    const partsTotal = normParts.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0,
    );
    const laborTotal = normLabor.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0,
    );
    const totalAmount = partsTotal + laborTotal;
    
    // Generate a human-friendly code and attempt to avoid collisions
    const existing = await ctx.db.query("invoices").collect();
    let code = "";
    for (let i = 0; i < 5; i++) {
      const cand = generateHumanCode("INV-");
      if (!existing.some((d: any) => d.code === cand)) {
        code = cand;
        break;
      }
    }
    const id = await ctx.db.insert("invoices", {
      customerId: args.customerId,
      vehicleId: args.vehicleId ?? null,
      visitId: args.visitId ?? null,
      code,
      parts: normParts,
      labor: normLabor,
      totalAmount,
      paid: false,
      paidAt: null,
      createdAt: now,
    } as any);
    // If tied to a visit, reflect invoice info back to visit for UI convenience
    if (args.visitId) {
      try {
        await ctx.db.patch(
          args.visitId as any,
          {
            invoiceCode: code,
            outstandingAmount: `${totalAmount.toFixed(2)} EUR`,
            updatedAt: now,
          } as any,
        );
      } catch (_) {
        // ignore if schema doesn't allow; optional enhancement only
      }
    }
    return { ok: true, id, code } as const;
  },
});

export const markPaid = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const invoice = await ctx.db.get(args.id);
    await ctx.db.patch(args.id, { paid: true, paidAt: now } as any);
    if (invoice?.visitId) {
      try {
        // Fetch the visit to check its status
        const visit = await ctx.db.get(invoice.visitId as any);
        if (visit) {
          // Update outstandingAmount
          await ctx.db.patch(
            invoice.visitId as any,
            {
              outstandingAmount: null,
              updatedAt: now,
            } as any,
          );

          // Finalize the visit if it's not already finalized
          const visitStatus = (visit as any).status;
          if (visitStatus !== "finalized") {
            await ctx.db.patch(invoice.visitId as any, {
              status: "finalized",
              updatedAt: now,
            });

            // Update schedule slot status to "completed" if linked to this visit
            try {
              const slots = await ctx.db
                .query("schedule")
                .filter((q: any) => q.eq(q.field("visitId"), invoice.visitId))
                .collect();
              for (const slot of slots) {
                await ctx.db.patch(slot._id, {
                  status: "completed",
                  updatedAt: now,
                } as any);
              }
            } catch (_) {
              // optional; ignore failures
            }

            // Update service/part catalogs (same logic as visits.finalize)
            const services: string[] = (visit as any).services ?? [];
            const parts: string[] = (visit as any).parts ?? [];

            // Update service catalog
            try {
              for (const name of services) {
                const existing = await ctx.db
                  .query("serviceCatalog")
                  .filter((q: any) => q.eq(q.field("name"), name))
                  .first();
                if (existing)
                  await ctx.db.patch(existing._id, {
                    count: (existing as any).count + 1,
                  } as any);
                else
                  await ctx.db.insert("serviceCatalog", {
                    name,
                    count: 1,
                  } as any);
              }
            } catch (_) {
              // table may not exist; ignore
            }

            // Update part catalog
            try {
              for (const name of parts) {
                const existing = await ctx.db
                  .query("partCatalog")
                  .filter((q: any) => q.eq(q.field("name"), name))
                  .first();
                if (existing)
                  await ctx.db.patch(existing._id, {
                    count: (existing as any).count + 1,
                  } as any);
                else
                  await ctx.db.insert("partCatalog", {
                    name,
                    count: 1,
                  } as any);
              }
            } catch (_) {
              // table may not exist; ignore
            }
          }
        }
      } catch (_) {
        // optional back-prop; ignore failures
      }
    }
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
    const rows = list.filter(
      (i: any) =>
        i.createdAt >= dayStart.getTime() && i.createdAt <= dayEnd.getTime(),
    );
    const paidTotal = rows
      .filter((r: any) => r.paid)
      .reduce((s: number, r: any) => s + (r.totalAmount ?? 0), 0);
    const unpaidTotal = rows
      .filter((r: any) => !r.paid)
      .reduce((s: number, r: any) => s + (r.totalAmount ?? 0), 0);
    return { paidTotal, unpaidTotal, count: rows.length } as const;
  },
});

export const getById = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

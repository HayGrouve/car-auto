import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sort: v.optional(v.string()), // 'createdAtAsc' | 'createdAtDesc'
    customerId: v.optional(v.id("customers")),
    make: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("vehicles").collect();
    const customers = await ctx.db.query("customers").collect();
    const customerMap = new Map<string, { name: string; phone?: string }>();
    customers.forEach((customer: any) => {
      if (!customer?.deletedAt) {
        customerMap.set(String(customer._id), {
          name: customer.name,
          phone: customer.phone ?? undefined,
        });
      }
    });
    let filtered = all;
    if (args.customerId) {
      filtered = filtered.filter(
        (vDoc: any) => String(vDoc.customerId ?? "") === String(args.customerId),
      );
    }
    if (args.make) {
      const makeLower = args.make.toLocaleLowerCase("bg");
      filtered = filtered.filter(
        (vDoc: any) =>
          String(vDoc.make ?? "").toLocaleLowerCase("bg") === makeLower,
      );
    }
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
      const base = String(s)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("bg")
        .replace(/["'`„“”]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const ascii = toAscii(base).toLowerCase();
      return { base, ascii };
    };
    const q = normalizePair(args.search ?? "");
    const byDateDesc = (a: any, b: any) => b.createdAt - a.createdAt;
    const byDateAsc = (a: any, b: any) => a.createdAt - b.createdAt;
    let sorted: any[];
    if (!q.base && !q.ascii) {
      sorted =
        args.sort === "createdAtAsc"
          ? filtered.sort(byDateAsc)
          : filtered.sort(byDateDesc);
    } else {
      const matches = (value: unknown) => {
        const p = normalizePair(String(value ?? ""));
        return (
          (p.base && q.base && p.base.includes(q.base)) ||
          (p.ascii && q.ascii && p.ascii.includes(q.ascii)) ||
          (p.base && q.ascii && p.base.includes(q.ascii)) ||
          (p.ascii && q.base && p.ascii.includes(q.base))
        );
      };
      const matched = filtered.filter((vDoc: any) =>
        [vDoc.licensePlate, vDoc.make, vDoc.model, vDoc.vin]
          .filter(Boolean)
          .some((v: string) => matches(v)),
      );
      sorted =
        args.sort === "createdAtAsc"
          ? matched.sort(byDateAsc)
          : matched.sort(byDateDesc);
    }
    const total = sorted.length;
    const start = Math.max(0, args.offset ?? 0);
    const limit = args.limit ?? total;
    const end = limit + start;
    const sliced = sorted.slice(start, end);
    const items = sliced.map((doc: any) => {
      const customerInfo = doc.customerId
        ? customerMap.get(String(doc.customerId))
        : undefined;
      return {
        ...doc,
        customerName: customerInfo?.name ?? null,
        customerPhone: customerInfo?.phone ?? null,
      };
    });
    const hasMore = end < total;
    return { items, total, hasMore };
  },
});

export const makeOptions = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("vehicles").collect();
    const set = new Set<string>();
    for (const doc of all) {
      if (doc?.make) {
        set.add(String(doc.make));
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "bg"));
  },
});

export const create = mutation({
  args: {
    licensePlate: v.string(),
    make: v.string(),
    model: v.optional(v.string()),
    color: v.optional(v.string()),
    year: v.optional(v.number()),
    vin: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const vin = args.vin?.trim();
    if (vin) {
      const dup = (
        await ctx.db
          .query("vehicles")
          .filter((q) => q.eq(q.field("vin"), vin))
          .collect()
      )[0];
      if (dup) return { ok: false, reason: "vin" } as any;
    }
    const id = await ctx.db.insert("vehicles", {
      licensePlate: args.licensePlate,
      make: args.make,
      model: args.model ?? null,
      color: args.color ?? null,
      year: args.year ?? null,
      vin: vin ?? null,
      customerId: args.customerId ?? null,
      createdAt: now,
    } as any);
    return { ok: true, id } as any;
  },
});

export const getById = query({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("vehicles"),
    licensePlate: v.optional(v.string()),
    make: v.optional(v.string()),
    model: v.optional(v.union(v.string(), v.null())),
    color: v.optional(v.union(v.string(), v.null())),
    year: v.optional(v.union(v.number(), v.null())),
    vin: v.optional(v.union(v.string(), v.null())),
    customerId: v.optional(v.union(v.id("customers"), v.null())),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.licensePlate !== undefined) patch.licensePlate = args.licensePlate;
    if (args.make !== undefined) patch.make = args.make;
    if (args.model !== undefined) patch.model = args.model;
    if (args.color !== undefined) patch.color = args.color;
    if (args.year !== undefined) patch.year = args.year;
    if (args.vin !== undefined) patch.vin = args.vin?.trim() || null;
    if (args.customerId !== undefined) patch.customerId = args.customerId;
    await ctx.db.patch(args.id, patch);
    return { ok: true } as const;
  },
});

export const remove = mutation({
  args: {
    id: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true } as const;
  },
});

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("vehicles").collect();
    return all.filter((vDoc: any) => vDoc.customerId === args.customerId);
  },
});

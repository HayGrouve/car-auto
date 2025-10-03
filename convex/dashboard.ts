import { query } from "./_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

type OwnerDoc = {
  _id: string;
  name: string;
  phone?: string | null;
  deletedAt?: number | null;
};

type AnimalDoc = {
  _id: string;
  name: string;
  species?: string | null;
  ownerId?: string | null;
  createdAt: number;
};

type VisitDoc = {
  _id: string;
  code?: string | null;
  datetime?: number | null;
  createdAt: number;
  status: string;
  ownerId?: string | null;
  animalId?: string | null;
};

type InvoiceDoc = {
  _id: string;
  code?: string | null;
  createdAt: number;
  total?: number | null;
  paid?: boolean | null;
};

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfDay(now - 6 * DAY_MS);

    const [ownerDocs, animalDocs, visitDocs, invoiceDocs] = await Promise.all([
      ctx.db.query("owners").collect() as Promise<OwnerDoc[]>,
      ctx.db.query("animals").collect() as Promise<AnimalDoc[]>,
      ctx.db.query("visits").collect() as Promise<VisitDoc[]>,
      ctx.db.query("invoices").collect() as Promise<InvoiceDoc[]>,
    ]);

    const ownerMap = new Map<string, { name: string; phone?: string | null }>();
    ownerDocs.forEach((owner) => {
      if (!owner?.deletedAt) {
        ownerMap.set(String(owner._id), { name: owner.name, phone: owner.phone ?? null });
      }
    });

    const animalCount = animalDocs.length;
    const ownerCount = ownerDocs.filter((o) => !o?.deletedAt).length;

    const visitsSorted = [...visitDocs].sort((a, b) => ((b.datetime ?? b.createdAt) - (a.datetime ?? a.createdAt)));
    const recentVisits = visitsSorted.slice(0, 6).map((visit) => ({
      _id: String(visit._id),
      code: visit.code ?? null,
      datetime: (visit.datetime ?? visit.createdAt) ?? Date.now(),
      status: visit.status,
      ownerId: visit.ownerId ? String(visit.ownerId) : null,
      ownerName: visit.ownerId ? ownerMap.get(String(visit.ownerId))?.name ?? null : null,
      animalId: visit.animalId ? String(visit.animalId) : null,
    }));

    const draftVisitsCount = visitDocs.filter((v) => v.status === "draft").length;
    const todayVisits = visitDocs
      .filter((v) => {
        const time = (v.datetime ?? v.createdAt) ?? 0;
        return time >= todayStart && time <= todayEnd;
      })
      .sort((a, b) => ((a.datetime ?? a.createdAt) ?? 0) - ((b.datetime ?? b.createdAt) ?? 0))
      .map((visit) => ({
        _id: String(visit._id),
        code: visit.code ?? null,
        datetime: (visit.datetime ?? visit.createdAt) ?? Date.now(),
        status: visit.status,
        ownerId: visit.ownerId ? String(visit.ownerId) : null,
        ownerName: visit.ownerId ? ownerMap.get(String(visit.ownerId))?.name ?? null : null,
        animalId: visit.animalId ? String(visit.animalId) : null,
      }));

    const patientBook = animalDocs
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8)
      .map((animal) => ({
        _id: String(animal._id),
        name: animal.name,
        species: animal.species ?? null,
        ownerId: animal.ownerId ? String(animal.ownerId) : null,
        ownerName: animal.ownerId ? ownerMap.get(String(animal.ownerId))?.name ?? null : null,
      }));

    const invoicesSorted = [...invoiceDocs].sort((a, b) => b.createdAt - a.createdAt);
    const recentInvoices = invoicesSorted.slice(0, 6).map((invoice) => ({
      _id: String(invoice._id),
      code: invoice.code ?? null,
      createdAt: invoice.createdAt,
      total: invoice.total ?? 0,
      paid: Boolean(invoice.paid),
    }));

    const unpaidInvoices = invoiceDocs.filter((inv) => !inv.paid);
    const unpaidInvoicesTotal = unpaidInvoices.reduce((sum: number, inv) => sum + (inv.total ?? 0), 0);

    const todayInvoices = invoiceDocs.filter((inv) => inv.createdAt >= todayStart && inv.createdAt <= todayEnd);
    const todayPaidTotal = todayInvoices.filter((inv) => inv.paid).reduce((sum, inv) => sum + (inv.total ?? 0), 0);
    const todayUnpaidTotal = todayInvoices.filter((inv) => !inv.paid).reduce((sum, inv) => sum + (inv.total ?? 0), 0);

    const weekInvoices = invoiceDocs.filter((inv) => inv.createdAt >= weekStart && inv.createdAt <= todayEnd);
    const weekPaidTotal = weekInvoices.filter((inv) => inv.paid).reduce((sum, inv) => sum + (inv.total ?? 0), 0);
    const weekUnpaidTotal = weekInvoices.filter((inv) => !inv.paid).reduce((sum, inv) => sum + (inv.total ?? 0), 0);

    const alerts: string[] = [];
    if (unpaidInvoices.length > 0) {
      alerts.push(`Неплатени фактури: ${unpaidInvoices.length}`);
    }
    if (draftVisitsCount > 0) {
      alerts.push(`Чернови посещения: ${draftVisitsCount}`);
    }

    return {
      counts: {
        owners: ownerCount,
        animals: animalCount,
        draftVisits: draftVisitsCount,
        unpaidInvoices: unpaidInvoices.length,
      },
      totals: {
        today: { paid: todayPaidTotal, unpaid: todayUnpaidTotal },
        week: { paid: weekPaidTotal, unpaid: weekUnpaidTotal },
        unpaidInvoicesTotal,
      },
      recentVisits,
      recentInvoices,
      todayVisits,
      patientBook,
      alerts,
    } as const;
  },
});
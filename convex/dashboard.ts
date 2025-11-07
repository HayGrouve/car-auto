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
  visitId?: string | null;
};

type ScheduleSlotDoc = {
  _id: string;
  date: number;
  startTime: number;
  endTime: number;
  title: string;
  description?: string | null;
  visitId?: string | null;
  ownerId?: string | null;
  animalId?: string | null;
  status: string;
};

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfDay(now - 6 * DAY_MS);

    const [ownerDocs, animalDocs, visitDocs, invoiceDocs, scheduleDocs] =
      await Promise.all([
        ctx.db.query("owners").collect() as Promise<OwnerDoc[]>,
        ctx.db.query("animals").collect() as Promise<AnimalDoc[]>,
        ctx.db.query("visits").collect() as Promise<VisitDoc[]>,
        ctx.db.query("invoices").collect() as Promise<InvoiceDoc[]>,
        ctx.db.query("schedule").collect() as Promise<ScheduleSlotDoc[]>,
      ]);

    const ownerMap = new Map<string, { name: string; phone?: string | null }>();
    ownerDocs.forEach((owner) => {
      if (!owner?.deletedAt) {
        ownerMap.set(String(owner._id), {
          name: owner.name,
          phone: owner.phone ?? null,
        });
      }
    });

    const animalMap = new Map<
      string,
      { name: string; species?: string | null; ownerId?: string | null }
    >();
    animalDocs.forEach((animal) => {
      animalMap.set(String(animal._id), {
        name: animal.name,
        species: animal.species ?? null,
        ownerId: animal.ownerId ? String(animal.ownerId) : null,
      });
    });

    const animalCount = animalDocs.length;
    const ownerCount = ownerDocs.filter((o) => !o?.deletedAt).length;

    const draftVisitsCount = visitDocs.filter(
      (v) => v.status === "draft",
    ).length;
    const todayVisits = visitDocs
      .filter((v) => {
        const time = v.datetime ?? v.createdAt ?? 0;
        return time >= todayStart && time <= todayEnd;
      })
      .sort(
        (a, b) =>
          (a.datetime ?? a.createdAt ?? 0) - (b.datetime ?? b.createdAt ?? 0),
      )
      .map((visit) => ({
        _id: String(visit._id),
        code: visit.code ?? null,
        datetime: visit.datetime ?? visit.createdAt ?? Date.now(),
        status: visit.status,
        ownerId: visit.ownerId ? String(visit.ownerId) : null,
        ownerName: visit.ownerId
          ? (ownerMap.get(String(visit.ownerId))?.name ?? null)
          : null,
        animalId: visit.animalId ? String(visit.animalId) : null,
      }));

    // Create a map of visitId -> invoiceId for quick lookup
    const visitInvoiceMap = new Map<string, string>();
    invoiceDocs.forEach((invoice) => {
      if (invoice.visitId) {
        visitInvoiceMap.set(String(invoice.visitId), String(invoice._id));
      }
    });

    const unpaidInvoices = invoiceDocs.filter((inv) => !inv.paid);
    const unpaidInvoicesTotal = unpaidInvoices.reduce(
      (sum: number, inv) => sum + (inv.total ?? 0),
      0,
    );

    const todayInvoices = invoiceDocs.filter(
      (inv) => inv.createdAt >= todayStart && inv.createdAt <= todayEnd,
    );
    const todayPaidTotal = todayInvoices
      .filter((inv) => inv.paid)
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0);
    const todayUnpaidTotal = todayInvoices
      .filter((inv) => !inv.paid)
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

    const weekInvoices = invoiceDocs.filter(
      (inv) => inv.createdAt >= weekStart && inv.createdAt <= todayEnd,
    );
    const weekPaidTotal = weekInvoices
      .filter((inv) => inv.paid)
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0);
    const weekUnpaidTotal = weekInvoices
      .filter((inv) => !inv.paid)
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

    // Get today's schedule slots
    // Filter by startTime (actual appointment time) to ensure we only show today's slots
    // Compare dates by calendar day (year/month/day) to handle timezone differences

    const todayDate = new Date(now);
    const todayYear = todayDate.getUTCFullYear();
    const todayMonth = todayDate.getUTCMonth();
    const todayDay = todayDate.getUTCDate();

    const todayScheduleSlots = scheduleDocs
      .filter((slot) => {
        // Only check startTime - this is the actual appointment time
        const startTimeDate = new Date(slot.startTime);
        const startYear = startTimeDate.getUTCFullYear();
        const startMonth = startTimeDate.getUTCMonth();
        const startDay = startTimeDate.getUTCDate();

        const dateMatches =
          startYear === todayYear &&
          startMonth === todayMonth &&
          startDay === todayDay;
        const statusMatch = slot.status === "scheduled";
        return dateMatches && statusMatch;
      })
      .sort((a, b) => a.startTime - b.startTime)
      .map((slot) => ({
        _id: String(slot._id),
        title: slot.title,
        description: slot.description ?? null,
        startTime: slot.startTime,
        endTime: slot.endTime,
        visitId: slot.visitId ? String(slot.visitId) : null,
        ownerId: slot.ownerId ? String(slot.ownerId) : null,
        ownerName: slot.ownerId
          ? (ownerMap.get(String(slot.ownerId))?.name ?? null)
          : null,
        animalId: slot.animalId ? String(slot.animalId) : null,
        animalName: slot.animalId
          ? (animalMap.get(String(slot.animalId))?.name ?? null)
          : null,
      }));

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
      todayVisits,
      todayScheduleSlots,
      visitInvoiceMap: Object.fromEntries(visitInvoiceMap),
    } as const;
  },
});

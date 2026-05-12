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

type CustomerDoc = {
  _id: string;
  name: string;
  phone?: string | null;
  deletedAt?: number | null;
};

type VehicleDoc = {
  _id: string;
  licensePlate: string;
  make?: string | null;
  customerId?: string | null;
  createdAt: number;
};

type VisitDoc = {
  _id: string;
  code?: string | null;
  datetime?: number | null;
  createdAt: number;
  status: string;
  customerId?: string | null;
  vehicleId?: string | null;
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
  customerId?: string | null;
  vehicleId?: string | null;
  status: string;
};

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfDay(now - 6 * DAY_MS);

    const [customerDocs, vehicleDocs, visitDocs, invoiceDocs, scheduleDocs] =
      await Promise.all([
        ctx.db.query("customers").collect() as Promise<CustomerDoc[]>,
        ctx.db.query("vehicles").collect() as Promise<VehicleDoc[]>,
        ctx.db.query("visits").collect() as Promise<VisitDoc[]>,
        ctx.db.query("invoices").collect() as Promise<InvoiceDoc[]>,
        ctx.db.query("schedule").collect() as Promise<ScheduleSlotDoc[]>,
      ]);

    const customerMap = new Map<string, { name: string; phone?: string | null }>();
    customerDocs.forEach((customer) => {
      if (!customer?.deletedAt) {
        customerMap.set(String(customer._id), {
          name: customer.name,
          phone: customer.phone ?? null,
        });
      }
    });

    const vehicleMap = new Map<
      string,
      { licensePlate: string; make?: string | null; customerId?: string | null }
    >();
    vehicleDocs.forEach((vehicle) => {
      vehicleMap.set(String(vehicle._id), {
        licensePlate: vehicle.licensePlate,
        make: vehicle.make ?? null,
        customerId: vehicle.customerId ? String(vehicle.customerId) : null,
      });
    });

    const vehicleCount = vehicleDocs.length;
    const customerCount = customerDocs.filter((o) => !o?.deletedAt).length;

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
        customerId: visit.customerId ? String(visit.customerId) : null,
        customerName: visit.customerId
          ? (customerMap.get(String(visit.customerId))?.name ?? null)
          : null,
        vehicleId: visit.vehicleId ? String(visit.vehicleId) : null,
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
        customerId: slot.customerId ? String(slot.customerId) : null,
        customerName: slot.customerId
          ? (customerMap.get(String(slot.customerId))?.name ?? null)
          : null,
        vehicleId: slot.vehicleId ? String(slot.vehicleId) : null,
        vehicleName: slot.vehicleId
          ? (vehicleMap.get(String(slot.vehicleId))?.licensePlate ?? null)
          : null,
      }));

    return {
      counts: {
        customers: customerCount,
        vehicles: vehicleCount,
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

export const monthlyRevenue = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const yearStart = new Date(Date.UTC(currentYear, 0, 1)).getTime();
    const yearEnd = new Date(
      Date.UTC(currentYear, 11, 31, 23, 59, 59, 999),
    ).getTime();

    const invoiceDocs = await ctx.db
      .query("invoices")
      .filter((q) => q.gte(q.field("createdAt"), yearStart))
      .filter((q) => q.lte(q.field("createdAt"), yearEnd))
      .collect();

    const months = [
      "Яну",
      "Фев",
      "Мар",
      "Апр",
      "Май",
      "Юни",
      "Юли",
      "Авг",
      "Сеп",
      "Окт",
      "Ное",
      "Дек",
    ];

    const data = months.map((name, index) => ({
      name,
      paid: 0,
      unpaid: 0,
      month: index,
    }));

    invoiceDocs.forEach((inv) => {
      const date = new Date(inv.createdAt);
      const monthIndex = date.getUTCMonth();
      const monthData = data[monthIndex];
      if (monthData) {
        if (inv.paid) {
          monthData.paid += inv.total ?? 0;
        } else {
          monthData.unpaid += inv.total ?? 0;
        }
      }
    });

    return data;
  },
});

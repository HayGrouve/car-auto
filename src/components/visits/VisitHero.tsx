"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { type VisitDoc } from "@/types/visit";
import { VisitStatusBadge } from "@/components/StatusBadge";

type VisitHeroProps = {
  visit: VisitDoc;
  customer?: {
    name?: string | null;
    phone?: string | null;
    balance?: string | null;
  } | null;
  vehicle?: {
    id?: string | null;
    name?: string | null;
    make?: string | null;
    alerts?: string[];
  } | null;
  billing?: {
    invoiceCode?: string | null;
    outstanding?: string | null;
  } | null;
  actionsMenuDesktop?: React.ReactNode;
  actionsMenuMobile?: React.ReactNode;
};

export function VisitHero({
  visit,
  customer,
  vehicle,
  billing,
  actionsMenuDesktop,
  actionsMenuMobile,
}: VisitHeroProps) {
  const formattedDate = visit.datetime
    ? new Date(visit.datetime).toLocaleString("bg-BG")
    : new Date(visit.createdAt).toLocaleString("bg-BG");
  const speciesWithGender = [
    vehicle?.make ?? visit.vehicleMake ?? "без марка",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="grid gap-4">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-3 text-2xl font-semibold">
              {visit.code ? `Посещение ${visit.code}` : "Посещение"}
              <VisitStatusBadge status={visit.status} />
            </CardTitle>
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1">
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                {formattedDate}
              </span>
            </div>
          </div>
          {actionsMenuDesktop ? (
            <div
              className="hidden shrink-0 items-center gap-2 lg:flex"
              data-testid="visit-hero-actions-desktop"
            >
              {actionsMenuDesktop}
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <InfoBlock title="Автомобил" fallback="Няма данни">
              <div className="space-y-1">
                {vehicle?.id && (vehicle?.name ?? visit.vehicleName) ? (
                  <Link
                    href={`/vehicles/${vehicle.id}`}
                    className="font-medium hover:underline inline-block"
                    aria-label={`Преглед на автомобил ${vehicle.name ?? visit.vehicleName ?? ""}`}
                  >
                    {vehicle.name ?? visit.vehicleName ?? "Неизвестен автомобил"}
                  </Link>
                ) : (
                  <p className="font-medium">
                    {vehicle?.name ?? visit.vehicleName ?? "Неизвестен автомобил"}
                  </p>
                )}
                <p className="text-muted-foreground text-sm">
                  {speciesWithGender}
                </p>
                {(vehicle?.alerts ?? visit.alerts ?? []).length ? (
                  <ul className="text-destructive space-y-1 text-xs">
                    {(vehicle?.alerts ?? visit.alerts ?? []).map(
                      (alert, idx) => (
                        <li key={idx}>• {alert}</li>
                      ),
                    )}
                  </ul>
                ) : null}
              </div>
            </InfoBlock>
            <InfoBlock title="Клиент" fallback="Няма клиент">
              <div className="space-y-1">
                <p className="font-medium">{customer?.name ?? "Неизвестен"}</p>
                {customer?.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="inline-flex items-center gap-1 text-sm hover:underline cursor-pointer"
                    aria-label={`Обади се на ${customer.phone}`}
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {customer.phone}
                  </a>
                ) : null}
                {customer?.balance ? (
                  <p className="text-muted-foreground text-xs">
                    Баланс: {customer.balance}
                  </p>
                ) : null}
              </div>
            </InfoBlock>
            <InfoBlock title="Фактуриране" fallback="Няма издадена фактура">
              <div className="space-y-1">
                {billing?.invoiceCode ? (
                  <Link
                    href={`/invoices/${encodeURIComponent(billing.invoiceCode)}`}
                    className="font-medium hover:underline inline-block"
                    aria-label={`Преглед на фактура ${billing.invoiceCode}`}
                  >
                    Фактура {billing.invoiceCode}
                  </Link>
                ) : null}
                {billing?.outstanding ? (
                  <p className="text-muted-foreground text-sm">
                    Дължима сума: {billing.outstanding}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Няма дължими суми
                  </p>
                )}
              </div>
            </InfoBlock>
          </div>
        </CardContent>
        {actionsMenuMobile ? (
          <div
            className="border-t p-4 lg:hidden"
            data-testid="visit-hero-actions-mobile"
          >
            {actionsMenuMobile}
          </div>
        ) : null}
      </Card>
    </section>
  );
}

type InfoBlockProps = {
  title: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
};

function InfoBlock({ title, children, fallback, className }: InfoBlockProps) {
  const content = React.Children.count(children) ? children : fallback;

  return (
    <div className={cn("bg-card rounded-lg border p-4 shadow-sm", className)}>
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        {title}
      </p>
      <div className="text-sm leading-relaxed">{content}</div>
    </div>
  );
}
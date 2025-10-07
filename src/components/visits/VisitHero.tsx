"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarCheck,
  FileText,
  MoreHorizontal,
  Phone,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";

type VisitHeroProps = {
  code?: string | null;
  status?: string;
  datetime?: number | null;
  attending?: string | null;
  onFinalize?: () => void;
  onPrint?: () => void;
  onInvoice?: () => void;
  isFinalized?: boolean;
  owner?: {
    name?: string | null;
    phone?: string | null;
    balance?: string | null;
  } | null;
  animal?: {
    name?: string | null;
    species?: string | null;
    alerts?: string[];
  } | null;
  billing?: {
    invoiceCode?: string | null;
    outstanding?: string | null;
  } | null;
  extraActions?: Array<{
    label: string;
    onSelect: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
};

export function VisitHero({
  code,
  status,
  datetime,
  attending,
  onFinalize,
  onPrint,
  onInvoice,
  isFinalized,
  owner,
  animal,
  billing,
  extraActions = [],
}: VisitHeroProps) {
  const formattedDate = datetime
    ? new Date(datetime).toLocaleString("bg-BG")
    : null;

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-3 text-2xl font-semibold">
              {code ? `Посещение ${code}` : "Посещение"}
              {status ? (
                <Badge variant={isFinalized ? "secondary" : "default"}>
                  {status}
                </Badge>
              ) : null}
            </CardTitle>
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
              {formattedDate ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  {formattedDate}
                </span>
              ) : null}
              {attending ? <span>Лекар: {attending}</span> : null}
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {onFinalize ? (
              <Button size="sm" onClick={onFinalize} disabled={isFinalized}>
                {isFinalized ? "Приключено" : "Приключи"}
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Още действия</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onPrint ? (
                  <DropdownMenuItem
                    onSelect={onPrint}
                    className="cursor-pointer gap-2"
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" /> Печат
                  </DropdownMenuItem>
                ) : null}
                {onInvoice ? (
                  <DropdownMenuItem
                    onSelect={onInvoice}
                    className="cursor-pointer gap-2"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" /> Създай
                    фактура
                  </DropdownMenuItem>
                ) : null}
                {extraActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onSelect={action.onSelect}
                    disabled={action.disabled}
                    className="cursor-pointer gap-2"
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <InfoBlock title="Пациент" fallback="Няма данни">
              <div className="space-y-1">
                <p className="font-medium">
                  {animal?.name ?? "Неизвестно животно"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {animal?.species ?? "без вид"}
                </p>
                {animal?.alerts?.length ? (
                  <ul className="text-destructive space-y-1 text-xs">
                    {animal.alerts.map((alert, idx) => (
                      <li key={idx}>• {alert}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </InfoBlock>
            <InfoBlock title="Собственик" fallback="Няма собственик">
              <div className="space-y-1">
                <p className="font-medium">{owner?.name ?? "Неизвестен"}</p>
                {owner?.phone ? (
                  <p className="inline-flex items-center gap-1 text-sm">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {owner.phone}
                  </p>
                ) : null}
                {owner?.balance ? (
                  <p className="text-muted-foreground text-xs">
                    Баланс: {owner.balance}
                  </p>
                ) : null}
              </div>
            </InfoBlock>
            <InfoBlock title="Фактуриране" fallback="Няма издадена фактура">
              <div className="space-y-1">
                {billing?.invoiceCode ? (
                  <p className="font-medium">Фактура {billing.invoiceCode}</p>
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
        <div className="border-t p-4 lg:hidden">
          <div className="flex flex-wrap items-center gap-2">
            {onFinalize ? (
              <Button
                size="sm"
                className="flex-1"
                onClick={onFinalize}
                disabled={isFinalized}
              >
                {isFinalized ? "Приключено" : "Приключи"}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="grow"
              onClick={onPrint}
            >
              Печат
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="grow">
                  Още
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onInvoice ? (
                  <DropdownMenuItem
                    onSelect={onInvoice}
                    className="cursor-pointer gap-2"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" /> Създай
                    фактура
                  </DropdownMenuItem>
                ) : null}
                {extraActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onSelect={action.onSelect}
                    disabled={action.disabled}
                    className="cursor-pointer gap-2"
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
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

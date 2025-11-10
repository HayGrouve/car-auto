"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { FileText, MoreHorizontal, Printer } from "lucide-react";
import type { ReactNode } from "react";

export type VisitAction = {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  disabled?: boolean;
};

export type VisitActionsMenuProps = {
  onFinalize?: () => void;
  onPrint?: () => void;
  onInvoice?: () => void;
  extraActions?: VisitAction[];
  className?: string;
};

function buildSecondaryActions({
  onInvoice,
  extraActions = [],
}: Pick<VisitActionsMenuProps, "onInvoice" | "extraActions">) {
  const items: VisitAction[] = [];

  if (onInvoice) {
    items.push({
      label: "Създай фактура",
      onSelect: onInvoice,
      icon: <FileText className="h-4 w-4" aria-hidden="true" />,
    });
  }

  if (extraActions.length) {
    items.push(...extraActions);
  }

  return items;
}

function SecondaryDropdown({
  actions,
  triggerClassName,
  align = "end",
}: {
  actions: VisitAction[];
  triggerClassName?: string;
  align?: "start" | "center" | "end";
}) {
  if (!actions.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Допълнителни действия"
          className={triggerClassName}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        {actions.map((action, index) => (
          <DropdownMenuItem
            key={`secondary-${index}-${action.label}`}
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
  );
}

export function VisitActionsMenuDesktop({
  onFinalize,
  onPrint,
  onInvoice,
  extraActions,
  className,
}: VisitActionsMenuProps) {
  const secondary = buildSecondaryActions({ onInvoice, extraActions });

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {onFinalize ? (
        <Button size="sm" onClick={onFinalize}>
          Приключи
        </Button>
      ) : null}
      {onPrint ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={onPrint}
        >
          <Printer className="h-4 w-4" aria-hidden="true" /> Печат
        </Button>
      ) : null}
      <SecondaryDropdown actions={secondary} />
    </div>
  );
}

export function VisitActionsMenuMobile({
  onFinalize,
  onPrint,
  onInvoice,
  extraActions,
  className,
}: VisitActionsMenuProps) {
  const secondary = buildSecondaryActions({ onInvoice, extraActions });

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onFinalize ? (
        <Button size="sm" className="flex-1" onClick={onFinalize}>
          Приключи
        </Button>
      ) : null}
      {onPrint ? (
        <Button
          size="sm"
          variant="outline"
          className="grow gap-1.5"
          onClick={onPrint}
        >
          <Printer className="h-4 w-4" aria-hidden="true" /> Печат
        </Button>
      ) : null}
      <SecondaryDropdown actions={secondary} triggerClassName="grow" />
    </div>
  );
}

"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import {
  FileDown,
  Printer,
  Trash2,
  ArrowLeft,
  Play,
  MoreHorizontal,
} from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AnimalControlsCardProps {
  hasOwner: boolean;
  hasDraftVisit?: boolean;
  hasIncompleteVisit?: boolean;
  draftVisitId?: string;
  canStartVisit?: boolean;
  primaryLabel?: string;
  exportLabel?: string;
  hint?: string;
  onCreateVisitDraft?: () => void;
  onResumeVisit?: () => void;
  onStartVisit?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  onConfirmDelete?: () => void;
  onBack?: () => void;
  isExporting?: boolean;
  isPrinting?: boolean;
  isDeleting?: boolean;
  disablePrimary?: boolean;
  disableSecondary?: boolean;
  className?: string;
}

export function AnimalControlsCard({
  hasOwner,
  hasDraftVisit = false,
  hasIncompleteVisit = false,
  draftVisitId,
  canStartVisit = true,
  primaryLabel,
  exportLabel = "Експортиране PDF",
  hint,
  onCreateVisitDraft,
  onResumeVisit,
  onStartVisit,
  onExport,
  onPrint,
  onConfirmDelete,
  onBack,
  isExporting = false,
  isPrinting = false,
  isDeleting = false,
  disablePrimary = false,
  disableSecondary = false,
  className,
}: AnimalControlsCardProps) {
  const primaryText =
    primaryLabel ??
    (hasDraftVisit ? "Продължи посещение" : "Започни посещение");

  const handlePrimaryClick = () => {
    if (!hasOwner && !canStartVisit) return;
    if (hasDraftVisit) {
      onResumeVisit?.();
    } else if (onStartVisit) {
      onStartVisit();
    } else {
      onCreateVisitDraft?.();
    }
  };

  const primaryDisabled = disablePrimary || (!hasOwner && !canStartVisit);
  const secondaryDisabled = disableSecondary;

  const actionItems = [
    onExport && {
      label: isExporting ? "Генериране..." : exportLabel,
      icon: <FileDown className="size-4" aria-hidden="true" />,
      onClick: onExport,
      disabled: secondaryDisabled || isExporting,
    },
    onPrint && {
      label: isPrinting ? "Подготовка..." : "Печат",
      icon: <Printer className="size-4" aria-hidden="true" />,
      onClick: onPrint,
      disabled: secondaryDisabled || isPrinting,
    },
    onConfirmDelete && {
      label: isDeleting ? "Изтриване..." : "Изтрий",
      icon: <Trash2 className="size-4" aria-hidden="true" />,
      onClick: onConfirmDelete,
      disabled: secondaryDisabled || isDeleting,
      variant: "destructive" as const,
    },
    onBack && {
      label: "Назад към животните",
      icon: <ArrowLeft className="size-4" aria-hidden="true" />,
      onClick: onBack,
      disabled: secondaryDisabled,
      variant: "ghost" as const,
    },
  ].filter(Boolean) as Array<{
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    variant?: "destructive" | "ghost";
  }>;

  return (
    <>
      <SectionCard
        className={cn(
          "flex hidden flex-col gap-4 shadow-md lg:flex",
          className,
        )}
        title="Контроли"
      >
        <div className="space-y-4">
          {!hasOwner ? (
            <Alert variant="destructive">
              <AlertDescription>
                Изберете собственик, преди да започнете ново посещение.
              </AlertDescription>
            </Alert>
          ) : null}

          {hasIncompleteVisit ? (
            <Alert>
              <AlertDescription>
                Има незавършено посещение за това животно. Може да го продължите
                <Link
                  href={draftVisitId ? `/visits/${draftVisitId}` : `/visits`}
                  className="text-primary inline underline underline-offset-4"
                >
                  от тук.
                </Link>
              </AlertDescription>
            </Alert>
          ) : null}

          {hint ? (
            <Alert>
              <AlertDescription>{hint}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            size="lg"
            className="w-full"
            onClick={handlePrimaryClick}
            disabled={primaryDisabled}
          >
            <Play className="mr-2 size-4" aria-hidden="true" />
            {primaryText}
          </Button>

          <div className="space-y-2">
            {onExport ? (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onExport}
                disabled={secondaryDisabled || isExporting}
                aria-disabled={secondaryDisabled || isExporting}
                aria-label={exportLabel}
              >
                <FileDown className="mr-2 size-4" aria-hidden="true" />
                {isExporting ? "Генериране..." : exportLabel}
              </Button>
            ) : null}

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onPrint?.()}
              disabled={secondaryDisabled || isPrinting}
              aria-disabled={secondaryDisabled || isPrinting}
              aria-label="Отпечатай"
            >
              <Printer className="mr-2 size-4" aria-hidden="true" />
              {isPrinting ? "Подготовка..." : "Печат"}
            </Button>

            {onConfirmDelete ? (
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={onConfirmDelete}
                disabled={secondaryDisabled || isDeleting}
                aria-disabled={secondaryDisabled || isDeleting}
                aria-label="Изтриване на животното"
              >
                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                {isDeleting ? "Изтриване..." : "Изтрий"}
              </Button>
            ) : null}

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => onBack?.()}
              disabled={secondaryDisabled}
              aria-disabled={secondaryDisabled}
              aria-label="Назад към списъка"
            >
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Назад към животните
            </Button>
          </div>
        </div>
      </SectionCard>

      <div className="lg:hidden">
        <div className="bg-background border px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              className="flex-1"
              size="lg"
              onClick={handlePrimaryClick}
              disabled={primaryDisabled}
            >
              <Play className="mr-2 size-4" aria-hidden="true" />
              {primaryText}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Допълнителни действия"
                >
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                {actionItems.map((action, index) => (
                  <DropdownMenuItem
                    key={`${action.label}-${index}`}
                    onClick={() => {
                      if (!action.disabled) action.onClick?.();
                    }}
                    className={cn(
                      action.variant === "destructive" && "text-destructive",
                      action.disabled && "pointer-events-none opacity-60",
                    )}
                  >
                    {action.icon}
                    <span className="ml-2 text-sm">{action.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
}

export default AnimalControlsCard;

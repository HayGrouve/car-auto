"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  tone?: "default" | "muted" | "accent";
  collapsible?: boolean;
  defaultExpanded?: boolean;
  headerActions?: SectionCardAction[];
  footerActions?: SectionCardAction[];
  layout?: "stack" | "grid" | "list";
  gridCols?: number;
  headerIcon?: ReactNode;
  badge?: ReactNode;
  responsiveCollapsible?: boolean;
  collapseBelow?: number;
}

interface SectionCardAction {
  label: ReactNode;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
  variant?: "default" | "ghost" | "outline";
}

export const SectionCard = forwardRef<HTMLElement, SectionCardProps>(
  (
    {
      title,
      subtitle,
      description,
      actions,
      footer,
      children,
      className,
      tone = "default",
      collapsible = false,
      defaultExpanded = true,
      headerActions,
      footerActions,
      layout = "stack",
      gridCols = 2,
      headerIcon,
      badge,
      responsiveCollapsible = false,
      collapseBelow = 768,
      ...rest
    },
    ref,
  ) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [isCollapsedView, setIsCollapsedView] = useState(() => false);

    useEffect(() => {
      if (!responsiveCollapsible || typeof window === "undefined") return;

      const update = () => {
        const isSmall = window.innerWidth < collapseBelow;
        setIsCollapsedView(isSmall);
        if (!isSmall && (collapsible || responsiveCollapsible)) {
          setExpanded(true);
        }
        if (isSmall && responsiveCollapsible && !collapsible) {
          setExpanded(false);
        }
      };

      update();
      window.addEventListener("resize", update);

      return () => {
        window.removeEventListener("resize", update);
      };
    }, [responsiveCollapsible, collapseBelow, collapsible]);

    const effectiveCollapsible =
      collapsible || (responsiveCollapsible && isCollapsedView);

    const toneClass =
      tone === "muted"
        ? "bg-muted/40"
        : tone === "accent"
          ? "bg-primary/5"
          : "bg-card";

    const toggle = useCallback(() => {
      if (!effectiveCollapsible) return;
      setExpanded((prev) => !prev);
    }, [effectiveCollapsible]);

    const renderActions = (items?: SectionCardAction[]) => {
      if (!items?.length) return null;
      return (
        <div className="flex flex-wrap items-center gap-2">
          {items.map((action, index) => {
            if (action.href) {
              return (
                <a
                  key={index}
                  href={action.href}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition",
                    action.variant === "ghost"
                      ? "text-muted-foreground hover:bg-muted"
                      : action.variant === "outline"
                        ? "border-border text-foreground hover:bg-muted border"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                >
                  {action.icon}
                  {action.label}
                </a>
              );
            }

            return (
              <button
                type="button"
                key={index}
                onClick={action.onClick}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition",
                  action.variant === "ghost"
                    ? "text-muted-foreground hover:bg-muted"
                    : action.variant === "outline"
                      ? "border-border text-foreground hover:bg-muted border"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {action.icon}
                {action.label}
              </button>
            );
          })}
        </div>
      );
    };

    const actionRegion = useMemo(() => {
      if (actions)
        return (
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
            {actions}
          </div>
        );
      if (headerActions?.length)
        return (
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
            {renderActions(headerActions)}
          </div>
        );
      if (effectiveCollapsible)
        return (
          <button
            type="button"
            onClick={toggle}
            className="text-muted-foreground hover:bg-muted flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition"
            aria-expanded={expanded}
            aria-controls={
              effectiveCollapsible ? "section-card-content" : undefined
            }
          >
            <span>{expanded ? "Скрий" : "Покажи"}</span>
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                expanded ? "rotate-180" : "rotate-0",
              )}
              aria-hidden="true"
            />
          </button>
        );
      return null;
    }, [actions, expanded, toggle, headerActions, effectiveCollapsible]);

    return (
      <section
        ref={ref}
        className={cn(
          toneClass,
          "text-card-foreground rounded-xl border shadow-sm transition-colors",
          className,
        )}
        {...rest}
      >
        {(title ??
          actions ??
          subtitle ??
          description ??
          effectiveCollapsible) != null && (
          <header className="flex flex-col gap-1 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              {headerIcon ? (
                <div className="text-muted-foreground">{headerIcon}</div>
              ) : null}
              {title != null && (
                <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                  {title}
                </h2>
              )}
              {subtitle != null && (
                <p className="text-foreground text-base font-medium">
                  {subtitle}
                </p>
              )}
              {description != null && (
                <p className="text-muted-foreground text-sm">{description}</p>
              )}
              {badge ? <div>{badge}</div> : null}
            </div>
            {actionRegion}
          </header>
        )}
        <div
          id={collapsible ? "section-card-content" : undefined}
          data-collapsible={effectiveCollapsible || undefined}
          className={cn(
            "px-4 py-4 transition-[max-height,opacity] duration-200 ease-in-out sm:px-6 sm:py-5",
            effectiveCollapsible
              ? expanded
                ? "max-h-[999px] opacity-100"
                : "pointer-events-none max-h-0 opacity-0"
              : undefined,
          )}
          aria-hidden={effectiveCollapsible ? !expanded : undefined}
        >
          <div
            className={cn(
              layout === "grid"
                ? cn(
                    "grid gap-3",
                    gridCols === 1
                      ? "md:grid-cols-1"
                      : gridCols === 2
                        ? "md:grid-cols-2"
                        : "md:grid-cols-3",
                  )
                : layout === "list"
                  ? "divide-border space-y-3 divide-y"
                  : "space-y-4",
            )}
          >
            {children}
          </div>
        </div>
        {footer ? (
          <footer className="text-muted-foreground border-t px-4 py-3 text-sm sm:px-6">
            {footer}
          </footer>
        ) : footerActions?.length ? (
          <footer className="text-muted-foreground border-t px-4 py-3 text-sm sm:px-6">
            {renderActions(footerActions)}
          </footer>
        ) : null}
      </section>
    );
  },
);

SectionCard.displayName = "SectionCard";

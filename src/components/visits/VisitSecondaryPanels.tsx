"use client";

import * as React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { VisitDoc } from "@/types/visit";
import { ChevronDown, Download, FileText, History, Info } from "lucide-react";

export type VisitSecondaryPanelsProps = {
  visit: VisitDoc;
  documentActions?: (
    doc: NonNullable<VisitDoc["documents"]>[number],
  ) => React.ReactNode;
  footerActions?: React.ReactNode;
  className?: string;
};

function formatTimestamp(timestamp: number | undefined): string {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleString("bg-BG");
  } catch {
    return "—";
  }
}

export function VisitSecondaryPanels({
  visit,
  documentActions,
  footerActions,
  className,
}: VisitSecondaryPanelsProps) {
  const [open, setOpen] = React.useState<Record<string, boolean>>(() => ({
    documents: true,
    history: false,
  }));

  function toggle(key: string) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const documents = visit.documents ?? [];
  const history = visit.history ?? [];

  return (
    <aside className={cn("space-y-4", className)}>
      <Collapsible
        open={open.documents}
        onOpenChange={() => toggle("documents")}
        className="border-muted/60 bg-card rounded-lg border shadow-sm"
      >
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="text-muted-foreground h-5 w-5" aria-hidden />
            <div>
              <h3 className="text-sm leading-tight font-semibold">Документи</h3>
              <p className="text-muted-foreground text-xs">
                Изтеглете свързани файлове и сертификати
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {documents.length ? (
              <Badge variant="outline" className="text-xs">
                {documents.length}
              </Badge>
            ) : null}
            <VisitSecondaryToggle open={open.documents} />
          </div>
        </header>
        <CollapsibleContent>
          <CardContent className="border-t px-4 py-4">
            {documents.length ? (
              <ul className="space-y-3 text-sm">
                {documents.map((doc) => (
                  <li
                    key={doc.id ?? doc.name}
                    className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{doc.name}</div>
                      <p className="text-muted-foreground text-xs">
                        {doc.type ?? "Документ"} ·{" "}
                        {formatTimestamp(doc.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {documentActions ? (
                        documentActions(doc)
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Изтегли ${doc.name}`}
                          onClick={() =>
                            doc.url && window.open(doc.url, "_blank")
                          }
                        >
                          <Download className="h-4 w-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<FileText className="text-muted-foreground h-5 w-5" />}
                title="Няма документи"
                description="Все още няма добавени файлове за посещението."
              />
            )}
            {footerActions ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {footerActions}
              </div>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible
        open={open.history}
        onOpenChange={() => toggle("history")}
        className="border-muted/60 bg-card rounded-lg border shadow-sm"
      >
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="text-muted-foreground h-5 w-5" aria-hidden />
            <div>
              <h3 className="text-sm leading-tight font-semibold">История</h3>
              <p className="text-muted-foreground text-xs">
                Проследете ключовите действия и промени
              </p>
            </div>
          </div>
          <VisitSecondaryToggle open={open.history} />
        </header>
        <CollapsibleContent>
          <CardContent className="border-t px-0">
            {history.length ? (
              <ScrollArea className="max-h-72">
                <ul className="divide-border/70 divide-y text-sm">
                  {history.map((entry, index) => (
                    <li key={index} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{entry.action}</div>
                          {entry.notes ? (
                            <p className="text-muted-foreground text-xs">
                              {entry.notes}
                            </p>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {formatTimestamp(entry.timestamp)}
                        </p>
                      </div>
                      {entry.actor ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Извършено от: {entry.actor}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <EmptyState
                icon={<Info className="text-muted-foreground h-5 w-5" />}
                title="Няма история"
                description="Няма регистрирани действия за това посещение."
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}

function VisitSecondaryToggle({ open = false }: { open?: boolean }) {
  return (
    <CollapsibleTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-label={open ? "Скрий секцията" : "Покажи секцията"}
      >
        <ChevronDown
          className={cn(
            "transition-transform",
            open ? "rotate-180" : "rotate-0",
            "h-4 w-4",
          )}
          aria-hidden
        />
      </Button>
    </CollapsibleTrigger>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-muted/30 flex flex-col items-center justify-center gap-2 rounded-md border px-4 py-8 text-center">
      {icon}
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

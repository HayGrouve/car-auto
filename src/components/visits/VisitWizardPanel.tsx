"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type BaseStep = {
  id: string;
  label: string;
  description?: string;
  summary?: string | ReactNode;
  hints?: ReactNode;
  content: ReactNode;
  completed?: boolean;
};

export type VisitWizardStep = BaseStep;

type VisitWizardPanelProps = {
  steps: VisitWizardStep[];
  activeStep: string;
  onStepChange?: (stepId: string) => void;
  isFinalized?: boolean;
  announcement?: string;
  className?: string;
  contentRef?: RefObject<HTMLDivElement | null>;
  footer?: ReactNode;
};

export function VisitWizardPanel({
  steps,
  activeStep,
  onStepChange,
  isFinalized = false,
  announcement,
  className,
  contentRef,
  footer,
}: VisitWizardPanelProps) {
  const fallbackStepId = steps[0]?.id ?? "";
  const currentStepId = steps.some((step) => step.id === activeStep)
    ? activeStep
    : fallbackStepId;
  const focusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = contentRef?.current ?? focusRef.current;
    if (!target) return;
    target.focus({ preventScroll: false });
  }, [currentStepId, contentRef]);

  return (
    <section
      className={cn(
        "bg-card rounded-xl border shadow-sm",
        "ring-background/40 focus-within:ring-2 focus-within:ring-offset-1",
        className,
      )}
    >
      {announcement ? (
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>
      ) : null}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold">Ръководен режим</h2>
          <p className="text-muted-foreground text-sm">
            Структурирани стъпки за обработка на посещението.
          </p>
        </div>
      </header>
      <div className="space-y-4 px-6 py-6">
        <Tabs
          value={currentStepId}
          onValueChange={onStepChange}
          className="space-y-4"
        >
          <TabsList className="grid w-full items-start gap-3 bg-transparent p-0 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => {
              const isCompleted = Boolean(step.completed);
              const handleTriggerClick = () => {
                if (isFinalized) return;
                onStepChange?.(step.id);
              };
              return (
                <TabsTrigger
                  key={step.id}
                  value={step.id}
                  className={cn(
                    "flex min-h-[116px] flex-col items-start justify-start gap-1 rounded-lg border px-3 py-3 text-left transition",
                    "cursor-pointer break-words whitespace-normal",
                    "data-[state=active]:border-ring data-[state=active]:bg-background data-[state=active]:shadow",
                  )}
                  disabled={isFinalized}
                  onClick={handleTriggerClick}
                >
                  <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] tracking-wide uppercase">
                    Стъпка {index + 1}
                    {isCompleted ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <X className="size-3 text-red-600" />
                    )}
                  </span>
                  <span
                    className="cursor-pointer text-sm leading-snug font-medium"
                    onClick={handleTriggerClick}
                  >
                    {step.label}
                  </span>
                  {step.summary ? (
                    <span
                      className="text-muted-foreground cursor-pointer text-xs"
                      onClick={handleTriggerClick}
                    >
                      {typeof step.summary === "string" ? (
                        step.summary
                      ) : (
                        <span className="flex flex-col">{step.summary}</span>
                      )}
                    </span>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {steps.map((step) => (
            <TabsContent key={step.id} value={step.id} className="space-y-4">
              <div
                ref={
                  step.id === currentStepId
                    ? (contentRef ?? focusRef)
                    : undefined
                }
                tabIndex={-1}
                role="region"
                aria-labelledby={`wizard-step-${step.id}`}
                className="space-y-4 focus:outline-none"
              >
                <h3 id={`wizard-step-${step.id}`} className="sr-only">
                  {step.label}
                </h3>
                {step.description ? (
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                ) : null}
                {step.hints ? (
                  <Accordion
                    type="single"
                    collapsible
                    className="bg-muted/40 mt-17 rounded-lg border"
                  >
                    <AccordionItem value="hints">
                      <AccordionTrigger className="px-3 text-sm font-medium">
                        Съвети и помощ
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 px-3 py-3 text-sm">
                        {step.hints}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : null}
                <div className="bg-background rounded-lg border p-4 shadow-sm">
                  {step.content}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      {footer ? (
        <div className="bg-muted/20 border-t px-6 py-4">{footer}</div>
      ) : null}
    </section>
  );
}

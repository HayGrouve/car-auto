"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
  stepIndicator?: ReactNode;
};

export function VisitWizardPanel({
  steps,
  activeStep,
  onStepChange,
  isFinalized: _isFinalized = false,
  announcement,
  className,
  contentRef,
  footer,
  stepIndicator,
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
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-4">
        <div>
          <h2 className="text-xl font-semibold">Ръководен режим</h2>
          <p className="text-muted-foreground text-sm">
            Структурирани стъпки за обработка на посещението.
          </p>
        </div>
      </header>
      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        <Tabs
          value={currentStepId}
          onValueChange={onStepChange}
        >
          {steps.map((step) => (
            <TabsContent key={step.id} value={step.id} className="mt-0 space-y-4">
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
                <div className="bg-background rounded-lg border p-3 shadow-sm sm:p-4">
                  {step.content}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      {footer || stepIndicator ? (
        <div className="bg-muted/20 border-t">
          {stepIndicator ? (
            <div className="border-b px-4 py-2 sm:px-6">{stepIndicator}</div>
          ) : null}
          {footer ? <div className="px-4 py-3 sm:px-6 sm:py-4">{footer}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

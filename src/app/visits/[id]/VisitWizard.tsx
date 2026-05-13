"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { type Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, ChevronRight, X } from "lucide-react";
import { type VisitDoc } from "@/types/visit";
import { Badge } from "@/components/ui/badge";

type Step = "notes" | "services" | "parts";

export default function VisitWizard({ id }: { id: Id<"visits"> }) {
  const visit = useQuery(api.visits.getById, { id }) as
    | VisitDoc
    | null
    | undefined;
  const updateVisit = useMutation(api.visits.update);

  const [currentStep, setCurrentStep] = useState<Step>("notes");

  // Local state for the form fields
  const [issue, setIssue] = useState("");
  const [plan, setPlan] = useState("");

  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");
  const [parts, setParts] = useState<string[]>([]);
  const [newPart, setNewPart] = useState("");

  const [hydrated, setHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!hydrated && visit) {
      setIssue(visit.notes?.issue ?? "");
      setPlan(visit.notes?.plan ?? "");
      setServices(visit.services ?? []);
      setParts(visit.parts ?? []);
      setHydrated(true);
    }
  }, [visit, hydrated]);

  const handleSave = async (nextStep?: Step) => {
    if (!visit) return;
    setIsSaving(true);
    try {
      await updateVisit({
        id,
        notes: {
          issue,
          plan,
        },
        services,
        parts,
      });
      toast.success("Запазено");
      if (nextStep) {
        setCurrentStep(nextStep);
      } else {
        setCurrentStep("notes");
      }
    } catch (error) {
      console.error(error);
      toast.error("Грешка при запазване");
    } finally {
      setIsSaving(false);
    }
  };

  if (!visit) return <div>Зареждане...</div>;

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      {/* Wizard Header / Progress */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
            <button
              onClick={() => setCurrentStep("notes")}
              className={`flex items-center cursor-pointer gap-1 ${currentStep === "notes" ? "text-primary" : "text-muted-foreground"}`}
            >
              <span className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs">
                1
              </span>
              Анализ
            </button>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
            <button
              onClick={() => setCurrentStep("services")}
              className={`flex items-center cursor-pointer gap-1 ${currentStep === "services" ? "text-primary" : "text-muted-foreground"}`}
            >
              <span className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs">
                2
              </span>
              Услуги
            </button>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
            <button
              onClick={() => setCurrentStep("parts")}
              className={`flex items-center cursor-pointer gap-1 ${currentStep === "parts" ? "text-primary" : "text-muted-foreground"}`}
            >
              <span className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs">
                3
              </span>
              Части
            </button>
        </div>
      </div>

      {/* Wizard Content */}
      <div className="p-6">
        {currentStep === "notes" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Анализ</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Оплакване</Label>
                <Textarea
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="Какво е оплакването на клиента?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>План за ремонт</Label>
                <Textarea
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  placeholder="Какво предстои да се направи?"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => handleSave("services")}
                disabled={isSaving}
              >
                Напред <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === "services" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Услуги</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  placeholder="Добави услуга..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newService.trim()) {
                      e.preventDefault();
                      setServices([...services, newService.trim()]);
                      setNewService("");
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newService.trim()) {
                      setServices([...services, newService.trim()]);
                      setNewService("");
                    }
                  }}
                >
                  Добави
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {services.map((service, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {service}
                    <button
                      onClick={() =>
                        setServices(services.filter((_, i) => i !== idx))
                      }
                      className="text-muted-foreground hover:text-foreground ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {services.length === 0 && (
                  <span className="text-muted-foreground text-sm">
                    Няма добавени услуги
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("notes")}
                disabled={isSaving}
              >
                Назад
              </Button>
              <Button onClick={() => handleSave("parts")} disabled={isSaving}>
                Напред <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === "parts" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Части</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newPart}
                  onChange={(e) => setNewPart(e.target.value)}
                  placeholder="Добави част..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPart.trim()) {
                      e.preventDefault();
                      setParts([...parts, newPart.trim()]);
                      setNewPart("");
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newPart.trim()) {
                      setParts([...parts, newPart.trim()]);
                      setNewPart("");
                    }
                  }}
                >
                  Добави
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {parts.map((part, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {part}
                    <button
                      onClick={() =>
                        setParts(parts.filter((_, i) => i !== idx))
                      }
                      className="text-muted-foreground hover:text-foreground ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {parts.length === 0 && (
                  <span className="text-muted-foreground text-sm">
                    Няма добавени части
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("services")}
                disabled={isSaving}
              >
                Назад
              </Button>
              <Button onClick={() => handleSave()} disabled={isSaving}>
                <Check className="mr-2 h-4 w-4" /> Готово
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import type { VisitDoc } from "@/types/visit";
import { useState } from "react";
import { toast } from "sonner";

const VisitPdf = dynamic(() => import("@/components/pdf/VisitPdf"), { ssr: false });

export default function VisitPdfButton({
  visit,
  soap,
  procedures,
  medications,
  fileName,
}: {
  visit: VisitDoc;
  soap: { s?: string; o?: string; a?: string; p?: string };
  procedures: string[];
  medications: string[];
  fileName: string;
}) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      const { pdf } = await import("@react-pdf/renderer");
      const docEl = <VisitPdf visit={visit} soap={soap} procedures={procedures} medications={medications} />;
      const blob = await pdf(docEl).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed", err);
      try { toast.error("Неуспешно генериране на PDF"); } catch {}
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="ghost" disabled={loading} aria-label="Изтегли PDF на посещението" onClick={onClick}>
      {loading ? "Генериране..." : <FileText className="size-4" />}
    </Button>
  );
}



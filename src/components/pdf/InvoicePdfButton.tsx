"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { InvoiceDoc } from "@/types/visit";

const InvoicePdf = dynamic(() => import("@/components/pdf/InvoicePdf"), { ssr: false });

export default function InvoicePdfButton({
  inv,
  fileName,
  variant = "ghost",
  className,
  ariaLabel = "Изтегли PDF на фактурата",
}: {
  inv: InvoiceDoc;
  fileName: string;
  variant?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      const { pdf } = await import("@react-pdf/renderer");
      const docEl = <InvoicePdf inv={inv} />;
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
    <Button type="button" variant={variant as any} className={className} disabled={loading} aria-label={ariaLabel} onClick={onClick}>
      {loading ? "Генериране..." : <FileText className="size-4" />}
    </Button>
  );
}



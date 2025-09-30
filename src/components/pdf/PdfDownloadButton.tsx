"use client";

import { useState } from "react";
import type React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";

type PdfDownloadButtonProps = {
  getDocument: () => Promise<React.ReactElement> | React.ReactElement;
  fileName: string;
  variant?: string;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
};

export default function PdfDownloadButton({
  getDocument,
  fileName,
  variant = "ghost",
  className,
  ariaLabel = "Изтегли PDF",
  children,
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      const docEl = (await Promise.resolve(getDocument())) as React.ReactElement<DocumentProps>;
      const { pdf } = await import("@react-pdf/renderer");
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
    <Button type="button" variant={variant as "default" | "secondary" | "outline" | "ghost"} className={className} disabled={loading} aria-label={ariaLabel} onClick={onClick}>
      {loading ? "Генериране..." : children ?? <FileText className="size-4" />}
    </Button>
  );
}



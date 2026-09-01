import { useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFile } from "@/lib/portal.functions";

export function UploadField({
  label,
  folder,
  onUploaded,
  accept = "image/*,application/pdf",
}: {
  label: string;
  folder: string;
  onUploaded: (url: string) => void;
  accept?: string;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="file"
        accept={accept}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 8 * 1024 * 1024) {
            toast.error("File must be under 8MB.");
            return;
          }
          setStatus("uploading");
          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error("read failed"));
              reader.readAsDataURL(file);
            });
            const res = await uploadFile({ data: { dataUrl, folder } });
            onUploaded(res.url);
            setStatus("done");
          } catch {
            setStatus("idle");
            toast.error("Upload failed. Please try again.");
          }
        }}
      />
      <p className="text-xs text-muted-foreground">
        {status === "uploading" ? "Uploading…" : status === "done" ? "Uploaded ✓" : "Max 8MB"}
      </p>
    </div>
  );
}

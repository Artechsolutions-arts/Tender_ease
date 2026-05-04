import { useRef, useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useUploadDocument } from "@/hooks/useDocuments";
import { DOC_TYPE_LABELS, type DocType } from "@/types/documents";
import { useToast } from "@/hooks/use-toast";

interface Props {
  vendorId?: string;
  tenderId?: string;
  onSuccess?: () => void;
}

const MAX_MB = 10;

export function DocumentUpload({ vendorId, tenderId, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>("OTHER");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const upload = useUploadDocument();

  const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

  function pick(picked: File) {
    if (!ALLOWED.includes(picked.type)) {
      toast({ title: "Unsupported file type", description: "Upload PDF, PNG, JPG, or WEBP only.", variant: "destructive" });
      return;
    }
    if (picked.size > MAX_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Maximum allowed size is ${MAX_MB} MB.`, variant: "destructive" });
      return;
    }
    setFile(picked);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pick(f);
  }

  async function submit() {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docType", docType);
    if (vendorId) fd.append("vendorId", vendorId);
    if (tenderId) fd.append("tenderId", tenderId);

    try {
      await upload.mutateAsync(fd);
      toast({ title: "Document uploaded", description: "OCR and AI validation will run in the background." });
      setFile(null);
      onSuccess?.();
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors
          ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
        />
        {file ? (
          <div className="flex items-center gap-3 w-full max-w-xs">
            <FileText className="h-8 w-8 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-gray-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Drop file here or click to browse</p>
              <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG, WEBP — max {MAX_MB} MB</p>
            </div>
          </>
        )}
      </div>

      {/* Document type */}
      <div className="space-y-1.5">
        <Label>Document Type</Label>
        <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={submit} disabled={!file || upload.isPending} className="w-full">
        {upload.isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
        ) : (
          <><Upload className="mr-2 h-4 w-4" /> Upload & Validate</>
        )}
      </Button>
    </div>
  );
}

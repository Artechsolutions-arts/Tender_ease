import { useState } from "react";
import { Download, ExternalLink, FileText, ZoomIn, ZoomOut, RotateCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VendorDocument } from "@/types/documents";
import { getUploadUrl } from "@/lib/api";

interface Props {
  doc: VendorDocument;
}

export function DocumentPreview({ doc }: Props) {
  const [zoom, setZoom] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const url = doc.publicUrl ?? getUploadUrl(doc.fileName);
  const isImage = doc.mimeType.startsWith("image/");
  const isPdf = doc.mimeType === "application/pdf";
  const isText = doc.mimeType === "text/plain";
  const unavailable = (isImage && imgError) || (isPdf && pdfError);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-gray-700">{doc.originalName}</p>
          <p className="text-[10px] text-gray-400">{doc.mimeType} · {(doc.fileSize / 1024).toFixed(0)} KB</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isImage && !imgError && (
            <>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                title="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                disabled={zoom <= 0.25}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-[36px] text-center text-xs text-gray-500">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                title="Zoom in"
                onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                disabled={zoom >= 4}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                title="Reset zoom"
                onClick={() => setZoom(1)}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {!unavailable && (
            <>
              <a href={url} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Open in new tab">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
              <a href={url} download={doc.originalName}>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Download">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Preview area */}
      <div className="overflow-auto bg-gray-100" style={{ maxHeight: "320px" }}>
        {isImage && !imgError ? (
          <div className="flex min-h-32 items-start justify-center p-4">
            <img
              src={url}
              alt={doc.originalName}
              onError={() => setImgError(true)}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
                maxWidth: "100%",
                display: "block",
              }}
              className="rounded shadow-sm"
            />
          </div>
        ) : isPdf && !pdfError ? (
          <iframe
            src={url}
            title={doc.originalName}
            className="w-full border-0"
            style={{ height: "320px" }}
            onError={() => setPdfError(true)}
          />
        ) : unavailable ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-amber-500">
            <AlertTriangle className="h-10 w-10 opacity-60" />
            <p className="text-sm font-medium text-gray-600">File unavailable</p>
            <p className="text-xs text-gray-400">This document was deleted or could not be loaded.</p>
          </div>
        ) : isText && doc.ocrText ? (
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap p-4 text-xs font-mono leading-relaxed text-gray-700">
            {doc.ocrText}
          </pre>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
            <FileText className="h-12 w-12 opacity-40" />
            <p className="text-sm font-medium">Preview not available</p>
            <p className="text-xs text-gray-400">{doc.mimeType}</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-3 w-3" /> Open File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

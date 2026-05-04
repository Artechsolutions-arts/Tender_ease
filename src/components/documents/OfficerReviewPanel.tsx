import { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useReviewDocument } from "@/hooks/useDocuments";
import { useToast } from "@/hooks/use-toast";
import type { VendorDocument } from "@/types/documents";

interface Props {
  doc: VendorDocument;
  onDone?: () => void;
}

type Decision = "APPROVED" | "REJECTED" | "NEEDS_MORE_INFO";

const DECISIONS: { value: Decision; label: string; icon: React.ElementType; color: string }[] = [
  { value: "APPROVED", label: "Approve", icon: CheckCircle2, color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { value: "REJECTED", label: "Reject", icon: XCircle, color: "bg-red-600 hover:bg-red-700 text-white" },
  { value: "NEEDS_MORE_INFO", label: "Need More Info", icon: HelpCircle, color: "bg-amber-500 hover:bg-amber-600 text-white" },
];

export function OfficerReviewPanel({ doc, onDone }: Props) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [remarks, setRemarks] = useState("");
  const { toast } = useToast();
  const review = useReviewDocument();

  const v = doc.validation;
  if (!v || v.status === "OFFICER_APPROVED" || v.status === "OFFICER_REJECTED") {
    return null;
  }

  async function submit() {
    if (!decision) return;
    try {
      await review.mutateAsync({ id: doc.id, decision, remarks });
      toast({ title: `Document ${decision.toLowerCase().replace(/_/g, " ")}` });
      onDone?.();
    } catch {
      toast({ title: "Review failed", description: "Please try again.", variant: "destructive" });
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Officer Review</p>

      <div className="flex flex-wrap gap-2">
        {DECISIONS.map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            type="button"
            onClick={() => setDecision(value)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all
              ${decision === value ? `${color} border-transparent scale-105` : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Remarks {decision === "REJECTED" || decision === "NEEDS_MORE_INFO" ? "(required)" : "(optional)"}</Label>
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add notes for the vendor or audit trail…"
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      <Button
        onClick={submit}
        disabled={
          !decision ||
          review.isPending ||
          (decision !== "APPROVED" && remarks.trim().length < 5)
        }
        className="w-full"
      >
        {review.isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
        ) : (
          "Submit Decision"
        )}
      </Button>
    </div>
  );
}

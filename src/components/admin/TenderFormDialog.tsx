import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAdmin, type Tender, type TenderDoc } from "@/store/admin-store";

function DatePickerField({
  label, value, onChange, disabled, fromDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  fromDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "mt-1 w-full justify-start text-left font-normal h-9 text-sm",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {selected ? format(selected, "dd MMM yyyy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onChange(date ? date.toISOString().slice(0, 10) : "");
              setOpen(false);
            }}
            disabled={fromDate ? { before: fromDate } : undefined}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tender?: Tender;
}

const CATEGORIES = ["Civil Works", "Goods / Supplies", "Services", "IT / e-Gov", "Consultancy", "Healthcare", "Auction / Sale"];
const DEPARTMENTS = ["Roads & Buildings", "School Education", "Health & Family Welfare", "MA & UD", "Sanitation", "Energy", "Agriculture", "Revenue"];

const REQUIRED_DOC_PRESETS = [
  "PAN Card",
  "GST Registration Certificate",
  "Company Registration / Incorporation Certificate",
  "EMD (Earnest Money Deposit) Proof",
  "Tender Fee Receipt",
  "Audited Financial Statements (last 3 years)",
  "Income Tax Returns (last 3 years)",
  "Bank Solvency Certificate",
  "Technical Bid / Proposal",
  "Financial Bid / Price Schedule",
  "Past Experience / Work Order Copies",
  "ISO / Quality Certifications",
  "Power of Attorney",
  "Self-Declaration of Non-Blacklisting",
  "MSME / Startup Registration (if applicable)",
];

export function TenderFormDialog({ open, onOpenChange, tender }: Props) {
  const { vendors, createTender, updateTender } = useAdmin();
  const isEdit = !!tender;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [docs, setDocs] = useState<TenderDoc[]>([]);
  const [eligible, setEligible] = useState<string[]>([]);
  const [changeNote, setChangeNote] = useState("");
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [customDoc, setCustomDoc] = useState("");
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState("All");

  useEffect(() => {
    if (open) {
      setName(tender?.name ?? "");
      setDescription(tender?.description ?? "");
      setStartDate(tender?.startDate ?? new Date().toISOString().slice(0, 10));
      setEndDate(tender?.endDate ?? "");
      setEstimatedValue(tender ? String(tender.estimatedValue) : "");
      setCategory(tender?.category ?? CATEGORIES[0]);
      setDepartment(tender?.department ?? DEPARTMENTS[0]);
      setDocs(tender?.documents ?? []);
      setEligible(tender?.eligibleVendorIds ?? []);
      setChangeNote("");
      setRequiredDocs((tender as any)?.requiredDocuments ?? []);
      setCustomDoc("");
      setVendorCategoryFilter("All");
    }
  }, [open, tender]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const mapped: TenderDoc[] = files.map((f, i) => ({
      id: `${Date.now()}-${i}`, name: f.name, size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
    }));
    setDocs((d) => [...d, ...mapped]);
    e.target.value = "";
  };

  const removeDoc = (id: string) => setDocs((d) => d.filter((x) => x.id !== id));

  const vendorCategories = useMemo(() => ["All", ...Array.from(new Set(vendors.map((v) => v.category)))], [vendors]);

  const filteredVendors = useMemo(() =>
    vendorCategoryFilter === "All" ? vendors : vendors.filter((v) => v.category === vendorCategoryFilter),
    [vendors, vendorCategoryFilter]
  );

  const selectableFiltered = filteredVendors.filter((v) => !v.blacklisted);
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every((v) => eligible.includes(v.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setEligible((p) => p.filter((id) => !selectableFiltered.find((v) => v.id === id)));
    } else {
      setEligible((p) => Array.from(new Set([...p, ...selectableFiltered.map((v) => v.id)])));
    }
  };

  const toggleVendor = (id: string) => setEligible((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const toggleRequiredDoc = (doc: string) =>
    setRequiredDocs((p) => (p.includes(doc) ? p.filter((x) => x !== doc) : [...p, doc]));

  const addCustomDoc = () => {
    const v = customDoc.trim();
    if (!v) return;
    if (requiredDocs.includes(v)) return toast.error("Already added");
    setRequiredDocs((p) => [...p, v]);
    setCustomDoc("");
  };

  const submit = () => {
    if (!name.trim()) return toast.error("Tender name is required");
    if (description.trim().length < 20) return toast.error("Description too short", { description: "Enter at least 20 characters describing the scope of work." });
    if (!startDate) return toast.error("Start date is required");
    if (!endDate) return toast.error("End date is required");
    if (new Date(endDate) <= new Date(startDate)) return toast.error("End date must be after start date");
    if (!estimatedValue || Number(estimatedValue) <= 0) return toast.error("Estimated value is required", { description: "Enter a value greater than ₹0." });
    if (eligible.length === 0) return toast.error("Select at least one eligible vendor");
    if (requiredDocs.length === 0) return toast.error("Specify at least one required document for bidders");

    const payload = {
      name: name.trim(),
      description: description.trim(),
      startDate, endDate,
      estimatedValue: Number(estimatedValue),
      category, department,
      documents: docs,
      eligibleVendorIds: eligible,
      requiredDocuments: requiredDocs,
    };

    if (isEdit && tender) {
      const note = changeNote.trim() || "Tender details revised";
      updateTender(tender.id, payload, note);
      toast.success("Tender updated", { description: `Version history recorded · ${eligible.length} vendor(s) notified` });
    } else {
      const created = createTender(payload);
      toast.success("Tender created", { description: `${created.id} saved as Draft` });
    }
    onOpenChange(false);
  };

  const locked = isEdit && tender && (tender.status === "Awarded" || new Date(tender.endDate) < new Date() && tender.status !== "Draft");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Tender · ${tender?.id}` : "Create New Tender (NIT)"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Updates create a new version in history. Eligible vendors will be notified of the change."
              : "Tender will be saved as Draft. Publish it from the tender detail page to notify eligible vendors."}
          </DialogDescription>
        </DialogHeader>

        {locked && (
          <div className="rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-[hsl(38_95%_25%)]">
            ⚠ This tender can no longer be edited (deadline passed or already awarded).
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-xs">Tender Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Construction of 4-Lane Bypass Road – Vijayawada Phase II" disabled={!!locked} />
          </div>

          <div>
            <Label className="text-xs">Department</Label>
            <Select value={department} onValueChange={setDepartment} disabled={!!locked}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={!!locked}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <DatePickerField
            label="Start Date *"
            value={startDate}
            onChange={(v) => { setStartDate(v); if (endDate && v > endDate) setEndDate(""); }}
            disabled={!!locked}
            fromDate={new Date(new Date().setHours(0, 0, 0, 0))}
          />

          <DatePickerField
            label="End Date / Deadline *"
            value={endDate}
            onChange={setEndDate}
            disabled={!!locked}
            fromDate={startDate ? new Date(startDate + "T00:00:00") : new Date(new Date().setHours(0, 0, 0, 0))}
          />

          <div className="md:col-span-2">
            <Label className="text-xs">Estimated Value (₹)</Label>
            <Input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="e.g. 24500000" disabled={!!locked} />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs">Description / Scope of Work</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!!locked} />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs">Documents</Label>
            <div className="rounded-sm border border-dashed border-border bg-secondary/30 p-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-primary/40 bg-card px-3 py-1.5 text-xs font-medium text-primary hover:bg-secondary">
                <Paperclip className="h-3.5 w-3.5" /> Attach files
                <input type="file" multiple className="hidden" onChange={onPickFiles} disabled={!!locked} />
              </label>
              {docs.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between rounded-sm bg-card px-2 py-1 text-xs">
                      <span className="flex items-center gap-2"><Paperclip className="h-3 w-3 text-muted-foreground" /> {d.name} <span className="text-muted-foreground">· {d.size}</span></span>
                      {!locked && (
                        <button onClick={() => removeDoc(d.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs">Eligible Vendors * <span className="font-normal text-muted-foreground">({eligible.length} selected)</span></Label>
            <div className="mb-2 flex items-center gap-2">
              <Select value={vendorCategoryFilter} onValueChange={setVendorCategoryFilter} disabled={!!locked}>
                <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vendorCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={!!locked || selectableFiltered.length === 0}
                onClick={toggleSelectAll}
              >
                {allFilteredSelected ? "Deselect All" : "Select All"}
                {vendorCategoryFilter !== "All" && ` (${vendorCategoryFilter})`}
              </Button>
              <span className="text-xs text-muted-foreground">{filteredVendors.length} shown</span>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-sm border border-border bg-card">
              {filteredVendors.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No vendors in this category.</p>
              )}
              {filteredVendors.map((v) => (
                <label key={v.id} className={`flex items-center gap-3 border-b border-border/60 px-3 py-2 text-xs last:border-0 hover:bg-secondary/40 ${v.blacklisted ? "opacity-50" : ""}`}>
                  <Checkbox checked={eligible.includes(v.id)} disabled={v.blacklisted || !!locked} onCheckedChange={() => toggleVendor(v.id)} />
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{v.companyName} {v.blacklisted && <span className="ml-2 rounded-sm bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">BLACKLISTED</span>}</p>
                      <p className="text-muted-foreground">{v.id} · {v.category} · {v.email}</p>
                    </div>
                    <span className="text-muted-foreground">Score {v.pastPerformance}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs">
              Required Documents from Bidders *{" "}
              <span className="font-normal text-muted-foreground">({requiredDocs.length} selected)</span>
            </Label>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Select the documents that bidders must submit along with their bid. Vendors will see this checklist on the tender detail page.
            </p>
            <div className="rounded-sm border border-border bg-card p-3">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {REQUIRED_DOC_PRESETS.map((doc) => (
                  <label
                    key={doc}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-secondary/40"
                  >
                    <Checkbox
                      checked={requiredDocs.includes(doc)}
                      disabled={!!locked}
                      onCheckedChange={() => toggleRequiredDoc(doc)}
                    />
                    <span className="text-foreground">{doc}</span>
                  </label>
                ))}
              </div>

              {requiredDocs.some((d) => !REQUIRED_DOC_PRESETS.includes(d)) && (
                <div className="mt-3 border-t border-border/60 pt-3">
                  <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Custom requirements</p>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredDocs
                      .filter((d) => !REQUIRED_DOC_PRESETS.includes(d))
                      .map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1 rounded-sm bg-secondary px-2 py-1 text-[11px] text-foreground"
                        >
                          {d}
                          {!locked && (
                            <button
                              onClick={() => toggleRequiredDoc(d)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
                <Input
                  value={customDoc}
                  onChange={(e) => setCustomDoc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomDoc();
                    }
                  }}
                  placeholder="Add custom document requirement (e.g. Site Visit Certificate)"
                  disabled={!!locked}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomDoc}
                  disabled={!!locked || !customDoc.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {isEdit && (
            <div className="md:col-span-2">
              <Label className="text-xs">Reason for change (recorded in version history)</Label>
              <Input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="e.g. Deadline extended by 7 days due to clarifications" disabled={!!locked} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={submit} disabled={!!locked}>
            {isEdit ? "Save Changes" : "Create Tender (Draft)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

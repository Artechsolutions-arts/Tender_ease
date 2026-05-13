import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/store/auth-store";
import { Building2, CheckCircle2, UserCheck, FileText, ShieldAlert, Factory, Stamp, Landmark, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";

export default function VendorSignup() {
  const navigate = useNavigate();
  const { registerVendor, submitVerification, currentUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mobileDigits, setMobileDigits] = useState("");
  const [savedSections, setSavedSections] = useState<Set<string>>(new Set());
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string>("company");

  const SECTIONS = ["company", "financial", "capability", "documents", "signatory"] as const;
  type SectionKey = typeof SECTIONS[number];

  const canOpen = (key: string) => {
    const idx = SECTIONS.indexOf(key as SectionKey);
    if (idx === 0) return true;
    return savedSections.has(SECTIONS[idx - 1]);
  };

  const handleAccordionChange = (value: string) => {
    if (!value) return;
    if (canOpen(value)) {
      setOpenSection(value);
    } else {
      toast.warning("Please save the current section before proceeding.");
    }
  };

  const saveSection = (key: string, label: string) => {
    setSavingSection(key);
    setTimeout(() => {
      setSavedSections((prev) => new Set(prev).add(key));
      setSavingSection(null);
      toast.success(`${label} saved successfully`);
      const idx = SECTIONS.indexOf(key as SectionKey);
      if (idx < SECTIONS.length - 1) setOpenSection(SECTIONS[idx + 1]);
    }, 600);
  };

  useEffect(() => {
    document.title = "Vendor Registration — AP e-Procurement";
  }, []);

  const handleQuickSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const company = fd.get("companyName") as string;
    const contact = fd.get("contactPerson") as string;
    const rawPhone = fd.get("mobile") as string;
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const confirmPassword = fd.get("confirmPassword") as string;

    if (!rawPhone || rawPhone.length !== 10 || !/^[6-9]/.test(rawPhone)) {
      toast.error("Enter a valid 10-digit Indian mobile number starting with 6–9");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    const phone = `+91${rawPhone}`;

    setIsSubmitting(true);
    try {
      await registerVendor({ company, contact, phone, email, password });
      setStep(2);
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.detail
        ?? data?.details?.[0]?.message?.replace(/^Value error,\s*/i, "")
        ?? data?.error
        ?? "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFullSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    submitVerification();
    setIsSubmitting(false);
    setStep(3);
  };

  return (
    <main className="min-h-screen bg-secondary/60">
      <div className="border-b-4 border-accent bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/10 ring-1 ring-primary-foreground/25">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-primary-foreground/75">Government of Andhra Pradesh</p>
              <h1 className="text-base font-bold md:text-xl">AP e-Procurement Portal</h1>
            </div>
          </div>
          <Button variant="link" onClick={() => navigate("/login")} className="text-primary-foreground hover:text-accent">
            Back to Login
          </Button>
        </div>
      </div>

      <section className={`mx-auto px-4 py-8 md:px-8 ${step === 2 ? 'max-w-4xl' : 'max-w-3xl'}`}>
        <Card className="rounded-sm border-border p-5 shadow-elegant-lg md:p-8">
          {step === 3 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-success" />
              <h2 className="text-2xl font-bold text-primary">Registration Request Submitted</h2>
              <div className="rounded-sm border border-border bg-secondary/50 p-4 w-full max-w-md">
                <p className="flex justify-between text-sm"><span className="text-muted-foreground">Reference ID:</span><span className="font-bold font-mono">{currentUser?.vendorId ? `PND-${currentUser.vendorId.replace(/-/g, "").substring(0, 8).toUpperCase()}` : "—"}</span></p>
                <p className="flex justify-between text-sm mt-2"><span className="text-muted-foreground">Status:</span><span className="font-bold text-warning">Pending Verification</span></p>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Your request has been forwarded to the concerned officer for preliminary approval. Once approved, you will be able to log in to complete your profile.
              </p>

              <div className="mt-8 w-full border-t border-border pt-8 mb-4">
                <h4 className="text-xs font-bold text-primary mb-6 uppercase tracking-wider text-left">Registration Journey</h4>
                <div className="relative flex justify-between">
                  <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-0"></div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-success text-success-foreground flex items-center justify-center mb-2 shadow-sm ring-4 ring-background">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-success">Quick Signup</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center opacity-40">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-2 shadow-sm ring-4 ring-background animate-pulse">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-primary">Govt Review</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center opacity-40">
                    <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-2 shadow-sm ring-4 ring-background">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase">Full Profile</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center opacity-40">
                    <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-2 shadow-sm ring-4 ring-background">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase">Final Audit</span>
                  </div>
                </div>
              </div>

              <Button onClick={() => navigate("/login")} className="mt-4 rounded-sm">
                Track Registration Status
              </Button>
            </div>
          ) : step === 2 ? (
            <>
              <div className="mb-6 border-b border-border pb-4">
                <h2 className="text-xl font-bold text-primary">Full Vendor Verification</h2>
                <p className="text-sm text-muted-foreground">Complete all sections to activate your bidding capabilities.</p>
              </div>

              <form onSubmit={handleFullSubmit} className="space-y-6">
                <Accordion type="single" value={openSection} onValueChange={handleAccordionChange} className="w-full space-y-4">

                  {/* Company Details */}
                  <AccordionItem value="company" className="border rounded-sm bg-card px-4 shadow-sm text-left">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-2 text-primary font-bold w-full pr-2">
                        <Building2 className="h-5 w-5 shrink-0" />
                        <span>Company Details</span>
                        {savedSections.has("company") && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Registration Certificate</Label>
                          <Input type="file" />
                        </div>
                        <div className="space-y-2">
                          <Label>PAN Document</Label>
                          <Input type="file" />
                        </div>
                        <div className="space-y-2">
                          <Label>GST Registration</Label>
                          <Input type="file" />
                        </div>
                        <div className="space-y-2">
                          <Label>CIN / LLPIN (if applicable)</Label>
                          <Input placeholder="Enter CIN or LLPIN" />
                        </div>
                        <div className="space-y-2">
                          <Label>Year Established</Label>
                          <Input type="number" placeholder="YYYY" min="1900" max="2026" />
                        </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-border">
                        <h4 className="font-semibold text-sm">Address Details</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Registered Office Address</Label>
                            <Textarea placeholder="Full registered address" className="min-h-[80px]" />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Branch Office Address</Label>
                            <Textarea placeholder="Full branch address (if any)" className="min-h-[80px]" />
                          </div>
                          <div className="space-y-2">
                            <Label>District / State</Label>
                            <Input placeholder="District, State" />
                          </div>
                          <div className="space-y-2">
                            <Label>PIN Code</Label>
                            <Input placeholder="6-digit PIN" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end pt-3 border-t border-border">
                        <Button type="button" onClick={() => saveSection("company", "Company Details")} disabled={savingSection === "company"} className="rounded-sm min-w-[150px]">
                          {savingSection === "company" ? "Saving…" : savedSections.has("company") ? "✓ Saved" : "Save & Continue"}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Financials */}
                  <AccordionItem value="financial" className={`border rounded-sm bg-card px-4 shadow-sm text-left ${!canOpen("financial") ? "opacity-60" : ""}`}>
                    <AccordionTrigger className="hover:no-underline py-4" disabled={!canOpen("financial")}>
                      <div className="flex items-center gap-2 text-primary font-bold w-full pr-2">
                        <Landmark className="h-5 w-5 shrink-0" />
                        <span>Financial Details</span>
                        {savedSections.has("financial") && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                        {!canOpen("financial") && <Lock className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Annual Turnover (Last 3 Years avg in INR)</Label>
                          <Input type="number" placeholder="e.g. 5000000" />
                        </div>
                        <div className="space-y-2">
                          <Label>Cancelled Cheque</Label>
                          <Input type="file" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <h4 className="font-semibold text-sm font-bold uppercase tracking-wider">Bank Details</h4>
                        </div>
                        <div className="space-y-2">
                          <Label>Bank Name</Label>
                          <Input placeholder="Enter bank name" />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Number</Label>
                          <Input placeholder="Enter account number" />
                        </div>
                        <div className="space-y-2">
                          <Label>IFSC Code</Label>
                          <Input placeholder="Enter IFSC code" />
                        </div>
                      </div>
                      <div className="flex justify-end pt-3 border-t border-border">
                        <Button type="button" onClick={() => saveSection("financial", "Financial Details")} disabled={savingSection === "financial"} className="rounded-sm min-w-[150px]">
                          {savingSection === "financial" ? "Saving…" : savedSections.has("financial") ? "✓ Saved" : "Save & Continue"}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Capability */}
                  <AccordionItem value="capability" className={`border rounded-sm bg-card px-4 shadow-sm text-left ${!canOpen("capability") ? "opacity-60" : ""}`}>
                    <AccordionTrigger className="hover:no-underline py-4" disabled={!canOpen("capability")}>
                      <div className="flex items-center gap-2 text-primary font-bold w-full pr-2">
                        <Factory className="h-5 w-5 shrink-0" />
                        <span>Capability &amp; Experience</span>
                        {savedSections.has("capability") && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                        {!canOpen("capability") && <Lock className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Work Categories</Label>
                          <Input placeholder="e.g. Civil Construction, IT Services" />
                        </div>
                        <div className="space-y-2">
                          <Label>Experience Years</Label>
                          <Input type="number" placeholder="Years of experience" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Machinery / Manpower Details</Label>
                          <Textarea placeholder="Briefly describe your equipment and manpower strength" className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Previous Projects Synopsis</Label>
                          <Textarea placeholder="List 2-3 major completed projects" className="min-h-[100px]" />
                        </div>
                      </div>
                      <div className="flex justify-end pt-3 border-t border-border">
                        <Button type="button" onClick={() => saveSection("capability", "Capability & Experience")} disabled={savingSection === "capability"} className="rounded-sm min-w-[150px]">
                          {savingSection === "capability" ? "Saving…" : savedSections.has("capability") ? "✓ Saved" : "Save & Continue"}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Documents */}
                  <AccordionItem value="documents" className={`border rounded-sm bg-card px-4 shadow-sm text-left ${!canOpen("documents") ? "opacity-60" : ""}`}>
                    <AccordionTrigger className="hover:no-underline py-4" disabled={!canOpen("documents")}>
                      <div className="flex items-center gap-2 text-primary font-bold w-full pr-2">
                        <FileText className="h-5 w-5 shrink-0" />
                        <span>Supporting Documents</span>
                        {savedSections.has("documents") && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                        {!canOpen("documents") && <Lock className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>MSME Certificate (if applicable)</Label>
                          <Input type="file" />
                        </div>
                        <div className="space-y-2">
                          <Label>ISO Certificates (if applicable)</Label>
                          <Input type="file" />
                        </div>
                        <div className="space-y-2">
                          <Label>Experience Certificates</Label>
                          <Input type="file" />
                        </div>
                        <div className="space-y-2">
                          <Label>Tax Returns (Last 3 Years)</Label>
                          <Input type="file" />
                        </div>
                      </div>
                      <div className="flex justify-end pt-3 border-t border-border">
                        <Button type="button" onClick={() => saveSection("documents", "Supporting Documents")} disabled={savingSection === "documents"} className="rounded-sm min-w-[150px]">
                          {savingSection === "documents" ? "Saving…" : savedSections.has("documents") ? "✓ Saved" : "Save & Continue"}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Authorized Signatory */}
                  <AccordionItem value="signatory" className={`border rounded-sm bg-card px-4 shadow-sm text-left ${!canOpen("signatory") ? "opacity-60" : ""}`}>
                    <AccordionTrigger className="hover:no-underline py-4" disabled={!canOpen("signatory")}>
                      <div className="flex items-center gap-2 text-primary font-bold w-full pr-2">
                        <Stamp className="h-5 w-5 shrink-0" />
                        <span>Authorized Signatory</span>
                        {savedSections.has("signatory") && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                        {!canOpen("signatory") && <Lock className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Aadhaar / ID Proof</Label>
                          <Input type="file" />
                        </div>
                        <div className="space-y-2">
                          <Label>Authorization Letter</Label>
                          <Input type="file" />
                          <p className="text-[10px] text-muted-foreground mt-1 text-left">Letter authorizing the signatory, signed by directors/partners.</p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-3 border-t border-border">
                        <Button type="button" onClick={() => saveSection("signatory", "Authorized Signatory")} disabled={savingSection === "signatory"} className="rounded-sm min-w-[150px]">
                          {savingSection === "signatory" ? "Saving…" : savedSections.has("signatory") ? "✓ Saved" : "Save"}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>

                <div className="pt-4 flex justify-end gap-3 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button type="submit" disabled={isSubmitting} className="rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 min-w-[200px]">
                    {isSubmitting ? "Submitting..." : "Submit Full Profile"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6 border-b border-border pb-4">
                <h2 className="text-xl font-bold text-primary">Vendor Registration</h2>
                <p className="text-sm text-muted-foreground text-left">Quick signup to initiate the onboarding process.</p>
              </div>

              <form onSubmit={handleQuickSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company / Firm Name <span className="text-destructive">*</span></Label>
                    <Input id="companyName" name="companyName" required placeholder="Enter legal company name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person Name <span className="text-destructive">*</span></Label>
                    <Input id="contactPerson" name="contactPerson" required placeholder="Full Name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number <span className="text-destructive">*</span></Label>
                    <div className="flex h-10 overflow-hidden rounded-sm border border-input focus-within:ring-1 focus-within:ring-ring">
                      <span className="flex items-center px-3 bg-secondary/50 text-sm text-muted-foreground border-r border-input select-none">+91</span>
                      <input
                        id="mobile"
                        name="mobile"
                        type="tel"
                        required
                        value={mobileDigits}
                        onChange={(e) => setMobileDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        pattern="[6-9][0-9]{9}"
                        maxLength={10}
                        placeholder="10-digit number"
                        className="flex-1 px-3 bg-background text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email ID <span className="text-destructive">*</span></Label>
                    <Input id="email" name="email" type="email" required placeholder="Professional email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} required className="pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Min 12 chars · uppercase · lowercase · digit · special character</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required className="pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((p) => !p)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proprietorship">Proprietorship</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="llp">LLP</SelectItem>
                        <SelectItem value="pvtltd">Private Limited</SelectItem>
                        <SelectItem value="publtd">Public Limited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ap">Andhra Pradesh</SelectItem>
                        <SelectItem value="ts">Telangana</SelectItem>
                        <SelectItem value="ka">Karnataka</SelectItem>
                        <SelectItem value="tn">Tamil Nadu</SelectItem>
                        <SelectItem value="mh">Maharashtra</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="gstpan">GST / PAN (any one initially) <span className="text-destructive">*</span></Label>
                    <Input id="gstpan" name="gstpan" required placeholder="Enter GSTIN or PAN" />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="terms" required />
                  <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                    I accept the <a href="#" className="text-primary hover:underline">Terms and Conditions</a> and declare that the information provided is correct.
                  </Label>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => navigate("/login")}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="rounded-sm bg-accent text-accent-foreground hover:bg-accent/90">
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </section>
    </main>
  );
}

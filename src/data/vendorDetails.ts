import type { Vendor } from "@/store/admin-store";

export interface CompletedProject {
  id: string;
  name: string;
  tenderRef: string;
  department: string;
  value: number;
  completedOn: string;
  rating: number; // 1–5
  remarks: string;
}

export interface BlacklistEntry {
  orderNo: string;
  date: string;
  authority: string;
  duration: string;
  reason: string;
  description: string;
  relatedTender?: string;
}

export interface VendorDetail {
  address: string;
  city: string;
  state: string;
  turnoverLakhs: number;
  yearsActive: number;
  employees: number;
  completedProjects: CompletedProject[];
  blacklistEntry?: BlacklistEntry;
}

// Seeded random so the same vendor ID always produces the same details
function seededRand(seed: string, idx: number): number {
  let h = idx * 2654435761;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  return ((h >>> 0) / 0xffffffff);
}

function pick<T>(arr: T[], seed: string, idx: number): T {
  return arr[Math.floor(seededRand(seed, idx) * arr.length)];
}

const DEPARTMENTS = [
  "Roads & Buildings", "Public Works", "Health", "Education",
  "Digital Services", "Sanitation", "Irrigation", "Municipal",
  "Culture", "Energy", "Agriculture", "Forest",
];
const TENDER_PREFIXES = ["NIT/RB", "NIT/PW", "NIT/HLT", "NIT/EDU", "NIT/DS", "NIT/SAN", "NIT/MUN"];
const PROJECT_TEMPLATES: [string, string][] = [
  ["Road Widening & Strengthening", "Civil Works"],
  ["Office Complex Renovation", "Civil Works"],
  ["Fiber Network Deployment", "IT & Telecom"],
  ["Medical Equipment Supply", "Healthcare"],
  ["Catering & Housekeeping Services", "Services"],
  ["Solar Panel Installation", "Energy"],
  ["Water Treatment Plant Upgrade", "Infrastructure"],
  ["Waste Collection & Disposal", "Services"],
  ["CCTV Surveillance System", "IT & Telecom"],
  ["School Furniture Supply", "Goods / Supplies"],
  ["ERP Software Implementation", "IT & Telecom"],
  ["Drainage Rehabilitation", "Civil Works"],
  ["Community Health Centre Construction", "Healthcare"],
  ["Outdoor Advertising Structures", "Services"],
  ["Fleet Vehicle Procurement", "Transport"],
  ["Pumping Station Modernisation", "Infrastructure"],
  ["Ambulance Supply & AMC", "Healthcare"],
  ["LED Street Light Replacement", "Energy"],
  ["Library Digitisation Services", "IT & Telecom"],
  ["Road Marking & Signage", "Civil Works"],
];
const REMARKS_GOOD = [
  "Completed ahead of schedule. Work quality rated excellent by inspection team.",
  "All deliverables met as per contract. Zero defect liability claims.",
  "Timely completion with commendable quality. Recommended for future bids.",
  "Performed well under tight timeline. Final inspection passed without observations.",
  "Good workmanship. Minor snags resolved promptly during DLP.",
];
const REMARKS_AVG = [
  "Work completed with minor delay of 3 weeks due to monsoon disruption. No penalty levied.",
  "Quality marginally below specification in Phase-2; rectified after inspection notice.",
  "Completed within extended time limit. Performance bond encashed partially.",
  "Acceptable quality overall. A few recurring defects during DLP resolved finally.",
];

const BLACKLIST_REASONS = [
  {
    reason: "Sub-standard material supply",
    description:
      "Vendor supplied M20-grade concrete instead of specified M30 in a bridge-deck project, causing structural deficiency. Third-party audit confirmed the deviation. After show-cause proceedings under GFR 174, the competent authority ordered debarment.",
    relatedTender: "NIT/RB/2023-24/017",
  },
  {
    reason: "Abandonment of contract",
    description:
      "Vendor abandoned a sewerage-network project mid-way (35% physical progress) citing cash-flow issues, causing the department to re-tender at an additional cost of ₹18.4 L. Risk-purchase action initiated; performance guarantee forfeited.",
    relatedTender: "NIT/SAN/2022-23/029",
  },
  {
    reason: "Submission of forged documents",
    description:
      "During document verification, the vendor was found to have submitted a forged ISO 9001 certificate and falsified prior-work completion certificates. FIR registered under IPC §468. CVC recommendation triggered debarment.",
    relatedTender: "NIT/DS/2023-24/004",
  },
  {
    reason: "Non-payment of labour wages",
    description:
      "Vendor failed to disburse wages to 74 contract workers for 4 consecutive months. District Labour Office issued notice; vendor did not comply. Penalty of ₹3.2 L imposed. Debarment recommended by the executing agency.",
    relatedTender: "NIT/MUN/2022-23/041",
  },
  {
    reason: "Cartel formation / bid rigging",
    description:
      "Vendor was found to be part of a price-fixing cartel in collusion with two other bidders. CCI inquiry confirmed identical cost structures across bids. Debarred as per CVC circular dated 14-Nov-2023 on anti-competitive practices.",
  },
];

const AUTHORITIES = [
  "Chief Engineer, R&B Department, GoAP",
  "Director General, Municipal Administration, GoAP",
  "Commissioner, Health & Family Welfare, GoAP",
  "Principal Secretary, IT & Electronics Department, GoAP",
  "Superintending Engineer, PWD Zone-III",
];

export function getVendorDetail(v: Vendor): VendorDetail {
  const s = v.id; // seed string

  const addresses = ["#12, Industrial Estate", "#4B, APIIC Colony", "Plot 7, Govt. Contractor Nagar", "#88-C, Ring Road"];
  const cities = ["Vijayawada", "Visakhapatnam", "Guntur", "Tirupati", "Kurnool", "Nellore", "Kakinada"];
  const states = ["Andhra Pradesh"];

  const address = pick(addresses, s, 1);
  const city = pick(cities, s, 2);
  const state = pick(states, s, 3);
  const turnoverLakhs = Math.round((seededRand(s, 4) * 180 + 20) * 10) / 10;
  const yearsActive = Math.round(seededRand(s, 5) * 18 + 2);
  const employees = Math.round(seededRand(s, 6) * 480 + 20);

  // Generate completed projects based on completedTenders count
  const count = Math.max(v.completedTenders, 0);
  const completedProjects: CompletedProject[] = Array.from({ length: Math.min(count, 8) }, (_, i) => {
    const [name] = pick(PROJECT_TEMPLATES, s, i * 7 + 10) as [string, string];
    const dept = pick(DEPARTMENTS, s, i * 7 + 11);
    const prefix = pick(TENDER_PREFIXES, s, i * 7 + 12);
    const year = 2023 - Math.floor(seededRand(s, i * 7 + 13) * 3);
    const seq = Math.floor(seededRand(s, i * 7 + 14) * 90 + 10);
    const valueL = Math.round((seededRand(s, i * 7 + 15) * 180 + 5) * 100) * 100;
    const rating = v.pastPerformance >= 85 ? (seededRand(s, i * 7 + 16) > 0.3 ? 5 : 4)
      : v.pastPerformance >= 70 ? (seededRand(s, i * 7 + 16) > 0.5 ? 4 : 3)
      : seededRand(s, i * 7 + 16) > 0.6 ? 3 : 2;
    const remarks = rating >= 4 ? pick(REMARKS_GOOD, s, i * 7 + 17) : pick(REMARKS_AVG, s, i * 7 + 17);

    const completedDate = new Date(2024, Math.floor(seededRand(s, i * 7 + 18) * 12), Math.floor(seededRand(s, i * 7 + 19) * 28 + 1));

    return {
      id: `PROJ-${year}-${seq}`,
      name,
      tenderRef: `${prefix}/${year}-${String(year + 1).slice(2)}/${String(seq).padStart(3, "0")}`,
      department: dept,
      value: valueL,
      completedOn: completedDate.toISOString().split("T")[0],
      rating,
      remarks,
    };
  });

  let blacklistEntry: BlacklistEntry | undefined;
  if (v.blacklisted) {
    const bl = pick(BLACKLIST_REASONS, s, 20);
    const auth = pick(AUTHORITIES, s, 21);
    const yr = 2022 + Math.floor(seededRand(s, 22) * 3);
    const mo = Math.floor(seededRand(s, 23) * 12 + 1);
    const dy = Math.floor(seededRand(s, 24) * 28 + 1);
    const orderSeq = Math.floor(seededRand(s, 25) * 900 + 100);
    const isDuration = seededRand(s, 26) > 0.4;
    const durationYears = Math.floor(seededRand(s, 27) * 4 + 1);
    const endDate = new Date(yr + durationYears, mo - 1, dy);

    blacklistEntry = {
      orderNo: `DEBAR/${yr}/${orderSeq}`,
      date: `${String(dy).padStart(2, "0")}-${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][mo - 1]}-${yr}`,
      authority: auth,
      duration: isDuration ? `${durationYears} year${durationYears > 1 ? "s" : ""} (until ${endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})` : "Permanent",
      reason: bl.reason,
      description: bl.description,
      relatedTender: bl.relatedTender,
    };
  }

  return { address, city, state, turnoverLakhs, yearsActive, employees, completedProjects, blacklistEntry };
}

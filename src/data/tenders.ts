export type TenderStatus = "Open" | "Under Review" | "Awarded" | "Closed" | "Draft";

export interface BidEntry {
  rank: number;
  bidder: string;
  amount: number;
  status: "L1" | "L2" | "L3" | "Disqualified" | "Under Evaluation";
}

export interface Tender {
  id: string;
  nitNo: string;
  title: string;
  category: string;
  department: string;
  value: number;
  emd: number;
  bids: number;
  publishedDate: string;
  deadline: string;
  openingDate: string;
  location: string;
  description: string;
  eligibility: string;
  documents: string[];
  status: TenderStatus;
  officer: string;
  bidEntries: BidEntry[];
  awardedTo?: string;
  awardedValue?: number;
}

export const tenders: Tender[] = [
  {
    id: "TND-2041",
    nitNo: "NIT/RB/2025-26/041",
    title: "Highway 7 Resurfacing — Phase II",
    category: "Infrastructure",
    department: "Public Works",
    value: 2_450_000,
    emd: 49_000,
    bids: 12,
    publishedDate: "2026-04-01",
    deadline: "2026-05-12",
    openingDate: "2026-05-13",
    location: "Vijayawada–Guntur Corridor, AP",
    description: "Resurfacing and strengthening of 18.4 km stretch of SH-7 between Vijayawada and Guntur. Work includes milling of existing surface, bituminous concrete laying, drainage repair, road markings and signage as per IRC specifications.",
    eligibility: "Minimum annual turnover ₹1.2 Cr in last 3 years; experience of at least one similar road work ≥ ₹50 L; valid GST & PAN registration.",
    documents: ["NIT Document", "BOQ (Schedule of Quantities)", "Technical Specifications", "Drawing Set A", "Form of Tender"],
    status: "Open",
    officer: "A. Rahman",
    bidEntries: [
      { rank: 1, bidder: "M/s Pavithra Constructions", amount: 2_310_000, status: "L1" },
      { rank: 2, bidder: "M/s Srinivasa Infra Pvt Ltd", amount: 2_380_000, status: "L2" },
      { rank: 3, bidder: "M/s Deccan Roads Co.", amount: 2_420_000, status: "L3" },
    ],
  },
  {
    id: "TND-2042",
    nitNo: "NIT/DS/2025-26/042",
    title: "Municipal Fiber Network Expansion",
    category: "IT & Telecom",
    department: "Digital Services",
    value: 1_180_000,
    emd: 23_600,
    bids: 8,
    publishedDate: "2026-03-25",
    deadline: "2026-05-04",
    openingDate: "2026-05-05",
    location: "Guntur Municipal Corporation limits",
    description: "Supply, installation and commissioning of 120 km OFC network across GMC limits covering 48 municipal wards. Includes HDPE conduit laying, splicing, OLT/ONT provisioning and 3-year AMC.",
    eligibility: "ISO 9001 certified; minimum 3 OFC projects of ₹25 L each; empanelled with DoT.",
    documents: ["NIT Document", "Technical Scope", "BOQ", "SLA Draft", "Network Diagram"],
    status: "Under Review",
    officer: "L. Chen",
    bidEntries: [
      { rank: 1, bidder: "M/s TeleCon Systems", amount: 1_090_000, status: "L1" },
      { rank: 2, bidder: "M/s Optika Networks", amount: 1_120_000, status: "L2" },
      { rank: 3, bidder: "M/s Bharat Fiber Works", amount: 1_155_000, status: "L3" },
      { rank: 4, bidder: "M/s StarLink Infra", amount: 1_178_000, status: "Under Evaluation" },
    ],
  },
  {
    id: "TND-2043",
    nitNo: "NIT/EDU/2025-26/043",
    title: "School Cafeteria Catering Contract",
    category: "Services",
    department: "Education",
    value: 320_000,
    emd: 6_400,
    bids: 17,
    publishedDate: "2026-03-20",
    deadline: "2026-04-29",
    openingDate: "2026-04-30",
    location: "ZPHS & Model Schools — Krishna District",
    description: "Provision of mid-day meal and snack services for approx. 4,200 students across 18 government schools in Krishna district for FY 2026-27. Caterer must comply with FSSAI norms and AP MDM guidelines.",
    eligibility: "Valid FSSAI license; minimum 2 years catering experience for institutional clients; annual turnover ≥ ₹15 L.",
    documents: ["NIT Document", "Menu Schedule", "Quality Standards", "FSSAI Compliance Form"],
    status: "Open",
    officer: "M. Okafor",
    bidEntries: [
      { rank: 1, bidder: "M/s Annapurna Caterers", amount: 298_000, status: "L1" },
      { rank: 2, bidder: "M/s Sai Foods", amount: 305_000, status: "L2" },
      { rank: 3, bidder: "M/s Green Leaf Meals", amount: 311_000, status: "L3" },
    ],
  },
  {
    id: "TND-2044",
    nitNo: "NIT/FM/2025-26/044",
    title: "Fleet Electric Vehicles Procurement",
    category: "Transport",
    department: "Fleet Mgmt",
    value: 3_900_000,
    emd: 78_000,
    bids: 6,
    publishedDate: "2026-04-15",
    deadline: "2026-06-01",
    openingDate: "2026-06-02",
    location: "AP State Government Fleet Pool, Amaravati",
    description: "Procurement of 35 electric sedans and 12 electric SUVs for the AP State Government fleet. Includes 5-year comprehensive warranty, charging infrastructure at 4 locations and driver training.",
    eligibility: "OEM or authorized dealer with FAME-II empanelment; vehicles must have ARAI certification; minimum 150 km ARAI-certified range.",
    documents: ["NIT Document", "Technical Specifications", "FAME-II Certificate Format", "Warranty Terms", "BOQ"],
    status: "Draft",
    officer: "S. Patel",
    bidEntries: [],
  },
  {
    id: "TND-2045",
    nitNo: "NIT/PW/2025-26/045",
    title: "City Hall HVAC Modernization",
    category: "Facilities",
    department: "Public Works",
    value: 870_000,
    emd: 17_400,
    bids: 9,
    publishedDate: "2026-03-10",
    deadline: "2026-04-22",
    openingDate: "2026-04-23",
    location: "AP Secretariat Complex, Velagapudi",
    description: "Replacement of existing central HVAC plant with energy-efficient VRF system across 6 floors (G+5) of the main secretariat block. Includes BMS integration, AMC for 3 years and energy audit.",
    eligibility: "ASHRAE/BEE certified contractor; minimum 2 similar HVAC projects ≥ ₹40 L; ISO 45001 compliant.",
    documents: ["NIT Document", "Existing HVAC Layout", "Technical Specs", "BOQ", "BMS Integration Scope"],
    status: "Awarded",
    officer: "A. Rahman",
    awardedTo: "M/s CoolTech Mechanical Works",
    awardedValue: 812_000,
    bidEntries: [
      { rank: 1, bidder: "M/s CoolTech Mechanical Works", amount: 812_000, status: "L1" },
      { rank: 2, bidder: "M/s Comfort Air Systems", amount: 845_000, status: "L2" },
      { rank: 3, bidder: "M/s Blue Star Contractors", amount: 861_000, status: "L3" },
    ],
  },
  {
    id: "TND-2046",
    nitNo: "NIT/PKS/2025-26/046",
    title: "Parks & Recreation Equipment",
    category: "Services",
    department: "Parks",
    value: 145_000,
    emd: 2_900,
    bids: 14,
    publishedDate: "2026-04-10",
    deadline: "2026-05-18",
    openingDate: "2026-05-19",
    location: "Municipal Parks — Visakhapatnam Zone 2",
    description: "Supply and installation of outdoor gym equipment, children's play stations and benches across 9 municipal parks. Equipment must comply with IS 15986 safety standards. Includes 2-year on-site warranty.",
    eligibility: "Minimum turnover ₹8 L; experience of supplying playground equipment to at least 2 municipal bodies.",
    documents: ["NIT Document", "Equipment List", "IS Standards Reference", "Site Plan"],
    status: "Open",
    officer: "J. Müller",
    bidEntries: [
      { rank: 1, bidder: "M/s PlaySafe India", amount: 131_000, status: "L1" },
      { rank: 2, bidder: "M/s FitCity Infra", amount: 138_000, status: "L2" },
    ],
  },
  {
    id: "TND-2047",
    nitNo: "NIT/DS/2025-26/047",
    title: "Cybersecurity Audit Services",
    category: "IT & Telecom",
    department: "Digital Services",
    value: 240_000,
    emd: 4_800,
    bids: 11,
    publishedDate: "2026-03-28",
    deadline: "2026-04-30",
    openingDate: "2026-05-01",
    location: "AP State Data Centre, Amaravati",
    description: "Comprehensive cybersecurity audit of the AP State Data Centre infrastructure including VAPT, network security review, application security testing and ISO 27001 gap analysis. Final report with remediation roadmap required.",
    eligibility: "CERT-In empanelled agency; minimum 3 government VAPT projects; team must include CISSP/CISA certified professional.",
    documents: ["NIT Document", "Scope of Work", "Compliance Checklist", "NDA Template", "Deliverables Matrix"],
    status: "Under Review",
    officer: "L. Chen",
    bidEntries: [
      { rank: 1, bidder: "M/s SecureAP Technologies", amount: 218_000, status: "L1" },
      { rank: 2, bidder: "M/s CyberShield India", amount: 225_000, status: "L2" },
      { rank: 3, bidder: "M/s InfoSec Partners", amount: 231_000, status: "L3" },
      { rank: 4, bidder: "M/s DigiGuard Pvt Ltd", amount: 239_000, status: "Disqualified" },
    ],
  },
  {
    id: "TND-2048",
    nitNo: "NIT/SAN/2025-26/048",
    title: "Waste Collection Routes — North",
    category: "Services",
    department: "Sanitation",
    value: 1_650_000,
    emd: 33_000,
    bids: 5,
    publishedDate: "2026-02-15",
    deadline: "2026-03-30",
    openingDate: "2026-03-31",
    location: "North Zone — Kurnool Municipal Corporation",
    description: "Door-to-door solid waste collection and primary transportation to transfer stations covering 34 wards in KMC North Zone. Contractor to provide vehicles, crew, PPE and GPS tracking. 2-year contract with extension option.",
    eligibility: "Minimum 3 years SWM contract experience; TSDF authorization; fleet of at least 8 compactor vehicles.",
    documents: ["NIT Document", "Route Map", "Vehicle Specifications", "GPS Compliance Format", "Labour Norms"],
    status: "Closed",
    officer: "M. Okafor",
    bidEntries: [
      { rank: 1, bidder: "M/s GreenWaste Solutions", amount: 1_570_000, status: "L1" },
      { rank: 2, bidder: "M/s CleanCity Corp", amount: 1_612_000, status: "L2" },
      { rank: 3, bidder: "M/s SwachhBharat Services", amount: 1_640_000, status: "L3" },
    ],
  },
  {
    id: "TND-2049",
    nitNo: "NIT/CUL/2025-26/049",
    title: "Public Library Renovation",
    category: "Infrastructure",
    department: "Culture",
    value: 540_000,
    emd: 10_800,
    bids: 7,
    publishedDate: "2026-04-05",
    deadline: "2026-05-25",
    openingDate: "2026-05-26",
    location: "District Central Library, Nellore",
    description: "Renovation of the ground and first floors of the District Central Library including civil works, false ceiling, modular shelving, HVAC, LED lighting, fire suppression and accessibility ramp as per PWD-B specifications.",
    eligibility: "PWD-B registered contractor; minimum 1 interior/renovation project ≥ ₹25 L; valid labour licence.",
    documents: ["NIT Document", "Architectural Drawings", "BOQ", "Material Schedule", "Fire NOC Format"],
    status: "Open",
    officer: "S. Patel",
    bidEntries: [
      { rank: 1, bidder: "M/s Heritage Builders", amount: 512_000, status: "L1" },
      { rank: 2, bidder: "M/s Modi Constructions", amount: 525_000, status: "L2" },
    ],
  },
  {
    id: "TND-2050",
    nitNo: "NIT/HLT/2025-26/050",
    title: "Emergency Medical Supplies Q3",
    category: "Healthcare",
    department: "Health",
    value: 410_000,
    emd: 8_200,
    bids: 13,
    publishedDate: "2026-03-30",
    deadline: "2026-04-26",
    openingDate: "2026-04-27",
    location: "RIMS & District Hospitals — Kurnool",
    description: "Supply of emergency medical consumables including IV fluids, surgical gloves, sutures, oxygen masks and resuscitation kits for Q3 FY 2026-27 to RIMS Kurnool and 6 district hospitals. Items must conform to CDSCO/BIS standards.",
    eligibility: "Valid drug licence; WHO-GMP certified manufacturing or authorized distributor; minimum 2 years government hospital supply experience.",
    documents: ["NIT Document", "Item-wise BOQ", "Quality Certificates Format", "Drug Licence Copy Format", "Inspection Protocol"],
    status: "Open",
    officer: "J. Müller",
    bidEntries: [
      { rank: 1, bidder: "M/s MediCare Supplies", amount: 382_000, status: "L1" },
      { rank: 2, bidder: "M/s Apollo Pharma Dist.", amount: 391_000, status: "L2" },
      { rank: 3, bidder: "M/s LifeLine Medical", amount: 399_000, status: "L3" },
      { rank: 4, bidder: "M/s BioMed Corp", amount: 406_000, status: "Under Evaluation" },
    ],
  },
];

export const monthlyVolume = [
  { month: "Nov", published: 18, awarded: 11 },
  { month: "Dec", published: 22, awarded: 14 },
  { month: "Jan", published: 27, awarded: 19 },
  { month: "Feb", published: 24, awarded: 17 },
  { month: "Mar", published: 31, awarded: 22 },
  { month: "Apr", published: 29, awarded: 18 },
];

export const categoryBreakdown = [
  { name: "Infrastructure", value: 38 },
  { name: "IT & Telecom", value: 22 },
  { name: "Services", value: 18 },
  { name: "Transport", value: 12 },
  { name: "Healthcare", value: 10 },
];

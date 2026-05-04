"""Run once on first boot if the database is empty."""
import sys
from datetime import datetime, timedelta, timezone
from app.database import SessionLocal, create_tables
from app.models import (
    User, Vendor, Tender, TenderDocument, TenderEligibleVendor,
    PendingVendor, Notification, RoleEnum, TenderStatusEnum,
    NotificationTypeEnum, VerificationStepEnum,
)
from app.core.security import hash_password


def add_days(n: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=n)


def seed():
    create_tables()
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("→ Database already has data — skipping seed.")
            return

        print("→ Empty database — running seed data...")

        admin = User(
            email="admin@apeprocurement.gov.in",
            password_hash=hash_password("admin123"),
            name="Sri. R. Venkatesh, IAS",
            role=RoleEnum.ADMIN,
            organization="Tender Inviting Authority · R&B Dept.",
            is_verified=True,
            verification_step=VerificationStepEnum.COMPLETED,
        )
        db.add(admin)

        vendor_user = User(
            email="vendor@coastalinfra.in",
            password_hash=hash_password("vendor123"),
            name="S. Reddy",
            role=RoleEnum.VENDOR,
            organization="Coastal Infra Engineers",
            vendor_id="VND-1004",
            is_verified=True,
            verification_step=VerificationStepEnum.COMPLETED,
        )
        db.add(vendor_user)
        db.flush()

        vendors_data = [
            dict(id="VND-1001", company_name="Sri Krishna Constructions Pvt Ltd", contact_person="K. Ramesh", email="ramesh@srikrishna.in", phone="+91 98480 12345", category="Civil Works", gst="37AABCS1234N1Z5", pan="AABCS1234N", past_performance=92, completed_tenders=41, blacklisted=False),
            dict(id="VND-1002", company_name="Andhra IT Solutions", contact_person="P. Lakshmi", email="lakshmi@andhrait.com", phone="+91 90000 22341", category="IT / e-Gov", gst="37AAACA9988P1ZK", pan="AAACA9988P", past_performance=87, completed_tenders=28, blacklisted=False),
            dict(id="VND-1003", company_name="Godavari Supplies & Logistics", contact_person="M. Naidu", email="naidu@godavarisl.in", phone="+91 99887 33421", category="Goods / Supplies", gst="37AABCG7766R1Z3", pan="AABCG7766R", past_performance=78, completed_tenders=53, blacklisted=False),
            dict(id="VND-1004", company_name="Coastal Infra Engineers", contact_person="S. Reddy", email="reddy@coastalinfra.in", phone="+91 94404 55661", category="Civil Works", gst="37AAECC2233K1Z9", pan="AAECC2233K", past_performance=84, completed_tenders=36, blacklisted=False),
            dict(id="VND-1005", company_name="Vijaya Consultancy Services", contact_person="R. Sita", email="sita@vijayacs.in", phone="+91 93939 11220", category="Consultancy", gst="37AADCV4455M1ZT", pan="AADCV4455M", past_performance=90, completed_tenders=14, blacklisted=False),
            dict(id="VND-1006", company_name="Krishna Valley Traders", contact_person="B. Anil", email="anil@krishnavalley.in", phone="+91 90909 87654", category="Goods / Supplies", gst="37AAACK9911L1Z2", pan="AAACK9911L", past_performance=62, completed_tenders=22, blacklisted=True),
            dict(id="VND-1007", company_name="Tirumala Engineering Works", contact_person="V. Suresh", email="suresh@tirumalaengg.in", phone="+91 99491 66554", category="Civil Works", gst="37AAFCT3322Q1Z7", pan="AAFCT3322Q", past_performance=81, completed_tenders=47, blacklisted=False),
            dict(id="VND-1008", company_name="Nellore HealthMed Pvt Ltd", contact_person="Dr. P. Anitha", email="anitha@nellorehm.in", phone="+91 95050 44778", category="Healthcare", gst="37AABCN1199W1ZF", pan="AABCN1199W", past_performance=88, completed_tenders=19, blacklisted=False),
        ]
        registered = datetime(2021, 6, 14, tzinfo=timezone.utc)
        for v in vendors_data:
            db.add(Vendor(**v, registered_on=registered))

        tenders_data = [
            dict(id="TND-2025-041", name="Construction of 4-Lane Bypass Road – Vijayawada Phase II", description="Earthwork, bituminous concrete, drainage and street lighting for 7.4 km stretch.", start_date=add_days(-5), end_date=add_days(15), estimated_value=245000000, category="Civil Works", department="Roads & Buildings", status=TenderStatusEnum.Published, eligible_vendor_ids=["VND-1001","VND-1004","VND-1007"], docs=[("NIT_Notice.pdf","320 KB"),("BoQ.xlsx","112 KB"),("Tech_Specs.pdf","1.4 MB")]),
            dict(id="TND-2025-042", name="Supply & Installation of Smart Classroom Equipment", description="Interactive panels, audio systems and content servers for 220 government schools.", start_date=add_days(-2), end_date=add_days(20), estimated_value=118000000, category="IT / e-Gov", department="School Education", status=TenderStatusEnum.Published, eligible_vendor_ids=["VND-1002","VND-1005"], docs=[("NIT_Notice.pdf","280 KB")]),
            dict(id="TND-2025-043", name="Procurement of Generic Medicines – Q2 2026", description="Annual rate contract for 86 generic formulations across district hospitals.", start_date=add_days(-10), end_date=add_days(-2), estimated_value=41000000, category="Healthcare", department="Health & Family Welfare", status=TenderStatusEnum.Closed, eligible_vendor_ids=["VND-1003","VND-1008"], docs=[("NIT_Notice.pdf","210 KB")]),
            dict(id="TND-2025-044", name="AP Secretariat HVAC Modernization", description="Replacement of central AHU and BMS upgrade for Block 3 & 4.", start_date=add_days(-20), end_date=add_days(-7), estimated_value=87000000, category="Civil Works", department="R&B Dept.", status=TenderStatusEnum.Awarded, awarded_vendor_id="VND-1004", eligible_vendor_ids=["VND-1001","VND-1004","VND-1007"], docs=[("NIT.pdf","180 KB")]),
            dict(id="TND-2025-045", name="GIS Mapping for Urban Local Bodies", description="Drone-based survey, GIS basemap creation and asset tagging across 12 ULBs.", start_date=add_days(2), end_date=add_days(35), estimated_value=24000000, category="Consultancy", department="MA & UD", status=TenderStatusEnum.Draft, eligible_vendor_ids=["VND-1005"], docs=[("Draft_NIT.pdf","220 KB")]),
        ]
        for t in tenders_data:
            ev_ids = t.pop("eligible_vendor_ids")
            docs = t.pop("docs")
            tender = Tender(**t, created_by=admin.id)
            db.add(tender)
            db.flush()
            for name, size in docs:
                db.add(TenderDocument(tender_id=tender.id, name=name, size=size))
            for vid in ev_ids:
                db.add(TenderEligibleVendor(tender_id=tender.id, vendor_id=vid))

        db.add(PendingVendor(id="PV-2026-1045", company="New Vendor Ltd", contact="New Vendor Contact", email="newvendor@example.com", phone="9876543210"))

        db.add(Notification(title="Welcome to AP e-Procurement", body="System ready. Pending: 2 evaluations.", type=NotificationTypeEnum.info, audience="Admin", target_role="ADMIN", channels=["in_app"]))
        db.add(Notification(title="Vendor console ready", body="Your eligible tenders will appear here.", type=NotificationTypeEnum.info, audience="Coastal Infra Engineers", target_role="VENDOR", target_vendor_ids=["VND-1004"], channels=["in_app"]))

        db.commit()
        print("→ Seed complete.")
    except Exception as e:
        db.rollback()
        print(f"→ Seed failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()

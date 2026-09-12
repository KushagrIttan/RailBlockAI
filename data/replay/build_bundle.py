"""Build the frozen DLI-GZB replay bundle for the SIH demo.

Regenerates data/replay/dli-gzb/replay_bundle.json with a denser, fresher
scenario: 12 maintenance cases and 16 train movements over the same DLI-GZB-DN
section and 08:00-15:00 planning window the UI renders (28 x 15-min slots).

Run:  python data/replay/build_bundle.py
Then: POST http://localhost:5053/api/optimization/generate?horizon=daily

The script prints a gap-vs-demand self-check so you can see up front how many
cases should plausibly fit. Some deferrals are EXPECTED — the triage queue
exists for exactly those.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
DAY = datetime(2026, 9, 14, tzinfo=IST)  # submission week (Mon)

OUT = Path(__file__).parent / "dli-gzb" / "replay_bundle.json"

HEADWAY = {"Express": 10, "Passenger": 8, "EMU": 5, "MEMU": 6, "Freight": 15}


def dt(h: int, m: int) -> datetime:
    return DAY.replace(hour=h, minute=m, second=0, microsecond=0)


def iso(d: datetime) -> str:
    return d.isoformat()


# Two dense peaks (real suburban peak operation) with a big midday window —
# exactly when real possession planning happens. Overlapping runs inside a
# peak merge into one occupied stretch; the midday gap fits real jobs.
# (train_number, name, class, entry, exit)
MOVEMENTS = [
    # Morning peak 08:00-09:05
    ("64152", "Delhi - Aligarh MEMU", "MEMU", (8, 2), (8, 24)),
    ("64414", "Delhi - Ghaziabad EMU", "EMU", (8, 10), (8, 32)),
    ("54055", "Delhi - Moradabad Passenger", "Passenger", (8, 22), (8, 45)),
    ("64154", "Delhi - Khurja MEMU", "MEMU", (8, 35), (8, 55)),
    ("64404", "Ghaziabad - Delhi EMU", "EMU", (8, 45), (9, 5)),
    ("64156", "Delhi - Aligarh MEMU", "MEMU", (8, 55), (9, 12)),
    ("14511", "Delhi - Udhampur Express", "Express", (9, 0), (9, 18)),
    # Afternoon peak 13:30-14:35
    ("64416", "Delhi - Ghaziabad EMU", "EMU", (13, 32), (13, 54)),
    ("64158", "Delhi - Khurja MEMU", "MEMU", (13, 40), (14, 2)),
    ("54057", "Delhi - Saharanpur Passenger", "Passenger", (13, 52), (14, 15)),
    ("64406", "Ghaziabad - Delhi EMU", "EMU", (14, 2), (14, 22)),
    ("64160", "Delhi - Aligarh MEMU", "MEMU", (14, 12), (14, 30)),
    ("14521", "Delhi - Udhampur Express", "Express", (14, 22), (14, 34)),
    ("GOODS-71", "Container Freight", "Freight", (14, 30), (14, 52)),
]

# (case_id, scenario, department, asset, description, urgency, work_min,
#  resources, profile, recurrence_days or None for daily)
CASES = [
    ("CASE-TRACK-001", "planned_track", "Engineering", "Track",
     "Planned rail grinding", "planned", 30,
     ["Rail grinding machine", "Engineering crew"], "track-planned-v1", None),
    ("CASE-SIGNAL-001", "signal_fault", "Signal & Telecommunication", "Signalling",
     "Point machine sluggish operation", "urgent", 25,
     ["Signalling technician", "Point machine test kit"], "signal-failure-v1", None),
    ("CASE-OHE-001", "ohe_damage", "Traction Distribution", "OHE",
     "OHE contact wire burn mark", "emergency", 35,
     ["Overhead electric line crew", "Insulation tester"], "ohe-emergency-v1", None),
    ("CASE-TRACK-002", "planned_track", "Engineering", "Track",
     "Ballast profiling and packing", "planned", 25,
     ["Ballast regulator", "Engineering crew"], "track-planned-v1", 7),
    ("CASE-SIGNAL-002", "signal_fault", "Signal & Telecommunication", "Signalling",
     "Signal aspect failure - red not showing", "emergency", 30,
     ["Signalling technician", "Signal ladder crew"], "signal-failure-v1", None),
    ("CASE-OHE-002", "planned_ohe", "Traction Distribution", "OHE",
     "OHE insulator cleaning", "planned", 20,
     ["Overhead electric line crew"], "ohe-emergency-v1", 2),
    ("CASE-TRACK-003", "track_inspection", "Engineering", "Track",
     "Ultrasonic rail flaw detection follow-up", "urgent", 25,
     ["USFD testing team"], "track-planned-v1", None),
    ("CASE-SIGNAL-003", "planned_signal", "Signal & Telecommunication", "Signalling",
     "Track circuit calibration", "planned", 15,
     ["Signalling technician"], "signal-failure-v1", 3),
    ("CASE-OHE-003", "ohe_inspection", "Traction Distribution", "OHE",
     "Feeder pillar maintenance", "urgent", 30,
     ["Overhead electric line crew", "Insulation tester"], "ohe-emergency-v1", None),
    ("CASE-TRACK-004", "planned_track", "Engineering", "Track",
     "Fishplate greasing and bolt tightening", "planned", 20,
     ["Engineering crew"], "track-planned-v1", 2),
]

KM_MARKS = ["KM 8.0-9.0", "KM 9.5", "KM 11.2", "KM 12.9/9-13.3/3", "KM 14.0",
            "KM 15.6-16.1", "KM 17.3", "KM 18.8", "KM 10.4", "KM 13.9",
            "KM 16.7", "KM 19.2"]


def build() -> dict:
    start, end = dt(8, 0), dt(15, 0)

    movements = []
    for i, (num, name, cls, en, ex) in enumerate(MOVEMENTS):
        entry, exit = dt(*en), dt(*ex)
        assert start <= entry < exit <= end, f"movement {num} outside window"
        movements.append({
            "id": f"svc-{num}-20260914-{i:02d}",
            "train_number": num,
            "train_name": name,
            "train_class": cls,
            "section_id": "DLI-GZB-DN",
            "direction": "DLI_TO_GZB",
            "scheduled_entry": iso(entry),
            "scheduled_exit": iso(exit),
            "source_system": "public_timetable_snapshot",
            "source_record_id": f"indiarailinfo:dli-gzb:{num}",
            "confidence": "third_party",
        })

    cases = []
    for i, (cid, scen, dept, asset, desc, urg, work, res, prof, recur) in enumerate(CASES):
        case = {
            "case_id": cid,
            "scenario_type": scen,
            "department": dept,
            "asset_type": asset,
            "description": desc,
            "section_id": "DLI-GZB-DN",
            "location_reference": KM_MARKS[i % len(KM_MARKS)],
            "reported_at": iso(dt(8, 0)),
            "urgency": urg,
            "estimated_work_minutes": work,
            "required_resources": res,
            "procedure_profile_id": prof,
        }
        if recur is not None:
            case["recurrence_days"] = recur
        cases.append(case)

    return {
        "replay_context": {
            "schema_version": "1.0",
            "data_mode": "replay",
            "corridor_id": "DLI-GZB",
            "corridor_label": "Delhi Junction to Ghaziabad Junction",
            "planning_start": iso(start),
            "planning_end": iso(end),
            "captured_at": iso(dt(12, 0)),
            "source_system": "public_timetable_snapshot",
            "source_note": "Saved timetable scenario for a hackathon prototype; not a live railway control feed.",
        },
        "corridor": {
            "section_id": "DLI-GZB-DN",
            "from_station": {"code": "DLI", "name": "Delhi Junction",
                             "latitude": 28.66, "longitude": 77.227},
            "to_station": {"code": "GZB", "name": "Ghaziabad Junction",
                           "latitude": 28.711, "longitude": 77.433},
            "length_km": 20.4,
            "direction": "DLI_TO_GZB",
            "geometry_source": "OpenStreetMap-compatible station reference",
        },
        "train_movements": movements,
        "procedure_profiles": [
            {"id": "track-planned-v1", "traffic_block_required": True,
             "power_block_required": False, "disconnection_notice_required": False,
             "permit_to_work_required": False, "minimum_setup_minutes": 15,
             "minimum_clearance_minutes": 15},
            {"id": "signal-failure-v1", "traffic_block_required": True,
             "power_block_required": False, "disconnection_notice_required": True,
             "permit_to_work_required": False, "minimum_setup_minutes": 10,
             "minimum_clearance_minutes": 10},
            {"id": "ohe-emergency-v1", "traffic_block_required": True,
             "power_block_required": True, "disconnection_notice_required": False,
             "permit_to_work_required": True, "minimum_setup_minutes": 15,
             "minimum_clearance_minutes": 15},
        ],
        "maintenance_cases": cases,
    }


def gap_check(bundle: dict) -> None:
    """Print merged occupancy + usable gap minutes vs total case demand."""
    start = datetime.fromisoformat(bundle["replay_context"]["planning_start"])
    end = datetime.fromisoformat(bundle["replay_context"]["planning_end"])
    occupied = []
    for m in bundle["train_movements"]:
        hw = HEADWAY[m["train_class"]]
        entry = max(start, datetime.fromisoformat(m["scheduled_entry"]) - timedelta(minutes=hw))
        exit = min(end, datetime.fromisoformat(m["scheduled_exit"]) + timedelta(minutes=hw))
        occupied.append((entry, exit))
    occupied.sort()
    merged: list[list] = []
    for s, e in occupied:
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    usable = 0
    print("--- gaps (after class headway) ---")
    cursor = start
    for s, e in merged:
        if cursor < s:
            mins = int((s - cursor).total_seconds() // 60)
            usable += mins
            print(f"  {cursor.strftime('%H:%M')}-{s.strftime('%H:%M')}  {mins} min")
        cursor = max(cursor, e)
    if cursor < end:
        mins = int((end - cursor).total_seconds() // 60)
        usable += mins
        print(f"  {cursor.strftime('%H:%M')}-{end.strftime('%H:%M')}  {mins} min")
    profs = {p["id"]: p for p in bundle["procedure_profiles"]}
    demand = sum(c["estimated_work_minutes"] + profs[c["procedure_profile_id"]]["minimum_setup_minutes"]
                 + profs[c["procedure_profile_id"]]["minimum_clearance_minutes"]
                 for c in bundle["maintenance_cases"])
    print(f"usable gap: {usable} min | total demand (work+setup+clearance): {demand} min "
          f"| cases: {len(bundle['maintenance_cases'])} | movements: {len(bundle['train_movements'])}")


if __name__ == "__main__":
    bundle = build()
    gap_check(bundle)
    OUT.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
    print(f"wrote {OUT}")

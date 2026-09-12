"""Build NDLS-NDB (New Delhi – Nizamuddin) replay bundle — second corridor.

Proves the demo isn't hardcoded to DLI-GZB: same schema, different train mix.
A shorter suburban corridor (8.6 km, 2 revenue stations) with higher-frequency
EMU shuttle traffic and a freight-biased window fits a possession-style
maintenance gap. Regenerate + restart the API to pick it up.

Run:  python data/replay/build_bundle.py
Then: POST http://localhost:5053/api/optimization/generate?horizon=daily

NOTE: the UI corridor switcher currently only lists DLI-GZB. Wiring NDLS-NDB
into the switcher is a frontend change (see service.ts CORRIDORS) — this
script produces the data bundle the backend loads for it.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
DAY = datetime(2026, 9, 14, tzinfo=IST)  # same submission-week date as DLI-GZB

OUT = Path(__file__).parent / "ndls-ndb" / "replay_bundle.json"

HEADWAY = {"Express": 10, "Passenger": 8, "EMU": 5, "MEMU": 6, "Freight": 15}


def dt(h: int, m: int) -> datetime:
    return DAY.replace(hour=h, minute=m, second=0, microsecond=0)


def iso(d: datetime) -> str:
    return d.isoformat()


# High-frequency EMU shuttle corridor with a daytime freight slot.
# (train_number, name, class, entry, exit)
MOVEMENTS = [
    # Morning headway EMUs
    ("64311", "New Delhi - Nizamuddin EMU", "EMU", (7, 55), (8, 12)),
    ("64313", "New Delhi - Nizamuddin EMU", "EMU", (8, 8), (8, 25)),
    ("64315", "New Delhi - Nizamuddin EMU", "EMU", (8, 22), (8, 39)),
    ("64317", "New Delhi - Nizamuddin EMU", "EMU", (8, 36), (8, 53)),
    ("GDR-8812", "Freight - Anand Vihar", "Freight", (8, 50), (9, 25)),
    ("64319", "Nizamuddin - New Delhi EMU", "EMU", (9, 5), (9, 22)),
    ("64321", "New Delhi - Nizamuddin EMU", "EMU", (9, 12), (9, 29)),
    # Midday clear window for possessions
    ("64409", "New Delhi - Ghaziabad EMU", "EMU", (12, 5), (12, 22)),
    ("64411", "New Delhi - Ghaziabad EMU", "EMU", (13, 45), (14, 2)),
]

# (case_id, scenario, department, asset, description, urgency, work_min,
#  resources, profile, recurrence_days or None for daily)
CASES = [
    ("CASE-TRACK-001", "planned_track", "Engineering", "Track",
     "Track alignment tamping", "planned", 30,
     ["Tamping machine", "Engineering crew"], "track-planned-v1", None),
    ("CASE-OHE-001", "ohe_damage", "Traction Distribution", "OHE",
     "OHE dropper wire replacement", "urgent", 35,
     ["Overhead electric line crew"], "ohe-emergency-v1", None),
    ("CASE-SIGNAL-001", "signal_fault", "Signal & Telecommunication", "Signalling",
     "Signal relay contact cleaning", "planned", 20,
     ["Signalling technician"], "signal-failure-v1", 2),
    ("CASE-TRACK-002", "track_inspection", "Engineering", "Track",
     "Rail joint maintenance", "urgent", 25,
     ["Engineering crew"], "track-planned-v1", None),
    ("CASE-OHE-002", "planned_ohe", "Traction Distribution", "OHE",
     "OHE tensioning device inspection", "planned", 30,
     ["Overhead electric line crew"], "ohe-emergency-v1", 3),
    ("CASE-SIGNAL-002", "signal_fault", "Signal & Telecommunication", "Signalling",
     "Level crossing gate diagnostics", "urgent", 25,
     ["Signalling technician", "Gate crew"], "signal-failure-v1", None),
    ("CASE-TRACK-003", "planned_track", "Engineering", "Track",
     "Ballast cleaning at turnout", "planned", 40,
     ["Ballast cleaner", "Engineering crew"], "track-planned-v1", None),
    ("CASE-SIGNAL-003", "planned_signal", "Signal & Telecommunication", "Signalling",
     "Signal sighting test", "planned", 15,
     ["Signalling technician"], "signal-failure-v1", 2),
]

KM_MARKS = ["KM 0.5-1.2", "KM 2.0", "KM 3.4-3.8", "KM 5.1", "KM 6.3-6.9", "KM 7.2", "KM 8.1", "KM 1.8"]


def build() -> dict:
    start, end = dt(7, 45), dt(14, 30)
    planning_end = dt(14, 30)

    movements = []
    for i, (num, name, cls, en, ex) in enumerate(MOVEMENTS):
        entry, exit = dt(*en), dt(*ex)
        assert start <= entry < exit <= planning_end, f"movement {num} outside window"
        movements.append({
            "id": f"svc-{num}-20260914-{i:02d}",
            "train_number": num,
            "train_name": name,
            "train_class": cls,
            "section_id": "NDLS-NDB-DN",
            "direction": "NDLS_TO_NDB",
            "scheduled_entry": iso(entry),
            "scheduled_exit": iso(exit),
            "source_system": "public_timetable_snapshot",
            "source_record_id": f"indiarailinfo:ndls-ndb:{num}",
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
            "section_id": "NDLS-NDB-DN",
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
            "corridor_id": "NDLS-NDB",
            "corridor_label": "New Delhi to Nizamuddin Junction",
            "planning_start": iso(start),
            "planning_end": iso(planning_end),
            "captured_at": iso(dt(11, 0)),
            "source_system": "public_timetable_snapshot",
            "source_note": "Saved timetable scenario for a hackathon prototype; not a live railway control feed.",
        },
        "corridor": {
            "section_id": "NDLS-NDB-DN",
            "from_station": {"code": "NDLS", "name": "New Delhi",
                             "latitude": 28.642, "longitude": 77.220},
            "to_station": {"code": "NDB", "name": "Nizamuddin Junction",
                           "latitude": 28.588, "longitude": 77.253},
            "length_km": 8.6,
            "direction": "NDLS_TO_NDB",
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
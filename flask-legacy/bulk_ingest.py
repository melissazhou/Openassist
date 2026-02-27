"""
Bulk ingest: reads sp_mdm_all.json (downloaded from SharePoint API) and POSTs to OpenAssist ingest API.
"""
import json, requests, sys, os

INPUT = os.path.join(os.path.dirname(__file__), "sp_mdm_all.json")
API_URL = "http://127.0.0.1:5001/api/mdm/ingest"
API_KEY = "openassist-ingest-2026"
BATCH = 200

if not os.path.exists(INPUT):
    print(f"ERROR: {INPUT} not found"); sys.exit(1)

with open(INPUT, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Loaded {len(data)} records from {INPUT}")

total_new = 0
total_dup = 0
total_err = 0

for i in range(0, len(data), BATCH):
    batch = data[i:i+BATCH]
    payload = {
        "api_key": API_KEY,
        "requests": [{
            "title": r.get("title", ""),
            "urgency": r.get("urgency", ""),
            "status": r.get("status", ""),
            "requestor": r.get("requestor", ""),
            "date_requested": r.get("date_requested", ""),
            "type": r.get("type", ""),
            "requested_completion": r.get("requested_completion", ""),
            "instructions": r.get("instructions", ""),
            "assigned_to": r.get("assigned_to", ""),
        } for r in batch]
    }
    try:
        resp = requests.post(API_URL, json=payload, timeout=30)
        result = resp.json()
        new = result.get("new_count", 0)
        dup = result.get("duplicate_count", 0)
        total_new += new
        total_dup += dup
        print(f"  Batch {i//BATCH+1}: {len(batch)} sent, {new} new, {dup} dup")
    except Exception as e:
        total_err += len(batch)
        print(f"  Batch {i//BATCH+1}: ERROR - {e}")

print(f"\nDone! New: {total_new}, Duplicates: {total_dup}, Errors: {total_err}")

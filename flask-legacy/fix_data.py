"""One-time fix: delete test record + sync Completed status from source_status"""
import json

FILE = r"D:\Project\OpenAssist\app\data\change_requests.json"

with open(FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

before = len(data)

# Remove test record
data = [r for r in data if r.get("source_title") != "TEST_BULK_001"]

# Sync: if source_status == "Completed", set status to "Completed"
completed_count = 0
for r in data:
    ss = (r.get("source_status") or "").strip().lower()
    if ss == "completed" and r.get("status") != "Completed":
        r["status"] = "Completed"
        completed_count += 1

after = len(data)

with open(FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Removed {before - after} test records")
print(f"Updated {completed_count} records to Completed status")
print(f"Total records: {after}")

# Stats
statuses = {}
for r in data:
    s = r.get("status", "Unknown")
    statuses[s] = statuses.get(s, 0) + 1
for k, v in sorted(statuses.items(), key=lambda x: -x[1]):
    print(f"  {k}: {v}")

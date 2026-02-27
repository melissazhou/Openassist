# OpenAssist — AI-Assisted MDM Platform

An enterprise Master Data Management (MDM) workflow platform for tracking, parsing, and managing material change requests sourced from SharePoint.

## Quick Start

```bash
cd D:\Project\OpenAssist
python run.py
# → http://127.0.0.1:5001
```

## Default Accounts

| Username | Password  | Role        | Permissions |
|----------|-----------|-------------|-------------|
| admin    | admin123  | superadmin  | Full access |
| mdm      | mdm123    | operator    | Manage requests |
| demo     | demo      | user        | View + limited edit |
| viewer   | viewer    | viewer      | Read-only |

IWMS SSO is also supported as fallback.

## Architecture

```
OpenAssist/
├── run.py                      # Entry point (port 5001, debug mode)
├── app/
│   ├── __init__.py             # Flask app factory
│   ├── config.py               # Configuration (DB, API keys, paths)
│   ├── routes/
│   │   ├── auth.py             # Login/logout, session management
│   │   ├── mdm.py              # Change request CRUD + ingest API + stats
│   │   ├── approval.py         # Approve/reject workflow
│   │   ├── item_query.py       # EBS/PLM item lookup
│   │   └── dictionary.py       # Field dictionary CRUD
│   ├── services/
│   │   └── mdm_parser.py       # Smart parser: title → structured fields
│   ├── utils/
│   │   ├── auth.py             # @login_required, @admin_required, RBAC
│   │   └── logger.py           # Logging setup
│   ├── templates/
│   │   ├── base.html           # Layout
│   │   └── index.html          # SPA (login + tabs)
│   ├── static/
│   │   ├── css/main.css
│   │   └── js/main.js
│   └── data/
│       └── change_requests.json  # Data store (3000+ records)
├── bulk_ingest.py              # One-time bulk import script
├── ingest_now.py               # Manual ingest helper
└── fix_data.py                 # Data migration/fix script
```

## Key Features

### 1. SharePoint Integration
- **Ingest API**: `POST /api/mdm/ingest` with API key authentication
- **Auto-deduplication**: by `source_title` (no duplicate imports)
- **Cron scraper**: Automated 10-minute scraping via OpenClaw cron job + Browser Relay

### 2. Smart Parser (`mdm_parser.py`)
Automatically classifies requests and extracts structured data:

| Category | Field | System |
|----------|-------|--------|
| Status Change | item_status | PLM/EBS |
| BOM Update | bom | PLM/EBS |
| Buyer/Planner | buyer_code | EBS |
| Pallet Config | pallet_config | PLM |
| MOQ Update | moq | EBS |
| Lead Time | lead_time | EBS |
| Vendor Update | vendor | EBS |
| Formula/MBR | formula | PLM/EBS |
| UPC/Barcode | upc_code | EBS |
| Rounding Multiple | rounding_mult | EBS |
| Fixed Order Qty | foq | EBS |
| Sourcing Rule | sourcing_rule | EBS |

Extracts: item codes, old/new values, organizations (AND, DDR, IVCN...), target systems.

### 3. Dashboard
- **Active vs Completed** split view
- Category breakdown bar charts
- Status cards (Active / Pending / Approved / Completed / Total)
- Recent active requests table

### 4. Change Requests
- **7 filter controls**: Status (defaults to Active), Requestor, Assigned To, Category, Date From, Date To, Full-text Search
- Detail modal with approve/reject workflow
- Real-time result count

### 5. Item Query
- Query EBS and PLM data by item number
- Uses cx_Oracle connection pools (configurable in `config.py`)

### 6. Field Dictionary
- CRUD management for business term → field name mappings
- Used as reference for the smart parser

## API Reference

### Ingest API
```
POST /api/mdm/ingest
Content-Type: application/json

{
  "api_key": "openassist-ingest-2026",
  "requests": [
    {
      "title": "...",
      "urgency": "High|Medium|Low",
      "status": "Not Started|In Progress|Completed",
      "requestor": "Name",
      "date_requested": "2026-01-15",
      "type": "BOM Updates",
      "requested_completion": "2026-02-01",
      "instructions": "...",
      "assigned_to": "Name"
    }
  ]
}
```

### Stats API
```
GET /api/mdm/stats
→ { total, active_count, completed_count, by_status, by_category, active_by_category, completed_by_category, requestors, assigned_tos, recent_active }
```

### Requests API
```
GET /api/mdm/requests?status=_active&requestor=Chris&category=BOM+Update&date_from=2026-01-01&search=krill
→ { success, data: [...], total }
```

## Data Source

- **SharePoint List**: `https://ivcinc.sharepoint.com/sites/CS/Lists/Master%20Data%20Requests/`
- **REST API**: Used for bulk extraction (3252 records via `$top=5000` with `$expand=Requestor,AssignedTo`)
- **Browser Relay**: OpenClaw extension in Edge for SSO-authenticated access

## Configuration

Key settings in `app/config.py`:
- `INGEST_API_KEY`: API key for ingest endpoint (default: `openassist-ingest-2026`)
- `REQUESTS_FILE`: Path to JSON data store
- EBS/PLM database connection strings (cx_Oracle)
- IWMS auth endpoint

## Cron Jobs (OpenClaw)

| Job | Schedule | Description |
|-----|----------|-------------|
| `mdm-sharepoint-scraper-10m` | `*/10 8-16 * * 1-5` ET | Scrapes SharePoint To Do Items, POSTs to ingest API |
| `iwms-operational-worklog-30m` | Every 30 min | Scans IWMS ServiceDesk for operational tickets |

Both require Browser Relay extension enabled in Edge (`profile="chrome"`).

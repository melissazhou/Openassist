#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
MDM Request Parser — extracts structured change fields from SharePoint title + instructions.

Categories (field_mapping):
  Business Keyword    → field_name    → system
  ─────────────────────────────────────────────
  status / DISC / TRANSITION / APPROVED  → item_status   → PLM/EBS
  buyer / planner                        → buyer_code    → EBS
  pallet / config / layer                → pallet_config → PLM
  BOM / label / shipper / recipe         → bom           → PLM/EBS
  MOQ / minimum order                    → moq           → EBS
  lead time / LT                         → lead_time     → EBS
  vendor / supplier                      → vendor        → EBS
  sourcing rule                          → sourcing_rule → EBS
  formula / MBR / MCR                    → formula       → PLM/EBS
  UPC / barcode                          → upc_code      → EBS
  rounding multiple                      → rounding_mult → EBS
  fixed order qty / FOQ                  → foq           → EBS
"""
import re
from app.utils.logger import logger

# ── category rules: (regex_pattern, field_name, system) ──
RULES = [
    # Status changes
    (r'(?i)\b(status|DISC|TRANSITION|APPROVED|SUSPEND|ACTIVE|INACTIVE)\b', 'item_status', 'PLM/EBS'),
    # Buyer / Planner
    (r'(?i)\b(buyer|planner)\b', 'buyer_code', 'EBS'),
    # Pallet config
    (r'(?i)\b(pallet|config|layer|cases/layer|shippers?\s*per\s*layer)\b', 'pallet_config', 'PLM'),
    # BOM
    (r'(?i)\b(BOM|label|shipper\b(?!.*per))', 'bom', 'PLM/EBS'),
    # MOQ
    (r'(?i)\b(MOQ|minimum order|min\s*order)\b', 'moq', 'EBS'),
    # Lead time
    (r'(?i)\b(lead\s*time|LT\s+to\s+\d|process\s+lead)\b', 'lead_time', 'EBS'),
    # Vendor / Supplier
    (r'(?i)\b(vendor|supplier)\b', 'vendor', 'EBS'),
    # Sourcing rule
    (r'(?i)\b(sourcing\s*rule)\b', 'sourcing_rule', 'EBS'),
    # Formula / MBR / MCR
    (r'(?i)\b(formula|MBR|MCR|recipe|bulk\s*formula)\b', 'formula', 'PLM/EBS'),
    # UPC
    (r'(?i)\b(UPC|UCC|barcode)\b', 'upc_code', 'EBS'),
    # Rounding multiple
    (r'(?i)\b(rounding\s*multiple)\b', 'rounding_mult', 'EBS'),
    # FOQ
    (r'(?i)\b(fixed\s*order|FOQ)\b', 'foq', 'EBS'),
]

# ── Item number patterns ──
ITEM_PATTERNS = [
    # Standard item codes: HLL56326-13, WAL653192, GNC653802, TOP649972, etc.
    r'\b([A-Z]{2,4}\d{5,7}(?:[A-Z])?(?:-\d{1,2})?(?:[NS])?)\b',
    # RM codes: RM3300846, RM1918
    r'\b(RM\d{3,7})\b',
    # LP codes: LP145886
    r'\b(LP\d{5,6})\b',
    # PM codes: PM0180, PM0317
    r'\b(PM\d{3,6}[A-Z]?)\b',
    # LM codes: LM423012G
    r'\b(LM\d{5,7}[A-Z]?)\b',
    # PQ codes: PQ409706
    r'\b(PQ\d{5,7})\b',
    # IN codes: IN900962
    r'\b(IN\d{5,7})\b',
    # Pure numeric (5-7 digits): 358642, 3300306
    r'\b(\d{5,7})\b',
]

# ── "from X to Y" pattern ──
FROM_TO = re.compile(r'(?i)from\s+([A-Z0-9_\-]+)\s+to\s+([A-Z0-9_\-]+)')

# ── org patterns ──
ORG_PATTERN = re.compile(r'\b(AND|DDR|WOD|PHL|IVCN?)\b')


def parse_request(title: str, instructions: str, request_type: str = '') -> dict:
    """
    Parse a single MDM request into structured fields.

    Returns:
        {
            'field': str,           # e.g. 'item_status', 'buyer_code', 'bom'
            'system': str,          # e.g. 'PLM/EBS', 'EBS', 'PLM'
            'items': [str],         # extracted item numbers
            'old_value': str,
            'new_value': str,
            'orgs': [str],
            'category': str,        # human label
        }
    """
    combined = f"{title} {instructions}".strip()
    if not combined:
        return _empty()

    # 1. Detect field & system
    field, system, category = _detect_field(combined, request_type)

    # 2. Extract item numbers
    items = _extract_items(combined)

    # 3. Extract from→to values
    old_val, new_val = _extract_values(combined, field)

    # 4. Extract orgs
    orgs = sorted(set(ORG_PATTERN.findall(combined)))

    return {
        'field': field,
        'system': system,
        'items': items,
        'old_value': old_val,
        'new_value': new_val,
        'orgs': orgs,
        'category': category,
    }


def _detect_field(text, request_type):
    """Match the first applicable rule."""
    # Check request_type hint first
    type_lower = (request_type or '').lower()
    if 'bulk formula' in type_lower:
        return 'formula', 'PLM/EBS', 'Formula/MBR Upload'
    if 'sourcing' in type_lower:
        return 'sourcing_rule', 'EBS', 'Sourcing Rule'
    if 'safety stock' in type_lower or 'moq' in type_lower.replace(' ', ''):
        return 'moq', 'EBS', 'MOQ Update'

    for pattern, field, system in RULES:
        if re.search(pattern, text):
            return field, system, _category_label(field)

    # Fallback based on request_type
    type_map = {
        'bom updates': ('bom', 'PLM/EBS', 'BOM Update'),
        'status change': ('item_status', 'PLM/EBS', 'Status Change'),
        'special requests': ('misc', 'EBS', 'Special Request'),
        'miscellaneous': ('misc', 'EBS', 'Miscellaneous'),
        'vendor moq': ('moq', 'EBS', 'MOQ Update'),
    }
    for key, val in type_map.items():
        if key in type_lower:
            return val

    return 'other', 'EBS', 'Other'


def _category_label(field):
    labels = {
        'item_status': 'Status Change',
        'buyer_code': 'Buyer/Planner Update',
        'pallet_config': 'Pallet Config Update',
        'bom': 'BOM Update',
        'moq': 'MOQ Update',
        'lead_time': 'Lead Time Update',
        'vendor': 'Vendor Update',
        'sourcing_rule': 'Sourcing Rule',
        'formula': 'Formula/MBR Upload',
        'upc_code': 'UPC Update',
        'rounding_mult': 'Rounding Multiple Update',
        'foq': 'FOQ Update',
    }
    return labels.get(field, field)


def _extract_items(text):
    """Extract unique item numbers from text."""
    items = []
    seen = set()
    for pattern in ITEM_PATTERNS:
        for m in re.finditer(pattern, text):
            item = m.group(1)
            # Skip pure numbers that look like dates or small values
            if item.isdigit() and (len(item) < 5 or int(item) < 10000):
                continue
            if item not in seen:
                items.append(item)
                seen.add(item)
    return items[:20]  # cap at 20


def _extract_values(text, field):
    """Try to extract old/new values."""
    m = FROM_TO.search(text)
    if m:
        return m.group(1), m.group(2)

    # "to X" pattern for new value
    to_match = re.search(r'(?i)\bto\s+(\d+\.?\d*\s*(?:kg|days|kgs)?)\b', text)
    if to_match:
        return '', to_match.group(1)

    # MOQ specific: "MOQ to 3,500" or "MOQ 4500"
    moq_match = re.search(r'(?i)MOQ\s+(?:to\s+)?([0-9,]+(?:\s*(?:kg|kgs))?)', text)
    if moq_match and field in ('moq', 'rounding_mult'):
        return '', moq_match.group(1)

    # Pallet: "13/7" or "15x7"
    if field == 'pallet_config':
        pc = re.search(r'(\d+)[/x×](\d+)', text)
        if pc:
            return '', f"{pc.group(1)}/{pc.group(2)}"
        layer = re.search(r'(?i)(?:layers?\s*(?:per\s*pallet)?\s*(?:to)?\s*)(\d+)', text)
        if layer:
            return '', f"layers={layer.group(1)}"
        cases = re.search(r'(?i)cases/layer\s+(?:to\s+)?(\d+)', text)
        if cases:
            return '', f"cases/layer={cases.group(1)}"

    # Lead time: "10 days" or "70 days"
    if field == 'lead_time':
        lt = re.search(r'(\d+)\s*days', text, re.IGNORECASE)
        if lt:
            return '', f"{lt.group(1)} days"

    return '', ''


def _empty():
    return {
        'field': 'other',
        'system': 'EBS',
        'items': [],
        'old_value': '',
        'new_value': '',
        'orgs': [],
        'category': 'Other',
    }

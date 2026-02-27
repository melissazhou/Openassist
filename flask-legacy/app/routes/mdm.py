#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
MDM变更请求管理路由
"""
from flask import Blueprint, request, jsonify, current_app
from app.utils.auth import login_required, get_current_user
from app.utils.logger import logger
from app.services.mdm_parser import parse_request
import json
import os
from datetime import datetime

bp = Blueprint('mdm', __name__)

def load_requests():
    """加载变更请求数据"""
    req_file = current_app.config['REQUESTS_FILE']
    if os.path.exists(req_file):
        with open(req_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_requests(data):
    """保存变更请求数据"""
    req_file = current_app.config['REQUESTS_FILE']
    os.makedirs(os.path.dirname(req_file), exist_ok=True)
    with open(req_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@bp.route('/requests', methods=['GET'])
@login_required
def get_requests():
    """获取变更请求列表 — supports filters: status, requestor, assigned_to, date_from, date_to, category, search"""
    try:
        requests_list = load_requests()

        # --- filters ---
        status = request.args.get('status')
        if status:
            if status == '_active':
                # Special: all non-Completed
                requests_list = [r for r in requests_list if r.get('status') != 'Completed']
            else:
                requests_list = [r for r in requests_list if r.get('status') == status]

        requestor = request.args.get('requestor', '').strip()
        if requestor:
            requests_list = [r for r in requests_list if requestor.lower() in (r.get('requestor') or '').lower()]

        assigned_to = request.args.get('assigned_to', '').strip()
        if assigned_to:
            requests_list = [r for r in requests_list if assigned_to.lower() in (r.get('assigned_to') or '').lower()]

        category = request.args.get('category', '').strip()
        if category:
            requests_list = [r for r in requests_list if r.get('category') == category or r.get('change_type') == category]

        date_from = request.args.get('date_from', '').strip()
        date_to = request.args.get('date_to', '').strip()
        if date_from or date_to:
            def _date_str(r):
                d = r.get('date_requested') or r.get('created_at') or ''
                return d[:10]  # YYYY-MM-DD
            if date_from:
                requests_list = [r for r in requests_list if _date_str(r) >= date_from]
            if date_to:
                requests_list = [r for r in requests_list if _date_str(r) <= date_to]

        search = request.args.get('search', '').strip().lower()
        if search:
            requests_list = [r for r in requests_list if
                            search in (r.get('source_title') or '').lower() or
                            search in (r.get('instructions') or '').lower() or
                            search in (r.get('item') or '').lower()]

        return jsonify({
            'success': True,
            'data': requests_list,
            'total': len(requests_list)
        })
    
    except Exception as e:
        logger.error(f'获取请求列表失败: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/request/<request_id>', methods=['GET'])
@login_required
def get_request(request_id):
    """获取单个请求详情"""
    try:
        requests_list = load_requests()
        
        for req in requests_list:
            if req.get('request_id') == request_id:
                return jsonify({
                    'success': True,
                    'data': req
                })
        
        return jsonify({'success': False, 'message': '请求不存在'}), 404
    
    except Exception as e:
        logger.error(f'获取请求详情失败: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/ingest', methods=['POST'])
def ingest_requests():
    """
    Ingest API — receives structured MDM requests from the local cron scraper.
    Expects JSON: { "api_key": "...", "requests": [ { title, urgency, status, requestor, ... }, ... ] }
    Deduplicates by title to avoid re-importing existing requests.
    """
    try:
        data = request.get_json()
        api_key = data.get('api_key', '')
        ingest_key = current_app.config.get('INGEST_API_KEY', 'openassist-ingest-2026')

        if api_key != ingest_key:
            return jsonify({'success': False, 'message': 'Invalid API key'}), 401

        incoming = data.get('requests', [])
        if not incoming:
            return jsonify({'success': False, 'message': 'No requests provided'}), 400

        requests_list = load_requests()
        existing_titles = {r.get('source_title', '') for r in requests_list}

        added = 0
        for item in incoming:
            title = item.get('title', '').strip()
            if not title or title in existing_titles:
                continue

            # Parse title + instructions into structured fields
            instructions = item.get('instructions', '')
            req_type = item.get('type', item.get('change_type', ''))
            parsed = parse_request(title, instructions, req_type)

            request_id = f"SP{datetime.now().strftime('%Y%m%d%H%M%S')}{added:03d}"
            new_req = {
                'request_id': request_id,
                'source_title': title,
                'items': parsed['items'],
                'item': ', '.join(parsed['items'][:5]) if parsed['items'] else '',
                'orgs': parsed['orgs'],
                'org': ', '.join(parsed['orgs']) if parsed['orgs'] else '',
                'change_type': req_type or parsed['category'],
                'category': parsed['category'],
                'field': parsed['field'],
                'old_value': parsed['old_value'],
                'new_value': parsed['new_value'],
                'system': parsed['system'],
                'priority': _map_urgency(item.get('urgency', 'Medium')),
                'risk': item.get('risk', 'Low'),
                'status': 'Pending',
                'source_status': item.get('status', ''),
                'requestor': item.get('requestor', ''),
                'date_requested': item.get('date_requested', ''),
                'requested_completion': item.get('requested_completion', ''),
                'instructions': instructions,
                'assigned_to': item.get('assigned_to', ''),
                'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'created_by': 'cron-scraper',
                'updated_at': None,
                'approved_by': None,
                'approved_at': None,
            }
            requests_list.append(new_req)
            existing_titles.add(title)
            added += 1

        save_requests(requests_list)
        logger.info(f'Ingest: added {added} new requests, skipped {len(incoming) - added} duplicates')

        return jsonify({
            'success': True,
            'message': f'Ingested {added} new requests ({len(incoming) - added} duplicates skipped)',
            'added': added,
            'total': len(requests_list)
        })

    except Exception as e:
        logger.error(f'Ingest failed: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/stats', methods=['GET'])
@login_required
def get_stats():
    """Dashboard stats — counts by status, category, recent activity"""
    try:
        requests_list = load_requests()
        by_status = {}
        by_category = {}
        requestors = set()
        assigned_tos = set()
        for r in requests_list:
            s = r.get('status', 'Unknown')
            by_status[s] = by_status.get(s, 0) + 1
            c = r.get('category') or r.get('change_type') or 'Other'
            by_category[c] = by_category.get(c, 0) + 1
            if r.get('requestor'):
                requestors.add(r['requestor'])
            if r.get('assigned_to'):
                assigned_tos.add(r['assigned_to'])

        active = [r for r in requests_list if r.get('status') != 'Completed']
        completed = [r for r in requests_list if r.get('status') == 'Completed']

        # Active breakdown by category
        active_by_category = {}
        for r in active:
            c = r.get('category') or r.get('change_type') or 'Other'
            active_by_category[c] = active_by_category.get(c, 0) + 1

        completed_by_category = {}
        for r in completed:
            c = r.get('category') or r.get('change_type') or 'Other'
            completed_by_category[c] = completed_by_category.get(c, 0) + 1

        return jsonify({
            'success': True,
            'total': len(requests_list),
            'active_count': len(active),
            'completed_count': len(completed),
            'by_status': by_status,
            'by_category': by_category,
            'active_by_category': active_by_category,
            'completed_by_category': completed_by_category,
            'requestors': sorted(requestors),
            'assigned_tos': sorted(assigned_tos),
            'recent_active': active[:10],
        })
    except Exception as e:
        logger.error(f'Stats failed: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500


def _map_urgency(urgency):
    """Map SharePoint urgency to priority."""
    mapping = {'high': 'High', 'medium': 'Medium', 'low': 'Low'}
    return mapping.get(urgency.lower(), 'Medium') if urgency else 'Medium'


@bp.route('/request/<request_id>', methods=['PUT'])
@login_required
def update_request(request_id):
    """更新变更请求"""
    try:
        data = request.get_json()
        requests_list = load_requests()
        
        for req in requests_list:
            if req.get('request_id') == request_id:
                # 更新字段
                for key in ['item', 'org', 'change_type', 'field', 'old_value', 'new_value', 'system', 'priority', 'risk']:
                    if key in data:
                        req[key] = data[key]
                
                req['updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                save_requests(requests_list)
                logger.info(f'更新请求: {request_id}')
                
                return jsonify({
                    'success': True,
                    'message': '更新成功',
                    'data': req
                })
        
        return jsonify({'success': False, 'message': '请求不存在'}), 404
    
    except Exception as e:
        logger.error(f'更新请求失败: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/request/<request_id>', methods=['DELETE'])
@login_required
def delete_request(request_id):
    """删除变更请求"""
    try:
        requests_list = load_requests()
        
        original_len = len(requests_list)
        requests_list = [r for r in requests_list if r.get('request_id') != request_id]
        
        if len(requests_list) < original_len:
            save_requests(requests_list)
            logger.info(f'删除请求: {request_id}')
            return jsonify({
                'success': True,
                'message': '删除成功'
            })
        
        return jsonify({'success': False, 'message': '请求不存在'}), 404
    
    except Exception as e:
        logger.error(f'删除请求失败: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
审批流程路由
"""
from flask import Blueprint, request, jsonify, current_app
from app.utils.auth import login_required, get_current_user
from app.utils.logger import logger
from app.services.plm_service import update_plm_item
from app.services.ebs_service import update_ebs_item
import json
import os
from datetime import datetime

bp = Blueprint('approval', __name__)

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

@bp.route('/approve/<request_id>', methods=['POST'])
@login_required
def approve_request(request_id):
    """审批通过"""
    try:
        user = get_current_user()
        data = request.get_json() or {}
        comment = data.get('comment', '')
        
        requests_list = load_requests()
        
        for req in requests_list:
            if req.get('request_id') == request_id:
                if req.get('status') != 'Pending':
                    return jsonify({
                        'success': False,
                        'message': f'请求状态为 {req.get("status")}，无法审批'
                    }), 400
                
                # 根据系统调用相应的更新接口
                system = req.get('system', '').upper()
                item = req.get('item')
                field = req.get('field')
                new_value = req.get('new_value')
                
                update_success = False
                update_message = ''
                
                if 'PLM' in system:
                    result = update_plm_item(item, field, new_value)
                    update_success = result['success']
                    update_message = result['message']
                
                if 'EBS' in system:
                    result = update_ebs_item(item, field, new_value)
                    update_success = result['success']
                    update_message = result['message']
                
                # 更新请求状态
                req['status'] = 'Approved'
                req['approved_by'] = user['username']
                req['approved_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                req['comment'] = comment
                req['update_result'] = update_message
                
                save_requests(requests_list)
                
                logger.info(f'请求审批通过: {request_id} by {user["username"]}')
                
                return jsonify({
                    'success': True,
                    'message': '审批通过',
                    'update_success': update_success,
                    'update_message': update_message,
                    'data': req
                })
        
        return jsonify({'success': False, 'message': '请求不存在'}), 404
    
    except Exception as e:
        logger.error(f'审批失败: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'审批失败: {str(e)}'
        }), 500

@bp.route('/reject/<request_id>', methods=['POST'])
@login_required
def reject_request(request_id):
    """拒绝请求"""
    try:
        user = get_current_user()
        data = request.get_json() or {}
        comment = data.get('comment', '')
        
        if not comment:
            return jsonify({
                'success': False,
                'message': '拒绝理由不能为空'
            }), 400
        
        requests_list = load_requests()
        
        for req in requests_list:
            if req.get('request_id') == request_id:
                if req.get('status') != 'Pending':
                    return jsonify({
                        'success': False,
                        'message': f'请求状态为 {req.get("status")}，无法操作'
                    }), 400
                
                # 更新请求状态
                req['status'] = 'Rejected'
                req['approved_by'] = user['username']
                req['approved_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                req['comment'] = comment
                
                save_requests(requests_list)
                
                logger.info(f'请求已拒绝: {request_id} by {user["username"]}')
                
                return jsonify({
                    'success': True,
                    'message': '请求已拒绝',
                    'data': req
                })
        
        return jsonify({'success': False, 'message': '请求不存在'}), 404
    
    except Exception as e:
        logger.error(f'拒绝请求失败: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'操作失败: {str(e)}'
        }), 500

@bp.route('/history/<request_id>', methods=['GET'])
@login_required
def get_approval_history(request_id):
    """获取审批历史"""
    try:
        requests_list = load_requests()
        
        for req in requests_list:
            if req.get('request_id') == request_id:
                history = {
                    'request_id': request_id,
                    'created_at': req.get('created_at'),
                    'created_by': req.get('created_by'),
                    'status': req.get('status'),
                    'approved_by': req.get('approved_by'),
                    'approved_at': req.get('approved_at'),
                    'comment': req.get('comment', ''),
                    'update_result': req.get('update_result', '')
                }
                
                return jsonify({
                    'success': True,
                    'data': history
                })
        
        return jsonify({'success': False, 'message': '请求不存在'}), 404
    
    except Exception as e:
        logger.error(f'获取审批历史失败: {str(e)}')
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
物料查询路由
"""
from flask import Blueprint, jsonify
from app.utils.auth import login_required
from app.utils.logger import logger
from app.services.ebs_service import query_item_info

bp = Blueprint('item_query', __name__)

@bp.route('/<item_number>', methods=['GET'])
@login_required
def get_item_info(item_number):
    """查询物料信息"""
    try:
        if not item_number:
            return jsonify({'success': False, 'message': '物料号不能为空'}), 400
        
        logger.info(f'查询物料信息: {item_number}')
        
        # 查询EBS和PLM数据
        result = query_item_info(item_number)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 404
    
    except Exception as e:
        logger.error(f'查询物料信息失败: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'查询失败: {str(e)}'
        }), 500

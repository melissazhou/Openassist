#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
字段词典管理路由
"""
from flask import Blueprint, request, jsonify, current_app
from app.utils.auth import login_required
from app.utils.logger import logger
import json
import os
from datetime import datetime

bp = Blueprint('dictionary', __name__)

def load_dictionary():
    """加载字典数据"""
    dict_file = current_app.config['DICTIONARY_FILE']
    if os.path.exists(dict_file):
        with open(dict_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_dictionary(data):
    """保存字典数据"""
    dict_file = current_app.config['DICTIONARY_FILE']
    os.makedirs(os.path.dirname(dict_file), exist_ok=True)
    with open(dict_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@bp.route('/', methods=['GET'])
@login_required
def get_dictionary():
    """获取字典列表"""
    try:
        dictionary = load_dictionary()
        return jsonify({
            'success': True,
            'data': dictionary,
            'total': len(dictionary)
        })
    except Exception as e:
        logger.error(f'获取字典失败: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/', methods=['POST'])
@login_required
def add_dictionary():
    """添加字典项"""
    try:
        data = request.get_json()
        dictionary = load_dictionary()
        
        # 生成ID
        new_id = max([item.get('id', 0) for item in dictionary], default=0) + 1
        
        new_item = {
            'id': new_id,
            'business_desc': data.get('business_desc', ''),
            'field_name': data.get('field_name', ''),
            'system': data.get('system', ''),
            'description': data.get('description', ''),
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        dictionary.append(new_item)
        save_dictionary(dictionary)
        
        logger.info(f'添加字典项: {new_item["business_desc"]} -> {new_item["field_name"]}')
        
        return jsonify({
            'success': True,
            'message': '添加成功',
            'data': new_item
        })
    
    except Exception as e:
        logger.error(f'添加字典项失败: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<int:item_id>', methods=['PUT'])
@login_required
def update_dictionary(item_id):
    """更新字典项"""
    try:
        data = request.get_json()
        dictionary = load_dictionary()
        
        for item in dictionary:
            if item.get('id') == item_id:
                item['business_desc'] = data.get('business_desc', item['business_desc'])
                item['field_name'] = data.get('field_name', item['field_name'])
                item['system'] = data.get('system', item['system'])
                item['description'] = data.get('description', item.get('description', ''))
                item['updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                save_dictionary(dictionary)
                logger.info(f'更新字典项: ID={item_id}')
                
                return jsonify({
                    'success': True,
                    'message': '更新成功',
                    'data': item
                })
        
        return jsonify({'success': False, 'message': '字典项不存在'}), 404
    
    except Exception as e:
        logger.error(f'更新字典项失败: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<int:item_id>', methods=['DELETE'])
@login_required
def delete_dictionary(item_id):
    """删除字典项"""
    try:
        dictionary = load_dictionary()
        
        original_len = len(dictionary)
        dictionary = [item for item in dictionary if item.get('id') != item_id]
        
        if len(dictionary) < original_len:
            save_dictionary(dictionary)
            logger.info(f'删除字典项: ID={item_id}')
            return jsonify({
                'success': True,
                'message': '删除成功'
            })
        
        return jsonify({'success': False, 'message': '字典项不存在'}), 404
    
    except Exception as e:
        logger.error(f'删除字典项失败: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500

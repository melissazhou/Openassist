#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
认证路由
"""
from flask import Blueprint, request, jsonify, session
from app.utils.auth import verify_iwms_credentials, get_current_user
from app.utils.logger import logger

bp = Blueprint('auth', __name__, url_prefix='/auth')

@bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400
    
    # 验证凭据
    result = verify_iwms_credentials(username, password)
    
    if result['success']:
        # 保存用户信息到session
        session['user'] = result['user']
        logger.info(f'用户登录成功: {username}')
        return jsonify({
            'success': True,
            'message': result['message'],
            'user': result['user']
        })
    else:
        logger.warning(f'用户登录失败: {username}')
        return jsonify({
            'success': False,
            'message': result['message']
        }), 401

@bp.route('/logout', methods=['GET', 'POST'])
def logout():
    """用户登出"""
    user = session.get('user')
    if user:
        logger.info(f'用户登出: {user.get("username")}')
    session.pop('user', None)
    return jsonify({'success': True, 'message': '已登出'})

@bp.route('/check', methods=['GET'])
def check():
    """检查登录状态"""
    user = get_current_user()
    if user:
        return jsonify({
            'logged_in': True,
            'user': user
        })
    else:
        return jsonify({
            'logged_in': False
        })

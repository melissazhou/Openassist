#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
认证工具 - 认证装饰器和会话管理
"""
from functools import wraps
from flask import session, jsonify, request
import requests
from app.utils.logger import logger

# ============================================================
# 内置测试用户（离线开发 / IWMS不可达时使用）
# ============================================================
LOCAL_USERS = {
    'admin': {
        'password': 'admin123',
        'name': 'System Admin',
        'email': 'admin@ivcinc.com',
        'department': 'IT',
        'role': 'superadmin',
    },
    'demo': {
        'password': 'demo',
        'name': 'Demo User',
        'email': 'demo@ivcinc.com',
        'department': 'MDM Team',
        'role': 'user',
    },
    'mdm': {
        'password': 'mdm123',
        'name': 'MDM Operator',
        'email': 'mdm@ivcinc.com',
        'department': 'MDM Team',
        'role': 'operator',
    },
    'viewer': {
        'password': 'viewer',
        'name': 'Read-Only Viewer',
        'email': 'viewer@ivcinc.com',
        'department': 'Supply Chain',
        'role': 'viewer',
    },
}

# 角色权限定义
ROLE_PERMISSIONS = {
    'superadmin': ['read', 'write', 'approve', 'reject', 'delete', 'admin', 'manage_users', 'manage_dictionary', 'manage_config'],
    'operator':   ['read', 'write', 'approve', 'reject'],
    'user':       ['read', 'write'],
    'viewer':     ['read'],
}


def login_required(f):
    """登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'error': '未登录', 'code': 401}), 401
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """超级管理员权限装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = session.get('user')
        if not user:
            return jsonify({'error': '未登录', 'code': 401}), 401
        if user.get('role') != 'superadmin':
            return jsonify({'error': '权限不足，需要管理员权限', 'code': 403}), 403
        return f(*args, **kwargs)
    return decorated_function


def permission_required(*perms):
    """通用权限装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = session.get('user')
            if not user:
                return jsonify({'error': '未登录', 'code': 401}), 401
            role = user.get('role', 'viewer')
            user_perms = ROLE_PERMISSIONS.get(role, [])
            for p in perms:
                if p not in user_perms:
                    return jsonify({'error': f'权限不足，需要 {p} 权限', 'code': 403}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def verify_iwms_credentials(username, password):
    """
    验证用户凭据
    优先级: 本地用户 → IWMS SSO
    """
    # ---------- 1. 本地用户（离线开发 / 测试） ----------
    local = LOCAL_USERS.get(username)
    if local and local['password'] == password:
        logger.info(f'本地用户登录: {username} (role={local["role"]})')
        return {
            'success': True,
            'user': {
                'username': username,
                'name': local['name'],
                'email': local['email'],
                'department': local['department'],
                'role': local['role'],
                'permissions': ROLE_PERMISSIONS.get(local['role'], []),
            },
            'message': f'登录成功（{local["role"]}）'
        }

    # ---------- 2. IWMS SSO ----------
    try:
        auth_url = 'https://iwmsprd.corp.ivcinc.com:8010/auth'
        iwms_body = {
            "CompanyId": "",
            "UserCode": username,
            "Password": password,
            "WorkLocation": "",
            "Language": "US",
            "AutoLogin": "",
            "BrowserType": "",
            "AutoLoginPassword": "",
            "LoadMenu": "Y",
            "Token": ""
        }
        response = requests.post(
            auth_url,
            json=iwms_body,
            headers={'Content-Type': 'application/json'},
            timeout=5,
            verify=False
        )

        if response.status_code == 200:
            result = response.json()
            token = None
            if isinstance(result, dict) and 'rows' in result and result['rows']:
                token = result['rows'][0].get('Token')
            if token:
                return {
                    'success': True,
                    'user': {
                        'username': username,
                        'name': username,
                        'token': token,
                        'email': '',
                        'department': '',
                        'role': 'user',
                        'permissions': ROLE_PERMISSIONS['user'],
                    },
                    'message': '登录成功（IWMS SSO）'
                }

        return {'success': False, 'message': '用户名或密码错误'}

    except requests.exceptions.Timeout:
        logger.warning(f'IWMS认证超时: {username}')
        return {'success': False, 'message': 'IWMS认证服务不可用，请使用本地账号'}

    except Exception as e:
        logger.error(f'认证异常: {str(e)}')
        return {'success': False, 'message': f'认证失败: {str(e)}'}


def get_current_user():
    """获取当前登录用户"""
    return session.get('user', None)


def has_permission(perm):
    """检查当前用户是否有指定权限"""
    user = get_current_user()
    if not user:
        return False
    return perm in user.get('permissions', [])

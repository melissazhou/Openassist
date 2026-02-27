#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
配置文件
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """基础配置"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'openassist-secret-key-2024')
    
    # IWMS SSO认证地址
    IWMS_AUTH_URL = 'https://iwmsprd.corp.ivcinc.com:8010/auth'
    
    # AI配置
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
    AI_MODEL = os.getenv('AI_MODEL', 'gpt-4')  # 可选: gpt-4, claude-3-opus
    
    # Ingest API key (for cron scraper)
    INGEST_API_KEY = os.getenv('INGEST_API_KEY', 'openassist-ingest-2026')
    
    # Data file paths
    DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app', 'data')
    DICTIONARY_FILE = os.path.join(DATA_DIR, 'field_dictionary.json')
    REQUESTS_FILE = os.path.join(DATA_DIR, 'change_requests.json')
    SAMPLE_DIR = os.path.join(DATA_DIR, 'sample_requests')

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    DB_HOST = 'dev1ivcdb01.corp.ivcinc.com'
    DB_PORT = 1531
    DB_SERVICE = 'ebs_DEV1IVC'
    DB_USER = 'xxapps_ro'
    DB_PASSWORD = 'xxapps_ro'

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    DB_HOST = 'prd1ivcdb01.corp.ivcinc.com'
    DB_PORT = 1531
    DB_SERVICE = 'PRD1IVC'
    DB_USER = 'Xxapps_ro'
    DB_PASSWORD = 'Xxapps_ro'

def get_config(env='development'):
    """获取配置对象"""
    configs = {
        'development': DevelopmentConfig,
        'production': ProductionConfig
    }
    return configs.get(env, DevelopmentConfig)

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
OpenAssist Flask应用初始化
"""
from flask import Flask
from flask_cors import CORS
from app.config import get_config
import os

def create_app(config_name=None):
    """创建Flask应用实例"""
    app = Flask(__name__)
    
    # 加载配置
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    app.config.from_object(get_config(config_name))
    
    # 启用CORS
    CORS(app)
    
    # 注册蓝图
    from app.routes import auth, mdm, dictionary, item_query, approval
    app.register_blueprint(auth.bp)
    app.register_blueprint(mdm.bp, url_prefix='/api/mdm')
    app.register_blueprint(dictionary.bp, url_prefix='/api/dictionary')
    app.register_blueprint(item_query.bp, url_prefix='/api/item')
    app.register_blueprint(approval.bp, url_prefix='/api/approval')
    
    # 注册主页路由
    from flask import render_template
    @app.route('/')
    def index():
        return render_template('index.html')
    
    return app

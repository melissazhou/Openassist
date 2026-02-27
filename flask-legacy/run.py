#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
OpenAssist - AI辅助业务流程平台
主启动文件
"""
from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

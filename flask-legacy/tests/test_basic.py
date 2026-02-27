#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
基础测试
"""
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def test_imports():
    """测试基本导入"""
    try:
        from app import create_app
        from app.config import get_config
        from app.utils.auth import login_required
        from app.utils.logger import logger
        from app.services.ai_parser import parse_document
        
        print("✓ 所有模块导入成功")
        return True
    except Exception as e:
        print(f"✗ 导入失败: {str(e)}")
        return False

def test_app_creation():
    """测试应用创建"""
    try:
        from app import create_app
        app = create_app()
        
        assert app is not None
        print("✓ Flask应用创建成功")
        return True
    except Exception as e:
        print(f"✗ 应用创建失败: {str(e)}")
        return False

def test_routes():
    """测试路由注册"""
    try:
        from app import create_app
        app = create_app()
        
        rules = [str(rule) for rule in app.url_map.iter_rules()]
        
        # 检查关键路由
        assert any('/auth/login' in rule for rule in rules), "登录路由缺失"
        assert any('/api/mdm' in rule for rule in rules), "MDM路由缺失"
        assert any('/api/dictionary' in rule for rule in rules), "字典路由缺失"
        assert any('/api/item' in rule for rule in rules), "物料查询路由缺失"
        assert any('/api/approval' in rule for rule in rules), "审批路由缺失"
        
        print("✓ 所有路由注册成功")
        return True
    except Exception as e:
        print(f"✗ 路由检查失败: {str(e)}")
        return False

def test_ai_parser():
    """测试AI解析器"""
    try:
        from app import create_app
        app = create_app()
        
        with app.app_context():
            from app.services.ai_parser import parse_document
            
            test_text = "Item: TEST-001, change status from Active to Inactive"
            result = parse_document(test_text)
            
            assert result['success'], "解析失败"
            assert len(result['changes']) > 0, "未识别到变更"
            
            print("✓ AI解析器工作正常")
            return True
    except Exception as e:
        print(f"✗ AI解析器测试失败: {str(e)}")
        return False

if __name__ == '__main__':
    print("OpenAssist 基础测试")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_app_creation,
        test_routes,
        test_ai_parser
    ]
    
    passed = 0
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"测试结果: {passed}/{len(tests)} 通过")
    
    if passed == len(tests):
        print("✓ 所有测试通过！")
        sys.exit(0)
    else:
        print("✗ 部分测试失败")
        sys.exit(1)

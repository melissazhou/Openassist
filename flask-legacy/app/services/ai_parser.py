#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
AI文档解析服务
"""
from flask import current_app
from app.utils.logger import logger
import json
import re

def parse_document(text):
    """
    使用AI解析文档内容，生成结构化变更记录
    
    Args:
        text: 文档文本内容
    
    Returns:
        dict: {
            'success': bool,
            'changes': [变更记录列表],
            'message': str
        }
    """
    try:
        # 尝试使用配置的AI模型
        ai_model = current_app.config.get('AI_MODEL', 'gpt-4')
        openai_key = current_app.config.get('OPENAI_API_KEY', '')
        anthropic_key = current_app.config.get('ANTHROPIC_API_KEY', '')
        
        # 如果有API Key，调用真实AI接口
        if openai_key and 'gpt' in ai_model.lower():
            return _parse_with_openai(text, openai_key, ai_model)
        elif anthropic_key and 'claude' in ai_model.lower():
            return _parse_with_claude(text, anthropic_key, ai_model)
        else:
            # 降级：使用规则解析（Demo模式）
            logger.warning('未配置AI API Key，使用规则解析模式')
            return _parse_with_rules(text)
    
    except Exception as e:
        logger.error(f'AI解析失败: {str(e)}')
        return {
            'success': False,
            'changes': [],
            'message': f'解析失败: {str(e)}'
        }

def _parse_with_openai(text, api_key, model):
    """使用OpenAI API解析"""
    try:
        import openai
        openai.api_key = api_key
        
        prompt = f"""请解析以下物料维护请求文档，提取所有变更信息。

文档内容：
{text}

请以JSON格式返回，每条变更记录包含：
- item: 物料号
- org: 组织
- change_type: 变更类型（如：Update, Create, Deactivate）
- field: 字段名
- old_value: 旧值
- new_value: 新值
- system: 系统（PLM/EBS）
- priority: 优先级（High/Medium/Low）
- risk: 风险等级（High/Medium/Low）

返回格式：
{{"changes": [...]}}
"""
        
        response = openai.ChatCompletion.create(
            model=model,
            messages=[
                {"role": "system", "content": "你是一个专业的MDM物料数据解析助手。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        result_text = response.choices[0].message.content
        result = json.loads(result_text)
        
        return {
            'success': True,
            'changes': result.get('changes', []),
            'message': f'AI解析成功，识别 {len(result.get("changes", []))} 条变更'
        }
    
    except Exception as e:
        logger.error(f'OpenAI解析失败: {str(e)}')
        # 降级到规则解析
        return _parse_with_rules(text)

def _parse_with_claude(text, api_key, model):
    """使用Claude API解析"""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        
        prompt = f"""请解析以下物料维护请求文档，提取所有变更信息。

文档内容：
{text}

请以JSON格式返回，每条变更记录包含：
- item: 物料号
- org: 组织
- change_type: 变更类型（如：Update, Create, Deactivate）
- field: 字段名
- old_value: 旧值
- new_value: 新值
- system: 系统（PLM/EBS）
- priority: 优先级（High/Medium/Low）
- risk: 风险等级（High/Medium/Low）

返回格式：
{{"changes": [...]}}
"""
        
        message = client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        result_text = message.content[0].text
        result = json.loads(result_text)
        
        return {
            'success': True,
            'changes': result.get('changes', []),
            'message': f'AI解析成功，识别 {len(result.get("changes", []))} 条变更'
        }
    
    except Exception as e:
        logger.error(f'Claude解析失败: {str(e)}')
        # 降级到规则解析
        return _parse_with_rules(text)

def _parse_with_rules(text):
    """
    基于规则的解析（Demo模式 / AI不可用时降级）
    识别常见的变更模式
    """
    changes = []
    
    # 简单的模式匹配
    # 示例格式：
    # "Item: 123456, change status from Active to Inactive"
    # "Update buyer for item 789012 to BUYER001"
    # "Item 456789: change pallet config from A to B"
    
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        change = {
            'item': '',
            'org': 'US01',
            'change_type': 'Update',
            'field': '',
            'old_value': '',
            'new_value': '',
            'system': 'EBS',
            'priority': 'Medium',
            'risk': 'Low'
        }
        
        # 提取物料号
        item_match = re.search(r'[Ii]tem[:\s]+([A-Z0-9\-]+)', line)
        if item_match:
            change['item'] = item_match.group(1)
        
        # 识别字段和值
        if 'status' in line.lower():
            change['field'] = 'item_status'
            # 查找 "from X to Y" 模式
            from_to = re.search(r'from\s+(\w+)\s+to\s+(\w+)', line, re.IGNORECASE)
            if from_to:
                change['old_value'] = from_to.group(1)
                change['new_value'] = from_to.group(2)
        
        elif 'buyer' in line.lower():
            change['field'] = 'buyer_code'
            change['system'] = 'EBS'
            # 查找 "to XXX" 模式
            to_match = re.search(r'to\s+([A-Z0-9]+)', line)
            if to_match:
                change['new_value'] = to_match.group(1)
        
        elif 'pallet' in line.lower():
            change['field'] = 'pallet_config'
            change['system'] = 'PLM'
            from_to = re.search(r'from\s+(\w+)\s+to\s+(\w+)', line, re.IGNORECASE)
            if from_to:
                change['old_value'] = from_to.group(1)
                change['new_value'] = from_to.group(2)
        
        elif 'bom' in line.lower():
            change['field'] = 'bom'
            change['system'] = 'PLM/EBS'
        
        # 只添加有效的变更记录
        if change['item'] and change['field']:
            changes.append(change)
    
    # 如果没有匹配到，创建一条示例数据
    if not changes:
        changes.append({
            'item': 'DEMO-ITEM-001',
            'org': 'US01',
            'change_type': 'Update',
            'field': 'item_status',
            'old_value': 'Active',
            'new_value': 'Inactive',
            'system': 'EBS',
            'priority': 'Medium',
            'risk': 'Low'
        })
    
    logger.info(f'规则解析完成，识别 {len(changes)} 条变更')
    
    return {
        'success': True,
        'changes': changes,
        'message': f'规则解析完成（Demo模式），识别 {len(changes)} 条变更'
    }

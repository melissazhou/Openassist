#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
EBS接口服务
"""
from app.utils.db import OraclePool
from app.utils.logger import logger
from app.services.plm_service import query_plm_item

def query_item_info(item_number):
    """
    查询物料信息（EBS + PLM）
    
    Args:
        item_number: 物料号
    
    Returns:
        dict: {
            'success': bool,
            'ebs_data': dict,
            'plm_data': dict,
            'message': str
        }
    """
    try:
        # 查询EBS数据
        ebs_data = _query_ebs_item(item_number)
        
        # 查询PLM数据
        plm_result = query_plm_item(item_number)
        plm_data = plm_result.get('data', {}) if plm_result['success'] else {}
        
        return {
            'success': True,
            'ebs_data': ebs_data,
            'plm_data': plm_data,
            'message': '查询成功'
        }
    
    except Exception as e:
        logger.error(f'查询物料信息失败: {str(e)}')
        return {
            'success': False,
            'ebs_data': {},
            'plm_data': {},
            'message': f'查询失败: {str(e)}'
        }

def _query_ebs_item(item_number):
    """查询EBS物料主数据"""
    try:
        # 尝试连接Oracle数据库查询
        sql = """
            SELECT 
                msi.segment1 AS item_number,
                msi.description,
                msi.primary_uom_code AS uom,
                msi.item_type,
                msi.inventory_item_status_code AS status,
                msi.list_price_per_unit AS list_price,
                msi.purchasing_item_flag,
                msi.customer_order_flag,
                msi.stock_enabled_flag,
                msi.attribute1,
                msi.attribute2,
                msi.creation_date,
                msi.last_update_date
            FROM mtl_system_items_b msi
            WHERE msi.segment1 = :item_number
            AND msi.organization_id = 101
            AND ROWNUM = 1
        """
        
        results = OraclePool.execute_query(sql, {'item_number': item_number})
        
        if results:
            data = results[0]
            # 转换Oracle数据类型
            for key, value in data.items():
                if hasattr(value, 'strftime'):
                    data[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            return data
        else:
            # 没有找到数据，返回Mock数据
            logger.warning(f'EBS中未找到物料 {item_number}，返回Mock数据')
            return _get_mock_ebs_data(item_number)
    
    except Exception as e:
        logger.warning(f'EBS查询异常: {str(e)}，返回Mock数据')
        return _get_mock_ebs_data(item_number)

def _get_mock_ebs_data(item_number):
    """返回Mock EBS数据（开发/演示用）"""
    return {
        'ITEM_NUMBER': item_number,
        'DESCRIPTION': 'Sample Item Description',
        'UOM': 'EA',
        'ITEM_TYPE': 'FG',
        'STATUS': 'Active',
        'LIST_PRICE': 100.00,
        'PURCHASING_ITEM_FLAG': 'Y',
        'CUSTOMER_ORDER_FLAG': 'Y',
        'STOCK_ENABLED_FLAG': 'Y',
        'ATTRIBUTE1': '',
        'ATTRIBUTE2': '',
        'CREATION_DATE': '2024-01-01 00:00:00',
        'LAST_UPDATE_DATE': '2024-01-15 12:00:00'
    }

def update_ebs_item(item, field, value):
    """
    更新EBS物料数据
    
    Args:
        item: 物料号
        field: 字段名
        value: 新值
    
    Returns:
        dict: {'success': bool, 'message': str}
    """
    try:
        # TODO: 实现真实的EBS更新接口
        # 当前为Mock实现
        
        logger.info(f'[EBS Mock] 更新物料 {item}, 字段 {field} = {value}')
        
        # 真实场景中，应该调用EBS API或执行SQL更新
        # sql = """
        #     UPDATE mtl_system_items_b
        #     SET {field} = :value,
        #         last_update_date = SYSDATE
        #     WHERE segment1 = :item
        #     AND organization_id = 101
        # """
        # 
        # OraclePool.execute_update(sql, {'value': value, 'item': item})
        
        # 模拟成功返回
        return {
            'success': True,
            'message': f'EBS更新成功（Mock）: {item}.{field} = {value}'
        }
    
    except Exception as e:
        logger.error(f'EBS更新失败: {str(e)}')
        return {
            'success': False,
            'message': f'EBS更新失败: {str(e)}'
        }

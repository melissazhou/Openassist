#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据库连接池管理
"""
import cx_Oracle
from flask import current_app
from app.utils.logger import logger

class OraclePool:
    """Oracle数据库连接池"""
    
    _pool = None
    
    @classmethod
    def get_pool(cls):
        """获取连接池（单例模式）"""
        if cls._pool is None:
            cls._pool = cls._create_pool()
        return cls._pool
    
    @classmethod
    def _create_pool(cls):
        """创建连接池"""
        try:
            config = current_app.config
            dsn = cx_Oracle.makedsn(
                config['DB_HOST'],
                config['DB_PORT'],
                service_name=config['DB_SERVICE']
            )
            
            pool = cx_Oracle.SessionPool(
                user=config['DB_USER'],
                password=config['DB_PASSWORD'],
                dsn=dsn,
                min=2,
                max=10,
                increment=1,
                encoding='UTF-8'
            )
            
            logger.info(f'数据库连接池创建成功: {config["DB_HOST"]}:{config["DB_PORT"]}/{config["DB_SERVICE"]}')
            return pool
        
        except Exception as e:
            logger.error(f'数据库连接池创建失败: {str(e)}')
            return None
    
    @classmethod
    def get_connection(cls):
        """从连接池获取连接"""
        pool = cls.get_pool()
        if pool:
            try:
                return pool.acquire()
            except Exception as e:
                logger.error(f'获取数据库连接失败: {str(e)}')
                return None
        return None
    
    @classmethod
    def execute_query(cls, sql, params=None):
        """
        执行查询SQL
        
        Args:
            sql: SQL语句
            params: 参数（dict或tuple）
        
        Returns:
            list: 查询结果列表
        """
        conn = None
        try:
            conn = cls.get_connection()
            if not conn:
                logger.warning('数据库连接不可用，返回空结果')
                return []
            
            cursor = conn.cursor()
            
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            
            columns = [col[0] for col in cursor.description]
            results = []
            
            for row in cursor:
                results.append(dict(zip(columns, row)))
            
            cursor.close()
            return results
        
        except Exception as e:
            logger.error(f'SQL查询失败: {str(e)}\nSQL: {sql}')
            return []
        
        finally:
            if conn:
                conn.close()
    
    @classmethod
    def execute_update(cls, sql, params=None):
        """
        执行更新SQL
        
        Args:
            sql: SQL语句
            params: 参数（dict或tuple）
        
        Returns:
            int: 影响的行数
        """
        conn = None
        try:
            conn = cls.get_connection()
            if not conn:
                logger.warning('数据库连接不可用')
                return 0
            
            cursor = conn.cursor()
            
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            
            conn.commit()
            rowcount = cursor.rowcount
            cursor.close()
            
            return rowcount
        
        except Exception as e:
            logger.error(f'SQL更新失败: {str(e)}\nSQL: {sql}')
            if conn:
                conn.rollback()
            return 0
        
        finally:
            if conn:
                conn.close()

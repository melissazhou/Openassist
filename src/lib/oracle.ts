import oracledb from "oracledb";

// Try thin mode first; initOracleClient is optional for thin mode in v6+
try { oracledb.initOracleClient(); } catch { /* thin mode, no client needed */ }

// EBS PRD connection config
const EBS_CONFIG = {
  user: process.env.EBS_USER || "Xxapps_ro",
  password: process.env.EBS_PASSWORD || "Xxapps_ro",
  connectString: process.env.EBS_CONNECT || "prd1ivcdb01.corp.ivcinc.com:1531/PRD1IVC",
};

// IWMS PRD connection config
const WMS_CONFIG = {
  user: process.env.WMS_USER || "xxwms_ro",
  password: process.env.WMS_PASSWORD || "xxwms_ro",
  connectString: process.env.WMS_CONNECT || "iwmsprddb01.corp.ivcinc.com:1521/IWMSPRD.corp.ivcinc.com",
};

export async function queryEBS(sql: string, binds: any[] = []): Promise<any[]> {
  let conn;
  try {
    conn = await oracledb.getConnection(EBS_CONFIG);
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return (result.rows as any[]) || [];
  } finally {
    if (conn) await conn.close();
  }
}

export async function queryWMS(sql: string, binds: any[] = []): Promise<any[]> {
  let conn;
  try {
    conn = await oracledb.getConnection(WMS_CONFIG);
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return (result.rows as any[]) || [];
  } finally {
    if (conn) await conn.close();
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryEBS } from "@/lib/oracle";

// GET /api/items/search?q=5500383&org=AND
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q");
  const org = req.nextUrl.searchParams.get("org") || "%";

  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Query too short (min 3 chars)" }, { status: 400 });
  }

  try {
    const sql = `
      SELECT 
        msib.SEGMENT1 AS item_number,
        msib.DESCRIPTION AS description,
        msib.INVENTORY_ITEM_STATUS_CODE AS item_status,
        msib.ITEM_TYPE AS item_type,
        mp.ORGANIZATION_CODE AS org_code,
        msib.PRIMARY_UOM_CODE AS uom,
        msib.PLANNER_CODE AS planner_code,
        msib.BUYER_ID,
        (SELECT full_name FROM apps.per_all_people_f papf 
         WHERE papf.person_id = msib.BUYER_ID 
         AND SYSDATE BETWEEN papf.effective_start_date AND papf.effective_end_date
         AND ROWNUM = 1) AS buyer_name,
        msib.LIST_PRICE_PER_UNIT AS list_price,
        msib.MINIMUM_ORDER_QUANTITY AS moq,
        msib.FIXED_ORDER_QUANTITY AS foq,
        msib.FULL_LEAD_TIME AS lead_time,
        msib.SAFETY_STOCK_BUCKET_DAYS AS safety_stock_days,
        msib.ROUNDING_CONTROL_TYPE AS rounding_type,
        msib.CREATION_DATE AS created_date,
        msib.LAST_UPDATE_DATE AS last_update
      FROM apps.MTL_SYSTEM_ITEMS_B msib
      JOIN apps.MTL_PARAMETERS mp ON mp.ORGANIZATION_ID = msib.ORGANIZATION_ID
      WHERE msib.SEGMENT1 LIKE :item_pattern
        AND mp.ORGANIZATION_CODE LIKE :org_pattern
      ORDER BY mp.ORGANIZATION_CODE, msib.SEGMENT1
      FETCH FIRST 50 ROWS ONLY
    `;

    const rows = await queryEBS(sql, [
      q.includes("%") ? q : `%${q}%`,
      org,
    ]);

    return NextResponse.json({ items: rows, count: rows.length });
  } catch (error: any) {
    console.error("EBS query error:", error.message);
    return NextResponse.json(
      { error: "Database connection failed", detail: error.message?.slice(0, 200) },
      { status: 503 }
    );
  }
}

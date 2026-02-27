import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryEBS } from "@/lib/oracle";
import { prisma } from "@/lib/prisma";

// GET /api/items/[itemNumber]?org=AND — item detail with EBS data + related change requests
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemNumber: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemNumber } = await params;
  const org = req.nextUrl.searchParams.get("org") || "%";

  // 1. Query EBS item master
  let ebsData: any[] = [];
  let ebsError: string | null = null;
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
        (SELECT full_name FROM apps.per_all_people_f papf 
         WHERE papf.person_id = msib.BUYER_ID 
         AND SYSDATE BETWEEN papf.effective_start_date AND papf.effective_end_date
         AND ROWNUM = 1) AS buyer_name,
        msib.LIST_PRICE_PER_UNIT AS list_price,
        msib.MINIMUM_ORDER_QUANTITY AS moq,
        msib.FIXED_ORDER_QUANTITY AS foq,
        msib.FULL_LEAD_TIME AS lead_time,
        msib.SAFETY_STOCK_BUCKET_DAYS AS safety_stock_days,
        msib.POSTPROCESSING_LEAD_TIME AS post_processing_lt,
        msib.PREPROCESSING_LEAD_TIME AS pre_processing_lt,
        msib.ROUNDING_CONTROL_TYPE AS rounding_type,
        msib.UNIT_WEIGHT AS unit_weight,
        msib.WEIGHT_UOM_CODE AS weight_uom,
        msib.CREATION_DATE AS created_date,
        msib.LAST_UPDATE_DATE AS last_update
      FROM apps.MTL_SYSTEM_ITEMS_B msib
      JOIN apps.MTL_PARAMETERS mp ON mp.ORGANIZATION_ID = msib.ORGANIZATION_ID
      WHERE msib.SEGMENT1 = :item_number
        AND mp.ORGANIZATION_CODE LIKE :org_pattern
      ORDER BY mp.ORGANIZATION_CODE
    `;
    ebsData = await queryEBS(sql, [itemNumber, org]);
  } catch (e: any) {
    ebsError = e.message?.slice(0, 200);
  }

  // 2. Query related change requests from OpenAssist
  const changeRequests = await prisma.changeRequest.findMany({
    where: {
      OR: [
        { itemCode: itemNumber },
        { itemCodes: { has: itemNumber } },
        { title: { contains: itemNumber } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true, requestNumber: true, title: true, status: true,
      mdmField: true, fieldLabel: true, oldValue: true, newValue: true,
      orgs: true, createdAt: true, requestorName: true,
    },
  });

  return NextResponse.json({
    itemNumber,
    ebs: ebsData,
    ebsError,
    changeRequests,
  });
}

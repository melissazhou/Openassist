-- AlterTable
ALTER TABLE "change_requests" ADD COLUMN     "assigned_to_name" TEXT,
ADD COLUMN     "change_type" TEXT,
ADD COLUMN     "date_requested" TIMESTAMP(3),
ADD COLUMN     "field_label" TEXT,
ADD COLUMN     "item_codes" TEXT[],
ADD COLUMN     "mdm_field" TEXT,
ADD COLUMN     "orgs" TEXT[],
ADD COLUMN     "risk" TEXT,
ADD COLUMN     "source_status" TEXT;

-- CreateIndex
CREATE INDEX "change_requests_mdm_field_idx" ON "change_requests"("mdm_field");

-- CreateIndex
CREATE INDEX "change_requests_item_code_idx" ON "change_requests"("item_code");

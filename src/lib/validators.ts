import { z } from "zod";

export const createChangeRequestSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  category: z.enum([
    "ITEM_MASTER", "BOM", "ROUTING", "VENDOR", "CUSTOMER",
    "PRICE", "WAREHOUSE", "SYSTEM_CONFIG", "OTHER",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  itemCode: z.string().optional(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  targetSystems: z.array(z.string()).default([]),
  dueDate: z.string().optional(),
  requestorName: z.string().optional(),
});

export const updateChangeRequestSchema = createChangeRequestSchema.partial().extend({
  status: z.enum([
    "NEW", "PENDING_REVIEW", "IN_PROGRESS", "PENDING_APPROVAL",
    "APPROVED", "REJECTED", "COMPLETED", "CANCELLED",
  ]).optional(),
  assignedToId: z.string().optional(),
});

export type CreateChangeRequestInput = z.infer<typeof createChangeRequestSchema>;
export type UpdateChangeRequestInput = z.infer<typeof updateChangeRequestSchema>;

// Comment validation
export const createCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000),
});

// Approval action validation
export const approvalActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().max(2000).optional(),
});

// User creation validation
export const createUserSchema = z.object({
  username: z.string().min(2).max(50).regex(/^[a-zA-Z0-9._-]+$/, "Invalid username format"),
  displayName: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(4, "Password must be at least 4 characters").max(100),
  role: z.enum(["ADMIN", "MDM_MANAGER", "MDM_ANALYST", "REQUESTOR", "VIEWER"]).default("VIEWER"),
  department: z.string().max(100).optional(),
});

// User update validation
export const updateUserSchema = z.object({
  displayName: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MDM_MANAGER", "MDM_ANALYST", "REQUESTOR", "VIEWER"]).optional(),
  department: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

// Password change validation
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(4, "New password must be at least 4 characters").max(100),
});

// System config update validation
export const configUpdateSchema = z.object({
  updates: z.array(z.object({
    key: z.string().min(1),
    value: z.string(),
  })).min(1),
});

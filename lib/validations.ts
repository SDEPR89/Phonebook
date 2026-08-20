import { z } from "zod";

export const createOfficerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  avatarUrl: z.string().url().optional().nullable(),
  systemRole: z.enum(["officer", "admin", "superadmin"]).default("officer"),
  phoneNumber: z.string().optional().nullable(),
  certId: z.string().uuid().optional().nullable(),
  roleId: z.string().uuid().optional().nullable(),
});

export const updateOfficerSchema = createOfficerSchema.partial();

export const createCertSchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().url().optional().nullable(),
  adminId: z.string().uuid().optional().nullable(),
});

export const updateCertSchema = createCertSchema.partial();

export const createRoleSchema = z.object({
  name: z.string().min(1),
});

export const updateRoleSchema = createRoleSchema.partial();

export const createReportSchema = z.object({
  targetOfficerId: z.string().uuid(),
  reason: z.enum([
    "unreachable_phone",
    "wrong_phone",
    "wrong_name",
    "wrong_cert",
    "wrong_role",
    "resigned_or_moved",
    "other",
  ]),
  details: z.string().optional().nullable(),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(["reported", "resolved", "rejected"]),
  adminNotes: z.string().optional().nullable(),
});

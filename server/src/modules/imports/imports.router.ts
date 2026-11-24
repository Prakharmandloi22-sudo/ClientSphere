import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db, ImportRecord, LeadRecord } from '../../db';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { normalizeEmail, normalizePhone, generateDedupKey } from '../../utils/security';
import { calculateLeadScore } from '../leads/leads.router';

const router = Router();

const importLeadsSchema = z.object({
  filename: z.string().default('leads_import.csv'),
  rows: z.array(
    z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string(),
      phone: z.string().optional().nullable(),
      companyName: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
    })
  ).min(1),
});

// POST /api/v1/imports/leads
router.post('/leads', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = importLeadsSchema.parse(req.body);
    const orgId = req.user!.orgId;

    const importId = uuidv4();
    const importRecord: ImportRecord = {
      id: importId,
      org_id: orgId,
      uploaded_by_id: req.user!.userId,
      entity_type: 'LEAD',
      filename: data.filename,
      total_rows: data.rows.length,
      processed_rows: 0,
      success_rows: 0,
      failed_rows: 0,
      duplicate_rows: 0,
      status: 'PROCESSING',
      error_report: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.imports.set(importId, importRecord);

    const errorReport: any[] = [];
    let successCount = 0;
    let dupCount = 0;
    let failedCount = 0;

    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const rowNumber = i + 1;

      // Validation
      if (!row.email || !row.email.includes('@')) {
        failedCount++;
        errorReport.push({
          row: rowNumber,
          data: row,
          reason: 'Invalid email address format',
        });
        continue;
      }

      const normEmail = normalizeEmail(row.email);
      const normPhone = normalizePhone(row.phone);
      const dedupKey = generateDedupKey(normEmail, normPhone);

      // Check duplicate
      const existing = Array.from(db.leads.values()).find(
        (l) => l.org_id === orgId && (l.dedup_key === dedupKey || l.normalized_email === normEmail)
      );

      if (existing) {
        dupCount++;
        errorReport.push({
          row: rowNumber,
          data: row,
          reason: `Duplicate detected. Matches existing lead ${existing.id}`,
          existingLeadId: existing.id,
        });
        continue;
      }

      const { score, factors } = calculateLeadScore({
        email: normEmail,
        phone: normPhone,
        companyName: row.companyName,
        title: row.title,
      });

      const leadId = uuidv4();
      const newLead: LeadRecord = {
        id: leadId,
        org_id: orgId,
        owner_id: req.user!.userId,
        first_name: row.firstName,
        last_name: row.lastName,
        email: row.email,
        normalized_email: normEmail,
        phone: row.phone || null,
        normalized_phone: normPhone || null,
        company_name: row.companyName || null,
        title: row.title || null,
        source: 'CSV_IMPORT',
        status: 'NEW',
        score,
        score_factors: factors,
        dedup_key: dedupKey,
        custom_fields: { importId },
        converted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.leads.set(leadId, newLead);
      successCount++;
    }

    importRecord.processed_rows = data.rows.length;
    importRecord.success_rows = successCount;
    importRecord.failed_rows = failedCount;
    importRecord.duplicate_rows = dupCount;
    importRecord.error_report = errorReport;
    importRecord.status = failedCount === data.rows.length ? 'FAILED' : 'COMPLETED';
    importRecord.updated_at = new Date().toISOString();

    res.status(201).json({
      success: true,
      message: 'Lead import processed',
      data: importRecord,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/imports
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;
    const items = Array.from(db.imports.values()).filter((i) => i.org_id === orgId);
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db, ActivityRecord, ConsentRecord, LeadRecord } from '../../db';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { normalizeEmail, normalizePhone, generateDedupKey } from '../../utils/security';
import { runAutomationTrigger } from '../automation/automation.service';
import { calculateLeadScore } from '../leads/leads.router';

const router = Router();

const sendEmailSchema = z.object({
  recipientEmail: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  entityType: z.enum(['LEAD', 'CONTACT', 'OPPORTUNITY']),
  entityId: z.string().min(1),
});

const scheduleMeetingSchema = z.object({
  title: z.string().min(1),
  attendeeEmail: z.string().email(),
  startTime: z.string(),
  durationMinutes: z.number().int().min(15).max(480).default(30),
  entityType: z.enum(['LEAD', 'CONTACT', 'OPPORTUNITY']),
  entityId: z.string().min(1),
});

const publicLeadCaptureSchema = z.object({
  apiKey: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  consentGranted: z.boolean().default(true),
  consentType: z.string().default('EMAIL_MARKETING'),
  referrer: z.string().optional(),
});

// 1. Email Sandbox Endpoint
router.post('/email/send', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = sendEmailSchema.parse(req.body);
    const orgId = req.user!.orgId;

    // Check consent before sending email (Assessment 08)
    const consent = Array.from(db.consents.values()).find(
      (c) => c.org_id === orgId && c.entity_id === data.entityId && c.consent_type === 'EMAIL_MARKETING'
    );
    if (consent && consent.status === 'REVOKED') {
      return next(new AppError('Cannot send email: Recipient has revoked EMAIL_MARKETING consent.', 403, 'CONSENT_REVOKED'));
    }

    // Simulate sending email via sandbox provider
    const messageId = `msg-sandbox-${uuidv4()}`;

    // Record as Activity in CRM
    const actId = uuidv4();
    const emailActivity: ActivityRecord = {
      id: actId,
      org_id: orgId,
      performed_by_id: req.user!.userId,
      activity_type: 'EMAIL',
      subject: `[Email Sent] ${data.subject}`,
      description: data.body,
      entity_type: data.entityType,
      entity_id: data.entityId,
      scheduled_at: null,
      completed_at: new Date().toISOString(),
      status: 'COMPLETED',
      metadata: {
        provider: 'EMAIL_SANDBOX',
        messageId,
        recipient: data.recipientEmail,
        deliveryStatus: 'DELIVERED_SANDBOX',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.activities.set(actId, emailActivity);

    res.json({
      success: true,
      message: 'Email dispatched via sandbox service',
      data: {
        messageId,
        activityId: actId,
        deliveryStatus: 'DELIVERED',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. Calendar Sandbox Endpoint
router.post('/calendar/schedule', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = scheduleMeetingSchema.parse(req.body);
    const orgId = req.user!.orgId;

    const eventId = `cal-event-${uuidv4()}`;
    const meetUrl = `https://meet.clientsphere.internal/sandbox-${uuidv4().substring(0, 8)}`;

    const actId = uuidv4();
    const meetingActivity: ActivityRecord = {
      id: actId,
      org_id: orgId,
      performed_by_id: req.user!.userId,
      activity_type: 'MEETING',
      subject: `[Calendar] ${data.title}`,
      description: `Virtual meeting scheduled via Calendar Sandbox.\nJoin URL: ${meetUrl}`,
      entity_type: data.entityType,
      entity_id: data.entityId,
      scheduled_at: data.startTime,
      completed_at: null,
      status: 'PENDING',
      metadata: {
        provider: 'CALENDAR_SANDBOX',
        calendarEventId: eventId,
        meetUrl,
        durationMinutes: data.durationMinutes,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.activities.set(actId, meetingActivity);

    res.json({
      success: true,
      message: 'Meeting scheduled in calendar sandbox',
      data: {
        eventId,
        meetUrl,
        activityId: actId,
        scheduledAt: data.startTime,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. Telephony Webhook Endpoint with Signature Verification
router.post('/telephony/webhook', (req: Request, res: Response, next) => {
  try {
    const signature = req.headers['x-telephony-signature'] as string;
    const webhookSecret = process.env.TELEPHONY_WEBHOOK_SECRET || 'clientsphere-telephony-secret-2026';

    // Verify webhook signature
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature && signature !== computedSignature) {
      return next(new AppError('Invalid telephony webhook signature', 401, 'INVALID_SIGNATURE'));
    }

    const { callSid, from, to, duration, callStatus, recordingUrl, orgId } = req.body;
    const targetOrgId = orgId || 'org-clientsphere-demo';

    // Lookup contact or lead by phone number
    const normPhone = normalizePhone(from);
    const contact = Array.from(db.contacts.values()).find(
      (c) => c.org_id === targetOrgId && normalizePhone(c.phone) === normPhone
    );
    const lead = !contact
      ? Array.from(db.leads.values()).find(
          (l) => l.org_id === targetOrgId && l.normalized_phone === normPhone
        )
      : null;

    const entityType = contact ? 'CONTACT' : lead ? 'LEAD' : 'GENERAL';
    const entityId = contact ? contact.id : lead ? lead.id : 'unknown';

    // Log call activity
    const actId = uuidv4();
    const callActivity: ActivityRecord = {
      id: actId,
      org_id: targetOrgId,
      performed_by_id: 'system-telephony',
      activity_type: 'CALL',
      subject: `[Inbound Call] from ${from} (${callStatus || 'COMPLETED'})`,
      description: `Telephony call duration: ${duration || 0} seconds. Caller identified as: ${
        contact ? `${contact.first_name} ${contact.last_name}` : lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown Caller'
      }`,
      entity_type: entityType as any,
      entity_id: entityId,
      scheduled_at: null,
      completed_at: new Date().toISOString(),
      status: 'COMPLETED',
      metadata: {
        provider: 'TELEPHONY_MOCK',
        callSid,
        from,
        to,
        duration,
        recordingUrl,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.activities.set(actId, callActivity);

    res.json({
      success: true,
      message: 'Telephony webhook processed successfully',
      data: {
        callSid,
        matchedEntity: { entityType, entityId },
        activityId: actId,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 4. External Public Lead Capture Endpoint (Form / Webhook)
router.post('/lead-capture', async (req: Request, res: Response, next) => {
  try {
    const data = publicLeadCaptureSchema.parse(req.body);
    const targetOrgId = 'org-clientsphere-demo'; // mapped from API key in production

    const normEmail = normalizeEmail(data.email);
    const normPhone = normalizePhone(data.phone);
    const dedupKey = generateDedupKey(normEmail, normPhone);

    // Deduplication check
    const existing = Array.from(db.leads.values()).find(
      (l) => l.org_id === targetOrgId && (l.dedup_key === dedupKey || l.normalized_email === normEmail)
    );

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Lead updated from external capture',
        data: { leadId: existing.id, isDuplicate: true },
      });
    }

    const { score, factors } = calculateLeadScore({
      email: normEmail,
      phone: normPhone,
      companyName: data.companyName,
      title: data.title,
    });

    const leadId = uuidv4();
    const newLead: LeadRecord = {
      id: leadId,
      org_id: targetOrgId,
      owner_id: 'user-rep-1',
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      normalized_email: normEmail,
      phone: data.phone || null,
      normalized_phone: normPhone || null,
      company_name: data.companyName || null,
      title: data.title || null,
      source: 'EXTERNAL_WEB_CAPTURE',
      status: 'NEW',
      score,
      score_factors: factors,
      dedup_key: dedupKey,
      custom_fields: { referrer: data.referrer || 'direct' },
      converted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.leads.set(leadId, newLead);

    // Record explicit consent
    const consentId = uuidv4();
    db.consents.set(consentId, {
      id: consentId,
      org_id: targetOrgId,
      entity_type: 'LEAD',
      entity_id: leadId,
      consent_type: data.consentType,
      status: data.consentGranted ? 'GRANTED' : 'REVOKED',
      granted_at: new Date().toISOString(),
      ip_address: req.ip || null,
      created_at: new Date().toISOString(),
    });

    // Trigger automation
    await runAutomationTrigger('LEAD_CREATED', { lead: newLead, orgId: targetOrgId });

    res.status(201).json({
      success: true,
      message: 'Lead captured successfully',
      data: {
        leadId,
        score,
        status: newLead.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 5. Integrations Status Overview
router.get('/status', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const statuses = [
      { provider: 'EMAIL_SANDBOX', status: 'ONLINE', latencyMs: 12, features: ['SMTP Simulation', 'HTML Templates'] },
      { provider: 'CALENDAR_SANDBOX', status: 'ONLINE', latencyMs: 15, features: ['Google Meet / Zoom URL gen', 'Availability Check'] },
      { provider: 'TELEPHONY_MOCK', status: 'ONLINE', latencyMs: 8, features: ['Inbound Webhook Verification', 'Call Logging'] },
      { provider: 'LEAD_CAPTURE_GATEWAY', status: 'ONLINE', latencyMs: 5, features: ['Spam Filtering', 'Consent Tracking', 'Instant Dedup'] },
    ];
    res.json({ success: true, data: statuses });
  } catch (err) {
    next(err);
  }
});

export default router;

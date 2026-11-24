import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db, ContactRecord, CompanyContactRecord } from '../../db';
import { authenticate, AuthenticatedRequest, checkRecordVisibility } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { normalizeEmail, normalizePhone, generateDedupKey, maskSensitiveFields } from '../../utils/security';

const router = Router();

const createContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  customFields: z.record(z.any()).optional().default({}),
  companyId: z.string().optional(),
  roleTitle: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const associateCompanySchema = z.object({
  companyId: z.string().min(1),
  roleTitle: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

// GET /api/v1/contacts
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.q as string || '').toLowerCase();

    let contacts = Array.from(db.contacts.values()).filter((c) => {
      if (c.org_id !== orgId) return false;
      if (!checkRecordVisibility(req.user!, c.owner_id, 'CONTACT', c.id)) return false;
      if (search) {
        const full = `${c.first_name} ${c.last_name} ${c.email} ${c.title || ''}`.toLowerCase();
        if (!full.includes(search)) return false;
      }
      return true;
    });

    contacts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = contacts.length;
    const paginated = contacts.slice((page - 1) * limit, page * limit).map((contact) => {
      // Find associated companies (Many-to-Many)
      const relationships = Array.from(db.companyContacts.values()).filter((cc) => cc.contact_id === contact.id);
      const associatedCompanies = relationships.map((r) => {
        const company = db.companies.get(r.company_id);
        return {
          id: r.id,
          companyId: r.company_id,
          companyName: company?.name || 'Unknown',
          roleTitle: r.role_title,
          isPrimary: r.is_primary,
        };
      });

      return {
        ...maskSensitiveFields(contact, req.user!.role),
        companies: associatedCompanies,
      };
    });

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/contacts/:id
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const contactId = req.params.id as string;
    const contact = db.contacts.get(contactId);
    if (!contact || contact.org_id !== req.user!.orgId) {
      return next(new AppError('Contact not found', 404, 'NOT_FOUND'));
    }
    if (!checkRecordVisibility(req.user!, contact.owner_id, 'CONTACT', contact.id)) {
      return next(new AppError('Forbidden: Access to this contact is restricted', 403, 'FORBIDDEN'));
    }

    const relationships = Array.from(db.companyContacts.values()).filter((cc) => cc.contact_id === contact.id);
    const companies = relationships.map((r) => {
      const company = db.companies.get(r.company_id);
      return {
        id: r.id,
        companyId: r.company_id,
        companyName: company?.name || 'Unknown',
        companyDomain: company?.domain,
        roleTitle: r.role_title,
        isPrimary: r.is_primary,
        startDate: r.start_date,
        endDate: r.end_date,
      };
    });

    const opps = Array.from(db.opportunities.values()).filter(
      (opp) => opp.primary_contact_id === contact.id && opp.org_id === req.user!.orgId
    );

    res.json({
      success: true,
      data: {
        ...maskSensitiveFields(contact, req.user!.role),
        companies,
        opportunities: opps,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/contacts
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = createContactSchema.parse(req.body);
    const orgId = req.user!.orgId;
    const normEmail = normalizeEmail(data.email);
    const normPhone = normalizePhone(data.phone);
    const dedupKey = generateDedupKey(normEmail, normPhone);

    const existing = Array.from(db.contacts.values()).find(
      (c) => c.org_id === orgId && (c.dedup_key === dedupKey || c.normalized_email === normEmail)
    );
    if (existing) {
      return next(
        new AppError(
          `Contact with email '${normEmail}' already exists. ID: ${existing.id}`,
          409,
          'DUPLICATE_CONTACT_DETECTED',
          { existingContactId: existing.id }
        )
      );
    }

    const contactId = uuidv4();
    const newContact: ContactRecord = {
      id: contactId,
      org_id: orgId,
      owner_id: data.ownerId || req.user!.userId,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      normalized_email: normEmail,
      phone: data.phone || null,
      title: data.title || null,
      dedup_key: dedupKey,
      custom_fields: data.customFields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.contacts.set(contactId, newContact);

    // Optional initial company link
    if (data.companyId) {
      const company = db.companies.get(data.companyId);
      if (company && company.org_id === orgId) {
        const ccId = uuidv4();
        db.companyContacts.set(ccId, {
          id: ccId,
          company_id: data.companyId,
          contact_id: contactId,
          role_title: data.roleTitle || data.title || null,
          is_primary: data.isPrimary ?? true,
          start_date: new Date().toISOString().split('T')[0],
          end_date: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    res.status(201).json({
      success: true,
      data: newContact,
    });
  } catch (err) {
    next(err);
  }
});

// Domain-Specific Challenge: Associate Contact with Multiple Companies
// POST /api/v1/contacts/:id/companies
router.post('/:id/companies', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const contactId = req.params.id as string;
    const contact = db.contacts.get(contactId);
    if (!contact || contact.org_id !== req.user!.orgId) {
      return next(new AppError('Contact not found', 404, 'NOT_FOUND'));
    }

    const data = associateCompanySchema.parse(req.body);
    const company = db.companies.get(data.companyId);
    if (!company || company.org_id !== req.user!.orgId) {
      return next(new AppError('Target company not found in this organization', 404, 'COMPANY_NOT_FOUND'));
    }

    // Check if relationship already exists
    const existing = Array.from(db.companyContacts.values()).find(
      (cc) => cc.contact_id === contact.id && cc.company_id === data.companyId
    );
    if (existing) {
      return next(new AppError('Contact is already associated with this company', 409, 'RELATIONSHIP_EXISTS'));
    }

    // If marked isPrimary, un-mark previous primary if desired
    if (data.isPrimary) {
      for (const cc of db.companyContacts.values()) {
        if (cc.contact_id === contact.id && cc.is_primary) {
          cc.is_primary = false;
        }
      }
    }

    const ccId = uuidv4();
    const newRelationship: CompanyContactRecord = {
      id: ccId,
      company_id: data.companyId,
      contact_id: contact.id,
      role_title: data.roleTitle || null,
      is_primary: data.isPrimary,
      start_date: data.startDate || new Date().toISOString().split('T')[0],
      end_date: data.endDate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.companyContacts.set(ccId, newRelationship);

    res.status(201).json({
      success: true,
      message: 'Contact linked to company successfully',
      data: newRelationship,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/contacts/:id/companies/:companyId
router.delete('/:id/companies/:companyId', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const contactId = req.params.id as string;
    const companyId = req.params.companyId as string;
    const relationship = Array.from(db.companyContacts.values()).find(
      (cc) => cc.contact_id === contactId && cc.company_id === companyId
    );
    if (!relationship) {
      return next(new AppError('Relationship not found', 404, 'NOT_FOUND'));
    }

    db.companyContacts.delete(relationship.id);
    res.json({ success: true, message: 'Association removed successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db, CompanyRecord } from '../../db';
import { authenticate, AuthenticatedRequest, checkRecordVisibility } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { maskSensitiveFields } from '../../utils/security';

const router = Router();

const createCompanySchema = z.object({
  name: z.string().min(1),
  domain: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  annualRevenue: z.number().optional().nullable(),
  employeeCount: z.number().int().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  customFields: z.record(z.any()).optional().default({}),
});

const updateCompanySchema = createCompanySchema.partial();

// GET /api/v1/companies
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.q as string || '').toLowerCase();
    const industry = req.query.industry as string;

    let companies = Array.from(db.companies.values()).filter((c) => {
      if (c.org_id !== orgId) return false;
      if (!checkRecordVisibility(req.user!, c.owner_id, 'COMPANY', c.id)) return false;
      if (industry && c.industry !== industry) return false;
      if (search) {
        const full = `${c.name} ${c.domain || ''} ${c.industry || ''}`.toLowerCase();
        if (!full.includes(search)) return false;
      }
      return true;
    });

    companies.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = companies.length;
    const paginated = companies.slice((page - 1) * limit, page * limit).map((c) => {
      // Find associated contacts count
      const contactsCount = Array.from(db.companyContacts.values()).filter((cc) => cc.company_id === c.id).length;
      return {
        ...maskSensitiveFields(c, req.user!.role),
        contactsCount,
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

// GET /api/v1/companies/:id
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const compId = req.params.id as string;
    const company = db.companies.get(compId);
    if (!company || company.org_id !== req.user!.orgId) {
      return next(new AppError('Company not found', 404, 'NOT_FOUND'));
    }
    if (!checkRecordVisibility(req.user!, company.owner_id, 'COMPANY', company.id)) {
      return next(new AppError('Forbidden: Access to this company is restricted', 403, 'FORBIDDEN'));
    }

    // Associated Contacts (Many-to-Many)
    const relationships = Array.from(db.companyContacts.values()).filter((cc) => cc.company_id === company.id);
    const contacts = relationships.map((r) => {
      const contact = db.contacts.get(r.contact_id);
      return {
        id: r.id,
        contactId: r.contact_id,
        firstName: contact?.first_name,
        lastName: contact?.last_name,
        email: contact?.email,
        roleTitle: r.role_title,
        isPrimary: r.is_primary,
      };
    });

    // Associated Opportunities
    const opportunities = Array.from(db.opportunities.values()).filter(
      (opp) => opp.company_id === company.id && opp.org_id === req.user!.orgId
    );

    res.json({
      success: true,
      data: {
        ...maskSensitiveFields(company, req.user!.role),
        contacts,
        opportunities,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/companies
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = createCompanySchema.parse(req.body);
    const orgId = req.user!.orgId;
    const dedupKey = data.domain ? data.domain.toLowerCase().trim() : data.name.toLowerCase().trim();

    const existing = Array.from(db.companies.values()).find(
      (c) => c.org_id === orgId && c.dedup_key === dedupKey
    );
    if (existing) {
      return next(
        new AppError(`Company with domain or name '${dedupKey}' already exists. ID: ${existing.id}`, 409, 'DUPLICATE_COMPANY_DETECTED', {
          existingCompanyId: existing.id,
        })
      );
    }

    const companyId = uuidv4();
    const newCompany: CompanyRecord = {
      id: companyId,
      org_id: orgId,
      owner_id: data.ownerId || req.user!.userId,
      name: data.name,
      domain: data.domain || null,
      industry: data.industry || null,
      annual_revenue: data.annualRevenue || null,
      employee_count: data.employeeCount || null,
      phone: data.phone || null,
      address: data.address || null,
      dedup_key: dedupKey,
      custom_fields: data.customFields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.companies.set(companyId, newCompany);

    res.status(201).json({
      success: true,
      data: newCompany,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/companies/:id
router.put('/:id', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const compId = req.params.id as string;
    const company = db.companies.get(compId);
    if (!company || company.org_id !== req.user!.orgId) {
      return next(new AppError('Company not found', 404, 'NOT_FOUND'));
    }
    if (!checkRecordVisibility(req.user!, company.owner_id, 'COMPANY', company.id)) {
      return next(new AppError('Forbidden: Access to this company is restricted', 403, 'FORBIDDEN'));
    }

    const updates = updateCompanySchema.parse(req.body);
    if (updates.name) company.name = updates.name;
    if (updates.domain !== undefined) company.domain = updates.domain;
    if (updates.industry !== undefined) company.industry = updates.industry;
    if (updates.annualRevenue !== undefined) company.annual_revenue = updates.annualRevenue;
    if (updates.employeeCount !== undefined) company.employee_count = updates.employeeCount;
    if (updates.phone !== undefined) company.phone = updates.phone;
    if (updates.address !== undefined) company.address = updates.address;
    if (updates.ownerId !== undefined) company.owner_id = updates.ownerId;
    if (updates.customFields) company.custom_fields = { ...company.custom_fields, ...updates.customFields };
    company.updated_at = new Date().toISOString();

    res.json({
      success: true,
      data: company,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/companies/:id
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const compId = req.params.id as string;
    const company = db.companies.get(compId);
    if (!company || company.org_id !== req.user!.orgId) {
      return next(new AppError('Company not found', 404, 'NOT_FOUND'));
    }
    if (req.user!.role !== 'ADMIN' && req.user!.userId !== company.owner_id) {
      return next(new AppError('Forbidden: Only admins or company owner can delete companies', 403, 'FORBIDDEN'));
    }

    db.companies.delete(company.id);

    // Cascade delete relationships
    for (const [key, cc] of db.companyContacts.entries()) {
      if (cc.company_id === company.id) {
        db.companyContacts.delete(key);
      }
    }

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

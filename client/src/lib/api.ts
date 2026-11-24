const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('clientsphere_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('clientsphere_token', token);
      else localStorage.removeItem('clientsphere_token');
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('clientsphere_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}: Request failed`;
      const err = new Error(errorMsg);
      (err as any).data = data;
      (err as any).status = response.status;
      throw err;
    }

    return data;
  }

  // Auth
  async login(payload: any) {
    const res: any = await this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.data?.tokens?.accessToken) {
      this.setToken(res.data.tokens.accessToken);
    }
    return res;
  }

  async getMe() {
    return this.request<any>('/api/v1/auth/me');
  }

  // Leads
  async getLeads(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<any>(`/api/v1/leads${q ? `?${q}` : ''}`);
  }

  async getLead(id: string) {
    return this.request<any>(`/api/v1/leads/${id}`);
  }

  async createLead(lead: any) {
    return this.request<any>('/api/v1/leads', {
      method: 'POST',
      body: JSON.stringify(lead),
    });
  }

  async updateLead(id: string, lead: any) {
    return this.request<any>(`/api/v1/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lead),
    });
  }

  async convertLead(id: string, options: any) {
    return this.request<any>(`/api/v1/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async deleteLead(id: string) {
    return this.request<any>(`/api/v1/leads/${id}`, { method: 'DELETE' });
  }

  // Contacts
  async getContacts(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<any>(`/api/v1/contacts${q ? `?${q}` : ''}`);
  }

  async getContact(id: string) {
    return this.request<any>(`/api/v1/contacts/${id}`);
  }

  async createContact(contact: any) {
    return this.request<any>('/api/v1/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  async linkContactCompany(contactId: string, payload: any) {
    return this.request<any>(`/api/v1/contacts/${contactId}/companies`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Companies
  async getCompanies(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<any>(`/api/v1/companies${q ? `?${q}` : ''}`);
  }

  async getCompany(id: string) {
    return this.request<any>(`/api/v1/companies/${id}`);
  }

  async createCompany(comp: any) {
    return this.request<any>('/api/v1/companies', {
      method: 'POST',
      body: JSON.stringify(comp),
    });
  }

  // Opportunities
  async getOpportunities(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<any>(`/api/v1/opportunities${q ? `?${q}` : ''}`);
  }

  async getOpportunity(id: string) {
    return this.request<any>(`/api/v1/opportunities/${id}`);
  }

  async createOpportunity(opp: any) {
    return this.request<any>('/api/v1/opportunities', {
      method: 'POST',
      body: JSON.stringify(opp),
    });
  }

  async updateOpportunity(id: string, opp: any) {
    return this.request<any>(`/api/v1/opportunities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(opp),
    });
  }

  async addOppTeamMember(oppId: string, payload: any) {
    return this.request<any>(`/api/v1/opportunities/${oppId}/team`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Pipelines & Kanban
  async getPipelines() {
    return this.request<any>('/api/v1/pipelines');
  }

  async getKanban(pipelineId: string) {
    return this.request<any>(`/api/v1/pipelines/${pipelineId}/kanban`);
  }

  // Activities
  async getActivities(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<any>(`/api/v1/activities${q ? `?${q}` : ''}`);
  }

  async createActivity(activity: any) {
    return this.request<any>('/api/v1/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  }

  // Imports
  async importLeads(filename: string, rows: any[]) {
    return this.request<any>('/api/v1/imports/leads', {
      method: 'POST',
      body: JSON.stringify({ filename, rows }),
    });
  }

  async getImports() {
    return this.request<any>('/api/v1/imports');
  }

  // Automation
  async getAutomationRules() {
    return this.request<any>('/api/v1/automation/rules');
  }

  async createAutomationRule(rule: any) {
    return this.request<any>('/api/v1/automation/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async getAutomationExecutions() {
    return this.request<any>('/api/v1/automation/executions');
  }

  // Analytics
  async getDashboardAnalytics() {
    return this.request<any>('/api/v1/analytics/dashboard');
  }

  // Integrations Sandbox
  async sendSandboxEmail(payload: any) {
    return this.request<any>('/api/v1/integrations/email/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async scheduleSandboxMeeting(payload: any) {
    return this.request<any>('/api/v1/integrations/calendar/schedule', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getIntegrationsStatus() {
    return this.request<any>('/api/v1/integrations/status');
  }
}

export const api = new ApiClient();

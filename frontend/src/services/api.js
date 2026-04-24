import axios from 'axios';

const TOKEN_KEY = 'govproposal_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes for AI generation requests
});

// Request interceptor — attach Authorization header from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 by clearing token and redirecting to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    console.error(`[API Error] ${message}`);

    // If 401 Unauthorized, clear stored token and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      // Only redirect if not already on login/register page
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')
      ) {
        window.location.href = import.meta.env.BASE_URL + 'login';
      }
    }

    return Promise.reject(error);
  }
);

// Compliance Engine
export const getNAICSCodes = (category) => api.get('/api/compliance/naics', { params: { category } });
export const getNAICSDetails = (code) => api.get(`/api/compliance/naics/${code}`);
export const getComplianceRequirements = (category) => api.get('/api/compliance/requirements', { params: { category } });
export const getComplianceRequirementDetails = (id) => api.get(`/api/compliance/requirements/${id}`);
export const getContractVehicles = () => api.get('/api/compliance/vehicles');
export const getContractVehicleDetails = (id) => api.get(`/api/compliance/vehicles/${id}`);
export const getAgencies = () => api.get('/api/compliance/agencies');
export const getCompanyCompliance = () => api.get('/api/compliance/company');
export const updateCompanyProfile = (data) => api.post('/api/compliance/company', data);
export const addCompanyNAICS = (naicsId, isPrimary) => api.post('/api/compliance/company/naics', { naics_id: naicsId, is_primary: isPrimary });
export const removeCompanyNAICS = (naicsId) => api.delete(`/api/compliance/company/naics/${naicsId}`);
export const updateCompanyComplianceStatus = (complianceId, data) => api.put(`/api/compliance/company/compliance/${complianceId}`, data);
export const runComplianceCheck = () => api.get('/api/compliance/company/check');
export const getRecommendations = () => api.get('/api/compliance/company/recommendations');
export const runProposalComplianceCheck = (proposalId) => api.post(`/api/compliance/proposal/${proposalId}/check`);
export const getProposalComplianceCheck = (proposalId) => api.get(`/api/compliance/proposal/${proposalId}/check`);

// N8N Automation
export const getN8NWorkflows = () => api.get('/api/n8n/workflows');
export const getN8NRuns = (limit = 20) => api.get('/api/n8n/runs', { params: { limit } });
export const getN8NRunDetails = (runId) => api.get(`/api/n8n/runs/${runId}`);
export const triggerN8NWorkflow = (data) => api.post('/api/n8n/trigger', data);
export const deleteN8NRun = (runId) => api.delete(`/api/n8n/runs/${runId}`);
export const getN8NSettings = () => api.get('/api/n8n/settings');
export const updateN8NSettings = (data) => api.put('/api/n8n/settings', data);
export const exportN8NWorkflow = (type) => api.get(`/api/n8n/workflows/${type}/export`);
export const n8nWebhookCallback = (data) => api.post('/api/n8n/webhook', data);

// Proposal Scoring
export const scoreProposal = (proposalId) => api.post(`/api/proposals/${proposalId}/score`);
export const getProposalFeedback = (proposalId) => api.get(`/api/proposals/${proposalId}/feedback`);

// Team Collaboration
export const addComment = (proposalId, data) => api.post(`/api/proposals/${proposalId}/comments`, data);
export const getComments = (proposalId, sectionKey) => api.get(`/api/proposals/${proposalId}/comments`, { params: { section_key: sectionKey } });
export const getVersions = (proposalId) => api.get(`/api/proposals/${proposalId}/versions`);
export const saveVersion = (proposalId, data) => api.post(`/api/proposals/${proposalId}/versions`, data);

// Advanced Compliance Auto-Check
export const autoCheckCompliance = (proposalId, data) => api.post(`/api/compliance/auto-check/${proposalId}`, data);

// Advanced Analytics
export const getWinRateAnalytics = () => api.get('/api/analytics/win-rate');
export const getPipelineValue = () => api.get('/api/analytics/pipeline-value');
export const getResponseTime = () => api.get('/api/analytics/response-time');
export const getTeamPerformance = () => api.get('/api/analytics/team-performance');

// Notifications
export const getNotifications = (unreadOnly = false) => api.get('/api/notifications', { params: { unread_only: unreadOnly } });
export const markNotificationRead = (id) => api.put(`/api/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/api/notifications/read-all');

export default api;

"""
API Documentation endpoint for GovProposal AI.

GET /api/documentation — Returns structured JSON of all API endpoints,
organized by category, with method, path, description, and auth requirements.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Documentation"])


@router.get("/api/documentation")
async def get_api_documentation():
    """
    Returns a structured JSON catalog of all available API endpoints.
    Useful for third-party integrations and developer reference.
    """
    return {
        "service": "GovProposal AI",
        "version": "2.0.0",
        "base_url": "/api",
        "interactive_docs": "/docs",
        "categories": [
            {
                "name": "Health & Status",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/api/health",
                        "description": "Basic health check — returns 200 if running",
                        "auth": False,
                    },
                    {
                        "method": "GET",
                        "path": "/api/health/detailed",
                        "description": "Detailed health check with DB, AI, and cache status",
                        "auth": False,
                    },
                    {
                        "method": "GET",
                        "path": "/api/documentation",
                        "description": "This endpoint — structured API documentation",
                        "auth": False,
                    },
                ],
            },
            {
                "name": "Authentication",
                "endpoints": [
                    {
                        "method": "POST",
                        "path": "/api/auth/register",
                        "description": "Register a new user account",
                        "auth": False,
                    },
                    {
                        "method": "POST",
                        "path": "/api/auth/login",
                        "description": "Login and receive JWT access token",
                        "auth": False,
                    },
                    {
                        "method": "GET",
                        "path": "/api/auth/me",
                        "description": "Get current authenticated user profile",
                        "auth": True,
                    },
                    {
                        "method": "PUT",
                        "path": "/api/auth/profile",
                        "description": "Update user profile",
                        "auth": True,
                    },
                    {
                        "method": "POST",
                        "path": "/api/auth/forgot-password",
                        "description": "Request a password reset email",
                        "auth": False,
                    },
                    {
                        "method": "POST",
                        "path": "/api/auth/reset-password",
                        "description": "Reset password with a valid token",
                        "auth": False,
                    },
                ],
            },
            {
                "name": "Opportunity Search",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/api/opportunities",
                        "description": "Search federal contract opportunities (SAM.gov, USASpending)",
                        "auth": False,
                        "params": ["keyword", "naics", "limit", "source"],
                    },
                    {
                        "method": "POST",
                        "path": "/api/opportunities/review",
                        "description": "AI-powered opportunity analysis and go/no-go recommendation",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Proposal Management",
                "endpoints": [
                    {
                        "method": "POST",
                        "path": "/api/generate-proposal",
                        "description": "Generate a full proposal using AI (Gemini)",
                        "auth": True,
                    },
                    {
                        "method": "POST",
                        "path": "/api/proposals/generate-section",
                        "description": "Generate AI content for a single proposal section",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/proposals",
                        "description": "List all proposals for the current user",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/proposals/{proposal_id}",
                        "description": "Get a specific proposal by ID",
                        "auth": True,
                    },
                    {
                        "method": "DELETE",
                        "path": "/api/proposals/{proposal_id}",
                        "description": "Delete a proposal",
                        "auth": True,
                    },
                    {
                        "method": "POST",
                        "path": "/api/proposals/{proposal_id}/share",
                        "description": "Create a shareable link for a proposal",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/proposals/{proposal_id}/shares",
                        "description": "List active share links for a proposal",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/shared/{share_token}",
                        "description": "View a shared proposal (public, no auth)",
                        "auth": False,
                    },
                ],
            },
            {
                "name": "Proposal Scoring & Feedback",
                "endpoints": [
                    {
                        "method": "POST",
                        "path": "/api/proposals/{id}/score",
                        "description": "AI-score a proposal (0-100) on compliance, completeness, clarity",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/proposals/{id}/feedback",
                        "description": "Get detailed AI feedback for a scored proposal",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Team Collaboration",
                "endpoints": [
                    {
                        "method": "POST",
                        "path": "/api/proposals/{id}/comments",
                        "description": "Add a comment to a proposal",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/proposals/{id}/comments",
                        "description": "Get all comments on a proposal",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/proposals/{id}/versions",
                        "description": "Get version history for a proposal",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Compliance",
                "endpoints": [
                    {
                        "method": "POST",
                        "path": "/api/compliance/analyze",
                        "description": "AI-analyze RFP text to extract structured requirements",
                        "auth": True,
                    },
                    {
                        "method": "POST",
                        "path": "/api/compliance/auto-check/{proposal_id}",
                        "description": "Auto-check proposal against RFP compliance requirements",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/compliance/naics",
                        "description": "List NAICS codes",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/compliance/requirements",
                        "description": "List compliance requirements by category",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/compliance/vehicles",
                        "description": "List contract vehicles and GWACs",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/compliance/company",
                        "description": "Get company compliance status",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/compliance/company/recommendations",
                        "description": "Get AI-powered compliance recommendations",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Market Research",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/api/market-research/labor-rates",
                        "description": "Search labor rate intelligence by category",
                        "auth": True,
                        "params": ["labor_category", "naics_code", "location"],
                    },
                    {
                        "method": "GET",
                        "path": "/api/market-research/competitor-awards",
                        "description": "Search historical contract awards for competitor analysis",
                        "auth": True,
                        "params": ["naics_code", "agency", "keyword"],
                    },
                    {
                        "method": "POST",
                        "path": "/api/market-research/pricing-recommendation",
                        "description": "AI-powered pricing strategy recommendations",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Advanced Analytics",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/api/analytics/win-rate",
                        "description": "Win/loss rate analytics for proposals",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/analytics/pipeline-value",
                        "description": "Pipeline value and forecast analytics",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/analytics/response-time",
                        "description": "Proposal response time metrics",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/analytics/team-performance",
                        "description": "Team collaboration and performance metrics",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Vendor Profile",
                "endpoints": [
                    {
                        "method": "POST",
                        "path": "/api/vendor-profile",
                        "description": "Save or update vendor profile",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/vendor-profiles",
                        "description": "List all vendor profiles for current user",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Export",
                "endpoints": [
                    {
                        "method": "POST",
                        "path": "/api/export/docx",
                        "description": "Export proposal as Word document (.docx)",
                        "auth": True,
                    },
                    {
                        "method": "POST",
                        "path": "/api/export/pdf",
                        "description": "Export proposal as PDF document",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "RFP Deconstructor",
                "endpoints": [
                    {
                        "method": "POST",
                        "path": "/api/rfp/deconstruct",
                        "description": "Upload a PDF solicitation and AI-extract requirements",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Contracts",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/api/contracts",
                        "description": "List all post-award contracts",
                        "auth": True,
                    },
                    {
                        "method": "POST",
                        "path": "/api/contracts",
                        "description": "Create a new contract",
                        "auth": True,
                    },
                    {
                        "method": "PUT",
                        "path": "/api/contracts/{contract_id}",
                        "description": "Update a contract",
                        "auth": True,
                    },
                    {
                        "method": "DELETE",
                        "path": "/api/contracts/{contract_id}",
                        "description": "Delete a contract",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Templates",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/api/templates",
                        "description": "List proposal templates",
                        "auth": True,
                        "params": ["category"],
                    },
                    {
                        "method": "GET",
                        "path": "/api/templates/{template_id}",
                        "description": "Get a specific template with full content",
                        "auth": True,
                    },
                    {
                        "method": "POST",
                        "path": "/api/templates/{template_id}/use",
                        "description": "Mark a template as used",
                        "auth": True,
                    },
                    {
                        "method": "POST",
                        "path": "/api/templates/{template_id}/favorite",
                        "description": "Toggle template favorite status",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "N8N Workflow Automation",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/api/n8n/workflows",
                        "description": "List available workflow automations",
                        "auth": True,
                    },
                    {
                        "method": "POST",
                        "path": "/api/n8n/trigger",
                        "description": "Trigger a workflow execution",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/n8n/runs",
                        "description": "List workflow execution history",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Notifications",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/api/notifications",
                        "description": "Get user notifications",
                        "auth": True,
                    },
                    {
                        "method": "PUT",
                        "path": "/api/notifications/{id}/read",
                        "description": "Mark a notification as read",
                        "auth": True,
                    },
                ],
            },
            {
                "name": "Payments & Billing",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/api/plans",
                        "description": "Get available subscription plans",
                        "auth": False,
                    },
                    {
                        "method": "POST",
                        "path": "/api/payments/stripe/checkout",
                        "description": "Create a Stripe checkout session",
                        "auth": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/payments/config",
                        "description": "Get payment gateway configuration",
                        "auth": False,
                    },
                ],
            },
            {
                "name": "Admin",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/api/admin/users",
                        "description": "List all users (admin only)",
                        "auth": True,
                        "admin": True,
                    },
                    {
                        "method": "GET",
                        "path": "/api/admin/stats",
                        "description": "Platform-wide statistics (admin only)",
                        "auth": True,
                        "admin": True,
                    },
                    {
                        "method": "PUT",
                        "path": "/api/admin/users/{user_id}",
                        "description": "Update user admin status or subscription (admin only)",
                        "auth": True,
                        "admin": True,
                    },
                ],
            },
        ],
    }

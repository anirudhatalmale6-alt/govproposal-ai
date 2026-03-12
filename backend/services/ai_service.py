"""
Google Gemini AI integration service for generating government proposal content.
"""

import os
import logging
from typing import Dict, List, Optional

import google.generativeai as genai

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an expert federal government proposal writer. "
    "Write professional, compelling proposal content for government contracts. "
    "Your writing should be clear, specific, and compliant with federal acquisition "
    "regulations (FAR). Use formal business language appropriate for government "
    "submissions. Include concrete details and actionable commitments where possible."
)

# Detailed prompt templates for each proposal section
SECTION_PROMPTS: Dict[str, str] = {
    "cover_page": (
        "Generate a professional cover page text for a government contract proposal.\n\n"
        "Include the following elements:\n"
        "- Proposal title (based on the opportunity)\n"
        "- Solicitation/Notice number (if available)\n"
        "- Contracting agency name\n"
        "- Submitted by: vendor company name and full contact information\n"
        "- CAGE Code and DUNS/UEI number\n"
        "- Date of submission\n"
        "- A brief one-line proposal identifier\n\n"
        "Format it cleanly with clear labels for each field. "
        "Do not use markdown headers - just use plain text with clear formatting."
    ),
    "executive_summary": (
        "Write a compelling executive summary for a government contract proposal.\n\n"
        "The executive summary should:\n"
        "1. Open with a strong statement of understanding of the government's need\n"
        "2. Clearly articulate the vendor's proposed solution\n"
        "3. Highlight 3-4 key differentiators and strengths\n"
        "4. Reference relevant past performance briefly\n"
        "5. Emphasize value proposition and cost-effectiveness\n"
        "6. Close with a confident commitment to delivery\n\n"
        "Keep it to approximately 400-600 words. Use professional, persuasive tone "
        "appropriate for federal procurement officers."
    ),
    "vendor_profile": (
        "Write a comprehensive vendor/company profile section for a government proposal.\n\n"
        "Include:\n"
        "1. Company overview - founding, mission, headquarters location\n"
        "2. Organizational structure and size\n"
        "3. Core business areas and government contracting experience\n"
        "4. Relevant certifications, clearances, and registrations\n"
        "5. Key personnel qualifications (summarized)\n"
        "6. Financial stability and corporate resources\n"
        "7. Quality management and compliance systems\n\n"
        "Present the company as a reliable, capable government contractor "
        "with proven ability to deliver."
    ),
    "socioeconomic_status": (
        "Write a socioeconomic status section for a government contract proposal.\n\n"
        "Address the following:\n"
        "1. Applicable socioeconomic designations (Small Business, 8(a), HUBZone, "
        "SDVOSB, WOSB, etc.)\n"
        "2. Certification details and dates\n"
        "3. SBA size standard compliance for relevant NAICS codes\n"
        "4. Commitment to small business subcontracting goals (if applicable)\n"
        "5. Community impact and economic development contributions\n"
        "6. Diversity and inclusion initiatives\n\n"
        "Demonstrate how the vendor's socioeconomic status adds value to the "
        "government's procurement goals and small business utilization objectives."
    ),
    "capability_statement": (
        "Write a detailed capability statement section for a government proposal.\n\n"
        "Structure the capability statement with:\n"
        "1. Core Competencies - specific technical and functional capabilities "
        "directly relevant to this opportunity\n"
        "2. Differentiators - what sets this vendor apart from competitors\n"
        "3. Tools, Technologies, and Methodologies employed\n"
        "4. Industry certifications and standards compliance "
        "(ISO, CMMI, FedRAMP, etc. as applicable)\n"
        "5. Scalability and surge capacity\n"
        "6. Geographic coverage and delivery capabilities\n\n"
        "Tie every capability directly back to the opportunity requirements. "
        "Be specific with metrics and examples where possible."
    ),
    "past_performance": (
        "Write a past performance section for a government contract proposal.\n\n"
        "Structure this section with:\n"
        "1. Overview statement of past performance track record\n"
        "2. Three detailed past performance references (create plausible examples "
        "based on the vendor's capabilities), each including:\n"
        "   - Contract name and number\n"
        "   - Contracting agency\n"
        "   - Contract value and period of performance\n"
        "   - Scope of work summary\n"
        "   - Key achievements and outcomes\n"
        "   - Relevance to current opportunity\n"
        "3. Customer satisfaction metrics and CPARS ratings summary\n"
        "4. On-time/on-budget delivery track record\n\n"
        "Emphasize contracts that are similar in size, scope, and complexity "
        "to the current opportunity."
    ),
    "technical_approach": (
        "Write a comprehensive technical approach section for a government proposal.\n\n"
        "Include:\n"
        "1. Understanding of Requirements - demonstrate thorough comprehension "
        "of the government's needs\n"
        "2. Proposed Solution - detailed description of the technical approach, "
        "methodology, and tools\n"
        "3. Work Breakdown Structure - high-level task decomposition\n"
        "4. Implementation Timeline - phased approach with milestones\n"
        "5. Risk Management - identify key risks and mitigation strategies\n"
        "6. Quality Assurance - QA/QC processes and standards\n"
        "7. Innovation and Value-Added Features\n"
        "8. Transition Plan - approach for startup/transition and knowledge transfer\n\n"
        "Be specific and demonstrate deep technical understanding. "
        "Show a clear path from award to successful delivery."
    ),
    "staffing_plan": (
        "Write a staffing plan section for a government contract proposal.\n\n"
        "Include:\n"
        "1. Organizational Chart Description - key roles and reporting structure\n"
        "2. Key Personnel - describe 3-5 key positions with:\n"
        "   - Role title and responsibilities\n"
        "   - Required qualifications and clearances\n"
        "   - Relevant experience summary\n"
        "3. Staffing Approach - recruitment, retention, and succession planning\n"
        "4. Training and Professional Development\n"
        "5. Clearance Management - approach to security clearances if applicable\n"
        "6. Labor Category Matrix - summary of labor categories and FTEs\n"
        "7. Subcontractor Management (if applicable)\n\n"
        "Demonstrate that the vendor has qualified, available personnel "
        "to perform the work from day one."
    ),
    "compliance_checklist": (
        "Write a compliance and regulatory checklist section for a government proposal.\n\n"
        "Include a comprehensive checklist addressing:\n"
        "1. FAR/DFARS Compliance - key clauses acknowledged\n"
        "2. Section 508 Accessibility Compliance (if applicable)\n"
        "3. Cybersecurity Requirements (NIST, FISMA, FedRAMP as applicable)\n"
        "4. Data Protection and Privacy (PII handling procedures)\n"
        "5. Equal Employment Opportunity compliance\n"
        "6. Insurance and Bonding requirements\n"
        "7. Conflict of Interest certifications\n"
        "8. SAM.gov registration status\n"
        "9. Organizational Conflict of Interest (OCI) statement\n"
        "10. Representations and Certifications\n\n"
        "Format as a structured checklist with brief compliance statements "
        "for each item. Demonstrate thorough regulatory awareness."
    ),
}

# Human-readable section titles
SECTION_TITLES: Dict[str, str] = {
    "cover_page": "Cover Page",
    "executive_summary": "Executive Summary",
    "vendor_profile": "Company Profile",
    "socioeconomic_status": "Socioeconomic Status",
    "capability_statement": "Capability Statement",
    "past_performance": "Past Performance",
    "technical_approach": "Technical Approach",
    "staffing_plan": "Staffing Plan",
    "compliance_checklist": "Compliance Checklist",
}


class AIService:
    """Service for generating proposal content using Google Gemini API."""

    def __init__(self) -> None:
        api_key: str = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            logger.warning(
                "GEMINI_API_KEY not set. AI generation will fail. "
                "Set GEMINI_API_KEY in your .env file."
            )
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
        )

    def generate_section(self, prompt: str) -> str:
        """
        Generate content for a single proposal section using Gemini.

        Args:
            prompt: The full prompt to send to the AI model.

        Returns:
            Generated text content for the section.
        """
        try:
            response = self.model.generate_content(prompt)
            if response and response.text:
                return response.text.strip()
            logger.warning("Gemini returned empty response for prompt")
            return "[Content generation returned empty response. Please retry.]"
        except Exception as exc:
            logger.error("Gemini API error: %s", exc)
            raise RuntimeError(f"AI generation failed: {exc}")

    def generate_proposal(
        self,
        vendor: Dict,
        opportunity: Dict,
        sections: Optional[List[str]] = None,
    ) -> Dict[str, Dict[str, str]]:
        """
        Generate a complete government proposal with multiple sections.

        Args:
            vendor: Vendor profile data dict.
            opportunity: Opportunity details dict.
            sections: List of section keys to generate. If None, generates all sections.

        Returns:
            Dict mapping section keys to dicts with 'title' and 'content'.
        """
        if sections is None:
            sections = list(SECTION_PROMPTS.keys())

        # Build context block that will be prepended to every section prompt
        vendor_context = self._build_vendor_context(vendor)
        opportunity_context = self._build_opportunity_context(opportunity)

        results: Dict[str, Dict[str, str]] = {}

        for section_key in sections:
            if section_key not in SECTION_PROMPTS:
                logger.warning("Unknown section requested: %s (skipping)", section_key)
                continue

            section_prompt = self._build_section_prompt(
                section_key=section_key,
                vendor_context=vendor_context,
                opportunity_context=opportunity_context,
            )

            try:
                content = self.generate_section(section_prompt)
                results[section_key] = {
                    "title": SECTION_TITLES.get(section_key, section_key.replace("_", " ").title()),
                    "content": content,
                }
                logger.info("Generated section: %s", section_key)
            except RuntimeError as exc:
                logger.error("Failed to generate section %s: %s", section_key, exc)
                results[section_key] = {
                    "title": SECTION_TITLES.get(section_key, section_key.replace("_", " ").title()),
                    "content": f"[Error generating this section: {exc}]",
                }

        return results

    def _build_section_prompt(
        self,
        section_key: str,
        vendor_context: str,
        opportunity_context: str,
    ) -> str:
        """Build the complete prompt for a given section."""
        base_prompt = SECTION_PROMPTS[section_key]

        return (
            f"{base_prompt}\n\n"
            f"--- VENDOR INFORMATION ---\n{vendor_context}\n\n"
            f"--- OPPORTUNITY INFORMATION ---\n{opportunity_context}\n\n"
            f"Write the {SECTION_TITLES.get(section_key, section_key)} section now. "
            f"Be specific, professional, and directly relevant to this opportunity. "
            f"Do not use placeholder brackets like [insert X here] - generate complete, "
            f"realistic content based on the provided information."
        )

    @staticmethod
    def _build_vendor_context(vendor: Dict) -> str:
        """Format vendor data into a readable context string."""
        lines = []
        lines.append(f"Company Name: {vendor.get('company_name', 'N/A')}")

        if vendor.get("cage_code"):
            lines.append(f"CAGE Code: {vendor['cage_code']}")
        if vendor.get("duns_number"):
            lines.append(f"DUNS/UEI Number: {vendor['duns_number']}")
        if vendor.get("naics_codes"):
            codes = vendor["naics_codes"]
            if isinstance(codes, list):
                codes = ", ".join(codes)
            lines.append(f"NAICS Codes: {codes}")

        lines.append(f"Capabilities: {vendor.get('capabilities', 'Not specified')}")
        lines.append(f"Past Performance: {vendor.get('past_performance', 'Not specified')}")
        lines.append(
            f"Socioeconomic Status: {vendor.get('socioeconomic_status', 'Not specified')}"
        )

        contact = vendor.get("contact_info", {})
        if contact:
            lines.append(f"Contact Name: {contact.get('name', 'N/A')}")
            lines.append(f"Contact Email: {contact.get('email', 'N/A')}")
            lines.append(f"Contact Phone: {contact.get('phone', 'N/A')}")
            lines.append(f"Address: {contact.get('address', 'N/A')}")

        return "\n".join(lines)

    @staticmethod
    def _build_opportunity_context(opportunity: Dict) -> str:
        """Format opportunity data into a readable context string."""
        lines = []
        lines.append(f"Opportunity Title: {opportunity.get('title', 'N/A')}")
        lines.append(f"Agency: {opportunity.get('agency', 'N/A')}")
        lines.append(f"Description: {opportunity.get('description', 'Not provided')}")
        lines.append(f"Requirements: {opportunity.get('requirements', 'Not provided')}")

        if opportunity.get("notice_id"):
            lines.append(f"Notice/Solicitation ID: {opportunity['notice_id']}")
        if opportunity.get("due_date"):
            lines.append(f"Response Due Date: {opportunity['due_date']}")
        if opportunity.get("type"):
            lines.append(f"Notice Type: {opportunity['type']}")

        return "\n".join(lines)

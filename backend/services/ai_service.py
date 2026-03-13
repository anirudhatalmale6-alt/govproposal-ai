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
        self.api_key: str = os.getenv("GEMINI_API_KEY", "")
        self.demo_mode = not bool(self.api_key)
        if self.demo_mode:
            logger.warning(
                "GEMINI_API_KEY not set. Running in DEMO mode with template-based content. "
                "Set GEMINI_API_KEY in .env for real AI generation."
            )
        else:
            genai.configure(api_key=self.api_key)
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

    def _generate_demo_section(self, section_key: str, vendor: Dict, opportunity: Dict) -> str:
        """Generate realistic demo content for a section without calling the AI API."""
        company = vendor.get("company_name", "Acme Federal Solutions")
        opp_title = opportunity.get("title", "Government Services Contract")
        agency = opportunity.get("agency", "Federal Agency")
        description = opportunity.get("description", "government services and support")
        naics = vendor.get("naics_codes", "541512")
        if isinstance(naics, list):
            naics = ", ".join(naics) if naics else "541512"
        capabilities = vendor.get("capabilities", "IT modernization, cloud services, cybersecurity")
        cage = vendor.get("cage_code", "5ABC1")
        duns = vendor.get("duns_number", "123456789")
        socio = vendor.get("socioeconomic_status", "Small Business")

        templates = {
            "cover_page": (
                f"PROPOSAL\n\n"
                f"Title: {opp_title}\n"
                f"Submitted to: {agency}\n"
                f"Submitted by: {company}\n"
                f"CAGE Code: {cage}\n"
                f"DUNS/UEI: {duns}\n"
                f"NAICS: {naics}\n"
                f"Date: March 2026\n\n"
                f"Point of Contact:\n"
                f"{company}\n"
                f"Federal Contracting Division\n\n"
                f"This proposal is submitted in response to the above-referenced solicitation "
                f"and represents {company}'s comprehensive approach to meeting all requirements."
            ),
            "executive_summary": (
                f"Executive Summary\n\n"
                f"{company} is pleased to submit this proposal in response to {agency}'s requirement "
                f"for {opp_title}. Our team brings extensive experience in {capabilities}, "
                f"positioning us as an ideal partner for this critical initiative.\n\n"
                f"Our Proposed Solution:\n"
                f"{company} proposes a comprehensive, results-driven approach that leverages our "
                f"proven methodologies and experienced workforce. Our solution addresses every aspect "
                f"of the stated requirements while delivering measurable value through:\n\n"
                f"1. Deep Domain Expertise — Over a decade of experience delivering similar solutions "
                f"to federal agencies, with a 98% on-time delivery rate.\n\n"
                f"2. Innovative Technology — We employ cutting-edge tools and frameworks that enhance "
                f"efficiency, reduce costs, and accelerate delivery timelines.\n\n"
                f"3. Proven Methodology — Our ISO-certified processes ensure quality, compliance, "
                f"and continuous improvement throughout the period of performance.\n\n"
                f"4. Dedicated Team — We commit top-tier professionals with relevant certifications "
                f"and clearances, ensuring seamless execution from day one.\n\n"
                f"{company} is committed to delivering exceptional results that exceed expectations "
                f"while maintaining full compliance with all applicable regulations and standards."
            ),
            "vendor_profile": (
                f"Company Profile\n\n"
                f"{company} is a dynamic, mission-focused organization specializing in {capabilities}. "
                f"Founded with the vision of delivering exceptional services to government agencies, "
                f"we have grown into a trusted partner for federal, state, and local clients.\n\n"
                f"Organization Overview:\n"
                f"- CAGE Code: {cage}\n"
                f"- DUNS/UEI: {duns}\n"
                f"- NAICS Codes: {naics}\n"
                f"- Socioeconomic Status: {socio}\n"
                f"- Registered and active in SAM.gov\n\n"
                f"Core Business Areas:\n"
                f"Our core competencies include {capabilities}. We maintain a robust quality "
                f"management system and invest heavily in professional development to ensure "
                f"our team stays at the forefront of industry best practices.\n\n"
                f"Corporate Resources:\n"
                f"{company} maintains strong financial health, demonstrated by consistent year-over-year "
                f"revenue growth and a healthy balance sheet. Our corporate infrastructure supports "
                f"rapid scaling to meet contract requirements."
            ),
            "socioeconomic_status": (
                f"Socioeconomic Status\n\n"
                f"{company} is classified as a {socio} under SBA size standards for NAICS {naics}. "
                f"We are committed to supporting the government's small business utilization goals "
                f"and economic development objectives.\n\n"
                f"Certifications and Designations:\n"
                f"- {socio} designation confirmed and active\n"
                f"- SBA size standard compliant for applicable NAICS codes\n"
                f"- Active SAM.gov registration with current representations and certifications\n\n"
                f"Small Business Subcontracting:\n"
                f"{company} maintains a robust small business subcontracting plan that maximizes "
                f"opportunities for small, disadvantaged, women-owned, HUBZone, and "
                f"service-disabled veteran-owned small businesses."
            ),
            "capability_statement": (
                f"Capability Statement\n\n"
                f"Core Competencies:\n"
                f"{company} delivers excellence across our key capability areas: {capabilities}. "
                f"Each competency is backed by certified professionals, proven processes, and "
                f"successful past performance.\n\n"
                f"Differentiators:\n"
                f"1. Agile Delivery — We employ agile and DevSecOps methodologies that accelerate "
                f"delivery while maintaining quality and security.\n"
                f"2. Cleared Workforce — Our team maintains active security clearances, enabling "
                f"rapid onboarding and seamless integration.\n"
                f"3. Innovation Focus — We invest 10% of revenue in R&D to stay ahead of "
                f"emerging technologies and threats.\n\n"
                f"Tools & Technologies:\n"
                f"Our technology stack includes industry-leading platforms and tools, "
                f"all configured to meet federal security and compliance requirements. "
                f"We maintain FedRAMP-ready infrastructure and NIST-compliant processes."
            ),
            "past_performance": (
                f"Past Performance\n\n"
                f"{company} has a proven track record of successful contract execution. "
                f"Below are representative past performance references demonstrating our "
                f"capability to deliver services similar to {opp_title}.\n\n"
                f"Reference 1: Enterprise IT Modernization\n"
                f"- Agency: Department of Defense\n"
                f"- Contract Value: $4.2M\n"
                f"- Period: 2023-2025\n"
                f"- Scope: End-to-end IT modernization including cloud migration, "
                f"application development, and cybersecurity implementation\n"
                f"- Result: Delivered on-time and under budget; CPARS rating: Exceptional\n\n"
                f"Reference 2: Cybersecurity Operations Support\n"
                f"- Agency: Department of Homeland Security\n"
                f"- Contract Value: $2.8M\n"
                f"- Period: 2022-2024\n"
                f"- Scope: 24/7 SOC operations, threat intelligence, incident response\n"
                f"- Result: 99.99% uptime; zero critical security breaches; CPARS: Very Good\n\n"
                f"Reference 3: Cloud Infrastructure Services\n"
                f"- Agency: General Services Administration\n"
                f"- Contract Value: $1.5M\n"
                f"- Period: 2024-2025\n"
                f"- Scope: AWS GovCloud migration and managed services\n"
                f"- Result: 40% cost reduction achieved; CPARS: Exceptional"
            ),
            "technical_approach": (
                f"Technical Approach\n\n"
                f"1. Understanding of Requirements\n"
                f"{company} thoroughly understands {agency}'s requirements for {opp_title}. "
                f"Our analysis of the solicitation reveals key focus areas that align directly "
                f"with our proven capabilities in {capabilities}.\n\n"
                f"2. Proposed Solution\n"
                f"We propose a phased approach that ensures rapid value delivery while "
                f"minimizing risk:\n\n"
                f"Phase 1 - Discovery & Planning (Weeks 1-4): Comprehensive requirements analysis, "
                f"stakeholder engagement, and detailed project planning.\n\n"
                f"Phase 2 - Implementation (Weeks 5-16): Core solution development and deployment "
                f"using agile sprints with bi-weekly deliverables.\n\n"
                f"Phase 3 - Optimization (Weeks 17-20): Performance tuning, user training, "
                f"and knowledge transfer.\n\n"
                f"3. Risk Management\n"
                f"Our proactive risk management framework identifies, assesses, and mitigates "
                f"risks throughout the project lifecycle. Key risk areas and mitigations are "
                f"documented in our Risk Register and reviewed weekly.\n\n"
                f"4. Quality Assurance\n"
                f"All deliverables undergo rigorous QA/QC processes aligned with ISO 9001 "
                f"standards, ensuring consistent quality and compliance."
            ),
            "staffing_plan": (
                f"Staffing Plan\n\n"
                f"1. Key Personnel\n"
                f"{company} commits the following key personnel to this engagement:\n\n"
                f"Program Manager — 15+ years of federal program management experience, "
                f"PMP certified, with proven expertise managing contracts of similar size and scope.\n\n"
                f"Technical Lead — 12+ years in {capabilities}, with relevant certifications "
                f"and hands-on experience delivering solutions to federal agencies.\n\n"
                f"Subject Matter Expert — Deep domain expertise in the functional area, "
                f"with a track record of successful implementations.\n\n"
                f"Quality Assurance Lead — Certified CMMI and ISO auditor, responsible for "
                f"ensuring all deliverables meet the highest quality standards.\n\n"
                f"2. Staffing Approach\n"
                f"All staff assigned to this contract will possess the required security clearances "
                f"and certifications. Our talent acquisition team maintains a pipeline of pre-vetted "
                f"candidates to support surge requirements.\n\n"
                f"3. Training & Development\n"
                f"We invest in continuous professional development, with mandatory 40+ hours of "
                f"annual training per employee to keep skills current."
            ),
            "compliance_checklist": (
                f"Compliance Checklist\n\n"
                f"{company} confirms compliance with all applicable requirements:\n\n"
                f"[x] FAR/DFARS Compliance — All applicable clauses acknowledged and incorporated\n"
                f"[x] Section 508 Accessibility — Full compliance with accessibility standards\n"
                f"[x] Cybersecurity (NIST 800-171/FISMA) — Compliant security controls implemented\n"
                f"[x] Data Protection & Privacy — PII handling procedures in place per NIST guidelines\n"
                f"[x] Equal Employment Opportunity — Full EEO compliance certified\n"
                f"[x] Insurance & Bonding — Adequate coverage maintained\n"
                f"[x] Conflict of Interest — No organizational conflicts of interest identified\n"
                f"[x] SAM.gov Registration — Active and current\n"
                f"[x] Representations & Certifications — All current and accurate\n"
                f"[x] Quality Management System — ISO 9001 certified processes\n\n"
                f"{company} maintains a dedicated compliance team that monitors regulatory changes "
                f"and ensures ongoing adherence to all federal acquisition requirements."
            ),
        }

        return templates.get(section_key, f"[Demo content for {section_key}]")

    def generate_proposal(
        self,
        vendor: Dict,
        opportunity: Dict,
        sections: Optional[List[str]] = None,
    ) -> Dict[str, Dict[str, str]]:
        """
        Generate a complete government proposal with multiple sections.

        Uses Gemini AI when API key is available, otherwise generates
        realistic demo content using templates.

        Args:
            vendor: Vendor profile data dict.
            opportunity: Opportunity details dict.
            sections: List of section keys to generate. If None, generates all sections.

        Returns:
            Dict mapping section keys to dicts with 'title' and 'content'.
        """
        if sections is None:
            sections = list(SECTION_PROMPTS.keys())

        results: Dict[str, Dict[str, str]] = {}

        if self.demo_mode:
            logger.info("Generating proposal in DEMO mode (no API key)")
            for section_key in sections:
                if section_key not in SECTION_PROMPTS:
                    logger.warning("Unknown section requested: %s (skipping)", section_key)
                    continue
                content = self._generate_demo_section(section_key, vendor, opportunity)
                results[section_key] = {
                    "title": SECTION_TITLES.get(section_key, section_key.replace("_", " ").title()),
                    "content": content,
                }
                logger.info("Generated demo section: %s", section_key)
            return results

        # Real AI generation with Gemini
        vendor_context = self._build_vendor_context(vendor)
        opportunity_context = self._build_opportunity_context(opportunity)

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

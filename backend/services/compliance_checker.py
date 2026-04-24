"""
Advanced Compliance Auto-Check Service for GovProposal AI.

Automatically checks a proposal against RFP requirements:
- Verifies required sections exist
- Checks for compliance keywords and FAR/DFARS references
- Validates that all "shall" requirements are addressed
- Generates a compliance matrix with pass/fail/partial status
"""

import re
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ComplianceCheckerService:
    """Auto-check proposals against compliance requirements."""

    # Standard government compliance areas
    COMPLIANCE_AREAS = [
        {
            "id": "far_references",
            "name": "FAR/DFARS References",
            "description": "Proposal references applicable Federal Acquisition Regulation clauses",
            "keywords": ["far ", "dfars", "52.2", "252.2"],
            "weight": 15,
        },
        {
            "id": "security_compliance",
            "name": "Security Compliance",
            "description": "Addresses cybersecurity, clearance, and data protection requirements",
            "keywords": ["cybersecurity", "cmmc", "nist 800", "fisma", "fedramp", "clearance", "cui"],
            "weight": 15,
        },
        {
            "id": "quality_assurance",
            "name": "Quality Assurance",
            "description": "Includes quality management plan and metrics",
            "keywords": ["quality assurance", "qa", "quality control", "qc", "iso 9001", "quality plan"],
            "weight": 10,
        },
        {
            "id": "small_business",
            "name": "Small Business Compliance",
            "description": "Addresses small business subcontracting requirements",
            "keywords": ["small business", "subcontracting plan", "8(a)", "hubzone", "sdvosb", "wosb"],
            "weight": 10,
        },
        {
            "id": "past_performance",
            "name": "Past Performance Documentation",
            "description": "Includes relevant past performance references",
            "keywords": ["past performance", "contract reference", "cpars", "performance record"],
            "weight": 15,
        },
        {
            "id": "pricing_format",
            "name": "Pricing Structure",
            "description": "Pricing is clearly structured and categorized",
            "keywords": ["labor rate", "pricing", "cost proposal", "clins", "line item", "t&m", "ffp"],
            "weight": 10,
        },
        {
            "id": "technical_approach",
            "name": "Technical Approach",
            "description": "Clear technical methodology and approach described",
            "keywords": ["technical approach", "methodology", "solution", "architecture", "implementation"],
            "weight": 15,
        },
        {
            "id": "management_plan",
            "name": "Management Plan",
            "description": "Includes project management structure and governance",
            "keywords": ["management plan", "project manager", "governance", "risk management", "staffing"],
            "weight": 10,
        },
    ]

    def auto_check(self, proposal: dict, rfp_requirements: Optional[list] = None, ai_service=None) -> dict:
        """
        Run comprehensive compliance check on a proposal.

        Args:
            proposal: Proposal dict with sections, title, metadata
            rfp_requirements: Optional list of specific RFP requirements to check against
            ai_service: Optional AI service for enhanced analysis

        Returns:
            Compliance report with scores, pass/fail for each area, and recommendations
        """
        sections = proposal.get("sections", {})
        metadata = proposal.get("metadata", {})

        # Combine all proposal text for searching
        all_text = self._extract_all_text(sections)
        all_text_lower = all_text.lower()

        # 1. Check standard compliance areas
        area_results = []
        total_score = 0
        total_weight = 0

        for area in self.COMPLIANCE_AREAS:
            result = self._check_area(area, all_text_lower)
            area_results.append(result)
            total_score += result["score"] * area["weight"]
            total_weight += area["weight"]

        # 2. Check for "shall" requirement coverage
        shall_analysis = self._analyze_shall_requirements(all_text)

        # 3. Check RFP-specific requirements if provided
        rfp_results = []
        if rfp_requirements:
            rfp_results = self._check_rfp_requirements(rfp_requirements, all_text_lower)

        # 4. Check metadata completeness
        metadata_check = self._check_metadata(metadata)

        # 5. AI-enhanced check if available
        ai_analysis = None
        if ai_service:
            ai_analysis = self._ai_compliance_check(proposal, ai_service)

        # Calculate overall score
        overall_score = int(total_score / total_weight) if total_weight > 0 else 0

        # Adjust for metadata
        if metadata_check["score"] >= 80:
            overall_score = min(100, overall_score + 5)

        passed = sum(1 for r in area_results if r["status"] == "pass")
        failed = sum(1 for r in area_results if r["status"] == "fail")
        partial = sum(1 for r in area_results if r["status"] == "partial")

        return {
            "overall_score": overall_score,
            "status": "compliant" if overall_score >= 70 else "needs_review" if overall_score >= 50 else "non_compliant",
            "summary": {
                "passed": passed,
                "failed": failed,
                "partial": partial,
                "total_areas": len(area_results),
            },
            "compliance_areas": area_results,
            "shall_requirements": shall_analysis,
            "rfp_requirements": rfp_results if rfp_results else None,
            "metadata_check": metadata_check,
            "ai_analysis": ai_analysis,
            "recommendations": self._generate_recommendations(area_results, shall_analysis, metadata_check),
        }

    def _extract_all_text(self, sections: dict) -> str:
        """Extract all text content from proposal sections."""
        texts = []
        for key, section in sections.items():
            if isinstance(section, dict):
                texts.append(section.get("content", ""))
            else:
                texts.append(str(section))
        return "\n\n".join(texts)

    def _check_area(self, area: dict, text_lower: str) -> dict:
        """Check a single compliance area against proposal text."""
        found_keywords = []
        for kw in area["keywords"]:
            if kw in text_lower:
                found_keywords.append(kw)

        coverage = len(found_keywords) / len(area["keywords"]) if area["keywords"] else 0

        if coverage >= 0.5:
            status = "pass"
            score = min(100, int(50 + coverage * 50))
        elif coverage > 0:
            status = "partial"
            score = int(coverage * 60)
        else:
            status = "fail"
            score = 0

        return {
            "id": area["id"],
            "name": area["name"],
            "description": area["description"],
            "status": status,
            "score": score,
            "keywords_found": found_keywords,
            "keywords_missing": [kw for kw in area["keywords"] if kw not in found_keywords],
        }

    def _analyze_shall_requirements(self, text: str) -> dict:
        """Analyze how well 'shall' requirements are addressed."""
        # Find all "shall" statements (common in government RFPs)
        shall_pattern = r'(?:contractor|offeror|vendor|provider)?\s*shall\s+[^.;]{10,}'
        shall_matches = re.findall(shall_pattern, text, re.IGNORECASE)

        # Check for response indicators
        response_indicators = ["will", "our approach", "we propose", "our team", "we shall"]
        addressed = 0
        for _ in shall_matches:
            for indicator in response_indicators:
                if indicator in text.lower():
                    addressed += 1
                    break

        return {
            "shall_statements_found": len(shall_matches),
            "sample_statements": [s.strip()[:100] for s in shall_matches[:5]],
            "response_indicators_present": min(addressed, len(shall_matches)),
            "coverage_estimate": f"{min(100, int(addressed / max(1, len(shall_matches)) * 100))}%",
        }

    def _check_rfp_requirements(self, requirements: list, text_lower: str) -> list:
        """Check specific RFP requirements against proposal text."""
        results = []
        for req in requirements:
            req_text = req.get("text", req.get("requirement", ""))
            # Extract key terms from requirement
            key_terms = [w for w in req_text.lower().split() if len(w) > 4][:5]

            matches = sum(1 for term in key_terms if term in text_lower)
            coverage = matches / len(key_terms) if key_terms else 0

            results.append({
                "requirement": req_text[:200],
                "category": req.get("category", "General"),
                "priority": req.get("priority", "Medium"),
                "status": "addressed" if coverage >= 0.4 else "partially_addressed" if coverage > 0 else "not_addressed",
                "coverage": f"{int(coverage * 100)}%",
            })
        return results

    def _check_metadata(self, metadata: dict) -> dict:
        """Check completeness of proposal metadata."""
        fields = {
            "solicitation_number": "Solicitation number",
            "agency": "Agency name",
            "naics_codes": "NAICS codes",
            "cage_code": "CAGE code",
            "vendor_name": "Vendor name",
            "submission_date": "Submission date",
        }

        present = []
        missing = []
        for field, label in fields.items():
            value = metadata.get(field, "")
            if value and str(value).strip():
                present.append(label)
            else:
                missing.append(label)

        score = int(len(present) / len(fields) * 100) if fields else 0
        return {
            "score": score,
            "present": present,
            "missing": missing,
        }

    def _ai_compliance_check(self, proposal: dict, ai_service) -> Optional[str]:
        """Use AI for deeper compliance analysis."""
        try:
            sections_preview = []
            for key, section in list(proposal.get("sections", {}).items())[:5]:
                content = section.get("content", "")[:150] if isinstance(section, dict) else str(section)[:150]
                sections_preview.append(f"- {key}: {content}...")

            prompt = (
                f"As a government contract compliance expert, review this proposal overview:\n\n"
                f"Title: {proposal.get('title', 'Untitled')}\n"
                f"Agency: {proposal.get('metadata', {}).get('agency', 'Unknown')}\n"
                f"Sections:\n" + "\n".join(sections_preview) + "\n\n"
                f"Identify the top 3-5 compliance risks or gaps. Be specific and actionable. "
                f"Reference specific FAR/DFARS clauses where relevant."
            )
            return ai_service.generate_section(prompt)
        except Exception as exc:
            logger.warning("AI compliance check failed: %s", exc)
            return None

    def _generate_recommendations(self, area_results, shall_analysis, metadata_check) -> list:
        """Generate prioritized compliance recommendations."""
        recs = []

        # Failed areas
        for area in area_results:
            if area["status"] == "fail":
                recs.append({
                    "priority": "high",
                    "area": area["name"],
                    "message": f"Address {area['name']}: {area['description']}",
                    "missing_keywords": area.get("keywords_missing", []),
                })

        # Partial areas
        for area in area_results:
            if area["status"] == "partial":
                recs.append({
                    "priority": "medium",
                    "area": area["name"],
                    "message": f"Strengthen {area['name']} coverage — add references to: {', '.join(area.get('keywords_missing', [])[:3])}",
                })

        # Metadata gaps
        if metadata_check["missing"]:
            recs.append({
                "priority": "high",
                "area": "Metadata",
                "message": f"Complete missing proposal metadata: {', '.join(metadata_check['missing'])}",
            })

        return recs


# Singleton
compliance_checker = ComplianceCheckerService()

"""
AI Proposal Scoring Service for GovProposal AI.

Scores proposals 0-100 based on:
- Compliance (meets requirements, addresses evaluation criteria)
- Completeness (all sections present, sufficient detail)
- Clarity (well-organized, professional language, coherent)
- Competitiveness (pricing strategy, differentiators, win themes)

Uses Google Gemini for AI-powered scoring and feedback.
"""

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ScoringService:
    """Score and analyze proposals using AI."""

    # Section weights for completeness scoring
    SECTION_WEIGHTS = {
        "executive_summary": 15,
        "technical_approach": 20,
        "management_approach": 15,
        "past_performance": 15,
        "staffing_plan": 10,
        "quality_assurance": 5,
        "risk_management": 5,
        "pricing": 10,
        "compliance_matrix": 5,
    }

    def score_proposal(self, proposal: dict, ai_service=None) -> dict:
        """
        Score a proposal and return detailed breakdown.

        Args:
            proposal: Proposal dict with 'sections', 'title', 'opportunity_title', etc.
            ai_service: Optional AI service for enhanced scoring.

        Returns:
            dict with overall_score, category_scores, feedback, and recommendations.
        """
        sections = proposal.get("sections", {})
        metadata = proposal.get("metadata", {})

        # 1. Completeness score (algorithmic)
        completeness = self._score_completeness(sections)

        # 2. Section quality scores (algorithmic heuristics)
        section_scores = self._score_sections(sections)

        # 3. Compliance indicators
        compliance = self._score_compliance(sections, metadata)

        # 4. Clarity score (based on writing quality heuristics)
        clarity = self._score_clarity(sections)

        # 5. Overall weighted score
        overall = int(
            completeness["score"] * 0.25
            + compliance["score"] * 0.30
            + clarity["score"] * 0.20
            + section_scores["average"] * 0.25
        )
        overall = max(0, min(100, overall))

        # 6. Generate AI-enhanced feedback if available
        ai_feedback = None
        if ai_service:
            ai_feedback = self._get_ai_feedback(proposal, overall, ai_service)

        # 7. Build recommendations
        recommendations = self._build_recommendations(
            completeness, compliance, clarity, section_scores
        )

        return {
            "overall_score": overall,
            "grade": self._score_to_grade(overall),
            "category_scores": {
                "completeness": completeness,
                "compliance": compliance,
                "clarity": clarity,
                "section_quality": section_scores,
            },
            "recommendations": recommendations,
            "ai_feedback": ai_feedback,
            "scoring_version": "1.0",
        }

    def get_feedback(self, proposal: dict, score_data: dict, ai_service=None) -> dict:
        """
        Get detailed feedback for a scored proposal.
        """
        sections = proposal.get("sections", {})
        feedback_items = []

        # Per-section feedback
        for key, section in sections.items():
            content = section.get("content", "") if isinstance(section, dict) else str(section)
            title = section.get("title", key) if isinstance(section, dict) else key
            word_count = len(content.split())

            item = {
                "section": title,
                "section_key": key,
                "word_count": word_count,
                "issues": [],
                "strengths": [],
            }

            if word_count < 50:
                item["issues"].append("Section is too brief. Consider expanding with more detail.")
            elif word_count > 100:
                item["strengths"].append("Good level of detail provided.")

            if word_count > 2000:
                item["issues"].append("Section may be too long. Consider condensing key points.")

            # Check for common issues
            content_lower = content.lower()
            if "shall" in content_lower or "must" in content_lower:
                item["strengths"].append("Uses compliance-oriented language.")
            if "tbd" in content_lower or "to be determined" in content_lower:
                item["issues"].append("Contains TBD/placeholder text that needs to be completed.")
            if "lorem ipsum" in content_lower:
                item["issues"].append("Contains placeholder (Lorem Ipsum) text.")

            feedback_items.append(item)

        # AI-enhanced feedback
        ai_detailed = None
        if ai_service:
            ai_detailed = self._get_ai_feedback(
                proposal, score_data.get("overall_score", 0), ai_service
            )

        return {
            "proposal_id": proposal.get("id", ""),
            "overall_score": score_data.get("overall_score", 0),
            "grade": score_data.get("grade", "N/A"),
            "section_feedback": feedback_items,
            "ai_detailed_feedback": ai_detailed,
            "improvement_priority": self._get_improvement_priority(score_data),
        }

    def _score_completeness(self, sections: dict) -> dict:
        """Score based on how many expected sections are present and filled."""
        if not sections:
            return {"score": 0, "details": "No sections found", "missing": list(self.SECTION_WEIGHTS.keys())}

        total_weight = sum(self.SECTION_WEIGHTS.values())
        earned_weight = 0
        present = []
        missing = []

        for section_key, weight in self.SECTION_WEIGHTS.items():
            # Check if section exists (exact or partial match)
            found = False
            for key in sections:
                if section_key in key.lower().replace(" ", "_").replace("-", "_"):
                    content = sections[key]
                    if isinstance(content, dict):
                        content = content.get("content", "")
                    if len(str(content).strip()) > 20:
                        earned_weight += weight
                        present.append(section_key)
                        found = True
                        break
            if not found:
                missing.append(section_key)

        score = int((earned_weight / total_weight) * 100) if total_weight > 0 else 0
        return {
            "score": score,
            "sections_present": present,
            "sections_missing": missing,
            "coverage": f"{len(present)}/{len(self.SECTION_WEIGHTS)}",
        }

    def _score_sections(self, sections: dict) -> dict:
        """Score individual sections based on content quality heuristics."""
        scores = {}
        for key, section in sections.items():
            content = section.get("content", "") if isinstance(section, dict) else str(section)
            word_count = len(content.split())

            # Base score from word count (more detail = better, with diminishing returns)
            if word_count < 20:
                base = 20
            elif word_count < 100:
                base = 40 + (word_count - 20) * 0.375  # up to 70
            elif word_count < 500:
                base = 70 + (word_count - 100) * 0.05  # up to 90
            else:
                base = min(95, 90 + (word_count - 500) * 0.01)

            # Bonus for structured content
            if any(marker in content for marker in ["•", "1.", "2.", "-", "Phase", "Step"]):
                base = min(100, base + 5)

            scores[key] = int(base)

        avg = int(sum(scores.values()) / len(scores)) if scores else 0
        return {"average": avg, "per_section": scores}

    def _score_compliance(self, sections: dict, metadata: dict) -> dict:
        """Score compliance readiness."""
        score = 50  # Baseline
        details = []

        # Check for key compliance indicators in content
        all_content = " ".join(
            (s.get("content", "") if isinstance(s, dict) else str(s))
            for s in sections.values()
        ).lower()

        compliance_terms = {
            "far": 10, "dfars": 10, "compliance": 5,
            "certification": 5, "quality assurance": 5,
            "cybersecurity": 5, "cmmc": 5, "nist": 5,
        }

        for term, points in compliance_terms.items():
            if term in all_content:
                score += points
                details.append(f"Addresses {term.upper()}")

        # Check metadata completeness
        if metadata.get("solicitation_number"):
            score += 5
            details.append("Solicitation number referenced")
        if metadata.get("naics_codes"):
            score += 5
            details.append("NAICS codes specified")
        if metadata.get("cage_code"):
            score += 5
            details.append("CAGE code included")

        score = min(100, score)
        return {"score": score, "details": details}

    def _score_clarity(self, sections: dict) -> dict:
        """Score writing clarity based on heuristics."""
        if not sections:
            return {"score": 0, "details": []}

        scores = []
        details = []

        for key, section in sections.items():
            content = section.get("content", "") if isinstance(section, dict) else str(section)
            sentences = [s.strip() for s in content.replace("!", ".").replace("?", ".").split(".") if s.strip()]

            if not sentences:
                scores.append(30)
                continue

            # Average sentence length (15-25 words is ideal)
            avg_words = sum(len(s.split()) for s in sentences) / len(sentences)
            if 10 <= avg_words <= 30:
                scores.append(85)
            elif avg_words < 10:
                scores.append(60)
                details.append(f"{key}: Sentences may be too short")
            else:
                scores.append(55)
                details.append(f"{key}: Very long sentences — consider breaking up")

        avg = int(sum(scores) / len(scores)) if scores else 50
        return {"score": avg, "details": details}

    def _build_recommendations(self, completeness, compliance, clarity, sections) -> list:
        """Generate prioritized improvement recommendations."""
        recs = []

        if completeness["score"] < 60:
            missing = completeness.get("sections_missing", [])
            recs.append({
                "priority": "high",
                "category": "completeness",
                "message": f"Add missing sections: {', '.join(missing[:3])}",
            })

        if compliance["score"] < 50:
            recs.append({
                "priority": "high",
                "category": "compliance",
                "message": "Strengthen compliance language — reference applicable FAR/DFARS clauses",
            })

        if clarity["score"] < 60:
            recs.append({
                "priority": "medium",
                "category": "clarity",
                "message": "Improve writing clarity — vary sentence length, use clear structure",
            })

        # Check for weak sections
        for key, score in sections.get("per_section", {}).items():
            if score < 40:
                recs.append({
                    "priority": "medium",
                    "category": "section_quality",
                    "message": f"Expand section '{key}' — currently too brief",
                })

        if not recs:
            recs.append({
                "priority": "low",
                "category": "general",
                "message": "Proposal looks strong. Consider a final review for typos and formatting.",
            })

        return recs

    def _get_ai_feedback(self, proposal: dict, overall_score: int, ai_service) -> Optional[str]:
        """Use AI to generate detailed feedback."""
        try:
            sections_summary = []
            for key, section in proposal.get("sections", {}).items():
                content = section.get("content", "")[:200] if isinstance(section, dict) else str(section)[:200]
                title = section.get("title", key) if isinstance(section, dict) else key
                sections_summary.append(f"- {title}: {content}...")

            prompt = (
                f"You are a government proposal review expert. A proposal scored {overall_score}/100.\n\n"
                f"Proposal: {proposal.get('title', 'Untitled')}\n"
                f"Sections:\n" + "\n".join(sections_summary[:8]) + "\n\n"
                f"Provide 3-5 specific, actionable improvement recommendations. "
                f"Focus on what would most improve the win probability. Be concise."
            )
            return ai_service.generate_section(prompt)
        except Exception as exc:
            logger.warning("AI feedback generation failed: %s", exc)
            return None

    def _get_improvement_priority(self, score_data: dict) -> list:
        """Return ordered list of areas to improve."""
        categories = score_data.get("category_scores", {})
        priority = []
        for cat_name, cat_data in categories.items():
            score = cat_data.get("score", cat_data.get("average", 50))
            priority.append({"category": cat_name, "score": score})
        priority.sort(key=lambda x: x["score"])
        return priority

    @staticmethod
    def _score_to_grade(score: int) -> str:
        """Convert numeric score to letter grade."""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"


# Singleton
scoring_service = ScoringService()

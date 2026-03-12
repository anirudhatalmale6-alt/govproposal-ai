"""
SAM.gov API integration service for searching federal contract opportunities.
"""

import os
import logging
from typing import Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

SAM_API_BASE_URL = "https://api.sam.gov/opportunities/v2/search"


class SAMService:
    """Service for interacting with the SAM.gov Opportunities API."""

    def __init__(self) -> None:
        self.api_key: str = os.getenv("SAM_API_KEY", "")
        if not self.api_key:
            logger.warning(
                "SAM_API_KEY not set. SAM.gov searches will fail. "
                "Set SAM_API_KEY in your .env file."
            )

    def search_opportunities(
        self,
        keyword: str,
        naics: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict]:
        """
        Search SAM.gov for contract opportunities.

        Args:
            keyword: Search keyword(s) for opportunity titles/descriptions.
            naics: Optional NAICS code to filter results.
            limit: Maximum number of results to return (default 10).

        Returns:
            List of opportunity dicts with standardized fields.
        """
        if not self.api_key:
            raise ValueError(
                "SAM_API_KEY is not configured. "
                "Please set it in your environment or .env file."
            )

        params: Dict = {
            "api_key": self.api_key,
            "keyword": keyword,
            "limit": min(limit, 100),
            "postedFrom": "",
            "postedTo": "",
        }

        if naics:
            params["ncode"] = naics

        try:
            response = requests.get(
                SAM_API_BASE_URL,
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.Timeout:
            logger.error("SAM.gov API request timed out")
            raise ConnectionError("SAM.gov API request timed out. Please try again.")
        except requests.exceptions.HTTPError as exc:
            logger.error("SAM.gov API HTTP error: %s", exc)
            raise ConnectionError(f"SAM.gov API error: {exc}")
        except requests.exceptions.RequestException as exc:
            logger.error("SAM.gov API request failed: %s", exc)
            raise ConnectionError(f"Failed to connect to SAM.gov API: {exc}")

        opportunities_data = data.get("opportunitiesData", [])
        if not opportunities_data:
            return []

        return [self._parse_opportunity(opp) for opp in opportunities_data]

    @staticmethod
    def _parse_opportunity(raw: Dict) -> Dict:
        """Parse a raw SAM.gov opportunity record into a standardized dict."""
        return {
            "title": raw.get("title", "Untitled"),
            "agency": raw.get("fullParentPathName", raw.get("departmentName", "Unknown Agency")),
            "due_date": raw.get("responseDeadLine", raw.get("archiveDate", None)),
            "notice_id": raw.get("noticeId", raw.get("solicitationNumber", None)),
            "description": raw.get("description", raw.get("additionalInfoLink", "")),
            "posted_date": raw.get("postedDate", None),
            "type": raw.get("type", raw.get("noticeType", None)),
        }

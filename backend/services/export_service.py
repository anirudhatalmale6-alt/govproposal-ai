"""
Export service for generating DOCX and PDF files from proposal content.
"""

import io
import logging
from typing import Dict

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

logger = logging.getLogger(__name__)


def generate_docx(proposal: Dict) -> io.BytesIO:
    """
    Generate a Word document from proposal sections.

    Args:
        proposal: Dict with 'proposal_title', 'vendor_name', and 'sections'.
                  Each section has 'title' and 'content'.

    Returns:
        BytesIO buffer containing the DOCX file.
    """
    try:
        doc = Document()

        # --- Document styles ---
        style = doc.styles["Normal"]
        style.font.name = "Calibri"
        style.font.size = Pt(11)
        style.paragraph_format.space_after = Pt(6)

        # --- Title Page ---
        proposal_title = proposal.get("proposal_title", "Government Proposal")
        vendor_name = proposal.get("vendor_name", "")

        # Add some spacing at top
        for _ in range(4):
            doc.add_paragraph("")

        # Main title
        title_para = doc.add_paragraph()
        title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        title_run = title_para.add_run(proposal_title.upper())
        title_run.bold = True
        title_run.font.size = Pt(28)
        title_run.font.color.rgb = RGBColor(0, 51, 102)  # Navy blue

        # Subtitle line
        doc.add_paragraph("")
        subtitle_para = doc.add_paragraph()
        subtitle_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sub_run = subtitle_para.add_run("Government Contract Proposal")
        sub_run.font.size = Pt(16)
        sub_run.font.color.rgb = RGBColor(102, 102, 102)

        if vendor_name:
            doc.add_paragraph("")
            vendor_para = doc.add_paragraph()
            vendor_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            vendor_run = vendor_para.add_run(f"Prepared by: {vendor_name}")
            vendor_run.font.size = Pt(14)
            vendor_run.font.color.rgb = RGBColor(0, 51, 102)

        # Confidential notice
        doc.add_paragraph("")
        doc.add_paragraph("")
        conf_para = doc.add_paragraph()
        conf_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        conf_run = conf_para.add_run(
            "CONFIDENTIAL - FOR GOVERNMENT USE ONLY"
        )
        conf_run.font.size = Pt(10)
        conf_run.font.color.rgb = RGBColor(153, 0, 0)
        conf_run.italic = True

        doc.add_page_break()

        # --- Table of Contents placeholder ---
        toc_heading = doc.add_heading("Table of Contents", level=1)
        toc_heading.runs[0].font.color.rgb = RGBColor(0, 51, 102)

        sections = proposal.get("sections", {})
        for idx, (section_key, section_data) in enumerate(sections.items(), start=1):
            section_title = section_data.get("title", section_key.replace("_", " ").title())
            toc_para = doc.add_paragraph()
            toc_run = toc_para.add_run(f"{idx}. {section_title}")
            toc_run.font.size = Pt(12)

        doc.add_page_break()

        # --- Content Sections ---
        for idx, (section_key, section_data) in enumerate(sections.items(), start=1):
            section_title = section_data.get("title", section_key.replace("_", " ").title())
            content = section_data.get("content", "")

            # Section heading
            heading = doc.add_heading(f"{idx}. {section_title}", level=1)
            for run in heading.runs:
                run.font.color.rgb = RGBColor(0, 51, 102)

            # Section content - split by paragraphs
            paragraphs = content.split("\n")
            for para_text in paragraphs:
                para_text = para_text.strip()
                if not para_text:
                    continue

                # Check if it looks like a sub-heading (starts with ## or is all caps short line)
                if para_text.startswith("## "):
                    sub_heading = doc.add_heading(para_text.replace("## ", ""), level=2)
                    for run in sub_heading.runs:
                        run.font.color.rgb = RGBColor(0, 76, 153)
                elif para_text.startswith("### "):
                    sub_heading = doc.add_heading(para_text.replace("### ", ""), level=3)
                elif para_text.startswith("# "):
                    sub_heading = doc.add_heading(para_text.replace("# ", ""), level=2)
                    for run in sub_heading.runs:
                        run.font.color.rgb = RGBColor(0, 76, 153)
                elif para_text.startswith("- ") or para_text.startswith("* "):
                    # Bullet point
                    bullet_text = para_text[2:].strip()
                    # Handle bold markers in bullet text
                    bullet_text = _strip_markdown_bold(bullet_text)
                    doc.add_paragraph(bullet_text, style="List Bullet")
                else:
                    # Regular paragraph - strip markdown bold markers
                    clean_text = _strip_markdown_bold(para_text)
                    doc.add_paragraph(clean_text)

            # Add spacing between sections
            doc.add_paragraph("")

        # Save to buffer
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer

    except Exception as exc:
        logger.error("Failed to generate DOCX: %s", exc)
        raise RuntimeError(f"DOCX generation failed: {exc}")


def generate_pdf(proposal: Dict) -> io.BytesIO:
    """
    Generate a PDF document from proposal sections.

    Args:
        proposal: Dict with 'proposal_title', 'vendor_name', and 'sections'.
                  Each section has 'title' and 'content'.

    Returns:
        BytesIO buffer containing the PDF file.
    """
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        # --- Custom styles ---
        styles = getSampleStyleSheet()

        # Title style
        styles.add(ParagraphStyle(
            name="ProposalTitle",
            parent=styles["Title"],
            fontSize=26,
            textColor=colors.HexColor("#003366"),
            spaceAfter=12,
            alignment=1,  # Center
            fontName="Helvetica-Bold",
        ))

        # Subtitle style
        styles.add(ParagraphStyle(
            name="ProposalSubtitle",
            parent=styles["Normal"],
            fontSize=14,
            textColor=colors.HexColor("#666666"),
            spaceAfter=8,
            alignment=1,
            fontName="Helvetica",
        ))

        # Section heading style
        styles.add(ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading1"],
            fontSize=16,
            textColor=colors.HexColor("#003366"),
            spaceBefore=20,
            spaceAfter=10,
            fontName="Helvetica-Bold",
            borderWidth=1,
            borderColor=colors.HexColor("#003366"),
            borderPadding=4,
        ))

        # Sub-heading style
        styles.add(ParagraphStyle(
            name="SubHeading",
            parent=styles["Heading2"],
            fontSize=13,
            textColor=colors.HexColor("#004C99"),
            spaceBefore=12,
            spaceAfter=6,
            fontName="Helvetica-Bold",
        ))

        # Body text style
        styles.add(ParagraphStyle(
            name="ProposalBody",
            parent=styles["Normal"],
            fontSize=10.5,
            leading=14,
            spaceAfter=6,
            fontName="Helvetica",
            textColor=colors.HexColor("#333333"),
        ))

        # Bullet style
        styles.add(ParagraphStyle(
            name="ProposalBullet",
            parent=styles["Normal"],
            fontSize=10.5,
            leading=14,
            spaceAfter=4,
            leftIndent=20,
            bulletIndent=10,
            fontName="Helvetica",
            textColor=colors.HexColor("#333333"),
        ))

        # Confidential style
        styles.add(ParagraphStyle(
            name="Confidential",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#990000"),
            alignment=1,
            fontName="Helvetica-Oblique",
        ))

        story = []
        proposal_title = proposal.get("proposal_title", "Government Proposal")
        vendor_name = proposal.get("vendor_name", "")
        sections = proposal.get("sections", {})

        # --- Cover Page ---
        story.append(Spacer(1, 2 * inch))

        # Logo placeholder - gray rectangle with text
        logo_data = [["COMPANY LOGO"]]
        logo_table = Table(logo_data, colWidths=[3 * inch], rowHeights=[1 * inch])
        logo_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CCCCCC")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F5F5F5")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#999999")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 12),
        ]))
        story.append(logo_table)
        story.append(Spacer(1, 0.5 * inch))

        # Title
        story.append(Paragraph(
            _escape_xml(proposal_title.upper()),
            styles["ProposalTitle"],
        ))
        story.append(Spacer(1, 0.2 * inch))

        # Subtitle
        story.append(Paragraph(
            "Government Contract Proposal",
            styles["ProposalSubtitle"],
        ))

        if vendor_name:
            story.append(Spacer(1, 0.3 * inch))
            story.append(Paragraph(
                f"Prepared by: {_escape_xml(vendor_name)}",
                styles["ProposalSubtitle"],
            ))

        story.append(Spacer(1, 1 * inch))
        story.append(Paragraph(
            "CONFIDENTIAL - FOR GOVERNMENT USE ONLY",
            styles["Confidential"],
        ))

        story.append(PageBreak())

        # --- Table of Contents ---
        story.append(Paragraph("Table of Contents", styles["SectionHeading"]))
        story.append(Spacer(1, 0.2 * inch))

        for idx, (section_key, section_data) in enumerate(sections.items(), start=1):
            section_title = section_data.get("title", section_key.replace("_", " ").title())
            toc_text = f"{idx}. {_escape_xml(section_title)}"
            story.append(Paragraph(toc_text, styles["ProposalBody"]))

        story.append(PageBreak())

        # --- Content Sections ---
        for idx, (section_key, section_data) in enumerate(sections.items(), start=1):
            section_title = section_data.get("title", section_key.replace("_", " ").title())
            content = section_data.get("content", "")

            # Section header with horizontal rule effect
            story.append(Paragraph(
                f"{idx}. {_escape_xml(section_title)}",
                styles["SectionHeading"],
            ))

            # Decorative line under heading
            line_data = [[""]]
            line_table = Table(line_data, colWidths=[6.5 * inch], rowHeights=[2])
            line_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#003366")),
                ("LINEBELOW", (0, 0), (-1, -1), 0, colors.white),
            ]))
            story.append(line_table)
            story.append(Spacer(1, 0.15 * inch))

            # Parse and add content paragraphs
            paragraphs = content.split("\n")
            for para_text in paragraphs:
                para_text = para_text.strip()
                if not para_text:
                    story.append(Spacer(1, 4))
                    continue

                safe_text = _escape_xml(para_text)

                if para_text.startswith("## ") or para_text.startswith("# "):
                    heading_text = para_text.lstrip("# ").strip()
                    story.append(Paragraph(
                        _escape_xml(heading_text),
                        styles["SubHeading"],
                    ))
                elif para_text.startswith("### "):
                    heading_text = para_text.replace("### ", "").strip()
                    story.append(Paragraph(
                        f"<b>{_escape_xml(heading_text)}</b>",
                        styles["ProposalBody"],
                    ))
                elif para_text.startswith("- ") or para_text.startswith("* "):
                    bullet_text = para_text[2:].strip()
                    bullet_text = _markdown_bold_to_reportlab(bullet_text)
                    story.append(Paragraph(
                        f"\u2022  {bullet_text}",
                        styles["ProposalBullet"],
                    ))
                else:
                    formatted_text = _markdown_bold_to_reportlab(para_text)
                    story.append(Paragraph(formatted_text, styles["ProposalBody"]))

            story.append(Spacer(1, 0.3 * inch))

        # Build the PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    except Exception as exc:
        logger.error("Failed to generate PDF: %s", exc)
        raise RuntimeError(f"PDF generation failed: {exc}")


def _escape_xml(text: str) -> str:
    """Escape special XML characters for ReportLab Paragraph."""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    text = text.replace('"', "&quot;")
    return text


def _strip_markdown_bold(text: str) -> str:
    """Remove markdown bold markers (**text**) for DOCX output."""
    import re
    return re.sub(r"\*\*(.+?)\*\*", r"\1", text)


def _markdown_bold_to_reportlab(text: str) -> str:
    """Convert markdown bold (**text**) to ReportLab <b>text</b> tags."""
    import re
    # First escape XML entities
    text = _escape_xml(text)
    # Then convert bold markers (after escaping, so ** are still intact)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    return text

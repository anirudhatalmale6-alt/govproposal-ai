"""
Multi-Organization API endpoints.

POST   /api/orgs                — Create organization
GET    /api/orgs                — List user's organizations
GET    /api/orgs/{id}           — Get org details
PUT    /api/orgs/{id}           — Update org
DELETE /api/orgs/{id}           — Delete org
POST   /api/orgs/{id}/invite    — Invite member
GET    /api/orgs/{id}/members   — List members
PUT    /api/orgs/{id}/role      — Update member role
DELETE /api/orgs/{id}/members/{user_id} — Remove member
"""

import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User
from models.organization import Organization, OrganizationMember
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orgs", tags=["Organizations"])


def _slugify(name: str) -> str:
    """Create a URL-safe slug from a name."""
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return slug[:80]


@router.post("")
async def create_organization(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new organization. The creator becomes the owner."""
    body = await request.json()
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organization name is required.")

    slug = _slugify(name)

    # Check slug uniqueness
    result = await db.execute(select(Organization).where(Organization.slug == slug))
    if result.scalar_one_or_none():
        slug = f"{slug}-{current_user.id[:6]}"

    org = Organization(
        name=name,
        slug=slug,
        description=body.get("description", ""),
        website=body.get("website"),
        industry=body.get("industry"),
        created_by=current_user.id,
    )
    db.add(org)
    await db.flush()

    # Add creator as owner
    member = OrganizationMember(
        organization_id=org.id,
        user_id=current_user.id,
        role="owner",
        invite_status="accepted",
    )
    db.add(member)
    await db.flush()

    logger.info("Organization created: %s by %s", org.name, current_user.email)

    return {"message": "Organization created.", "organization": org.to_dict()}


@router.get("")
async def list_organizations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all organizations the user belongs to."""
    result = await db.execute(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == current_user.id)
        .order_by(Organization.name)
    )
    orgs = result.scalars().all()

    orgs_data = []
    for org in orgs:
        data = org.to_dict()
        # Get user's role in this org
        role_result = await db.execute(
            select(OrganizationMember.role).where(
                OrganizationMember.organization_id == org.id,
                OrganizationMember.user_id == current_user.id,
            )
        )
        role_row = role_result.first()
        data["my_role"] = role_row[0] if role_row else "member"
        # Member count
        count_result = await db.execute(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.organization_id == org.id,
            )
        )
        data["member_count"] = count_result.scalar() or 0
        orgs_data.append(data)

    return {"count": len(orgs_data), "organizations": orgs_data}


@router.get("/{org_id}")
async def get_organization(
    org_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get organization details."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    # Verify membership
    mem_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
        )
    )
    if not mem_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="You are not a member of this organization.")

    return {"organization": org.to_dict()}


@router.put("/{org_id}")
async def update_organization(
    org_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update organization (admin/owner only)."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    # Verify admin/owner role
    mem_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.role.in_(["owner", "admin"]),
        )
    )
    if not mem_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only org owners and admins can update settings.")

    body = await request.json()
    for field in ["name", "description", "website", "industry", "logo_url"]:
        if field in body:
            setattr(org, field, body[field])
    if "settings" in body:
        org.settings = body["settings"]

    db.add(org)
    await db.flush()

    return {"message": "Organization updated.", "organization": org.to_dict()}


@router.delete("/{org_id}")
async def delete_organization(
    org_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete organization (owner only)."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    mem_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.role == "owner",
        )
    )
    if not mem_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only the organization owner can delete it.")

    await db.delete(org)
    await db.flush()

    return {"message": "Organization deleted."}


@router.post("/{org_id}/invite")
async def invite_member(
    org_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Invite a user to the organization.

    Body: { "email": "user@example.com", "role": "member" }
    """
    body = await request.json()
    email = body.get("email", "").strip().lower()
    role = body.get("role", "member")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    if role not in ("admin", "member", "viewer"):
        raise HTTPException(status_code=400, detail="Role must be admin, member, or viewer.")

    # Verify org exists and user has permission
    org_result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    mem_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.role.in_(["owner", "admin"]),
        )
    )
    if not mem_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only owners/admins can invite members.")

    # Find user by email
    user_result = await db.execute(select(User).where(User.email == email))
    invitee = user_result.scalar_one_or_none()

    if invitee:
        # Check if already a member
        existing = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == invitee.id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="User is already a member.")

        member = OrganizationMember(
            organization_id=org_id,
            user_id=invitee.id,
            role=role,
            invited_by=current_user.id,
            invite_email=email,
            invite_status="accepted",
        )
    else:
        # Create pending invite
        member = OrganizationMember(
            organization_id=org_id,
            user_id=current_user.id,  # placeholder until they register
            role=role,
            invited_by=current_user.id,
            invite_email=email,
            invite_status="pending",
        )

    db.add(member)
    await db.flush()

    logger.info("Invited %s to org %s as %s", email, org.name, role)

    return {
        "message": f"Invitation sent to {email}.",
        "member": member.to_dict(),
    }


@router.get("/{org_id}/members")
async def list_members(
    org_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all members of an organization."""
    # Verify membership
    mem_check = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
        )
    )
    if not mem_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this organization.")

    result = await db.execute(
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == org_id)
        .order_by(OrganizationMember.role, OrganizationMember.joined_at)
    )
    members = result.scalars().all()

    members_data = []
    for m in members:
        data = m.to_dict()
        # Get user info
        user_result = await db.execute(select(User).where(User.id == m.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            data["user_name"] = user.full_name or user.email
            data["user_email"] = user.email
        else:
            data["user_name"] = m.invite_email or "Unknown"
            data["user_email"] = m.invite_email
        members_data.append(data)

    return {"count": len(members_data), "members": members_data}


@router.put("/{org_id}/role")
async def update_member_role(
    org_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a member's role.

    Body: { "user_id": "...", "role": "admin" }
    """
    body = await request.json()
    target_user_id = body.get("user_id")
    new_role = body.get("role")

    if not target_user_id or not new_role:
        raise HTTPException(status_code=400, detail="user_id and role are required.")
    if new_role not in ("admin", "member", "viewer"):
        raise HTTPException(status_code=400, detail="Role must be admin, member, or viewer.")

    # Verify requester is owner/admin
    mem_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.role.in_(["owner", "admin"]),
        )
    )
    if not mem_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only owners/admins can change roles.")

    # Find target member
    target_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == target_user_id,
        )
    )
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found.")

    if target.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot change the owner's role.")

    target.role = new_role
    db.add(target)
    await db.flush()

    return {"message": f"Role updated to {new_role}.", "member": target.to_dict()}


@router.delete("/{org_id}/members/{user_id}")
async def remove_member(
    org_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the organization."""
    # Verify requester is owner/admin (or self-removal)
    if user_id != current_user.id:
        mem_result = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == current_user.id,
                OrganizationMember.role.in_(["owner", "admin"]),
            )
        )
        if not mem_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Only owners/admins can remove members.")

    target_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
    )
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found.")

    if target.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the organization owner.")

    await db.delete(target)
    await db.flush()

    return {"message": "Member removed."}

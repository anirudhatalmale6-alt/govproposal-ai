"""
Authentication routes for GovProposal AI.

Endpoints: register, login, get profile, update profile.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User
from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ──────────────────────────────────────────────
# Request / Response schemas
# ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    full_name: str = Field("", description="User's full name")
    company_name: str = Field("", description="Company name")


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Password")


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, description="Updated full name")
    company_name: Optional[str] = Field(None, description="Updated company name")
    email: Optional[str] = Field(None, description="Updated email")


class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    user: dict


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user account.

    Creates the user with a hashed password and returns a JWT token.
    """
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == request.email.lower().strip()))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    # Create user
    user = User(
        email=request.email.lower().strip(),
        hashed_password=hash_password(request.password),
        full_name=request.full_name.strip(),
        company_name=request.company_name.strip(),
    )
    db.add(user)
    await db.flush()  # Populate the id

    # Generate token
    token = create_access_token(data={"sub": user.id, "email": user.email})

    logger.info("New user registered: %s (%s)", user.email, user.id)

    return AuthResponse(
        token=token,
        user=user.to_dict(),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate a user and return a JWT token.
    """
    result = await db.execute(select(User).where(User.email == request.email.lower().strip()))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(data={"sub": user.id, "email": user.email})

    logger.info("User logged in: %s", user.email)

    return AuthResponse(
        token=token,
        user=user.to_dict(),
    )


@router.get("/me", response_model=UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Get the current authenticated user's profile.
    """
    return UserResponse(user=current_user.to_dict())


@router.put("/me", response_model=UserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the current authenticated user's profile.
    """
    if request.full_name is not None:
        current_user.full_name = request.full_name.strip()

    if request.company_name is not None:
        current_user.company_name = request.company_name.strip()

    if request.email is not None:
        new_email = request.email.lower().strip()
        if new_email != current_user.email:
            # Check for duplicates
            result = await db.execute(select(User).where(User.email == new_email))
            if result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this email already exists.",
                )
            current_user.email = new_email

    db.add(current_user)
    await db.flush()

    logger.info("User profile updated: %s", current_user.email)

    return UserResponse(user=current_user.to_dict())

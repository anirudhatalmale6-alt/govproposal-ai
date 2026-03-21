"""
Authentication routes for GovProposal AI.

Endpoints: register, login, verify email, resend verification, get profile, update profile.
"""

import logging
import re
import secrets
from typing import Optional
from datetime import datetime, timedelta, timezone

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
from services.email_service import send_verification_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ──────────────────────────────────────────────
# Request / Response schemas
# ──────────────────────────────────────────────

def validate_password(password: str) -> str | None:
    """
    Validate password meets security requirements.
    Returns error message if invalid, None if valid.
    """
    if len(password) < 10:
        return "Password must be at least 10 characters long."
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r'[0-9]', password):
        return "Password must contain at least one digit."
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password):
        return "Password must contain at least one special character (!@#$%^&* etc.)."
    return None


class RegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=10, description="Password (min 10 characters, mixed case, digits, special chars)")
    first_name: str = Field("", description="User's first name")
    last_name: str = Field("", description="User's last name")
    company_name: str = Field("", description="Company name")
    mobile_number: str = Field("", description="Mobile phone number")
    landline_number: str = Field("", description="Landline phone number")


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Password")


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = Field(None, description="Updated first name")
    last_name: Optional[str] = Field(None, description="Updated last name")
    full_name: Optional[str] = Field(None, description="Updated full name")
    company_name: Optional[str] = Field(None, description="Updated company name")
    mobile_number: Optional[str] = Field(None, description="Updated mobile number")
    landline_number: Optional[str] = Field(None, description="Updated landline number")
    email: Optional[str] = Field(None, description="Updated email")


class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: dict
    email_verified: bool = True


class RegisterResponse(BaseModel):
    message: str
    user: dict
    requires_verification: bool = True


class UserResponse(BaseModel):
    user: dict


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., description="Email verification token")


class ResendVerificationRequest(BaseModel):
    email: str = Field(..., description="Email to resend verification to")


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user account.

    Creates the user with a hashed password and sends a verification email.
    User must verify email before they can log in.
    """
    # Validate password strength
    pwd_error = validate_password(request.password)
    if pwd_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pwd_error,
        )

    # Check if email already exists
    result = await db.execute(select(User).where(User.email == request.email.lower().strip()))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    # Generate verification token
    verification_token = secrets.token_urlsafe(32)
    verification_expires = datetime.now(timezone.utc) + timedelta(hours=24)

    # Create user (unverified)
    first = request.first_name.strip()
    last = request.last_name.strip()
    user = User(
        email=request.email.lower().strip(),
        hashed_password=hash_password(request.password),
        first_name=first,
        last_name=last,
        full_name=f"{first} {last}".strip(),
        company_name=request.company_name.strip(),
        mobile_number=request.mobile_number.strip() or None,
        landline_number=request.landline_number.strip() or None,
        email_verified=False,
        verification_token=verification_token,
        verification_token_expires=verification_expires,
    )
    db.add(user)
    await db.flush()  # Populate the id

    # Send verification email
    try:
        await send_verification_email(user.email, verification_token, user.full_name)
        logger.info("Verification email sent to: %s", user.email)
    except Exception as e:
        logger.warning("Failed to send verification email to %s: %s", user.email, e)

    logger.info("New user registered (pending verification): %s (%s)", user.email, user.id)

    return RegisterResponse(
        message="Account created. Please check your email to verify your account.",
        user=user.to_dict(),
        requires_verification=True,
    )


@router.post("/verify-email")
async def verify_email(
    request: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a user's email address using the token sent via email.
    """
    result = await db.execute(
        select(User).where(User.verification_token == request.token)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token.",
        )

    if user.verification_token_expires:
        expires = user.verification_token_expires
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired. Please request a new one.",
            )

    # Mark as verified
    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.add(user)
    await db.flush()

    # Generate login token
    token = create_access_token(data={"sub": user.id, "email": user.email})

    logger.info("Email verified: %s", user.email)

    return AuthResponse(
        token=token,
        user=user.to_dict(),
        email_verified=True,
    )


@router.post("/resend-verification")
async def resend_verification(
    request: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Resend the verification email to a user.
    """
    result = await db.execute(
        select(User).where(User.email == request.email.lower().strip())
    )
    user = result.scalar_one_or_none()

    if user is None:
        # Don't reveal whether email exists
        return {"message": "If an account with this email exists, a verification email has been sent."}

    if user.email_verified:
        return {"message": "This email is already verified. You can log in."}

    # Generate new token
    user.verification_token = secrets.token_urlsafe(32)
    user.verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.add(user)
    await db.flush()

    try:
        await send_verification_email(user.email, user.verification_token, user.full_name)
    except Exception as e:
        logger.warning("Failed to resend verification email: %s", e)

    return {"message": "If an account with this email exists, a verification email has been sent."}


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate a user and return a JWT token.
    Requires email to be verified first.
    """
    result = await db.execute(select(User).where(User.email == request.email.lower().strip()))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox for the verification link.",
        )

    token = create_access_token(data={"sub": user.id, "email": user.email})

    logger.info("User logged in: %s", user.email)

    return AuthResponse(
        token=token,
        user=user.to_dict(),
        email_verified=True,
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
    if request.first_name is not None:
        current_user.first_name = request.first_name.strip()
    if request.last_name is not None:
        current_user.last_name = request.last_name.strip()
    if request.first_name is not None or request.last_name is not None:
        current_user.full_name = f"{current_user.first_name} {current_user.last_name}".strip()
    if request.full_name is not None:
        current_user.full_name = request.full_name.strip()

    if request.company_name is not None:
        current_user.company_name = request.company_name.strip()

    if request.mobile_number is not None:
        current_user.mobile_number = request.mobile_number.strip() or None
    if request.landline_number is not None:
        current_user.landline_number = request.landline_number.strip() or None

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

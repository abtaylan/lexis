from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.core.database import supabase_admin

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register", status_code=201)
async def register(req: RegisterRequest):
    try:
        result = supabase_admin.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {"display_name": req.display_name}}
        })
        if result.user is None:
            raise HTTPException(status_code=400, detail="Kayıt başarısız.")
        return {"message": "Kayıt başarılı."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"REGISTER ERROR: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(req: LoginRequest):
    try:
        result = supabase_admin.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        if not result.session:
            raise HTTPException(status_code=401, detail="Email veya şifre hatalı.")
        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "user": {
                "id": result.user.id,
                "email": result.user.email,
                "display_name": result.user.user_metadata.get("display_name", ""),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"LOGIN ERROR: {e}")
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı.")


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    try:
        result = supabase_admin.auth.refresh_session(refresh_token)
        return {"access_token": result.session.access_token}
    except Exception:
        raise HTTPException(status_code=401, detail="Token yenilenemedi.")
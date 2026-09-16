import secrets

from fastapi import APIRouter, HTTPException
from psycopg.errors import UniqueViolation
from pwdlib import PasswordHash

from hatim.core.db import connect, digest
from hatim.core.models import Acknowledged

from .access import Token, User, account_model
from .models import Account, AccountProfile, AccountSession, Credentials, Registration

router = APIRouter(prefix="/api/v2/auth", tags=["Accounts"])
passwords = PasswordHash.recommended()
# Equal work for unknown accounts; the fallback password is never retained.
DUMMY_HASH = passwords.hash(secrets.token_urlsafe(32))


def throttle(key: str, maximum: int):
    # Committed separately so a rejected login cannot roll back the attempt counter.
    with connect() as db:
        db.execute("DELETE FROM auth_attempts WHERE resets_at<CURRENT_TIMESTAMP")
        row = db.execute(
            "INSERT INTO auth_attempts(key,attempts,resets_at) "
            "VALUES(%s,1,CURRENT_TIMESTAMP+INTERVAL '10 minutes') "
            "ON CONFLICT(key) DO UPDATE SET attempts=auth_attempts.attempts+1 RETURNING attempts",
            (digest(key),),
        ).fetchone()
    if row["attempts"] > maximum:
        raise HTTPException(429, "محاولات كثيرة. انتظر عشر دقائق ثم حاول مجددًا.")


def new_session(db, row):
    token = secrets.token_urlsafe(32)
    db.execute("DELETE FROM account_sessions WHERE expires_at<CURRENT_TIMESTAMP")
    db.execute(
        "INSERT INTO account_sessions(token_hash,account_id,expires_at) "
        "VALUES(%s,%s,CURRENT_TIMESTAMP+INTERVAL '30 days')",
        (digest(token), row["id"]),
    )
    return AccountSession(token=token, account=account_model(row))


@router.post("/register", response_model=AccountSession, status_code=201)
def register(body: Registration):
    throttle("register:" + body.handle, 10)
    # Bound expensive Argon2 work across new handles on this small public test service.
    throttle("registration-total", 60)
    hashed = passwords.hash(body.password.get_secret_value())
    try:
        with connect() as db:
            row = db.execute(
                "INSERT INTO accounts(id,handle,name,password_hash) VALUES(%s,%s,%s,%s) RETURNING *",
                (secrets.token_urlsafe(12), body.handle, body.name, hashed),
            ).fetchone()
            return new_session(db, row)
    except UniqueViolation:
        raise HTTPException(409, "اسم المستخدم مستخدم. اختر اسمًا آخر أو سجّل الدخول.") from None


@router.post("/login", response_model=AccountSession)
def login(body: Credentials):
    throttle("login:" + body.handle, 10)
    throttle("login-total", 120)
    with connect() as db:
        row = db.execute("SELECT * FROM accounts WHERE handle=%s", (body.handle,)).fetchone()
        valid = passwords.verify(
            body.password.get_secret_value(), row["password_hash"] if row else DUMMY_HASH
        )
        if not row or not valid:
            raise HTTPException(401, "اسم المستخدم أو كلمة المرور غير صحيحة.")
        db.execute("DELETE FROM auth_attempts WHERE key=%s", (digest("login:" + body.handle),))
        return new_session(db, row)


@router.get("/me", response_model=Account)
def me(user: User):
    return user


@router.post("/logout", response_model=Acknowledged)
def logout(token: Token):
    with connect() as db:
        db.execute("DELETE FROM account_sessions WHERE token_hash=%s", (digest(token),))
    return Acknowledged()


@router.put("/me", response_model=Account)
def update_profile(body: AccountProfile, user: User):
    with connect() as db:
        row = db.execute(
            "UPDATE accounts SET name=%s WHERE id=%s RETURNING *", (body.name, user.id)
        ).fetchone()
        return account_model(row)

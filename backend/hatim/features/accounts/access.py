from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from hatim.core.db import connect, digest

from .models import Account

security = HTTPBearer(auto_error=False)


def account_model(row):
    return Account(id=row["id"], handle=row["handle"], name=row["name"])


def session_token(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)]):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "سجّل دخولك للوصول إلى حسابك.")
    return credentials.credentials


Token = Annotated[str, Depends(session_token)]


def current_account(token: Token) -> Account:
    with connect(read_only=True) as db:
        row = db.execute(
            "SELECT a.* FROM accounts a JOIN account_sessions s ON s.account_id=a.id "
            "WHERE s.token_hash=%s AND s.expires_at>CURRENT_TIMESTAMP",
            (digest(token),),
        ).fetchone()
        if row is None:
            raise HTTPException(401, "انتهت الجلسة. سجّل دخولك من جديد.")
        return account_model(row)


User = Annotated[Account, Depends(current_account)]


def session_owns(db, account_id: str, token_hash: str) -> bool:
    return (
        db.execute(
            "SELECT 1 FROM account_sessions WHERE account_id=%s AND token_hash=%s "
            "AND expires_at>CURRENT_TIMESTAMP",
            (account_id, token_hash),
        ).fetchone()
        is not None
    )

from fastapi import APIRouter, Header

from hatim.core.models import Acknowledged, TitleChange
from hatim.domain.models import Member, Preferences
from hatim.features.accounts import User

from . import service
from .models import (
    CreateGroup,
    GroupCreated,
    GroupView,
    InviteView,
    MemberCreated,
    PlanSettingsChange,
    PlanSummary,
    SaveToAccount,
)

router = APIRouter()


@router.post("/api/groups", response_model=GroupCreated, status_code=201)
def create_group(body: CreateGroup, authorization: str | None = Header(default=None)):
    # Supplying an invalid account session must never create an anonymous plan.
    return service.create_group(body, authorization)


@router.get("/api/groups", response_model=list[PlanSummary], tags=["Plans"])
def account_plans(user: User):
    return service.account_plans(user)


@router.put("/api/groups/{group_id}/account", response_model=GroupView, tags=["Plans"])
def save_to_account(group_id: str, body: SaveToAccount, user: User):
    return service.save_to_account(group_id, body, user)


@router.put("/api/groups/{group_id}/title", response_model=GroupView, tags=["Plans"])
def rename_plan(group_id: str, body: TitleChange, authorization: str | None = Header(default=None)):
    return service.rename_plan(group_id, body, authorization)


@router.delete("/api/groups/{group_id}", response_model=Acknowledged, tags=["Plans"])
def delete_plan(group_id: str, authorization: str | None = Header(default=None)):
    return service.delete_plan(group_id, authorization)


@router.get("/api/groups/{group_id}", response_model=GroupView)
def get_group(group_id: str, authorization: str | None = Header(default=None)):
    return service.get_group(group_id, authorization)


@router.put("/api/groups/{group_id}/settings", response_model=GroupView)
def update_settings(
    group_id: str, body: PlanSettingsChange, authorization: str | None = Header(default=None)
):
    return service.update_settings(group_id, body, authorization)


@router.put("/api/groups/{group_id}/profile", response_model=GroupView)
def update_organizer(
    group_id: str, body: Preferences, authorization: str | None = Header(default=None)
):
    return service.update_organizer(group_id, body, authorization)


@router.delete("/api/groups/{group_id}/members/{member_id}", response_model=GroupView)
def remove_member(group_id: str, member_id: str, authorization: str | None = Header(default=None)):
    return service.remove_member(group_id, member_id, authorization)


@router.get("/api/invites/{code}", response_model=InviteView)
def invite(code: str):
    return service.invite(code)


@router.post("/api/invites/{code}/members", response_model=MemberCreated, status_code=201)
def join_group(code: str, body: Preferences):
    return service.join_group(code, body)


@router.get("/api/invites/{code}/me", response_model=Member)
def get_my_preferences(code: str, authorization: str | None = Header(default=None)):
    return service.get_my_preferences(code, authorization)


@router.put("/api/invites/{code}/me", response_model=Member)
def update_my_preferences(
    code: str, body: Preferences, authorization: str | None = Header(default=None)
):
    return service.update_my_preferences(code, body, authorization)

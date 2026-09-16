from pydantic import BaseModel, ConfigDict, Field


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, strict=True)


class ErrorResponse(Model):
    detail: str


class TitleChange(Model):
    title: str = Field(min_length=1, max_length=60)


class Acknowledged(Model):
    ok: bool = True

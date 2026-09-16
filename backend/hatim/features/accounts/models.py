from pydantic import Field, SecretStr, field_validator

from hatim.core.models import Model


class Credentials(Model):
    handle: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: SecretStr = Field(min_length=10, max_length=128)

    @field_validator("handle")
    @classmethod
    def normalize(cls, value):
        return value.lower()


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=30)


class Account(Model):
    id: str
    handle: str
    name: str


class AccountProfile(Model):
    name: str = Field(min_length=1, max_length=30)


class AccountSession(Model):
    token: str
    account: Account

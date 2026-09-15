"""The same PostgreSQL editorial catalog feeds discovery and both planning flows."""

from .models import Experience


def catalog(db):
    return [
        Experience.model_validate(row["payload"])
        for row in db.execute("SELECT payload FROM experiences ORDER BY id")
    ]

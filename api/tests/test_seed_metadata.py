from app.db.session import Base
from app.models import Exercise


def test_seed_import_path_registers_related_foreign_key_tables() -> None:
    assert Exercise.__table__ is Base.metadata.tables["exercises"]
    assert "users" in Base.metadata.tables
    assert "users.id" in {foreign_key.target_fullname for foreign_key in Exercise.__table__.foreign_keys}

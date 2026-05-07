import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.rbac import ROLE_PERMISSIONS
from app.core.constants import REQUIRED_GST_COLUMNS


def test_super_admin_permissions_cover_admin():
    assert ROLE_PERMISSIONS["ADMIN"].issubset(ROLE_PERMISSIONS["SUPER_ADMIN"])


def test_required_gst_columns_contains_business_keys():
    assert "invoice_number" in REQUIRED_GST_COLUMNS
    assert "invoice_date" in REQUIRED_GST_COLUMNS
    assert "gst_amount" in REQUIRED_GST_COLUMNS

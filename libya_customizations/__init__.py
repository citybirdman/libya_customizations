import frappe
from libya_customizations.utils import make_xlsx

__version__ = "0.0.1"

def override_xlsxutils():
    frappe.utils.xlsxutils.make_xlsx = make_xlsx
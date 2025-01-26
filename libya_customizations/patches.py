import frappe
from libya_customizations.utils import make_xlsx

def override_xlsxutils():
    # Replace the original function with the custom one
    frappe.utils.xlsxutils.make_xlsx = make_xlsx

# Run the patch when the app is initialized
override_xlsxutils()
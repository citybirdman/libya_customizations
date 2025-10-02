import frappe
from frappe import _
from frappe.utils import flt, getdate
def before_update_after_submit(doc, method):
    purchase_receipt = frappe.db.get_value("Purchase Receipt Item", [["purchase_invoice", "=", doc.name]], "parent")
    if purchase_receipt:
        frappe.db.set_value("Purchase Receipt", purchase_receipt, dict(
            freight_account = doc.freight_account,
            freight_account_currency = doc.freight_account_currency,
            freight_amount = doc.freight_amount,
            freight_exchange_rate = doc.freight_exchange_rate,
            inspection_account = doc.inspection_account,
            inspection_account_currency = doc.inspection_account_currency,
            inspection_amount = doc.inspection_amount,
            inspection_exchange_rate = doc.inspection_exchange_rate,
            clearance_account = doc.clearance_account,
            clearance_amount = doc.clearance_amount,
            transport_account = doc.transport_account,
            transport_amount = doc.transport_amount,
            foreign_bank_charges_account = doc.foreign_bank_charges_account,
            foreign_bank_charges_account_currency = doc.foreign_bank_charges_account_currency,
            foreign_bank_charges_amount = doc.foreign_bank_charges_amount,
            foreign_bank_charges_exchange_rate = doc.foreign_bank_charges_exchange_rate,
            local_bank_charges_account = doc.local_bank_charges_account,
            local_bank_charges_amount = doc.local_bank_charges_amount,
        ))
        pr = frappe.get_doc("Purchase Receipt", purchase_receipt)
        pr.save()

def validate_post_carriage_costs(doc, method):
    if not doc.update_stock:
        if not doc.clearance_account:
            frappe.throw(_("Clearance Account is mandatory"))
        if not doc.clearance_amount:
            frappe.throw(_("Clearance Amount is mandatory"))
        if not doc.transport_account:
            frappe.throw(_("Transport Account is mandatory"))
        if not doc.transport_amount:
            frappe.throw(_("Transport Amount is mandatory"))



@frappe.whitelist()
def update_exchange_rate(invoice_name, new_rate):
    """Popup handler to update exchange rate for a submitted Purchase Invoice."""
    doctype = "Purchase Invoice"

    # --- Step 0: Role check ---
    if "Accounts User" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("You are not permitted to perform this action"))

    # --- Step 1: Load document ---
    doc = frappe.get_doc(doctype, invoice_name)
    if doc.docstatus != 1:
        frappe.throw(_("Invoice must be submitted first"))

    # --- Step 2: Check Accounts Settings frozen date ---
    acc_settings = frappe.get_single("Accounts Settings")
    frozen_upto = acc_settings.acc_frozen_upto
    if frozen_upto and getdate(doc.posting_date) <= getdate(frozen_upto):
        frappe.throw(
            _("Cannot update exchange rate. Accounts are frozen up to {0}.")
            .format(frozen_upto)
        )

    # --- Step 3: Cancel invoice (make draft) ---
    _toggle_docstatus(doc, 0)

    # --- Step 4: Update exchange rate ---
    doc.reload()
    doc.set("conversion_rate", flt(new_rate))
    doc.save(ignore_permissions=True)
    # --- Step 5: Resubmit invoice ---
    _toggle_docstatus(doc, 1)

    # --- Step 6: Repost Accounting Ledger ---
    ral = frappe.get_doc({
        "doctype": "Repost Accounting Ledger",
        "company": doc.company,
        "delete_cancelled_entries": 1,
        "vouchers": [
            {"voucher_type": doc.doctype, "voucher_no": doc.name}
        ]
    })
    ral.insert(ignore_permissions=True)
    ral.reload()
    ral.submit()
    return {"status": "success", "msg": _("Exchange rate updated and ledger reposted.")}


def _toggle_docstatus(doc, status):
    """Helper to change docstatus of parent and child tables."""
    doctype = doc.doctype
    frappe.db.set_value(doctype, doc.name, "docstatus", status)
    tables = [item for item in doc.as_dict().values() if isinstance(item, list)]
    for row in tables:
        for child in row:
            frappe.db.set_value(child.doctype, child.name, "docstatus", status)

import frappe
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
	if not doc.clearance_account:
		frappe.throw(_("Clearance Account is mandatory"))
	if not doc.clearance_amount:
		frappe.throw(_("Clearance Amount is mandatory"))
	if not doc.transport_account:
		frappe.throw(_("Transport Account is mandatory"))
	if not doc.transport_amount:
		frappe.throw(_("Transport Amount is mandatory"))

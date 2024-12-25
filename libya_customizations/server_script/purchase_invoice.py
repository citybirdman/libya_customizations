import frappe
def on_update_after_submit(doc, method):
    purchase_receipt = frappe.db.get_value("Purchase Receipt Item", [["docstatus", "=", 1],["purchase_invoice", "=", doc.name]], "parent")
    if purchase_receipt:
        pr = frappe.get_doc("Purchase Receipt", purchase_receipt)
        pr.freight_account = doc.freight_account
        pr.freight_account_currency = doc.freight_account_currency
        pr.freight_amount = doc.freight_amount
        pr.freight_exchange_rate = doc.freight_exchange_rate
        pr.inspection_account = doc.inspection_account
        pr.inspection_account_currency = doc.inspection_account_currency
        pr.inspection_amount = doc.inspection_amount
        pr.inspection_exchange_rate = doc.inspection_exchange_rate
        pr.clearence_account = doc.clearence_account
        pr.clearence_amount = doc.clearence_amount
        pr.transport_account = doc.transport_account
        pr.transport_amount = doc.transport_amount
        pr.foreign_banking_charges_account = doc.foreign_bank_charges_account
        pr.foreign_banking_charges_account_currency = doc.foreign_bank_charges_account_currency
        pr.foreign_banking_charges_amount = doc.foreign_bank_charges_amount
        pr.foreign_banking_charges_exchange_rate = doc.foreign_bank_charges_exchange_rate
        pr.local_banking_charges_account = doc.local_bank_charges_account
        pr.local_banking_charges_amount = doc.local_bank_charges_amount

        pr.save()
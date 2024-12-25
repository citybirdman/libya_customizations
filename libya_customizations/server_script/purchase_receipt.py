import frappe
def on_submit(doc, metod):
    doctype = doc.doctype
    docname = doc.name
    landed_cost_voucher = frappe.new_doc("Landed Cost Voucher")

    details = frappe.db.get_value(doctype, docname, ["supplier", "company", "base_grand_total", "title"], as_dict=1)

    landed_cost_voucher.company = details.company
    
    landed_cost_voucher.receipt_title = details.title

    landed_cost_voucher.append(
        "purchase_receipts",
        {
            "receipt_document_type": doctype,
            "receipt_document": docname,
            "grand_total": details.base_grand_total,
            "supplier": details.supplier,
        },
    )

    landed_costs = []
    if(doc.freight_amount):
        landed_costs.append({
            "expense_account":doc.freight_account,
            "account_currency": doc.freight_account_currency,
            "exchange_rate": doc.freight_exchange_rate,
            "description": "Freight",
            "amount": doc.freight_amount
        })
        
    if(doc.inspection_amount):
        landed_costs.append({
            "expense_account":doc.inspection_account,
            "account_currency": doc.inspection_account_currency,
            "exchange_rate": doc.inspection_exchange_rate,
            "description": "Inspection",
            "amount": doc.inspection_amount
        })
        
    landed_costs.append({
            "expense_account":doc.clearence_account,
            "description": "Clearence",
            "amount": doc.clearence_amount
        })
    
    landed_costs.append({
        "expense_account":doc.transport_account,
        "description": "Transport",
        "amount": doc.transport_amount
    	})

    landed_cost_voucher.get_items_from_purchase_receipts()
    landed_cost_voucher.taxes = landed_costs
    landed_cost_voucher.insert(ignore_permissions=True)
    landed_cost_voucher.submit()


def on_update_after_submit(doc, method):
    landed_cost_voucher_name = frappe.db.get_value("Landed Cost Purchase Receipt", {"receipt_document_type": "Purchase Receipt", "receipt_document": doc.name}, "parent")

    if(doc.freight_amount):
        frappe.db.set_value("Landed Cost Taxes and Charges", {"parent":landed_cost_voucher_name, "expense_account": doc.freight_account}, {
            "expense_account":doc.freight_account,
            "account_currency": doc.freight_account_currency,
            "exchange_rate": doc.freight_exchange_rate,
            "amount": doc.freight_amount
        })
    if(doc.inspection_amount):
        frappe.db.set_value("Landed Cost Taxes and Charges", {"parent":landed_cost_voucher_name, "expense_account": doc.inspection_account}, {
            "expense_account":doc.inspection_account,
            "account_currency": doc.inspection_account_currency,
            "exchange_rate": doc.inspection_exchange_rate,
            "amount": doc.inspection_amount
        })

    frappe.db.set_value("Landed Cost Taxes and Charges", {"parent":landed_cost_voucher_name, "expense_account": doc.clearence_account}, {
            "expense_account":doc.clearence_account,
            "amount": doc.clearence_amount
        })
    
    frappe.db.set_value("Landed Cost Taxes and Charges", {"parent":landed_cost_voucher_name, "expense_account": doc.transport_account}, {
        "expense_account":doc.transport_account,
        "amount": doc.transport_amount
    })
    
    docs = [landed_cost_voucher_name]
    doctype = "Landed Cost Voucher"
    status = 0
    for d in docs:
        d = frappe.get_doc(doctype, d)
        tables = [item for item in d.as_dict().values() if isinstance(item, list)]
        frappe.db.set_value(doctype, d.name, "docstatus", status)
        
        for row in tables:
            for child in row:
                frappe.db.set_value(child.doctype, child.name, "docstatus", status)
        d.save()
        d.submit()
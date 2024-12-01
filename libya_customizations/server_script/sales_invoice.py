import frappe
from frappe import _

def after_submit_sales_invoice_so(doc, method):
    if not (doc.is_return or doc.update_stock or doc.is_opening == "Yes"):
        rows = [{"name": row.so_detail, "qty": row.qty} for row in doc.items]
        for row in rows:
            qty = frappe.db.get_value("Sales Order Item", row["name"], "billed_qty")
            qty = qty if qty else 0
            frappe.db.set_value("Sales Order Item", row["name"], "billed_qty", qty + row["qty"])
        docname = frappe.db.get_value("Sales Order Item", rows[0]['name'], "parent")
        doc = frappe.get_doc("Sales Order", docname)
        flag = True
        for row in doc.items:
            if row.qty != row.billed_qty:
                flag = False
                break
        if flag and doc.per_billed < 100:
            frappe.call("erpnext.selling.doctype.sales_order.sales_order.update_status", status="Closed", name=docname)

def after_submit_sales_invoice_dn(doc, method):
    if not (doc.is_return or doc.update_stock or doc.is_opening == "Yes"):
        rows = [{"name": row.dn_detail, "qty": row.qty} for row in doc.items]

        for row in rows:
            qty = frappe.db.get_value("Delivery Note Item", row["name"], "billed_qty")
            qty = qty if qty else 0
            frappe.db.set_value("Delivery Note Item", row["name"], "billed_qty", qty + row["qty"])
        docname = frappe.db.get_value("Delivery Note Item", rows[0]['name'], "parent")
        total_billed_qty = frappe.db.get_value("Delivery Note Item", {'parent':docname}, 'sum(billed_qty)')
        total_delivered_qty = frappe.db.get_value("Delivery Note Item", {'parent':docname}, 'sum(qty)')
        if total_billed_qty == 0:
            frappe.db.set_value('Delivery Note', docname, 'custom_per_billed', 0)
            frappe.db.set_value('Delivery Note', docname, 'billing_status', 'Not Billed')
        elif total_billed_qty > 0 and total_billed_qty < total_delivered_qty:
            frappe.db.set_value('Delivery Note', docname, 'custom_per_billed', total_billed_qty / total_delivered_qty)
            frappe.db.set_value('Delivery Note', docname, 'billing_status', 'Partly Billed')
        else:
            frappe.db.set_value('Delivery Note', docname, 'custom_per_billed', 100)
            frappe.db.set_value('Delivery Note', docname, 'billing_status', 'Fully Billed')
        
def before_cancel_sales_invoice_so(doc, method):
    if not (doc.is_return or doc.update_stock or doc.is_opening == "Yes"):
        rows = [{"name": row.so_detail, "qty": row.qty} for row in doc.items]

        for row in rows:
            qty = frappe.db.get_value("Sales Order Item", row["name"], "billed_qty")
            qty = qty if qty else 0
            frappe.db.set_value("Sales Order Item", row["name"], "billed_qty", qty - row["qty"])
        docname = frappe.db.get_value("Sales Order Item", rows[0]['name'], "parent")
        doc = frappe.get_doc("Sales Order", docname)
        flag = False
        for row in doc.items:
            if row.qty != row.billed_qty:
                flag = True
                break
        if flag:
            frappe.call("erpnext.selling.doctype.sales_order.sales_order.update_status", status="Draft", name=docname)

def before_cancel_sales_invoice_dn(doc, method):
    if not (doc.is_return or doc.update_stock or doc.is_opening == "Yes"):
        rows = [{"name": row.dn_detail, "qty": row.qty} for row in doc.items]

        for row in rows:
            qty = frappe.db.get_value("Delivery Note Item", row["name"], "billed_qty")
            qty = qty if qty else 0
            frappe.db.set_value("Delivery Note Item", row["name"], "billed_qty", qty - row["qty"])
        docname = frappe.db.get_value("Delivery Note Item", rows[0]['name'], "parent")
        total_billed_qty = frappe.db.get_value("Delivery Note Item", {'parent':docname}, 'sum(billed_qty)')
        total_delivered_qty = frappe.db.get_value("Delivery Note Item", {'parent':docname}, 'sum(qty)')
        if total_billed_qty == 0:
            frappe.db.set_value('Delivery Note', docname, 'custom_per_billed', 0)
            frappe.db.set_value('Delivery Note', docname, 'billing_status', 'Not Billed')
        elif total_billed_qty > 0 and total_billed_qty < total_delivered_qty:
            frappe.db.set_value('Delivery Note', docname, 'custom_per_billed', total_billed_qty / total_delivered_qty)
            frappe.db.set_value('Delivery Note', docname, 'billing_status', 'Partly Billed')
        else:
            frappe.db.set_value('Delivery Note', docname, 'custom_per_billed', 100)
            frappe.db.set_value('Delivery Note', docname, 'billing_status', 'Fully Billed')

            

def before_submit_sales_invoice(doc, method):
    rows = [{"name": row.name, "rate": row.net_rate, "valuation_rate": row.incoming_rate, "item_code": row.item_code, "item_name": row.item_name} for row in doc.items]

    
    if not (frappe.db.get_value("Has Role", [["parent", "=", frappe.session.user], ['role', "=", "Chief Sales Officer"]]) or doc.is_return):
        for row in rows:
            if row['rate'] < row['valuation_rate']:
                frappe.throw(_("<b>Net Rate</b> ({0}) of Item <b>{1}</b> is less than <b>Valuation Rate</b>").format('{:0.2f}'.format(row['rate']), row['item_name']))
            elif not frappe.db.get_value("Has Role", [["parent", "=", frappe.session.user], ['role', "in", ["Sales Supervisor", "Chief Sales Officer"]]]):
                for row in rows:
                    price_list_rate = frappe.db.get_value("Item Price", [["item_code","=", row['item_code']], ["price_list", "=", doc.selling_price_list]], "price_list_rate")
                    if row['rate'] < price_list_rate:
                        frappe.throw(_("<b>Net Rate</b> ({0}) of Item <b>{1}</b> is less than <b>Price List Rate</b> ({2})").format('{:0.2f}'.format(row['rate']), row['item_name'], '{:0.2f}'.format(price_list_rate)))

def create_payment(doc, method):
	if doc.is_paid and not doc.is_return:
		references = []
		references.append({
			'reference_doctype': 'Sales Invoice',
			'reference_name': doc.name,
			'total_amount': doc.grand_total,
			'outstanding_amount': doc.outstanding_amount,
			'allocated_amount': doc.grand_total,
			'due_date': doc.due_date,
			'exchange_rate': doc.conversion_rate
        }) 
		payment_entry = frappe.get_doc({
			"doctype": "Payment Entry",
			"payment_type": "Receive",
			"party_type": "Customer",
			"party": doc.customer,
			"company": doc.company,
			"posting_date": doc.posting_date,
			"paid_amount": abs(doc.grand_total),
			"received_amount": abs(doc.grand_total),
			"paid_from": doc.debit_to,
			"paid_to": doc.payment_account,
			"target_exchange_rate": doc.conversion_rate,
			"paid_to_account_currency": doc.currency,
			"source_exchange_rate": doc.conversion_rate,
			"paid_from_account_currency": doc.currency,
			"reference_no": doc.name,
			"custom_voucher_type": "Sales Invoice",
			"custom_voucher_no": doc.name,
			"reference_date": doc.posting_date,
			"references": references,
			'cannot_be_cancelled': 1
		})
		payment_entry.insert(ignore_permissions=True)
		payment_entry.submit()
	elif doc.is_paid and doc.is_return:
		accounts = []
		accounts.append({
			'account': doc.payment_account,
			'exchange_rate': doc.conversion_rate,
			'credit_in_account_currency': abs(doc.grand_total)
        })
		accounts.append({
			'account': doc.debit_to,
			'party_type': 'Customer',
			'party': doc.customer,
			'exchange_rate': doc.conversion_rate,
			'debit_in_account_currency': abs(doc.grand_total),
			'reference_type': 'Sales Invoice',
			'reference_name': doc.name
		})
		payment_account_type = frappe.db.get_value('Account', doc.payment_account, 'account_type')
		journal_entry = frappe.get_doc({
			'doctype': 'Journal Entry',
			'company': doc.company,
			'posting_date': doc.posting_date,
			'accounts': accounts,
			'voucher_type': payment_account_type + ' Entry',
			'cheque_no': doc.name,
			'cheque_date': doc.posting_date,
			'custom_voucher_type': 'Sales Invoice',
			'custom_voucher_no': doc.name,
			'multi_currency': 1,
			'cannot_be_cancelled': 1
		}).insert(ignore_permissions=True)
		journal_entry.submit()

def reconcile_payments(doc, method):
	company = doc.company
	account = doc.debit_to
	customer = doc.customer
	outstanding_documents = frappe.call('erpnext.accounts.doctype.payment_entry.payment_entry.get_outstanding_reference_documents', args = {'party_type':'Customer', 'party':customer, 'party_account':account}) or 0
	flag = False
	if outstanding_documents:
		total = 0
		for i in outstanding_documents:
			if i.outstanding_amount > 0:
				flag = True
				break
	if flag:
		unallocated_amount = frappe.db.get_value("Payment Entry", [["party", "=", customer], ["unallocated_amount", ">", 0], ["docstatus", "=", 1]], "sum(unallocated_amount)") or 0
		credit_amount = frappe.db.get_value("Journal Entry Account", [["party", "=", customer], ["credit", ">", 0], ["reference_name", "=", None], ["docstatus", "=", 1]], "sum(credit)") or 0
		cn_amount = frappe.db.get_value("Sales Invoice", [["customer", "=", customer], ["outstanding_amount", "<", 0], ["is_return", "=", 1], ["docstatus", "=", 1]], "sum(outstanding_amount)") or 0
		if unallocated_amount or credit_amount or cn_amount:
			reconciliation = frappe.get_doc({
				"doctype": "Process Payment Reconciliation",
				"party_type": "Customer",
				"party" : customer,
				"company": company,
				"receivable_payable_account": account,
				"default_advance_account": account
			}).insert(ignore_permissions=True)
			reconciliation.save(ignore_permissions=True)
			reconciliation.submit()

def reconcile_everything(doc, method):
	frappe.call("erpnext.accounts.doctype.process_payment_reconciliation.process_payment_reconciliation.trigger_reconciliation_for_queued_docs")

def cancel_linked_payment(doc, method):
	if doc.is_paid:
		if doc.is_return:
			doctype = 'Journal Entry'
		else:
			doctype = "Payment Entry"
		entries = frappe.db.get_list(doctype, filters={'custom_voucher_no': doc.name})
		for entry in entries:
			e = frappe.get_doc(doctype, entry.name)
			if e.docstatus == 1:
				e.cancel()

def delete_linked_payment(doc, method):
	if doc.is_paid:
		if doc.is_return:
			doctype = 'Journal Entry'
		else:
			doctype = "Payment Entry"
		entries = frappe.db.get_list(doctype, filters={'custom_voucher_no': doc.name})
		for entry in entries:
			frappe.delete_doc(doctype, entry.name, force=True)

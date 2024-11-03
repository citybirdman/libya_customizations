# Copyright (c) 2024, Ahmed Zaytoon and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ReceiptVoucher(Document):
	def validate(self):
		if self.base_paid_amount != self.base_received_amount:
			frappe.msgprint(msg=f'Paid Amount in Company Currency not equal to Received Amount in Company Currency', title='Mismatch', indicator='red')
			raise frappe.ValidationError
		
	def on_trash(self):
		doctype = 'Journal Entry'
		if self.receipt_from == "Customer":
			doctype = "Payment Entry"
		lst = frappe.db.get_list(doctype, filters={'custom_voucher_no': self.name})
		for dn in lst:
			frappe.delete_doc(doctype, dn.name, force=True)

	def before_cancel(self):
		doctype = 'Journal Entry'
		if self.receipt_from == "Customer":
			doctype = "Payment Entry"
		lst = frappe.db.get_list(doctype, filters={'custom_voucher_no': self.name})
		for dn in lst:
			d = frappe.get_doc(doctype, dn.name)
			if d.docstatus == 1:
				d.cancel()


	def on_submit(self):
		if self.receipt_from == "Customer":
			payment_entry = frappe.get_doc({
				"doctype": "Payment Entry",
				"payment_type": "Receive",
				"party_type": "Customer",
				"party": self.party,
				"company": self.company,
				"posting_date": self.posting_date,
				"paid_amount": abs(self.paid_amount),
				"received_amount": abs(self.received_amount),
				"paid_from": self.paid_from,
				"paid_to": self.paid_to,
				"target_exchange_rate": self.target_exchange_rate,
				"paid_to_account_currency": self.paid_to_account_currency,
				"source_exchange_rate": self.source_exchange_rate,
				"paid_from_account_currency": self.paid_from_account_currency,
				"reference_no": self.name,
				"custom_voucher_type": "Receipt Voucher",
				"custom_voucher_no": self.name,
				"reference_date": self.posting_date,
				"custom_remarks": 1,
				'remarks': self.remark
			})
			payment_entry.insert()
			payment_entry.submit()
			self.reconcile_everything()
		else:
			accounts = []
			accounts.append({
				'account': self.paid_from,
				'party_type': self.party_type,
				'party': self.party,
				'exchange_rate': self.source_exchange_rate,
				'credit_in_account_currency': abs(self.paid_amount),
				'branch': 'Main'
			})
			accounts.append({
				'account': self.paid_to,
				'exchange_rate': self.target_exchange_rate,
				'debit_in_account_currency': abs(self.received_amount),
				'branch': 'Main'
			})
			journal_entry = frappe.get_doc({
				'doctype': 'Journal Entry',
				'company': self.company,
				'posting_date': self.posting_date,
				'accounts': accounts,
				'voucher_type': self.paid_to_account_type + ' Entry',
				'cheque_no': self.name,
				'cheque_date': self.posting_date,
				'custom_voucher_type': 'Receipt Voucher',
				'custom_voucher_no': self.name,
				'user_remark': self.remark,
				'multi_currency': 1,
				'remark': self.remark
			}).insert()
			journal_entry.submit()
			self.on_update_after_submit()


	def on_update_after_submit(self):
		doctype = 'Journal Entry'
		affected_field = "remark"
		if self.receipt_from == "Customer":
			doctype = "Payment Entry"
			affected_field = "remarks"
		linked_doc = frappe.db.get_value(doctype, {"custom_voucher_no": self.name}, "name")
		if linked_doc:
			frappe.db.set_value("GL Entry", {"voucher_no": linked_doc}, "remarks", self.remark)
			frappe.db.set_value(doctype, linked_doc, affected_field, self.remark)


	def reconcile_payments(self):
		for company in frappe.get_all("Company"):
			company = company.name
			account = frappe.db.get_value("Company", company, "default_receivable_account")
			for customer in frappe.get_all("Customer"):
				outstanding_documents = frappe.call('erpnext.accounts.doctype.payment_entry.payment_entry.get_outstanding_reference_documents', args = {'party_type':'Customer', 'party':customer.name, 'party_account':account}) or 0
				flag = False
				if outstanding_documents:
					total = 0
					for i in outstanding_documents:
						if i.outstanding_amount > 0:
							flag = True
							break
				if flag:
					unallocated_amount = frappe.db.get_value("Payment Entry", [["party", "=", customer.name], ["unallocated_amount", ">", 0], ["docstatus", "=", 1]], "sum(unallocated_amount)") or 0
					credit_amount = frappe.db.get_value("Journal Entry Account", [["party", "=", customer.name], ["credit", ">", 0], ["reference_name", "=", None], ["docstatus", "=", 1]], "sum(credit)") or 0
					if unallocated_amount or credit_amount:
						reconciliation = frappe.get_doc({
							"doctype": "Process Payment Reconciliation",
							"party_type": "Customer",
							"party" : customer.name,
							"company": company,
							"receivable_payable_account": account,
							"default_advance_account": account
						}).insert()
						reconciliation.save()
						reconciliation.submit()

	def reconcile_everything(self):
		self.reconcile_payments()
		frappe.call("erpnext.accounts.doctype.process_payment_reconciliation.process_payment_reconciliation.trigger_reconciliation_for_queued_docs")

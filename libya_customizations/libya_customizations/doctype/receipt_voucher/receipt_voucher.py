# Copyright (c) 2024, Ahmed Zaytoon and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ReceiptVoucher(Document):
	def validate(self):
		if self.base_paid_amount != self.base_received_amount:
			frappe.msgprint(msg=f'Paid Amount in Company Currency not equal to Received Amount in Company Currency', title='Mismatch', indicator='red')
			raise frappe.ValidationError
		
	def delete(self):
		doc = frappe.db.get_value('Journal Entry', filters={'custom_voucher_no': self.name})
		doc.delete()

	def on_submit(self):
		# frappe.throw("error")
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
				"reference_no": self.name,
				"custom_reference_no": self.name,
				"reference_date": self.posting_date,
			})
			payment_entry.insert()
			payment_entry.submit()
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
				'multi_currency': 1
			}).insert()
			journal_entry.submit()
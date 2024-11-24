# Copyright (c) 2024, Ahmed Zaytoon and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class TransferVoucher(Document):
	def validate(self):
		if self.base_paid_amount != self.base_received_amount:
			frappe.msgprint(msg=_(f'Paid Amount in Company Currency not equal to Received Amount in Company Currency'), title=_('Mismatch'), indicator='red')
			raise frappe.ValidationError
	
	def on_submit(self):
		payment_entry = frappe.get_doc({
			"doctype": "Payment Entry",
			"payment_type": "Internal Transfer",
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
			"custom_voucher_type": "Transfer Voucher",
			"custom_voucher_no": self.name,
			"reference_date": self.posting_date,
			"custom_remarks": 1,
			'remarks': self.remark
		})
		# frappe.throw(repr(self.remark))
		payment_entry.insert(ignore_permissions=True)
		payment_entry.submit(ignore_permissions=True)


	def on_trash(self):
		doctype = "Payment Entry"
		lst = frappe.db.get_list(doctype, filters={'custom_voucher_no': self.name})
		for dn in lst:
			frappe.delete_doc(doctype, dn.name, force=True)

	def before_cancel(self):
		doctype = "Payment Entry"
		lst = frappe.db.get_list(doctype, filters={'custom_voucher_no': self.name})
		for dn in lst:
			d = frappe.get_doc(doctype, dn.name)
			if d.docstatus == 1:
				d.cancel()

	def on_update_after_submit(self):
		doctype = "Payment Entry"
		affected_field = "remarks"
		linked_doc = frappe.db.get_value(doctype, {"custom_voucher_no": self.name}, "name")
		if linked_doc:
			frappe.db.set_value("GL Entry", {"voucher_no": linked_doc}, "remarks", self.remark)
			frappe.db.set_value(doctype, linked_doc, affected_field, self.remark)
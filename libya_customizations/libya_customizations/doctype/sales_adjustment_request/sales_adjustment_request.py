# Copyright (c) 2024, Ahmed Zaytoon and contributors
# For license information, please see license.txt

import frappe
import frappe.query_builder
import frappe.query_builder.functions
from frappe.utils import nowdate, nowtime
from frappe.model.document import Document


class SalesAdjustmentRequest(Document):
	def on_submit(self):
		if(len(self.increased_items)):
			sales_order = self.create_sales_order(self.increased_items)
			delivery_note = self.create_delivery_note(sales_order)
			self.create_sales_invoice(delivery_note)

		if(len(self.decreased_items)):
			self.create_return_sales_invoice()

	def create_sales_order(self, items):
		sales_invoice = frappe.get_doc("Sales Invoice", self.sales_invoice)

		sales_order = frappe.new_doc("Sales Order")

		sales_order.customer = sales_invoice.customer
		sales_order.transaction_date = nowdate()
		sales_order.company = sales_invoice.company
		sales_order.currency = sales_invoice.currency
		sales_order.set_warehouse = sales_invoice.set_warehouse
		sales_order.sales_adjustment_request = self.name
		sales_order.selling_price_list = sales_invoice.selling_price_list

		for item in items:
			sales_order.append("items", {
				"item_code": item.item_code,
				"qty": item.qty,
				"rate": item.rate,
				"warehouse": sales_invoice.set_warehouse,
			})

		sales_order.insert(ignore_permissions=True)
		sales_order.submit()
		return sales_order

	def create_delivery_note(self, so):
		items_to_load = []
		for item in so.items:
			items_to_load.append({
				'item_code': item.item_code,
				'qty': item.qty,
				'against_sales_order': so.name,
				'so_detail':item.name,
				'warehouse': so.set_warehouse,
				'rate': item.rate,
				'price_list_rate': item.price_list_rate
			})
		delivery_note = frappe.get_doc(dict(
			doctype = 'Delivery Note',
			customer = so.customer,
			company = so.company,
			posting_date = frappe.utils.nowdate(),
			posting_time = frappe.utils.nowtime(),
			set_posting_time = 1,
			set_warehouse = so.set_warehouse,
			sales_adjustment_request= self.name,
			selling_price_list = so.selling_price_list,
			additional_discount_percentage = so.additional_discount_percentage,
			taxes = so.taxes,
			sales_team = so.sales_team,
			items = items_to_load
		)).insert(ignore_permissions=True)
		delivery_note.submit()
		return delivery_note
	
	def create_sales_invoice(self, dn):
		items_to_load = []
		for item in dn.items:
			items_to_load.append({
				'item_code': item.item_code,
				'qty': item.qty,
				'delivery_note': dn.name,
				'dn_detail':item.name,
				'so_detail': item.so_detail,
				'sales_order': item.against_sales_order,
				'warehouse': dn.set_warehouse,
				'rate': item.rate,
				'price_list_rate': item.price_list_rate
			})
		sales_invoice = frappe.get_doc(dict(
            doctype = 'Sales Invoice',
            customer = dn.customer,
            company = dn.company,
            docstatus = 0,
            posting_date = nowdate(),
            posting_time = nowtime(),
            set_posting_time = 1,
            set_warehouse = dn.set_warehouse,
			sales_adjustment_request= self.name,
            selling_price_list = dn.selling_price_list,
            additional_discount_percentage = dn.additional_discount_percentage,
            taxes = dn.taxes,
            sales_team = dn.sales_team,
            items = items_to_load
        )).insert(ignore_permissions=True)
		sales_invoice.submit()
	
	def create_return_sales_invoice(self):
		items_to_load = []
		si = frappe.get_doc("Sales Invoice", self.sales_invoice)

		# Prepare item data with reversed quantities
		for item in self.decreased_items:
			items_to_load.append({
				'item_code': item.item_code,
				'qty': item.qty * -1,
				'warehouse': si.set_warehouse,
				'rate': item.rate,
			})

		# Create a new Sales Invoice with `is_return` set to True
		sales_invoice = frappe.get_doc(dict(
			doctype='Sales Invoice',
			customer=si.customer,
			company=si.company,
			posting_date=nowdate(),
			posting_time=nowtime(),
			set_posting_time=1,
			update_stock=1,
			is_return=1,  # Mark as a return
			against_sales_invoice=self.sales_invoice,
			set_warehouse=si.set_warehouse,
			sales_adjustment_request=self.name,
			selling_price_list=si.selling_price_list,
			additional_discount_percentage=si.additional_discount_percentage,
			taxes=si.taxes,  # Copy taxes from the original
			sales_team=si.sales_team,  # Copy sales team data from the original
			items=items_to_load  # Load reversed items
		)).insert(ignore_permissions=True)
		sales_invoice.submit()

@frappe.whitelist()
def get_item_price(item):
	
	item_price = frappe.qb.DocType("Item Price")
	singles = frappe.qb.DocType("Singles")

	price_list = (
		frappe.qb.from_(singles)
		.select(singles.value)
		.where(
			(singles.doctype == "Selling Settings")
			&(singles.field == "selling_price_list")
		)
	)
	main_query = (
		frappe.qb.from_(item_price)
		.select(item_price.price_list_rate)
		.where(
			(item_price.price_list == price_list)
			&(item_price.item_code == item)
		)
	)

	result = main_query.run()
	return result[0][0]
import frappe
import json
@frappe.whitelist()
def get_purchase_invoice_data(purchase_invoice, price_list):
	sql = """
	WITH 
	stock_ledger_entry_invoice AS (
		SELECT
			stock_ledger_entry.item_code,
			item.item_name,
			item.brand,
			SUM(stock_ledger_entry.actual_qty) AS qty,
			SUM(stock_ledger_entry.stock_value_difference) AS total_cost_amount
		FROM `tabStock Ledger Entry` stock_ledger_entry
		INNER JOIN `tabItem` item ON stock_ledger_entry.item_code = item.name
		WHERE stock_ledger_entry.is_cancelled = 0
		AND stock_ledger_entry.voucher_type = 'Purchase Invoice' AND stock_ledger_entry.voucher_no = %s
		GROUP BY stock_ledger_entry.item_code
	),
	stock_ledger_entry_qty AS (
		SELECT item_code, SUM(actual_qty) AS actual_qty
		FROM `tabStock Ledger Entry`
		WHERE is_cancelled = 0
		GROUP BY item_code
	),
	stock_ledger_entry_value AS (
		SELECT item_code, SUM(actual_qty) AS actual_qty, SUM(stock_value_difference) AS stock_value
		FROM `tabStock Ledger Entry`
		WHERE is_cancelled = 0
		GROUP BY item_code
	),
	item_price AS (
		SELECT name, item_code, price_list_rate
		FROM `tabItem Price`
		WHERE selling = 1
		AND price_list = %s
	)
	SELECT
		slei.item_code,
		slei.item_name,
		slei.brand,
		slei.qty AS invoice_qty,
		slei.total_cost_amount / slei.qty AS invoice_valuation_rate,
		IFNULL(sle_qty.actual_qty, 0) AS stock_qty,
		IFNULL(sle_value.stock_value, 0) / IFNULL(sle_value.actual_qty, 0) AS stock_valuation_rate,
		ip.price_list_rate AS selling_price,
		ip.name AS price_name
	FROM stock_ledger_entry_invoice slei
	LEFT JOIN stock_ledger_entry_qty sle_qty ON slei.item_code = sle_qty.item_code
	LEFT JOIN stock_ledger_entry_value sle_value ON slei.item_code = sle_value.item_code
	LEFT JOIN item_price ip ON slei.item_code = ip.item_code
	ORDER BY slei.brand
	"""

	return frappe.db.sql(sql, values=[purchase_invoice, price_list], as_dict=1)

@frappe.whitelist()
def edit_item_price(values, selling_price_list):
	values = json.loads(values)
	for row in values:
		plr = frappe.db.get_value("Item Price", row['name'], "price_list_rate")
		if (plr or plr == 0) and plr != row['price']:
			frappe.db.set_value("Item Price", row['name'], "price_list_rate", row['price'])
		if plr is None:
			item_price = frappe.get_doc({
				"doctype": "Item Price",
				"item_code": row['item_code'],
				"item_name": row['item_name'],
				"price_list": selling_price_list,
				"price_list_rate": row['price']
			})
			item_price.insert()

def make_payment_entry(doc):
	if frappe.db.exists("Payment Entry", {
		"custom_voucher_type": "Purchase Invoice",
		"custom_voucher_no": doc.name,
		"docstatus": 1
	}):
		return
	if doc.custom_is_paid and doc.custom_payment_account:
		payment_dict = {
			"payment_type":"Pay",
			"posting_date":doc.posting_date,
			"company": doc.company,
			"party_type":"Supplier",
			"party":doc.supplier,
			"paid_from": doc.custom_payment_account,
			"paid_to": doc.credit_to,
			"paid_amount":doc.grand_total,
			"received_amount":doc.grand_total,
			"reference_no":doc.name,
			"reference_date":doc.posting_date,
			"custom_voucher_type":"Purchase Invoice",
			"custom_voucher_no":doc.name,
			"branch": doc.branch,
			"cost_center":doc.cost_center,
			"doctype":"Payment Entry"
		}
		payment_entry = frappe.get_doc(payment_dict)
		payment_entry.insert(ignore_permissions=True)
		payment_entry.submit()

def on_submit(doc, method = None):
	make_payment_entry(doc)

def on_update_after_submit(doc, method = None):
	make_payment_entry(doc)

def on_cancel(doc, method = None):
	payment_entries = frappe.get_all("Payment Entry", filters={
		"custom_voucher_type": "Purchase Invoice",
		"custom_voucher_no": doc.name,
		"docstatus": 1
	}, pluck="name")
	for pe in payment_entries:
		try:
			payment_entry_doc = frappe.get_doc("Payment Entry", pe)
			payment_entry_doc.cancel()
		except Exception as e:
			frappe.log_error(message = frappe.get_traceback(), title = f"Error cancelling Payment Entry {pe} for Purchase Invoice {doc.name}")

def update_status(doc, method = None):

	def get_ord_status(is_paid, is_return = 0, is_opening = "No"):
		if is_opening == 'Yes':
			return "Opening"
		elif not is_paid and not is_return:
			return "Credit Invoice"
		elif is_paid and not is_return:
			return "Cash Invoice"
		elif is_return and not is_paid:
			return "Credit Return"
		elif is_paid and is_return:
			return "Cash Return"

	if method in ["before_update_after_submit", "before_submit"]:
		doc.custom_payment_status = get_ord_status(doc.custom_is_paid, doc.is_return, doc.is_opening)		
	elif method == "before_cancel":
		doc.custom_payment_status = "Cancelled"
	return doc.custom_payment_status
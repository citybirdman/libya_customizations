import frappe
from frappe import _

def after_submit_sales_order(doc, method):
    flag = False
    for row in doc.items:
        balances = frappe.db.sql(f"""
			SELECT
                IF(sales_future.future_qty_to_deliver > purchase_future.future_balance, stock_actual.actual_balance - (sales_actual.actual_qty_to_deliver + (sales_future.future_qty_to_deliver - purchase_future.future_balance)), stock_actual.actual_balance-sales_actual.actual_qty_to_deliver) AS actual_available_qty,
                (stock_actual.actual_balance + purchase_future.future_balance) - (sales_actual.actual_qty_to_deliver + sales_future.future_qty_to_deliver) AS future_available_qty
            FROM
                (
                SELECT
                    COALESCE(SUM(actual_qty), 0) AS actual_balance
                FROM
                    `tabStock Ledger Entry`
                WHERE
                    is_cancelled = 0
                AND
                    item_code = "{row.item_code}"
                AND
                    warehouse="{doc.set_warehouse}"
                ) stock_actual
            LEFT JOIN
                (
                SELECT
                    COALESCE(SUM(purchase_receipt_item.qty), 0) AS future_balance
                FROM
                    `tabPurchase Receipt Item` purchase_receipt_item
                INNER JOIN
                    `tabPurchase Receipt` purchase_receipt
                ON
                    purchase_receipt_item.parent = purchase_receipt.name
                WHERE
                    purchase_receipt_item.docstatus = 0
                AND
                    purchase_receipt.docstatus = 0
                AND
                    purchase_receipt.virtual_receipt = 1
                AND
                    purchase_receipt_item.item_code = "{row.item_code}"
                AND
                    purchase_receipt_item.warehouse = "{doc.set_warehouse}"
                ) purchase_future
            ON
                TRUE
            LEFT JOIN
                (
                SELECT
                    COALESCE(SUM(qty_to_deliver), 0) AS actual_qty_to_deliver
                FROM
                    (
                    SELECT
                        sales_order.name AS sales_order,
                        sales_order.set_warehouse,
                        sales_order_item.item_code,
                        IF(COALESCE(SUM(sales_order_item.qty - sales_order_item.delivered_qty), 0) > 0, COALESCE(SUM(sales_order_item.qty - sales_order_item.delivered_qty), 0), 0) AS qty_to_deliver
                    FROM
                        `tabSales Order Item` sales_order_item
                    INNER JOIN
                        `tabSales Order` sales_order
                    ON
                        sales_order_item.parent = sales_order.name
                    INNER JOIN
                        `tabItem` item
                    ON
                        sales_order_item.item_code = item.name
                    WHERE
                        sales_order.docstatus = 1
                    AND
                        sales_order_item.docstatus = 1
                    AND
                        sales_order.status NOT IN ('Completed', 'Closed')
                    AND
                        sales_order.reservation_status NOT IN ('Reserve against Future Receipts')
                    AND
                        sales_order_item.qty - sales_order_item.delivered_qty > 0
                    AND
                        item.is_stock_item = 1
                    GROUP BY
                        sales_order.name,
                        sales_order.set_warehouse,
                        sales_order_item.item_code
                    ) sales_order_item
                WHERE
                    item_code = "{row.item_code}"
                AND
                    set_warehouse = "{doc.set_warehouse}"
                ) sales_actual
            ON
                TRUE
            LEFT JOIN
                (
                SELECT
                    COALESCE(SUM(qty_to_deliver), 0) AS future_qty_to_deliver
                FROM
                    (
                    SELECT
                        sales_order.name AS sales_order,
                        sales_order.set_warehouse,
                        sales_order_item.item_code,
                        IF(COALESCE(SUM(sales_order_item.qty - sales_order_item.delivered_qty), 0) > 0, COALESCE(SUM(sales_order_item.qty - sales_order_item.delivered_qty), 0), 0) AS qty_to_deliver
                    FROM
                        `tabSales Order Item` sales_order_item
                    INNER JOIN
                        `tabSales Order` sales_order
                    ON
                        sales_order_item.parent = sales_order.name
                    INNER JOIN
                        `tabItem` item
                    ON
                        sales_order_item.item_code = item.name
                    WHERE
                        sales_order.docstatus = 1
                    AND
                        sales_order_item.docstatus = 1
                    AND
                        sales_order.status NOT IN ('Completed', 'Closed')
                    AND
                        sales_order.reservation_status IN ('Reserve against Future Receipts')
                    AND
                        sales_order_item.qty - sales_order_item.delivered_qty > 0
                    AND
                        item.is_stock_item = 1
                    GROUP BY
                        sales_order.name,
                        sales_order.set_warehouse,
                        sales_order_item.item_code
                    ) sales_order_item
                WHERE
                    item_code = "{row.item_code}"
                AND
                    set_warehouse = "{doc.set_warehouse}"
                ) sales_future
            ON
                TRUE
        """, as_dict= True)
        balances = balances[0]
        if doc.reservation_status == "Reserve against Future Receipts" and frappe.db.get_value("Has Role", [["parent", "=", frappe.session.user], ['role', "=", "Chief Sales Officer"]]):
            if balances.future_available_qty < 0:
                frappe.msgprint(_(f"{balances.future_available_qty} units needed for {row.item_name}"))
                flag = True
        else:
            if balances.actual_available_qty < 0:
                frappe.msgprint(_(f"{balances.actual_available_qty} units needed for {row.item_name}"))
                flag = True
    if flag:
        raise frappe.ValidationError
    
def before_save_sales_order(doc, method):
    doc = frappe.get_doc(doc)
    if doc.reservation_status == "Reserve against Future Receipts" and not frappe.db.get_value("Has Role", [["parent", "=", frappe.session.user], ['role', "=", "Chief Sales Officer"]]):
        frappe.throw(_("You do not have the authority to choose Reserve against Future Receipts!"))

def after_update_after_submit_sales_order(doc, method):
    doc = frappe.get_doc(doc)
    after_submit_sales_order(doc, method)

def validate_before_submit_sales_order(doc, method):
    bypass_overdue_check = frappe.db.get_value('Customer', doc.customer, 'bypass_overdue_check')
    user_has_cso = frappe.db.get_value("Has Role", [["parent", "=", frappe.session.user], ['role', "=", "Chief Sales Officer"]])
    outstanding = frappe.db.get_value('Sales Invoice', {'docstatus': 1, 'customer': doc.customer, 'posting_date': ['<', frappe.utils.add_days(frappe.utils.nowdate(), - credit_days)]}, 'sum(outstanding_amount)')
    outstanding = outstanding if outstanding else 0
    credit_days = frappe.db.get_value('Payment Terms Template Detail', {'parent': doc.payment_terms_template}, 'credit_days')

    if outstanding > 0 and not (bypass_overdue_check and user_has_cso):
        frappe.msgprint(msg=_(f"There are overdue outstandings valued at {outstanding:,f} against the Customer"), title=_('Error'), indicator='red')
        raise frappe.ValidationError
    elif outstanding > 0 and (bypass_overdue_check or user_has_cso):
        frappe.msgprint(msg=_(f"There are overdue outstandings valued at {outstanding:,f} against the Customer"), title=_('Warning'), indicator='orange')    


@frappe.whitelist()
def get_customer_info(customer):
    sql = frappe.db.sql(f"""SELECT
	gl_entry.customer_balance,
	sales_invoice_actual.customer_actual_overdues,
	sales_invoice_potential.customer_potential_overdues,
	customer_credit_limit.customer_credit_limit,
	sales_order_item.unbilled_sales_orders,
	IF((gl_entry.customer_balance + sales_order_item.unbilled_sales_orders > customer_credit_limit.customer_credit_limit AND customer_credit_limit.customer_credit_limit > 0) OR sales_invoice_actual.customer_actual_overdues > 0, '#FF0000', IF((gl_entry.customer_balance + sales_order_item.unbilled_sales_orders > customer_credit_limit.customer_credit_limit * 0.85 AND customer_credit_limit.customer_credit_limit > 0) OR sales_invoice_potential.customer_potential_overdues > 0, '#FFA500', '#008000')) AS customer_index
FROM
	(
	SELECT
		COALESCE(SUM(debit - credit), 0) AS customer_balance
	FROM
		`tabGL Entry`
	WHERE
		is_cancelled = 0
	AND
		party_type = 'Customer'
	AND
		party = "{customer}"
	) gl_entry
LEFT JOIN
	(
	SELECT
		COALESCE(SUM(sales_invoice.outstanding_amount), 0) AS customer_actual_overdues
	FROM
		`tabSales Invoice` sales_invoice
	LEFT JOIN
		(
		SELECT
			customer.name,
			COALESCE(payment_terms_template_detail.credit_days, 0) AS credit_days
		FROM
			`tabCustomer` customer
		LEFT JOIN
			`tabPayment Terms Template Detail` payment_terms_template_detail
		ON
			customer.payment_terms = payment_terms_template_detail.parent
		) customer
	ON
		sales_invoice.customer = customer.name
	WHERE
		sales_invoice.docstatus = 1
	AND
		sales_invoice.is_return = 0
	AND
		sales_invoice.outstanding_amount > 0
	AND
		DATE(DATE_ADD(NOW(), INTERVAL 2 HOUR)) >= DATE_ADD(sales_invoice.posting_date, INTERVAL customer.credit_days DAY)
	AND
		sales_invoice.customer = "{customer}"
	) sales_invoice_actual
ON
	TRUE
LEFT JOIN
	(
	SELECT
		COALESCE(SUM(sales_invoice.outstanding_amount), 0) AS customer_potential_overdues
	FROM
		`tabSales Invoice` sales_invoice
	LEFT JOIN
		(
		SELECT
			customer.name,
			COALESCE(payment_terms_template_detail.credit_days, 0) AS credit_days
		FROM
			`tabCustomer` customer
		LEFT JOIN
			`tabPayment Terms Template Detail` payment_terms_template_detail
		ON
			customer.payment_terms = payment_terms_template_detail.parent
		) customer
	ON
		sales_invoice.customer = customer.name
	WHERE
		sales_invoice.docstatus = 1
	AND
		sales_invoice.is_return = 0
	AND
		sales_invoice.outstanding_amount > 0
	AND
		DATE(DATE_ADD(NOW(), INTERVAL 2 HOUR)) < DATE_ADD(sales_invoice.posting_date, INTERVAL customer.credit_days DAY)
	AND
		DATE(DATE_ADD(NOW(), INTERVAL 2 HOUR)) >= DATE_ADD(sales_invoice.posting_date, INTERVAL FLOOR(customer.credit_days * 0.85) DAY)
	AND
		sales_invoice.customer = "{customer}"
	) sales_invoice_potential
ON
	TRUE
LEFT JOIN
	(
	SELECT
		COALESCE(SUM(credit_limit), 0) AS customer_credit_limit
	FROM
		`tabCustomer Credit Limit`
	WHERE
		parenttype = 'Customer'
	AND
		parent = "{customer}"
	
	) customer_credit_limit
ON
	TRUE
LEFT JOIN
	(
	SELECT
		COALESCE(SUM((sales_order_item.amount - sales_order_item.billed_amt) * sales_order.grand_total / sales_order.total), 0) AS unbilled_sales_orders
	FROM
		`tabSales Order Item` sales_order_item
	INNER JOIN
		`tabSales Order` sales_order
	ON
		sales_order_item.parent = sales_order.name
	WHERE
		sales_order_item.docstatus = 1
	AND
		sales_order.docstatus = 1
	AND
		sales_order.status NOT IN ('Closed', 'Completed')
	AND
		sales_order_item.amount - sales_order_item.billed_amt > 0
	AND
		sales_order.customer = "{customer}"
	) sales_order_item
ON
	TRUE""", as_dict=True)
    return sql

import json

@frappe.whitelist()
def create_dn_from_so(doc):
    doc = json.loads(doc)
    draft_linked_dn = frappe.db.get_all('Delivery Note Item', {'against_sales_order':doc['name'], 'docstatus':0}, 'parent')
    if draft_linked_dn:
        dn_name = draft_linked_dn[0]['parent']
        frappe.msgprint(msg=_(f"There is a draft Delivery Note <b>{dn_name}</b>, please delete or submit it to move forward"), title=_('Error'), indicator='red') 
        raise frappe.ValidationError
    else:
        items_to_load = []
        for item in doc['items']:
            if item['qty'] - item['delivered_qty'] > 0:
                rate = frappe.db.get_value("Sales Order Item", item['name'], 'rate')
                items_to_load.append({
                    'item_code': item['item_code'],
                    'qty': item['qty'] - item['delivered_qty'],
                    'against_sales_order': doc['name'],
                    'so_detail':item['name'],
                    'warehouse': doc['set_warehouse'],
                    'rate': rate,
                    'price_list_rate': item['price_list_rate']
                })
        delivery_note = frappe.get_doc(dict(
            doctype = 'Delivery Note',
            customer = doc['customer'],
            company = doc['company'],
            docstatus = 0,
            posting_date = frappe.utils.nowdate(),
            posting_time = frappe.utils.nowtime(),
            set_posting_time = 1,
            set_warehouse = doc['set_warehouse'],
            selling_price_list = doc['selling_price_list'],
            additional_discount_percentage = doc['additional_discount_percentage'],
            taxes = doc['taxes'],
            sales_team = doc['sales_team'],
            items = items_to_load
        )).insert(ignore_permissions=False)
        dn_name = delivery_note.name
        so_name = doc['name']
        # frappe.msgprint(_(f"Delivery Note <b>{dn_name}</b> has been created against Sales Order <b>{so_name}</b>"))
    return delivery_note.name
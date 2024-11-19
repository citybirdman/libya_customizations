import frappe

def after_submit_sales_invoice_so(doc, method):
    if not (doc.is_return or doc.update_stock or doc.is_opening == "Yes"):
        rows = [{"name": row.so_detail, "qty": row.qty} for row in doc.items]

        for row in rows:
            qty = frappe.db.get_value("Sales Order Item", row["name"], "billed_qty")
            frappe.db.set_value("Sales Order Item", row["name"], "billed_qty", qty + row["qty"])
        docname = frappe.db.get_value("Sales Order Item", rows[0]['name'], "parent")
        doc = frappe.get_doc("Sales Order", docname)
        flag = True
        for row in doc.items:
            # frappe.throw(f"{row.qty} != {row.bille_d_qty}")
            if row.qty != row.billed_qty:
                flag = False
                break
        if flag:
            frappe.call("erpnext.selling.doctype.sales_order.sales_order.update_status", status="Closed", name=docname)

def after_submit_sales_invoice_dn(doc, method):
    if not (doc.is_return or doc.update_stock or doc.is_opening == "Yes"):
        rows = [{"name": row.dn_detail, "qty": row.qty} for row in doc.items]

        for row in rows:
            qty = frappe.db.get_value("Delivery Note Item", row["name"], "billed_qty")
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
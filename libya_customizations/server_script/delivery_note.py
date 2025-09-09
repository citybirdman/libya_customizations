import frappe
from frappe import _

import json

@frappe.whitelist()
def create_si_from_dn(doc):
    doc = json.loads(doc)
    draft_linked_si = frappe.db.get_all('Sales Invoice Item', {'delivery_note':doc['name'], 'docstatus':0}, 'parent')
    if draft_linked_si:
        si_name = draft_linked_si[0]['parent']
        frappe.msgprint(msg=_("There is a draft Sales Invoice <b>{0}</b>, please delete or submit it to move forward").format(si_name), title=_('Error'), indicator='red') 
        raise frappe.ValidationError
    else:
        items_to_load = []
        for item in doc['items']:
            if item['qty'] - item['billed_qty'] > 0:
                rate = frappe.db.get_value("Delivery Note Item", item['name'], 'rate')
                items_to_load.append({
                    'item_code': item['item_code'],
                    'qty': item['qty'] - item['billed_qty'],
                    'delivery_note': doc['name'],
                    'dn_detail':item['name'],
                    'so_detail': item['so_detail'],
                    'sales_order': item['against_sales_order'],
                    'warehouse': doc['set_warehouse'],
                    'rate': rate,
                    'price_list_rate': item['price_list_rate']
                })
        sales_invoice = frappe.get_doc(dict(
            doctype = 'Sales Invoice',
            customer = doc['customer'],
            company = doc['company'],
            docstatus = 0,
            posting_date = doc['posting_date'],
            posting_time = doc['posting_time'],
            set_posting_time = 1,
            set_warehouse = doc['set_warehouse'],
            selling_price_list = doc['selling_price_list'],
            additional_discount_percentage = doc['additional_discount_percentage'],
            taxes = doc['taxes'],
            sales_team = doc['sales_team'],
            items = items_to_load
        ))
        if(doc.get('custom_remarks')):
            sales_invoice.custom_remarks = doc.get('custom_remarks')
        sales_invoice.insert()    
        si_name = sales_invoice.name
        dn_name = doc['name']
        # frappe.msgprint(_(f"Sales Invoice <b>{si_name}</b> has been created against Delivery Note <b>{dn_name}</b>"))
    return sales_invoice.name

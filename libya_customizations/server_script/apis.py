import frappe
from erpnext.selling.doctype.customer.customer import get_customer_outstanding

@frappe.whitelist(allow_guest=True)
def check_user_role(user, role):
    has_role = frappe.get_all('Has Role', filters={'parent': user, 'role': role}, fields=['parent'])
    if has_role:
        return True
    return False

@frappe.whitelist()
def get_customer_credit_balance(customer, company):
    credit_balance = get_customer_outstanding(
        customer=customer,
        company=company,
        ignore_outstanding_sales_order=False,
        cost_center=None
    )
    return credit_balance
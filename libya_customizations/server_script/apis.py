import frappe

@frappe.whitelist(allow_guest=True)
def check_user_role(user, role):
    has_role = frappe.get_all('Has Role', filters={'parent': user, 'role': role}, fields=['parent'])
    if has_role:
        return True
    return False
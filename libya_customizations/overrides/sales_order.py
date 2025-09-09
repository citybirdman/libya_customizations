from erpnext.selling.doctype.sales_order.sales_order import SalesOrder
import frappe
from frappe import _
class CustomSalesOrder(SalesOrder):
    def update_status(self, *args, **kwargs):
        # Call the original update_status method from the parent class
        # old_status = self.status
        super().update_status(*args, **kwargs)
        # frappe.throw(self.status)
        if self.status not in ["Closed", "Completed"]:
            self.validate_before_submit_sales_order()

    def validate_before_submit_sales_order(self):
        payment_terms_template = frappe.db.get_value('Customer', self.customer, 'payment_terms')
        if payment_terms_template:
            bypass_overdue_check = frappe.db.get_value('Customer', self.customer, 'bypass_overdue_check')
            user_has_cso = frappe.db.get_value("Has Role", [["parent", "=", frappe.session.user], ['role', "=", "Chief Sales Officer"]])
            credit_days = frappe.db.get_value('Payment Terms Template Detail', {'parent': payment_terms_template}, 'credit_days')
            outstanding = frappe.db.get_value('Sales Invoice', {'docstatus': 1, 'customer': self.customer, 'posting_date': ['<', frappe.utils.add_days(frappe.utils.nowdate(), - credit_days)]}, 'sum(outstanding_amount)')
            outstanding = outstanding if outstanding else 0

            if outstanding > 0 and not (bypass_overdue_check or user_has_cso):
                frappe.msgprint(msg=_("There are overdue outstandings valued at {0} against the Customer").format('{:0,.2f}'.format(outstanding)), title=_('Error'), indicator='red')
                raise frappe.ValidationError
            elif outstanding > 0 and (bypass_overdue_check or user_has_cso):
                frappe.msgprint(msg=_("There are overdue outstandings valued at {0} against the Customer").format('{:0,.2f}'.format(outstanding)), title=_('Warning'), indicator='orange')
        else:
            frappe.msgprint(msg=_(f"There is no payment terms assigned to Customer in Customer Master"), title=_('Error'), indicator='red')
            raise frappe.ValidationError
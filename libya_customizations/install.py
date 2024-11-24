import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
def after_install():
    # create_fields_for_all_doctypes()
    edit_customer_doctype()
    edit_account_doctype()
    edit_territory_doctype()
    create_roles()

def edit_account_doctype():
    fields_to_change_the_perm_level = ["account_number", "is_group", "company", "root_type", "report_type", "account_currency", "parent_account", "account_type", "tax_rate", "freeze_account", "balance_must_be"]
    frappe.db.set_value("DocField", [["parent", "=", "Account"], ["fieldname", "in", fields_to_change_the_perm_level]], "permlevel", 1)
    frappe.db.set_value("DocField", [["parent", "=", "Account"], ["fieldname", "=", "include_in_gross"]], "hidden", 1)

def edit_territory_doctype():
    fields_to_be_hidden = ["parent_territory", "is_group", "territory_manager", "target_details_section_break"]
    frappe.db.set_value("DocField", [["parent", "=", "Territory"], ["fieldname", "in", fields_to_be_hidden]], "hidden", 1)


def edit_customer_doctype():
    fields_to_be_hidden = ["salutation", "gender", "lead_name", "opportunity_name", "prospect_name", "account_manager", "defaults_tab", "internal_customer_section", "more_info", "contact_and_address_tab"]
    frappe.db.set_value("DocField", [["parent", "=", "Customer"], ["fieldname", "in", fields_to_be_hidden]], "hidden", 1)
    fields_to_be_ordered = [{"field":"phone_no", "idx": 15},{"field":"disabled", "idx": 16},{"field":"credit_limit_section", "idx": 17},{"field":"payment_terms", "idx": 18},{"field":"credit_limits", "idx": 19},{"field":"defaults_tab", "idx": 20},{"field":"default_currency", "idx": 21},{"field":"default_bank_account", "idx": 22},{"field":"column_break_14", "idx": 23},{"field":"default_price_list", "idx": 24},{"field":"internal_customer_section", "idx": 25},{"field":"is_internal_customer", "idx": 26},{"field":"represents_company", "idx": 27},{"field":"column_break_70", "idx": 28},{"field":"companies", "idx": 29},{"field":"more_info", "idx": 30},{"field":"market_segment", "idx": 31},{"field":"industry", "idx": 32},{"field":"customer_pos_id", "idx": 33},{"field":"website", "idx": 34},{"field":"language", "idx": 35},{"field":"column_break_45", "idx": 36},{"field":"customer_details", "idx": 37},{"field":"dashboard_tab", "idx": 38},{"field":"contact_and_address_tab", "idx": 39},{"field":"address_contacts", "idx": 40},{"field":"address_html", "idx": 41},{"field":"column_break1", "idx": 42},{"field":"contact_html", "idx": 43},{"field":"primary_address_and_contact_detail", "idx": 44},{"field":"column_break_26", "idx": 45},{"field":"customer_primary_address", "idx": 46},{"field":"primary_address", "idx": 47},{"field":"column_break_nwor", "idx": 48},{"field":"customer_primary_contact", "idx": 49},{"field":"mobile_no", "idx": 50},{"field":"email_id", "idx": 51},{"field":"tax_tab", "idx": 52},{"field":"taxation_section", "idx": 53},{"field":"tax_id", "idx": 54},{"field":"column_break_21", "idx": 55},{"field":"tax_category", "idx": 56},{"field":"tax_withholding_category", "idx": 57},{"field":"accounting_tab", "idx": 58},{"field":"default_receivable_accounts", "idx": 59},{"field":"accounts", "idx": 60},{"field":"loyalty_points_tab", "idx": 61},{"field":"loyalty_program", "idx": 62},{"field":"column_break_54", "idx": 63},{"field":"loyalty_program_tier", "idx": 64},{"field":"sales_team_tab", "idx": 65},{"field":"sales_team", "idx": 66},{"field":"sales_team_section", "idx": 67},{"field":"default_sales_partner", "idx": 68},{"field":"column_break_66", "idx": 69},{"field":"default_commission_rate", "idx": 70},{"field":"settings_tab", "idx": 71},{"field":"so_required", "idx": 72},{"field":"dn_required", "idx": 73},{"field":"column_break_53", "idx": 74},{"field":"is_frozen", "idx": 75},{"field":"portal_users_tab", "idx": 76},{"field":"portal_users", "idx": 77}]
    for rec in fields_to_be_ordered:
        frappe.db.set_value("DocField", [["parent", "=", "Customer"], ["fieldname", "=", rec["field"]]], "idx", rec["idx"])
def create_fields_for_all_doctypes():
    custom_fields = {
        "Customer": [
            dict(
                fieldname="phone_no",
                label="Phone No",
                fieldtype="Data",
                insert_after="image"
            )
        ],
        "Account":[
            dict(
                fieldname="restrict_account_view",
                label="Restrict Account View",
                fieldtype="Link",
                options="Restrict Account View",
                insert_after="include_in_gross",
                permlevel=1
            )
        ],
        "company":[
            dict(
                fieldname="write_up_account",
                label="Write Up Account",
                fieldtype="Link",
                options="Account",
                insert_after="write_off_account"
            )
        ],
        "Payment Entry":[
            dict(
                fieldname="custom_voucher_type",
                label="Custom Voucher Type",
                fieldtype="Link",
                options= "DocType",
                insert_after=""
            ),
            dict(
                fieldname="custom_voucher_no",
                label="Custom Voucher No",
                fieldtype="Dynamic Link",
                options= "custom_voucher_type",
                insert_after="custom_voucher_type"
            )
        ],
        "Journal Entry":[
            dict(
                fieldname="custom_voucher_type",
                label="Custom Voucher Type",
                fieldtype="Link",
                options= "DocType",
                insert_after="due_date"
            ),
            dict(
                fieldname="custom_voucher_no",
                label="Custom Voucher No",
                fieldtype="Dynamic Link",
                options= "custom_voucher_type",
                insert_after="custom_voucher_type"
            )
        ],
        "Purchase Receipt":[
            dict(
                fieldname="virtual_receipt",
                label="Virtual Receipt",
                fieldtype="Check",
                insert_after="is_return",
                allow_on_submit=1
            )
        ],
        "Sales Order":[
            dict(
                fieldname="reservation_status",
                label="Reservation Status",
                fieldtype="Select",
                insert_after="skip_delivery_note",
                options= "\nReserve with Delivery\nReserve without Delivery\nReserve against Future",
                default= "Reserve with Delivery",
                allow_on_submit= 1
                
            )
        ]
    }
    create_custom_fields(custom_fields)

def create_roles():
    roles = ["Chief Sales Officer", "Warehouse User", "Sales Coordinator", "Sales Supervisor", "Libya Team", "Accountant"]
    for role_name in roles:
        if not frappe.db.exists("Role", role_name):
            role = frappe.get_doc({
                "doctype": "Role",
                "role_name": role_name,
                "desk_access": 1
            })
            role.insert()
            frappe.db.commit()
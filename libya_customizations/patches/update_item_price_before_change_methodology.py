import frappe
from libya_customizations.server_script.item_price import update_stock_valuation_rate
def execute():
    print("Updating Item Prices to the latest value ...")
    try:
        update_stock_valuation_rate()
        frappe.db.commit()
    except Exception as e:
        print(f"Problem with Updating Prices:{e}\n {frappe.get_traceback()}")
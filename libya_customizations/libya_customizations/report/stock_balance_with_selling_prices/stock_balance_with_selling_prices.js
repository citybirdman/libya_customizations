// Copyright (c) 2025, Ahmed Zaytoon and contributors
// For license information, please see license.txt

frappe.query_reports["Stock Balance with Selling Prices"] = {
    filters: [
        {
            label: "To Date",
            fieldname: "to_date",
            fieldtype: "Date",
            default: frappe.datetime.get_today(),
            reqd: 1
        },
        {
            label: "Filter Based On",
            fieldname: "filter_based_on",
            fieldtype: "Select",
            options: ["Actual Balances", "Available Balances"],
            default: "Actual Balances",
            reqd: 1
        },
        {
            label: "Minimum Balance",
            fieldname: "minimum_qty",
            fieldtype: "Int",
            default: 0
        },
        {
            label: "Brand",
            fieldname: "brand",
            fieldtype: "MultiSelectList",
            get_data: function(txt) {
                return frappe.db.get_link_options('Brand', txt);
            }
        }
    ]
};

// Copyright (c) 2025, Ahmed Zaytoon and contributors
// For license information, please see license.txt

frappe.query_reports["Cash and Bank Statement Summary"] = {
    filters: [
        {
            fieldname: "account",
            label: "Account",
            fieldtype: "Link",
            options: "Account",
            reqd: 1,
            get_query: function() {
                return {
                    filters: {
                        account_type: ["in", ["Cash", "Bank"]]
                    }
                };
            }
        },
        {
            fieldname: "branch",
            label: "Branch",
            fieldtype: "Link",
            options: "Branch",
            reqd: 1
        },
        {
            fieldname: "from_date",
            label: "From Date",
            fieldtype: "Date",
            reqd: 1
        },
        {
            fieldname: "to_date",
            label: "To Date",
            fieldtype: "Date",
            reqd: 1
        }
    ]
};

// Copyright (c) 2024, Ahmed Zaytoon and contributors
// For license information, please see license.txt

frappe.ui.form.on("Sales Adjustment Request", "customer", function(frm) {
    frm.set_query("sales_invoice", function() {
        return {
            filters: {
                customer: frm.doc.customer,
				is_return: 0,
				docstatus: 1
           }
        };
    });
});
function get_item_price(frm, cdn, cdt, table){
    row = locals[cdt][cdn];
    frm.call({
        method: "get_item_price",
        args: {item: row.item_code},
        callback: function(i){
            if (i.message){
                row.rate = i.message;
                refresh_field(table);
            }
        }
    })
}
frappe.ui.form.on("Sales Adjustment Request Increase Detail", "item_code", (frm, cdt, cdn) => get_item_price(frm, cdn, cdt, "increased_items"));
frappe.ui.form.on("Sales Adjustment Request Decrease Detail", "item_code", (frm, cdt, cdn) => get_item_price(frm, cdn, cdt, "decreased_items"));

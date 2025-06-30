// Copyright (c) 2024, Ahmed Zaytoon and contributors
// For license information, please see license.txt

frappe.ui.form.on("Sales Adjustment Request", "customer", function(frm) {
    frm.set_query("sales_invoice", function() {
        return {
            filters: {
                customer: frm.doc.customer,
				is_return: 0,
				docstatus: 1,
				is_opening: 'No'
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

function production_year(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.item_code && row.production_year) {
        frappe.db.get_value('Item Price', {
            item_code: row.item_code,
            production_year: row.production_year,
            selling: 1
        }, 'price_list_rate').then(r => {
            if (r && r.message && r.message.price_list_rate) {
                frappe.model.set_value(cdt, cdn, 'rate', r.message.price_list_rate);
            } else {
                frappe.msgprint(__('No selling price found for this item and production year.'));
            }
        });
    }
}

frappe.ui.form.on("Sales Adjustment Request Increase Detail", "item_code", (frm, cdt, cdn) => get_item_price(frm, cdn, cdt, "increased_items"));
frappe.ui.form.on("Sales Adjustment Request Decrease Detail", "item_code", (frm, cdt, cdn) => get_item_price(frm, cdn, cdt, "decreased_items"));
frappe.ui.form.on("Sales Adjustment Request Increase Detail", "production_year", (frm, cdt, cdn) => production_year(frm, cdt, cdn));
frappe.ui.form.on("Sales Adjustment Request Decrease Detail", "production_year", (frm, cdt, cdn) => production_year(frm, cdt, cdn));

// Copyright (c) 2024, Ahmed Zaytoon and contributors
// For license information, please see license.txt

frappe.ui.form.on('Purchase Receipt Management', {
    onload: function(frm) {
        frm.fields_dict['purchase_receipts'].grid.get_field('virtual_receipt').get_query = function(doc, cdt, cdn) {
            var row = locals[cdt][cdn];
            if (row.virtual_receipt) {
                frappe.model.set_value(cdt, cdn, 'posting_date', null);
            }
        };
        get_list(frm, {docstatus: ["!=",2]});
    },
    onload_post_render: function(frm){
        frm.fields_dict.purchase_receipts.grid.grid_buttons[0].children[1].style.display = "none";
        frm.fields_dict.purchase_receipts.grid.grid_buttons[0].children[2].style.display = "none";
        frm.fields_dict.purchase_receipts.grid.grid_buttons[0].children[3].style.display = "none";
        frm.fields_dict['purchase_receipts'].grid.wrapper.find('.grid-delete-row').hide();
        frm.fields_dict.purchase_receipts.wrapper.querySelector(".grid-upload").style.display = "none";
        
    },
    refresh: function(frm) {
        frm.disable_save();
        
        cur_frm.fields_dict.purchase_receipts.grid.add_custom_button("Export", ()=>{
        const children = cur_frm.fields_dict.purchase_receipts.grid.get_selected_children()
        const names = children.map(row=>row.purchase_receipt)
        frappe.call({
            method: "libya_customizations.libya_customizations.doctype.purchase_receipt_management.purchase_receipt_management.export_selected_data",
            args: {
                names: names // Pass necessary parameters
            },
            callback: function(r) {
                if (r.message) {
                    // Open the file URL in a new tab
                    const link = document.createElement("a");
                    link.href = r.message;
                    link.download = "Purchase_Receipt.xlsx";  // Set the filename
                    link.style.display = "none";
                    document.body.appendChild(link);
                    link.click();  // Trigger download
                    document.body.removeChild(link);
                }
            }
        });
    })
        
        
        frm.add_custom_button('Show All', function() {
            get_list(frm, {docstatus: ["!=",2]});
        }, "Filter");

        frm.add_custom_button('Show Actual Receipt', function() {
            get_list(frm, {docstatus: 1});
        }, "Filter");

        frm.add_custom_button('Show Not Actual Receipt', function() {
            get_list(frm, {docstatus: 0});
        }, "Filter");
        frm.add_custom_button('Show Virtual Receipt', function() {
            get_list(frm, {docstatus: 0, virtual_receipt: 1});
        }, "Filter");
        
        
    },
    
    purchase_receipts_on_form_rendered: function(frm) {
        frm.fields_dict['purchase_receipts'].grid.on('change', function(e, row) {
            if (row.doc.virtual_receipt) {
                frappe.model.set_value(row.doctype, row.name, 'posting_date', null);
            }
        });
    }
});



function get_list(frm, filters= {docstatus: ["!=",2]}, fields= ["name", "title", "total_qty", "grand_total", "currency", "posting_date", "virtual_receipt", "docstatus"]){
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Purchase Receipt',
            filters, fields,
            order_by: "docstatus ASC"
        },
        callback: function(response) {
            if (response.message) {
                // const purchaseReceipts = response.message;
                let purchaseReceipts = response.message.sort((a, b) => {
                    // Primary sort by docstatus (numeric comparison)
                    if (a.docstatus === b.docstatus) {
                        // Secondary sort by posting_date (descending)
                        return new Date(b.posting_date) - new Date(a.posting_date);
                    }
                    return a.docstatus - b.docstatus; // Primary sort (ascending)
                });
                frm.clear_table("purchase_receipts");
                purchaseReceipts.map(function(pr){
                    let item = frappe.model.add_child(frm.doc, "Purchase Receipt Management Detail", "purchase_receipts");
                    item.purchase_receipt = pr.name;
                    item.shipment_name = pr.title;
                    item.total_qty = pr.total_qty;
                    item.virtual_receipt = pr.virtual_receipt;
                    item.grand_total = pr.grand_total;
                    item.currency = pr.currency;
                    if(pr.docstatus == 1){
                        item.posting_date = pr.posting_date;
                        item.actual_receipt = 1
                    }
                });
                refresh_field("purchase_receipts");
                frm.fields_dict.purchase_receipts.grid.reset_grid()
                
                frm.fields_dict.purchase_receipts.grid.grid_buttons[0].children[1].style.display = "none";
                frm.fields_dict.purchase_receipts.grid.grid_buttons[0].children[2].style.display = "none";
                frm.fields_dict.purchase_receipts.grid.grid_buttons[0].children[3].style.display = "none";
                frm.fields_dict['purchase_receipts'].grid.wrapper.find('.grid-delete-row').hide();
                frm.fields_dict.purchase_receipts.wrapper.querySelector(".grid-upload").style.display = "none";

            }
        }
    });
}

frappe.ui.form.on('Purchase Receipt Management Detail', {
	virtual_receipt: async function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        flag = true
        if(row.virtual_receipt == 0){
            await frappe.call({
                method: "libya_customizations.libya_customizations.doctype.purchase_receipt_management.purchase_receipt_management.get_values_for_validation",
                args:{
                    purchase_receipt: row.purchase_receipt
                },
                callback: function(r){
                    if(r.message){
                        r.message.map(function(item){
                            if((item.future_available_qty - item.qty) < 0){
                                flag = false
                                row.virtual_receipt = 1
                                refresh_field("purchase_receipts")
                                frappe.throw(__(`${item.qty - item.future_available_qty} units of item ${item.item_code} needed to complete this action<br>`))
                            }
                        });
                    }
                }
            })
        }
        if(flag){
            frappe.call({
                method:"libya_customizations.libya_customizations.doctype.purchase_receipt_management.purchase_receipt_management.update_is_virtual", 
                args:{
                    docname: row.purchase_receipt,
                    virtual_receipt: row.virtual_receipt
                }
            });
        }
	},
    submit_button(frm,cdt,cdn){
        let row = locals[cdt][cdn];
        if(!row.posting_date){
            frappe.throw("Add Posting Date first")
        }else{
            frappe.call({
                method:"libya_customizations.libya_customizations.doctype.purchase_receipt_management.purchase_receipt_management.submit_receipt",
                args:{
                    docname: row.purchase_receipt,
                    posting_date:row.posting_date
                },
                callback: function(r){
                    frappe.msgprint(__("Purchase Receipt has been successfully submitted"))
					frm.reload_doc();
                    frm.refresh();
                }
            })
        }
    }
});
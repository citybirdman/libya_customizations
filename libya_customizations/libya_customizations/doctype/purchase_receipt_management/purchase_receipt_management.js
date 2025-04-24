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
        frm.fields_dict['purchase_receipts'].$wrapper.on('change', function(e, row) {
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
            order_by: "docstatus ASC",
            limit_page_length: 0
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

frappe.ui.form.on('Purchase Receipt Management Detail', {
    edit_selling_prices: function(frm, cdt, cdn){
            // Call the function to open the dialog
            openPurchaseReceiptDialog(frm, cdt, cdn);
        }
    });
    
    // Function to open the dialog
    async function openPurchaseReceiptDialog(frm, cdt, cdn) {
        let data = await fetchPurchaseReceiptData(locals[cdt][cdn].purchase_receipt);
        let dialog = new frappe.ui.Dialog({
        title: __('Purchase Receipt Details'),
        fields: [
            {
                label: __('Profitability'),
                fieldtype: "Int",
                fieldname: "prof",
                onchange: ()=>{
                    const prof = cur_dialog.get_value("prof");
                    cur_dialog.fields_dict.purchase_receipt_table.grid.data.map(function(row){row.p_price = Math.ceil(row.receipt_valuation_rate * (prof+100)/100)});
                    cur_dialog.fields_dict.purchase_receipt_table.grid.refresh()
                }
            },
            {
                label: __('Update based on Proposed'),
                fieldtype: "Button",
                fieldname: "cpl",
                click: (e)=>{
                    cur_dialog.fields_dict.purchase_receipt_table.grid.data.map(function(row){row.selling_price = row.p_price});
                    cur_dialog.fields_dict.purchase_receipt_table.grid.refresh()
                }
            },
            {
                fieldtype: "Column Break",
                fieldname: "column_break_1"
            },
            {
                label: __('Price List'),
                fieldtype: "Link",
                options:"Price List",
                fieldname: "price_list",
                get_query: () => {
                    return {
                        filters: {
                            selling: 1,
                        },
                    };
                }
            },
            {
                fieldtype: 'Section Break'
            },
            {
                label: __('Purchase Receipt Data'),
                fieldtype: 'Table',
                fieldname: 'purchase_receipt_table',
                fields: [
                    { label: __('Item Code'), fieldtype: 'Link', options:"Item",fieldname: 'item_code', read_only:1},
                    { label: __('Item Name'), fieldtype: 'Data', fieldname: 'item_name', read_only:1 , in_list_view:1, colsize: 3, columns: 3 },
                    { label: __('Brand'), fieldtype: 'Data', fieldname: 'brand', read_only:1 },
                    { label: __('Receipt Qty'), fieldtype: 'Int', fieldname: 'receipt_qty', in_list_view:1, precision: 0, read_only:1, colsize: 1, columns: 1 },
                    { label: __('Receipt Valuation Rate'), fieldtype: 'Float', fieldname: 'receipt_valuation_rate', in_list_view:1, precision: 2, read_only:1, colsize: 1, columns: 1},
                    { label: __('Stock Qty'), fieldtype: 'Int', fieldname: 'stock_qty', in_list_view:1, precision: 0, read_only:1, colsize: 1, columns: 1},
                    { label: __('Stock Valuation Rate'), fieldtype: 'Float', fieldname: 'stock_valuation_rate', in_list_view:1 , precision: 2, read_only:1, colsize: 1, columns: 1},
                    { label: __('Selling Price'), fieldtype: 'Currency', fieldname: 'selling_price', in_list_view:1, precision: 0, colsize: 1, columns: 1},
                    { label: __('Proposed Price'), fieldtype: 'Data', fieldname: 'p_price', in_list_view:1, read_only:1, colsize: 1, columns: 1 },
                    { label: __('Price Name'), fieldtype: 'Data', fieldname: 'price_name', hidden:1 },
                ],
                data: data,
                get_data: ()=>{return data}
            }
        ],
        primary_action_label: __('Edit Prices'),
        primary_action: function(values) {
            prices = values.purchase_receipt_table.map(row => ({name:row.price_name, price: row.selling_price, item_code: row.item_code, item_name:row.item_name}))
            prices = prices.filter(row=>row.name)
            let args = {values:prices}
            if(values.price_list)
                args.selling_price_list = values.price_list;
            frm.call({method:"edit_item_price", args})
            dialog.hide();
        }
    });
    dialog.$wrapper.find('.modal-dialog').removeClass("modal-lg").addClass("modal-xl");
    Array.from(dialog.fields_dict.purchase_receipt_table.grid.grid_buttons[0].children).map(function(child, i){
            if( child.classList.contains("grid-add-row")){
                    dialog.fields_dict.purchase_receipt_table.grid.grid_buttons[0].children[i].style.display = "none";
        }
    })
    dialog.fields_dict.purchase_receipt_table.wrapper.onchange = function(){
        	Array.from(dialog.fields_dict.purchase_receipt_table.grid.grid_buttons[0].children).map(function(child, i){
            		if( child.classList.contains("grid-add-row")){
                			dialog.fields_dict.purchase_receipt_table.grid.grid_buttons[0].children[i].style.display = "none";
                		}
                	})
                }
    // Show the dialog
    frm.fields_dict.purchase_receipts.grid.wrapper[0].querySelector(".grid-collapse-row").click();
    dialog.show();
    dialog.$wrapper.on("keydown", function(e){
        if (e.key === 'Enter') {
           e.preventDefault();
        }
    })
    dialog.fields_dict.cpl.$wrapper.on("keydown", function(e){
        if (e.key === 'Enter') {
           e.preventDefault();
        }
    })
   dialog.fields_dict.prof.$wrapper.on('keydown', function(e) {
        if (e.key === 'Enter') {
           document.activeElement.blur()
        }
    });
    dialog.fields_dict.purchase_receipt_table.$wrapper.keyup(function(e) {
        if(e.key === "Enter")
            e.preventDefault()
        let row_idx = Number(document.activeElement.parentElement.parentElement.parentElement.parentElement.querySelector(".row-index span").innerText) -1
        dialog.fields_dict.purchase_receipt_table.grid.data[row_idx].selling_price = e.target.value
    });
    
}


// Function to fetch the custom SQL data
async function fetchPurchaseReceiptData(purchase_receipt) {
    let data = []
    await cur_frm.call({
        method: 'get_purchase_receipt_data',
        args: {purchase_receipt},
        callback: function(response) {
            if (response && response.message) {
                data = response.message
            }
        }
    });
    return data;
}

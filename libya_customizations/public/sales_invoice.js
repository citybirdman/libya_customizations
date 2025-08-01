frappe.ui.form.on("Sales Invoice", {
	onload_post_render(frm){
		const buttonsToRemove = [
			["Payment", "Create"],
			["Return / Credit Note", "Create"],
			["Payment Request", "Create"],
			["Invoice Discounting", "Create"],
			["Maintenance Schedule", "Create"],
			["Quality Inspection(s)", "Create"],
			["Sales Order", "Get Items From"],
			["Delivery Note", "Get Items From"],
			["Quotation", "Get Items From"]
        ];

        buttonsToRemove.forEach(([button, action]) => {
            frm.remove_custom_button(button, action);
        });
	},
    refresh: function(frm) {
		setTimeout(() => {
			const buttonsToRemove = [
				["Payment", "Create"],
				["Return / Credit Note", "Create"],
				["Payment Request", "Create"],
				["Invoice Discounting", "Create"],
				["Maintenance Schedule", "Create"],
				["Quality Inspection(s)", "Create"],
				["Sales Order", "Get Items From"],
				["Delivery Note", "Get Items From"],
				["Quotation", "Get Items From"]
			];
            buttonsToRemove.forEach(([button, action]) => {
                frm.remove_custom_button(button, action);
            });
		},300);
	},
    onload(frm){
        if(!frm.doc.is_return){
            frm.fields_dict.items.wrapper.onchange = function(){
                frm.fields_dict.items.wrapper.querySelectorAll(".btn-open-row").forEach(function(btn){btn.remove();})
                frm.fields_dict.items.grid.grid_buttons[0].children[1].style.display = "none";
                frm.fields_dict.items.grid.grid_buttons[0].children[2].style.display = "none";
                frm.fields_dict.items.grid.grid_buttons[0].children[3].style.display = "none";
				frm.fields_dict.items.grid.grid_buttons[0].children[0].style.display = "none";
                frm.fields_dict['items'].grid.wrapper.find('.grid-delete-row').hide();
                frm.fields_dict.items.wrapper.querySelector(".grid-upload").style.display = "none";
                frm.fields_dict.items.wrapper.querySelector(".grid-download").style.display = "none";
            }
        }
    },
    before_save(frm){
        if(frm.doc.is_return){
            frm.set_value("update_stock", 1)
        }else{
            frm.set_value("update_stock", 0)
        }
        
        if(frm.doc.custom_payment_value || frm.doc.payment_account){
            frm.set_value("custom_is_payment_value_checked", 1)
        }
    },
    custom_payment_value_is_different: function(frm){
        frm.set_value("custom_payment_value", 0)
    }
})

frappe.ui.form.on("Sales Invoice", {
    is_paid: function(frm) {
        if (!frm.doc.is_paid) {
            frm.set_value("payment_account", null);
            frm.set_value("custom_payment_value_is_different", 0);
            frm.set_value("custom_payment_value", 0);
            frm.set_value("custom_is_payment_value_checked", 0);
            frm.refresh_field("payment_account");
            frm.refresh_field("custom_payment_value_is_different");
            frm.refresh_field("custom_payment_value");
            frm.refresh_field("custom_is_payment_value_checked");
        }
    },
    custom_payment_value_is_different: function(frm) {
        if (!frm.doc.custom_payment_value_is_different) {
            frm.set_value("custom_payment_value", 0);
            frm.set_value("custom_is_payment_value_checked", 0);
            frm.refresh_field("custom_payment_value");
            frm.refresh_field("custom_is_payment_value_checked");
        }
    }
});


frappe.ui.form.on('Sales Invoice Item', {
    production_year(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (frm.doc.is_return === 1 && row.item_code && row.production_year) {
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
});
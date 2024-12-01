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
    }
})
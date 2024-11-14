{% include 'mobility_advanced_item_dialog/custom/common_popup.js' %}
frappe.ui.form.on("Sales Order", {
    onload(frm){
		
		frm.fields_dict.items.wrapper.onchange = function(){
			// frm.fields_dict.items.grid.grid_buttons.remove()
			frm.fields_dict.items.wrapper.querySelectorAll(".btn-open-row").forEach(function(btn){btn.remove();})
			frm.fields_dict.items.grid.grid_buttons[0].children[1].style.display = "none";
			frm.fields_dict.items.grid.grid_buttons[0].children[2].style.display = "none";
			frm.fields_dict.items.grid.grid_buttons[0].children[3].style.display = "none";
			frm.fields_dict['items'].grid.wrapper.find('.grid-delete-row').hide();
			frm.fields_dict.items.wrapper.querySelector(".grid-upload").style.display = "none";
			frm.fields_dict.items.wrapper.querySelector(".grid-download").style.display = "none";
		}
        frm.remove_custom_button("Update Items")
		if(frm.doc.docstatus === 1 && frm.doc.per_delivered !== 100){
			frm.add_custom_button(__("Update Items"), () => {
				erpnext.utils.advanced_update_child_items({
					frm: frm,
					child_docname: "items",
					child_doctype: "Sales Order Detail",
					cannot_add_row: false,
					has_reserved_stock: frm.doc.__onload && frm.doc.__onload.has_reserved_stock,
				});
			});

			if(!["On Hold", "Closed"].includes(frm.doc.status) && frm.doc.per_delivered !== 100){
				frm.add_custom_button(__("Create Delivery Note"), () => {
					frappe.call({
						method: "libya_customizations.server_script.sales_order.create_dn_upon_so",
						args:{
							doc: frm.doc
						},
						callback: function(r){
							if(r.message){
								docname = r.message;
								frappe.set_route("Form", "Delivery Note", docname);
							}
						}
					})
				});
			}
		}
    },
	validate(frm){
		if(!frappe.user_roles.includes("Chief Sales Officer") && doc.reservation_status === "Reserve against Future Receipts")
			frappe.throw(_("You do not have the authority to choose Reserve against Future Receipts!"));
	},
    customer(frm){
        frappe.call({
            method: "libya_customizations.server_script.sales_order.get_customer_info", 
            args:{
                  customer : frm.doc.customer
            },
              callback: function(r){
                if(r.message){
                    frm.set_value(r.message[0]);
                }
            }
        })
    },
    before_save(frm){
        frappe.call({
            method: "libya_customizations.server_script.sales_order.get_customer_info", 
            args:{
                  customer : frm.doc.customer
            },
              callback: function(r){
                if(r.message){
                    frm.set_value(r.message[0]);
                }
            }
        })
    }
})


erpnext.utils.advanced_update_child_items = function (opts) {
	const frm = opts.frm;
	const cannot_add_row = typeof opts.cannot_add_row === "undefined" ? true : opts.cannot_add_row;
	const child_docname = typeof opts.cannot_add_row === "undefined" ? "items" : opts.child_docname;
	const child_meta = frappe.get_meta(`${frm.doc.doctype} Item`);
	const has_reserved_stock = opts.has_reserved_stock ? true : false;
	const get_precision = (fieldname) => child_meta.fields.find((f) => f.fieldname == fieldname).precision;

	this.data = frm.doc[opts.child_docname].map((d) => {
		return {
			docname: d.name,
			name: d.name,
			item_code: d.item_code,
			item_name: d.item_name,
			delivery_date: d.delivery_date,
			schedule_date: d.schedule_date,
			conversion_factor: d.conversion_factor,
			qty: d.qty,
			rate: d.rate,
			uom: d.uom,
			fg_item: d.fg_item,
			fg_item_qty: d.fg_item_qty,
		};
	});

	const fields = [
		{
			fieldtype: "Data",
			fieldname: "docname",
			read_only: 1,
			hidden: 1,
		},
		{
			fieldtype: "Link",
			fieldname: "item_code",
			options: "Item",
			in_list_view: 1,
			read_only: 0,
			disabled: 0,
			label: __("Item Code"),
			get_query: function () {
				let filters;
				if (frm.doc.doctype == "Sales Order") {
					filters = { is_sales_item: 1 };
				} else if (frm.doc.doctype == "Purchase Order") {
					if (frm.doc.is_subcontracted) {
						if (frm.doc.is_old_subcontracting_flow) {
							filters = { is_sub_contracted_item: 1 };
						} else {
							filters = { is_stock_item: 0 };
						}
					} else {
						filters = { is_purchase_item: 1 };
					}
				}
				return {
					query: "erpnext.controllers.queries.item_query",
					filters: filters,
				};
			}
		},
		{
			fieldtype: "Data",
			fieldname: "item_name",
			default: 0,
			read_only: 0,
			in_list_view: 1,
			fetch_from: "item_code.item_name",
			label: __("Item Name")
		},
		{
			fieldtype: "Link",
			fieldname: "uom",
			options: "UOM",
			read_only: 0,
			label: __("UOM"),
			reqd: 1,
			onchange: function () {
				frappe.call({
					method: "erpnext.stock.get_item_details.get_conversion_factor",
					args: { item_code: this.doc.item_code, uom: this.value },
					callback: (r) => {
						if (!r.exc) {
							if (this.doc.conversion_factor == r.message.conversion_factor) return;

							const docname = this.doc.docname;
							dialog.fields_dict.trans_items.df.data.some((doc) => {
								if (doc.docname == docname) {
									doc.conversion_factor = r.message.conversion_factor;
									dialog.fields_dict.trans_items.grid.refresh();
									return true;
								}
							});
						}
					},
				});
			},
		},
		{
			fieldtype: "Float",
			fieldname: "qty",
			default: 0,
			read_only: 0,
			in_list_view: 1,
			label: __("Qty"),
			precision: get_precision("qty"),
		},
		{
			fieldtype: "Currency",
			fieldname: "rate",
			options: "currency",
			default: 0,
			read_only: 0,
			in_list_view: 1,
			label: __("Rate"),
			precision: get_precision("rate"),
		},
	];

	if (frm.doc.doctype == "Sales Order" || frm.doc.doctype == "Purchase Order") {
		fields.splice(2, 0, {
			fieldtype: "Date",
			fieldname: frm.doc.doctype == "Sales Order" ? "delivery_date" : "schedule_date",
			in_list_view: 0,
			label: frm.doc.doctype == "Sales Order" ? __("Delivery Date") : __("Reqd by date"),
			default: frm.doc.doctype == "Sales Order" ? frm.doc.delivery_date : frm.doc.schedule_date,
			reqd: 1,
		});
		fields.splice(3, 0, {
			fieldtype: "Float",
			fieldname: "conversion_factor",
			label: __("Conversion Factor"),
			precision: get_precision("conversion_factor"),
		});
	}

	if (
		frm.doc.doctype == "Purchase Order" &&
		frm.doc.is_subcontracted &&
		!frm.doc.is_old_subcontracting_flow
	) {
		fields.push(
			{
				fieldtype: "Link",
				fieldname: "fg_item",
				options: "Item",
				reqd: 1,
				in_list_view: 0,
				read_only: 0,
				disabled: 0,
				label: __("Finished Good Item"),
				get_query: () => {
					return {
						filters: {
							is_stock_item: 1,
							is_sub_contracted_item: 1,
							default_bom: ["!=", ""],
						},
					};
				},
			},
			{
				fieldtype: "Float",
				fieldname: "fg_item_qty",
				reqd: 1,
				default: 0,
				read_only: 0,
				in_list_view: 0,
				label: __("Finished Good Item Qty"),
				precision: get_precision("fg_item_qty"),
			}
		);
	}

	let dialog = new frappe.ui.Dialog({
		title: __("Update Items"),
		size: "extra-large",
		fields: [
			{
				fieldname: "trans_items",
				fieldtype: "Table",
				label: "Items",
				cannot_add_rows: cannot_add_row,
				in_place_edit: false,
				reqd: 1,
				data: this.data,
				get_data: () => {
					return this.data;
				},
				fields: fields,
			},
		],
		primary_action: function () {
			if (frm.doctype == "Sales Order" && has_reserved_stock) {
				this.hide();
				frappe.confirm(
					__(
						"The reserved stock will be released when you update items. Are you certain you wish to proceed?"
					),
					() => this.update_items()
				);
			} else {
				this.update_items();
			}
		},
		update_items: function () {
			const trans_items = this.get_values()["trans_items"].filter((item) => !!item.item_code);
			frappe.call({
				method: "erpnext.controllers.accounts_controller.update_child_qty_rate",
				freeze: true,
				args: {
					parent_doctype: frm.doc.doctype,
					trans_items: trans_items,
					parent_doctype_name: frm.doc.name,
					child_docname: child_docname,
				},
				callback: function () {
					frm.reload_doc();
				},
			});
			this.hide();
			refresh_field("items");
		},
		primary_action_label: __("Update"),
	});

	dialog.show();

	Array.from(dialog.fields_dict.trans_items.grid.grid_buttons[0].children).map(function(child, i){
		if( child.classList.contains("grid-add-row")){
			dialog.fields_dict.trans_items.grid.grid_buttons[0].children[i].style.display = "none";
		}
	})
	dialog.fields_dict.trans_items.wrapper.onchange = function(){
		Array.from(dialog.fields_dict.trans_items.grid.grid_buttons[0].children).map(function(child, i){
			if( child.classList.contains("grid-add-row")){
				dialog.fields_dict.trans_items.grid.grid_buttons[0].children[i].style.display = "none";
			}
		})		
	}

	dialog.fields_dict.trans_items.grid.add_custom_button("Get Items", ()=>{
		let display_columns = {
			"Item Code":'',
			"Brand":'',
			"Item Name":'',
			"Qty":"",
			"Available": "",
			"Rate":'',
		}
		if(frappe.user_roles.includes("Chief Sales Officer")){
			
			display_columns["Valuation Rate"]= "";
		}

		var dialog2 = new frappe.ui.form.AereleSelectDialog({
			doctype: "Sales Order",
			target: frm,
			cur_dialog: dialog,
			setters: [],
			display_columns,
			custom_method: 'mobility_advanced_item_dialog.custom.common_popup.get_item_details',
		})
	})
	  
};


frappe.ui.form.on("Sales Order", {
	onload_post_render(frm){
		cur_frm.remove_custom_button("Pick List", "Create")
		cur_frm.remove_custom_button("Delivery Note", "Create")
		cur_frm.remove_custom_button("Work Order", "Create")
		cur_frm.remove_custom_button("Sales Invoice", "Create")
		cur_frm.remove_custom_button("Material Request", "Create")
		cur_frm.remove_custom_button("Request for Raw Materials", "Create")
		cur_frm.remove_custom_button("Purchase Order", "Create")
		cur_frm.remove_custom_button("Project", "Create")
		cur_frm.remove_custom_button("Payment Request", "Create")
		cur_frm.remove_custom_button("Payment", "Create")
		cur_frm.remove_custom_button("Quotation", "Get Items From")
	},
    refresh: function(frm) {
		setTimeout(() => {
			cur_frm.remove_custom_button("Pick List", "Create")
			cur_frm.remove_custom_button("Delivery Note", "Create")
			cur_frm.remove_custom_button("Work Order", "Create")
			cur_frm.remove_custom_button("Sales Invoice", "Create")
			cur_frm.remove_custom_button("Material Request", "Create")
			cur_frm.remove_custom_button("Request for Raw Materials", "Create")
			cur_frm.remove_custom_button("Purchase Order", "Create")
			cur_frm.remove_custom_button("Project", "Create")
			cur_frm.remove_custom_button("Payment Request", "Create")
			cur_frm.remove_custom_button("Payment", "Create")
			cur_frm.remove_custom_button("Quotation", "Get Items From")

			if(frm.doc.per_delivered === 100){
				frm.remove_custom_button("Hold", "Status");
				frm.remove_custom_button("Close", "Status");
			}
		},300);
		

        const delivery_status_info = {
            "Not Delivered": { color: "red", label: "Not Delivered" },
            "Partially Delivered": { color: "orange", label: "Partially Delivered" },
            "Fully Delivered": { color: "green", label: "Fully Delivered" }
        };

        // Get the delivery status field value
        let delivery_status = frm.doc.delivery_status;

        // Add the delivery status badge if it matches a key in delivery_status_info
        if (delivery_status_info[delivery_status] && frm.doc.docstatus === 1 && !["On Hold", "Closed"].includes(frm.doc.status)) {
			console.log(["On Hold", "Closed"].includes(frm.doc.status))
            frm.page.set_indicator(delivery_status_info[delivery_status].label, delivery_status_info[delivery_status].color);
        }
    }
});
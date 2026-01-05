// new code
{% include 'mobility_advanced_item_dialog/custom/common_popup.js' %}

// disable rate auto update in child table
erpnext.TransactionController.prototype.item_code = function(doc, cdt, cdn){
	var me = this;
	frappe.flags.dialog_set = false;

	var item = frappe.get_doc(cdt, cdn);
	var update_stock = 0, show_batch_dialog = 0;

	item.weight_per_unit = 0;
	item.weight_uom = '';
	item.conversion_factor = 0;

	if(['Sales Invoice', 'Purchase Invoice'].includes(this.frm.doc.doctype)) {
		update_stock = cint(me.frm.doc.update_stock);
		show_batch_dialog = update_stock;

	} else if((this.frm.doc.doctype === 'Purchase Receipt') ||
		this.frm.doc.doctype === 'Delivery Note') {
		show_batch_dialog = 1;
	}

	if (show_batch_dialog && item.use_serial_batch_fields === 1) {
		show_batch_dialog = 0;
	}

	item.barcode = null;


	if(item.item_code || item.serial_no) {
		if(!me.validate_company_and_party()) {
			this.frm.fields_dict["items"].grid.grid_rows[item.idx - 1].remove();
		} else {
			item.pricing_rules = ''
			return this.frm.call({
				method: "libya_customizations.utils.get_item_details",
				child: item,
				args: {
					doc: me.frm.doc,
					args: {
						item_code: item.item_code,
						barcode: item.barcode,
						serial_no: item.serial_no,
						batch_no: item.batch_no,
						set_warehouse: me.frm.doc.set_warehouse,
						warehouse: item.warehouse,
						customer: me.frm.doc.customer || me.frm.doc.party_name,
						quotation_to: me.frm.doc.quotation_to,
						supplier: me.frm.doc.supplier,
						currency: me.frm.doc.currency,
						is_internal_supplier: me.frm.doc.is_internal_supplier,
						is_internal_customer: me.frm.doc.is_internal_customer,
						update_stock: update_stock,
						conversion_rate: me.frm.doc.conversion_rate,
						price_list: me.frm.doc.selling_price_list || me.frm.doc.buying_price_list,
						price_list_currency: me.frm.doc.price_list_currency,
						plc_conversion_rate: me.frm.doc.plc_conversion_rate,
						company: me.frm.doc.company,
						order_type: me.frm.doc.order_type,
						is_pos: cint(me.frm.doc.is_pos),
						is_return: cint(me.frm.doc.is_return),
						is_subcontracted: me.frm.doc.is_subcontracted,
						ignore_pricing_rule: me.frm.doc.ignore_pricing_rule,
						doctype: me.frm.doc.doctype,
						name: me.frm.doc.name,
						project: item.project || me.frm.doc.project,
						qty: item.qty || 1,
						net_rate: item.rate,
						base_net_rate: item.base_net_rate,
						stock_qty: item.stock_qty,
						conversion_factor: item.conversion_factor,
						weight_per_unit: item.weight_per_unit,
						uom: item.uom,
						weight_uom: item.weight_uom,
						manufacturer: item.manufacturer,
						stock_uom: item.stock_uom,
						pos_profile: cint(me.frm.doc.is_pos) ? me.frm.doc.pos_profile : '',
						cost_center: item.cost_center,
						tax_category: me.frm.doc.tax_category,
						item_tax_template: item.item_tax_template,
						child_doctype: item.doctype,
						child_docname: item.name,
						is_old_subcontracting_flow: me.frm.doc.is_old_subcontracting_flow,
						use_serial_batch_fields: item.use_serial_batch_fields,
						serial_and_batch_bundle: item.serial_and_batch_bundle,
						rate: item.rate,
					}
				},

				callback: function(r) {
					if(!r.exc) {
						frappe.run_serially([
							() => {
								if (item.docstatus === 0
									&& frappe.meta.has_field(item.doctype, "use_serial_batch_fields")
									&& !item.use_serial_batch_fields
									&& cint(frappe.user_defaults?.use_serial_batch_fields) === 1
								) {
									item["use_serial_batch_fields"] = 1;
								}
							},
							() => {
								var d = locals[cdt][cdn];
								me.add_taxes_from_item_tax_template(d.item_tax_rate);
								if (d.free_item_data && d.free_item_data.length > 0) {
									me.apply_product_discount(d);
								}
							},
							async () => {
								// for internal customer instead of pricing rule directly apply valuation rate on item
								const fetch_valuation_rate_for_internal_transactions = await frappe.db.get_single_value(
									"Accounts Settings", "fetch_valuation_rate_for_internal_transaction"
								);
								if ((me.frm.doc.is_internal_customer || me.frm.doc.is_internal_supplier) && fetch_valuation_rate_for_internal_transactions) {
									me.get_incoming_rate(item, me.frm.posting_date, me.frm.posting_time,
										me.frm.doc.doctype, me.frm.doc.company);
								} else {
// 										me.frm.script_manager.trigger("price_list_rate", cdt, cdn);
								}
							},
							() => {
								if (me.frm.doc.is_internal_customer || me.frm.doc.is_internal_supplier) {
									me.calculate_taxes_and_totals();
								}
							},
							() => me.toggle_conversion_factor(item),
							() => {
								if (show_batch_dialog && !frappe.flags.trigger_from_barcode_scanner)
									return frappe.db.get_value("Item", item.item_code, ["has_batch_no", "has_serial_no"])
										.then((r) => {
											if (r.message &&
											(r.message.has_batch_no || r.message.has_serial_no)) {
												frappe.flags.hide_serial_batch_dialog = false;
											} else {
												show_batch_dialog = false;
											}
										});
							},
							() => {
								// check if batch serial selector is disabled or not
								if (show_batch_dialog && !frappe.flags.hide_serial_batch_dialog)
									return frappe.db.get_single_value('Stock Settings', 'disable_serial_no_and_batch_selector')
										.then((value) => {
											if (value) {
												frappe.flags.hide_serial_batch_dialog = true;
											}
										});
							},
							() => {
								if(show_batch_dialog && !frappe.flags.hide_serial_batch_dialog && !frappe.flags.dialog_set) {
									var d = locals[cdt][cdn];
									$.each(r.message, function(k, v) {
										if(!d[k]) d[k] = v;
									});

									if (d.has_batch_no && d.has_serial_no) {
										d.batch_no = undefined;
									}

									frappe.flags.dialog_set = true;
									erpnext.show_serial_batch_selector(me.frm, d, (item) => {
										me.frm.script_manager.trigger('qty', item.doctype, item.name);
										if (!me.frm.doc.set_warehouse)
											me.frm.script_manager.trigger('warehouse', item.doctype, item.name);
										me.apply_price_list(item, true);
									}, undefined, !frappe.flags.hide_serial_batch_dialog);
								} else {
									frappe.flags.dialog_set = false;
								}
							},
							() => me.conversion_factor(doc, cdt, cdn, true),
							() => me.remove_pricing_rule(item),
							() => {
								if (item.apply_rule_on_other_items) {
									let key = item.name;
									me.apply_rule_on_other_items({key: item});
								}
							},
							() => {
								var company_currency = me.get_company_currency();
								me.update_item_grid_labels(company_currency);
							}
						]);
					}
				}
			});
		}
	}
}
erpnext.TransactionController.prototype.apply_price_list = () => {};

frappe.ui.form.on('Sales Invoice Item', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let duplicate = frm.doc.items.find(
            d => d.item_code === row.item_code && d.name !== row.name
        );

        if (duplicate) {
            frappe.msgprint(__('Item {0} is already added in Row {1}', [row.item_code, duplicate.idx]));
            
            // remove the current row
            frm.get_field("items").grid.grid_rows_by_docname[row.name].remove();
            frm.refresh_field("items");
        }
    }
});

// old code
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
    before_save(frm){      
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
    item_code(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (frm.doc.is_return === 1 && row.item_code) {
            frappe.db.get_value('Item Price', {
                item_code: row.item_code,
                selling: 1
            }, 'price_list_rate').then(r => {
                if (r && r.message && r.message.price_list_rate) {
                    frappe.model.set_value(cdt, cdn, 'rate', r.message.price_list_rate);
                } else {
                    frappe.msgprint(__('No selling price found for this item.'));
                }
            });
        }
    }
});
// Function to open the dialog
async function openPurchaseInvoiceDialog(frm) {

    let data = [];
    let dialog = new frappe.ui.Dialog({
        title: __('Purchase Invoice Details'),
        fields: [
            {
                label: __('Profitability'),
                fieldtype: "Int",
                fieldname: "prof",
                onchange: ()=>{
                    const prof = cur_dialog.get_value("prof");
                    cur_dialog.fields_dict.purchase_invoice_table.grid.data.map(function(row){row.p_price = Math.ceil(row.invoice_valuation_rate * (prof+100)/100)});
                    cur_dialog.fields_dict.purchase_invoice_table.grid.refresh()
                }
            },
            {
                label: __('Update based on Proposed'),
                fieldtype: "Button",
                fieldname: "cpl",
                click: (e)=>{
                    cur_dialog.fields_dict.purchase_invoice_table.grid.data.map(function(row){row.selling_price = row.p_price});
                    cur_dialog.fields_dict.purchase_invoice_table.grid.refresh()
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
                reqd: 1,
                onchange: async function() {
                    const price_list = cur_dialog.get_value("price_list");
                    if (price_list) {
                        const new_data = await fetchPurchaseInvoiceData(frm.doc.name, price_list);
                        cur_dialog.fields_dict.purchase_invoice_table.df.data = new_data;
                        cur_dialog.fields_dict.purchase_invoice_table.grid.refresh();
                    } else {
                        cur_dialog.fields_dict.purchase_invoice_table.df.data = [];
                        cur_dialog.fields_dict.purchase_invoice_table.grid.refresh();
                    }
                },
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
                label: __('Purchase Invoice Data'),
                fieldtype: 'Table',
                fieldname: 'purchase_invoice_table',
                fields: [
                    { label: __('Item Code'), fieldtype: 'Link', options:"Item",fieldname: 'item_code', read_only:1},
                    { label: __('Item Name'), fieldtype: 'Data', fieldname: 'item_name', read_only:1 , in_list_view:1, colsize: 3, columns: 2 },
                    { label: __('Brand'), fieldtype: 'Data', fieldname: 'brand', read_only:1 },
                    { label: __('Invoice Qty'), fieldtype: 'Int', fieldname: 'invoice_qty', in_list_view:1, precision: 0, read_only:1, colsize: 1, columns: 1 },
                    { label: __('Invoice Valuation Rate'), fieldtype: 'Float', fieldname: 'invoice_valuation_rate', in_list_view:1, precision: 2, read_only:1, colsize: 1, columns: 1},
                    { label: __('Stock Qty'), fieldtype: 'Int', fieldname: 'stock_qty', in_list_view:1, precision: 0, read_only:1, colsize: 1, columns: 1},
                    { label: __('Stock Valuation Rate'), fieldtype: 'Float', fieldname: 'stock_valuation_rate', in_list_view:1 , precision: 2, read_only:1, colsize: 1, columns: 1},
                    { label: __('Selling Price'), fieldtype: 'Currency', fieldname: 'selling_price', in_list_view:1, precision: 0, colsize: 1, columns: 1},
                    { label: __('Proposed Price'), fieldtype: 'Data', fieldname: 'p_price', in_list_view:1, read_only:1, colsize: 1, columns: 1 },
                    { label: __('Price Name'), fieldtype: 'Data', fieldname: 'price_name', hidden:1 },
                ],
                data: [],
                get_data: ()=>{return []}
            },
            {
                label: __('Download Excel'),
                fieldtype: 'Button',
                fieldname: 'download_excel'
            },
            {
                label: __('Upload Excel'),
                fieldtype: 'Button',
                fieldname: 'upload_excel'
            }

        ],
        primary_action_label: __('Edit Prices'),
        primary_action: function(values) {
            prices = values.purchase_invoice_table.map(row => ({name:row.price_name, price: row.selling_price, item_code: row.item_code, production_year: row.production_year, item_name:row.item_name}))
            prices = prices.filter(row=>row.name)
            let args = {values:prices}
            if(values.price_list)
                args.selling_price_list = values.price_list;
            frm.call({method:"libya_customizations.server_script.purchase_invoice.edit_item_price", args})
            dialog.hide();
        }
    });

    cur_dialog = dialog;

    // Load initial data
    data = await fetchPurchaseInvoiceData(frm.doc.name, cur_dialog.get_value("price_list") || "");
    dialog.fields_dict.purchase_invoice_table.df.data = data;
    dialog.fields_dict.purchase_invoice_table.grid.refresh();

    dialog.fields_dict.download_excel.$wrapper.find('button').click(() => {
        const grid = dialog.fields_dict.purchase_invoice_table.grid;
        const table_data = grid.get_data();
        const fields = grid.df.fields;

        if (!table_data || table_data.length === 0) {
            frappe.msgprint(__('No data to download'));
            return;
        }

        const headers = fields.map(col => col.label);
        const keys = fields.map(col => col.fieldname);

        const sheet_data = [
            headers,
            ...table_data.map(row => keys.map(k => row[k] || ""))
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(sheet_data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice Data');

        const excelFile = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelFile], { type: 'application/octet-stream' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'purchase_invoice_data.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    dialog.fields_dict.upload_excel.$wrapper.find('button').click(() => {
        fileInput.click();
    });
    
    
    
    dialog.$wrapper.find('.modal-dialog').removeClass("modal-lg").css("max-width", "100%");
    Array.from(dialog.fields_dict.purchase_invoice_table.grid.grid_buttons[0].children).map(function(child, i){
        if( child.classList.contains("grid-add-row")){
            dialog.fields_dict.purchase_invoice_table.grid.grid_buttons[0].children[i].style.display = "none";
        }
    })
    dialog.fields_dict.purchase_invoice_table.wrapper.onchange = function(){
        	Array.from(dialog.fields_dict.purchase_invoice_table.grid.grid_buttons[0].children).map(function(child, i){
            		if( child.classList.contains("grid-add-row")){
                			dialog.fields_dict.purchase_invoice_table.grid.grid_buttons[0].children[i].style.display = "none";
                		}
                	})
                }
    // Show the dialog
    dialog.show();
    const fileInput = $('<input type="file" accept=".xlsx" style="display:none;">');
    $('body').append(fileInput);
    
    fileInput.on('change', function () {
        const file = this.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function (e) {
            const arrayBuffer = e.target.result;
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            // map label → fieldname
            const grid = dialog.fields_dict.purchase_invoice_table.grid;
            const field_map = {};
            grid.df.fields.forEach(col => field_map[col.label] = col.fieldname);

            const mapped_rows = data.map(row => {
                let r = {};
                for (const label in row) {
                    if (field_map[label]) {
                        r[field_map[label]] = row[label];
                    }
                }
                return r;
            });

            // update table data
            grid.df.data = mapped_rows;
            grid.refresh();
        };

        reader.readAsArrayBuffer(file);
    });

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
    dialog.fields_dict.purchase_invoice_table.$wrapper.keyup(function(e) {
        if(e.key === "Enter")
            e.preventDefault()
        let row_idx = Number(document.activeElement.parentElement.parentElement.parentElement.parentElement.querySelector(".row-index span").innerText) -1
        dialog.fields_dict.purchase_invoice_table.grid.data[row_idx].selling_price = e.target.value
    });
    
}


// Function to fetch the custom SQL data
async function fetchPurchaseInvoiceData(purchase_invoice, price_list) {
    let data = []
    await cur_frm.call({
        method: 'libya_customizations.server_script.purchase_invoice.get_purchase_invoice_data',
        args: {purchase_invoice, price_list},
        callback: function(response) {
            if (response && response.message) {
                data = response.message
            }
        }
    });
    return data;
}

frappe.ui.form.on("Purchase Invoice", {
    refresh: function(frm){
      	cur_frm.add_custom_button(__("Edit Prices"), () => openPurchaseInvoiceDialog(frm))
    }
})
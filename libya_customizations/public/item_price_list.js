frappe.listview_settings['Item Price'] = {
    onload: function (listview) {
        frappe.call({
            method: "libya_customizations.server_script.item_price.update_stock_valuation_rate",
            freeze: true,
            callback: function(r) {
                listview.refresh();
            }
        });
    }
};

        // Add the "Not Priced Items" button
        listview.page.add_inner_button(__('Non-Priced Items'), function () {
            listview.filter_area.clear();
            listview.filter_area.add([
                ['Item Price', 'price_list_rate', '=', 0],
                ['Item Price', 'stock_valuation_rate', '>', 0],
				['Item Price', 'selling', '=', 1]
            ]);
            listview.refresh();
        }, "Filters");

        // Add the "Items with Price Condition" button
        listview.page.add_inner_button(__('Non-Profitable Items'), function () {
            // Fetch records where price_list_rate > 0 and stock_valuation_rate > 0
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Item Price',
                    fields: ['name', 'price_list_rate', 'stock_valuation_rate'],
                    filters: [
                        ['Item Price', 'price_list_rate', '>', 0],
                        ['Item Price', 'stock_valuation_rate', '>', 0],
						['Item Price', 'selling', '=', 1]
                    ],
                    limit_page_length: 10000  // Increase the limit to fetch more records (unlimited for testing purposes)
                },
                callback: function(response) {
                    if (response.message && response.message.length > 0) {
                        // Filter the records client-side: price_list_rate < stock_valuation_rate
                        const filteredItemNames = response.message
                            .filter(item => item.price_list_rate < item.stock_valuation_rate)  // Apply the condition
                            .map(item => item.name);  // Extract the 'name' field

                        // If there are matching items, apply the "in" filter and refresh the list
                        if (filteredItemNames.length > 0) {
                            listview.filter_area.clear();
                            listview.filter_area.add([
                                ['Item Price', 'name', 'in', filteredItemNames]
                            ]);
                            listview.refresh();  // Refresh the list view with the filtered names
                        }
                    }
                }
            });
        }, "Filters");

        // Check if the user has the 'Chief Sales Officer' role
        if (frappe.user_roles.includes('Chief Sales Officer')) {
            // add the "Increase filtered items"
            listview.page.add_inner_button(__('Increase Item Prices'), function () {
                // Call the backend method
                let dialog = new frappe.ui.Dialog({
                    title: __('Increase Item Prices by Percentage'),
                    fields: [
                        {
                            fieldtype: 'Percent',
                            fieldname: 'increase_percent',
                            label: __('Increase Percent'),
                            reqd: 1
                        }
                    ],
                    primary_action_label: __('Apply'),
                    primary_action(values) {
                        // Call the custom function with the entered percentage
                        frappe.call({
                            method: 'libya_customizations.server_script.item_price.increase_item_price',
                            args: {
                                percent: values.increase_percent,
                                filters: listview.filter_area.get()
                            },
                            callback:()=>{
                                cur_list.refresh();
                            }
                        });
                        dialog.hide();
                    }
                });
            
                dialog.show();
            });

            // Add the "Export Item Prices" button
            listview.page.add_inner_button(__('Export Item Prices'), function () {
                // Call the backend method
                frappe.call({
                    method: 'libya_customizations.server_script.item_price.export_item_price_data',
                    args: {
                        filters: listview.filter_area.get()
                    },
                    callback: function (response) {
                        if (response.message) {
                            // Create and trigger download link
                            const download_link = document.createElement('a');
                            download_link.href = response.message;
                            download_link.download = 'Item Price.xlsx';
                            document.body.appendChild(download_link);
                            download_link.click();
                            document.body.removeChild(download_link);
                        } else {
                            frappe.msgprint(__('Unable to export data.'));
                        }
                    }
                });
            }, "Import & Export");

            // Add the "Import Item Prices" button
            listview.page.add_inner_button(__('Import Item Prices'), function () {
                var dialog = new frappe.ui.Dialog({
                    title: __('Import Item Prices'),
                    fields: [
                        {
                            fieldtype: 'Attach',
                            fieldname: 'file',
                            label: __('Select Excel File'),
                            reqd: true
                        }
                    ],
                    primary_action_label: __('Update'),
                    primary_action: function () {
                        var values = dialog.get_values();
                        if (values && values.file) {
                            // Trigger the file upload and data import process
                            upload_and_import(values.file);
                            dialog.hide();
                        }
                    }
                });
                dialog.show();
            }, "Import & Export");
        }
    }
};

function upload_and_import(file) {
    var formData = new FormData(); // Create FormData object
    formData.append('file', file);  // Append the file to FormData
    // Perform the AJAX call
    frappe.call({
        method: 'libya_customizations.server_script.item_price.import_item_price_data',
        args: {
            file_url: file
        },
        freeze: true,
        freeze_message: __('Uploading and Importing Data...'),
        callback: function(response) {
            if (response.message) {
                frappe.msgprint(__('File uploaded and Item Prices imported successfully.'));
                // Refresh the list view to reflect the changes
                console.log(response.message)
                frappe.views.ListView.refresh();
            } else {
                frappe.msgprint(__('Error occurred while importing the data.'));
            }
        }
    });
}

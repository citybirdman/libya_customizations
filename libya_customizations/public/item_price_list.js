frappe.listview_settings['Item Price'] = {
    onload: function(listview) {
        // Add a new button directly in the toolbar
        listview.page.add_inner_button(__('Export Item Prices'), function() {
            // Call the backend method
            frappe.call({
                method: 'libya_customizations.server_script.item_price.export_item_price_data',
                args:{
                    filters: listview.filter_area.get()
                },
                callback: function(response) {
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
        });

        listview.page.add_inner_button(__('Import Item Prices'), function() {
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
                primary_action: function() {
                    var values = dialog.get_values();
                    if (values && values.file) {
                        // Trigger the file upload and data import process
                        upload_and_import(values.file);
                        dialog.hide();
                    }
                }
            });
            dialog.show();
        });
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
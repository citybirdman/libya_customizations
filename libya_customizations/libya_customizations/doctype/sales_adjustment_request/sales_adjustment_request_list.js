frappe.listview_settings['Sales Adjustment Request'] = {
    refresh: function(listview) {
        listview.page.clear_primary_action();

        listview.page.wrapper.on('change', '.list-row-checkbox', function() {
            listview.page.clear_primary_action();
        });

        listview.page.wrapper.on('change', '.list-header-checkbox', function() {
            listview.page.clear_primary_action();
        });
        
        listview.page.wrapper.on('change', '.list-check-all', function() {
            listview.page.clear_primary_action();
        });
    }
};
frappe.listview_settings["Delivery Note"] = {
    get_indicator: function(doc) {
        if(!["Closed"].includes(doc.status)){
            if (doc.custom_per_billed === 0 && doc.docstatus == 1) {
                return ["Not Billed", "red", "billing_status,=,Not Billed"];
            } else if (doc.custom_per_billed < 100 && doc.docstatus == 1) {
                return ["Partly Billed", "orange", "billing_status,=,Partly Billed"];
            } else if (doc.custom_per_billed === 100  && doc.docstatus == 1) {
                return ["Fully Billed", "green", "billing_status,=,Fully Billed"];
            }
        }else{
            if (doc.status === "Closed") {
                return [__("Closed"), "green", "status,=,Closed"];
            }
        }
    }
};
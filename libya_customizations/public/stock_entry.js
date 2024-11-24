frappe.ui.form.on("Stock Entry", {
    onload(frm) {
        // Handle item grid button visibility changes
        frm.fields_dict.items.wrapper.onchange = function() {
            frm.fields_dict.items.wrapper.querySelectorAll(".btn-open-row").forEach(btn => btn.remove());
            // const gridButtons = frm.fields_dict.items.grid.grid_buttons[0].children;
            // gridButtons[1].style.display = "none"; // Edit button
            // gridButtons[2].style.display = "none"; // Delete button
            // gridButtons[3].style.display = "none"; // Duplicate button
            // frm.fields_dict.items.grid.wrapper.find('.grid-delete-row').hide(); // Hide delete row
            frm.fields_dict.items.wrapper.querySelector(".grid-upload").style.display = "none"; // Hide upload button
            frm.fields_dict.items.wrapper.querySelector(".grid-download").style.display = "none"; // Hide download button
        };
    },

    onload_post_render(frm) {
        // Remove unnecessary buttons on load
        const buttonsToRemove = [
            ["Material Request", "Create"],
			["Purchase Invoice", "Get Items From"],
			["Material Request", "Get Items From"],
			["Transit Entry", "Get Items From"],
			["Bill of Materials", "Get Items From"]
        ];

        buttonsToRemove.forEach(([button, action]) => {
            frm.remove_custom_button(button, action);
        });
    },

    refresh(frm) {
        // Slight delay to ensure form is fully loaded before removing buttons
        setTimeout(() => {
            const buttonsToRemove = [
                ["Material Request", "Create"],
				["Purchase Invoice", "Get Items From"],
				["Material Request", "Get Items From"],
				["Transit Entry", "Get Items From"],
				["Bill of Materials", "Get Items From"]
            ];

            buttonsToRemove.forEach(([button, action]) => {
                frm.remove_custom_button(button, action);
            });
        }, 300); 
    }
});

frappe.ui.form.on('Stock Entry', {
	calculate_total_qty: frm => {
	    let total_qty = flt(0.0);
	    frm.doc.items.forEach(item => {
	        if(item.qty) {
                total_qty += flt(item.qty);
	        }
	    });
	    frm.set_value('total_qty', total_qty);
	}
});

frappe.ui.form.on('Stock Entry Detail', {
	qty: function(frm) {
	    frm.trigger('calculate_total_qty');
	},
	item_code: function(frm) {
	    frm.trigger('calculate_total_qty');
	},
	items_remove: function(frm) {
	    frm.trigger('calculate_total_qty');
	}
});

frappe.ui.form.on('Stock Entry', {
	before_save: function(frm) {
	    frm.trigger('calculate_total_qty');
	}
});
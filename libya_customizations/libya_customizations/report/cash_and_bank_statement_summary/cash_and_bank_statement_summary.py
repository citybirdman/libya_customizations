# Copyright (c) 2025, Ahmed Zaytoon and contributors
# For license information, please see license.txt

# Copyright (c) 2025, Your Company
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
    if not filters:
        filters = {}

    params = {
        "account": filters.get("account"),
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }

    query = """
    -- Your full SQL query goes here, exactly as you wrote it
    WITH
    against_wise_vouchers AS (
        SELECT
            'Transfer Voucher' AS doctype,
            name,
            paid_to AS against
        FROM
            `tabTransfer Voucher`
        WHERE
            docstatus = 1
        UNION ALL
        SELECT
            'Payment Voucher' AS doctype,
            name,
            IF(party_type IS NOT NULL AND party_type != '', party_name, paid_to) AS against
        FROM
            `tabPayment Voucher`
        WHERE
            docstatus = 1
        UNION ALL
        SELECT
            'Receipt Voucher' AS doctype,
            name,
            IF(party_type IS NOT NULL AND party_type != '', party_name, paid_from) AS against
        FROM
            `tabReceipt Voucher`
        WHERE
            docstatus = 1
        UNION ALL
        SELECT
            'Sales Invoice' AS doctype,
            name,
            customer_name AS against
        FROM
            `tabSales Invoice`
        WHERE
            docstatus = 1
            AND is_paid = 1
    ),
    custom_vouchers AS (
        SELECT
            'Payment Entry' AS voucher_type,
            name AS voucher_no,
            custom_voucher_type,
            custom_voucher_no
        FROM
            `tabPayment Entry`
        WHERE
            docstatus = 1
            AND custom_voucher_type IS NOT NULL
            AND posting_date BETWEEN %(from_date)s AND %(to_date)s
        UNION ALL
        SELECT
            'Journal Entry' AS voucher_type,
            name AS voucher_no,
            custom_voucher_type,
            custom_voucher_no
        FROM
            `tabJournal Entry`
        WHERE
            docstatus = 1
            AND custom_voucher_type IS NOT NULL
            AND posting_date BETWEEN %(from_date)s AND %(to_date)s
    ),
    sys_gen_gl_entries AS (
        SELECT
            name,
            is_system_generated
        FROM
            `tabJournal Entry`
        WHERE
            docstatus = 1
            AND is_system_generated = 1
    ),
    opening_1 AS (
        SELECT
            NULL AS posting_date,
            'Opening' AS voucher_type,
            NULL AS voucher_no,
            SUM(debit) AS debit,
            SUM(credit) AS credit,
            NULL AS remarks
        FROM
            `tabGL Entry`
        WHERE
            is_cancelled = 0
            AND is_opening = 'No'
            AND account = %(account)s
            AND posting_date < %(from_date)s
    ),
    opening_2 AS (
        SELECT
            NULL AS posting_date,
            'Opening' AS voucher_type,
            NULL AS voucher_no,
            SUM(debit) AS debit,
            SUM(credit) AS credit,
            NULL AS remarks
        FROM
            `tabGL Entry`
        WHERE
            is_cancelled = 0
            AND is_opening = 'Yes'
            AND account = %(account)s
    ),
    opening AS (
        SELECT
            posting_date,
            voucher_type,
            voucher_no,
            IFNULL(SUM(debit), 0) AS debit,
            IFNULL(SUM(credit), 0) AS credit,
            remarks
        FROM
        (
            SELECT * FROM opening_1
            UNION ALL
            SELECT * FROM opening_2
        ) opening
        GROUP BY
            posting_date,
            voucher_type,
            voucher_no,
            remarks
    ),
    transactions AS (
        SELECT
            gl_entry.posting_date,
            IF(custom_vouchers.custom_voucher_type IS NOT NULL, custom_vouchers.custom_voucher_type, gl_entry.voucher_type) AS voucher_type,
            IF(custom_vouchers.custom_voucher_no IS NOT NULL, custom_vouchers.custom_voucher_no, gl_entry.voucher_no) AS voucher_no,
            SUM(debit) AS debit,
            SUM(credit) AS credit,
            remarks
        FROM
            `tabGL Entry` gl_entry
        LEFT JOIN
            custom_vouchers
        ON
            gl_entry.voucher_type = custom_vouchers.voucher_type
            AND gl_entry.voucher_no = custom_vouchers.voucher_no
        LEFT JOIN
            sys_gen_gl_entries
        ON
            gl_entry.voucher_no = sys_gen_gl_entries.name
        WHERE
            gl_entry.is_cancelled = 0
            AND gl_entry.is_opening = 'No'
            AND IFNULL(sys_gen_gl_entries.is_system_generated, 0) != 1
            AND gl_entry.account = %(account)s
            AND gl_entry.posting_date BETWEEN %(from_date)s AND %(to_date)s
        GROUP BY
            gl_entry.posting_date,
            IF(custom_vouchers.custom_voucher_type IS NOT NULL, custom_vouchers.custom_voucher_type, gl_entry.voucher_type),
            IF(custom_vouchers.custom_voucher_no IS NOT NULL, custom_vouchers.custom_voucher_no, gl_entry.voucher_no),
            remarks
    ),
    translation AS (
        SELECT
            source_text,
            translated_text
        FROM
            `tabTranslation`
        WHERE
            language = 'ar'
        GROUP BY
            source_text
    ),
    opening_and_transactions AS (
        SELECT
            gl_entry.posting_date,
            IF(translation.translated_text IS NOT NULL, translation.translated_text, gl_entry.voucher_type) as translated_voucher_type,
            gl_entry.voucher_no,
            gl_entry.debit,
            gl_entry.credit,
            SUM(gl_entry.debit) OVER (ORDER BY gl_entry.posting_date, gl_entry.voucher_no, gl_entry.remarks)
              - SUM(gl_entry.credit) OVER (ORDER BY gl_entry.posting_date, gl_entry.voucher_no, gl_entry.remarks) AS balance,
            against_wise_vouchers.against,
            gl_entry.remarks,
            gl_entry.voucher_type
        FROM
        (
            SELECT * FROM opening
            UNION ALL
            SELECT * FROM transactions
        ) gl_entry
        LEFT JOIN
            translation
        ON
            gl_entry.voucher_type = translation.source_text
        LEFT JOIN
            against_wise_vouchers
        ON
            gl_entry.voucher_type = against_wise_vouchers.doctype
            AND gl_entry.voucher_no = against_wise_vouchers.name
        ORDER BY
            gl_entry.posting_date,
            gl_entry.voucher_no
    ),
    transactions_total AS (
        SELECT
            NULL AS posting_date,
            'الإجمالي' AS translated_voucher_type,
            NULL AS voucher_no,
            SUM(debit) AS debit,
            SUM(credit) AS credit,
            (SELECT SUM(debit) - SUM(credit)
             FROM `tabGL Entry`
             WHERE is_cancelled = 0
               AND account = %(account)s
               AND posting_date <= %(to_date)s) AS balance,
            NULL AS against,
            NULL AS remarks,
            NULL AS voucher_type
        FROM
            `tabGL Entry` gl_entry
        LEFT JOIN
            custom_vouchers
        ON
            gl_entry.voucher_type = custom_vouchers.voucher_type
            AND gl_entry.voucher_no = custom_vouchers.voucher_no
        LEFT JOIN
            sys_gen_gl_entries
        ON
            gl_entry.voucher_no = sys_gen_gl_entries.name
        WHERE
            gl_entry.is_cancelled = 0
            AND gl_entry.is_opening = 'No'
            AND IFNULL(sys_gen_gl_entries.is_system_generated, 0) != 1
            AND gl_entry.account = %(account)s
            AND gl_entry.posting_date BETWEEN %(from_date)s AND %(to_date)s
    )
    SELECT * FROM opening_and_transactions
    UNION ALL
    SELECT * FROM transactions_total
    """

    data = frappe.db.sql(query, params, as_dict=True)

    columns = [
        {"label": _("Posting Date"), "fieldname": "posting_date", "fieldtype": "Date", "width": 120},
        {"label": _("Voucher Type"), "fieldname": "translated_voucher_type", "fieldtype": "Data", "width": 200},
        {"label": _("Voucher No"), "fieldname": "voucher_no", "fieldtype": "Dynamic Link", "options": "voucher_type", "width": 200},
        {"label": _("Debit"), "fieldname": "debit", "fieldtype": "Currency", "width": 100},
        {"label": _("Credit"), "fieldname": "credit", "fieldtype": "Currency", "width": 100},
        {"label": _("Balance"), "fieldname": "balance", "fieldtype": "Currency", "width": 120},
        {"label": _("Against Account"), "fieldname": "against", "fieldtype": "Data", "width": 200},
        {"label": _("Remarks"), "fieldname": "remarks", "fieldtype": "Data", "width": 300},
        {"label": _("Voucher Type (Original)"), "fieldname": "voucher_type", "fieldtype": "Data", "width": 150},
    ]

    return columns, data
import frappe
from erpnext.accounts.doctype.journal_entry.journal_entry import JournalEntry

class CustomJournalEntry(JournalEntry):
    def check_credit_limit(self):
        if self.flags.ignore_credit_limit:
            return
        super().check_credit_limit()
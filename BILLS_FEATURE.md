# Bills & Recurring Payments Feature

## Overview

The Bills page allows you to track recurring bills and payments such as:
- Mortgage/rent
- Utilities (water, electric, gas)
- Council tax
- Insurance (home, car, pet)
- Subscriptions
- Phone/internet
- And more...

## Features

### 1. Add Bills
Click "Bills" in the sidebar, then use the form to add new bills with:
- **Bill name** - e.g., "Mortgage", "Water Bill", "Netflix"
- **Category** - Housing, Utilities, Transport, Insurance, Subscription, Other
- **Amount** - Monthly payment (in £)
- **Frequency** - Weekly, Fortnightly, Monthly, Quarterly, Yearly
- **Next payment date** - When the next payment is due
- **Payment type**:
  - **Ongoing** (Monthly/Weekly/Yearly) - Bill continues indefinitely
  - **Fixed end date** - Bill ends on a specific date
- **Notes** - Optional: account reference, provider contact, etc.

### 2. View Bills
Bills are displayed as cards showing:
- Bill name and category
- Amount and frequency
- **Next payment date**
- **Status indicator**:
  - 🔴 **TODAY** - Payment due today
  - 🟡 **Due soon** - Due within 7 days
  - 🟢 **Upcoming** - Due later than 7 days
  - ⚠️ **OVERDUE** - Payment date has passed (for recurring bills, shows next occurrence)
- **Days until next payment**
- **Duration**:
  - For fixed-term bills: "X months remaining"
  - For ongoing bills: "Monthly (ongoing)", etc.
- **Edit** and **Remove** buttons

### 3. Edit Bills
Click the "Edit" button on any bill card to:
- Update any field (name, category, amount, frequency, dates)
- Change payment type (ongoing ↔ fixed date)
- Add or update notes
- Save changes or cancel

### 4. Delete Bills
Click "Remove" to delete a bill. Confirm the deletion.

## Data Structure

Each bill is stored with:
```javascript
{
  id: timestamp,              // Unique identifier
  name: "Mortgage",           // Bill name
  category: "housing",        // Category
  amount: 500,                // Monthly/weekly/yearly amount
  frequency: "Monthly",       // Display frequency
  nextPaymentDate: "2026-06-01",  // Next payment
  recurring: "monthly",       // Recurrence type: monthly/weekly/yearly/never
  endDate: "2035-01-01",      // For fixed-term bills only
  notes: "Account 12345",     // Optional notes
  createdDate: "2026-05-11"   // When bill was added
}
```

## Examples

### Mortgage (Fixed-term, monthly)
- Name: Mortgage
- Category: Housing
- Amount: 500.00
- Frequency: Monthly
- Next payment: 1st of each month
- Type: Monthly (ongoing)
- No end date (unless you know when it ends)

### Council Tax (Fixed-term, annual)
- Name: Council Tax 2025/26
- Category: Housing
- Amount: 1200.00 (annual)
- Frequency: Yearly
- Next payment: 01/04/2026
- Type: Yearly (ongoing)

### Gym Subscription (Fixed-term with end date)
- Name: Gym Membership
- Category: Subscription
- Amount: 30.00
- Frequency: Monthly
- Next payment: 15th
- Type: Fixed end date
- End date: 31/12/2026

### Water Rates (Fixed-term, quarterly)
- Name: Water Rates
- Category: Utilities
- Amount: 150.00 (quarterly)
- Frequency: Quarterly
- Next payment: 01/07/2026
- Type: Quarterly (ongoing)

## How It Works

### Next Payment Calculation
- The system shows the next payment date you specify
- For recurring bills that have passed, it automatically calculates the next occurrence
- Days until payment is calculated from today

### Status Indicators
```
Today (payment due today)              → 🔴
Due within 7 days                      → 🟡
Due more than 7 days away              → 🟢
Payment date has passed (recurring)    → ⚠️ OVERDUE (shows next occurrence)
```

### Duration Display
- **Ongoing bills**: Show recurrence type, e.g., "Monthly (ongoing)"
- **Fixed-term bills**: Calculate months remaining until end date, e.g., "8 months remaining"

## Tips & Best Practices

1. **Set next payment dates accurately** - Use the exact date bills are due
2. **Use categories** - Makes it easier to filter and understand spending
3. **Add notes** - Store account numbers or provider details for reference
4. **Check status regularly** - Bills about to be due will show with 🟡 status
5. **Track fixed-term bills** - Gym memberships, insurance policies, subscriptions
6. **Estimate annual costs** - Multiply bills by frequency to plan budgets

## Bulk Actions
Future enhancement: Batch edit multiple bills, bulk import from CSV, etc.

## Data Persistence
- All bills are automatically saved to localStorage
- Bills persist even when you close the browser
- Use "Clear all data" in Settings to reset everything

## Future Enhancements
- Bill payment history tracking
- Receipt/document attachments
- Payment reminders (email/SMS)
- Annual bill summary & trends
- Bill splitting between household members
- Budget forecasting
- Integration with payment systems

---

**Added**: May 11, 2026  
**Status**: Production ready  
**Storage**: localStorage (wealth-dashboard-v4)

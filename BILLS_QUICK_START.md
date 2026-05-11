# Bills Tracker - Quick Start Guide

## What You Can Track

Your finance dashboard now includes a Bills page for tracking recurring payments:

**Categories**:
- 🏠 **Housing** - Mortgage, rent, council tax
- 💧 **Utilities** - Water, electricity, gas, internet
- 🚗 **Transport** - Car insurance, fuel, maintenance, parking
- 🛡️ **Insurance** - Home, pet, life, etc.
- 📺 **Subscriptions** - Netflix, gym, software, etc.
- 🎯 **Other** - Anything else

## Adding Your First Bill

1. Click **Bills** in the sidebar
2. Scroll down to "Add new bill" form
3. Fill in:
   - **Bill name**: e.g., "Mortgage" or "Water Bill"
   - **Category**: Choose from dropdown
   - **Amount**: £ per payment (e.g., 500 for monthly mortgage)
   - **Frequency**: How often paid (Monthly, Quarterly, etc.)
   - **Next payment date**: When is it due?
   - **Payment type**: 
     - Choose **"Monthly (ongoing)"** for bills that continue indefinitely
     - Choose **"Fixed end date"** for temporary bills (subscriptions, contracts)
   - **Notes** (optional): Account number, provider contact, etc.
4. Click **+ Add bill**

## Understanding Your Bill Cards

Each bill shows:
```
┌─────────────────────────┐
│ Bill Name     Amount    │
│ Category      Frequency │
├─────────────────────────┤
│ Next payment: 1 June    │
│ 🟢 Upcoming              │
│ 19 days remaining       │
│ (or "5 months remaining"│
│  for fixed-term bills)  │
├─────────────────────────┤
│ [✎ Edit] [✕ Remove]    │
└─────────────────────────┘
```

## Status Indicators Explained

| Icon | Status | Meaning |
|------|--------|---------|
| 🔴 | TODAY | Payment due today |
| 🟡 | DUE SOON | Due within 7 days |
| 🟢 | UPCOMING | Due later than 7 days |
| ⚠️ | OVERDUE | Past due (for rolling bills, shows next occurrence) |

## Common Scenarios

### Scenario 1: Monthly Mortgage
```
Name:           Mortgage
Category:       Housing
Amount:         £500.00
Frequency:      Monthly
Next payment:   1st June 2026
Type:           Monthly (ongoing)
Status:         Will show "Monthly (ongoing)"
```

### Scenario 2: Annual Council Tax
```
Name:           Council Tax 2025/26
Category:       Housing
Amount:         £1,200.00
Frequency:      Yearly
Next payment:   1st April 2026
Type:           Yearly (ongoing)
Status:         Will show "Yearly (ongoing)"
```

### Scenario 3: Gym Subscription (ends Dec 2026)
```
Name:           Gym Membership
Category:       Subscription
Amount:         £30.00
Frequency:      Monthly
Next payment:   15th June 2026
Type:           Fixed end date
End date:       31st December 2026
Status:         Will show "7 months remaining"
```

### Scenario 4: Quarterly Water Rates
```
Name:           Water Rates
Category:       Utilities
Amount:         £150.00
Frequency:      Quarterly
Next payment:   1st July 2026
Type:           Quarterly (ongoing)
Status:         Will show "Quarterly (ongoing)"
```

## Editing Bills

1. Click **✎ Edit** on any bill card
2. A modal appears with all fields editable
3. Update any information you need
4. If you change from "ongoing" to "fixed date", an end date field appears
5. Click **Save changes** or **Cancel**

## Deleting Bills

1. Click **✕ Remove** on any bill card
2. Confirm deletion
3. Bill is permanently removed

## Tips

✅ **Be accurate with dates** - Use exact payment dates so the system can track them correctly

✅ **Use categories** - Makes it easier to see spending patterns by category

✅ **Add notes** - Store account numbers or provider contact info for reference

✅ **Check regularly** - Bills with 🟡 status need attention soon

✅ **Plan finances** - See all bills at a glance to plan your monthly budget

## How Duration Works

**For recurring (ongoing) bills:**
- Shows the frequency: "Monthly (ongoing)", "Yearly (ongoing)", etc.
- These continue indefinitely unless you delete them

**For fixed-term bills (with end date):**
- Shows months remaining: "8 months remaining"
- Updates automatically based on today's date
- Bill card will disappear after the end date (optional: keep for history)

## Data Persistence

✅ All bills are automatically saved to your browser's localStorage  
✅ Data persists even when you close the browser  
✅ All bills are part of your dashboard backup  
✅ Use "Clear all data" in Settings only if you want to reset everything  

## Integration with Other Features

- Bills are separate from Debts (use Debts for loans, Bills for recurring payments)
- Bills are separate from Goals (track goals separately)
- Consider bills when viewing your monthly budget
- Bills complement Transactions and other financial tracking

## Troubleshooting

**Bill not showing after adding?**
- Refresh the page (Cmd+R or Ctrl+R)
- Check browser console for errors

**Payment date calculations seem off?**
- Make sure your device date/time is correct
- Verify next payment date is accurate

**Accidentally deleted a bill?**
- Use undo if available, or manually recreate it
- Data is lost if not backed up separately

## Future Enhancements (Coming Soon)

- Payment history tracking
- Receipt/document uploads
- Email/SMS reminders
- Annual bill summaries
- Budget forecasting
- Shared bills (household split)
- Payment integration

## Need Help?

See the full **BILLS_FEATURE.md** for comprehensive documentation including:
- Complete feature list
- Data structure details
- Best practices
- Advanced usage patterns

---

**Quick Navigation**: Bills is available in the sidebar under "Financial" section  
**Keyboard Shortcut**: Use arrow keys to navigate (if enabled)  
**Mobile**: Bills cards are responsive and work on mobile devices  

**Happy tracking! 📋**

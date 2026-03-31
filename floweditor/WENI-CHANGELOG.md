3.6.2
----------
- fix: open ticket queue selection

3.6.1
----------
- fix: improve handling of list messages in Simulator component

3.6.0
----------
- Feat: Add instagram tab in Send Message form

3.5.1
----------
- Feat: Add cart simulation parameters to WhatsApp product form

3.5.0
----------
- Feat: Add sentry integration

3.4.4
----------
- Fix: Handle undefined list_items in localizations

3.4.3
----------
- Fix: List message localization

3.4.2
----------
- Feat: WhatsApp options reordenation.
- Fix: Fix: Simulator for WhatsApp card messages.

3.4.1
----------
- Fix: Update test snapshots

3.4.0
----------
- Feat: WhatsApp Order Details

3.3.0
----------
- Feat: Add support to attachments in whatsapp flows
- Fix: Show new variables if not in existing action flow_data

3.2.1
----------
- Fix: Send WhatsApp message emoji picker

3.2.0
----------
- Feat: Prevent mutable actions on immutable flow
- Feat: add more tests to Node component
- Feat: add translation do dateFormat months in revision explorer
- Feat: WhatsApp Flows

3.1.3
----------
- Feat: Send WhatsApp Message localization form;

3.1.2
----------
- Fix: Update missing translations;

3.1.1
----------
- Fix: Brain card initializa form;

3.1.0
----------
- Feat: Add text input to Call Weni Brain card;

3.0.2
----------
- Fix: enable arrow keys and 'Enter' key when adding new cards;

3.0.1
----------
- Fix: Split by contact field card checkbox;
- Fix: Allow copy of split randomly card;

3.0.0
----------
- Feat: Node 18
- Feat: Unnnic Vue 3
- Feat: Vite instead of CRA
- Feat: Typescript 3.9
- Feat: Veaury instead of vuereact-combined
- Feat: Eslint 8

2.17.1
----------
- Fix: Allow the use of expressions in the search URL of the native product search card.

2.17.0
----------
- Feat: URL button to WhatsApp Card.

2.16.1
----------
- Fix: Brain card filter condition

2.16.0
----------
- Feat: Brain card

2.15.1
----------
- Refactor: Add Temba Select generic pagination

2.15.0
----------
- Feat: Send WhatsApp Message card

2.14.0
----------
- Feat: Search whatsapp product by title
- Feat: Add highlight to searched words
- Fix: Navigation through cards continuously

2.13.1
----------
- Fix: Set focus in text input
- Fix: Remove browser default search card
- Feat: Navigation through cards using the enter key

2.13.0
----------
- Feat: Search Bar

2.12.0
----------
- Refactor: Remove unnnic button next usage
- Feat: VTEX search with postal code

2.11.1
----------
- Fix: Remove external service empty parameters
- Feat: Update smart argument and category validations

2.11.0
----------
Feat: Zeroshot description alert

2.10.4
----------
Fix: Add wenigpt action to result listing condition

2.10.3
----------
Feat: Add default wenigpt input

2.10.2
----------
Fix: Change default wenigpt input value translations

2.10.1
----------
Fix: Change default wenigpt input value

2.10.0
----------
Update README.md
Fix: Include smart router in case localization condition
Fix: Keys affecting canvas on non canvas inputs
Feat: Change default mouse state to select
Feat: WeniGPT Router

2.9.2
----------
Feat: Add localization support into smart routers

2.9.1
----------
Feat: Smart routers phrases text
Feat: Vtex seller id search

2.9.0
----------
Feat: VTEX Product Search
Feat: Change node colors
Fix: Width for send_catalog card

2.8.2
----------
Fix: Catalog translations 
Feat: Use whatsapp_catalog feature filter on send catalog card

2.8.1
----------
Chore: Bump version

2.8.0
----------
Feat: Send product/catalog card

2.7.1
----------
Feat: Use @material-symbols/font-400 to reduce font load size and time
Feat: Use default UnnnicInput

2.7.0
----------
Feat: Control tools guide and modal
Feat: Change default mouse state into DRAG
Feat: Find starting node button
Fix: Ghost node position on canvas scroll

2.6.5
----------
- Fix: check stickies before parse

2.6.4
----------
- Fix: parse sticky position on definition load
- Fix: Paste action changing mouse state

2.6.3
----------
- Fix: Language selector and sidebar positions
- Feat: Remove zeroshot authorization from logevent

2.6.2
----------
- Fix: Parse float in flow definition loading

2.6.1
----------
- Fix: OS comparison from scroll
- Fix: Canvas initial connectors position
- Feat: New Sidebar and Zoom Control icons
- Feat: Add shift scroll into canvas

2.6.0
----------
- Add pan and zoom functionality
- Fixed node pasting behavior
- New connector colors

2.5.2
----------
- Fix: Align updates modal footer text
- Fix: Simulator webhook log height
- Fix: Allow different letters cases in category name

2.5.1
----------
- Fix: Updates modal footer text

2.5.0
----------
- Feat: Performance improvements
- Feat: New updates modal content
- Fix: Prevent completion menu to show on card open

2.4.1
----------
- Fix: Smart cases regex and placeholders

2.4.0
----------
- Feat: Zeroshot routers (Smart Wait for Response and Automatic Classify)

2.3.0
----------
- Chore: Bump version

2.2.0
----------
- Fix: Modify delete node phrase
- Fix: Dialog height on small screens
- Fix: Check for static uuids before copy action
- Feat: New sidebar tooltips

2.1.0
----------
- Fix: Update select component

2.0.3
----------
- Fix: Add texts into quick replies and node deletion cards
- Fix: Node add alignment
- Fix: Check if service is defined before param map
- Fix: Add linebreaks on simulator and sendmsg renders

2.0.2
----------
- Fix: Prevent needless rerenders on TembaSelect
- Fix: TembaSelect get next pages of options

2.0.1
----------
* Fix: enter not working on temba completion
* Fix: clear input value if showValue is false

2.0.0
----------
* Feature: Unnnic system migration
* Feature: Action Sidebar
* Feature: Copy and Paste nodes
* Feature: Simulator WhatsApp skin

1.3.1-floweditor-1.15.2
----------
* Fix: Handle nonexistent service when creating the router state

1.3.0-floweditor-1.15.2
----------
* Feat: ChatGPT External Service

1.2.1-floweditor-1.15.2
----------
* Fix: External services action name

1.2.0-floweditor-1.15.2
----------
* New External Services router card

1.1.2-floweditor-1.15.2
----------
* Fix: Case removal and reorder on expression and field routers

1.1.1-floweditor-1.15.2
----------
* Fix get ticketer uuid when coming from assetStore

1.1.0-floweditor-1.15.2
----------
* Add wenichats ticketer integration

1.0.0-floweditor-1.15.2
----------
* Add instagram, slack and teams schemes available in split by URN
* More options in wait for response
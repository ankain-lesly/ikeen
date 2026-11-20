# Product Requirements Document (PRD)
**GoGET Connected Delivery Platform**

| | | 
| :--- | :--- |
| **Document Version:** | 2.0  |
| **Prepared For:** | GoGET Management & Operations  |
| **Scope:** | Requirements & Scope Definition |
| **Related document:** | [GoGET Proposal](goget-doc.md) |
| **Author:** | Lesly Chuo |
| **Email:** | lesly@leslychuo.me |

---

## 1. Overview

### 1.1 Purpose
This document defines what the GoGET Connected Delivery Platform must do, for whom, and how we will know it works. It describes the product through user stories and acceptance criteria. Technical design is covered separately.

### 1.2 Problem
GoGET runs three systems that do not talk to each other:

- **O-Zeller:** Vendors and staff create delivery orders and manage stock.
- **Delivery Dispatch:** Staff track delivery statistics and drivers.
- **GoGET API (GoChat):** Staff keep client contacts and send WhatsApp broadcasts.

Everything between these systems is done by hand. Orders are posted into WhatsApp groups, drivers pick jobs from the group and call vendors and customers by phone, and staff later re-type delivery details into Delivery Dispatch and customer contacts into GoGET API. Payments made to drivers or vendors are worked out from chat history.

### 1.3 Goals
1. Remove manual re-entry of order, delivery, and contact data across the three systems.
2. Give every order a single, clear owner (one driver) from acceptance to delivery.
3. Keep customers and vendors informed automatically, without phone calls.
4. Record who collected payment for every delivery at the moment it happens.
5. Give management accurate daily figures without manual counting.

### 1.4 Non-Goals (This Release)
- Replacing O-Zeller, Delivery Dispatch, or GoGET API.
- Changing how drivers are paid (monthly salaries remain unchanged).
- Online card payments or a customer-facing ordering app.
- Automatic route optimization across multiple orders.

---

## 2. Users

| User | Who they are | What they need from the platform |
| :--- | :--- | :--- |
| **Vendor** | Business that sells goods and requests deliveries through O-Zeller. | Request a delivery once and know it is being handled. |
| **GoGET Staff** | Internal team that creates orders on behalf of vendors. | Same as vendors, with visibility across all vendors. |
| **Driver** | GoGET rider who collects and delivers packages. | Clear jobs, directions, and a simple way to report progress. |
| **Dispatcher** | Staff member who oversees deliveries and drivers. | A live view of every order and driver without typing anything. |
| **Customer** | Person receiving the delivery. | To know when the package is coming and who is bringing it. |
| **Manager / Accounts** | Management responsible for reporting and settlements. | Accurate daily delivery and payment figures. |

---

## 3. Scope

### In Scope
- Automatic transfer of new O-Zeller orders to Delivery Dispatch and GoGET API.
- Driver workspace for accepting, navigating, and completing deliveries.
- Google Maps navigation to vendor and customer.
- Automatic WhatsApp messages to drivers, customers, and vendors.
- Payment recording at delivery.
- Dispatcher live view and exception handling.
- Daily reports and a scheduled daily contact sync and broadcast.

### Out of Scope
- Stock management changes inside O-Zeller.
- Customer self-service order tracking pages (future consideration).
- Payroll calculation.

---

## 4. User Stories

**Priority key:** **Must** = required for launch · **Should** = expected shortly after launch · **Could** = future improvement

---

### Epic 1: Requesting a Delivery

#### US-1.1 — Request a delivery once
> **As a** vendor or GoGET staff member,  
> **I want** my order to reach GoGET's delivery team as soon as I create it in O-Zeller,  
> **so that** I don't have to copy it into WhatsApp or follow up by phone.

**Priority:** Must

**Acceptance criteria**
- [ ] When an order is created in O-Zeller, it appears in Delivery Dispatch within a few seconds without anyone retyping it.
- [ ] The order keeps the vendor, customer name, phone number, town, address, items, and total exactly as entered in O-Zeller.
- [ ] The same order is never created twice, even if O-Zeller sends it more than once.
- [ ] If Delivery Dispatch is temporarily unavailable, the order is kept and delivered once it is back. No order is lost.

#### US-1.2 — Get confirmation that the order was received
> **As a** vendor,  
> **I want** confirmation that GoGET has received my delivery request,  
> **so that** I know it is in progress.

**Priority:** Should

**Acceptance criteria**
- [ ] The vendor receives a WhatsApp confirmation with the order number once the order reaches GoGET.
- [ ] The confirmation includes the customer name and town.

---

### Epic 2: Assigning Drivers

#### US-2.1 — See available deliveries
> **As a** driver,  
> **I want** to see a clear list of deliveries waiting for a driver,  
> **so that** I don't have to scroll through a busy WhatsApp group.

**Priority:** Must

**Acceptance criteria**
- [ ] Each delivery shows the vendor name and pickup town, the drop-off town and landmark, and the number of items.
- [ ] New deliveries appear in the list without the driver refreshing manually.
- [ ] Deliveries already taken by another driver disappear from the list.

#### US-2.2 — Accept a delivery
> **As a** driver,  
> **I want** to accept a delivery with one tap,  
> **so that** it is clearly mine and no one else takes it.

**Priority:** Must

**Acceptance criteria**
- [ ] Tapping **Accept Delivery** assigns the order to that driver only.
- [ ] If two drivers tap at almost the same time, only the first one gets the order. The other sees "This delivery has already been taken."
- [ ] Delivery Dispatch shows the assigned driver and the time of acceptance.

#### US-2.3 — Be notified of new deliveries
> **As a** driver,  
> **I want** an alert when a new delivery is available,  
> **so that** I can respond quickly.

**Priority:** Must

**Acceptance criteria**
- [ ] Drivers receive an alert (in the driver workspace and/or WhatsApp) when a new delivery becomes available.
- [ ] The alert links directly to the delivery details.

#### US-2.4 — Assign or reassign a delivery manually
> **As a** dispatcher,  
> **I want** to assign a delivery to a specific driver or move it to another driver,  
> **so that** I can handle urgent orders, absences, or delays.

**Priority:** Should

**Acceptance criteria**
- [ ] The dispatcher can assign any waiting delivery to a chosen driver.
- [ ] The dispatcher can move an accepted delivery to another driver before pickup.
- [ ] Both drivers are notified of the change.
- [ ] The change is recorded with the dispatcher's name and time.

---

### Epic 3: Navigation

#### US-3.1 — Navigate to the vendor
> **As a** driver,  
> **I want** to open directions to the vendor with one tap,  
> **so that** I don't have to call for directions.

**Priority:** Must

**Acceptance criteria**
- [ ] After accepting, the driver sees a **Navigate to Vendor** button.
- [ ] Tapping it opens Google Maps with the vendor's location as the destination.
- [ ] This works on both Android and iPhone.

#### US-3.2 — Navigate to the customer
> **As a** driver,  
> **I want** to open directions to the customer after pickup,  
> **so that** I reach them without repeated calls.

**Priority:** Must

**Acceptance criteria**
- [ ] After marking **Picked Up**, the button changes to **Navigate to Customer**.
- [ ] Tapping it opens Google Maps with the customer's address as the destination.
- [ ] If the exact location cannot be found, Google Maps opens with the town and address text so the driver can still search.

#### US-3.3 — Contact the customer or vendor quickly
> **As a** driver,  
> **I want** to call the vendor or customer from the delivery screen,  
> **so that** I can resolve problems without searching for numbers.

**Priority:** Must

**Acceptance criteria**
- [ ] The delivery screen shows **Call Vendor** and **Call Customer** buttons.
- [ ] Each button starts a phone call to the correct number.

---

### Epic 4: Delivery Progress

#### US-4.1 — Mark a package as picked up
> **As a** driver,  
> **I want** to tap **Picked Up** when I collect the package,  
> **so that** dispatch and the customer know it is on the way.

**Priority:** Must

**Acceptance criteria**
- [ ] **Picked Up** is only available after the driver has accepted the delivery.
- [ ] Delivery Dispatch updates the order to "Out for delivery" with the pickup time.
- [ ] The customer notification in US-6.1 is sent.

#### US-4.2 — Mark a delivery as completed
> **As a** driver,  
> **I want** to tap **Delivered** when I hand over the package,  
> **so that** the job is closed and recorded.

**Priority:** Must

**Acceptance criteria**
- [ ] **Delivered** is only available after **Picked Up**.
- [ ] The driver must record the payment (US-5.1) before the delivery can be closed.
- [ ] Delivery Dispatch marks the order complete with the delivery time.
- [ ] The driver becomes available for new deliveries.

#### US-4.3 — Report a failed delivery
> **As a** driver,  
> **I want** to report when I cannot complete a delivery,  
> **so that** dispatch can act right away.

**Priority:** Must

**Acceptance criteria**
- [ ] The driver can select a reason: Customer unreachable, Customer refused, Wrong address, or Other (with a short note).
- [ ] Dispatch is alerted immediately.
- [ ] The vendor is informed that the delivery was not completed.
- [ ] The order is marked as failed in Delivery Dispatch with the reason.

#### US-4.4 — Keep working with poor network
> **As a** driver,  
> **I want** my status updates to be saved even if my internet drops,  
> **so that** I don't lose progress on the road.

**Priority:** Should

**Acceptance criteria**
- [ ] Updates made without network are saved on the phone.
- [ ] They are sent automatically when the connection returns.
- [ ] The driver sees which updates are still waiting to send.

---

### Epic 5: Payment Recording

#### US-5.1 — Record who collected payment
> **As a** driver,  
> **I want** to record how the customer paid when I complete a delivery,  
> **so that** cash is accounted for without checking chat history.

**Priority:** Must

**Acceptance criteria**
- [ ] When tapping **Delivered**, the driver must choose one option:
  - **Paid to driver** (amount defaults to the order total and can be edited)
  - **Paid to vendor**
- [ ] The delivery cannot be closed without a choice.
- [ ] The choice and amount are saved against the order and the driver.

#### US-5.2 — See my collections for the day
> **As a** driver,  
> **I want** to see how much I have collected today,  
> **so that** I can hand over the correct amount.

**Priority:** Should

**Acceptance criteria**
- [ ] The driver can view a list of today's deliveries marked "Paid to driver" and the running total.

---

### Epic 6: Customer Notifications

#### US-6.1 — Know when my package is on the way
> **As a** customer,  
> **I want** a WhatsApp message when the driver picks up my package,  
> **so that** I know it is coming and who is bringing it.

**Priority:** Must

**Acceptance criteria**
- [ ] The message is sent automatically when the driver taps **Picked Up**.
- [ ] It includes the vendor name, driver name, and the driver's contact number.
- [ ] No staff action is needed to send it.

#### US-6.2 — Get confirmation of delivery
> **As a** customer,  
> **I want** a WhatsApp confirmation when my delivery is completed,  
> **so that** I have a record of it.

**Priority:** Should

**Acceptance criteria**
- [ ] The message is sent automatically when the driver taps **Delivered**.
- [ ] It includes the order number and vendor name.

---

### Epic 7: Vendor Notifications

#### US-7.1 — Know when my order is delivered
> **As a** vendor,  
> **I want** to be told when my order has been delivered and how it was paid,  
> **so that** I don't need to call GoGET or the driver.

**Priority:** Should

**Acceptance criteria**
- [ ] The vendor receives a WhatsApp message when the delivery is completed.
- [ ] The message includes the customer name, driver name, and the payment option recorded.

---

### Epic 8: Dispatch Monitoring

#### US-8.1 — See all deliveries live
> **As a** dispatcher,  
> **I want** to see every delivery and its current status in one place,  
> **so that** I know what is happening without asking drivers.

**Priority:** Must

**Acceptance criteria**
- [ ] Deliveries are grouped as Waiting, Accepted, Out for delivery, Delivered, and Failed.
- [ ] Each delivery shows the vendor, customer town, assigned driver, and time in current status.
- [ ] The view updates without manual refresh.
- [ ] The dispatcher can filter by town, driver, or vendor.

#### US-8.2 — Spot delayed deliveries
> **As a** dispatcher,  
> **I want** deliveries that are waiting too long to stand out,  
> **so that** I can step in early.

**Priority:** Should

**Acceptance criteria**
- [ ] A delivery is highlighted if no driver accepts it within a set time.
- [ ] A delivery is highlighted if it stays "Out for delivery" longer than a set time.
- [ ] Managers can adjust these time limits.

#### US-8.3 — See driver locations on a map
> **As a** dispatcher,  
> **I want** to see where active drivers are on a map,  
> **so that** I can answer customer questions and assign nearby drivers.

**Priority:** Could *(depends on driver workspace option — see Section 6)*

**Acceptance criteria**
- [ ] Active drivers appear on a Google Map with their last known location and time.
- [ ] Drivers who are off duty are not shown.

---

### Epic 9: Customer Contacts

#### US-9.1 — Save customer contacts automatically
> **As a** GoGET staff member,  
> **I want** every customer from every order to be saved in GoGET API automatically,  
> **so that** I don't have to type contacts in by hand.

**Priority:** Must

**Acceptance criteria**
- [ ] Each new order adds the customer's name, phone number, and town to GoGET API.
- [ ] If the customer already exists, their record is updated, not duplicated.
- [ ] Each contact shows which vendors they have ordered from and when.

#### US-9.2 — Run a daily contact sync and broadcast
> **As a** GoGET staff member,  
> **I want** contacts to be synced and a scheduled broadcast sent once every 24 hours,  
> **so that** campaigns reach up-to-date customers without manual work.

**Priority:** Should

**Acceptance criteria**
- [ ] The sync runs automatically once every 24 hours at a time set by staff.
- [ ] Staff can choose the broadcast message and which contacts receive it.
- [ ] Customers who reply "STOP" are removed from future broadcasts.
- [ ] Staff can see a summary of each run: contacts synced, messages sent, and failures.

---

### Epic 10: Reports and Reconciliation

#### US-10.1 — See daily delivery figures
> **As a** manager,  
> **I want** a daily summary of deliveries,  
> **so that** I can track performance without manual counting.

**Priority:** Must

**Acceptance criteria**
- [ ] The summary shows total, completed, and failed deliveries for the day.
- [ ] It shows deliveries per driver and per vendor.
- [ ] It shows the average time from order creation to delivery.

#### US-10.2 — Reconcile payments at the end of the day
> **As a** manager or accounts staff member,  
> **I want** a daily report of money collected by each driver and orders paid to vendors,  
> **so that** I can settle balances quickly and accurately.

**Priority:** Must

**Acceptance criteria**
- [ ] The report lists, for each driver, all deliveries marked "Paid to driver" and the total.
- [ ] The report lists, for each vendor, all deliveries marked "Paid to vendor."
- [ ] Staff can mark a driver's balance as handed over.
- [ ] The report can be downloaded for accounting.

---

### Epic 11: Driver Access

#### US-11.1 — Sign in to the driver workspace
> **As a** driver,  
> **I want** to sign in quickly with my phone number,  
> **so that** I can start working without complicated passwords.

**Priority:** Must

**Acceptance criteria**
- [ ] Drivers sign in with their registered phone number and a one-time code.
- [ ] Only drivers added by GoGET staff can sign in.
- [ ] Drivers only see deliveries available to them and their own assigned deliveries.

#### US-11.2 — Go on and off duty
> **As a** driver,  
> **I want** to set myself as on duty or off duty,  
> **so that** I only receive deliveries when I am working.

**Priority:** Should

**Acceptance criteria**
- [ ] Off-duty drivers do not receive new delivery alerts.
- [ ] Dispatch can see which drivers are on duty.

#### US-11.3 — Manage drivers
> **As a** dispatcher or manager,  
> **I want** to add, update, and deactivate drivers,  
> **so that** only current drivers can access the platform.

**Priority:** Must

**Acceptance criteria**
- [ ] Staff can add a driver with name and phone number.
- [ ] Deactivated drivers can no longer sign in.

---

## 5. Non-Functional Requirements

| Area | Requirement |
| :--- | :--- |
| **Speed** | New orders appear in Delivery Dispatch and the driver list within seconds of being created in O-Zeller. |
| **Reliability** | No order, status update, or payment record is lost if one of the connected systems is temporarily down. |
| **Ease of use** | A new driver can complete a delivery with no more than a short walkthrough. Main actions are large, single-tap buttons. |
| **Device support** | Works on budget Android phones and iPhones commonly used by drivers. |
| **Privacy** | Drivers can only see customer details for their own active deliveries. Customer data is only visible to authorized staff. |
| **Access control** | Drivers, dispatchers, and managers each see only the screens and actions relevant to their role. |
| **Audit trail** | Every assignment, status change, and payment record shows who made it and when. |

---

## 6. Driver Workspace Options

The user stories above apply to both options. GoGET will choose one before Phase 2.

| | **Option 1: Web App (PWA)** | **Option 2: Native Mobile App** |
| :--- | :--- | :--- |
| **How drivers get it** | Open a link and add it to the home screen. | Install from an app store or direct download. |
| **Google Maps navigation** | Opens the Google Maps app with one tap. | Opens the Google Maps app, with an option to show maps inside the app. |
| **Live driver location (US-8.3)** | Limited while the phone is locked. | Supported continuously. |
| **New delivery alerts** | Standard notifications. | Louder, higher-priority alerts. |
| **Time to launch** | Shorter | Longer |
| **Best for** | Fast rollout with minimal driver setup. | Full fleet tracking and stronger alerts. |

**Recommendation:** Launch with Option 1 to remove manual work quickly, then move to Option 2 if live driver tracking becomes a priority.

---

## 7. Success Metrics

Current baselines will be measured during discovery (Phase 1) so improvements can be compared fairly.

| Metric | Target after launch |
| :--- | :--- |
| Orders that need manual re-entry into Delivery Dispatch or GoGET API | **0%** |
| Time from order creation to driver acceptance | Significantly lower than the baseline |
| Time from order creation to delivery | Lower than the baseline |
| Customer contacts saved in GoGET API | **100% of orders** |
| Deliveries closed with a recorded payment option | **100%** |
| Customer and vendor calls to dispatch asking for order status | Clear reduction from the baseline |
| Drivers actively using the driver workspace | **100% of on-duty drivers** by the end of Phase 2 |

---

## 8. Release Plan

| Phase | Focus | User stories |
| :--- | :--- | :--- |
| **Phase 1: Connect the systems** | Remove manual data entry. | US-1.1, US-9.1, US-11.3 |
| **Phase 2: Driver workspace** | Replace WhatsApp group dispatch. | US-2.1, US-2.2, US-2.3, US-3.1, US-3.2, US-3.3, US-4.1, US-4.2, US-4.3, US-5.1, US-8.1, US-11.1 |
| **Phase 3: Notifications and reporting** | Inform customers and vendors; automate reconciliation. | US-6.1, US-6.2, US-7.1, US-10.1, US-10.2, US-1.2 |
| **Phase 4: Improvements** | Operational control and growth features. | US-2.4, US-4.4, US-5.2, US-8.2, US-8.3, US-9.2, US-11.2 |

Each phase starts with a short pilot (a small group of drivers and vendors) before full rollout.

---

## 9. Assumptions and Open Questions

These points must be confirmed with GoGET before or during Phase 1.

| # | Question | Why it matters |
| :--- | :--- | :--- |
| 1 | Can O-Zeller be changed to send new orders automatically, or do we need to read them from its database? | Determines how US-1.1 is delivered. |
| 2 | Do Delivery Dispatch and GoGET API allow other systems to add and update records? | Required for US-1.1, US-4.x, and US-9.1. |
| 3 | Which WhatsApp provider does GoChat use, and does it support automatic messages to individual customers? | Required for Epics 6 and 7. |
| 4 | Do O-Zeller addresses include map locations, or only text? | Affects navigation accuracy in US-3.2. |
| 5 | Should drivers only see deliveries in specific towns or zones? | Affects US-2.1. |
| 6 | What payment methods do customers use when paying the driver (cash, mobile money, other)? | Affects US-5.1 options. |
| 7 | Should drivers take a photo or get a signature as proof of delivery? | Possible addition to US-4.2. |
| 8 | Which option for the driver workspace (Section 6) does GoGET prefer? | Determines scope of Phase 2 and US-8.3. |

---

## 10. Risks

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Drivers prefer the familiar WhatsApp group. | Low adoption of the driver workspace. | Simple sign-in, large buttons, pilot with respected drivers first, and phase out group posting gradually. |
| Existing systems cannot accept automatic updates. | Phase 1 delays. | Confirm access in discovery; use database-level connection as a fallback. |
| Customer addresses are vague. | Navigation is less accurate. | Fall back to town and landmark search; keep the Call Customer button. |
| Poor mobile network on routes. | Missed status updates. | Save updates on the phone and send them when connection returns (US-4.4). |
| WhatsApp message limits or template approval delays. | Customer notifications delayed. | Prepare and submit message templates early in Phase 1. |

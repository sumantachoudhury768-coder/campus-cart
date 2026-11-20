# CampusCart Security Specification (Phase 0 — Payload-First TDD)

## 1. Core Data Invariants
1. **PII Isolation**: Student emails, phone numbers, and hostel/PG room addresses are stored only in `/users/{userId}/private/{docId}` and `/orders/{orderId}`. Neither can be read or listed by unrelated authenticated users.
2. **RBAC Privilege Separation**: Only verified Super Administrators (`sumantachoudhury768@gmail.com` with `email_verified == true` or UID present in `/admins/{uid}`) can onboard/suspend stores, edit platform delivery fees, create bundles, or modify admin records.
3. **Retailer Ownership Gate**: Retailers can only edit products and orders belonging to their assigned store (`ownerUid == request.auth.uid` / `retailerUid == request.auth.uid`).
4. **Order Integrity & Terminal State Locking**:
   - New orders created by customers must start at `orderStatus == 'Pending Retailer Confirmation'` and `paymentStatus == 'Unverified'`.
   - `orderTotal` must equal `productSubtotal + deliveryFee`.
   - Once an order reaches `Completed`, `Cancelled`, or `Rejected`, non-admin users cannot mutate it.
5. **Temporal Integrity**: `createdAt` and `updatedAt` timestamps on write must equal `request.time`.
6. **Path & Volumetric Guards**: Every document ID matches `^[a-zA-Z0-9_\-]+$` (<= 128 chars), every string enforces explicit `.size()` limits, and every array enforces bounded `.size()` limits.

## 2. The Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Self-Admin Escalation**: Non-admin student attempts `CREATE /admins/{studentUid}`.
2. **Unverified Email Admin Spoof**: Token has admin email string but `email_verified: false` attempting `WRITE /platformConfig/pilot`.
3. **Cross-User PII Read**: Student B attempts `GET /users/{studentA}/private/info`.
4. **Shadow Field Injection on Order**: Student submits valid order plus ghost field `isPaidBySystem: true`.
5. **Order Status Shortcut on Create**: Student creates order directly with `orderStatus: 'Completed'` or `paymentStatus: 'Manually Verified'`.
6. **Order Identity Spoofing**: Student A creates order with `customerId: 'studentB'`.
7. **Orphaned Store Order**: Student creates order referencing non-existent `storeId: 'fake_store_999'`.
8. **Terminal State Re-Opening**: Retailer attempts to change a `Completed` order back to `Pending Retailer Confirmation`.
9. **Unauthorized Retailer Price Tampering**: Retailer B updates a product owned by Retailer A (`storeId` owned by A).
10. **Blanket Order List Scraping**: Student attempts unfiltered `LIST /orders` hoping to read other students' hostel addresses.
11. **Oversized String / Resource Poisoning**: User submits a 10KB string into `customerName` or a 500-char invalid document ID.
12. **Client Timestamp Backdating**: User creates feedback or order with a forged `createdAt` differing from `request.time`.

# DeepConnect Security Specification (RED-TEAM)

## 1. Data Invariants
- A user cannot swipe on themselves.
- A match can only be read by the participating users.
- A message can only be sent by a participant of the match.
- `profileAuthority` and `reputationWeight` are immutable by the user (system-only).
- `matchScore` during swipe must be calculated based on existing profile data.

## 2. The Dirty Dozen Payloads (Target: DENIED)
1. **Identity Spoofing**: Attempt to create a user profile with a `uid` that doesn't match `request.auth.uid`.
2. **Authority Escalation**: Attempt to update `profileAuthority` to 1.0 from the client.
3. **Ghost Update**: Attempt to update a user profile with an extra field `isAdmin: true`.
4. **Impersonation Swipe**: Attempt to swipe on behalf of another user.
5. **Score Injection**: Attempt to record a swipe with `matchScore: 100.0` arbitrarily.
6. **Self-Swipe**: Attempt to record a swipe where `swiperId == swipedId`.
7. **Cross-Match Chat**: Attempt to send a message to a `matchId` the user is not a part of.
8. **Message Poisoning**: Attempt to send a 1MB string as a message content.
9. **ID Poisoning**: Attempt to target a document with an ID that is a 2KB junk string.
10. **PII Leak**: Attempt to read another user's PII (private collection if implemented, or sensitive fields).
11. **Shadow Swipe**: Attempt to update a swipe document after creation.
12. **Double Match**: Attempt to create a match document directly (should be handled by batch or function, but if rules allow, must check both sides).

## 3. Test Runner
A `firestore.rules.test.ts` will be implemented to verify these denials.

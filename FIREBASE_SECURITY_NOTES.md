# Firestore Rules - Notes

## Included
- `firestore.rules` with:
  - Match schema validation (`matches` collection)
  - Score/winner consistency validation
  - Basic metadata validation
- `firebase.json` pointing to the rules file

## Important current limitation
This app currently manages session at app level (custom player/PIN), not full Firebase Auth identity binding for each player.
Because of that, rules are focused on **data integrity** (shape/consistency), not strict user-level authorization yet.

## How to deploy rules
1. Install Firebase CLI (`firebase-tools`) if needed.
2. Login: `firebase login`
3. Select project: `firebase use trucapp-b1f1f`
4. Deploy rules: `firebase deploy --only firestore:rules`

## Next hardening step (recommended)
- Bind app users to Firebase Auth UID and enforce participant-based write permissions in rules.

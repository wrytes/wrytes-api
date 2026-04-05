# User Profile

Manages user profile data including personal details, address, and verification status.

**Required scope:** `USER` (own profile) / `ADMIN` (verification actions)

## Endpoints

### Get Own Profile

```
GET /user/profile
```

Returns the authenticated user's profile.

**Response:**
```json
{
  "userId": "clx...",
  "firstName": "Jane",
  "lastName": "Doe",
  "businessName": null,
  "dateOfBirth": null,
  "street": null,
  "city": null,
  "postalCode": null,
  "country": null,
  "isVerified": false,
  "verifiedAt": null
}
```

Returns `404` if no profile has been created yet.

---

### Create or Update Own Profile

```
PUT /user/profile
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "businessName": "Acme Ltd",
  "dateOfBirth": "1990-01-01",
  "street": "123 Main St",
  "city": "Zurich",
  "postalCode": "8001",
  "country": "CH"
}
```

All fields are optional — only provided fields are updated. Creates the profile if it does not exist.

---

### [Admin] Verify Profile

```
POST /user/profile/:userId/verify
```

Marks a user's profile as verified (`isVerified: true`, sets `verifiedAt`). Requires `ADMIN` scope.

---

### [Admin] Revoke Verification

```
DELETE /user/profile/:userId/verify
```

Removes verification from a user's profile (`isVerified: false`, clears `verifiedAt`). Requires `ADMIN` scope.

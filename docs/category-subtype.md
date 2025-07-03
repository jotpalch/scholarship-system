# Scholarship Category & Sub-Type Architecture

> Introduced: **2025-07-03** – merges "國科會博士生獎學金 / 教育部博士生獎學金" into one _PhD Scholarship_ **category** with two **sub-types**.

---

## 1. Database

| Table | Purpose |
|-------|---------|
| `scholarship_categories` | Top-level group (e.g. PhD Scholarship) |
| `scholarship_types`.`category_id` | FK → category, many sub-types per category |
| `scholarship_types`.`sub_type`    | Enum ( `nsc_phd` \| `moe_phd` … ) |

### Migration IDs

1. **202407030001** – create table / columns / enum
2. **202407030002** – data migration: create "博士獎學金" category, update NSC / MOE rows

---

## 2. Backend API

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/scholarshipCategories` | List all categories |
| `GET /api/v1/scholarshipCategories/{id}` | Category details (includes sub-types) |
| `GET /api/v1/scholarshipCategories/{id}/subTypes` | List `ScholarshipType` under a category |

**Application create / update** now accepts:

```jsonc
{
  "category_id": 1,
  "sub_type": "nsc_phd",
  "scholarship_type": "phd_nstc"   // backward-compat
}
```

---

## 3. Frontend Changes (Next.js)

* New hook **`useScholarshipCategories`** – fetch & cache categories.
* Application Form UI:
  1. Select **Category** → `category_id`
  2. Dynamically fetch & filter **Sub-Type** list.
* `ScholarshipType` interface adds `category_id` & `sub_type`.

### E2E Coverage

`e2e/scholarship-category-flow.spec.ts` verifies:

* Student can pick category "博士獎學金"
* Sub-type dropdown lists 國科會 / 教育部 options
* Selecting sub-type updates form state

---

## 4. Testing

* **Unit** – `useScholarshipCategories.test.tsx`
* **E2E** – Playwright scenario above

> **Coverage target remains 90 %** – E2E counts toward integration layer.

---

## 5. Contribution Notes

* Always add new sub-types to `ScholarshipSubType` enum & Alembic enum if needed.
* Ensure GPA rules defined per sub-type in `SCHOLARSHIP_GPA_REQUIREMENTS`.
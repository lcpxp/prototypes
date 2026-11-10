# Screenshots and mockups

How images of LaunchPad screens are captured, made safe, registered and
attached to work. The one home for those rules; docs/SECURITY.md and
docs/APP-REVIEW.md cite it.

Public repo, so nothing here is an image and no image is ever committed.
Images live in the private storage bucket `screenshots`; a row in the
`screenshots` table (`supabase/schema/55_screenshots.sql`) makes each
one findable.

## The rule that comes first

**A raw, unmasked production screenshot is never stored.** Not in the
bucket, not in a document, not in a note. The table refuses a
production row that is not marked masked, and the check below runs
before anything is uploaded.

## Three ways an image is made

1. **Capture from QA with demo data.** The default. A demo data kit on
   QA - demo partners, merchants, people, test bank details and
   applications at each stage, with obviously fictional names - means a
   capture needs no masking.
2. **Mask, when real data is unavoidable** - evidence of a production
   bug, say. The owner runs a small masking script in the browser
   console on the page before capturing. It substitutes names, emails,
   phone numbers, addresses, bank details, company numbers and
   identifiers with deterministic dummies and stamps the page "DEMO
   DATA". Substitution keeps the layout realistic, which is why it is
   preferred to blurring.
3. **Mockup.** A replica of the screen rendered from the portal's own
   templates and styles, once as it is and once with the proposed
   change applied. Each is labelled "Mockup - proposed". Mockups come
   in before and after pairs and are wanted for every change to what a
   person sees.

## Check before storing

Read the text out of the image and look for anything that still
resembles personal data: a name that is not a demo name, an email, a
phone number, an account number. If anything is found, the image is
rejected and re-made. This check runs for captures and masked images
alike; a mockup built from demo values passes by construction and is
checked anyway.

## Getting an image into the bucket

The bucket admits an admin and nobody else, and a session has no
storage access at all. So the owner uploads - through the Supabase
dashboard's Storage page, into the `screenshots` bucket, at the path the
session names - and the session writes the register row and the link.
A row is written only for an image that has been uploaded.

## The register

One row per image:

| Column | Meaning |
| --- | --- |
| `review_area_id` | The screen, as the portal review's area map names it (docs/PORTAL-REVIEW.md). One vocabulary for "which screen". |
| `route` | The route it was captured at. |
| `environment` | `qa`, `uat`, `production`, `local`, or `mockup` for a rendered replica. |
| `captured_on` | When. |
| `code_snapshot` | The LaunchPad code snapshot it reflects, so a stale image can be told from a current one. |
| `kind` | `capture`, `mockup-before` or `mockup-after`. |
| `masked` | Personal data was substituted before capture. |
| `storage_path` | Where the image is in the bucket. |
| `caption` | What it shows, in one line. |

What an image is **about** is a `knowledge_links` row of kind `about`,
from the `screenshot` entity type to the work item - never a column.
The register and the bucket are the owner's alone: every read and write
is admin-only, and a page shows an image through a short-lived signed
URL.

## Where images are used

- **The drawer.** An item's linked images appear on owner surfaces.
- **Azure DevOps.** At push time each image linked `about` an item is
  attached to its backlog items (docs/DEVOPS.md).
- **Reviews.** An application or portal review may register an image as
  evidence under the same rules; it never stores one any other way.

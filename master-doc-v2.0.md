**Facebook Relationship Cleanup Assistant**

MVP Product Specification v2.0

*Mode A --- Guided Manual Cleanup with Unfriend & Block Flow*

1\. Purpose

This application helps a user systematically remove their interactions
with specific Facebook friends before unfriending and blocking them.

The tool does not automate actions on Facebook. Instead it:

-   Organizes all interactions by person

-   Tracks cleanup progress item by item

-   Opens items in the browser for manual removal

-   Guides the user through the unfriend and block steps

-   Ensures nothing is missed across 1000+ friends

Primary use case: Reduce a Facebook network from \~1000 friends to a
small trusted group while removing all traces before blocking.

2\. Core Principles

Safety First

No automated actions on Facebook. All removals are performed manually by
the user. The tool only organizes data, tracks progress, and opens
relevant links.

Person-Based Cleanup

Cleanup is done friend by friend. Search for a friend by name, open
their queue, process every interaction, then unfriend and block --- all
in a single guided flow.

Progress Tracking

Total items, completed items, skipped items, and remaining items are
tracked both per friend and globally across the entire cleanup
operation.

3\. Friend Status Flow

Every friend moves through a defined lifecycle. Status transitions
happen automatically based on user actions.

  -----------------------------------------------------------------------
  **Status**         **Meaning**
  ------------------ ----------------------------------------------------
  not_started        Friend added --- no cleanup begun yet

  in_progress        Cleanup started --- items still pending (trace not
                     fully removed yet)

  completed          All interaction items marked done or skipped ---
                     trace fully removed

  unfriend_ready     Cleaned, confirmed ready to unfriend on Facebook

  unfriended         Unfriended on Facebook --- block step still pending

  blocked            Unfriended AND blocked on Facebook --- fully done
  -----------------------------------------------------------------------

**Transition rules:**

-   Add friend → not_started

-   Open cleanup queue (any item touched) → in_progress

-   Last item marked done/skipped → completed (app prompts: All clear.
    Ready to unfriend?)

-   User confirms → unfriend_ready

-   User completes unfriend on Facebook + marks in app → unfriended

-   User completes block on Facebook + marks in app → blocked

4\. Data Model

4.1 Friend Table

  ------------------------------------------------------------------------
  **Field**        **Type**     **Notes**
  ---------------- ------------ ------------------------------------------
  id               INTEGER PK   Auto increment

  name             TEXT         Display name --- primary search field

  profile_url      TEXT         Facebook profile URL

  status           TEXT         not_started \| in_progress \| completed \|
                                unfriend_ready \| unfriended \| blocked

  priority         INTEGER      1=high 2=medium 3=low --- for ordering
                                large lists

  notes            TEXT         Free text tags e.g. work, college, family

  unfriended_at    DATETIME     Timestamp when unfriended

  blocked_at       DATETIME     Timestamp when blocked

  created_at       DATETIME     

  updated_at       DATETIME     
  ------------------------------------------------------------------------

4.2 ActivityItem Table

Represents a single interaction to be removed.

  --------------------------------------------------------------------------
  **Field**          **Type**     **Notes**
  ------------------ ------------ ------------------------------------------
  id                 INTEGER PK   

  friend_id          INTEGER FK   References Friend.id

  type               TEXT         comment \| like \| reaction \| post \| tag
                                  \| mention

  content_preview    TEXT         Short preview of the interaction

  facebook_url       TEXT         Direct link to the item on Facebook

  interaction_date   DATETIME     Nullable --- date of original interaction

  status             TEXT         pending \| completed \| skipped \|
                                  review_later

  discovered_via     TEXT         manual \| bulk_paste \| csv_import \|
                                  extension

  batch_id           TEXT         Import batch ID --- enables undo of a bulk
                                  import

  notes              TEXT         

  created_at         DATETIME     

  updated_at         DATETIME     
  --------------------------------------------------------------------------

4.3 CleanupSession Table

  -------------------------------------------------------------------------
  **Field**         **Type**     **Notes**
  ----------------- ------------ ------------------------------------------
  id                INTEGER PK   

  friend_id         INTEGER FK   

  started_at        DATETIME     

  completed_at      DATETIME     Nullable

  items_total       INTEGER      

  items_completed   INTEGER      

  items_skipped     INTEGER      

  items_remaining   INTEGER      
  -------------------------------------------------------------------------

5\. Application Architecture

  -----------------------------------------------------------------------
  **Layer**       **Technology**
  --------------- -------------------------------------------------------
  Frontend        Next.js + React + Tailwind UI

  Backend         Node.js API routes (Next.js)

  ORM             Prisma --- required from day one for SQLite-to-Postgres
                  migration path

  Database        SQLite (local-first default) or Postgres (optional
                  upgrade)

  Browser actions Manual only --- all links open facebook.com in new tab
  -----------------------------------------------------------------------

*Data export: app must provide full JSON + CSV export for local backup.
Local-first means no cloud backup exists otherwise.*

6\. Screens

Screen 1 --- Friend List

Entry point. Overview of all friends in the cleanup pipeline.

Top bar:

-   Real-time search by name and notes

-   Status filter: All \| Not Started \| In Progress \| Completed \|
    Unfriend Ready \| Unfriended \| Blocked

-   Priority filter: All \| High \| Medium \| Low

-   Add Friend button

-   Import button (bulk paste or CSV)

  -----------------------------------------------------------------------------------------------------------
  **Name**     **Status**   **Priority**   **Items**   **Done**   **Unfriended**   **Blocked**   **Action**
  ------------ ------------ -------------- ----------- ---------- ---------------- ------------- ------------
  Marcus Gay   In Progress  High           37          12         \-               \-            Open \|
                                                                                                 Queue

  John Smith   Blocked      High           14          14         Yes              Yes           View
  -----------------------------------------------------------------------------------------------------------

Screen 2 --- Friend Detail Page

Full view of a single friend and all their interaction items.

Header: Name, profile URL, status badge, summary counts (Posts /
Comments / Likes / Tags / Total / Completed / Remaining).

Quick actions:

-   Start Cleanup Queue --- enters Screen 3 immediately

-   Open Facebook Profile --- opens profile_url in new tab

-   Add Item --- manual entry form

-   Bulk Paste URLs --- paste multiple links at once, one per line

Item tabs: Posts \| Comments \| Likes \| Tags \| All

  -------------------------------------------------------------------------------
  **Type**   **Preview**           **Date**   **Status**   **Actions**
  ---------- --------------------- ---------- ------------ ----------------------
  Comment    \"Happy birthday      May 2022   Pending      Open \| Done \| Skip
             bro\"                                         

  Like       Post about vacation   Jan 2023   Completed    View
  -------------------------------------------------------------------------------

Screen 3 --- Cleanup Queue (Guided Mode)

Step-by-step guided cleanup. Core workflow screen.

Header: Friend name, item count (Item 5 of 37), progress bar.

Item card shows: type badge, content preview, interaction date, Open on
Facebook button.

Action buttons:

-   Open Item --- opens facebook_url in new tab

-   Mark Completed --- marks done, loads next item automatically

-   Skip --- skips item, loads next

-   Review Later --- flags for later, loads next

On last item: completion screen shows All items cleaned. Button: Mark
Ready to Unfriend.

Screen 4 --- Unfriend & Block Flow

Triggered when friend reaches unfriend_ready. Walks the user through the
final two steps back to back.

Step 1 --- Unfriend:

-   Confirmation: 0 pending items remaining

-   Button: Open Facebook Profile

-   Instruction: Go to their profile, click Friends, select Unfriend

-   Button: I Unfriended Them

Step 2 --- Block (shown immediately after):

-   Deep link: https://www.facebook.com/\[username\]?block=1 (attempt)

-   Fallback instruction: Go to their profile, click the three-dots
    menu, select Block

-   Button: I Blocked Them

On completion: status set to blocked, blocked_at timestamp recorded. App
shows: Done. Marcus Gay has been unfriended and blocked.

Screen 5 --- Progress Dashboard

Global overview of the entire cleanup operation.

  -----------------------------------------------------------------------
  **Metric**                  **Value**
  --------------------------- -------------------------------------------
  Total Friends               1,000

  Not Started                 950

  In Progress                 5

  Completed (trace removed)   12

  Unfriend Ready              3

  Unfriended (block pending)  4

  Blocked (fully done)        26
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Interaction Metric**      **Value**
  --------------------------- -------------------------------------------
  Total Items Found           1,482

  Completed                   350

  Skipped                     42

  Review Later                18

  Remaining                   1,072
  -----------------------------------------------------------------------

7\. Search Behavior

Real-time search on the Friend List screen. Combinable with status and
priority filters.

  -----------------------------------------------------------------------
  **Scope**       **Behavior**
  --------------- -------------------------------------------------------
  Name            Primary --- matches partial names in real time

  Notes           Secondary --- searches tags like work, college, family

  Status filter   Combine with search: Marcus + In Progress

  Priority filter Combine: John + High priority
  -----------------------------------------------------------------------

Clicking a result navigates directly to Friend Detail Page with Start
Cleanup Queue visible immediately.

8\. Full Workflow

Step 1 --- Add Friend

Enter name, profile URL, priority, notes. Status auto-set to
not_started.

Step 2 --- Add Interaction Items

-   Manual entry: type, preview, URL, date

-   Bulk paste: paste multiple URLs one per line

-   CSV import (V2)

-   Browser extension capture (V2)

Step 3 --- Start Cleanup Queue

Click Start Cleanup Queue on Friend Detail Page. Status transitions to
in_progress. Guided queue begins at Screen 3.

Step 4 --- Process Items

-   Open item on Facebook

-   Manually remove the interaction

-   Return to app and click Mark Completed

-   Next item loads automatically

Step 5 --- Finish Cleanup

All items done. Status transitions to completed. App prompts: All clear.
Ready to unfriend?

Step 6 --- Unfriend

Open profile, unfriend on Facebook, return and click I Unfriended Them.
Status transitions to unfriended.

Step 7 --- Block

App immediately presents block step. Block on Facebook, return and click
I Blocked Them. Status transitions to blocked. Flow complete.

9\. Privacy Design

-   Local-first: all data stays on device

-   No Facebook login required

-   No external API calls

-   Full data export: JSON + CSV

-   User can delete all data and reset

10\. V2 Optional Features

  -----------------------------------------------------------------------
  **Feature**        **Description**
  ------------------ ----------------------------------------------------
  Chrome Extension   Capture interactions while browsing Facebook ---
                     auto-adds to queue

  CSV Import         Bulk import from exported Facebook activity data

  Automatic          Parse Facebook activity log export and populate
  Discovery          items automatically

  Visual Timeline    Show interactions with a friend on a timeline before
                     cleanup

  Bulk Finish Mode   Process multiple unfriend_ready friends back to back
                     in sequence
  -----------------------------------------------------------------------

11\. MVP Success Criteria

-   Search for a friend by name and immediately start their cleanup
    queue

-   Track cleanup progress per friend with clear status meaning

-   Remove interactions without losing track across 1000 friends

-   Complete the full flow: clean -\> unfriend -\> block in one guided
    session

-   Verify a friend is fully cleaned before unfriending

-   Export all data for local backup

12\. Estimated Build Scope

  -----------------------------------------------------------------------
  **Component**                      **Estimate**
  ---------------------------------- ------------------------------------
  Database schema + Prisma setup     2-3 hours

  Friend List + Search screen        3-4 hours

  Friend Detail Page                 3-4 hours

  Cleanup Queue screen               2-3 hours

  Unfriend and Block flow screen     2 hours

  Progress Dashboard                 2-3 hours

  Bulk paste / CSV import            2 hours

  Data export (JSON + CSV)           1 hour

  Total with AI coding assistance    1-2 days
  -----------------------------------------------------------------------
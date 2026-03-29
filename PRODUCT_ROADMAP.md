# Tiny Tummy Product Roadmap

## Purpose

This document turns the recommended feature set into a practical implementation roadmap for Tiny Tummy.

The guiding principle is to strengthen Tiny Tummy as a bowel-first, privacy-first baby health app, not turn it into a generic all-in-one tracker. New features should support the core user job:

"Help me understand what is happening, reduce mental load, and make doctor conversations easier."

## Product Direction

### Current Strengths

Tiny Tummy already has a strong specialist foundation:

- Poop logging with type, color, size, notes, photos, and no-poop days
- Meal logging for food-to-poop correlation
- Age-adjusted status and alerts
- Guidance content
- Multi-child support
- Doctor-ready reports
- Offline-first privacy

### Strategic Positioning

Tiny Tummy should be positioned as:

> The calm, bowel-first baby health tracker that also covers the adjacent signals parents need to understand poop patterns.

That means:

- Expand around bowel health
- Improve caregiver coordination
- Improve doctor visit workflows
- Add only the minimum adjacent tracking needed for context

That does not mean:

- Building a giant generic baby tracker
- Competing head-on with sleep coaching apps
- Adding scrapbook or social features
- Weakening the offline/privacy promise without intent

## Roadmap Structure

Status key:

- `[Done]` shipped
- `[In Progress]` partially shipped
- `[Planned]` not started

The roadmap is split into:

1. Foundation work
2. Wave 1: high-priority additions
3. Wave 2: secondary additions
4. Recommended release order
5. Implementation notes by area

## Foundation Work

Before shipping multiple new features, the app should get a stronger data and query foundation. The current schema is intentionally lean, but too narrow for the next stage of the product.

### Foundation 1: Expand the Health Event Model `[In Progress]`

#### Goal

Stop treating meals as a shallow note log and create a model that supports richer feeding, symptoms, episodes, reports, and reminders.

#### Why

Many of the proposed features overlap in the data they need:

- Feeding details
- Symptoms
- Hydration
- Interventions
- Episodes
- Report summaries
- Reminder rules

If these are added ad hoc, the codebase will get messy quickly.

#### Suggested schema additions

- `feeding_logs`
- `symptom_logs`
- `episodes`
- `episode_events`
- `growth_logs`
- `sleep_logs`
- `reminder_rules`

#### Suggested direction

Either:

- evolve `diet_logs` into a richer `feeding_logs` table

or:

- create `feeding_logs` as a new table and migrate `diet_logs` into it over time

The second option is cleaner if the new model is meaningfully different.

#### Feeding log fields to support

- `feeding_mode` such as breastfeeding, bottle, pumping, solids, water
- `started_at`
- `ended_at`
- `amount`
- `amount_unit`
- `breast_side`
- `bottle_contents`
- `food_name`
- `reaction_notes`
- `constipation_support_tag`
- `notes`

#### Symptom log fields to support

- `symptom_type`
- `severity`
- `logged_at`
- `notes`

Examples:

- straining
- pain
- rash
- vomiting
- blood concern
- dehydration concern

#### Episode fields to support

- `episode_type`
- `started_at`
- `ended_at`
- `status`
- `summary`
- `outcome`

Example episode types:

- constipation
- diarrhoea
- solids_transition

### Foundation 2: Build a Shared Daily Summary Layer `[In Progress]`

#### Goal

Create one source of truth for the high-level state of a child on a given day.

#### Why

The same summary is needed by:

- home screen
- caregiver handoff
- reports
- widgets
- reminders

Without a shared summary layer, the app will repeat business logic in multiple places.

Current progress:

- Home and Handoff now share the same derived daily summary helpers
- caregiver note state is now shared through one hook
- reminders and reports still have some separate logic to consolidate later

#### Summary output should include

- last poop
- last meal
- current alert state
- today poop count
- today meal count
- no-poop day markers
- active episode
- recent red-flag colors
- recent symptoms

### Foundation 3: Redesign Reporting Infrastructure `[In Progress]`

#### Goal

Move reports from poop-only summaries to multi-signal health summaries.

#### Why

Reports are one of Tiny Tummy's strongest commercial and clinical features. They should become meaningfully better before the app expands too far elsewhere.

#### Reporting should eventually include

- poop logs
- meal and feeding logs
- symptoms
- active or recent episodes
- photos
- flagged stool colors
- relevant notes
- timeline summaries

## Wave 1: Add First

These are the highest-priority additions because they strengthen the app's core value and improve daily usefulness immediately.

### 1. Caregiver Handoff `[Done]`

#### Product goal

Help a second caregiver understand the child's status in under 10 seconds.

#### User problem

Parents and caregivers constantly ask:

- When was the last poop?
- When was the last meal?
- Is anything concerning right now?
- What happened today?

This is one of the highest-stress daily use cases.

#### MVP scope

Add a dedicated handoff view with:

- last poop
- last meal
- current alert state
- active episode
- today summary
- simple share/export action

#### UX principles

- glanceable first
- minimal scrolling
- no dense forms
- easy to read one-handed

#### Suggested output cards

- Last Poop
- Last Feed
- Today's Summary
- Current Concern
- Notes for Next Caregiver

#### Technical dependencies

- shared daily summary layer
- export/share formatting
- richer feeding data

#### Success metric

A caregiver should understand the child's state without opening history.

### 2. Rich Feeding Tracking `[Done]`

#### Product goal

Turn feeding logs into useful clinical and behavioural context, not just journal notes.

#### Why this matters

This is the most natural expansion from Tiny Tummy's existing bowel focus. It makes correlation more credible and makes reports much stronger.

#### MVP scope

Support:

- breastfeeding side
- breastfeeding duration
- bottle amount
- bottle contents
- pumping amount
- solids
- water
- reaction notes
- constipation-friendly foods

#### Recommended logging modes

- Quick mode
- Detailed mode

Quick mode should allow a parent to log in seconds.

Detailed mode should support:

- amount
- duration
- breast side
- bottle content type
- food tags
- notes

#### Suggested food tags

- constipation-friendly
- binding food
- new food
- dairy
- iron-rich

#### Success metric

Feeding data should explain bowel changes, not just sit in the timeline.

### 3. Episode Mode `[Done]`

#### Product goal

Help parents track a problem as a story over time rather than as disconnected entries.

#### User problem

When a child is constipated or unwell, parents are not just logging single events. They are trying to answer:

- When did this start?
- What changed before it started?
- What have we tried?
- Is it improving?

#### MVP scope

Allow parents to start an episode for:

- constipation
- diarrhoea
- solids transition

Each episode can include:

- symptoms
- hydration notes
- foods tried
- interventions
- progress notes
- resolution note

#### UX principles

- episodes should sit above raw logs
- active episode should be visible on home and reports
- parents should be able to add context without friction

#### Example episode events

- started pears
- extra water
- child strained
- no poop day
- small hard stool
- symptoms improving

#### Success metric

A parent should be able to describe an issue clearly at a doctor visit from inside the app.

### 4. Better Pediatrician Workflow `[In Progress]`

#### Product goal

Make reports clinically useful enough that parents feel prepared for appointments.

#### MVP scope

Upgrade report generation to include:

- poop entries
- meals and feeds
- symptoms
- episode summary
- flagged stool colors
- photos
- timeline highlights

#### UX improvements

Add report options such as:

- include meals
- include symptoms
- include photos
- include active episode summary

#### Clinical framing

The report should remain descriptive, not diagnostic.

#### Success metric

Parents should not need to manually explain the story from memory.

### 5. Smart Reminders `[Done]`

#### Product goal

Move from a generic daily reminder to context-aware local reminders.

#### Why

The current reminder model is too broad. Tiny Tummy can be more useful by reminding parents about meaningful follow-up moments.

#### MVP reminder types

- no-poop threshold reminder based on age and feeding type
- follow-up reminder after flagged stool color
- active episode check-in
- solids transition hydration reminder

#### UX rules

- all reminders should be opt-in or individually toggleable
- reminders should be quiet and specific
- no spammy behaviour

#### Technical notes

Reminder scheduling should reuse:

- age-aware logic
- active episode state
- recent alert state
- summary data

#### Success metric

Reminders should feel useful and well-timed, not nagging.

### 6. Faster Logging Surfaces `[In Progress]`

#### Product goal

Reduce friction during night use and rushed caregiving moments.

#### MVP scope

Start with:

- ultra-dim night logging mode
- larger one-tap quick actions
- repeat last feed shortcut
- recent presets for common logs

#### Next layer

After the in-app speed improvements are solid, explore:

- home screen widget
- lock-screen or live-status surface

#### Risk

Native widgets and lock-screen surfaces are platform-specific and higher risk, especially in a Tauri-based stack.

#### Recommended approach

Ship in-app speed wins first, then prototype native surfaces.

#### Success metric

Night logging should require fewer taps and less visual strain.

## Wave 2: Add Second

These features are valuable but should follow only after Wave 1 improves the product's core daily workflow.

### 1. Light Growth Tracking `[Planned]`

#### Product goal

Add useful health context without becoming a full medical records app.

#### MVP scope

Track:

- weight
- height
- head circumference
- notes

Show:

- basic trend charts
- latest measurements

#### Phase 2 option

Add percentile curves using bundled reference data.

#### Risk

Percentile features need careful medical framing and reference validation.

#### Guardrail

Do not overstate interpretation. Keep the app supportive, not diagnostic.

### 2. Very Lightweight Sleep Logging `[Planned]`

#### Product goal

Add enough sleep context to help parents understand the day without entering the sleep coaching category.

#### MVP scope

Track:

- sleep start
- sleep end
- nap or night label

Show:

- daily total sleep
- simple daily pattern view

#### Guardrail

Do not build:

- wake windows
- prediction engines
- sleep coaching
- premium-style sleep plans

#### Strategic reason

Sleep is adjacent context, not the product's main differentiation.

### 3. Health-Linked Milestones `[Planned]`

#### Product goal

Capture milestone-like events only when they help explain health patterns.

#### MVP scope

Examples:

- started solids
- teething
- medication started
- allergy concern
- illness
- daycare or travel change
- toilet training interest

#### Guardrail

This should not become:

- a scrapbook timeline
- a baby memory book
- a social sharing feed

#### Success metric

Milestones should improve interpretation of bowel and feeding changes.

## Recommended Release Order

1. Rich feeding tracking `[Done]`
2. Better pediatrician workflow `[In Progress]`
3. Episode mode `[Done]`
4. Smart reminders `[Done]`
5. Caregiver handoff `[Done]`
6. Faster logging surfaces `[In Progress]`
7. Light growth tracking `[Planned]`
8. Very lightweight sleep logging `[Planned]`
9. Health-linked milestones `[Planned]`

## Why This Order

### First, strengthen the core

Rich feeding, episodes, and better reports directly improve Tiny Tummy's unique value proposition.

### Then, improve everyday usability

Smart reminders, handoff, and faster logging increase retention and make the app feel more indispensable.

### Then, add adjacent context carefully

Growth, sleep, and milestones are useful only if they remain lightweight and support the core story.

## Delivery Approach

The cleanest implementation path is to ship this in phases rather than as one large rewrite.

### Phase A: Data Foundation `[In Progress]`

- [x] add new schema
- [x] update TypeScript types
- [x] update database access helpers
- [ ] add shared summary queries

### Phase B: Feeding and Reports `[In Progress]`

- [x] replace or extend current meal logging
- [x] update timeline and dashboards
- [x] redesign reports to include richer context

### Phase C: Episodes and Reminder Logic `[In Progress]`

- [x] add episode creation and tracking
- [x] add symptom logging
- [x] add reminder rule engine

### Phase D: Handoff and Logging Speed `[In Progress]`

- [x] add caregiver handoff view
- [x] add quick actions and night mode
- [x] test widget feasibility
- [x] document lock-screen feasibility spike in `LOCK_SCREEN_SPIKE.md`

### Phase E: Secondary Expansion `[Planned]`

- [ ] growth
- [ ] sleep
- [ ] health-linked milestones

## Suggested Implementation Epics

### Epic 1: Data Model Expansion `[In Progress]`

- [x] Design schema changes
- [x] Create migration
- [x] Update shared types
- [x] Update DB functions
- [ ] Add query tests if test coverage is introduced

### Epic 2: Rich Feeding `[Done]`

- [x] New feeding type model
- [x] New log form UX
- [x] Edit flow updates
- [x] Timeline updates
- [x] Stats and correlations updates

### Epic 3: Reports 2.0 `[In Progress]`

- [x] Multi-signal report query layer
- [x] New report options
- [x] Updated HTML export layout
- [x] Clinical summary section

### Epic 4: Episode Tracking `[Done]`

- [x] Episode data model
- [x] Episode creation flow
- [x] Active episode banner
- [x] Episode timeline
- [x] Episode close-out flow

### Epic 5: Smart Reminder Engine `[Done]`

- [x] Reminder rules data model
- [x] Local notification rules
- [x] Reminder settings UI
- [x] Reminder state management

### Epic 6: Caregiver Handoff `[Done]`

- [x] Summary query layer reuse
- [x] Handoff screen
- [x] Share/export format
- [x] Optional note for next caregiver

### Epic 7: Fast Logging `[In Progress]`

- [x] Night mode UX
- [x] Quick-action shortcuts
- [x] Repeat last feed
- [ ] Widget feasibility spike

### Epic 8: Context Expansion `[Planned]`

- [ ] Growth logs
- [ ] Sleep logs
- [ ] Health-linked milestones

## Product Guardrails

Every new feature should pass these checks:

- Does it strengthen Tiny Tummy's bowel-first value?
- Does it reduce parent stress or mental load?
- Does it improve doctor conversations?
- Can it remain simple enough for one-handed tired-parent use?
- Does it preserve the app's calm, private feel?

If a feature fails these checks, it should probably not ship.

## Recommendation

Build Wave 1 first. Within Wave 1, start with:

1. data foundation
2. rich feeding
3. better pediatrician workflow
4. episode mode

That sequence gives Tiny Tummy the biggest product lift without diluting its positioning.

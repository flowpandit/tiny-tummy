# Symptoms and Episodes UX Plan

## Summary

Tiny Tummy should treat **Log symptom** as a fast, point-in-time health observation and **Start episode** as an ongoing container for a concern that needs updates, context, resolution, and reporting. MVP episodes should stay health-first: feeding and sleep changes can be captured as episode context, but they should not become first-class episode types yet.

When one active episode exists, symptom logging should suggest linking by default while still allowing the parent to save the symptom as standalone. Linked symptoms remain symptom records first, and episode timelines should avoid duplicate generated update rows.

## Research Signals

- Baby trackers emphasize speed, calm design, flexible detail, timeline review, and pediatrician sharing. Nara describes simple activity tracking, notes, trends, and doctor-visit support: https://apps.apple.com/us/app/nara-baby-pregnancy-tracker/id1444639029
- Pediatric health trackers commonly combine fever, medicines, symptoms, readable timelines, reminders, and PDF export. Examples: https://www.pediary.net/ and https://www.getloggo.app/
- Symptom diary guidance supports logging time, symptom, severity/context, what helped, medications/foods, and patterns for doctor review: https://www.medicalnewstoday.com/articles/symptom-diary
- Safety wording should avoid diagnosis and defer medical decisions to clinicians. AAP/HealthyChildren states health content is not a substitute for pediatric care: https://www.healthychildren.org/English/health-issues/conditions/fever/Pages/Fever-and-Your-Baby.aspx
- Temperature reports should include the reading and how it was taken when possible; infant fever and dehydration signs are common “call doctor” contexts: https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/in-depth/thermometer/art-20047410, https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/in-depth/healthy-baby/art-20047793, https://www.cdc.gov/dengue/treatment/dengue-infants.html

## Recommended UX Architecture

- Keep the Health route as the hub: quick actions, active episode card, recent symptoms, insight prompt, and recent health history.
- Use existing sheet patterns for MVP: `Log symptom` and `Start/Manage episode`.
- Later, graduate long-running episode management into a dedicated episode detail route when timelines, related logs, photos, and edit actions outgrow a sheet.
- Log symptom should be available from Home, Health, History edit, and active episode contexts.
- Start episode should be available from Health, Home, severe/repeated symptom insight, and after logging a severe or repeated symptom.
- Episode labels should stay concern-based, not diagnostic: Fever / illness, Stomach upset, Rash / skin, Constipation concern, Vomiting, Diarrhoea, Medicine / reaction concern, Other health concern.

## Screen Flow

- **Health page:** show `Log symptom` and `Start episode`; show active episode count, recent symptom count, severe markers, active episode, recent symptoms, and health history.
- **Health empty state:** “Ready when something changes. Log symptoms here so they’re easy to review or share with your doctor.”
- **Log symptom:** require symptom type, severity, and time. Default to now and Moderate. Optional: temperature, temperature method, notes, and episode link.
- **Fever fields:** temperature value in the user’s Settings unit plus optional method: Rectal, Forehead / temporal, Ear, Armpit, Oral, Other.
- **Other symptom rule:** require a short note for `Other`.
- **Episode linking:** if one active episode exists, show `Add this to [episode]?` with Linked / Standalone. If several are active, show an episode picker plus Standalone.
- **Start episode:** require episode type and start date/time. Optional: summary and link recent standalone symptoms from the previous 24 hours.
- **After start:** keep the sheet in manage mode, show started time, linked symptom count, latest update, add-update form, timeline, and resolve controls.
- **Resolve episode:** require resolution date/time and keep outcome optional but encouraged.
- **Resolved state:** read-only in History and reports by default.

## Data and Rules

- `SymptomLog`: `child_id`, `logged_at`, `symptom_type`, `severity`, `temperature_c`, `temperature_method`, `notes`, `episode_id`, `created_at`, `updated_at`.
- `Episode`: `child_id`, `episode_type`, `status`, `started_at`, `ended_at`, `summary`, `outcome`, `created_at`, `updated_at`.
- `EpisodeEvent`: `episode_id`, `child_id`, `event_type`, `title`, `notes`, `logged_at`, `created_at`, with source metadata for generated linked-symptom updates.
- A linked symptom remains a symptom record first. Generated episode update rows should carry a symptom source so History and PDF timelines can de-duplicate.
- Parents can edit symptom fields, link or unlink from an episode, and delete a symptom.
- If a linked symptom time is before the episode start, offer `Keep as is` or `Use symptom time`.
- Episode end cannot be earlier than episode start.
- If the active child changes while a sheet is open, close the sheet and discard unsaved state.

## History and PDF

- **History:** standalone symptoms appear as symptom rows; linked symptoms include episode context and can be opened for edit. Episode starts and updates open the episode sheet. Resolved episodes are read-only.
- **PDF summary:** `Symptoms & episodes` should show active episode name when active, otherwise symptom count, severe count, and episode count.
- **PDF episode context:** include status, start/end, summary, outcome, linked symptom count, update count, and latest update.
- **PDF symptom context:** include date/time, symptom, severity, temperature, method, linked episode, and notes.
- **PDF timeline:** chronological rows should avoid duplicate generated symptom episode updates when symptom rows are included.
- **PDF note:** “This report is a tracking summary from Tiny Tummy. It does not diagnose or replace medical advice.”

## Safety Copy

- Use calm words: track, review, share, consider calling, if you’re worried.
- Avoid diagnostic language such as “this means,” “diagnosed,” or condition claims from patterns.
- Fever under 3 months: “Because [name] is under 3 months, a temperature of 100.4 F / 38 C or higher is a reason to call your pediatrician now.”
- Severe symptom: “Marked severe. If you are worried, symptoms worsen, or [name] seems unusually sleepy, has trouble breathing, has fewer wet diapers, or cannot keep fluids down, seek medical advice.”
- Episode empty timeline: “No updates yet. Add symptoms, temperature, fluids, food, medicine, or progress as things change.”
- Report empty health section: “No symptoms or episodes were logged in this date range.”

## MVP and Later

MVP includes health-first episode labels, symptom sheet refinements, temperature method, suggested linking, edit/unlink/delete symptom, episode manage sheet, resolve validation, History de-dupe, PDF symptom/episode sections, and safety copy.

Later work can add a dedicated episode detail route, explicit related log attachment for feed/poop/diaper/sleep, symptom photos, medicine dose/reminder tracking, episode close nudges after inactivity, reopen episode, richer charts, and caregiver handoff notes.

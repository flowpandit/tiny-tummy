import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCaregiverHandoffPdfFileName,
  buildCaregiverHandoffReportOptions,
  getCaregiverHandoffPdfErrorMessage,
} from "../src/lib/handoff-pdf.ts";

test("caregiver handoff PDF options keep local export privacy defaults", () => {
  const options = buildCaregiverHandoffReportOptions({
    childId: "child-1",
    dayKey: "2026-05-04",
    generatedAt: "2026-05-04T15:50:00.000Z",
    parentNote: "  Please watch wet diapers.  ",
  });

  assert.equal(options.mode, "caregiver_handoff");
  assert.deepEqual(options.dateRange, { start: "2026-05-04", end: "2026-05-04" });
  assert.equal(options.childId, "child-1");
  assert.equal(options.generatedAt, "2026-05-04T15:50:00.000Z");
  assert.equal(options.parentNote, "Please watch wet diapers.");
  assert.equal(options.includePhotos, false);
  assert.equal(options.includeAttachmentMetadata, false);
  assert.equal(options.includeDeleted, false);
  assert.equal(options.includeCaregiverAttribution, false);
  assert.equal(options.maxTimelineRows, 12);
});

test("caregiver handoff PDF helpers avoid technical error copy", () => {
  assert.equal(getCaregiverHandoffPdfErrorMessage(), "Could not generate the handoff PDF. Please try again.");
  assert.equal(
    buildCaregiverHandoffPdfFileName("Maya Rose", "2026-05-04", new Date("2026-05-04T15:50:00.000Z")),
    "tiny-tummy-caregiver-handoff-maya-rose-2026-05-04-2026-05-04T15-50-00-000Z.pdf",
  );
});

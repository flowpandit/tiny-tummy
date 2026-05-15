import test from "node:test";
import assert from "node:assert/strict";
import {
  CURRENT_CAREGIVER_SETTING_KEY,
  buildCaregiverDraft,
  type ChildCaregiverProfile,
} from "../src/lib/caregivers.ts";
import { createCaregiverService } from "../src/lib/services/caregiver-service.ts";
import type { AppRepositories } from "../src/lib/repositories/index.ts";
import type { Caregiver, ChildCaregiver } from "../src/lib/types.ts";

const NOW = "2026-05-05T10:00:00.000Z";

function syncFields() {
  return {
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    device_id: null,
    sync_status: "local" as const,
    sync_version: 1,
    local_only: 0,
  };
}

function createRepositoryState() {
  const caregivers: Caregiver[] = [];
  const childCaregivers: ChildCaregiver[] = [];
  const settings = new Map<string, string>();
  let caregiverIndex = 0;
  let linkIndex = 0;

  const repository: Pick<AppRepositories, "caregivers" | "settings"> = {
    caregivers: {
      async createCaregiver(input) {
        const caregiver: Caregiver = {
          id: `caregiver-${++caregiverIndex}`,
          ...input,
          ...syncFields(),
        };
        caregivers.push(caregiver);
        return caregiver;
      },
      async getCaregiver(caregiverId) {
        return caregivers.find((caregiver) => caregiver.id === caregiverId && !caregiver.deleted_at) ?? null;
      },
      async listActiveCaregivers() {
        return caregivers.filter((caregiver) => !caregiver.deleted_at);
      },
      async listCaregiversForChild(childId) {
        return childCaregivers
          .filter((link) => link.child_id === childId && !link.deleted_at)
          .map((link): ChildCaregiverProfile | null => {
            const caregiver = caregivers.find((item) => item.id === link.caregiver_id && !item.deleted_at);
            if (!caregiver) return null;
            return {
              ...caregiver,
              child_caregiver_id: link.id,
              child_id: link.child_id,
              relationship_to_child: link.relationship_to_child,
              permissions: link.permissions,
              link_created_at: link.created_at,
              link_updated_at: link.updated_at,
            };
          })
          .filter((profile): profile is ChildCaregiverProfile => Boolean(profile));
      },
      async updateCaregiver(caregiverId, updates) {
        const caregiver = caregivers.find((item) => item.id === caregiverId && !item.deleted_at);
        if (!caregiver) return;
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            Object.assign(caregiver, { [key]: value });
          }
        });
        Object.assign(caregiver, {
          updated_at: "2026-05-05T11:00:00.000Z",
          sync_version: (caregiver.sync_version ?? 1) + 1,
        });
      },
      async linkCaregiverToChild(input) {
        const active = childCaregivers.find((link) => (
          link.child_id === input.childId
            && link.caregiver_id === input.caregiverId
            && !link.deleted_at
        ));
        if (active) {
          active.relationship_to_child = input.relationshipToChild ?? null;
          active.permissions = input.permissions ?? null;
          return active;
        }

        const deleted = childCaregivers.find((link) => (
          link.child_id === input.childId
            && link.caregiver_id === input.caregiverId
            && link.deleted_at
        ));
        if (deleted) {
          deleted.deleted_at = null;
          deleted.relationship_to_child = input.relationshipToChild ?? null;
          deleted.permissions = input.permissions ?? null;
          return deleted;
        }

        const link: ChildCaregiver = {
          id: `child-caregiver-${++linkIndex}`,
          child_id: input.childId,
          caregiver_id: input.caregiverId,
          relationship_to_child: input.relationshipToChild ?? null,
          permissions: input.permissions ?? null,
          ...syncFields(),
        };
        childCaregivers.push(link);
        return link;
      },
      async setPrimaryCaregiver(caregiverId) {
        caregivers.forEach((caregiver) => {
          if (!caregiver.deleted_at) caregiver.is_primary = caregiver.id === caregiverId ? 1 : 0;
        });
      },
      async deleteCaregiver(caregiverId) {
        caregivers.forEach((caregiver) => {
          if (caregiver.id === caregiverId) caregiver.deleted_at = "2026-05-05T12:00:00.000Z";
        });
        childCaregivers.forEach((link) => {
          if (link.caregiver_id === caregiverId) link.deleted_at = "2026-05-05T12:00:00.000Z";
        });
      },
      async deleteChildCaregiverLink(linkId) {
        const link = childCaregivers.find((item) => item.id === linkId);
        if (link) link.deleted_at = "2026-05-05T12:00:00.000Z";
      },
    },
    settings: {
      async getSetting(key) {
        return settings.get(key) ?? null;
      },
      async setSetting(key, value) {
        settings.set(key, value);
      },
      async deleteSetting(key) {
        settings.delete(key);
      },
      async listQuickPresets() {
        return [];
      },
      async replaceQuickPresets() {},
    },
  };

  return {
    caregivers,
    childCaregivers,
    settings,
    service: createCaregiverService(repository),
  };
}

test("caregiver drafts parse local-only contact notes without treating them as identities", () => {
  const draft = buildCaregiverDraft({
    displayName: "  Grandma  ",
    role: "grandparent",
    email: "  nana@example.test ",
    phone: "  0400 000 000 ",
    isPrimary: true,
  });

  assert.deepEqual(draft, {
    display_name: "Grandma",
    role: "grandparent",
    relationship: "grandparent",
    email: "nana@example.test",
    phone: "0400 000 000",
    avatar_color: "#7C3AED",
    is_primary: 1,
  });
  assert.throws(() => buildCaregiverDraft({ displayName: " ", role: "parent" }), /required/);
});

test("caregiver service creates, edits, selects, and soft deletes local caregivers", async () => {
  const state = createRepositoryState();

  const caregiver = await state.service.createCaregiverForChild("child-1", {
    displayName: "Mum",
    role: "parent",
    email: "mum@example.test",
    isPrimary: true,
  });

  assert.equal(caregiver.display_name, "Mum");
  assert.equal(state.caregivers[0].is_primary, 1);
  assert.equal(state.childCaregivers[0].child_id, "child-1");
  assert.equal(state.settings.get(CURRENT_CAREGIVER_SETTING_KEY), caregiver.id);

  await state.service.updateCaregiver(caregiver.id, {
    displayName: "Mama",
    role: "guardian",
    email: "",
    phone: "555",
    avatarColor: "#0F766E",
    isPrimary: false,
  });

  assert.equal(state.caregivers[0].display_name, "Mama");
  assert.equal(state.caregivers[0].role, "guardian");
  assert.equal(state.caregivers[0].email, null);
  assert.equal(state.caregivers[0].phone, "555");
  assert.equal(state.caregivers[0].is_primary, 0);

  await state.service.deleteCaregiver(caregiver.id);

  assert.ok(state.caregivers[0].deleted_at);
  assert.ok(state.childCaregivers[0].deleted_at);
  assert.equal(state.settings.has(CURRENT_CAREGIVER_SETTING_KEY), false);
});

test("caregiver service selects a newly created caregiver when the child has no current caregiver", async () => {
  const state = createRepositoryState();

  const caregiver = await state.service.createCaregiverForChild("child-1", {
    displayName: "Mum",
    role: "parent",
  });

  assert.equal(state.settings.get(CURRENT_CAREGIVER_SETTING_KEY), caregiver.id);
  assert.equal((await state.service.getCurrentCaregiverForChild("child-1"))?.id, caregiver.id);
});

test("caregiver service keeps the linked current caregiver when adding another caregiver", async () => {
  const state = createRepositoryState();
  const dad = await state.service.createCaregiverForChild("child-1", {
    displayName: "Dad",
    role: "parent",
  });
  const nanny = await state.service.createCaregiverForChild("child-1", {
    displayName: "Nanny",
    role: "nanny",
  });

  assert.equal(state.settings.get(CURRENT_CAREGIVER_SETTING_KEY), dad.id);
  assert.equal((await state.service.getCurrentCaregiverForChild("child-1"))?.id, dad.id);
  assert.notEqual(state.settings.get(CURRENT_CAREGIVER_SETTING_KEY), nanny.id);
});

test("caregiver service supports one caregiver across children and many caregivers for one child", async () => {
  const state = createRepositoryState();
  const dad = await state.service.createCaregiverForChild("child-1", {
    displayName: "Dad",
    role: "parent",
  });
  await state.service.linkCaregiverToChild("child-2", dad.id, "parent");
  const nanny = await state.service.createCaregiverForChild("child-1", {
    displayName: "Nanny",
    role: "nanny",
  });

  assert.deepEqual((await state.service.listChildCaregivers("child-1")).map((caregiver) => caregiver.id), [dad.id, nanny.id]);
  assert.deepEqual((await state.service.listChildCaregivers("child-2")).map((caregiver) => caregiver.id), [dad.id]);

  const dadChildOneLink = state.childCaregivers.find((link) => link.child_id === "child-1" && link.caregiver_id === dad.id);
  assert.ok(dadChildOneLink);
  await state.service.unlinkCaregiverFromChild(dadChildOneLink.id);

  assert.deepEqual((await state.service.listChildCaregivers("child-1")).map((caregiver) => caregiver.id), [nanny.id]);
  assert.deepEqual((await state.service.listChildCaregivers("child-2")).map((caregiver) => caregiver.id), [dad.id]);
  assert.equal(state.caregivers.find((caregiver) => caregiver.id === dad.id)?.deleted_at, null);
});

test("caregiver service resolves current caregiver only when linked to the child", async () => {
  const state = createRepositoryState();
  const caregiver = await state.service.createCaregiverForChild("child-1", {
    displayName: "Mum",
    role: "parent",
  });
  await state.service.setCurrentCaregiver(caregiver.id);

  assert.equal((await state.service.getCurrentCaregiverForChild("child-1"))?.id, caregiver.id);
  assert.equal(await state.service.getCurrentCaregiverForChild("child-2"), null);

  const link = state.childCaregivers.find((item) => item.child_id === "child-1" && item.caregiver_id === caregiver.id);
  assert.ok(link);
  await state.service.unlinkCaregiverFromChild(link.id);

  assert.equal(await state.service.getCurrentCaregiverForChild("child-1"), null);
});

test("new primary caregiver uses the user-entered name", async () => {
  const state = createRepositoryState();

  assert.deepEqual(await state.service.listChildCaregivers("child-1"), []);

  const caregiver = await state.service.createCaregiverForChild("child-1", {
    displayName: "Nikhil",
    role: "parent",
    isPrimary: true,
  });

  assert.equal(caregiver.display_name, "Nikhil");
  assert.equal(caregiver.role, "parent");
  assert.equal(caregiver.is_primary, 1);
  assert.equal(state.settings.get(CURRENT_CAREGIVER_SETTING_KEY), caregiver.id);
  assert.deepEqual((await state.service.listChildCaregivers("child-1")).map((profile) => profile.display_name), ["Nikhil"]);
});

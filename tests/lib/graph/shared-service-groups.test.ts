import { describe, expect, it } from "vitest";
import {
  getSharedServiceGroupForPerson,
  groupSharedServiceMirrors,
} from "@/lib/graph/shared-service-groups";
import { makePerson } from "../../fixtures";

describe("getSharedServiceGroupForPerson", () => {
  it("splits dealer services into recognizable service teams", () => {
    expect(
      getSharedServiceGroupForPerson(
        makePerson("tech", {
          title: "Technical Support Specialist",
          primaryDepartment: "Dealer Services",
        }),
      ),
    ).toEqual({ service: "Dealer Services", label: "Technical Support" });

    expect(
      getSharedServiceGroupForPerson(
        makePerson("design", {
          title: "Design Services Specialist",
          primaryDepartment: "Dealer Services",
        }),
      ),
    ).toEqual({ service: "Dealer Services", label: "Design Services" });

    expect(
      getSharedServiceGroupForPerson(
        makePerson("custom", {
          title: "James Custom Engineer",
          primaryDepartment: "Dealer Services",
        }),
      ),
    ).toEqual({ service: "Dealer Services", label: "James Custom Engineering" });
  });
});

describe("groupSharedServiceMirrors", () => {
  it("rolls mirror people into service groups and keeps home lane context", () => {
    const groups = groupSharedServiceMirrors(
      [
        makePerson("tech-lead", {
          name: "Brian Taksier",
          title: "Technical Support Supervisor",
          tier: "manager",
          primaryDepartment: "Dealer Services",
          primaryChannel: "All Channels",
        }),
        makePerson("tech-ic", {
          name: "Jeremy Belsher",
          title: "Technical Support Specialist",
          tier: "ic",
          primaryDepartment: "Dealer Services",
          primaryChannel: "All Channels",
        }),
        makePerson("ops", {
          name: "Brett Alejo",
          title: "Digital Operations Lead",
          tier: "manager",
          primaryDepartment: "Sales Ops",
          primaryChannel: "All Channels",
        }),
      ],
      (person) => person.attributes.primaryChannel ?? "Unknown",
    );

    const technicalSupport = groups.find((group) => group.label === "Technical Support");
    expect(technicalSupport?.service).toBe("Dealer Services");
    expect(technicalSupport?.homeLane).toBe("All Channels");
    expect(technicalSupport?.members.map((member) => member.id).sort()).toEqual([
      "tech-ic",
      "tech-lead",
    ]);
    expect(technicalSupport?.lead?.id).toBe("tech-lead");

    expect(groups.find((group) => group.label === "Digital Operations")?.members).toHaveLength(1);
  });
});

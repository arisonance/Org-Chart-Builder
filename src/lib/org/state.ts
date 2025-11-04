import { orgMatrix } from "@/lib/org/data";
import type { OrgMatrix, Person } from "@/lib/org/types";

export const createInitialMatrix = (): OrgMatrix => {
  return {
    brands: [...orgMatrix.brands],
    channels: [...orgMatrix.channels],
    departments: [...orgMatrix.departments],
    leadership: orgMatrix.leadership.map<Person>((person) => ({
      ...person,
      brandIds: [...person.brandIds],
      channelIds: [...person.channelIds],
      departmentIds: [...person.departmentIds],
    })),
  };
};

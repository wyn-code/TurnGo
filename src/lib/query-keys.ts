/**
 * Query-key factory shared by every TanStack Query.
 *
 * IDs are normalized to strings because route params and authenticated user IDs
 * reach the UI as strings while API payloads usually expose numbers. Keeping a
 * single representation prevents cache misses during invalidation.
 */
export type QueryEntityId = string | number;

const id = (value: QueryEntityId) => String(value);

export const queryKeys = {
  businesses: {
    root: () => ["businesses"] as const,
    all: (params?: Record<string, string | number | boolean>) =>
      ["businesses", "list", params] as const,
    admin: () => ["businesses", "admin"] as const,
    mine: (userId: QueryEntityId) => ["businesses", "mine", id(userId)] as const,
    bySlug: (slug: string) => ["businesses", "slug", slug] as const,
    mapa: () => ["businesses", "map"] as const,
  },
  users: {
    admin: () => ["users", "admin"] as const,
  },
  categories: {
    all: () => ["categories"] as const,
  },
  services: {
    all: () => ["services"] as const,
    byBusiness: (businessId: QueryEntityId, includeInactive = false) =>
      ["services", id(businessId), { includeInactive }] as const,
    byBusinessRoot: (businessId: QueryEntityId) =>
      ["services", id(businessId)] as const,
  },
  employees: {
    all: () => ["employees"] as const,
    byBusiness: (businessId: QueryEntityId) =>
      ["employees", id(businessId)] as const,
    calendarState: (businessId: QueryEntityId, employeeId: QueryEntityId) =>
      ["employees", id(businessId), "calendar-state", id(employeeId)] as const,
  },
  schedules: {
    all: () => ["schedules"] as const,
    byBusiness: (businessId: QueryEntityId) =>
      ["schedules", id(businessId)] as const,
  },
  appointments: {
    all: () => ["appointments"] as const,
    byBusiness: (businessId: QueryEntityId) =>
      ["appointments", id(businessId)] as const,
    byRangeRoot: (businessId: QueryEntityId) =>
      ["appointments", id(businessId), "range"] as const,
    byRange: (businessId: QueryEntityId, desde: string, hasta: string) =>
      ["appointments", id(businessId), "range", desde, hasta] as const,
    availability: (
      businessId: QueryEntityId,
      desde: string,
      hasta: string,
      employeeId?: QueryEntityId | null,
    ) =>
      [
        "appointments",
        id(businessId),
        "availability",
        desde,
        hasta,
        employeeId == null ? null : id(employeeId),
      ] as const,
    availabilityRoot: (businessId: QueryEntityId) =>
      ["appointments", id(businessId), "availability"] as const,
  },
  georef: {
    provinces: () => ["georef", "provinces"] as const,
    localities: (provinceId: QueryEntityId) =>
      ["georef", "localities", id(provinceId)] as const,
    allLocalities: () => ["georef", "localities", "all"] as const,
  },
  membership: {
    root: () => ["membership"] as const,
    plans: () => ["membership", "plans"] as const,
    current: () => ["membership", "current"] as const,
    features: (businessId: QueryEntityId) =>
      ["membership", "features", id(businessId)] as const,
  },
  statistics: {
    byBusinessRoot: (businessId: QueryEntityId) =>
      ["statistics", id(businessId)] as const,
    byBusiness: (businessId: QueryEntityId, range: string, compare: string) =>
      ["statistics", id(businessId), range, compare] as const,
  },
} as const;

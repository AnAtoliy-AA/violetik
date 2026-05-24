import { describe, it, expect } from "vitest";
import {
  availabilityRules,
  bookings,
  bookingStatus,
  currencyCode,
  googleOauthTokens,
  serviceCategories,
  serviceStatus,
  services,
  userRole,
  users,
  vipRequests,
  vipRequestStatus,
} from "./schema";
import type {
  AvailabilityRule,
  Booking,
  GoogleOauthToken,
  NewBooking,
  NewGoogleOauthToken,
  NewService,
  NewServiceCategory,
  NewUser,
  NewVipRequest,
  Service,
  ServiceCategoryRow,
  User,
} from "./schema";

describe("db/schema", () => {
  it("declares the three core tables", () => {
    expect(users).toBeDefined();
    expect(bookings).toBeDefined();
    expect(availabilityRules).toBeDefined();
  });

  it("exposes pgEnums for role and booking status", () => {
    expect(userRole.enumValues).toEqual(["customer", "admin"]);
    expect(bookingStatus.enumValues).toEqual([
      "pending",
      "confirmed",
      "cancelled",
      "completed",
    ]);
  });

  it("infers Select/Insert types that line up with the columns", () => {
    // Compile-time check — if these don't typecheck the test fails.
    const _u: NewUser = {
      id: "tg:1",
      telegramId: 1,
    };
    const _gu: NewUser = {
      id: "google:abc123",
      googleSub: "abc123",
      email: "v@example.com",
    };
    expect(_gu.id).toBe("google:abc123");
    const _b: NewBooking = {
      id: "bk_1",
      userId: "tg:1",
      serviceId: "signature",
      scheduledFor: new Date(),
      durationMinutes: 75,
    };
    // Select types should include the defaulted fields too.
    const _selUser: Pick<User, "id" | "role" | "createdAt"> = {
      id: "tg:1",
      role: "customer",
      createdAt: new Date(),
    };
    const _selBooking: Pick<Booking, "id" | "status" | "createdAt"> = {
      id: "bk_1",
      status: "pending",
      createdAt: new Date(),
    };
    const _selRule: Pick<AvailabilityRule, "id" | "dayOfWeek" | "startTime"> = {
      id: "rule_1",
      dayOfWeek: 2,
      startTime: "10:00",
    };
    expect(_u.id).toBe("tg:1");
    expect(_b.serviceId).toBe("signature");
    expect(_selUser.role).toBe("customer");
    expect(_selBooking.status).toBe("pending");
    expect(_selRule.dayOfWeek).toBe(2);
  });

  it("declares vip_requests table and status enum", () => {
    expect(vipRequests).toBeDefined();
    expect(vipRequestStatus.enumValues).toEqual([
      "pending",
      "approved",
      "declined",
      "cancelled",
    ]);
  });

  it("infers VipRequest insert type with required fields", () => {
    const _r: NewVipRequest = { id: "vipreq_x", userId: "tg:1" };
    expect(_r).toBeDefined();
  });

  it("declares the google_oauth_tokens table with the expected shape", () => {
    expect(googleOauthTokens).toBeDefined();
    const _insert: NewGoogleOauthToken = {
      userId: "tg:1",
      email: "v@example.com",
      refreshToken: "1//xxx",
      scope: "openid email https://www.googleapis.com/auth/calendar.readonly",
    };
    const _select: Pick<
      GoogleOauthToken,
      "userId" | "calendarId" | "connectedAt"
    > = {
      userId: "tg:1",
      calendarId: "primary",
      connectedAt: new Date(),
    };
    expect(_insert.userId).toBe("tg:1");
    expect(_select.calendarId).toBe("primary");
  });
});

describe("db/schema — services", () => {
  it("declares the two services tables and two new enums", () => {
    expect(serviceCategories).toBeDefined();
    expect(services).toBeDefined();
    expect(serviceStatus.enumValues).toEqual(["draft", "published", "archived"]);
    expect(currencyCode.enumValues).toEqual(["EUR", "USD", "BYN", "RUB"]);
  });

  it("infers Service / ServiceCategoryRow Insert types with required i18n columns", () => {
    const _cat: NewServiceCategory = {
      id: "care",
      nameEn: "Care",
      nameRu: "Уход",
      nameBy: "Догляд",
    };
    const _svc: NewService = {
      id: "signature",
      categoryId: "care",
      nameEn: "Signature Manicure",
      nameRu: "Сигнатурный маникюр",
      nameBy: "Сігнатурны манікюр",
      blurbEn: "Russian dry technique, cuticle work, hydration ritual & gloss finish.",
      blurbRu: "Русская сухая техника, работа с кутикулой, ритуал увлажнения и финишный блеск.",
      blurbBy: "Расейская сухая тэхніка, праца з кутыкулай, рытуал увільгатнення і фініш-бляск.",
      includes: [],
      priceCents: 9500,
      durationMinutes: 75,
    };
    const _sel: Pick<Service, "id" | "status" | "sortOrder" | "createdAt"> = {
      id: "signature",
      status: "published",
      sortOrder: 1,
      createdAt: new Date(),
    };
    const _selCat: Pick<ServiceCategoryRow, "id" | "status" | "sortOrder"> = {
      id: "care",
      status: "published",
      sortOrder: 1,
    };
    expect(_cat.id).toBe("care");
    expect(_svc.priceCents).toBe(9500);
    expect(_sel.status).toBe("published");
    expect(_selCat.status).toBe("published");
  });
});

describe("users.preferredLocale", () => {
  it("is declared on the schema", () => {
    expect(users.preferredLocale).toBeDefined();
  });
});

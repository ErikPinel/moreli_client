import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatIsraeliDate, today } from "@/lib/lesson-time";
import { LessonDateInput } from '@/features/account/LessonDateInput';
import { useTeacherCalendar } from '@/features/account/useEngagementData';
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Laptop,
  MapPin,
  Search,
  Star,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { apiRequest } from "@/api/api-client";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/auth/useAuth";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceState } from "@/features/account/AccountShell";
import {
  ActiveFilters,
  type ActiveFilter,
} from "@/features/search/components/ActiveFilters";
import { FilterDrawer } from "@/features/search/components/FilterDrawer";
import { SearchFilters } from "@/features/search/components/SearchFilters";
import { SearchPagination } from "@/features/search/components/SearchPagination";
import { SearchToolbar } from "@/features/search/components/SearchToolbar";
import { useTeacherSearchParams } from "@/features/search/hooks/useTeacherSearchParams";
import { TeacherAvatar } from "@/features/teachers/components/TeacherAvatar";
import {
  TeacherResultCard,
  TeacherResultCardSkeleton,
} from "@/features/teachers/components/TeacherResultCard";
import { useTeachers } from "@/features/teachers/hooks/useTeachers";
import type {
  AvailabilitySlotDto,
  PaginatedDto,
  PublicTeacherDto,
} from "@/types/api";

type PublicReview = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
  teacher_reply: string | null;
  teacher_reply_at: string | null;
};

export function TeachersPage() {
  const search = useTeacherSearchParams();
  const teachers = useTeachers(search.apiFilters, search.isReady);
  const total = teachers.data?.meta?.total ?? teachers.data?.items.length ?? 0;
  const pageCount =
    teachers.data?.meta?.pageCount ??
    (teachers.data?.hasMore ? search.values.page + 1 : search.values.page);
  const activeFilters = buildActiveFilters(search);
  const heading = search.subject
    ? `מורים פרטיים ל${search.subject.name_he}${search.city ? ` ב${search.city.name_he}` : !search.values.inPerson && search.values.online ? " אונליין" : ""}`
    : search.city
      ? `מורים פרטיים ב${search.city.name_he}`
      : "מורים פרטיים שמתאימים לכם";

  return (
    <div className="directory-page" dir="rtl">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <div className="directory-context">
          <div className="page-shell">
            <p>דף הבית / מציאת מורה</p>
            <h1>{heading}</h1>
            {teachers.isSuccess ? <span><strong>{total}</strong> מורים מתאימים</span> : <span role="status">{teachers.isError ? 'ספירת המורים אינה זמינה כרגע' : 'טוען את תוצאות החיפוש...'}</span>}
          </div>
        </div>
        <div className="page-shell directory-content">
          <SearchToolbar
            subject={search.values.subject}
            city={search.values.city}
            subjects={search.subjects}
            cities={search.cities}
            onSearch={(subject, city) => search.update({ subject, city })}
          />
          <div className="search-mobile-actions">
            <FilterDrawer
              values={search.values}
              subjects={search.subjects}
              levels={search.levels}
              cities={search.cities}
              total={total}
              onApply={search.apply}
            />
            <SortSelect
              value={search.values.sort}
              onChange={(sort) => search.update({ sort })}
            />
          </div>
          <ActiveFilters
            filters={activeFilters}
            onRemove={(patch) => search.update(patch)}
            onClear={search.clear}
          />
          <div className="search-layout">
            <aside className="search-sidebar">
              <SearchFilters
                values={search.values}
                subjects={search.subjects}
                levels={search.levels}
                cities={search.cities}
                onChange={(patch) => search.update(patch)}
              />
            </aside>
            <section className="search-results" aria-live="polite">
              <div className="search-results__toolbar">
                <span>
                  {teachers.isFetching
                    ? "מעדכן תוצאות..."
                    : `${total} מורים נמצאו`}
                </span>
                <SortSelect
                  value={search.values.sort}
                  onChange={(sort) => search.update({ sort })}
                />
              </div>
              {teachers.isPending || !search.isReady ? (
                <div className="teacher-result-list">
                  {[1, 2, 3].map((item) => (
                    <TeacherResultCardSkeleton key={item} />
                  ))}
                </div>
              ) : null}
              {teachers.isError ? (
                <WorkspaceState tone="error">
                  <h2>לא הצלחנו לטעון את המורים</h2>
                  <p>בדקו את החיבור ונסו שוב.</p>
                  <button onClick={() => void teachers.refetch()}>
                    נסו שוב
                  </button>
                </WorkspaceState>
              ) : null}
              {teachers.data?.items.length === 0 ? (
                <SearchEmptyState onClear={search.clear} />
              ) : null}
              {teachers.data?.items.length ? (
                <div className="teacher-result-list">
                  {teachers.data.items.map((teacher, index) => (
                    <div key={teacher.id}>
                      <TeacherResultCard teacher={teacher} />
                      {index === 2 ? <SmartMatchPrompt /> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <SearchPagination
                page={search.values.page}
                pageCount={pageCount}
                onPage={(page) => search.update({ page }, false)}
              />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: "recommended" | "rating" | "price_asc" | "price_desc";
  onChange: (
    value: "recommended" | "rating" | "price_asc" | "price_desc",
  ) => void;
}) {
  return (
    <label className="search-sort">
      <span>מיון</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as typeof value)}
      >
        <option value="recommended">המומלצים ביותר</option>
        <option value="rating">דירוג</option>
        <option value="price_asc">מחיר: נמוך לגבוה</option>
        <option value="price_desc">מחיר: גבוה לנמוך</option>
      </select>
    </label>
  );
}

function SmartMatchPrompt() {
  return (
    <aside className="search-smart-match">
      <div>
        <strong>לא מצאתם עדיין?</strong>
        <p>ספרו לנו מה אתם מחפשים ונמצא לכם שלושה מורים שמתאימים לכם.</p>
      </div>
      <Button asChild>
        <Link to="/match">מצאו לי 3 מורים</Link>
      </Button>
    </aside>
  );
}

function SearchEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="search-empty">
      <Search />
      <h2>לא מצאנו מורים שמתאימים בדיוק לחיפוש הזה</h2>
      <p>
        נסו להרחיב את אזור החיפוש, לבחור גם שיעורים אונליין או להגדיל מעט את
        טווח המחיר.
      </p>
      <div>
        <Button variant="outline" onClick={onClear}>
          שינוי הסינון
        </Button>
        <Button asChild>
          <Link to="/match">מצאו לי 3 מורים</Link>
        </Button>
      </div>
    </div>
  );
}

function buildActiveFilters(
  search: ReturnType<typeof useTeacherSearchParams>,
): ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  if (search.subject)
    filters.push({
      key: "subject",
      label: search.subject.name_he,
      patch: { subject: "" },
    });
  if (search.level)
    filters.push({
      key: "level",
      label: search.level.name_he,
      patch: { level: "" },
    });
  if (search.city)
    filters.push({
      key: "city",
      label: search.city.name_he,
      patch: { city: "" },
    });
  if (!search.values.inPerson && search.values.online)
    filters.push({
      key: "online",
      label: "אונליין",
      patch: { online: true, inPerson: true },
    });
  if (!search.values.online && search.values.inPerson)
    filters.push({
      key: "inPerson",
      label: "פרונטלי",
      patch: { online: true, inPerson: true },
    });
  if (search.values.priceMin)
    filters.push({
      key: "priceMin",
      label: `מ־₪${search.values.priceMin}`,
      patch: { priceMin: "" },
    });
  if (search.values.priceMax)
    filters.push({
      key: "priceMax",
      label: `עד ₪${search.values.priceMax}`,
      patch: { priceMax: "" },
    });
  if (search.values.verifiedOnly)
    filters.push({
      key: "verifiedOnly",
      label: "מאומתים",
      patch: { verifiedOnly: false },
    });
  if (search.values.ratingMin)
    filters.push({
      key: "ratingMin",
      label: `${search.values.ratingMin}+ כוכבים`,
      patch: { ratingMin: "" },
    });
  return filters;
}

export function TeacherPublicProfilePage() {
  const { slug = "" } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacting, setContacting] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const teacher = useQuery({
    queryKey: ["teachers", "detail", slug],
    queryFn: () => apiRequest<PublicTeacherDto>(endpoints.teacher(slug)),
    enabled: Boolean(slug),
  });
  const availability = useQuery({
    queryKey: ["teachers", "availability", slug],
    queryFn: () =>
      apiRequest<{ slots: AvailabilitySlotDto[] }>(
        endpoints.teacherAvailabilityBySlug(slug),
      ),
    enabled: Boolean(slug),
  });
  const reviews = useQuery({
    queryKey: ["teachers", "reviews", slug, reviewsPage],
    queryFn: () =>
      apiRequest<PaginatedDto<PublicReview>>(
        `${endpoints.teacherReviews(slug)}?page=${reviewsPage}&limit=20`,
      ),
    enabled: Boolean(slug),
  });
  const scheduleOpen =
    contacting ||
    (searchParams.get("schedule") === "1" && profile?.role === "student");
  if (teacher.isPending)
    return (
      <div dir="rtl">
        <Header />
        <main id="main-content" tabIndex={-1} className="page-shell teacher-public">
          <WorkspaceState>טוען פרופיל מורה...</WorkspaceState>
        </main>
        <Footer />
      </div>
    );
  if (teacher.isError || !teacher.data)
    return (
      <div dir="rtl">
        <Header />
        <main id="main-content" tabIndex={-1} className="page-shell teacher-public">
          <WorkspaceState tone="error">
            הפרופיל לא נמצא או שעדיין לא פורסם.
          </WorkspaceState>
        </main>
        <Footer />
      </div>
    );
  const item = teacher.data;
  const name = `${item.profile.first_name} ${item.profile.last_name}`.trim();
  const contact = () => {
    if (!profile) {
      const redirect = `/teachers/${slug}?schedule=1`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (profile.role !== "student") {
      toast.error("יש להתחבר מחשבון תלמיד כדי לבקש שיעור");
      return;
    }
    setContacting(true);
  };
  const closeSchedule = () => {
    setContacting(false);
    if (searchParams.has("schedule")) {
      const next = new URLSearchParams(searchParams);
      next.delete("schedule");
      setSearchParams(next, { replace: true });
    }
  };
  return (
    <div className="teacher-public-page" dir="rtl">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <section className="teacher-public-hero">
          <div className="page-shell">
            <TeacherAvatar
              slug={item.slug}
              name={name}
              avatarPath={item.profile.avatar_path}
            />
            <div>
              <p>
                {item.subjects
                  .map((entry) => entry.subject.name_he)
                  .join(" · ")}
              </p>
              <h1>
                {name}
                {item.verification_status === "verified" ? (
                  <BadgeCheck aria-label="מורה מאומת" />
                ) : null}
              </h1>
              <h2>{item.headline}</h2>
              <div>
                <span>
                  <Star />
                  {item.review_count > 0 ? `${Number(item.average_rating).toFixed(1)} (${item.review_count})` : 'עדיין אין ביקורות'}
                </span>
                <span>
                  <Clock3 />
                  {item.years_experience} שנות ניסיון
                </span>
              </div>
            </div>
            <aside>
              <strong>{formatMoney(item.hourly_price, item.currency)}</strong>
              <span>לשעה</span>
              <Button onClick={contact} disabled={availability.isPending || availability.isError}>
                <CalendarDays />
                בקשת שיעור
              </Button>
            </aside>
          </div>
        </section>
        <div className="page-shell teacher-public-content">
          <article>
            <h2>קצת עליי</h2>
            <p>{item.bio}</p>
            <h2>מקצועות ורמות</h2>
            <div className="teacher-public-tags">
              {item.subjects.map((entry) => (
                <span key={entry.subject_id}>{entry.subject.name_he}</span>
              ))}
              {item.levels.map((entry) => (
                <span key={entry.level_id}>{entry.level.name_he}</span>
              ))}
            </div>
            <h2>אופן הלימוד</h2>
            <div className="teacher-public-modes">
              {item.teaches_online ? (
                <span>
                  <Laptop />
                  אונליין
                </span>
              ) : null}
              {item.teaches_in_person ? (
                <span>
                  <MapPin />
                  {item.service_areas
                    .map((entry) => entry.city.name_he)
                    .join(", ")}
                </span>
              ) : null}
            </div>
          </article>
          <aside>
            <h2>
              <CalendarDays />
              זמינות שבועית
            </h2>
            {availability.isPending ? <p role="status">טוען זמינות...</p> : availability.isError ? <div role="alert"><p>לא הצלחנו לטעון זמינות. יש לטעון אותה לפני שליחת בקשה.</p><Button variant="outline" onClick={() => void availability.refetch()}>ניסיון נוסף</Button></div> : availability.data?.slots.length ? (
              availability.data.slots.map((slot) => (
                <div className="public-slot" key={slot.id}>
                  <strong>{days[slot.day_of_week]}</strong>
                  <span>
                    {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                  </span>
                </div>
              ))
            ) : (
              <p>הזמינות תתואם מול המורה.</p>
            )}
          </aside>
        </div>
        <section className="page-shell public-reviews">
          <h2>ביקורות תלמידים</h2>
          <p className="text-sm text-muted-foreground mb-4">ביקורות מתלמידים שפנייתם למורה התקבלה. קבלת פנייה אינה אישור שהתקיים שיעור.</p>
          {reviews.isPending ? <p role="status">טוען ביקורות...</p> : reviews.isError ? <div role="alert"><p>לא הצלחנו לטעון את הביקורות.</p><Button variant="outline" onClick={() => void reviews.refetch()}>ניסיון נוסף</Button></div> : reviews.data?.items.length ? (
            reviews.data.items.map((review) => (
              <article key={review.id}>
                <div role="img" aria-label={`${review.rating} מתוך 5`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      aria-hidden="true"
                      className={index < review.rating ? "is-filled" : ""}
                    />
                  ))}
                </div>
                <p className="whitespace-pre-wrap break-words">{review.body || "דירוג ללא טקסט"}</p>
                <time dateTime={review.created_at}>
                  {new Intl.DateTimeFormat("he-IL", {
                    dateStyle: "medium",
                  }).format(new Date(review.created_at))}
                </time>
                {review.teacher_reply ? <blockquote className="review-teacher-reply"><strong>תגובת המורה</strong><p>{review.teacher_reply}</p>{review.teacher_reply_at ? <time dateTime={review.teacher_reply_at}>{new Date(review.teacher_reply_at).toLocaleDateString('he-IL')}</time> : null}</blockquote> : null}
              </article>
            ))
          ) : (
            <p>עדיין אין ביקורות על המורה.</p>
          )}
          {reviewsPage > 1 || reviews.data?.hasMore ? <nav className="review-actions" aria-label="עמודי ביקורות"><Button variant="outline" disabled={reviewsPage === 1 || reviews.isFetching} onClick={() => setReviewsPage(reviewsPage - 1)}>הקודם</Button><span>עמוד {reviewsPage}</span><Button variant="outline" disabled={!reviews.data?.hasMore || reviews.isFetching} onClick={() => setReviewsPage(reviewsPage + 1)}>הבא</Button></nav> : null}
        </section>
      </main>
      <Footer />
      {scheduleOpen && availability.isSuccess ? (
        <LessonRequestDialog
          teacher={item}
          onClose={closeSchedule}
        />
      ) : null}
    </div>
  );
}

function LessonRequestDialog({
  teacher,
  onClose,
}: {
  teacher: PublicTeacherDto;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const [requestParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const calendar = useTeacherCalendar(teacher.slug, duration);
  const date = chosenDate ?? calendar.data?.days.find((day) => day.times.length > 0)?.date ?? '';
  const times = calendar.data?.days.find((day) => day.date === date)?.times ?? [];
  const [time, setTime] = useState('');
  const selectedSlot = times.find((slot) => slot.time === time) ?? times[0];
  const selectedTime = selectedSlot?.time ?? '';
  const [lessonMode, setLessonMode] = useState<"online" | "in_person">(
    teacher.teaches_online ? "online" : "in_person",
  );
  const [message, setMessage] = useState(
    "שלום, קראתי את הפרופיל שלך ואשמח לבדוק אפשרות לשיעור.",
  );
  const mutation = useMutation({
    mutationFn: async () => {
      if (!consent || !profile?.contact_email) throw new Error('Verified contact details and consent are required');
      if (!date || !selectedSlot || calendar.isFetching || Date.parse(selectedSlot.startAt) <= calendar.dataUpdatedAt) throw new Error('Invalid requested date or availability');
      await apiRequest(endpoints.currentUser, { method: 'PATCH', body: { firstName, lastName, phone } });
      return apiRequest(endpoints.inquiries, {
        method: "POST",
        body: {
          teacherId: teacher.id,
          contactSharingConsent: consent,
          ...(requestParams.get('requestId') ? { requestId: requestParams.get('requestId') } : {}),
          message,
          requestedStartAt: selectedSlot.startAt,
          requestedEndAt: selectedSlot.endAt,
          lessonMode,
        },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['account', 'inquiries'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success("בקשת השיעור נשלחה למורה");
      setSent(true);
    },
    onError: () =>
      toast.error("לא הצלחנו לשלוח את הבקשה. בדקו את המועד או נסו שוב."),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending || sent) return;
    mutation.mutate();
  }
  if (sent) return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent dir="rtl" className="sm:max-w-xl"><DialogTitle>הבקשה נשלחה ל{teacher.profile.first_name}</DialogTitle><DialogDescription>ממתינים למענה מהמורה. ההחלטה תופיע בפניות שלך. הודעת האימייל נוספה לתור השליחה. פרטי הקשר ייחשפו רק לאחר קבלת הבקשה.</DialogDescription><p>{formatIsraeliDate(date)} · {selectedTime} · {duration} דקות · שעון ישראל</p><Button asChild><Link to="/student/inquiries">מעקב אחרי הפנייה</Link></Button><Button variant="outline" onClick={onClose}>חזרה לפרופיל המורה</Button></DialogContent></Dialog>;
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }}><DialogContent dir="rtl" className="sm:max-w-xl max-h-[90dvh] overflow-y-auto" showCloseButton={false}>
      <form className="lesson-request-form" onSubmit={submit}>
        <button
          className="workspace-dialog__close"
          type="button"
          aria-label="סגירה"
          disabled={mutation.isPending}
          onClick={onClose}
        >
          ×
        </button>
        <div className="lesson-request-form__heading">
          <CalendarDays />
          <div>
            <DialogTitle>בקשת שיעור עם {teacher.profile.first_name}</DialogTitle>
            <DialogDescription>מועד מועדף לפי שעון ישראל. המורה יאשר או ידחה את הבקשה.</DialogDescription>
          </div>
        </div>
        <div className="lesson-request-form__grid">
          <label><span>שם פרטי</span><Input required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
          <label><span>שם משפחה</span><Input required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
          <label><span>טלפון</span><Input required type="tel" dir="ltr" minLength={7} maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label><span>אימייל מאומת</span><Input disabled dir="ltr" value={profile?.contact_email ?? ''} /></label>
        </div>
        {calendar.isPending ? <p role="status">טוען את לוח המורה...</p> : calendar.isError ? <div role="alert"><p>לא ניתן לטעון את לוח המורה. לא תישלח בקשה ללא בדיקת זמינות.</p><Button type="button" variant="outline" onClick={() => void calendar.refetch()}>ניסיון נוסף</Button></div> : <div className="lesson-calendar-summary"><p><CalendarDays aria-hidden="true" />{calendar.data?.usesDefault ? 'ברירת מחדל 09:00–21:00' : 'לפי הזמינות שהמורה הגדיר/ה'} · שעון ישראל</p><p>מועדי שבת מחושבים לפי {calendar.data?.locationName}. {calendar.data?.locationFallback ? 'לא נמצאו קואורדינטות לעיר; נעשה שימוש בירושלים עד להשלמת הפרטים.' : ''}</p>{!times.length ? <p role="status">אין חלון פנוי באורך שנבחר ביום הזה. בחרו תאריך אחר או משך קצר יותר.</p> : null}</div>}
        {mutation.isError ? <p role="alert">הבקשה לא נשלחה. בדקו שהמועד עתידי ושפרטי הקשר מלאים. אם החיבור נקטע, בדקו בפניות שלי לפני שליחה חוזרת.</p> : null}
        <div className="lesson-request-form__grid">
          {calendar.data ? <LessonDateInput value={date} onChange={setChosenDate} min={today()} isAvailable={(candidate) => Boolean(calendar.data?.days.some((day) => day.date === candidate && day.times.length > 0))} /> : <div><span>תאריך</span><p>ממתינים ללוח המורה.</p></div>}
          <label>
            <span>שעה</span>
            <select dir="ltr" value={selectedTime} disabled={!times.length || calendar.isFetching} onChange={(event) => setTime(event.target.value)} required><option value="" disabled>אין שעה זמינה</option>{times.map((option) => <option value={option.time} key={option.startAt}>{option.time}</option>)}</select>
          </label>
          <label>
            <span>משך</span>
            <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
              <option value={60}>60 דקות</option>
              <option value={90}>90 דקות</option>
              <option value={120}>120 דקות</option>
            </select>
          </label>
          <label>
            <span>אופן השיעור</span>
            <select value={lessonMode} onChange={(event) => setLessonMode(event.target.value as typeof lessonMode)}>
              {teacher.teaches_online ? <option value="online">אונליין</option> : null}
              {teacher.teaches_in_person ? <option value="in_person">פרונטלי</option> : null}
            </select>
          </label>
        </div>
        <label>
          <span>הודעה למורה</span>
        <Textarea
          required
          minLength={3}
          maxLength={3000}
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        </label>
        <label className="lesson-request-form__privacy"><input required type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> אני מסכים/ה לשיתוף האימייל והטלפון עם המורה לאחר קבלת הבקשה.</label>
        <Button type="submit" disabled={mutation.isPending || calendar.isFetching || calendar.isError || !date || date < today() || !selectedSlot || !consent || !profile?.contact_email}>
          <CalendarDays />
          {mutation.isPending ? "שולח בקשה..." : "שליחת בקשת שיעור"}
        </Button>
      </form>
    </DialogContent></Dialog>
  );
}

const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

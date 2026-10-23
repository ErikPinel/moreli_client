import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatIsraeliDate, today } from "@/lib/lesson-time";
import { LessonDateInput } from '@/features/account/LessonDateInput';
import { useTeacherCalendar } from '@/features/account/useEngagementData';
import { canLearn } from '@/features/account/account-view';
import { accountKeys, useMyReviews, useTeacherProfile } from '@/features/account/useAccountData';
import { ReviewEditor } from '@/features/account/ReviewEditor';
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Laptop,
  MapPin,
  PencilLine,
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
  const hasCity = Boolean(search.values.city);
  const showPrimary = !hasCity || search.values.inPerson;
  const teachers = useTeachers(
    hasCity ? { ...search.apiFilters, onlineOk: false, inPersonOk: true } : search.apiFilters,
    search.isReady && showPrimary,
  );
  const showOnline = hasCity && search.values.online;
  const onlineTeachers = useTeachers(
    { ...search.apiFilters, citySlug: undefined, onlineOk: true, inPersonOk: false, page: search.values.onlinePage },
    search.isReady && showOnline,
  );
  const total = teachers.data?.meta?.total ?? teachers.data?.items.length ?? 0;
  const activeFilters = buildActiveFilters(search);
  const heading = search.subject
    ? `מורים פרטיים ל${search.subject.name_he}${search.city && search.values.inPerson ? ` ב${search.city.name_he}` : !search.values.inPerson && search.values.online ? " אונליין" : ""}`
    : search.city && search.values.inPerson
      ? `מורים פרטיים ב${search.city.name_he}`
      : !search.values.inPerson && search.values.online ? "מורים פרטיים אונליין" : "מורים פרטיים שמתאימים לכם";

  return (
    <div className="directory-page" dir="rtl">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <div className="directory-context">
          <div className="page-shell">
            <p>דף הבית / מציאת מורה</p>
            <h1>{heading}</h1>
            {hasCity ? (
              <span>{search.values.inPerson && search.values.online ? "פרונטלי בעיר שנבחרה, ואונליין מכל מקום — בתוצאות נפרדות." : search.values.inPerson ? "שיעורים פרונטליים בעיר שנבחרה." : "שיעורי אונליין מכל מקום, ללא הגבלת עיר."}</span>
            ) : teachers.isSuccess ? <span><strong>{total}</strong> מורים מתאימים</span> : <span role="status">{teachers.isError ? 'ספירת המורים אינה זמינה כרגע' : 'טוען את תוצאות החיפוש...'}</span>}
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
              cities={search.cities}
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
                cities={search.cities}
                onChange={(patch) => search.update(patch)}
              />
            </aside>
            <section className="search-results" aria-live="polite">
              <div className="search-results__toolbar">
                <span>{hasCity ? "תוצאות החיפוש" : teachers.isFetching ? "מעדכן תוצאות..." : `${total} מורים נמצאו`}</span>
                <SortSelect
                  value={search.values.sort}
                  onChange={(sort) => search.update({ sort })}
                />
              </div>
              {showPrimary ? (
                <section className="search-result-group" aria-label={hasCity ? "מורים פרונטליים" : "מורים מתאימים"}>
                  {hasCity ? <header className="search-result-group__heading"><h2>שיעורים פרונטליים ב{search.city?.name_he ?? "עיר שנבחרה"}</h2><p>רק מורים שמציעים שיעורים פרונטליים בעיר זו.</p></header> : null}
                  <DirectoryResults query={teachers} isReady={search.isReady} page={search.values.page} onPage={(page) => search.update({ page }, false)} onClear={search.clear} showCount={hasCity} lessonMode={hasCity ? 'inPerson' : undefined} citySlug={search.values.city} />
                </section>
              ) : null}
              {showOnline ? (
                <section className="search-result-group" aria-label="מורים אונליין">
                  <header className="search-result-group__heading"><h2>שיעורי אונליין — מכל מקום</h2><p>אותו תחום לימוד ואותו סינון, ללא הגבלת עיר.</p></header>
                  <DirectoryResults query={onlineTeachers} isReady={search.isReady} page={search.values.onlinePage} onPage={(onlinePage) => search.update({ onlinePage }, false)} onClear={search.clear} showCount lessonMode="online" />
                </section>
              ) : null}
              {!search.values.online && !search.values.inPerson ? <p role="alert">בחרו לפחות סוג שיעור אחד כדי לחפש מורים.</p> : null}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function DirectoryResults({ query, isReady, page, onPage, onClear, showCount, lessonMode, citySlug }: {
  query: ReturnType<typeof useTeachers>;
  isReady: boolean;
  page: number;
  onPage: (page: number) => void;
  onClear: () => void;
  showCount: boolean;
  lessonMode?: 'online' | 'inPerson';
  citySlug?: string;
}) {
  if (query.isPending || !isReady) {
    return <div className="teacher-result-list" role="status" aria-label="טוען מורים">{[1, 2, 3].map((item) => <TeacherResultCardSkeleton key={item} />)}</div>;
  }
  if (query.isError) {
    return <WorkspaceState tone="error"><h2>לא הצלחנו לטעון את המורים</h2><p>בדקו את החיבור ונסו שוב.</p><button onClick={() => void query.refetch()}>נסו שוב</button></WorkspaceState>;
  }
  return <>
    {showCount ? <p className="search-result-group__count">{query.data.meta.total} מורים נמצאו</p> : null}
    {query.data.items.length === 0 ? <SearchEmptyState onClear={onClear} lessonMode={lessonMode} /> : <div className="teacher-result-list">{query.data.items.map((teacher, index) => <div key={teacher.id}><TeacherResultCard teacher={teacher} lessonMode={lessonMode} citySlug={citySlug} />{index === 2 ? <SmartMatchPrompt /> : null}</div>)}</div>}
    <SearchPagination page={page} pageCount={query.data.meta.pageCount} onPage={onPage} />
  </>;
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

function SearchEmptyState({ onClear, lessonMode }: { onClear: () => void; lessonMode?: 'online' | 'inPerson' }) {
  return (
    <div className="search-empty">
      <Search />
      <h2>{lessonMode === 'inPerson' ? "לא מצאנו כרגע מורים פרונטליים שמתאימים לחיפוש בעיר הזו" : lessonMode === 'online' ? "לא מצאנו כרגע מורי אונליין שמתאימים לחיפוש הזה" : "לא מצאנו מורים שמתאימים בדיוק לחיפוש הזה"}</h2>
      <p>
        {lessonMode === 'inPerson' ? "נסו עיר אחרת, מקצוע קרוב או טווח מחיר רחב יותר." : lessonMode === 'online' ? "נסו מקצוע קרוב או טווח מחיר רחב יותר." : "נסו להרחיב את אזור החיפוש, לבחור גם שיעורים אונליין או להגדיל מעט את טווח המחיר."}
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
  const [ratingOpen, setRatingOpen] = useState(false);
  const queryClient = useQueryClient();
  const myReviews = useMyReviews(canLearn(profile?.role));
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
  const ownTeacher = useTeacherProfile(profile?.role === "teacher");
  const isOwnProfile = Boolean(slug) && ownTeacher.data?.slug === slug;
  const existingReview = myReviews.data?.find(review => review.teacher_id === teacher.data?.id);
  const showRating = (ratingOpen || searchParams.get('review') === '1') && canLearn(profile?.role) && !isOwnProfile && myReviews.isSuccess && (profile?.role !== 'teacher' || ownTeacher.isSuccess);
  const closeRating = () => {
    setRatingOpen(false);
    setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('review'); return next; }, { replace: true });
  };
  const scheduleOpen =
    contacting ||
    (searchParams.get("schedule") === "1" && canLearn(profile?.role) && !isOwnProfile);
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
    if (isOwnProfile) {
      navigate("/teacher/onboarding");
      return;
    }
    if (!canLearn(profile.role)) {
      toast.error("יש להתחבר מחשבון תלמיד או מורה כדי לבקש שיעור");
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
          <div className="page-shell teacher-public-hero__inner">
            <div className="teacher-public-hero__portrait"><TeacherAvatar
              slug={item.slug}
              name={name}
              avatarPath={item.profile.avatar_path}
            /></div>
            <div className="teacher-public-hero__identity">
              <p className="teacher-public-hero__subjects">
                {item.subjects
                  .map((entry) => entry.subject.name_he)
                  .join(" · ")}
              </p>
              <h1>
                <bdi>{name}</bdi>
                {item.verification_status === "verified" ? (
                  <BadgeCheck aria-label="מורה מאומת" />
                ) : null}
              </h1>
              <p className="teacher-public-hero__headline" dir="auto">{item.headline}</p>
            </div>
              <div className="teacher-public-hero__meta">
                <span>
                  <Star aria-hidden="true" />
                  {item.review_count > 0 ? <><bdi>{Number(item.average_rating).toFixed(1)}</bdi> · {item.review_count} {item.review_count === 1 ? 'ביקורת' : 'ביקורות'}</> : 'עדיין אין ביקורות'}
                </span>
                <span>
                  <Clock3 aria-hidden="true" />
                  {item.years_experience} שנות ניסיון
                </span>
              </div>
            <aside className="teacher-public-booking" aria-label="מחיר ובקשת שיעור">
              <div className="teacher-public-booking__price"><strong><bdi>{formatMoney(item.hourly_price, item.currency)}</bdi></strong><span>לשעה</span></div>
              <Button onClick={contact} disabled={!isOwnProfile && (availability.isPending || availability.isError)}>
                {isOwnProfile ? <PencilLine /> : <CalendarDays />}
                {isOwnProfile ? "עריכת הפרופיל שלי" : "בקשת שיעור"}
              </Button>
            </aside>
          </div>
        </section>
        <div className="page-shell teacher-public-content">
          <article>
            <h2>קצת עליי</h2>
            <p dir="auto">{item.bio}</p>
            <h2>מקצועות הוראה</h2>
            <div className="teacher-public-tags">
              {item.subjects.map((entry) => (
                <span key={entry.subject_id}>{entry.subject.name_he}</span>
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
          <aside className="teacher-public-availability">
            <h2>
              <CalendarDays />
              זמינות שבועית
            </h2>
            <p className="teacher-public-availability__hint">שעון ישראל · מועדים פנויים נבדקים בעת בקשת שיעור.</p>
            {availability.isPending ? <p role="status">טוען זמינות...</p> : availability.isError ? <div role="alert"><p>לא הצלחנו לטעון זמינות. יש לטעון אותה לפני שליחת בקשה.</p><Button variant="outline" onClick={() => void availability.refetch()}>ניסיון נוסף</Button></div> : availability.data?.slots.length ? (
              availability.data.slots.map((slot) => (
                <div className="public-slot" key={slot.id}>
                  <strong>{days[slot.day_of_week]}</strong>
                  <bdi dir="ltr">
                    {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                  </bdi>
                </div>
              ))
            ) : (
              <p>לא פורסמו שעות זמינות כרגע.</p>
            )}
          </aside>
        </div>
        <section className="page-shell public-reviews">
          <header className="public-reviews__header"><div>
          <h2>ביקורות תלמידים</h2>
          <p className="text-sm text-muted-foreground mb-4">דירוגים של תלמידים רשומים. אין צורך בהזמנת שיעור באתר, והתגובה אינה חובה.</p>
          </div><div className="public-reviews__actions">
          {!profile ? <Button asChild variant="outline"><Link to={`/login?redirect=${encodeURIComponent(`/teachers/${slug}?review=1`)}`}>התחברות להוספת דירוג</Link></Button> : canLearn(profile.role) && !isOwnProfile ? <>
            <Button variant="outline" disabled={!myReviews.isSuccess || profile.role === 'teacher' && !ownTeacher.isSuccess} onClick={() => setRatingOpen(true)}><Star aria-hidden="true" />{existingReview ? 'עריכת הדירוג שלי' : 'הוספת דירוג'}</Button>
            {myReviews.isError ? <p role="alert">לא ניתן לבדוק את הדירוג שלכם. <button type="button" onClick={() => void myReviews.refetch()}>ניסיון נוסף</button></p> : null}
            {profile.role === 'teacher' && ownTeacher.isError ? <p role="alert">לא ניתן לבדוק את פרופיל ההוראה שלכם. <button type="button" onClick={() => void ownTeacher.refetch()}>ניסיון נוסף</button></p> : null}
          </> : null}
          </div></header>
          {reviews.isPending ? <p role="status">טוען ביקורות...</p> : reviews.isError ? <div role="alert"><p>לא הצלחנו לטעון את הביקורות.</p><Button variant="outline" onClick={() => void reviews.refetch()}>ניסיון נוסף</Button></div> : reviews.data?.items.length ? (
            reviews.data.items.map((review) => (
              <article className="public-review" key={review.id}>
                <div className="public-review__rating" role="img" aria-label={`${review.rating} מתוך 5`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      aria-hidden="true"
                      className={index < review.rating ? "is-filled" : ""}
                    />
                  ))}
                  <span>{review.rating} מתוך 5</span>
                </div>
                <time dateTime={review.created_at}>
                  {new Intl.DateTimeFormat("he-IL", {
                    dateStyle: "medium",
                  }).format(new Date(review.created_at))}
                </time>
                <p className="public-review__body whitespace-pre-wrap break-words" dir="auto">{review.body}</p>
                {review.teacher_reply ? <blockquote className="review-teacher-reply"><strong>תגובת המורה</strong><p>{review.teacher_reply}</p>{review.teacher_reply_at ? <time dateTime={review.teacher_reply_at}>{new Date(review.teacher_reply_at).toLocaleDateString('he-IL')}</time> : null}</blockquote> : null}
                <Link className="text-link public-review__report" to={`/support?category=report&review=${encodeURIComponent(review.id)}`}>דיווח על הביקורת או התגובה</Link>
              </article>
            ))
          ) : (
            <p>עדיין אין ביקורות על המורה.</p>
          )}
          {reviewsPage > 1 || reviews.data?.hasMore ? <nav className="review-actions" aria-label="עמודי ביקורות"><Button variant="outline" disabled={reviewsPage === 1 || reviews.isFetching} onClick={() => setReviewsPage(reviewsPage - 1)}>הקודם</Button><span>עמוד {reviewsPage}</span><Button variant="outline" disabled={!reviews.data?.hasMore || reviews.isFetching} onClick={() => setReviewsPage(reviewsPage + 1)}>הבא</Button></nav> : null}
        </section>
      </main>
      <Footer />
      {showRating ? <ReviewEditor key={existingReview?.id ?? item.id} review={existingReview} teacherId={item.id} name={name} onClose={closeRating} onSaved={() => {
        closeRating();
        setReviewsPage(1);
        void queryClient.invalidateQueries({ queryKey: accountKeys.reviews });
        void queryClient.invalidateQueries({ queryKey: accountKeys.favorites });
        void queryClient.invalidateQueries({ queryKey: ['teachers'] });
      }} /> : null}
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

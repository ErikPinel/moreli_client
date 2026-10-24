import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/auth/RequireAuth'
import { RequireRole } from '@/auth/RequireRole'
import { HomePage } from '@/pages/HomePage'
import { AuthCallbackPage, LoginPage } from '@/pages/LoginPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { StudentFavoritesPage, StudentInquiriesPage, StudentReviewsPage } from '@/pages/StudentAccountPages'
import { StudentRequestsPage } from '@/pages/StudentRequestsPage'
import { TeacherDashboardPage, TeacherInquiriesPage, TeacherSchedulePage, TeacherStudentsPage } from '@/pages/TeacherAccountPages'
import { TeachClaimPage, TeacherOnboardingPage } from '@/pages/TeacherOnboardingPage'
import { TeacherPublicProfilePage, TeachersPage } from '@/pages/TeachersPage'
import { TeacherApprovalPage } from '@/pages/TeacherApprovalPage'
import { AdminOnboardingPage, AdminReviewsPage } from '@/pages/AdminPage'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { AdminOverviewPage } from '@/features/admin/AdminOverviewPage'
import { AdminEmailPage } from '@/features/admin/AdminEmailPage'
import { AdminHistoryPage } from '@/features/admin/AdminHistoryPage'
import { AdminActivityPage, AdminPaymentsPage, AdminSupportPage } from '@/features/account/AdminEngagementPanel'
import { TeacherReviewsPage } from '@/pages/TeacherReviewsPage'
import { TeacherAccessPage } from '@/pages/TeacherAccessPage'
import { TeacherAccessTermsPage } from '@/pages/TeacherAccessTermsPage'
import { PrivacyDraftPage, TermsDraftPage } from '@/pages/LegalDraftPages'
import { TeachIntroPage } from '@/pages/TeachIntroPage'
import { InquiryDetailPage } from '@/pages/InquiryDetailPage'
import { SupportPage } from '@/pages/SupportPage'
import { LessonDetailPage, LessonsPage, StudentDashboardPage, TeacherStudentLessonsPage } from '@/pages/LessonPages'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/teachers" element={<TeachersPage />} />
      <Route path="/teachers/:slug" element={<TeacherPublicProfilePage />} />
      <Route path="/match" element={<Navigate replace to="/student/requests" />} />
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/signup/*" element={<LoginPage mode="signup" />} />
      <Route path="/teacher-access-terms" element={<TeacherAccessTermsPage />} />
      <Route path="/terms" element={<TermsDraftPage />} />
      <Route path="/privacy" element={<PrivacyDraftPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/support/:id" element={<SupportPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/teach" element={<TeachIntroPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/teach/start" element={<TeachClaimPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<RequireRole roles={['student', 'teacher']} />}>
          <Route path="/student" element={<Navigate replace to="/student/dashboard" />} />
          <Route path="/student/dashboard" element={<StudentDashboardPage />} />
          <Route path="/student/lessons" element={<LessonsPage />} />
          <Route path="/student/lessons/:id" element={<LessonDetailPage />} />
          <Route path="/student/profile" element={<ProfilePage kind="student" />} />
          <Route path="/student/requests" element={<StudentRequestsPage />} />
          <Route path="/student/favorites" element={<StudentFavoritesPage />} />
          <Route path="/student/inquiries" element={<StudentInquiriesPage />} />
          <Route path="/student/inquiries/:id" element={<InquiryDetailPage />} />
          <Route path="/student/reviews" element={<StudentReviewsPage />} />
          <Route path="/student/notifications" element={<NotificationsPage />} />
        </Route>

        <Route element={<RequireRole roles={['teacher']} />}>
          <Route path="/teacher" element={<Navigate replace to="/teacher/dashboard" />} />
          <Route path="/teacher/onboarding" element={<TeacherOnboardingPage />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
          <Route path="/teacher/inquiries" element={<TeacherInquiriesPage />} />
          <Route path="/teacher/inquiries/:id" element={<InquiryDetailPage />} />
          <Route path="/teacher/students" element={<TeacherStudentsPage />} />
          <Route path="/teacher/students/:id" element={<TeacherStudentLessonsPage />} />
          <Route path="/teacher/lessons" element={<LessonsPage />} />
          <Route path="/teacher/lessons/:id" element={<LessonDetailPage />} />
          <Route path="/teacher/reviews" element={<TeacherReviewsPage />} />
          <Route path="/teacher/access" element={<TeacherAccessPage />} />
          <Route path="/teacher/schedule" element={<TeacherSchedulePage />} />
          <Route path="/teacher/notifications" element={<NotificationsPage />} />
          <Route path="/teacher/profile" element={<Navigate replace to="/teacher/onboarding" />} />
        </Route>

        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="onboarding" element={<AdminOnboardingPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="emails" element={<AdminEmailPage />} />
            <Route path="history" element={<AdminHistoryPage />} />
            <Route path="support" element={<AdminSupportPage />} />
            <Route path="activity" element={<AdminActivityPage />} />
            <Route path="*" element={<Navigate replace to="/admin" />} />
          </Route>
          <Route path="/teacher-approval" element={<TeacherApprovalPage />} />
        </Route>
      </Route>

      <Route path="*" element={<PlaceholderPage title="העמוד לא נמצא" />} />
    </Routes>
  )
}
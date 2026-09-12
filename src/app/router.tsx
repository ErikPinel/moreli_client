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
import { AdminPage } from '@/pages/AdminPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/teachers" element={<TeachersPage />} />
      <Route path="/teachers/:slug" element={<TeacherPublicProfilePage />} />
      <Route path="/match" element={<Navigate replace to="/student/requests" />} />
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/signup/*" element={<LoginPage mode="signup" />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/teach" element={<TeachClaimPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<RequireRole roles={['student']} />}>
          <Route path="/student" element={<Navigate replace to="/student/profile" />} />
          <Route path="/student/profile" element={<ProfilePage kind="student" />} />
          <Route path="/student/requests" element={<StudentRequestsPage />} />
          <Route path="/student/favorites" element={<StudentFavoritesPage />} />
          <Route path="/student/inquiries" element={<StudentInquiriesPage />} />
          <Route path="/student/reviews" element={<StudentReviewsPage />} />
          <Route path="/student/notifications" element={<NotificationsPage />} />
        </Route>

        <Route element={<RequireRole roles={['teacher']} />}>
          <Route path="/teacher" element={<Navigate replace to="/teacher/dashboard" />} />
          <Route path="/teacher/onboarding" element={<TeacherOnboardingPage />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
          <Route path="/teacher/inquiries" element={<TeacherInquiriesPage />} />
          <Route path="/teacher/students" element={<TeacherStudentsPage />} />
          <Route path="/teacher/schedule" element={<TeacherSchedulePage />} />
          <Route path="/teacher/notifications" element={<NotificationsPage />} />
          <Route path="/teacher/profile" element={<Navigate replace to="/teacher/onboarding" />} />
        </Route>

        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/teacher-approval" element={<TeacherApprovalPage />} />
        </Route>
      </Route>

      <Route path="*" element={<PlaceholderPage title="העמוד לא נמצא" />} />
    </Routes>
  )
}
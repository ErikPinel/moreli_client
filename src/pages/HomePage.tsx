import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { HeroSection } from '@/features/home/components/HeroSection'
import { HowItWorksSection } from '@/features/home/components/HowItWorksSection'
import { RecommendedTeachersSection } from '@/features/home/components/RecommendedTeachersSection'
import { SmartMatchSection } from '@/features/home/components/SmartMatchSection'
import { SubjectsSection } from '@/features/home/components/SubjectsSection'
import { TeacherAcquisitionSection } from '@/features/home/components/TeacherAcquisitionSection'
import { HomeInquiryAlert } from '@/features/account/HomeInquiryAlert'

export function HomePage() {
  return (
    <div dir="rtl">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <HomeInquiryAlert />
        <HeroSection />
        <SubjectsSection />
        <RecommendedTeachersSection />
        <HowItWorksSection />
        <SmartMatchSection />
        <TeacherAcquisitionSection />
      </main>
      <Footer />
    </div>
  )
}
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { HeroSection } from '@/features/home/components/HeroSection'
import { HowItWorksSection } from '@/features/home/components/HowItWorksSection'
import { RecommendedTeachersSection } from '@/features/home/components/RecommendedTeachersSection'
import { SmartMatchSection } from '@/features/home/components/SmartMatchSection'
import { TeacherAcquisitionSection } from '@/features/home/components/TeacherAcquisitionSection'
import { TrustStrip } from '@/features/home/components/TrustStrip'

export function HomePage() {
  return (
    <div dir="rtl">
      <Header />
      <main>
        <HeroSection />
        <TrustStrip />
        <SmartMatchSection />
        <RecommendedTeachersSection />
        <HowItWorksSection />
        <TeacherAcquisitionSection />
      </main>
      <Footer />
    </div>
  )
}
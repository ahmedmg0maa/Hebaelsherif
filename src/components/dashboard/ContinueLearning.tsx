import JourneyCard from './JourneyCard'

export default function ContinueLearning({ href = '/dashboard/courses' }: { href?: string }) {
  return (
    <JourneyCard
      title="استكملي رحلتك بهدوء"
      description="كل محتوى متاح لكِ يظهر هنا حسب مشترياتك أو الوصول اليدوي من الأدمن."
      href={href}
      action="فتح مكتبتي"
    />
  )
}

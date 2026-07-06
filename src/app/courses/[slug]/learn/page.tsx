import { redirect } from 'next/navigation'

export const dynamic = 'force-static'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export default async function CourseLearningRedirect({ params }: RouteContext) {
  const { slug } = await params
  redirect(`/dashboard/courses/${encodeURIComponent(slug)}/learn`)
}

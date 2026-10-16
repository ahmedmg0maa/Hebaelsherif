import type { GuidedAssessmentContent } from './governance'

/** Return every highest-scoring path; a tie is not evidence for the first path. */
export function scoreAssessmentResults(content: GuidedAssessmentContent, answers: Record<string, string>) {
  const scores = new Map(content.results.map((result) => [result.key, 0]))
  for (const question of content.questions) {
    const option = question.options.find((item) => item.key === answers[question.key])
    if (!option || !scores.has(option.resultKey)) return []
    scores.set(option.resultKey, scores.get(option.resultKey)! + option.weight)
  }
  const highest = Math.max(...scores.values())
  return content.results.filter((result) => scores.get(result.key) === highest)
}

/** Compatibility for consumers that only support one result. */
export function scoreAssessment(content: GuidedAssessmentContent, answers: Record<string, string>) {
  return scoreAssessmentResults(content, answers)[0] ?? null
}

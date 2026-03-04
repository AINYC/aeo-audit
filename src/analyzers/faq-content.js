import { clampScore, extractSchemaTypes } from './helpers.js'

export function analyzeFaqContent(context) {
  const findings = []
  const recommendations = []
  let score = 0

  const schemaTypes = extractSchemaTypes(context.structuredData)
  if (schemaTypes.has('FAQPage')) {
    score += 34
    findings.push({ type: 'found', message: 'FAQPage schema detected.' })
  } else {
    findings.push({ type: 'missing', message: 'FAQPage schema not detected.' })
    recommendations.push('Add FAQPage schema for key question-and-answer content.')
  }

  const detailsCount = context.$('details > summary').length
  if (detailsCount >= 3) {
    score += 24
    findings.push({ type: 'found', message: `Detected ${detailsCount} FAQ details blocks.` })
  } else if (detailsCount > 0) {
    score += 14
    findings.push({ type: 'info', message: `Detected ${detailsCount} details-based FAQ block(s).` })
  } else {
    findings.push({ type: 'info', message: 'No details/summary FAQ blocks detected.' })
  }

  let questionHeadingCount = 0
  context.$('h2, h3, h4, summary').each((_, element) => {
    const text = context.$(element).text().trim()
    if (text.endsWith('?')) {
      questionHeadingCount += 1
    }
  })

  if (questionHeadingCount >= 3) {
    score += 24
    findings.push({ type: 'found', message: 'Multiple question-style headings detected.' })
  } else if (questionHeadingCount > 0) {
    score += 12
    findings.push({ type: 'info', message: 'A small number of question headings detected.' })
  } else {
    findings.push({ type: 'missing', message: 'No explicit question headings detected.' })
    recommendations.push('Use question-style headings to match conversational prompts.')
  }

  const qaPairs = Math.min(
    context.$('details').length,
    context.$('details > summary').length,
  )

  if (qaPairs >= 3) {
    score += 18
    findings.push({ type: 'found', message: 'FAQ content includes multiple question-answer pairs.' })
  } else if (qaPairs > 0) {
    score += 10
    findings.push({ type: 'info', message: 'FAQ pairs exist but are limited in count.' })
  } else {
    findings.push({ type: 'info', message: 'Question-answer pairing appears limited.' })
  }

  return {
    score: clampScore(score),
    findings,
    recommendations,
  }
}

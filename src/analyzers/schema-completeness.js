import { clampScore } from './helpers.js'

function findSchemaByType(structuredData, typeName) {
  return structuredData.filter((item) => {
    const rawType = item?.['@type']
    const types = Array.isArray(rawType) ? rawType : [rawType]
    return types.some((type) => typeof type === 'string' && type === typeName)
  })
}

function propertyCompleteness(item, requiredProps) {
  if (!item) {
    return 0
  }

  let present = 0
  for (const prop of requiredProps) {
    const value = item[prop]
    if (value !== undefined && value !== null && value !== '') {
      present += 1
    }
  }

  return present / requiredProps.length
}

const LOCAL_BUSINESS_PROPS = [
  'name', 'address', 'telephone', 'openingHours',
  'priceRange', 'image', 'url', 'geo',
]

const ORGANIZATION_PROPS = [
  'name', 'logo', 'contactPoint', 'sameAs',
  'foundingDate', 'url', 'description',
]

const FAQ_MIN_PAIRS = 3
const HOWTO_MIN_STEPS = 3

export function analyzeSchemaCompleteness(context) {
  const findings = []
  const recommendations = []
  let score = 0

  const structuredData = context.structuredData || []
  if (!structuredData.length) {
    findings.push({ type: 'missing', message: 'No structured data found to evaluate completeness.' })
    recommendations.push('Add JSON-LD structured data with complete property coverage.')
    return { score: clampScore(score), findings, recommendations }
  }

  let checksRun = 0
  let checksScore = 0

  // LocalBusiness completeness
  const localBiz = [
    ...findSchemaByType(structuredData, 'LocalBusiness'),
    ...findSchemaByType(structuredData, 'ProfessionalService'),
  ]

  if (localBiz.length > 0) {
    checksRun += 1
    const best = localBiz.reduce((max, item) => {
      const comp = propertyCompleteness(item, LOCAL_BUSINESS_PROPS)
      return comp > max.score ? { score: comp, item } : max
    }, { score: 0, item: null })

    const pct = best.score
    if (pct >= 0.75) {
      checksScore += 100
      findings.push({ type: 'found', message: `LocalBusiness schema is ${Math.round(pct * 100)}% complete.` })
    } else if (pct >= 0.5) {
      checksScore += 60
      const missing = LOCAL_BUSINESS_PROPS.filter((p) => !best.item?.[p])
      findings.push({ type: 'info', message: `LocalBusiness schema is ${Math.round(pct * 100)}% complete.` })
      recommendations.push(`Add missing LocalBusiness properties: ${missing.join(', ')}.`)
    } else {
      checksScore += 25
      findings.push({ type: 'missing', message: `LocalBusiness schema is only ${Math.round(pct * 100)}% complete.` })
      recommendations.push('Expand LocalBusiness schema with address, telephone, openingHours, geo, etc.')
    }
  }

  // FAQPage completeness
  const faqPages = findSchemaByType(structuredData, 'FAQPage')
  if (faqPages.length > 0) {
    checksRun += 1

    for (const faq of faqPages) {
      const mainEntity = Array.isArray(faq.mainEntity) ? faq.mainEntity : faq.mainEntity ? [faq.mainEntity] : []
      const questions = mainEntity.filter((q) => q?.['@type'] === 'Question')

      if (questions.length >= FAQ_MIN_PAIRS) {
        // Check answer quality
        const substantiveAnswers = questions.filter((q) => {
          const answer = q.acceptedAnswer?.text || ''
          return answer.split(/\s+/).length >= 15
        })

        if (substantiveAnswers.length >= FAQ_MIN_PAIRS) {
          checksScore += 100
          findings.push({ type: 'found', message: `FAQPage has ${questions.length} Q&A pairs with substantive answers.` })
        } else {
          checksScore += 65
          findings.push({ type: 'info', message: `FAQPage has ${questions.length} questions but some answers are thin.` })
          recommendations.push('Expand FAQ answers to at least 15 words each for citation readiness.')
        }
      } else {
        checksScore += 35
        findings.push({ type: 'info', message: `FAQPage has only ${questions.length} Q&A pair(s) (recommend >= ${FAQ_MIN_PAIRS}).` })
        recommendations.push(`Add at least ${FAQ_MIN_PAIRS} question-answer pairs to FAQPage schema.`)
      }
    }
  }

  // HowTo completeness
  const howTos = findSchemaByType(structuredData, 'HowTo')
  if (howTos.length > 0) {
    checksRun += 1

    for (const howTo of howTos) {
      const steps = Array.isArray(howTo.step) ? howTo.step : howTo.step ? [howTo.step] : []
      const stepsWithText = steps.filter((s) => s?.name || s?.text)

      if (stepsWithText.length >= HOWTO_MIN_STEPS) {
        checksScore += 100
        findings.push({ type: 'found', message: `HowTo schema has ${stepsWithText.length} detailed steps.` })
      } else {
        checksScore += 40
        findings.push({ type: 'info', message: `HowTo schema has only ${stepsWithText.length} step(s).` })
        recommendations.push(`Add at least ${HOWTO_MIN_STEPS} steps with descriptive text to HowTo schema.`)
      }
    }
  }

  // Organization completeness
  const orgs = findSchemaByType(structuredData, 'Organization')
  if (orgs.length > 0) {
    checksRun += 1
    const best = orgs.reduce((max, item) => {
      const comp = propertyCompleteness(item, ORGANIZATION_PROPS)
      return comp > max.score ? { score: comp, item } : max
    }, { score: 0, item: null })

    const pct = best.score
    if (pct >= 0.7) {
      checksScore += 100
      findings.push({ type: 'found', message: `Organization schema is ${Math.round(pct * 100)}% complete.` })
    } else if (pct >= 0.4) {
      checksScore += 55
      const missing = ORGANIZATION_PROPS.filter((p) => !best.item?.[p])
      findings.push({ type: 'info', message: `Organization schema is ${Math.round(pct * 100)}% complete.` })
      recommendations.push(`Add missing Organization properties: ${missing.join(', ')}.`)
    } else {
      checksScore += 20
      findings.push({ type: 'missing', message: `Organization schema is only ${Math.round(pct * 100)}% complete.` })
    }
  }

  // If no schema types were checked, score based on generic property depth
  if (checksRun === 0) {
    const avgProps = structuredData.reduce((sum, item) => sum + Object.keys(item).length, 0) / structuredData.length
    if (avgProps >= 8) {
      score = 70
      findings.push({ type: 'info', message: 'Structured data has reasonable depth but uses no recognized high-priority schema types.' })
    } else {
      score = 30
      findings.push({ type: 'info', message: 'Structured data present but shallow and uses no recognized schema types.' })
    }

    recommendations.push('Add LocalBusiness, FAQPage, HowTo, or Organization schema types.')
  } else {
    score = checksScore / checksRun
  }

  return {
    score: clampScore(score),
    findings,
    recommendations,
  }
}

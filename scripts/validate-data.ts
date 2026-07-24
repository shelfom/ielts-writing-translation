import { createHash } from 'node:crypto'
import { essays, groupIntoParagraphs, totalSentenceCount } from '../src/essay'

const fail = (message: string): never => {
  throw new Error(message)
}

const expectedTopics = [
  'Sociology',
  'Education',
  'Government Spending',
  'Technology',
  'Health',
  'Environment',
]
const expectedTypes = [
  'Opinion',
  'Discussion',
  'Advantages vs Disadvantages or Positive vs Negative',
  'Cause and Solution',
  'Multi-part',
]

if (essays.length !== 30) fail(`The course must contain exactly 30 essays, not ${essays.length}.`)
if (totalSentenceCount !== 538) fail(`The course must contain exactly 538 sentences, not ${totalSentenceCount}.`)

const expectedOrder = expectedTopics.flatMap((topic) => expectedTypes.map((type) => `${topic}\u0000${type}`))
const actualOrder = essays.map((essay) => `${essay.topic}\u0000${essay.type}`)
if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder)) {
  fail('Essay topic/type classification order no longer matches the original WPS file.')
}

let paragraphCount = 0
for (const [essayIndex, essay] of essays.entries()) {
  if (essay.number !== essayIndex + 1) fail(`Essay ${essayIndex + 1} has the wrong number.`)
  if (!essay.question.trim()) fail(`Essay ${essay.number} is missing its source question.`)
  if (essay.sentences.length === 0) fail(`Essay ${essay.number} has no sentences.`)

  const grouped = groupIntoParagraphs(essay.sentences)
  const paragraphSizes = grouped.map((paragraph) => paragraph.length)
  if (JSON.stringify(paragraphSizes) !== JSON.stringify(essay.paragraphSizes)) {
    fail(`Essay ${essay.number} paragraph groups changed.`)
  }
  paragraphCount += grouped.length

  for (const [sentenceIndex, sentence] of essay.sentences.entries()) {
    if (sentence.id !== sentenceIndex + 1) fail(`Essay ${essay.number}, sentence ${sentenceIndex + 1} has the wrong id.`)
    if (!sentence.chinese.trim() || !/[\u3400-\u9fff]/u.test(sentence.chinese)) {
      fail(`Essay ${essay.number}, sentence ${sentence.id} is missing a Chinese prompt.`)
    }
    if (!/[。！？]$/u.test(sentence.chinese)) {
      fail(`Essay ${essay.number}, sentence ${sentence.id} is not complete Chinese.`)
    }
    if (!sentence.english.trim() || !/[.!?]$/u.test(sentence.english)) {
      fail(`Essay ${essay.number}, sentence ${sentence.id} is missing a complete English original.`)
    }
  }
}

if (paragraphCount !== 150) fail(`The course must preserve 150 source paragraphs, not ${paragraphCount}.`)

const englishSourcePayload = essays.map((essay) => ({
  topic: essay.topic,
  type: essay.type,
  source: essay.source,
  question: essay.question,
  paragraphSizes: essay.paragraphSizes,
  sentences: essay.sentences.map(({ id, paragraph, english }) => ({ id, paragraph, english })),
}))
const englishSourceHash = createHash('sha256').update(JSON.stringify(englishSourcePayload)).digest('hex')
if (englishSourceHash !== 'eb0b06f5be6096a5a363b4806b30ee73cbde6ebaa896377d3edcc98e4a4ef79f') {
  fail('The ordered English source corpus changed from the original WPS extraction.')
}

if (
  essays.at(-1)?.sentences.at(-1)?.english !==
  'By promoting sustainability and supporting workers, its negative impacts can be minimized.'
) {
  fail('The course does not end at the exact requested final sentence.')
}

console.log(
  'Full course valid: 30 essays, 6 ordered topics, 5 ordered task types each, 150 paragraphs, 538 complete bilingual sentences.',
)

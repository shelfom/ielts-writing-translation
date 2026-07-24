import essayData from './essays.json'

export type PracticeSentence = {
  id: number
  paragraph: number
  chinese: string
  english: string
}

export type PracticeEssay = {
  id: string
  number: number
  topic: string
  type: string
  source: string
  question: string
  paragraphSizes: number[]
  sentences: PracticeSentence[]
}

export const essays = essayData as PracticeEssay[]
export const pilotEssay = essays[0]
export const totalSentenceCount = essays.reduce((sum, essay) => sum + essay.sentences.length, 0)

export const groupIntoParagraphs = (sentences: readonly PracticeSentence[]) => {
  const paragraphs: PracticeSentence[][] = []
  for (const sentence of sentences) {
    const paragraphIndex = sentence.paragraph - 1
    paragraphs[paragraphIndex] ??= []
    paragraphs[paragraphIndex].push(sentence)
  }
  return paragraphs
}

export const paragraphsForEssay = (essay: PracticeEssay) =>
  groupIntoParagraphs(essay.sentences).map((paragraph) =>
    paragraph.map((sentence) => sentence.english).join(' '),
  )

export const originalParagraphs = paragraphsForEssay(pilotEssay)

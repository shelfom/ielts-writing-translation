import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { essays, groupIntoParagraphs, originalParagraphs, totalSentenceCount } from './essay'

const PROGRESS_KEY = 'ielts-writeback-course-v2'

const startEssay = () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /START ESSAY/ }))
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
})

beforeEach(() => {
  window.localStorage.clear()
})

describe('complete source corpus', () => {
  it('contains all 30 essays and 538 sentences in the original classified order', () => {
    const topics = ['Sociology', 'Education', 'Government Spending', 'Technology', 'Health', 'Environment']
    const types = [
      'Opinion',
      'Discussion',
      'Advantages vs Disadvantages or Positive vs Negative',
      'Cause and Solution',
      'Multi-part',
    ]

    expect(essays).toHaveLength(30)
    expect(totalSentenceCount).toBe(538)
    expect(essays.map((essay) => [essay.topic, essay.type])).toEqual(
      topics.flatMap((topic) => types.map((type) => [topic, type])),
    )
    expect(essays.every((essay) => groupIntoParagraphs(essay.sentences).length >= 4)).toBe(true)
    expect(essays.flatMap((essay) => essay.sentences).every((sentence) => /[\u3400-\u9fff]/u.test(sentence.chinese))).toBe(true)
  })

  it('preserves the approved pilot and the exact requested final sentence', () => {
    expect(essays[0].sentences).toHaveLength(17)
    expect(groupIntoParagraphs(essays[0].sentences).map((paragraph) => paragraph.length)).toEqual([3, 4, 4, 3, 3])
    expect(essays[0].sentences[0].english).toBe(
      'The world today faces numerous pressing challenges, such as climate change, pandemics, and economic instability.',
    )
    expect(essays[0].sentences[0].chinese).toBe('当今世界面临许多紧迫的挑战，比如气候变化、流行病和经济不稳定。')
    expect(essays[29].sentences.at(-1)?.english).toBe(
      'By promoting sustainability and supporting workers, its negative impacts can be minimized.',
    )
    expect(essays[29].sentences.at(-1)?.chinese).toBe(
      '通过推行可持续的做法、为工人提供支持，就能把这些负面影响降到最低。',
    )
  })
})

describe('translation practice flow', () => {
  it('introduces the complete course and shows each writing question as context', () => {
    render(<App />)
    expect(screen.getByText('30 ESSAYS · 538 SENTENCES')).toBeTruthy()
    expect(screen.getByText(essays[0].question)).toBeTruthy()
    expect(screen.getByText('ESSAY 01 / 30')).toBeTruthy()
    expect(screen.getByText(essays[0].topic)).toBeTruthy()
    expect(screen.getByText(essays[0].type)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'CONTENTS' })).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('shows all 6 topics, 5 task types, and 30 exact prompts on one Contents page', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'CONTENTS' }))

    expect(screen.getByRole('main', { name: 'Course contents' })).toBeTruthy()
    expect(screen.getByText('6 TOPICS · 5 TYPES · 30 PROMPTS')).toBeTruthy()
    expect(document.querySelectorAll('.topic-group')).toHaveLength(6)
    expect(document.querySelectorAll('.prompt-entry')).toHaveLength(30)

    for (const topic of ['Sociology', 'Education', 'Government Spending', 'Technology', 'Health', 'Environment']) {
      expect(screen.getByRole('heading', { name: topic })).toBeTruthy()
    }
    for (const type of ['OPINION', 'DISCUSSION', 'ADV / DISADV', 'CAUSE / SOLUTION', 'MULTI-PART']) {
      expect(screen.getAllByText(type)).toHaveLength(6)
    }
    for (const essay of essays) expect(screen.getByText(essay.question)).toBeTruthy()
  })

  it('opens any chosen prompt without erasing course progress', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'CONTENTS' }))
    const finalPrompt = screen.getByText(essays[29].question)
    fireEvent.click(finalPrompt.closest('button') as HTMLButtonElement)

    expect(screen.getByText('ESSAY 30 / 30')).toBeTruthy()
    expect(screen.getByText(essays[29].question)).toBeTruthy()
    expect(screen.queryByRole('main', { name: 'Course contents' })).toBeNull()
  })

  it('requires a real attempt before Enter reveals the exact original', () => {
    startEssay()
    const editor = screen.getByRole('textbox', { name: 'YOUR TRANSLATION' })
    expect(editor.tagName).toBe('INPUT')
    expect(editor.getAttribute('type')).toBe('text')

    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(screen.getByText('Write your translation first.')).toBeTruthy()
    expect(screen.queryByText(essays[0].sentences[0].english)).toBeNull()

    fireEvent.change(editor, { target: { value: 'My first full translation.' } })
    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(screen.getByText(essays[0].sentences[0].english)).toBeTruthy()
    expect(screen.getByRole('button', { name: /NEXT SENTENCE/ })).toBeTruthy()
  })

  it('keeps Contents available during practice and makes first-sentence Back return to the course map', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'CONTENTS' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /START ESSAY/ }))
    expect(screen.getByRole('button', { name: 'CONTENTS' })).toBeTruthy()
    const back = screen.getByRole('button', { name: 'Back to contents' })
    expect(back.hasAttribute('disabled')).toBe(false)
    fireEvent.click(back)
    expect(screen.getByRole('main', { name: 'Course contents' })).toBeTruthy()

    fireEvent.click(screen.getByText(essays[0].question).closest('button') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: /START ESSAY/ }))
    fireEvent.click(screen.getByRole('button', { name: 'CONTENTS' }))
    expect(screen.getByRole('main', { name: 'Course contents' })).toBeTruthy()
  })

  it('keeps the learning sequence strictly top down with English-only guidance', () => {
    startEssay()
    const workspace = screen.getByRole('region', { name: 'Translation practice' })
    expect(Array.from(workspace.children).map((element) => element.className)).toEqual([
      'prompt-block',
      'writing-block',
      'answer-block answer-block--waiting',
    ])
    expect(screen.getByText('CHINESE')).toBeTruthy()
    expect(screen.getByText('YOUR TRANSLATION')).toBeTruthy()
    expect(screen.getByText('ORIGINAL')).toBeTruthy()
    expect(screen.getByText('ENTER TO REVEAL')).toBeTruthy()
  })

  it('does not advance on Enter after reveal and advances only on a fresh Next click', () => {
    startEssay()
    const editor = screen.getByRole('textbox', { name: 'YOUR TRANSLATION' })
    fireEvent.change(editor, { target: { value: 'My attempt.' } })
    fireEvent.keyDown(editor, { key: 'Enter' })
    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(screen.getByLabelText('Essay 1 of 30, sentence 1 of 17')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /NEXT SENTENCE/ }))
    expect(screen.getByLabelText('Essay 1 of 30, sentence 2 of 17')).toBeTruthy()
    expect(screen.getByText(essays[0].sentences[1].chinese)).toBeTruthy()
  })

  it('handles the line-break event used by iPhone keyboards', () => {
    startEssay()
    const editor = screen.getByRole('textbox', { name: 'YOUR TRANSLATION' })
    expect(editor.getAttribute('enterkeyhint')).toBe('done')
    fireEvent.change(editor, { target: { value: 'Phone translation.' } })
    fireEvent.input(editor, { inputType: 'insertParagraph' })
    expect(screen.getByText(essays[0].sentences[0].english)).toBeTruthy()
  })

  it('keeps attempts when moving back and after a reload', () => {
    startEssay()
    let editor = screen.getByRole('textbox', { name: 'YOUR TRANSLATION' })
    fireEvent.change(editor, { target: { value: 'Saved first attempt.' } })
    fireEvent.keyDown(editor, { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: /NEXT SENTENCE/ }))

    editor = screen.getByRole('textbox', { name: 'YOUR TRANSLATION' })
    fireEvent.change(editor, { target: { value: 'Unfinished second attempt.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Previous sentence' }))
    expect((screen.getByRole('textbox', { name: 'YOUR TRANSLATION' }) as HTMLInputElement).value).toBe('Saved first attempt.')

    cleanup()
    render(<App />)
    expect((screen.getByRole('textbox', { name: 'YOUR TRANSLATION' }) as HTMLInputElement).value).toBe('Saved first attempt.')
  })

  it('finishes an essay, then introduces the next classified essay in source order', () => {
    startEssay()
    for (let index = 0; index < essays[0].sentences.length; index += 1) {
      const editor = screen.getByRole('textbox', { name: 'YOUR TRANSLATION' })
      fireEvent.change(editor, { target: { value: `Learner sentence ${index + 1}.` } })
      fireEvent.keyDown(editor, { key: 'Enter' })
      fireEvent.click(
        screen.getByRole('button', {
          name: index === essays[0].sentences.length - 1 ? /VIEW FULL ESSAY/ : /NEXT SENTENCE/,
        }),
      )
    }

    expect(screen.getByText('Essay 01 complete.')).toBeTruthy()
    expect(screen.getByText(/Learner sentence 1\. Learner sentence 2\. Learner sentence 3\./)).toBeTruthy()
    expect(screen.getByText(originalParagraphs[0])).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'CONTENTS' }))
    expect(screen.getByRole('main', { name: 'Course contents' })).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: /BACK TO COURSE/ })[0])
    expect(screen.getByText('Essay 01 complete.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /NEXT ESSAY/ }))
    expect(screen.getByText('ESSAY 02 / 30')).toBeTruthy()
    expect(screen.getByText(essays[1].question)).toBeTruthy()
    expect(screen.getByText(essays[1].topic)).toBeTruthy()
    expect(screen.getByText(essays[1].type)).toBeTruthy()
  })

  it('marks the course complete at the exact final source sentence', () => {
    const attempts = essays.map((essay) => essay.sentences.map((sentence) => sentence.english))
    const revealed = essays.map((essay) => essay.sentences.map(() => true))
    attempts[29][15] = ''
    revealed[29][15] = false
    window.localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        version: 2,
        phase: 'practice',
        essayIndex: 29,
        sentenceIndex: 15,
        attempts,
        revealed,
      }),
    )

    render(<App />)
    expect(screen.getByText(essays[29].sentences[15].chinese)).toBeTruthy()
    const editor = screen.getByRole('textbox', { name: 'YOUR TRANSLATION' })
    fireEvent.change(editor, { target: { value: essays[29].sentences[15].english } })
    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(screen.getByText(essays[29].sentences[15].english)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /VIEW FULL ESSAY/ }))

    expect(screen.getByText('You wrote all 30 essays.')).toBeTruthy()
    expect(screen.getByText('You typed every original model essay in full.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /NEXT ESSAY/ })).toBeNull()
  })

  it('switches persistent themes without changing the sentence', () => {
    startEssay()
    expect(document.documentElement.dataset.theme).toBe('dark')
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem('ielts-writing-translation-theme')).toBe('light')
    expect(screen.getByText(essays[0].sentences[0].chinese)).toBeTruthy()
  })

  it('shows the permanent Chinese contact identity and callable number', () => {
    render(<App />)
    expect(screen.getByText('海归湾雅思精准学习中心')).toBeTruthy()
    expect(screen.queryByText('TURTLE BAY IELTS')).toBeNull()
    expect(screen.getByRole('link', { name: '400-061-6820' }).getAttribute('href')).toBe('tel:4000616820')
    expect(screen.getByRole('contentinfo').textContent?.replace(/\s/g, '')).toBe(
      '海归湾雅思精准学习中心·400-061-6820',
    )
  })
})

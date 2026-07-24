import { useEffect, useMemo, useRef, useState } from 'react'
import {
  essays,
  groupIntoParagraphs,
  paragraphsForEssay,
  totalSentenceCount,
  type PracticeEssay,
} from './essay'

type Theme = 'dark' | 'light'
type Phase = 'intro' | 'practice' | 'checkpoint'
type View = 'course' | 'contents'

type Progress = {
  version: 2
  phase: Phase
  essayIndex: number
  sentenceIndex: number
  attempts: string[][]
  revealed: boolean[][]
}

const PROGRESS_KEY = 'ielts-writeback-course-v2'
const THEME_KEY = 'ielts-writing-translation-theme'

const blankAttempts = () => essays.map((essay) => Array(essay.sentences.length).fill(''))
const blankRevealed = () => essays.map((essay) => Array(essay.sentences.length).fill(false))

const freshProgress = (): Progress => ({
  version: 2,
  phase: 'intro',
  essayIndex: 0,
  sentenceIndex: 0,
  attempts: blankAttempts(),
  revealed: blankRevealed(),
})

const hasValidRows = (rows: unknown[], kind: 'attempts' | 'revealed') =>
  rows.length === essays.length &&
  rows.every(
    (row, index) =>
      Array.isArray(row) &&
      row.length === essays[index].sentences.length &&
      row.every((value) => (kind === 'attempts' ? typeof value === 'string' : typeof value === 'boolean')),
  )

const loadProgress = (): Progress => {
  try {
    const stored = window.localStorage.getItem(PROGRESS_KEY)
    if (!stored) return freshProgress()
    const parsed = JSON.parse(stored) as Partial<Progress>
    if (
      parsed.version !== 2 ||
      !Array.isArray(parsed.attempts) ||
      !Array.isArray(parsed.revealed) ||
      !hasValidRows(parsed.attempts, 'attempts') ||
      !hasValidRows(parsed.revealed, 'revealed')
    ) {
      return freshProgress()
    }

    const essayIndex = Math.min(Math.max(Number(parsed.essayIndex) || 0, 0), essays.length - 1)
    const sentenceIndex = Math.min(
      Math.max(Number(parsed.sentenceIndex) || 0, 0),
      essays[essayIndex].sentences.length - 1,
    )

    return {
      version: 2,
      phase: parsed.phase === 'practice' || parsed.phase === 'checkpoint' ? parsed.phase : 'intro',
      essayIndex,
      sentenceIndex,
      attempts: parsed.attempts,
      revealed: parsed.revealed,
    }
  } catch {
    return freshProgress()
  }
}

const loadTheme = (): Theme =>
  window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'

const compactType = (type: string) => {
  if (type.startsWith('Advantages')) return 'ADV / DISADV'
  if (type === 'Cause and Solution') return 'CAUSE / SOLUTION'
  return type.toUpperCase()
}

const topicGroups = essays.reduce<PracticeEssay[][]>((groups, essay) => {
  const currentGroup = groups.at(-1)
  if (!currentGroup || currentGroup[0].topic !== essay.topic) groups.push([essay])
  else currentGroup.push(essay)
  return groups
}, [])

function ThemeButton({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      className="theme-button"
      type="button"
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span>
    </button>
  )
}

function ContactFooter() {
  return (
    <footer className="contact-footer" aria-label="海归湾雅思精准学习中心联系方式">
      <span>海归湾雅思精准学习中心</span>
      <span aria-hidden="true">·</span>
      <a href="tel:4000616820">400-061-6820</a>
    </footer>
  )
}

function Intro({
  essay,
  onStart,
}: {
  essay: PracticeEssay
  onStart: () => void
}) {
  return (
    <main className="intro-shell">
      <div className="eyebrow">
        30 ESSAYS · {totalSentenceCount} SENTENCES
      </div>
      <h1>Write it back.</h1>
      <p className="intro-lead">
        Translate each Chinese sentence into English. Press Enter to reveal the exact model sentence.
        Complete all 30 essays to type every original in full.
      </p>

      <div className="essay-brief" aria-label="Essay context">
        <div className="brief-meta">
          <span>ESSAY {String(essay.number).padStart(2, '0')} / 30</span>
          <span>{essay.topic}</span>
          <span>{essay.type}</span>
          {essay.source && <span>{essay.source}</span>}
        </div>
        <p>{essay.question}</p>
        <small>Context only. The question is not part of the translation practice.</small>
      </div>

      <div className="intro-actions">
        <button className="primary-button start-button" type="button" onClick={onStart}>
          START ESSAY <span aria-hidden="true">→</span>
        </button>
      </div>
    </main>
  )
}

function Contents({
  progress,
  onBack,
  onChoose,
}: {
  progress: Progress
  onBack: () => void
  onChoose: (essayIndex: number) => void
}) {
  return (
    <main className="contents-shell" aria-label="Course contents">
      <header className="contents-header">
        <button className="text-button contents-back" type="button" onClick={onBack}>
          ← BACK TO COURSE
        </button>
        <div className="eyebrow">6 TOPICS · 5 TYPES · 30 PROMPTS</div>
        <h1>Contents</h1>
        <p>Every writing prompt in the course, classified in its original order.</p>
      </header>

      <div className="topic-grid">
        {topicGroups.map((group, topicIndex) => (
          <section className="topic-group" key={group[0].topic} aria-labelledby={`topic-${topicIndex + 1}`}>
            <header className="topic-heading">
              <span>{String(topicIndex + 1).padStart(2, '0')}</span>
              <h2 id={`topic-${topicIndex + 1}`}>{group[0].topic}</h2>
              <small>5 PROMPTS</small>
            </header>
            <ol className="contents-prompts">
              {group.map((essay) => {
                const essayIndex = essay.number - 1
                const completed = progress.revealed[essayIndex].every(Boolean)
                const started = progress.attempts[essayIndex].some((attempt) => attempt.trim())
                const current = progress.essayIndex === essayIndex

                return (
                  <li key={essay.id}>
                    <button
                      className={`prompt-entry${current ? ' is-current' : ''}${completed ? ' is-complete' : ''}`}
                      type="button"
                      onClick={() => onChoose(essayIndex)}
                      aria-current={current ? 'step' : undefined}
                    >
                      <span className="prompt-entry-meta">
                        <span>{String(essay.number).padStart(2, '0')}</span>
                        <span>{compactType(essay.type)}</span>
                        {essay.source && <span>{essay.source}</span>}
                        <span className="prompt-status">
                          {completed ? 'COMPLETE' : started ? 'IN PROGRESS' : current ? 'CURRENT' : ''}
                        </span>
                      </span>
                      <span className="prompt-question">{essay.question}</span>
                      <span className="prompt-arrow" aria-hidden="true">→</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>

      <button className="text-button contents-return" type="button" onClick={onBack}>
        ← BACK TO COURSE
      </button>
    </main>
  )
}

function Practice({
  progress,
  setProgress,
  onContents,
}: {
  progress: Progress
  setProgress: (next: Progress) => void
  onContents: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const composingRef = useRef(false)
  const [notice, setNotice] = useState('')
  const essay = essays[progress.essayIndex]
  const sentenceCount = essay.sentences.length
  const current = essay.sentences[progress.sentenceIndex]
  const isRevealed = progress.revealed[progress.essayIndex][progress.sentenceIndex]
  const attempt = progress.attempts[progress.essayIndex][progress.sentenceIndex]
  const promptLength =
    current.chinese.length > 62
      ? 'extra-long'
      : current.chinese.length > 52
        ? 'long'
        : current.chinese.length > 38
          ? 'medium'
          : 'short'
  const answerLength =
    current.english.length > 195
      ? 'extra-long'
      : current.english.length > 155
        ? 'long'
        : current.english.length > 115
          ? 'medium'
          : 'short'

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
    setNotice('')
  }, [progress.essayIndex, progress.sentenceIndex])

  const updateAttempt = (value: string) => {
    const attempts = progress.attempts.map((row, index) =>
      index === progress.essayIndex
        ? row.map((attemptValue, sentenceIndex) =>
            sentenceIndex === progress.sentenceIndex ? value : attemptValue,
          )
        : row,
    )
    setProgress({ ...progress, attempts })
    if (value.trim()) setNotice('')
  }

  const reveal = () => {
    if (isRevealed) return
    if (!attempt.trim()) {
      setNotice('Write your translation first.')
      inputRef.current?.focus()
      return
    }
    const revealed = progress.revealed.map((row, index) =>
      index === progress.essayIndex
        ? row.map((revealedValue, sentenceIndex) =>
            sentenceIndex === progress.sentenceIndex ? true : revealedValue,
          )
        : row,
    )
    setProgress({ ...progress, revealed })
    setNotice('')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing ||
      composingRef.current
    ) return
    event.preventDefault()
    reveal()
  }

  const handleBeforeInput = (event: React.FormEvent<HTMLInputElement>) => {
    const inputType = (event.nativeEvent as InputEvent).inputType
    if (
      !composingRef.current &&
      !isRevealed &&
      (inputType === 'insertParagraph' || inputType === 'insertLineBreak')
    ) {
      event.preventDefault()
      reveal()
    }
  }

  const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
    const inputType = (event.nativeEvent as InputEvent).inputType
    if (
      !composingRef.current &&
      !isRevealed &&
      (inputType === 'insertParagraph' || inputType === 'insertLineBreak')
    ) {
      reveal()
    }
  }

  const goBack = () => {
    if (progress.sentenceIndex === 0) {
      onContents()
      return
    }
    setProgress({ ...progress, sentenceIndex: progress.sentenceIndex - 1 })
  }

  const goNext = () => {
    if (!isRevealed) return
    if (progress.sentenceIndex === sentenceCount - 1) {
      setProgress({ ...progress, phase: 'checkpoint' })
      return
    }
    setProgress({ ...progress, sentenceIndex: progress.sentenceIndex + 1 })
  }

  return (
    <main className="practice-shell">
      <header className="practice-header">
        <span>
          {String(essay.number).padStart(2, '0')}/30 · {essay.topic.toUpperCase()} · {compactType(essay.type)}
        </span>
        <span
          className="counter"
          aria-label={`Essay ${essay.number} of ${essays.length}, sentence ${progress.sentenceIndex + 1} of ${sentenceCount}`}
        >
          {String(progress.sentenceIndex + 1).padStart(2, '0')} / {sentenceCount}
        </span>
      </header>

      <section className="sentence-workspace" aria-label="Translation practice">
        <div className="prompt-block">
          <div className="section-label">CHINESE</div>
          <p className={`chinese-prompt chinese-prompt--${promptLength}`}>{current.chinese}</p>
        </div>

        <div className="writing-block">
          <label className="section-label" htmlFor="translation-input">
            YOUR TRANSLATION
          </label>
          <input
            ref={inputRef}
            type="text"
            id="translation-input"
            value={attempt}
            onChange={(event) => updateAttempt(event.target.value)}
            onKeyDown={handleKeyDown}
            onBeforeInput={handleBeforeInput}
            onInput={handleInput}
            onCompositionStart={() => {
              composingRef.current = true
            }}
            onCompositionEnd={() => {
              composingRef.current = false
            }}
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck
            enterKeyHint="done"
            placeholder="Type the complete English sentence…"
            aria-describedby="keyboard-hint input-notice"
          />
          <div className="input-meta">
            <span id="keyboard-hint">ENTER TO REVEAL</span>
            <span id="input-notice" className="notice" role="status">
              {notice}
            </span>
          </div>
        </div>

        <div
          className={`answer-block ${isRevealed ? 'answer-block--visible' : 'answer-block--waiting'}`}
          aria-live="polite"
        >
          <div className="section-label">ORIGINAL</div>
          {isRevealed ? (
            <p className={`original-sentence original-sentence--${answerLength}`}>{current.english}</p>
          ) : (
            <p className="reveal-note">Your model sentence will appear here.</p>
          )}
        </div>
      </section>

      <nav className="practice-actions" aria-label="Sentence navigation">
        <button
          className="text-button"
          type="button"
          onClick={goBack}
          aria-label={progress.sentenceIndex === 0 ? 'Back to contents' : 'Previous sentence'}
        >
          ← BACK
        </button>
        {isRevealed && (
          <button className="primary-button next-button" type="button" onClick={goNext}>
            {progress.sentenceIndex === sentenceCount - 1 ? 'VIEW FULL ESSAY' : 'NEXT SENTENCE'}{' '}
            <span aria-hidden="true">→</span>
          </button>
        )}
      </nav>
    </main>
  )
}

function Checkpoint({
  progress,
  setProgress,
}: {
  progress: Progress
  setProgress: (next: Progress) => void
}) {
  const essay = essays[progress.essayIndex]
  const isLastEssay = progress.essayIndex === essays.length - 1
  const sentenceParagraphs = useMemo(() => groupIntoParagraphs(essay.sentences), [essay])
  const originalParagraphs = useMemo(() => paragraphsForEssay(essay), [essay])
  const attemptParagraphs = sentenceParagraphs.map((paragraph) =>
    paragraph
      .map((sentence) => progress.attempts[progress.essayIndex][sentence.id - 1].trim())
      .join(' '),
  )

  const restartEssay = () => {
    if (!window.confirm('Restarting will erase this essay on this device. Continue?')) return
    const attempts = progress.attempts.map((row, index) =>
      index === progress.essayIndex ? Array(essay.sentences.length).fill('') : row,
    )
    const revealed = progress.revealed.map((row, index) =>
      index === progress.essayIndex ? Array(essay.sentences.length).fill(false) : row,
    )
    setProgress({ ...progress, phase: 'intro', sentenceIndex: 0, attempts, revealed })
  }

  const nextEssay = () => {
    if (isLastEssay) return
    setProgress({
      ...progress,
      phase: 'intro',
      essayIndex: progress.essayIndex + 1,
      sentenceIndex: 0,
    })
  }

  return (
    <main className="checkpoint-shell">
      <header className="checkpoint-header">
        <div className="eyebrow">
          {isLastEssay ? 'COURSE COMPLETE' : `ESSAY ${String(essay.number).padStart(2, '0')} / 30 COMPLETE`}
        </div>
        <h1>{isLastEssay ? 'You wrote all 30 essays.' : `Essay ${String(essay.number).padStart(2, '0')} complete.`}</h1>
        <p>
          {isLastEssay
            ? 'You typed every original model essay in full.'
            : 'Read your paragraphs first. Then study the complete model essay below.'}
        </p>
      </header>

      <div className="essay-comparison">
        <article className="essay-section learner-essay">
          <div className="essay-section-header">YOUR ESSAY</div>
          {attemptParagraphs.map((paragraph, index) => (
            <p key={`attempt-${index}`}>{paragraph}</p>
          ))}
        </article>

        <article className="essay-section original-essay">
          <div className="essay-section-header">MODEL ESSAY</div>
          {originalParagraphs.map((paragraph, index) => (
            <p key={`original-${index}`}>{paragraph}</p>
          ))}
        </article>
      </div>

      <div className="checkpoint-actions">
        <button
          className="text-button"
          type="button"
          onClick={() => setProgress({ ...progress, phase: 'practice', sentenceIndex: 0 })}
        >
          ← REVIEW SENTENCES
        </button>
        <div className="checkpoint-primary-actions">
          <button className="text-button" type="button" onClick={restartEssay}>
            RESTART ESSAY
          </button>
          {!isLastEssay && (
            <button className="primary-button" type="button" onClick={nextEssay}>
              NEXT ESSAY <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [view, setView] = useState<View>('course')
  const essay = essays[progress.essayIndex]

  useEffect(() => {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  }, [progress])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [view])

  const chooseEssay = (essayIndex: number) => {
    const firstUnfinished = progress.revealed[essayIndex].findIndex((revealed) => !revealed)
    setProgress({
      ...progress,
      phase: 'intro',
      essayIndex,
      sentenceIndex: firstUnfinished === -1 ? 0 : firstUnfinished,
    })
    setView('course')
  }

  return (
    <div className={`app app--${view === 'contents' ? 'contents' : progress.phase}`}>
      <div className="topbar">
        <div className="brand" aria-label="IELTS Write Back">
          <span className="brand-mark">H</span>
          <span>IELTS · WRITE BACK</span>
        </div>
        <div className="topbar-actions">
          <button
            className="text-button topbar-contents"
            type="button"
            onClick={() => setView('contents')}
            aria-current={view === 'contents' ? 'page' : undefined}
          >
            CONTENTS
          </button>
          <ThemeButton theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
        </div>
      </div>

      {view === 'contents' ? (
        <Contents
          progress={progress}
          onBack={() => setView('course')}
          onChoose={chooseEssay}
        />
      ) : progress.phase === 'intro' ? (
        <Intro
          essay={essay}
          onStart={() => setProgress({ ...progress, phase: 'practice' })}
        />
      ) : progress.phase === 'checkpoint' ? (
        <Checkpoint progress={progress} setProgress={setProgress} />
      ) : (
        <Practice progress={progress} setProgress={setProgress} onContents={() => setView('contents')} />
      )}

      <ContactFooter />
    </div>
  )
}

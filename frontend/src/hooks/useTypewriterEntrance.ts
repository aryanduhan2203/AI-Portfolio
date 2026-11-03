import { useState, useEffect, useCallback } from 'react'

const LINE_1 = 'Building Scalable Web Apps &'
const LINE_2 = 'AI-Powered Chatbots.'

type Phase =
  | 'pre'            // before anything starts
  | 'typing-line1'   // typing first line
  | 'typing-line2'   // typing second line
  | 'complete'       // all done

interface TypewriterState {
  line1: string
  line2: string
  showCursor1: boolean
  showCursor2: boolean
  progress: number   // 0-100 for loader bar
  phase: Phase
}

interface TypewriterControls extends TypewriterState {
  headerVisible: boolean
  badgeVisible: boolean
  subtitleVisible: boolean
  actionsVisible: boolean
  chatVisible: boolean
  loaderVisible: boolean
}

/**
 * Encapsulates the full sequential entrance + typewriter animation logic
 * from the original vanilla JS. Returns stable booleans for each section.
 */
export function useTypewriterEntrance(prefersReducedMotion: boolean): TypewriterControls {
  const [state, setState] = useState<TypewriterState>({
    line1: '',
    line2: '',
    showCursor1: true,
    showCursor2: false,
    progress: 0,
    phase: 'pre',
  })

  const [headerVisible, setHeaderVisible] = useState(false)
  const [badgeVisible, setBadgeVisible] = useState(false)
  const [subtitleVisible, setSubtitleVisible] = useState(false)
  const [actionsVisible, setActionsVisible] = useState(false)
  const [chatVisible, setChatVisible] = useState(false)
  const [loaderVisible, setLoaderVisible] = useState(true)

  const totalChars = LINE_1.length + LINE_2.length

  const onTypingComplete = useCallback(() => {
    setState((s) => ({ ...s, progress: 100, phase: 'complete' }))

    // Hide cursor after brief pause
    setTimeout(() => {
      setState((s) => ({ ...s, showCursor1: false, showCursor2: false }))
    }, 350)

    // Fade out loader bar
    setTimeout(() => {
      setLoaderVisible(false)
    }, 400)

    // Staggered reveal of remaining elements
    setTimeout(() => setSubtitleVisible(true), 180)
    setTimeout(() => setActionsVisible(true), 360)
    setTimeout(() => setChatVisible(true), 540)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setState({
        line1: LINE_1,
        line2: LINE_2,
        showCursor1: false,
        showCursor2: false,
        progress: 100,
        phase: 'complete',
      })
      setHeaderVisible(true)
      setBadgeVisible(true)
      setSubtitleVisible(true)
      setActionsVisible(true)
      setChatVisible(true)
      setLoaderVisible(false)
      return
    }

    let timerId: ReturnType<typeof setTimeout>
    let charIdx1 = 0
    let charIdx2 = 0
    let typedTotal = 0

    // Step 1: Header reveal
    const t1 = setTimeout(() => setHeaderVisible(true), 100)
    // Step 2: Badge reveal
    const t2 = setTimeout(() => setBadgeVisible(true), 280)

    // Step 3: Start typing line 1
    const t3 = setTimeout(() => {
      setState((s) => ({ ...s, phase: 'typing-line1' }))

      function typeLine1() {
        if (charIdx1 < LINE_1.length) {
          charIdx1++
          typedTotal++
          const progress = Math.min(100, Math.round((typedTotal / totalChars) * 100))
          setState((s) => ({
            ...s,
            line1: LINE_1.substring(0, charIdx1),
            progress,
          }))
          const delay = 24 + Math.floor(Math.random() * 22)
          timerId = setTimeout(typeLine1, delay)
        } else {
          // Transition to line 2
          setTimeout(() => {
            setState((s) => ({ ...s, showCursor1: false, showCursor2: true, phase: 'typing-line2' }))
            typeLine2()
          }, 120)
        }
      }

      function typeLine2() {
        if (charIdx2 < LINE_2.length) {
          charIdx2++
          typedTotal++
          const progress = Math.min(100, Math.round((typedTotal / totalChars) * 100))
          setState((s) => ({
            ...s,
            line2: LINE_2.substring(0, charIdx2),
            progress,
          }))
          const delay = 28 + Math.floor(Math.random() * 26)
          timerId = setTimeout(typeLine2, delay)
        } else {
          onTypingComplete()
        }
      }

      typeLine1()
    }, 420)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(timerId)
    }
  }, [prefersReducedMotion, totalChars, onTypingComplete])

  return {
    ...state,
    headerVisible,
    badgeVisible,
    subtitleVisible,
    actionsVisible,
    chatVisible,
    loaderVisible,
  }
}

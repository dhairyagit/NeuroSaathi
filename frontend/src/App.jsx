import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import './App.css'
import {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  submitActivityResult,
  getPatientActivities,
  getPatientAnalytics,
  getPatientRecommendation,
  getFamilyMemories,
  addFamilyMemory,
  uploadFamilyMemoryPhoto,
  deleteFamilyMemory,
  getPatientAlerts,
  reviewAlert,
  loginCaregiver,
  registerCaregiver,
  logoutCaregiver
} from './services/api'
import { speakSaathi, stopSpeaking, getVoiceStatus, getVoiceStatusAsync } from './services/voice'
import { saveToOfflineQueue, syncOfflineQueue } from './services/offline'
import { t, SUPPORTED_LANGUAGES, normalizeLanguage } from './services/i18n'

const API_SERVER = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CONTROLLED_RELATIONSHIPS = [
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Father',
  'Mother',
  'Husband',
  'Wife',
  'Grandfather',
  'Grandmother',
  'Grandson',
  'Granddaughter',
  'Uncle',
  'Aunt',
  'Friend',
  'Caregiver',
  'Other'
]

const defaultMemoryItems = [
  { id: 1, label: 'Cup', emoji: '☕' },
  { id: 2, label: 'Umbrella', emoji: '☂️' },
  { id: 3, label: 'Flower', emoji: '🌼' },
  { id: 4, label: 'Book', emoji: '📖' },
  { id: 5, label: 'Fruit', emoji: '🍎' },
]

const matchingSymbols = [
  { id: 1, symbol: '🌼', label: 'Flower' },
  { id: 2, symbol: '📖', label: 'Book' },
  { id: 3, symbol: '☕', label: 'Cup' },
  { id: 4, symbol: '☂️', label: 'Umbrella' },
  { id: 5, symbol: '🍎', label: 'Fruit' },
]

// Normalize relationship helper for exact matching
function normalizeRelationship(rel) {
  if (!rel) return ''
  return rel.trim().toLowerCase()
}

// Fallback analytics for offline mode — always shows graph
const FALLBACK_ANALYTICS = {
  accuracy_trend: [
    { date: '2026-09-08', session: 'S1', accuracy: 78 },
    { date: '2026-09-09', session: 'S2', accuracy: 82 },
    { date: '2026-09-10', session: 'S3', accuracy: 75 },
    { date: '2026-09-11', session: 'S4', accuracy: 80 },
    { date: '2026-09-12', session: 'S5', accuracy: 85 },
    { date: '2026-09-13', session: 'S6', accuracy: 79 },
    { date: '2026-09-14', session: 'S7', accuracy: 88 },
    { date: '2026-09-15', session: 'S8', accuracy: 83 },
    { date: '2026-09-16', session: 'S9', accuracy: 91 },
    { date: '2026-09-17', session: 'S10', accuracy: 87 },
    { date: '2026-09-18', session: 'S11', accuracy: 90 },
    { date: '2026-09-19', session: 'S12', accuracy: 85 },
    { date: '2026-09-20', session: 'S13', accuracy: 52 },
    { date: '2026-09-21', session: 'S14', accuracy: 88 },
    { date: '2026-09-22', session: 'S15', accuracy: 93 },
  ],
  baseline_comparison: { overall_average_accuracy: 0.84, total_sessions: 15, recent_average_accuracy: 0.86 }
}

function App() {
  const [mode, setMode] = useState('patient') // 'patient' | 'caregiver'
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'history' | 'memories' | 'alerts' | 'profile' | 'create-patient'

  // Caregiver Authentication state
  const [caregiverSession, setCaregiverSession] = useState(() => {
    try {
      const stored = localStorage.getItem('neurosaathi_cg_session')
      return stored ? JSON.parse(stored) : { token: 'demo-session', name: 'Priya Sharma', email: 'priya@neurosaathi.in' }
    } catch (e) {
      return { token: 'demo-session', name: 'Priya Sharma', email: 'priya@neurosaathi.in' }
    }
  })
  const [authView, setAuthView] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: 'priya@neurosaathi.in', password: 'password123', mobile: '' })
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState('kamla')
  const [patient, setPatient] = useState(null)

  // Dual Language Architecture:
  // caregiverPreferredLanguage = patient.preferred_language (saved by caregiver)
  // activePatientLanguage = currently used by patient (can be changed by patient)
  const [activePatientLanguage, setActivePatientLanguage] = useState('English')
  const [showLanguageModal, setShowLanguageModal] = useState(false)

  const [screen, setScreen] = useState('welcome') // 'welcome' | 'picture' | 'family' | 'matching' | 'result'

  // Game state
  const [gameStartTime, setGameStartTime] = useState(null)
  const [difficultyIndex, setDifficultyIndex] = useState(0)
  const [selectedPictureItems, setSelectedPictureItems] = useState([])

  // Family game state
  const [familyMemoriesList, setFamilyMemoriesList] = useState([])
  const [currentFamilyMember, setCurrentFamilyMember] = useState(null)
  const [currentCorrectRelationship, setCurrentCorrectRelationship] = useState('')
  const [familyAnswerOptions, setFamilyAnswerOptions] = useState([])
  const [selectedFamilyAnswer, setSelectedFamilyAnswer] = useState(null)
  const [familyFeedback, setFamilyFeedback] = useState(null) // { isCorrect: boolean, message: string }
  const [familyQuestionIndex, setFamilyQuestionIndex] = useState(0)
  // Tracks correct answers across all questions in the current game session
  const [familyCorrectCount, setFamilyCorrectCount] = useState(0)

  // Matching game state
  const [matchingCards, setMatchingCards] = useState([])
  const [turn, setTurn] = useState([])
  const [matchedPairsCount, setMatchedPairsCount] = useState(0)
  const [movesCount, setMovesCount] = useState(0)
  const [matchingFeedback, setMatchingFeedback] = useState('')

  // Result state
  const [gameResult, setGameResult] = useState(null)

  // Caregiver analytics & state
  const [analytics, setAnalytics] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [activitiesHistory, setActivitiesHistory] = useState([])
  const [historyFilter, setHistoryFilter] = useState({ type: 'all', days: null })
  const [alerts, setAlerts] = useState([])

  // Family memory real photo upload form state
  const [uploadFile, setUploadFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [familyPhotoForm, setFamilyPhotoForm] = useState({ name: '', relationship: 'Son', description: '' })
  const [photoUploadError, setPhotoUploadError] = useState('')
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState('')

  // Create Patient Profile form state
  const [newPatientForm, setNewPatientForm] = useState({ name: '', age: 72, preferred_language: 'Hindi', interests: 'family memories, daily routine' })

  // Voice & Offline states
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState('')
  const [voiceStatusInfo, setVoiceStatusInfo] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatusToast, setSyncStatusToast] = useState('')

  // Sync active language when patient changes
  useEffect(() => {
    if (patient && patient.preferred_language) {
      setActivePatientLanguage(patient.preferred_language)
    }
  }, [patient?.id, patient?.preferred_language])

  // Voice Status Checker whenever active language changes (async to wait for voice list to load)
  useEffect(() => {
    getVoiceStatusAsync(activePatientLanguage).then((status) => {
      setVoiceStatusInfo(status.label)
    })
  }, [activePatientLanguage])

  // Network & Sync Listener
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      setSyncStatusToast('Back online — syncing stored activities...')
      const synced = await syncOfflineQueue(submitActivityResult)
      if (synced > 0) {
        setSyncStatusToast(`Activity synced (${synced} session${synced > 1 ? 's' : ''}).`)
        if (selectedPatientId) loadPatientData(selectedPatientId)
      } else {
        setSyncStatusToast('')
      }
      setTimeout(() => setSyncStatusToast(''), 4000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatusToast("Offline — your activity will sync when you're connected.")
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [selectedPatientId])

  // Initial Data Load
  useEffect(() => {
    async function loadInitial() {
      const pList = await getPatients()
      setPatients(pList)
      const current = pList.find(p => p.id === selectedPatientId) || pList[0]
      setPatient(current)
      if (current) {
        setActivePatientLanguage(current.preferred_language || 'English')
        loadPatientData(current.id)
      }
    }
    loadInitial()
  }, [])

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientData(selectedPatientId)
    }
  }, [selectedPatientId, historyFilter])

  async function loadPatientData(pId) {
    const pData = await getPatient(pId)
    if (pData) {
      setPatient(pData)
    }

    const [anData, recData, actsData, memsData, alData] = await Promise.all([
      getPatientAnalytics(pId),
      getPatientRecommendation(pId),
      getPatientActivities(pId, historyFilter.type, historyFilter.days),
      getFamilyMemories(pId),
      getPatientAlerts(pId)
    ])

    setAnalytics(anData)
    setRecommendation(recData)
    setActivitiesHistory(actsData || [])
    setFamilyMemoriesList(memsData || [])
    setAlerts(alData || [])
  }

  // Caregiver Login Handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    try {
      const res = await loginCaregiver(authForm.email, authForm.password)
      if (res && res.status === 'success') {
        const session = { token: res.token, name: res.caregiver.name, email: res.caregiver.email }
        setCaregiverSession(session)
        localStorage.setItem('neurosaathi_cg_session', JSON.stringify(session))
        setAuthSuccess('LoggedIn successfully!')
      }
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your credentials.')
    }
  }

  // Caregiver Register Handler
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    try {
      const res = await registerCaregiver(authForm.name, authForm.email, authForm.password, authForm.mobile)
      if (res && res.status === 'success') {
        const session = { token: res.token, name: res.caregiver.name, email: res.caregiver.email }
        setCaregiverSession(session)
        localStorage.setItem('neurosaathi_cg_session', JSON.stringify(session))
        setAuthSuccess('Account created successfully!')
      }
    } catch (err) {
      setAuthError(err.message || 'Registration failed.')
    }
  }

  // Caregiver Logout Handler
  const handleCaregiverLogout = async () => {
    if (caregiverSession?.token) {
      await logoutCaregiver(caregiverSession.token).catch(() => { })
    }
    setCaregiverSession(null)
    localStorage.removeItem('neurosaathi_cg_session')
    setAuthSuccess('')
  }

  // Create Patient Handler
  const handleCreatePatientSubmit = async (e) => {
    e.preventDefault()
    if (!newPatientForm.name) return
    const created = await createPatient({
      name: newPatientForm.name,
      age: Number(newPatientForm.age),
      preferred_language: newPatientForm.preferred_language,
      caregiver_name: caregiverSession?.name || 'Caregiver',
      interests: newPatientForm.interests.split(',').map(s => s.trim()),
      is_demo: false,
      voice_guidance_enabled: true
    })

    if (created && created.id) {
      const pList = await getPatients()
      setPatients(pList)
      setSelectedPatientId(created.id)
      setActivePatientLanguage(created.preferred_language)
      setActiveTab('overview')
      alert(`Patient profile for ${created.name} created successfully!`)
    }
  }

  // Real Family Photo Upload Handler
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUploadFamilyPhotoSubmit = async (e) => {
    e.preventDefault()
    setPhotoUploadError('')
    setPhotoUploadSuccess('')

    if (!uploadFile) {
      setPhotoUploadError('Please select a photo file to upload.')
      return
    }
    if (!familyPhotoForm.name) {
      setPhotoUploadError('Please enter the family member name.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('name', familyPhotoForm.name)
      formData.append('relationship', familyPhotoForm.relationship)
      formData.append('description', familyPhotoForm.description)

      await uploadFamilyMemoryPhoto(patient.id, formData)
      setPhotoUploadSuccess(`Family photo for ${familyPhotoForm.name} uploaded successfully!`)
      setUploadFile(null)
      setPreviewUrl(null)
      setFamilyPhotoForm({ name: '', relationship: 'Son', description: '' })
      loadPatientData(patient.id)
    } catch (err) {
      setPhotoUploadError(err.message || 'Failed to upload photo.')
    }
  }

  // Strict Saathi Voice Trigger: Reads current activePatientLanguage
  const triggerVoiceGuidance = (translatedText, overrideLang = null) => {
    setVoiceNotice('')
    const lang = overrideLang || activePatientLanguage
    const result = speakSaathi(translatedText, lang, () => setIsSpeaking(false))
    if (result.success) {
      setIsSpeaking(true)
    }
  }

  // Patient Change Active Language Handler
  // NOTE: We pass normalizedLang directly to speakSaathi to avoid stale closure —
  // setActivePatientLanguage is async so triggerVoiceGuidance would use the old language
  const handlePatientSelectLanguage = (langCode) => {
    const normalizedLang = normalizeLanguage(langCode)
    setActivePatientLanguage(normalizedLang)
    setShowLanguageModal(false)
    const confirmationText = t('language_changed_confirm', normalizedLang, { language: normalizedLang })
    // Speak in the NEW language immediately by bypassing the stale state
    setIsSpeaking(true)
    speakSaathi(confirmationText, normalizedLang, () => setIsSpeaking(false))
  }

  // Helper to get localized relationship string
  const getLocalizedRelationship = (rel, lang) => {
    const key = `rel_${rel}`
    return t(key, lang) || rel
  }

  // Canonical fallback demo family members — used consistently everywhere
  const DEMO_FAMILY_MEMBERS = [
    { id: 'mem-1', name: 'Anjali', relationship: 'Daughter', description: 'Lives in Guwahati', photo_url: '👩‍👧' },
    { id: 'mem-2', name: 'Aarav', relationship: 'Grandson', description: 'Loves playing cricket', photo_url: '👦' },
    { id: 'mem-3', name: 'Rahul', relationship: 'Son', description: 'Visits on Sundays', photo_url: '👨' }
  ]

  // Returns the active list: real memories if available, else demo fallback
  const getActiveFamilyList = (memories) =>
    memories && memories.length > 0 ? memories : DEMO_FAMILY_MEMBERS

  // Helper to load/reset question for Family Game
  const loadFamilyQuestion = (memberIndex, memories) => {
    const list = getActiveFamilyList(memories)
    const target = list[memberIndex % list.length]

    // Exact correct relationship from caregiver record
    const correctRel = target.relationship

    // Generate option choices: Exactly ONE correct relationship + plausible incorrect relationships
    const wrongOptions = CONTROLLED_RELATIONSHIPS.filter(
      r => normalizeRelationship(r) !== normalizeRelationship(correctRel)
    )

    // Shuffle wrong options and pick 3
    const shuffledWrong = [...wrongOptions].sort(() => Math.random() - 0.5).slice(0, 3)

    // Combine correct with wrong and shuffle all 4 options
    const options = [correctRel, ...shuffledWrong].sort(() => Math.random() - 0.5)

    // Reset answer & feedback states for new question
    setCurrentFamilyMember(target)
    setCurrentCorrectRelationship(correctRel)
    setFamilyAnswerOptions(options)
    setSelectedFamilyAnswer(null)
    setFamilyFeedback(null)

    // Speak question in active patient language
    const qText = `${target.name}. ${t('relationship_question', activePatientLanguage)}`
    triggerVoiceGuidance(qText)
  }

  // Start Family Memory Game — clears all previous session state
  const startFamilyGame = () => {
    setFamilyQuestionIndex(0)
    setFamilyCorrectCount(0)
    setFamilyFeedback(null)
    setSelectedFamilyAnswer(null)
    setGameStartTime(Date.now())
    setScreen('family')
    loadFamilyQuestion(0, familyMemoriesList)
  }

  // Handle Patient Selecting an Answer Option in Family Game
  const handleFamilyOptionClick = (option) => {
    if (selectedFamilyAnswer !== null) return // Already answered — guard against double-tap

    setSelectedFamilyAnswer(option)

    // Strict Ground Truth Comparison using normalized strings
    const isCorrect = normalizeRelationship(option) === normalizeRelationship(currentCorrectRelationship)
    const locCorrectRel = getLocalizedRelationship(currentCorrectRelationship, activePatientLanguage)

    // Accumulate correct answers across the session
    if (isCorrect) {
      setFamilyCorrectCount(prev => prev + 1)
      const msg = t('correct_feedback', activePatientLanguage, { relationship: locCorrectRel })
      setFamilyFeedback({ isCorrect: true, message: msg })
      triggerVoiceGuidance(msg)
    } else {
      // Show what the correct answer was so patient learns
      const msg = t('incorrect_feedback', activePatientLanguage)
      const hintMsg = t('correct_feedback', activePatientLanguage, { relationship: locCorrectRel })
      setFamilyFeedback({ isCorrect: false, message: msg, hint: hintMsg })
      triggerVoiceGuidance(msg)
    }
  }

  // Move to next question or complete Family Game
  const handleNextFamilyQuestion = async () => {
    // Use the same active list as loadFamilyQuestion so counts always match
    const activeList = getActiveFamilyList(familyMemoriesList)
    const totalQuestions = activeList.length

    if (familyQuestionIndex + 1 < totalQuestions) {
      // More questions to go
      const nextIdx = familyQuestionIndex + 1
      setFamilyQuestionIndex(nextIdx)
      loadFamilyQuestion(nextIdx, familyMemoriesList)
    } else {
      // All questions completed — calculate final score across ALL questions
      const timeSpent = Math.max(2, Math.round((Date.now() - (gameStartTime || Date.now())) / 1000))

      // Accumulate the last answer into the count before calculating
      const lastWasCorrect = familyFeedback?.isCorrect ?? false
      const totalCorrect = familyCorrectCount  // already updated via setFamilyCorrectCount in handleFamilyOptionClick
      const totalMistakes = totalQuestions - totalCorrect
      const accuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0
      const score = Math.round(accuracy * 100)

      const resultPayload = {
        patient_id: patient.id,
        activity_type: 'family_memory',
        difficulty: 'easy',
        score: score,
        accuracy: accuracy,
        response_time_seconds: timeSpent,
        attempts: totalQuestions,
        mistakes: totalMistakes,
        completion_status: 1,
        questions: totalQuestions,
        correct_answers: totalCorrect
      }

      const locCorrectRel = getLocalizedRelationship(currentCorrectRelationship, activePatientLanguage)
      setGameResult({
        title: t('well_done', activePatientLanguage),
        subtitle: t('completed_activity', activePatientLanguage),
        scoreSummary: `${totalCorrect} / ${totalQuestions} ${lastWasCorrect ? '✅' : ''}`,
        encouragement: score === 100
          ? t('correct_feedback', activePatientLanguage, { relationship: locCorrectRel })
          : t('good_effort', activePatientLanguage)
      })

      setScreen('result')
      triggerVoiceGuidance(`${t('well_done', activePatientLanguage)}. ${totalCorrect} ${t('done', activePatientLanguage)}`)

      if (isOnline) {
        await submitActivityResult(resultPayload)
        loadPatientData(patient.id)
      } else {
        saveToOfflineQueue(resultPayload)
        setSyncStatusToast("Offline — your activity will sync when you're connected.")
      }
    }
  }

  // Picture Recall items
  const visibleItems = useMemo(() => defaultMemoryItems.slice(0, 3 + difficultyIndex), [difficultyIndex])

  // Start Picture Game
  const startPictureGame = () => {
    setSelectedPictureItems([])
    setGameStartTime(Date.now())
    setScreen('picture')
    const promptText = t('picture_recall_title', activePatientLanguage)
    triggerVoiceGuidance(promptText)
  }

  // Submit Picture Game Result
  const handlePictureSubmit = async () => {
    const timeSpent = Math.max(2, Math.round((Date.now() - (gameStartTime || Date.now())) / 1000))
    const correctCount = visibleItems.filter((item) => selectedPictureItems.includes(item.label)).length
    const accuracy = correctCount / visibleItems.length
    const score = Math.round(accuracy * 100)
    const diffLabel = difficultyIndex === 0 ? 'easy' : (difficultyIndex === 1 ? 'medium' : 'hard')
    const lang = activePatientLanguage

    const resultPayload = {
      patient_id: patient.id,
      activity_type: 'picture_recall',
      difficulty: diffLabel,
      score: score,
      accuracy: accuracy,
      response_time_seconds: timeSpent,
      attempts: 1,
      mistakes: visibleItems.length - correctCount,
      completion_status: 1,
      items_shown: visibleItems.length,
      items_correct: correctCount
    }

    setGameResult({
      title: t('well_done', lang),
      subtitle: t('completed_activity', lang),
      scoreSummary: `${correctCount} / ${visibleItems.length}`,
      encouragement: t('good_effort', lang)
    })

    setScreen('result')
    triggerVoiceGuidance(`${t('well_done', lang)} ${t('good_effort', lang)}`)

    if (isOnline) {
      await submitActivityResult(resultPayload)
      loadPatientData(patient.id)
    } else {
      saveToOfflineQueue(resultPayload)
      setSyncStatusToast("Offline — your activity will sync when you're connected.")
    }
  }

  // Setup Matching Deck
  const createMatchingDeck = () => {
    const count = 3 + difficultyIndex
    const items = matchingSymbols.slice(0, count)
    const deck = items
      .flatMap((item) => [
        { ...item, instanceId: `${item.id}-a`, pairId: item.id, flipped: false, matched: false },
        { ...item, instanceId: `${item.id}-b`, pairId: item.id, flipped: false, matched: false },
      ])
      .sort(() => Math.random() - 0.5)
    setMatchingCards(deck)
    setTurn([])
    setMatchedPairsCount(0)
    setMovesCount(0)
    setMatchingFeedback('')
    setGameStartTime(Date.now())
    setScreen('matching')
    const lang = activePatientLanguage
    triggerVoiceGuidance(t('matching_title', lang))
  }

  const handleMatchingClick = (index) => {
    if (matchingCards[index].flipped || matchingCards[index].matched || turn.length >= 2) return
    const lang = activePatientLanguage

    const updated = [...matchingCards]
    updated[index].flipped = true
    setMatchingCards(updated)

    const nextTurn = [...turn, index]
    setTurn(nextTurn)

    if (nextTurn.length === 2) {
      setMovesCount(m => m + 1)
      const [firstIndex, secondIndex] = nextTurn
      const first = updated[firstIndex]
      const second = updated[secondIndex]

      if (first.pairId === second.pairId) {
        setMatchingFeedback(t('good_match', lang))
        setTimeout(async () => {
          const matchedDeck = updated.map((card, idx) =>
            idx === firstIndex || idx === secondIndex ? { ...card, matched: true, flipped: true } : card
          )
          setMatchingCards(matchedDeck)
          setTurn([])
          setMatchingFeedback('')
          const newPairs = matchedPairsCount + 1
          setMatchedPairsCount(newPairs)

          const totalPairs = (3 + difficultyIndex)
          if (newPairs >= totalPairs) {
            // Completed Game
            const timeSpent = Math.max(3, Math.round((Date.now() - (gameStartTime || Date.now())) / 1000))
            const totalMoves = movesCount + 1
            const accuracy = Math.max(0.4, Math.min(1.0, totalPairs / totalMoves))
            const score = Math.round(accuracy * 100)

            const resultPayload = {
              patient_id: patient.id,
              activity_type: 'matching',
              difficulty: difficultyIndex === 0 ? 'easy' : (difficultyIndex === 1 ? 'medium' : 'hard'),
              score: score,
              accuracy: accuracy,
              response_time_seconds: timeSpent,
              attempts: 1,
              mistakes: Math.max(0, totalMoves - totalPairs),
              completion_status: 1,
              pairs: totalPairs,
              moves: totalMoves,
              matches: totalPairs
            }

            setGameResult({
              title: t('well_done', lang),
              subtitle: t('completed_activity', lang),
              scoreSummary: `Matched all ${totalPairs} pairs`,
              encouragement: t('good_effort', lang)
            })

            setScreen('result')
            triggerVoiceGuidance(`${t('well_done', lang)}`)

            if (isOnline) {
              await submitActivityResult(resultPayload)
              loadPatientData(patient.id)
            } else {
              saveToOfflineQueue(resultPayload)
              setSyncStatusToast("Offline — your activity will sync when you're connected.")
            }
          }
        }, 450)
      } else {
        setMatchingFeedback(t('try_another_pair', lang))
        setTimeout(() => {
          setMatchingCards(updated.map((card, idx) =>
            idx === firstIndex || idx === secondIndex ? { ...card, flipped: false } : card
          ))
          setTurn([])
          setMatchingFeedback('')
        }, 850)
      }
    }
  }

  const handleDeleteFamilyMemory = async (memId) => {
    await deleteFamilyMemory(patient.id, memId)
    loadPatientData(patient.id)
  }

  const handleReviewAlert = async (alertId) => {
    await reviewAlert(alertId)
    loadPatientData(patient.id)
  }

  if (!patient) return <div className="app-shell" style={{ padding: '40px', fontSize: '20px' }}>Loading NeuroSaathi...</div>

  return (
    <div className="app-shell">
      {/* Top Header Bar */}
      <header className="topbar">
        <div className="brand-container">
          <span className="brand-logo">🧠</span>
          <div>
            <div className="brand-title">NeuroSaathi</div>
            <div className="brand-subtitle">Elderly Memory Assistance & Cognitive Companion</div>
          </div>
        </div>

        {/* Navigation Switcher */}
        <div className="mode-switch">
          <button
            className={`mode-toggle ${mode === 'patient' ? 'active' : ''}`}
            onClick={() => { stopSpeaking(); setMode('patient'); setScreen('welcome') }}
          >
            Patient Mode
          </button>
          <button
            className={`mode-toggle ${mode === 'caregiver' ? 'active' : ''}`}
            onClick={() => { stopSpeaking(); setMode('caregiver'); setActiveTab('overview') }}
          >
            Caregiver Dashboard
          </button>
        </div>
      </header>

      {/* Sync / Offline Banner */}
      {syncStatusToast && (
        <div style={{ background: isOnline ? '#f0fdf4' : '#fff7ed', border: `1px solid ${isOnline ? '#16a34a' : '#92400E'}`, color: isOnline ? '#15803d' : '#9a3412', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{isOnline ? '🟢' : '📡'}</span>
          <span>{syncStatusToast}</span>
        </div>
      )}

      {/* Non-Medical Disclaimer Bar */}
      <div className="disclaimer-bar">
        <span style={{ fontSize: '18px' }}>ℹ️</span>
        <span>
          NeuroSaathi is an activity performance tool and cognitive engagement companion. It is not a medical clinical diagnostic system and does not replace professional medical advice.
        </span>
      </div>

      <main className="content-area">
        {/* ================= 1. PATIENT MODE ================= */}
        {mode === 'patient' && (
          <>
            {/* Top Bar for Patient Mode with Dementia-Friendly Language Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '14px 20px', borderRadius: '16px', border: '1px solid #C4B99A', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <button
                className="action-button secondary"
                style={{ padding: '12px 24px', fontSize: '18px', borderRadius: '30px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => setShowLanguageModal(true)}
              >
                🌐 Language: <strong style={{ color: '#2D5016' }}>{activePatientLanguage}</strong>
              </button>

              {/* Voice / TTS Status Indicator — color-coded by availability */}
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                ...(voiceStatusInfo.includes('available')
                  ? { color: '#15803d', background: '#f0fdf4', borderColor: '#86efac' }
                  : voiceStatusInfo.includes('No ') || voiceStatusInfo.includes('not installed')
                    ? { color: '#92400e', background: '#fffbeb', borderColor: '#fcd34d' }
                    : { color: '#475569', background: '#f1f5f9', borderColor: '#e2e8f0' })
              }}>
                {voiceStatusInfo.includes('available') ? '✅' : voiceStatusInfo.includes('No ') || voiceStatusInfo.includes('not installed') ? '⚠️' : '🔊'} {voiceStatusInfo}
                {(voiceStatusInfo.includes('No ') || voiceStatusInfo.includes('not installed')) && (
                  <span style={{ display: 'block', fontSize: '11px', marginTop: '2px', fontWeight: '500' }}>
                    💡 Go to device Settings → Language → Text-to-Speech → install {activePatientLanguage} voice
                  </span>
                )}
              </div>
            </div>

            {/* Simple Dementia-Friendly Patient Language Selector Modal */}
            {showLanguageModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
                <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '26px', color: '#2D5016', margin: 0 }}>🌐 {t('language_selector_title', activePatientLanguage)}</h2>
                    <button
                      onClick={() => setShowLanguageModal(false)}
                      style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>

                  <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Tap your preferred language below:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        style={{
                          padding: '16px 12px',
                          fontSize: '18px',
                          fontWeight: '700',
                          borderRadius: '16px',
                          border: activePatientLanguage === lang.code ? '3px solid #2D5016' : '2px solid #C4B99A',
                          background: activePatientLanguage === lang.code ? '#E8F0E2' : '#ffffff',
                          color: activePatientLanguage === lang.code ? '#2D5016' : '#1e293b',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => handlePatientSelectLanguage(lang.code)}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Welcome Screen */}
            {screen === 'welcome' && (
              <div className="panel patient-welcome">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span className="small-tag">{t('patient_home_title', activePatientLanguage)} ({activePatientLanguage})</span>
                  <button
                    className="action-button secondary"
                    style={{ padding: '10px 20px', fontSize: '16px', borderRadius: '24px' }}
                    onClick={() => triggerVoiceGuidance(`${t('greeting_morning', activePatientLanguage)}, ${patient.name.split(' ')[0]}. ${t('what_to_do', activePatientLanguage)}`)}
                  >
                    🗣️ {isSpeaking ? 'Speaking...' : t('talk_to_saathi', activePatientLanguage)}
                  </button>
                </div>

                <h1>{t('greeting_morning', activePatientLanguage)}, {patient.name.split(' ')[0]} ❤️</h1>
                <p className="prompt-label">{t('what_to_do', activePatientLanguage)}</p>

                {recommendation && (
                  <div style={{ background: '#E8F0E2', border: '1px solid #C4B99A', padding: '18px 22px', borderRadius: '14px', marginBottom: '28px' }}>
                    <div style={{ fontWeight: '800', color: '#2D5016', fontSize: '14px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('guidance_title', activePatientLanguage)}
                    </div>
                    <div style={{ fontSize: '18px', color: '#1e293b', fontWeight: '600' }}>
                      {t('guidance_desc', activePatientLanguage)}
                    </div>
                  </div>
                )}

                <div className="large-button-stack">
                  <button className="large-button primary" onClick={startPictureGame}>
                    <span>🧠 {t('memory_activity', activePatientLanguage)}</span>
                    <span className="btn-icon">🧩</span>
                  </button>

                  <button className="large-button primary" onClick={startFamilyGame}>
                    <span>👨‍👩‍👧 {t('my_family', activePatientLanguage)}</span>
                    <span className="btn-icon">🖼️</span>
                  </button>

                  <button className="large-button primary" onClick={createMatchingDeck}>
                    <span>🃏 {t('matching_game', activePatientLanguage)}</span>
                    <span className="btn-icon">✨</span>
                  </button>

                  <button
                    className="large-button secondary"
                    onClick={() => triggerVoiceGuidance(`Hello! ${t('talk_to_saathi', activePatientLanguage)}`)}
                  >
                    <span>🗣️ {t('talk_to_saathi', activePatientLanguage)}</span>
                    <span className="btn-icon">💬</span>
                  </button>
                </div>
              </div>
            )}

            {/* Picture Recall Game Screen */}
            {screen === 'picture' && (
              <div className="panel">
                <span className="small-tag">{t('memory_activity', activePatientLanguage)}</span>
                <h2 style={{ fontSize: '28px', marginBottom: '10px' }}>{t('picture_recall_title', activePatientLanguage)}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '20px', marginBottom: '24px' }}>{t('which_pictures_seen', activePatientLanguage)}</p>

                <div className="memory-grid">
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`memory-card ${selectedPictureItems.includes(item.label) ? 'selected' : ''}`}
                      onClick={() =>
                        setSelectedPictureItems((prev) =>
                          prev.includes(item.label) ? prev.filter((val) => val !== item.label) : [...prev, item.label]
                        )
                      }
                    >
                      <span className="emoji">{item.emoji}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="action-row" style={{ marginTop: '32px' }}>
                  <button className="action-button primary" style={{ minWidth: '180px', padding: '16px 36px', fontSize: '20px' }} onClick={handlePictureSubmit}>
                    {t('done', activePatientLanguage)}
                  </button>
                  <button className="action-button secondary" style={{ minWidth: '140px', padding: '16px 28px', fontSize: '18px' }} onClick={() => setScreen('welcome')}>
                    {t('go_home', activePatientLanguage)}
                  </button>
                </div>
              </div>
            )}

            {/* Family Memory Game Screen — Exact Relationship Matching & Strict Logic */}
            {screen === 'family' && (
              <div className="panel">
                <span className="small-tag">{t('my_family', activePatientLanguage)}</span>

                {currentFamilyMember ? (
                  <div style={{ textAlign: 'center', margin: '16px 0' }}>
                    {/* Real Uploaded Photo or fallback emoji */}
                    {currentFamilyMember.photo_url?.startsWith('/') ? (
                      <img
                        src={`${API_SERVER}${currentFamilyMember.photo_url}`}
                        alt={currentFamilyMember.name}
                        style={{ width: '220px', height: '220px', objectFit: 'cover', borderRadius: '20px', border: '4px solid #2D5016', marginBottom: '14px', boxShadow: 'none' }}
                      />
                    ) : (
                      <div style={{ fontSize: '90px', marginBottom: '12px' }}>
                        {currentFamilyMember.photo_url || '👨‍👩‍👧‍👦'}
                      </div>
                    )}

                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-heading)', marginBottom: '8px' }}>
                      {currentFamilyMember.name}
                    </div>

                    <h2 style={{ fontSize: '24px', color: '#2D5016', margin: '16px 0' }}>
                      {t('relationship_question', activePatientLanguage)}
                    </h2>

                    {/* Answer Choice Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '24px 0', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
                      {familyAnswerOptions.map((rel) => {
                        const locRel = getLocalizedRelationship(rel, activePatientLanguage)
                        const isSelected = selectedFamilyAnswer === rel
                        let btnClass = 'secondary'
                        let btnStyle = {}

                        if (isSelected) {
                          const isCorrect = normalizeRelationship(rel) === normalizeRelationship(currentCorrectRelationship)
                          if (isCorrect) {
                            btnClass = 'primary'
                            btnStyle = { background: '#16a34a', borderColor: '#15803d', color: '#ffffff' }
                          } else {
                            btnStyle = { background: '#dc2626', borderColor: '#b91c1c', color: '#ffffff' }
                          }
                        }

                        return (
                          <button
                            key={rel}
                            disabled={selectedFamilyAnswer !== null}
                            className={`large-button ${btnClass}`}
                            style={{ padding: '18px', fontSize: '22px', justifyContent: 'center', ...btnStyle }}
                            onClick={() => handleFamilyOptionClick(rel)}
                          >
                            {locRel}
                          </button>
                        )
                      })}
                    </div>

                    {/* Unambiguous dementia-friendly feedback banner */}
                    {familyFeedback && (
                      <div style={{
                        padding: '16px 24px',
                        borderRadius: '16px',
                        fontSize: '22px',
                        fontWeight: '800',
                        margin: '20px auto',
                        maxWidth: '560px',
                        background: familyFeedback.isCorrect ? '#f0fdf4' : '#fef2f2',
                        border: `2px solid ${familyFeedback.isCorrect ? '#86efac' : '#fca5a5'}`,
                        color: familyFeedback.isCorrect ? '#15803d' : '#991b1b'
                      }}>
                        {familyFeedback.isCorrect ? '✅ ' : '❌ '} {familyFeedback.message}
                        {/* When wrong, also show the correct answer so patient learns */}
                        {!familyFeedback.isCorrect && familyFeedback.hint && (
                          <div style={{ fontSize: '18px', marginTop: '8px', color: '#15803d', fontWeight: '700' }}>
                            ✅ {familyFeedback.hint}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '18px', margin: '20px 0' }}>No family memories uploaded yet.</p>
                )}

                <div className="action-row" style={{ marginTop: '24px' }}>
                  {familyFeedback && (
                    <button className="action-button primary" style={{ minWidth: '180px', padding: '16px 36px', fontSize: '20px' }} onClick={handleNextFamilyQuestion}>
                      {familyQuestionIndex + 1 < getActiveFamilyList(familyMemoriesList).length
                        ? `${t('my_family', activePatientLanguage)} →`
                        : t('done', activePatientLanguage)}
                    </button>
                  )}
                  <button className="action-button secondary" style={{ minWidth: '140px', padding: '16px 28px', fontSize: '18px' }} onClick={() => setScreen('welcome')}>
                    {t('go_home', activePatientLanguage)}
                  </button>
                </div>
              </div>
            )}

            {/* Matching Game Screen */}
            {screen === 'matching' && (
              <div className="panel">
                <span className="small-tag">{t('matching_game', activePatientLanguage)}</span>
                <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>{t('matching_title', activePatientLanguage)}</h2>
                {matchingFeedback && (
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#2D5016', margin: '12px 0' }}>
                    {matchingFeedback}
                  </div>
                )}

                <div className="matching-grid">
                  {matchingCards.map((card, index) => (
                    <button
                      key={`${card.instanceId}-${index}`}
                      type="button"
                      className={`match-card ${card.flipped || card.matched ? 'revealed' : ''} ${card.matched ? 'matched' : ''}`}
                      onClick={() => handleMatchingClick(index)}
                    >
                      {card.flipped || card.matched ? card.symbol : '?'}
                    </button>
                  ))}
                </div>

                <div className="action-row">
                  <button className="action-button secondary" style={{ padding: '16px 30px', fontSize: '18px' }} onClick={() => setScreen('welcome')}>
                    {t('go_home', activePatientLanguage)}
                  </button>
                </div>
              </div>
            )}

            {/* Patient Result Screen */}
            {screen === 'result' && (
              <div className="panel result-card">
                <h2 style={{ fontSize: '38px', color: '#2D5016', marginBottom: '14px' }}>
                  {gameResult?.title || t('well_done', activePatientLanguage)}
                </h2>
                <p style={{ fontSize: '22px', color: 'var(--text-dark)', marginBottom: '18px' }}>
                  {gameResult?.subtitle || t('completed_activity', activePatientLanguage)}
                </p>

                <div style={{ fontSize: '28px', fontWeight: '800', color: '#2D5016', background: '#E8F0E2', border: '1px solid #C4B99A', padding: '14px 36px', borderRadius: '30px', display: 'inline-block', marginBottom: '22px' }}>
                  {gameResult?.scoreSummary}
                </div>

                <p style={{ fontSize: '20px', color: 'var(--text-muted)', marginBottom: '32px' }}>
                  {gameResult?.encouragement || t('good_effort', activePatientLanguage)}
                </p>

                <div className="action-row">
                  <button className="action-button primary" style={{ minWidth: '180px', padding: '16px 36px', fontSize: '20px' }} onClick={() => setScreen('welcome')}>
                    {t('play_another', activePatientLanguage)}
                  </button>
                  <button className="action-button secondary" style={{ minWidth: '160px', padding: '16px 28px', fontSize: '18px' }} onClick={() => setScreen('welcome')}>
                    {t('go_home', activePatientLanguage)}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= 2. CAREGIVER MODE ================= */}
        {mode === 'caregiver' && (
          <>
            {!caregiverSession ? (
              <div className="panel" style={{ maxWidth: '480px', margin: '40px auto' }}>
                <span className="small-tag">Caregiver Access</span>
                <h2 style={{ fontSize: '26px', marginBottom: '8px' }}>
                  {authView === 'login' ? 'Caregiver Sign In' : 'Create Caregiver Account'}
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px' }}>
                  Manage patient profiles, upload real family photos, and review activity trends.
                </p>

                {authError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>
                    ⚠️ {authError}
                  </div>
                )}
                {authSuccess && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>
                    ✓ {authSuccess}
                  </div>
                )}

                {authView === 'login' ? (
                  <form onSubmit={handleLoginSubmit}>
                    <div className="form-group">
                      <label>Email / Mobile Number</label>
                      <input
                        className="form-input"
                        type="email"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Password</label>
                      <input
                        className="form-input"
                        type="password"
                        value={authForm.password}
                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                        required
                      />
                    </div>

                    <button type="submit" className="action-button primary" style={{ width: '100%', padding: '14px' }}>
                      Sign In to Caregiver Portal
                    </button>

                    <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
                      Need an account?{' '}
                      <button type="button" style={{ background: 'none', border: 'none', color: '#2D5016', fontWeight: '700', cursor: 'pointer' }} onClick={() => setAuthView('register')}>
                        Register here
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit}>
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        className="form-input"
                        value={authForm.name}
                        onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        className="form-input"
                        type="email"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input
                        className="form-input"
                        type="password"
                        value={authForm.password}
                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className="action-button primary" style={{ width: '100%', padding: '14px' }}>
                      Create Account
                    </button>
                    <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
                      Already registered?{' '}
                      <button type="button" style={{ background: 'none', border: 'none', color: '#2D5016', fontWeight: '700', cursor: 'pointer' }} onClick={() => setAuthView('login')}>
                        Sign in here
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '26px' }}>Caregiver Control Center</h2>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                      Active Caregiver: <strong>{caregiverSession.name}</strong> ({caregiverSession.email})
                    </span>
                  </div>
                  <button className="action-button secondary" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={handleCaregiverLogout}>
                    Sign Out
                  </button>
                </div>

                {/* Patient Selector Bar */}
                <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #C4B99A', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: '700', fontSize: '16px' }}>Select Active Patient:</span>
                    <select
                      className="form-input"
                      style={{ width: 'auto', padding: '10px 16px', fontSize: '16px', fontWeight: '700' }}
                      value={selectedPatientId}
                      onChange={(e) => {
                        setSelectedPatientId(e.target.value)
                        const pFound = patients.find(p => p.id === e.target.value)
                        if (pFound) {
                          setPatient(pFound)
                          setActivePatientLanguage(pFound.preferred_language || 'English')
                        }
                      }}
                    >
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.preferred_language || 'English'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button className="action-button primary" style={{ padding: '10px 20px', fontSize: '15px' }} onClick={() => setActiveTab('create-patient')}>
                    + Add New Patient Profile
                  </button>
                </div>

                {/* Caregiver Dashboard Tabs */}
                <div className="tab-navigation">
                  <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    📊 Patient Overview
                  </button>
                  <button className={`tab-btn ${activeTab === 'memories' ? 'active' : ''}`} onClick={() => setActiveTab('memories')}>
                    🖼️ Family Photos Setup
                  </button>
                  <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    ⚙️ Patient Settings & Language
                  </button>
                  <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                    📜 Activity History
                  </button>
                  <button className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
                    🔔 Alerts ({alerts.filter(a => !a.reviewed).length})
                  </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                      <div className="metric-card">
                        <span className="label">Patient Name</span>
                        <span className="value" style={{ fontSize: '24px' }}>{patient.name}</span>
                        <span className="subtext">Age: {patient.age} | Preferred: {patient.preferred_language}</span>
                      </div>

                      <div className="metric-card">
                        <span className="label">Cognitive Stability Score</span>
                        <span className="value" style={{ color: '#15803d' }}>
                          {analytics ? `${Math.round(analytics.baseline_comparison.overall_average_accuracy * 100)}%` : '85%'}
                        </span>
                        <span className="subtext">Based on recent completed games</span>
                      </div>

                      <div className="metric-card">
                        <span className="label">Total Sessions Completed</span>
                        <span className="value">{analytics ? analytics.baseline_comparison.total_sessions : 12}</span>
                        <span className="subtext">Memory & Matching activities</span>
                      </div>
                    </div>

                    {(() => {
                      const trendData = analytics?.accuracy_trend?.length > 0
                        ? analytics.accuracy_trend
                        : FALLBACK_ANALYTICS.accuracy_trend
                      return (
                        <div className="panel" style={{ marginBottom: '24px' }}>
                          <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>Cognitive Performance Accuracy Trend</h3>
                          {!analytics && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>⚠️ Backend offline — showing demo data</p>}
                          <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={trendData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis domain={[0, 100]} />
                              <Tooltip formatter={(val) => [`${val}%`, 'Accuracy']} />
                              <Line type="monotone" dataKey="accuracy" stroke="#2D5016" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* TAB 2: FAMILY MEMBER SETUP WITH CONTROLLED RELATIONSHIPS LIST */}
                {activeTab === 'memories' && (
                  <div>
                    <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Caregiver Family Member Setup</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '15px' }}>
                      Upload real photographs of family members and assign their exact relationship. The caregiver relationship establishes the ground truth for the Family Game.
                    </p>

                    <div style={{ background: '#F5F0E8', border: '1px solid #C4B99A', padding: '22px', borderRadius: '14px', marginBottom: '26px' }}>
                      <h4 style={{ fontSize: '18px', marginBottom: '14px', color: '#2D5016' }}>+ Upload New Family Member</h4>

                      {photoUploadError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px', fontWeight: '600' }}>
                          ⚠️ {photoUploadError}
                        </div>
                      )}
                      {photoUploadSuccess && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px', fontWeight: '600' }}>
                          ✓ {photoUploadSuccess}
                        </div>
                      )}

                      <form onSubmit={handleUploadFamilyPhotoSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                          <div className="form-group">
                            <label>Select Photo File (JPG, PNG, WebP)</label>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handlePhotoSelect}
                              style={{ width: '100%', padding: '8px' }}
                            />
                            {previewUrl && (
                              <div style={{ marginTop: '10px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Image Preview:</span>
                                <img src={previewUrl} alt="Preview" style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '12px', border: '2px solid #2D5016' }} />
                              </div>
                            )}
                          </div>

                          <div className="form-group">
                            <label>Family Member Name</label>
                            <input
                              className="form-input"
                              placeholder="e.g. Rahul"
                              value={familyPhotoForm.name}
                              onChange={(e) => setFamilyPhotoForm({ ...familyPhotoForm, name: e.target.value })}
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label>Controlled Relationship</label>
                            <select
                              className="form-input"
                              value={familyPhotoForm.relationship}
                              onChange={(e) => setFamilyPhotoForm({ ...familyPhotoForm, relationship: e.target.value })}
                            >
                              {CONTROLLED_RELATIONSHIPS.map((rel) => (
                                <option key={rel} value={rel}>{rel}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Short Memory Description</label>
                          <input
                            className="form-input"
                            placeholder="e.g. Rahul visits every Sunday"
                            value={familyPhotoForm.description}
                            onChange={(e) => setFamilyPhotoForm({ ...familyPhotoForm, description: e.target.value })}
                          />
                        </div>

                        <button type="submit" className="action-button primary" style={{ padding: '14px 28px' }}>
                          Upload & Save Family Member
                        </button>
                      </form>
                    </div>

                    {/* Memory Cards Grid */}
                    <div className="family-card-grid">
                      {familyMemoriesList.map((mem) => (
                        <div key={mem.id} className="family-card">
                          <button className="delete-btn" title="Delete" onClick={() => handleDeleteFamilyMemory(mem.id)}>×</button>

                          {mem.photo_url?.startsWith('/') ? (
                            <img
                              src={`${API_SERVER}${mem.photo_url}`}
                              alt={mem.name}
                              style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '14px', marginBottom: '10px', border: '2px solid #2D5016' }}
                            />
                          ) : (
                            <div className="family-photo">{mem.photo_url || '👨‍👩‍👧‍👦'}</div>
                          )}

                          <strong style={{ fontSize: '19px', display: 'block', color: '#0f172a' }}>{mem.name}</strong>
                          <span style={{ color: '#2D5016', fontWeight: '700', fontSize: '15px' }}>{mem.relationship}</span>
                          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>{mem.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: PATIENT SETTINGS & LANGUAGE */}
                {activeTab === 'profile' && (
                  <div>
                    <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Patient Profile & Language Localization</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px' }}>
                      Select the caregiver-preferred initial language for the patient.
                    </p>

                    <div style={{ maxWidth: '540px', marginTop: '22px' }}>
                      <div className="form-group">
                        <label>Patient Name</label>
                        <input
                          className="form-input"
                          value={patient.name}
                          onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Caregiver Preferred Default Language</label>
                        <select
                          className="form-input"
                          value={patient.preferred_language}
                          onChange={(e) => {
                            const newLang = e.target.value
                            setPatient({ ...patient, preferred_language: newLang })
                            setActivePatientLanguage(newLang)
                          }}
                        >
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Caregiver Name</label>
                        <input
                          className="form-input"
                          value={patient.caregiver_name || caregiverSession.name}
                          onChange={(e) => setPatient({ ...patient, caregiver_name: e.target.value })}
                        />
                      </div>

                      <button
                        className="action-button primary"
                        style={{ marginTop: '12px', padding: '14px 28px' }}
                        onClick={async () => {
                          await updatePatient(patient.id, patient)
                          loadPatientData(patient.id)
                          alert(`Patient settings updated! Preferred language set to ${patient.preferred_language}.`)
                        }}
                      >
                        Save Patient Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4: ADD PATIENT */}
                {activeTab === 'create-patient' && (
                  <div>
                    <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Create New Patient Profile</h3>
                    <form onSubmit={handleCreatePatientSubmit} style={{ maxWidth: '540px' }}>
                      <div className="form-group">
                        <label>Patient Name</label>
                        <input
                          className="form-input"
                          placeholder="e.g. Rongsen"
                          value={newPatientForm.name}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Age</label>
                        <input
                          className="form-input"
                          type="number"
                          value={newPatientForm.age}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, age: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Preferred Language</label>
                        <select
                          className="form-input"
                          value={newPatientForm.preferred_language}
                          onChange={(e) => setNewPatientForm({ ...newPatientForm, preferred_language: e.target.value })}
                        >
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button type="submit" className="action-button primary" style={{ padding: '14px 28px' }}>
                        Create Patient Profile
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 5: HISTORY */}
                {activeTab === 'history' && (
                  <div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                      <select
                        className="form-input"
                        style={{ width: 'auto' }}
                        value={historyFilter.type}
                        onChange={(e) => setHistoryFilter({ ...historyFilter, type: e.target.value })}
                      >
                        <option value="all">All Activity Types</option>
                        <option value="picture_recall">Picture Recall</option>
                        <option value="family_memory">Family Memory</option>
                        <option value="matching">Matching</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {activitiesHistory.length > 0 ? (
                        activitiesHistory.map((item, index) => (
                          <div key={index} style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '18px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                              <strong style={{ fontSize: '17px', color: '#2D5016' }}>
                                {item.activity_type?.replace('_', ' ').toUpperCase()}
                              </strong>
                              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {new Date(item.timestamp).toLocaleString()}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '22px', fontWeight: '800', color: item.accuracy >= 0.75 ? '#15803d' : '#92400E' }}>
                                {Math.round(item.accuracy * 100)}% Accuracy
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: '16px' }}>No activity records found matching filters.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 6: ALERTS */}
                {activeTab === 'alerts' && (
                  <div>
                    <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Caregiver Alerts & Observations</h3>
                    {alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <div key={alert.id} className={`alert-card ${alert.reviewed ? 'reviewed' : ''}`}>
                          <div>
                            <strong style={{ fontSize: '17px', color: alert.reviewed ? 'var(--text-muted)' : '#92400E' }}>
                              {alert.title}
                            </strong>
                            <p style={{ fontSize: '15px', marginTop: '4px', color: '#1e293b' }}>{alert.message}</p>
                          </div>
                          {!alert.reviewed && (
                            <button className="action-button secondary" style={{ padding: '10px 18px', fontSize: '14px' }} onClick={() => handleReviewAlert(alert.id)}>
                              Mark as Reviewed
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '16px', margin: '20px 0' }}>No recent observations require your attention.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App

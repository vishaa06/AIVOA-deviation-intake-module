import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setPastedText,
  extractionStarted,
  extractionProgressed,
  extractionSucceeded,
  extractionFailed,
  addChatMessage,
} from '../store/aiSlice'
import { applyAiExtraction, applyChatUpdates } from '../store/deviationSlice'
import { extractFromText, extractFromFile, askAssistant, describeApiError } from '../api/client'

export default function AIPanel() {
  const dispatch = useDispatch()
  const { pastedText, extractionStatus, extractionProgress, chatMessages } = useSelector((s) => s.ai)
  const { form } = useSelector((s) => s.deviation)
  const fileInputRef = useRef(null)
  const [chatInput, setChatInput] = useState('')

  // Fake incremental progress while we wait on the real API call — the
  // pipeline itself doesn't stream, so this just gives visual feedback that
  // matches the reference UI's progress bar during the two backend AI steps.
  const runWithFakeProgress = async (apiCall) => {
    dispatch(extractionStarted())
    const ticker = setInterval(() => {
      dispatch(extractionProgressed(Math.min(90, 20 + Math.random() * 60)))
    }, 400)
    try {
      const result = await apiCall()
      clearInterval(ticker)
      dispatch(extractionProgressed(100))
      dispatch(applyAiExtraction(result))
      dispatch(extractionSucceeded())
    } catch (err) {
      clearInterval(ticker)
      dispatch(extractionFailed(describeApiError(err)))
    }
  }

  const handlePasteExtract = () => {
    if (!pastedText.trim()) return
    runWithFakeProgress(() => extractFromText(pastedText))
  }

  const handleFileChosen = (file) => {
    if (!file) return
    dispatch(addChatMessage({ role: 'user', text: `Uploaded: ${file.name}` }))
    runWithFakeProgress(() => extractFromFile(file))
  }

  const handleAsk = async () => {
    const message = chatInput.trim()
    if (!message) return
    dispatch(addChatMessage({ role: 'user', text: message }))
    setChatInput('')
    try {
      const { reply, updates } = await askAssistant(message, form)
      if (updates && Object.keys(updates).length > 0) {
        dispatch(applyChatUpdates(updates))
      }
      dispatch(addChatMessage({ role: 'assistant', text: reply }))
    } catch (err) {
      dispatch(addChatMessage({ role: 'assistant', text: `Error: ${describeApiError(err)}` }))
    }
  }

  const isBusy = extractionStatus === 'extracting'

  return (
    <div className="card">
      <div className="card-header">
        <h2>✨ AI Deviation Assistant</h2>
        <span className="beta-tag">BETA</span>
      </div>

      <div
        className="dropzone"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFileChosen(e.dataTransfer.files?.[0])
        }}
      >
        📄 Drag &amp; drop supporting document here<br />
        or <a>click to browse</a>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChosen(e.target.files?.[0])}
        />
      </div>

      <div className="divider-or">OR</div>

      <textarea
        placeholder="Paste deviation details / notes"
        value={pastedText}
        onChange={(e) => dispatch(setPastedText(e.target.value))}
        style={{ minHeight: 70, marginBottom: 10 }}
      />
      <button
        className="btn-primary"
        style={{ width: '100%', marginBottom: 12 }}
        disabled={isBusy || !pastedText.trim()}
        onClick={handlePasteExtract}
      >
        {isBusy ? 'Extracting…' : 'Extract with AI'}
      </button>

      <div className="support-box">
        ✅ Supported formats: PDF, DOCX, TXT, JPG, PNG · Max file size: 10MB
      </div>

      {extractionStatus !== 'idle' && (
        <div className="progress-wrap">
          <div className="progress-label">
            <span>EXTRACTION PROGRESS</span>
            <span>{Math.round(extractionProgress)}%</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${extractionProgress}%` }} />
          </div>
          <p className="hint-box">
            {isBusy
              ? 'Analyzing document content and extracting key details… Please wait, this may take a few moments.'
              : extractionStatus === 'error'
              ? 'Extraction failed — see message below.'
              : 'Done — review the form on the left.'}
          </p>
        </div>
      )}

      <div className="section-title" style={{ marginTop: 20 }}>AI ASSISTANT</div>
      <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 4 }}>
        {chatMessages.map((m, i) => (
          <div
            key={i}
            className="assistant-msg"
            style={m.role === 'user' ? { background: '#f3f4f6' } : undefined}
          >
            <span>{m.role === 'assistant' ? '🤖' : '🧑'}</span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          placeholder="Ask me anything about deviations..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
        />
        <button className="btn-primary" onClick={handleAsk}>➤</button>
      </div>
      <p className="hint-box" style={{ textAlign: 'center', marginTop: 6 }}>
        AI responses may contain errors. Please verify information.
      </p>
    </div>
  )
}

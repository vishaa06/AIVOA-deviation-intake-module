import { createSlice } from '@reduxjs/toolkit'

// Separate from deviationSlice on purpose (DECISIONS.md Entry 6): this is
// transient UI/assistant state (upload progress, chat log) that should NOT
// be part of the persisted deviation record.

const initialState = {
  pastedText: '',
  fileName: null,
  extractionStatus: 'idle', // idle | extracting | done | error
  extractionProgress: 0,
  extractionError: null,
  chatMessages: [
    {
      role: 'assistant',
      text: 'Upload a deviation report, lab result, or paste text above. I will automatically extract the relevant details and populate the form for you.',
    },
  ],
}

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setPastedText: (state, action) => {
      state.pastedText = action.payload
    },
    setFileName: (state, action) => {
      state.fileName = action.payload
    },
    extractionStarted: (state) => {
      state.extractionStatus = 'extracting'
      state.extractionProgress = 15
      state.extractionError = null
    },
    extractionProgressed: (state, action) => {
      state.extractionProgress = action.payload
    },
    extractionSucceeded: (state) => {
      state.extractionStatus = 'done'
      state.extractionProgress = 100
      state.chatMessages.push({
        role: 'assistant',
        text: 'I extracted the details and populated the form on the left. Please review and edit anything before saving.',
      })
    },
    extractionFailed: (state, action) => {
      state.extractionStatus = 'error'
      state.extractionError = action.payload
      state.chatMessages.push({
        role: 'assistant',
        text: `I couldn't process that: ${action.payload}`,
      })
    },
    addChatMessage: (state, action) => {
      state.chatMessages.push(action.payload)
    },
    resetAiPanelForNewDeviation: (state) => {
      // Called after a successful save (see DeviationForm.handleSave) so the
      // assistant is ready for the next deviation instead of showing stale
      // pasted text / a 100% progress bar from the one just saved.
      state.pastedText = ''
      state.fileName = null
      state.extractionStatus = 'idle'
      state.extractionProgress = 0
      state.extractionError = null
      state.chatMessages.push({
        role: 'assistant',
        text: 'Deviation saved. Paste or upload the next one whenever you\'re ready.',
      })
    },
  },
})

export const {
  setPastedText,
  setFileName,
  extractionStarted,
  extractionProgressed,
  extractionSucceeded,
  extractionFailed,
  addChatMessage,
  resetAiPanelForNewDeviation,
} = aiSlice.actions

export default aiSlice.reducer

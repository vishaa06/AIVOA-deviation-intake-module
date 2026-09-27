import { createSlice } from '@reduxjs/toolkit'
import { normalizeDateForInput } from '../utils/date'

// DECISION (see DECISIONS.md Entry 5 & 6): this slice holds ONLY the actual
// deviation record data that will be saved. It starts empty/locked, and is
// only populated via `applyAiExtraction` — there is no action that lets the
// UI "manually type from scratch" as the very first step, matching the
// requirement that the AI panel — not manual typing — fills the form.

const emptyForm = {
  site_plant: '',
  date_of_occurrence: '',
  title: '',
  source: '',
  related_product_material: '',
  batch_lot_number: '',
  detailed_description: '',
  initial_impact: '',
  initial_severity: '',
  ai_reason: '',
}

const initialState = {
  form: emptyForm,
  hasBeenAiFilled: false, // gates whether fields are enabled for editing
  saveStatus: 'idle', // idle | saving | saved | error
  saveError: null,
}

const deviationSlice = createSlice({
  name: 'deviation',
  initialState,
  reducers: {
    applyAiExtraction: (state, action) => {
      const { fields, recommendation } = action.payload
      state.form = {
        ...state.form,
        ...fields,
        date_of_occurrence: normalizeDateForInput(fields?.date_of_occurrence),
        initial_impact: recommendation?.initial_impact || '',
        initial_severity: recommendation?.initial_severity || '',
        ai_reason: recommendation?.reason || '',
      }
      state.hasBeenAiFilled = true
    },
    updateField: (state, action) => {
      const { field, value } = action.payload
      state.form[field] = value
    },
    applyChatUpdates: (state, action) => {
      // Applied when the AI chat assistant confirms an edit (see AIPanel handleAsk).
      // BUG FIX: previously merged the entire `updates` object as-is. When the
      // model didn't strictly follow "only include changed fields," it could
      // return other fields as null/empty, and merging those wiped out good
      // data (reported: asking to change the batch number cleared everything
      // else). Now we only apply keys with a real, non-empty value, and
      // normalize date_of_occurrence the same way extraction does.
      const updates = action.payload || {}
      const safeUpdates = {}
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') continue
        safeUpdates[key] = key === 'date_of_occurrence' ? normalizeDateForInput(value) : value
      }
      state.form = { ...state.form, ...safeUpdates }
    },
    resetForm: (state) => {
      state.form = emptyForm
      state.hasBeenAiFilled = false
      state.saveStatus = 'idle'
      state.saveError = null
    },
    saveStarted: (state) => {
      state.saveStatus = 'saving'
      state.saveError = null
    },
    saveSucceeded: (state) => {
      state.saveStatus = 'saved'
    },
    saveFailed: (state, action) => {
      state.saveStatus = 'error'
      state.saveError = action.payload
    },
  },
})

export const {
  applyAiExtraction,
  updateField,
  applyChatUpdates,
  resetForm,
  saveStarted,
  saveSucceeded,
  saveFailed,
} = deviationSlice.actions

export default deviationSlice.reducer

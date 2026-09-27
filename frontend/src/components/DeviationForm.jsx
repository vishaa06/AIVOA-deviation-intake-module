import { useDispatch, useSelector } from 'react-redux'
import { updateField, resetForm, saveStarted, saveSucceeded, saveFailed } from '../store/deviationSlice'
import { resetAiPanelForNewDeviation } from '../store/aiSlice'
import { saveDeviation, describeApiError } from '../api/client'

// DECISION (DECISIONS.md Entry 5): every input is `disabled={!hasBeenAiFilled}`
// until the AI panel has populated the form at least once. This is the
// mechanism that enforces "AI fills the form, not manual typing" while still
// allowing full review/editing afterward, per the AI requirements.

const SOURCE_OPTIONS = ['Manufacturing', 'QC Lab', 'QA Review', 'Audit', 'Customer Complaint', 'Other']
const IMPACT_OPTIONS = ['Product Quality', 'Patient Safety', 'Regulatory Compliance', 'No Impact / Minor']
const SEVERITY_OPTIONS = ['Critical', 'Major', 'Minor']

export default function DeviationForm() {
  const dispatch = useDispatch()
  const { form, hasBeenAiFilled, saveStatus, saveError } = useSelector((s) => s.deviation)

  const locked = !hasBeenAiFilled
  const set = (field) => (e) => dispatch(updateField({ field, value: e.target.value }))

  const canSave =
    hasBeenAiFilled &&
    form.site_plant &&
    form.title &&
    form.detailed_description &&
    form.initial_impact &&
    form.initial_severity &&
    saveStatus !== 'saving'

  const handleSave = async () => {
    dispatch(saveStarted())
    try {
      await saveDeviation({ ...form, status: 'Saved' })
      dispatch(saveSucceeded())
      // BUG FIX: previously the form and AI panel were left showing the
      // just-saved data with no way to start the next deviation without a
      // manual page refresh. Brief delay so the "Saved" pill is visible
      // before everything clears for the next entry.
      setTimeout(() => {
        dispatch(resetForm())
        dispatch(resetAiPanelForNewDeviation())
      }, 1200)
    } catch (err) {
      dispatch(saveFailed(describeApiError(err)))
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h1>Log Deviation</h1>
          <p className="subtitle">Record any unexpected event, out-of-specification result or non-conformance.</p>
        </div>
        <span className="badge">{form.status || 'Draft'}</span>
      </div>

      {locked && (
        <p className="hint-box" style={{ marginBottom: 16 }}>
          This form is filled by the AI Deviation Assistant on the right. Paste text or upload a
          document there to get started — you'll be able to review and edit everything here afterward.
        </p>
      )}

      <div className="section-title">1. DEVIATION INFORMATION</div>

      <div className="form-row">
        <div>
          <label>Site / Plant <span className="req">*</span></label>
          <input value={form.site_plant} disabled={locked} onChange={set('site_plant')} placeholder="e.g. API Manufacturing Unit" />
        </div>
        <div>
          <label>Date of Occurrence</label>
          <input type="date" value={form.date_of_occurrence || ''} disabled={locked} onChange={set('date_of_occurrence')} />
        </div>
      </div>

      <div className="form-row">
        <div>
          <label>Title / Short Description <span className="req">*</span></label>
          <input value={form.title} disabled={locked} onChange={set('title')} placeholder="e.g. OOS result for Assay in Batch ABC-001" />
        </div>
        <div>
          <label>Source <span className="req">*</span></label>
          <select value={form.source || ''} disabled={locked} onChange={set('source')}>
            <option value="">Select source</option>
            {SOURCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div>
          <label>Related Product / Material</label>
          <input value={form.related_product_material || ''} disabled={locked} onChange={set('related_product_material')} placeholder="Search product or material..." />
        </div>
        <div>
          <label>Batch/Lot Number</label>
          <input value={form.batch_lot_number || ''} disabled={locked} onChange={set('batch_lot_number')} placeholder="Enter batch / lot no." />
        </div>
      </div>

      <div className="section-title">2. DEVIATION DETAILS</div>

      <label>Detailed Description <span className="req">*</span></label>
      <textarea
        value={form.detailed_description}
        disabled={locked}
        onChange={set('detailed_description')}
        maxLength={2000}
        placeholder="Describe what happened, where, when, and how it was detected..."
      />
      <div className="char-count">{(form.detailed_description || '').length}/2000</div>

      <div className="form-row" style={{ marginTop: 16 }}>
        <div>
          <label>Initial Impact <span className="req">*</span></label>
          <select value={form.initial_impact || ''} disabled={locked} onChange={set('initial_impact')}>
            <option value="">Select impact</option>
            {IMPACT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label>Initial Severity <span className="req">*</span></label>
          <select value={form.initial_severity || ''} disabled={locked} onChange={set('initial_severity')}>
            <option value="">Select severity</option>
            {SEVERITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {form.ai_reason && (
        <div className="hint-box" style={{ background: '#eef2ff', padding: 10, borderRadius: 8 }}>
          <strong>AI reasoning:</strong> {form.ai_reason}
        </div>
      )}

      <div className="actions">
        <button onClick={() => dispatch(resetForm())}>↺ Reset Form</button>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saveStatus === 'saved' && <span className="status-pill status-saved">Saved</span>}
          {saveStatus === 'saving' && <span className="status-pill status-saving">Saving…</span>}
          {saveStatus === 'error' && <span className="status-pill status-error">Error</span>}
          <button className="btn-primary" disabled={!canSave} onClick={handleSave}>
            📄 Save Deviation
          </button>
        </div>
      </div>
      {saveError && <p className="error-text">{saveError}</p>}
    </div>
  )
}

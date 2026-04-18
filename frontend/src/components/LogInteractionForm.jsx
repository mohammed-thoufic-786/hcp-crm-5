import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateField, resetForm, submitInteraction } from '../store/interactionSlice';
import './LogInteractionForm.css';

const INTERACTION_TYPES = ['Meeting', 'Call', 'Email', 'Conference', 'Virtual'];
const SENTIMENTS = ['Positive', 'Neutral', 'Negative'];

export default function LogInteractionForm() {
  const dispatch = useDispatch();
  const { form, submitting, submitSuccess, submitError, aiSuggestedFollowups, chatMappedFields } =
    useSelector((s) => s.interaction);

  const [materialsInput, setMaterialsInput] = useState('');
  const [materialsList, setMaterialsList] = useState([]);
  const [samplesInput, setSamplesInput] = useState('');
  const [samplesList, setSamplesList] = useState([]);

  // Sync tag lists when chat populates materials/samples
  useEffect(() => {
    if (form.materials_shared) {
      setMaterialsList(form.materials_shared.split(',').map((s) => s.trim()).filter(Boolean));
    }
    if (form.samples_distributed) {
      setSamplesList(form.samples_distributed.split(',').map((s) => s.trim()).filter(Boolean));
    }
  }, [form.materials_shared, form.samples_distributed]);

  // Helper: is this field auto-filled from chat?
  const isMapped = (field) => chatMappedFields.includes(field);

  const handleChange = (field) => (e) => dispatch(updateField({ field, value: e.target.value }));

  const addMaterial = () => {
    if (materialsInput.trim()) {
      const updated = [...materialsList, materialsInput.trim()];
      setMaterialsList(updated);
      dispatch(updateField({ field: 'materials_shared', value: updated.join(', ') }));
      setMaterialsInput('');
    }
  };

  const addSample = () => {
    if (samplesInput.trim()) {
      const updated = [...samplesList, samplesInput.trim()];
      setSamplesList(updated);
      dispatch(updateField({ field: 'samples_distributed', value: updated.join(', ') }));
      setSamplesInput('');
    }
  };

  const removeMaterial = (i) => {
    const updated = materialsList.filter((_, idx) => idx !== i);
    setMaterialsList(updated);
    dispatch(updateField({ field: 'materials_shared', value: updated.join(', ') }));
  };

  const removeSample = (i) => {
    const updated = samplesList.filter((_, idx) => idx !== i);
    setSamplesList(updated);
    dispatch(updateField({ field: 'samples_distributed', value: updated.join(', ') }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.hcp_name.trim()) return alert('HCP Name is required.');
    if (!form.date) return alert('Date is required.');
    dispatch(submitInteraction({ ...form }));
  };

  const handleReset = () => {
    dispatch(resetForm());
    setMaterialsList([]);
    setSamplesList([]);
    setMaterialsInput('');
    setSamplesInput('');
  };

  return (
    <div className="lif-root">
      <div className="lif-header">
        <span className="lif-title">Log HCP Interaction</span>
        <div className="lif-header-actions">
          {chatMappedFields.length > 0 && (
            <span className="chat-filled-badge">
              ✦ {chatMappedFields.length} field{chatMappedFields.length > 1 ? 's' : ''} auto-filled
            </span>
          )}
          <button className="btn-ghost" onClick={handleReset} type="button">Reset</button>
        </div>
      </div>

      {submitSuccess && (
        <div className="alert alert-success">
          ✅ Interaction logged &amp; stored successfully!
          {aiSuggestedFollowups?.length > 0 && (
            <div className="followup-inline">
              <strong>AI Suggested Follow-ups:</strong>
              <ul>{aiSuggestedFollowups.map((s, i) => <li key={i}>› {s}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      {submitError && <div className="alert alert-error">❌ {submitError}</div>}

      <form className="lif-form" onSubmit={handleSubmit}>

        {/* Row 1: HCP Name + Interaction Type */}
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">HCP Name <span className="req">*</span></label>
            <input
              className={`form-input ${isMapped('hcp_name') ? 'field-mapped' : ''}`}
              placeholder="Search or enter HCP name..."
              value={form.hcp_name}
              onChange={handleChange('hcp_name')}
              required
            />
            {isMapped('hcp_name') && <span className="field-hint">✦ filled from chat</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Interaction Type</label>
            <select
              className={`form-input ${isMapped('interaction_type') ? 'field-mapped' : ''}`}
              value={form.interaction_type}
              onChange={handleChange('interaction_type')}
            >
              {INTERACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            {isMapped('interaction_type') && <span className="field-hint">✦ filled from chat</span>}
          </div>
        </div>

        {/* Row 2: Date + Time */}
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Date <span className="req">*</span></label>
            <input
              className={`form-input ${isMapped('date') ? 'field-mapped' : ''}`}
              type="date"
              value={form.date}
              onChange={handleChange('date')}
              required
            />
            {isMapped('date') && <span className="field-hint">✦ filled from chat</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Time</label>
            <input
              className={`form-input ${isMapped('time') ? 'field-mapped' : ''}`}
              type="time"
              value={form.time}
              onChange={handleChange('time')}
            />
            {isMapped('time') && <span className="field-hint">✦ filled from chat</span>}
          </div>
        </div>

        {/* Attendees */}
        <div className="form-group">
          <label className="form-label">Attendees</label>
          <input
            className={`form-input ${isMapped('attendees') ? 'field-mapped' : ''}`}
            placeholder="Enter names or search..."
            value={form.attendees}
            onChange={handleChange('attendees')}
          />
          {isMapped('attendees') && <span className="field-hint">✦ filled from chat</span>}
        </div>

        {/* Topics Discussed */}
        <div className="form-group">
          <label className="form-label">Topics Discussed</label>
          <textarea
            className={`form-input form-textarea ${isMapped('topics_discussed') ? 'field-mapped' : ''}`}
            placeholder="Enter key discussion points..."
            value={form.topics_discussed}
            onChange={handleChange('topics_discussed')}
            rows={3}
          />
          {isMapped('topics_discussed') && <span className="field-hint">✦ filled from chat</span>}
          <div className="voice-note-btn">
            <span className="mic-icon">🎤</span>
            <span>Summarize from Voice Note (Requires Consent)</span>
          </div>
        </div>

        {/* Materials & Samples */}
        <div className="form-section">
          <label className="form-section-title">Materials Shared / Samples Distributed</label>

          <div className="form-subsection">
            <div className="form-sub-label">
              Materials Shared
              {isMapped('materials_shared') && <span className="field-hint inline">✦ filled from chat</span>}
            </div>
            <div className="tag-input-row">
              <input
                className="form-input tag-input"
                placeholder="Search / Add material..."
                value={materialsInput}
                onChange={(e) => setMaterialsInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
              />
              <button type="button" className="btn-add" onClick={addMaterial}>+ Add</button>
            </div>
            {materialsList.length === 0
              ? <p className="no-items">No materials added</p>
              : <div className="tag-list">{materialsList.map((m, i) => (
                  <span key={i} className="tag">
                    {m} <button type="button" onClick={() => removeMaterial(i)}>×</button>
                  </span>
                ))}</div>
            }
          </div>

          <div className="form-subsection">
            <div className="form-sub-label">
              Samples Distributed
              {isMapped('samples_distributed') && <span className="field-hint inline">✦ filled from chat</span>}
            </div>
            <div className="tag-input-row">
              <input
                className="form-input tag-input"
                placeholder="Add sample name..."
                value={samplesInput}
                onChange={(e) => setSamplesInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSample())}
              />
              <button type="button" className="btn-add" onClick={addSample}>+ Add Sample</button>
            </div>
            {samplesList.length === 0
              ? <p className="no-items">No samples added</p>
              : <div className="tag-list">{samplesList.map((s, i) => (
                  <span key={i} className="tag tag-sample">
                    {s} <button type="button" onClick={() => removeSample(i)}>×</button>
                  </span>
                ))}</div>
            }
          </div>
        </div>

        {/* Sentiment */}
        <div className="form-group">
          <label className="form-label">
            Observed / Inferred HCP Sentiment
            {isMapped('sentiment') && <span className="field-hint inline">✦ filled from chat</span>}
          </label>
          <div className="sentiment-row">
            {SENTIMENTS.map((s) => (
              <label
                key={s}
                className={`sentiment-option sentiment-${s.toLowerCase()} ${form.sentiment === s ? 'selected' : ''} ${isMapped('sentiment') && form.sentiment === s ? 'mapped-glow' : ''}`}
              >
                <input
                  type="radio"
                  name="sentiment"
                  value={s}
                  checked={form.sentiment === s}
                  onChange={handleChange('sentiment')}
                />
                <span className="sentiment-dot"></span>
                {s}
              </label>
            ))}
          </div>
        </div>

        {/* Outcomes */}
        <div className="form-group">
          <label className="form-label">Outcomes</label>
          <textarea
            className={`form-input form-textarea ${isMapped('outcomes') ? 'field-mapped' : ''}`}
            placeholder="Key outcomes or agreements..."
            value={form.outcomes}
            onChange={handleChange('outcomes')}
            rows={2}
          />
          {isMapped('outcomes') && <span className="field-hint">✦ filled from chat</span>}
        </div>

        {/* Follow-up Actions */}
        <div className="form-group">
          <label className="form-label">Follow-up Actions</label>
          <textarea
            className={`form-input form-textarea ${isMapped('followup_actions') ? 'field-mapped' : ''}`}
            placeholder="Enter next steps or tasks..."
            value={form.followup_actions}
            onChange={handleChange('followup_actions')}
            rows={2}
          />
          {isMapped('followup_actions') && <span className="field-hint">✦ filled from chat</span>}
        </div>

        {/* AI Suggested Follow-ups */}
        {aiSuggestedFollowups?.length > 0 && (
          <div className="ai-followup-box">
            <div className="ai-followup-title"><span className="ai-dot">✦</span> AI Suggested Follow-ups</div>
            <ul className="ai-followup-list">
              {aiSuggestedFollowups.map((s, i) => (
                <li key={i}><span className="bullet">›</span> {s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit */}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handleReset}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting
              ? <><span className="spinner" /> Logging...</>
              : <><span>📋</span> Log Interaction</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}

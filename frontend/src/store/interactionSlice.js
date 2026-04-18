import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

export const submitInteraction = createAsyncThunk(
  'interaction/submit',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/interactions/`, formData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: 'Server error' });
    }
  }
);

export const fetchInteractions = createAsyncThunk(
  'interaction/fetchAll',
  async (hcpName = null, { rejectWithValue }) => {
    try {
      const url = hcpName
        ? `${API_BASE}/interactions/?hcp_name=${hcpName}`
        : `${API_BASE}/interactions/`;
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: 'Server error' });
    }
  }
);

export const updateInteraction = createAsyncThunk(
  'interaction/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE}/interactions/${id}`, data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: 'Server error' });
    }
  }
);

const today = new Date().toISOString().split('T')[0];
const now = new Date().toTimeString().slice(0, 5);

const blankForm = {
  hcp_name: '',
  interaction_type: 'Meeting',
  date: today,
  time: now,
  attendees: '',
  topics_discussed: '',
  materials_shared: '',
  samples_distributed: '',
  sentiment: 'Neutral',
  outcomes: '',
  followup_actions: '',
};

const initialState = {
  form: { ...blankForm },
  submitting: false,
  submitSuccess: false,
  submitError: null,
  interactions: [],
  loading: false,
  aiSuggestedFollowups: [],
  chatMappedFields: [],
};

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    updateField: (state, action) => {
      const { field, value } = action.payload;
      state.form[field] = value;
    },
    resetForm: (state) => {
      state.form = { ...blankForm };
      state.submitSuccess = false;
      state.submitError = null;
      state.aiSuggestedFollowups = [];
      state.chatMappedFields = [];
    },
    setAiFollowups: (state, action) => {
      state.aiSuggestedFollowups = action.payload;
    },
    clearError: (state) => {
      state.submitError = null;
    },
    populateFromChat: (state, action) => {
      const data = action.payload;
      const FIELD_KEYS = [
        'hcp_name','interaction_type','date','time',
        'attendees','topics_discussed','materials_shared',
        'samples_distributed','sentiment','outcomes','followup_actions',
      ];
      const mapped = [];
      FIELD_KEYS.forEach((key) => {
        if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== '') {
          state.form[key] = String(data[key]).trim();
          mapped.push(key);
        }
      });
      if (state.form.sentiment) {
        const s = state.form.sentiment.toLowerCase();
        if (s.includes('pos')) state.form.sentiment = 'Positive';
        else if (s.includes('neg')) state.form.sentiment = 'Negative';
        else state.form.sentiment = 'Neutral';
      }
      state.chatMappedFields = mapped;
      state.submitSuccess = false;
      state.submitError = null;
    },
    clearMappedHighlight: (state) => {
      state.chatMappedFields = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitInteraction.pending, (state) => {
        state.submitting = true;
        state.submitSuccess = false;
        state.submitError = null;
      })
      .addCase(submitInteraction.fulfilled, (state, action) => {
        state.submitting = false;
        state.submitSuccess = true;
        state.chatMappedFields = [];
        const followups = action.payload?.interaction?.ai_suggested_followups;
        if (followups) {
          try {
            state.aiSuggestedFollowups = JSON.parse(followups.replace(/'/g, '"'));
          } catch {
            state.aiSuggestedFollowups = [followups];
          }
        }
      })
      .addCase(submitInteraction.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload?.detail || 'Failed to log interaction';
      })
      .addCase(fetchInteractions.pending, (state) => { state.loading = true; })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.interactions = action.payload.interactions || [];
      })
      .addCase(fetchInteractions.rejected, (state) => { state.loading = false; })
      .addCase(updateInteraction.fulfilled, (state) => { state.submitSuccess = true; });
  },
});

export const {
  updateField, resetForm, setAiFollowups, clearError,
  populateFromChat, clearMappedHighlight,
} = interactionSlice.actions;
export default interactionSlice.reducer;

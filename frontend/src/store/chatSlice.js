import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, history }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/chat/`, {
        message,
        conversation_history: history,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: 'Chat error' });
    }
  }
);

const initialState = {
  messages: [
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI assistant. You can log interactions by describing them naturally — e.g., "Met Dr. Smith today, discussed Product X efficacy, positive sentiment" — or ask me to show history, suggest follow-ups, or analyze sentiment.',
    },
  ],
  loading: false,
  error: null,
  lastToolUsed: null,
  lastExtractedData: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addUserMessage: (state, action) => {
      state.messages.push({ role: 'user', content: action.payload });
    },
    clearChat: (state) => {
      state.messages = [initialState.messages[0]];
      state.lastToolUsed = null;
      state.lastExtractedData = null;
    },
    clearChatError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.lastToolUsed = action.payload.tool_used;
        state.lastExtractedData = action.payload.extracted_data;
        state.messages.push({
          role: 'assistant',
          content: action.payload.response,
          tool_used: action.payload.tool_used,
          extracted_data: action.payload.extracted_data,
        });
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.detail || 'Failed to get response';
        state.messages.push({
          role: 'assistant',
          content: '⚠️ Sorry, I encountered an error. Please try again.',
        });
      });
  },
});

export const { addUserMessage, clearChat, clearChatError } = chatSlice.actions;
export default chatSlice.reducer;

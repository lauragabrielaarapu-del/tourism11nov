/**
 * VoyageAI — Luxury & Global Tourism Concierge
 * Frontend Application Controller
 */

// Application State
const state = {
  currentPersona: 'general',
  personaLabels: {
    general: 'All-Rounder Mode',
    luxury: 'Luxury & VIP Mode',
    budget: 'Backpacker Budget Mode',
    foodie: 'Food & Culinary Mode',
    family: 'Family Friendly Mode',
    adventure: 'Adventure & Nature Mode'
  },
  conversation: [],
  isGenerating: false,
  voiceEnabled: false,
  isRecording: false,
  recognition: null
};

// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const messagesFeed = document.getElementById('messagesFeed');
const welcomeHero = document.getElementById('welcomeHero');
const typingIndicator = document.getElementById('typingIndicator');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const voiceToggleBtn = document.getElementById('voiceToggleBtn');
const currentPersonaTag = document.getElementById('currentPersonaTag');
const azureModelDisplay = document.getElementById('azureModelDisplay');

// Sidebar & Mobile Nav
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('openSidebarBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');

// Trip Modal Elements
const tripModal = document.getElementById('tripModal');
const openTripModalBtn = document.getElementById('openTripModalBtn');
const modalOpenTrigger = document.getElementById('modalOpenTrigger');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const generateWizardBtn = document.getElementById('generateWizardBtn');
const wizardDays = document.getElementById('wizardDays');
const daysValueDisplay = document.getElementById('daysValueDisplay');
const wizardDestination = document.getElementById('wizardDestination');
const wizardBudget = document.getElementById('wizardBudget');

// Toast Element
const toast = document.getElementById('toast');

// Initialize Marked Options
if (window.marked) {
  marked.setOptions({
    gfm: true,
    breaks: true
  });
}

// ===================================================================
// INITIALIZATION
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  initHealthCheck();
  initSpeechRecognition();
  setupEventListeners();
  autoResizeTextarea();
});

// Check Server & Azure OpenAI Status
async function initHealthCheck() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.status === 'online') {
      azureModelDisplay.textContent = `${data.deployment || 'Azure gpt-5-mini'}`;
    }
  } catch (err) {
    console.warn('Backend status check error:', err);
    azureModelDisplay.textContent = 'Azure OpenAI (Local)';
  }
}

// ===================================================================
// EVENT LISTENERS
// ===================================================================
function setupEventListeners() {
  // Sending Messages
  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Textarea auto-resize
  chatInput.addEventListener('input', autoResizeTextarea);

  // Clear Chat
  clearChatBtn.addEventListener('click', resetChat);

  // Voice Readout Toggle
  voiceToggleBtn.addEventListener('click', () => {
    state.voiceEnabled = !state.voiceEnabled;
    voiceToggleBtn.classList.toggle('active', state.voiceEnabled);
    if (!state.voiceEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    showToast(state.voiceEnabled ? '🔊 Voice narration activated' : '🔇 Voice narration muted');
  });

  // Microphone Speech Recognition
  if (micBtn) {
    micBtn.addEventListener('click', toggleSpeechRecognition);
  }

  // Sidebar Persona Buttons
  document.querySelectorAll('.persona-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.persona-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const persona = btn.dataset.persona;
      state.currentPersona = persona;
      currentPersonaTag.textContent = state.personaLabels[persona] || 'Explorer Mode';
      showToast(`Switched persona to: ${btn.querySelector('span').textContent}`);
    });
  });

  // Sidebar Quick Nav Items
  document.querySelectorAll('.quick-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (prompt) {
        closeSidebar();
        submitPrompt(prompt);
      }
    });
  });

  // Trending Destination Badges
  document.querySelectorAll('.dest-badge').forEach(badge => {
    badge.addEventListener('click', () => {
      const dest = badge.dataset.dest;
      closeSidebar();
      submitPrompt(`Tell me everything a traveler needs to know about visiting ${dest}: best months to visit, top 4 highlights, local food specialties, and budget recommendations.`);
    });
  });

  // Featured Cards in Hero
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      if (prompt) {
        submitPrompt(prompt);
      }
    });
  });

  // Suggestion Chips Carousel
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (prompt) {
        submitPrompt(prompt);
      }
    });
  });

  // Mobile Sidebar Toggle
  if (openSidebarBtn) openSidebarBtn.addEventListener('click', openSidebar);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);

  // Modal Handling
  if (openTripModalBtn) openTripModalBtn.addEventListener('click', openModal);
  if (modalOpenTrigger) modalOpenTrigger.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

  // Close modal when clicking outside
  if (tripModal) {
    tripModal.addEventListener('click', (e) => {
      if (e.target === tripModal) closeModal();
    });
  }

  // Modal Days Slider
  if (wizardDays) {
    wizardDays.addEventListener('input', () => {
      daysValueDisplay.textContent = `${wizardDays.value} ${wizardDays.value === '1' ? 'Day' : 'Days'}`;
    });
  }

  // Modal Travel Pace Pills
  document.querySelectorAll('.pill-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.pill-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });

  // Wizard Generation Button
  if (generateWizardBtn) {
    generateWizardBtn.addEventListener('click', handleWizardSubmit);
  }
}

// ===================================================================
// SIDEBAR HELPERS
// ===================================================================
function openSidebar() {
  sidebar.classList.add('open');
}

function closeSidebar() {
  sidebar.classList.remove('open');
}

// ===================================================================
// MODAL HELPERS
// ===================================================================
function openModal() {
  tripModal.style.display = 'flex';
  wizardDestination.focus();
}

function closeModal() {
  tripModal.style.display = 'none';
}

function handleWizardSubmit() {
  const dest = wizardDestination.value.trim() || 'Dubai';
  const days = wizardDays.value || 3;
  const budget = wizardBudget.value || 'moderate';
  
  const activeStylePill = document.querySelector('.pill-opt.active');
  const style = activeStylePill ? activeStylePill.dataset.style : 'balanced';

  const selectedInterests = [];
  document.querySelectorAll('.interest-checkboxes input:checked').forEach(cb => {
    selectedInterests.push(cb.value);
  });

  closeModal();

  const prompt = `Please create a comprehensive ${days}-day travel itinerary for ${dest}.
- Travel Style: ${style}
- Budget Tier: ${budget}
- Interests & Highlights: ${selectedInterests.join(', ')}

Please structure the guide with:
1. ✈️ Trip Overview & Best Time to Travel
2. 🗓️ Day-by-Day Schedule with Morning, Afternoon, Evening, and estimated activity costs
3. 🍴 Signature Local Foods & Recommended Dining
4. 🚇 Transportation & Navigating the City
5. 🧳 Insider Etiquette & Money-Saving Tips`;

  submitPrompt(prompt);
}

// ===================================================================
// CHAT & MESSAGING LOGIC
// ===================================================================
function autoResizeTextarea() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
}

function submitPrompt(text) {
  chatInput.value = text;
  handleSendMessage();
}

async function handleSendMessage() {
  const text = chatInput.value.trim();
  if (!text || state.isGenerating) return;

  // Clear input
  chatInput.value = '';
  autoResizeTextarea();

  // Hide hero if visible
  if (welcomeHero) {
    welcomeHero.style.display = 'none';
  }

  // Append user message
  appendUserMessage(text);
  state.conversation.push({ role: 'user', content: text });

  // Show typing indicator
  state.isGenerating = true;
  sendBtn.disabled = true;
  typingIndicator.style.display = 'flex';
  scrollToBottom();

  // Create Bot Message Row for streaming
  const botRow = createBotMessageElement();
  const contentBubble = botRow.querySelector('.message-bubble');
  const actionWrap = botRow.querySelector('.message-actions');

  let accumulatedContent = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.conversation,
        stream: true,
        persona: state.currentPersona
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    // Hide typing indicator once stream starts
    typingIndicator.style.display = 'none';
    messagesFeed.appendChild(botRow);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // save incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.error) {
              accumulatedContent += `\n\n*Error: ${data.error}*`;
            } else if (data.content) {
              accumulatedContent += data.content;
            }
            renderMarkdown(contentBubble, accumulatedContent);
            scrollToBottom();
          } catch (e) {
            // Partial JSON
          }
        }
      }
    }

    // Finished streaming
    state.conversation.push({ role: 'assistant', content: accumulatedContent });
    actionWrap.style.display = 'flex';
    setupMessageActionButtons(botRow, accumulatedContent);

    // Audio Narration if enabled
    if (state.voiceEnabled && accumulatedContent) {
      speakText(accumulatedContent);
    }

  } catch (error) {
    console.error('Chat error:', error);
    typingIndicator.style.display = 'none';
    
    if (!messagesFeed.contains(botRow)) {
      messagesFeed.appendChild(botRow);
    }
    contentBubble.innerHTML = `<p style="color: #f43f5e;"><i class="fa-solid fa-triangle-exclamation"></i> <strong>Oops!</strong> Unable to reach Azure OpenAI. Error: ${error.message}. Please check your connection and retry.</p>`;
    actionWrap.style.display = 'none';
  } finally {
    state.isGenerating = false;
    sendBtn.disabled = false;
    scrollToBottom();
  }
}

// User Message DOM
function appendUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'message-row user-row';
  row.innerHTML = `
    <div class="message-content-wrap">
      <div class="message-bubble">${escapeHtml(text)}</div>
      <div class="message-meta">
        <span>You</span> • <span>${getCurrentTime()}</span>
      </div>
    </div>
    <div class="message-avatar">
      <i class="fa-solid fa-user"></i>
    </div>
  `;
  messagesFeed.appendChild(row);
  scrollToBottom();
}

// Bot Message DOM Structure
function createBotMessageElement() {
  const row = document.createElement('div');
  row.className = 'message-row bot-row';
  row.innerHTML = `
    <div class="message-avatar">
      <i class="fa-solid fa-compass"></i>
    </div>
    <div class="message-content-wrap">
      <div class="message-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
      <div class="message-meta">
        <span>VoyageAI Concierge</span> • <span>${getCurrentTime()}</span>
      </div>
      <div class="message-actions" style="display: none;">
        <button class="msg-action-btn copy-btn" title="Copy to clipboard">
          <i class="fa-regular fa-copy"></i> Copy
        </button>
        <button class="msg-action-btn speak-btn" title="Listen to itinerary">
          <i class="fa-solid fa-volume-high"></i> Listen
        </button>
        <button class="msg-action-btn export-btn" title="Download as text file">
          <i class="fa-solid fa-file-arrow-down"></i> Export
        </button>
      </div>
    </div>
  `;
  return row;
}

// Markdown parser
function renderMarkdown(element, markdownText) {
  if (window.marked) {
    element.innerHTML = marked.parse(markdownText);
  } else {
    element.innerText = markdownText;
  }
}

// Setup action buttons on each bot message
function setupMessageActionButtons(botRow, text) {
  const copyBtn = botRow.querySelector('.copy-btn');
  const speakBtn = botRow.querySelector('.speak-btn');
  const exportBtn = botRow.querySelector('.export-btn');

  // Copy Button
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        showToast('📋 Copied itinerary to clipboard');
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
        }, 2000);
      });
    });
  }

  // Speak Button
  if (speakBtn) {
    speakBtn.addEventListener('click', () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
      } else {
        speakText(text, speakBtn);
      }
    });
  }

  // Export File Button
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportAsFile(text);
    });
  }
}

// Download Itinerary as .md or .txt
function exportAsFile(text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `VoyageAI-Trip-Plan-${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 Itinerary downloaded successfully');
}

// Text to Speech
function speakText(text, btnElement = null) {
  if (!('speechSynthesis' in window)) {
    showToast('⚠️ Speech synthesis is not supported on this browser.');
    return;
  }

  window.speechSynthesis.cancel();

  // Clean Markdown characters for smooth speech
  const cleanText = text
    .replace(/[#*_`~>]/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

  if (btnElement) {
    btnElement.innerHTML = '<i class="fa-solid fa-stop"></i> Stop';
    utterance.onend = () => {
      btnElement.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
    };
    utterance.onerror = () => {
      btnElement.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
    };
  }

  window.speechSynthesis.speak(utterance);
}

// Speech to text dictation
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (micBtn) micBtn.style.display = 'none';
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = false;
  state.recognition.interimResults = false;
  state.recognition.lang = 'en-US';

  state.recognition.onstart = () => {
    state.isRecording = true;
    micBtn.classList.add('recording');
    showToast('🎙️ Listening... speak now');
  };

  state.recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    chatInput.value = chatInput.value ? `${chatInput.value} ${transcript}` : transcript;
    autoResizeTextarea();
  };

  state.recognition.onerror = (e) => {
    console.warn('Speech recognition error:', e.error);
    stopSpeechRecognition();
  };

  state.recognition.onend = () => {
    stopSpeechRecognition();
  };
}

function toggleSpeechRecognition() {
  if (!state.recognition) {
    showToast('⚠️ Voice recognition not supported on this browser.');
    return;
  }

  if (state.isRecording) {
    state.recognition.stop();
  } else {
    try {
      state.recognition.start();
    } catch (e) {
      console.warn(e);
    }
  }
}

function stopSpeechRecognition() {
  state.isRecording = false;
  if (micBtn) micBtn.classList.remove('recording');
}

// Reset Conversation
function resetChat() {
  state.conversation = [];
  messagesFeed.innerHTML = '';
  if (welcomeHero) welcomeHero.style.display = 'flex';
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  showToast('🗑️ Conversation reset. Start a new journey!');
}

// Utility: Scroll to bottom
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Utility: Show Toast
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

// Utility: Get current time
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

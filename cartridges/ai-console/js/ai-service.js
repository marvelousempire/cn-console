/**
 * AI Service - Unified AI client for ai-console
 * 
 * Provides a single interface to:
 * - Ollama (default)
 * - OpenAI (fallback)
 * - Claude (fallback)
 * - RAG context injection
 * 
 * @version 1.0.0
 */

export class AIService {
  constructor(options = {}) {
    this.settings = options.settings || {};
    this.provider = options.provider || 'ollama';
    
    // Use server proxy to avoid CORS issues
    this.aiProxyUrl = options.aiProxyUrl || '/api/ai';
    
    // Provider configurations
    this.providers = {
      ollama: {
        // Uses server proxy at /api/ai
        model: options.ollamaModel || 'llama3.2'
      },
      openai: {
        apiKey: options.openaiKey || null,
        model: options.openaiModel || 'gpt-4'
      },
      claude: {
        apiKey: options.claudeKey || null,
        model: options.claudeModel || 'claude-3-sonnet-20240229'
      }
    };
    
    // RAG configuration
    this.ragEnabled = options.ragEnabled !== false;
    this.ragBaseUrl = options.ragBaseUrl || '/api/rag';
    
    // System prompt
    this.systemPrompt = options.systemPrompt || 
      'You are Sunday AI, a helpful assistant for the Quick Server platform. ' +
      'You help users manage WordPress sites, Docker containers, and development workflows. ' +
      'Be concise and helpful.';
    
    // Conversation history
    this.conversationHistory = [];
    this.maxHistoryLength = options.maxHistoryLength || 20;
    
    // Event handlers
    this.onToken = options.onToken || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Set the active provider
   */
  setProvider(provider) {
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    this.provider = provider;
  }

  /**
   * Check if current provider is available
   */
  async checkProvider() {
    if (this.provider === 'ollama') {
      try {
        const res = await fetch(`${this.aiProxyUrl}/status`);
        if (!res.ok) return false;
        const data = await res.json();
        return data.ollama?.available === true;
      } catch {
        return false;
      }
    }
    
    // For API providers, just check if key is set
    return !!this.providers[this.provider]?.apiKey;
  }

  /**
   * Get RAG context for a query
   */
  async getRAGContext(query, options = {}) {
    if (!this.ragEnabled) return null;
    
    try {
      const res = await fetch(`${this.ragBaseUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          limit: options.limit || 5,
          cartridgeId: options.cartridgeId || null
        })
      });
      
      if (!res.ok) return null;
      
      const data = await res.json();
      return data.results || [];
    } catch (e) {
      console.warn('[AIService] RAG query failed:', e.message);
      return null;
    }
  }

  /**
   * Build context from RAG results
   */
  buildRAGContextString(ragResults) {
    if (!ragResults || ragResults.length === 0) return '';
    
    const contextParts = ragResults.map(r => 
      `[${r.type}: ${r.title}]\n${r.snippet || r.content?.substring(0, 500) || ''}`
    );
    
    return `\n\n---\nRelevant context from the knowledge base:\n${contextParts.join('\n\n')}\n---\n`;
  }

  /**
   * Send a chat message and get response
   */
  async chat(message, options = {}) {
    const includeRAG = options.includeRAG !== false && this.ragEnabled;
    const stream = options.stream !== false;
    
    // Get RAG context if enabled
    let ragContext = '';
    if (includeRAG) {
      const ragResults = await this.getRAGContext(message);
      ragContext = this.buildRAGContextString(ragResults);
    }
    
    // Build messages array
    const messages = [
      { role: 'system', content: this.systemPrompt + ragContext }
    ];
    
    // Add conversation history
    messages.push(...this.conversationHistory.slice(-this.maxHistoryLength));
    
    // Add current message
    messages.push({ role: 'user', content: message });
    
    // Route to appropriate provider
    let response;
    if (stream) {
      response = await this._chatStream(messages, options);
    } else {
      response = await this._chat(messages, options);
    }
    
    // Update history
    if (response.success) {
      this.conversationHistory.push({ role: 'user', content: message });
      this.conversationHistory.push({ role: 'assistant', content: response.content });
    }
    
    return response;
  }

  /**
   * Non-streaming chat
   */
  async _chat(messages, options = {}) {
    const provider = options.provider || this.provider;
    
    switch (provider) {
      case 'ollama':
        return this._chatOllama(messages, options);
      case 'openai':
        return this._chatOpenAI(messages, options);
      case 'claude':
        return this._chatClaude(messages, options);
      default:
        return { success: false, error: `Unknown provider: ${provider}` };
    }
  }

  /**
   * Streaming chat
   */
  async _chatStream(messages, options = {}) {
    const provider = options.provider || this.provider;
    
    switch (provider) {
      case 'ollama':
        return this._chatOllamaStream(messages, options);
      case 'openai':
        return this._chatOpenAIStream(messages, options);
      case 'claude':
        return this._chatClaudeStream(messages, options);
      default:
        return { success: false, error: `Unknown provider: ${provider}` };
    }
  }

  /**
   * Ollama chat (non-streaming) - Uses server proxy
   */
  async _chatOllama(messages, options = {}) {
    const config = this.providers.ollama;
    
    try {
      const res = await fetch(`${this.aiProxyUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: options.model || config.model,
          stream: false,
          systemPrompt: this.systemPrompt
        })
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Ollama request failed');
      }
      
      const data = await res.json();
      return {
        success: true,
        content: data.content || '',
        provider: 'ollama',
        model: options.model || config.model
      };
    } catch (e) {
      return { success: false, error: e.message, provider: 'ollama' };
    }
  }

  /**
   * Ollama chat (streaming) - Uses server proxy
   */
  async _chatOllamaStream(messages, options = {}) {
    const config = this.providers.ollama;
    const onToken = options.onToken || this.onToken;
    
    try {
      const res = await fetch(`${this.aiProxyUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: options.model || config.model,
          stream: true,
          systemPrompt: this.systemPrompt
        })
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Ollama request failed');
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              fullContent += json.message.content;
              onToken(json.message.content, fullContent);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
      
      this.onComplete(fullContent);
      return {
        success: true,
        content: fullContent,
        provider: 'ollama',
        model: options.model || config.model
      };
    } catch (e) {
      this.onError(e);
      return { success: false, error: e.message, provider: 'ollama' };
    }
  }

  /**
   * OpenAI chat (streaming)
   */
  async _chatOpenAIStream(messages, options = {}) {
    const config = this.providers.openai;
    const onToken = options.onToken || this.onToken;
    
    if (!config.apiKey) {
      return { success: false, error: 'OpenAI API key not configured', provider: 'openai' };
    }
    
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || config.model,
          messages,
          stream: true
        })
      });
      
      if (!res.ok) throw new Error('OpenAI request failed');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onToken(content, fullContent);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
      
      this.onComplete(fullContent);
      return {
        success: true,
        content: fullContent,
        provider: 'openai',
        model: options.model || config.model
      };
    } catch (e) {
      this.onError(e);
      return { success: false, error: e.message, provider: 'openai' };
    }
  }

  /**
   * Claude chat (streaming)
   */
  async _chatClaudeStream(messages, options = {}) {
    const config = this.providers.claude;
    const onToken = options.onToken || this.onToken;
    
    if (!config.apiKey) {
      return { success: false, error: 'Claude API key not configured', provider: 'claude' };
    }
    
    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model || config.model,
          max_tokens: 4096,
          system: systemMessage,
          messages: chatMessages,
          stream: true
        })
      });
      
      if (!res.ok) throw new Error('Claude request failed');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        
        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === 'content_block_delta' && json.delta?.text) {
              fullContent += json.delta.text;
              onToken(json.delta.text, fullContent);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
      
      this.onComplete(fullContent);
      return {
        success: true,
        content: fullContent,
        provider: 'claude',
        model: options.model || config.model
      };
    } catch (e) {
      this.onError(e);
      return { success: false, error: e.message, provider: 'claude' };
    }
  }

  /**
   * Non-streaming versions for OpenAI and Claude
   */
  async _chatOpenAI(messages, options = {}) {
    const config = this.providers.openai;
    
    if (!config.apiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }
    
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || config.model,
          messages,
          stream: false
        })
      });
      
      if (!res.ok) throw new Error('OpenAI request failed');
      
      const data = await res.json();
      return {
        success: true,
        content: data.choices?.[0]?.message?.content || '',
        provider: 'openai'
      };
    } catch (e) {
      return { success: false, error: e.message, provider: 'openai' };
    }
  }

  async _chatClaude(messages, options = {}) {
    const config = this.providers.claude;
    
    if (!config.apiKey) {
      return { success: false, error: 'Claude API key not configured' };
    }
    
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model || config.model,
          max_tokens: 4096,
          system: systemMessage,
          messages: chatMessages
        })
      });
      
      if (!res.ok) throw new Error('Claude request failed');
      
      const data = await res.json();
      return {
        success: true,
        content: data.content?.[0]?.text || '',
        provider: 'claude'
      };
    } catch (e) {
      return { success: false, error: e.message, provider: 'claude' };
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return [...this.conversationHistory];
  }

  /**
   * Export conversation as JSON
   */
  exportConversation() {
    return JSON.stringify({
      provider: this.provider,
      timestamp: new Date().toISOString(),
      messages: this.conversationHistory
    }, null, 2);
  }
}

export default AIService;

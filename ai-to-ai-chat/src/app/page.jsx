 'use client';
import React, { useEffect, useMemo, useState } from 'react';

const defaultAgents = {
  first: { label: 'Agent 01', provider: 'ollama', model: 'llama3.2', systemPrompt: 'You are the first agent. Turn the user’s initial idea into one sharp, open-ended question for a second AI agent. Return only the question.' },
  second: { label: 'Agent 02', provider: 'openai', model: 'gpt-5.6-luna', systemPrompt: '' },
};

const providerMeta = {
  openai: { label: 'OpenAI', color: 'green' },
  gemini: { label: 'Gemini', color: 'blue' },
  ollama: { label: 'Ollama', color: 'purple' },
  lmstudio: { label: 'LM Studio', color: 'orange' },
};

function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [agents, setAgents] = useState(defaultAgents);
  const [idea, setIdea] = useState('How might we make a weekly team update feel less like a status report?');
  const [question, setQuestion] = useState('');
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [trace, setTrace] = useState([]);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [ideaLoading, setIdeaLoading] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(response => response.ok ? response.json() : null)
      .then(config => {
        if (!config?.models) return;
        setAgents(current => ({
          ...current,
          first: { ...current.first, model: config.models[current.first.provider] || current.first.model },
          second: { ...current.second, model: config.models[current.second.provider] || current.second.model },
        }));
      })
      .catch(() => {});
  }, []);

  const activeAgent = phase === 'question' || phase === 'idea' || phase === 'review' ? agents.first : agents.second;
  const phaseLabel = useMemo(() => ({ idle: 'Ready', idea: 'Generating idea', question: 'Agent 01 is thinking', confirm: 'Your review is needed', response: 'Agent 02 is thinking', review: 'Agent 01 is reviewing', followup: 'Your review is needed', complete: 'Conversation complete' }[phase]), [phase]);

  function updateAgent(side, field, value) {
    setAgents(current => ({ ...current, [side]: { ...current[side], [field]: value } }));
  }

  function addTrace(entry) {
    setTrace(current => [{ id: crypto.randomUUID(), time: now(), ...entry }, ...current]);
  }

  async function request(path, body, traceInfo) {
    addTrace({ ...traceInfo, status: 'sending', detail: `POST ${path}` });
    const started = Date.now();
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    addTrace({ ...traceInfo, status: 'received', detail: `${data.api} · ${data.durationMs}ms`, durationMs: Date.now() - started });
    return data;
  }

  async function generateQuestion() {
    if (!idea.trim() || phase === 'question' || phase === 'response') return;
    setError(''); setQuestion(''); setFollowUpQuestion(''); setPhase('question');
    setMessages([{ id: crypto.randomUUID(), type: 'idea', label: 'Your initial idea', text: idea.trim(), time: now() }]);
    try {
      const result = await request('/api/generate', { kind: 'question', idea, agent: agents.first }, { step: '01', agent: agents.first.label, provider: agents.first.provider, model: agents.first.model });
      setQuestion(result.text);
      setMessages(current => [...current, { id: crypto.randomUUID(), type: 'agent', agent: 'first', label: agents.first.label, provider: result.provider, model: result.model, text: result.text, time: now() }]);
      setPhase('confirm');
    } catch (requestError) { setError(requestError.message); setPhase('idle'); }
  }

  async function sendToSecond() {
    if (!question.trim() || phase === 'response') return;
    setError(''); setPhase('response');
    setMessages(current => [...current, { id: crypto.randomUUID(), type: 'handoff', label: 'Approved handoff', text: 'Question confirmed and sent to Agent 02.', time: now() }]);
    try {
      const result = await request('/api/generate', { kind: 'response', idea, question, agent: agents.second }, { step: '02', agent: agents.second.label, provider: agents.second.provider, model: agents.second.model });
      setMessages(current => [...current, { id: crypto.randomUUID(), type: 'agent', agent: 'second', label: agents.second.label, provider: result.provider, model: result.model, text: result.text, time: now() }]);
      setPhase('review');
      const review = await request('/api/evaluate', { idea, question, answer: result.text, agent: agents.first }, { step: '03', agent: agents.first.label, provider: agents.first.provider, model: agents.first.model });
      if (review.evaluation.sufficient) {
        setMessages(current => [...current, { id: crypto.randomUUID(), type: 'review', label: `${agents.first.label} review`, text: `Sufficient answer. ${review.evaluation.rationale}`, time: now() }]);
        setPhase('complete');
      } else {
        const nextQuestion = review.evaluation.followUpQuestion?.trim();
        if (!nextQuestion) throw new Error('Agent 01 marked the answer insufficient but did not provide a follow-up question.');
        setFollowUpQuestion(nextQuestion);
        setMessages(current => [...current, { id: crypto.randomUUID(), type: 'review', label: `${agents.first.label} review`, text: `More detail is needed. ${review.evaluation.rationale}`, time: now() }, { id: crypto.randomUUID(), type: 'agent', agent: 'first', label: `${agents.first.label} · follow-up`, provider: agents.first.provider, model: agents.first.model, text: nextQuestion, time: now() }]);
        setPhase('followup');
      }
    } catch (requestError) { setError(requestError.message); setPhase('confirm'); }
  }

  async function sendFollowUp() {
    if (!followUpQuestion.trim() || phase === 'response') return;
    setError(''); setPhase('response');
    setMessages(current => [...current, { id: crypto.randomUUID(), type: 'handoff', label: 'Approved follow-up', text: 'Follow-up question confirmed and sent to Agent 02.', time: now() }]);
    try {
      const result = await request('/api/generate', { kind: 'followup', idea, question: followUpQuestion, agent: agents.second }, { step: '04', agent: agents.second.label, provider: agents.second.provider, model: agents.second.model });
      setMessages(current => [...current, { id: crypto.randomUUID(), type: 'agent', agent: 'second', label: agents.second.label, provider: result.provider, model: result.model, text: result.text, time: now() }, { id: crypto.randomUUID(), type: 'review', label: 'Review complete', text: 'One follow-up round is complete. You can start a new run to continue exploring.', time: now() }]);
      setPhase('complete');
    } catch (requestError) { setError(requestError.message); setPhase('followup'); }
  }

  async function generateIdea() {
    if (ideaLoading) return;
    setIdeaLoading(true); setError(''); setPhase('idea');
    try {
      const result = await request('/api/idea', { agent: agents.first }, { step: '00', agent: agents.first.label, provider: agents.first.provider, model: agents.first.model });
      setIdea(result.text); setPhase('idle');
    } catch (requestError) { setError(requestError.message); setPhase('idle'); }
    finally { setIdeaLoading(false); }
  }

  function reset() { setQuestion(''); setFollowUpQuestion(''); setMessages([]); setTrace([]); setError(''); setPhase('idle'); }

  return <div className={`app ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="brand-icon"><span></span><span></span><span></span></div><span>relay studio</span></div>
      <div className="sidebar-scroll">
        <div className="sidebar-section-heading"><span>Configuration</span><span className="mono muted">LIVE</span></div>
        <AgentConfig side="first" agent={agents.first} updateAgent={updateAgent} number="01" />
        <AgentConfig side="second" agent={agents.second} updateAgent={updateAgent} number="02" />
        <div className="key-note"><span className="lock">⌁</span><span>API keys stay on the server.<br />Configure them in <code>.env</code>.</span></div>
      </div>
      <div className="sidebar-footer"><span className="status-dot"></span>Local relay · v1.0</div>
    </aside>

    <main className="main">
      <header className="topbar"><button className="icon-button" onClick={() => setSidebarOpen(open => !open)} aria-label="Toggle configuration sidebar">☰</button><div className="top-title"><span className="green-dot"></span><span>Two-agent workspace</span></div><button className="new-button" onClick={reset}>＋ New run</button></header>
      <div className="workspace">
        <section className="chat-column">
          <div className="chat-header"><div><p className="kicker">Agent conversation</p><h1>Explore an idea together.</h1></div><div className="phase"><span className={`phase-dot ${phase}`}></span>{phaseLabel}</div></div>
          <div className="chat-scroll">
            {messages.length === 0 && <div className="welcome"><div className="welcome-mark">↗</div><h2>Start with an idea.</h2><p>Agent 01 will turn it into a question. You decide whether Agent 02 gets to answer.</p></div>}
            {messages.map(message => <ChatMessage key={message.id} message={message} />)}
            {phase === 'question' && <TypingMessage agent={agents.first} label="Generating a question" />}
            {phase === 'response' && <TypingMessage agent={agents.second} label="Thinking about the question" />}
            {phase === 'review' && <TypingMessage agent={agents.first} label="Checking whether the answer is sufficient" />}
            {error && <div className="error-card"><strong>Request failed</strong><span>{error}</span></div>}
          </div>
          <div className="composer-wrap">
            {(phase === 'confirm' || phase === 'followup') && <div className="approval-card"><div><span className="approval-label">Approval needed</span><strong>{phase === 'followup' ? `Send Agent 01’s follow-up to ${agents.second.label}?` : `Send this question to ${agents.second.label}?`}</strong></div><button className="confirm-button" onClick={phase === 'followup' ? sendFollowUp : sendToSecond}>Confirm & send <span>↗</span></button></div>}
            <div className="composer"><textarea value={idea} onChange={event => setIdea(event.target.value)} placeholder="Start with an idea…" rows="2" /><div className="composer-actions"><button className="idea-button" onClick={generateIdea} disabled={ideaLoading}><span>✦</span>{ideaLoading ? 'Generating…' : 'Surprise me'}</button><button className="send-button" onClick={generateQuestion} disabled={!idea.trim() || ['question', 'response', 'review'].includes(phase)}>{phase === 'question' || phase === 'review' ? 'Working…' : 'Send to Agent 01'} <span>↗</span></button></div></div>
          </div>
        </section>
        <TracePanel trace={trace} activeAgent={activeAgent} phase={phase} />
      </div>
    </main>
  </div>;
}

function AgentConfig({ side, agent, updateAgent, number }) {
  return <details className="agent-config" open>
    <summary><span className={`agent-badge ${providerMeta[agent.provider].color}`}>{number}</span><span>{agent.label}</span><span className="chevron">⌄</span></summary>
    <div className="config-fields"><label>Agent name<input value={agent.label} onChange={event => updateAgent(side, 'label', event.target.value)} /></label><label>Provider<select value={agent.provider} onChange={event => updateAgent(side, 'provider', event.target.value)}><option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="ollama">Ollama</option><option value="lmstudio">LM Studio</option></select></label><label>Model<input value={agent.model} onChange={event => updateAgent(side, 'model', event.target.value)} /></label><label>System prompt<textarea value={agent.systemPrompt} onChange={event => updateAgent(side, 'systemPrompt', event.target.value)} placeholder="Optional — leave blank for no system prompt." rows="5" /></label></div>
  </details>;
}

function ChatMessage({ message }) {
  if (message.type === 'idea') return <div className="message user-message"><div className="message-meta"><span className="user-avatar">You</span><span>{message.label}</span><time>{message.time}</time></div><div className="bubble user-bubble">{message.text}</div></div>;
  if (message.type === 'handoff') return <div className="handoff"><span>↗</span><span>{message.text}</span><time>{message.time}</time></div>;
  if (message.type === 'review') return <div className="review-note"><span className="review-icon">✓</span><div><strong>{message.label}</strong><p>{message.text}</p></div><time>{message.time}</time></div>;
  const provider = providerMeta[message.provider];
  return <div className={`message agent-message ${message.agent}`}><div className="message-meta"><span className={`agent-avatar ${provider.color}`}>{message.agent === 'first' ? '01' : '02'}</span><span>{message.label}</span><span className={`provider-chip ${provider.color}`}>{provider.label}</span><time>{message.time}</time></div><div className="bubble agent-bubble">{message.text}</div><div className="message-foot">{message.model} · response received</div></div>;
}

function TypingMessage({ agent, label }) { return <div className="typing-row"><span className={`agent-avatar ${providerMeta[agent.provider].color}`}>{agent.label.slice(-2)}</span><span>{label}</span><i></i><i></i><i></i></div>; }

function TracePanel({ trace, activeAgent, phase }) {
  return <aside className="trace-panel"><div className="trace-heading"><div><p className="kicker">Observability</p><h2>Run trace</h2></div><span className="live-pill"><span></span> Live</span></div><div className="trace-summary"><span>{trace.length} events</span><span>{phase === 'complete' ? '2 API calls' : 'waiting'}</span></div><div className="trace-list">{trace.length === 0 ? <div className="trace-empty"><span>◌</span><p>API activity will appear here as the conversation runs.</p></div> : trace.map(item => <TraceItem item={item} key={item.id} />)}</div><div className="trace-legend"><span><i className="legend-sending"></i>Sending request</span><span><i className="legend-received"></i>Received response</span></div></aside>;
}

function TraceItem({ item }) { const meta = providerMeta[item.provider]; return <div className={`trace-item ${item.status}`}><div className="trace-line"><span className={`trace-status ${item.status}`}>{item.status === 'sending' ? '↑' : '✓'}</span><div className="trace-main"><div className="trace-top"><strong>{item.step} · {item.agent}</strong><time>{item.time}</time></div><div className="trace-call"><span className={`provider-chip ${meta.color}`}>{meta.label}</span><span>{item.model}</span></div><div className="trace-detail">{item.detail}</div></div></div></div>; }

export default App;

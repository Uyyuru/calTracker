import { useEffect, useState } from "react";
import { api } from "./api";

export default function Chat() {
  const [chatId, setChatId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await api("/api/chats?limit=1");
        let chat = data.items?.[0];
        if (!chat) {
          const created = await api("/api/chats", { method: "POST" });
          chat = created.chat;
        }
        if (cancelled) {
          return;
        }
        setChatId(chat._id);
        const history = await api(`/api/chats/${chat._id}/messages`);
        if (!cancelled) {
          setMessages(history.messages || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !chatId || sending) {
      return;
    }

    setSending(true);
    setError("");
    setDraft("");
    try {
      const data = await api(`/api/chats/${chatId}/messages`, {
        method: "POST",
        body: { content },
      });
      setMessages((current) => [...current, data.userMessage, data.assistantMessage]);
    } catch (err) {
      setDraft(content);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Chat</h1>
          <p className="lede">Ask about food, or tell it what you ate. It can log meals, goals, and reports.</p>
        </div>
      </header>
      <article className="card stack">
        <div className="chat-log">
          {loading && <p className="muted">Loading chat…</p>}
          {!loading && messages.length === 0 && (
            <p className="muted">Try “add 2 boiled eggs to breakfast today”.</p>
          )}
          {messages.map((message) => (
            <p key={message._id} className={message.role === "user" ? "bubble user" : "bubble"}>
              {message.content}
            </p>
          ))}
          {sending && <p className="muted">Thinking…</p>}
        </div>
        <form className="chat-form" onSubmit={send}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message"
            aria-label="Message"
            disabled={loading || sending}
          />
          <button type="submit" disabled={loading || sending || !draft.trim()}>
            Send
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </article>
    </section>
  );
}

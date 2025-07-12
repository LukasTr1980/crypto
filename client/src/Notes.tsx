import { useEffect, useState, useRef } from "react";

export default function Notes() {
    const [text, setText] = useState('');
    const [status, setStatus] =
        useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const lastSaved = useRef<string>('');

    useEffect(() => {
        fetch('/api/notes')
            .then(r => r.json())
            .then(({ text }) => {
                setText(text);
                lastSaved.current = text;
            })
            .catch(() => setStatus('error'));
    }, []);

    useEffect(() => {
        if (text === lastSaved.current) return;

        const id = window.setTimeout(() => {
            setStatus('saving');
            fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            })
                .then(() => {
                    lastSaved.current = text;
                    setStatus('saved');
                })
                .catch(() => setStatus('error'));
        }, 800);

        return () => clearTimeout(id);
    }, [text]);

    const label =
        status === "saving"
            ? "saving..."
            : status === "saved"
                ? "saved"
                : status === "error"
                    ? "Error"
                    : "";

    return (
        <section className="notes-section">
            <h2>Notes {label && <small>({label})</small>}</h2>

            <textarea
                className="notes-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Write your notes..."
            />
        </section>
    );
}
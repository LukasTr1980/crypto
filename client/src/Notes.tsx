import { useEffect, useState, useRef } from "react";
import { apiUrl } from "./utils/api";

export default function Notes() {
    const [text, setText] = useState('');
    const [status, setStatus] =
        useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const lastSaved = useRef<string>('');

    const saveTimer = useRef<number | null>(null);

    const hideLabelTimer = useRef<number | number>(null);

    useEffect(() => {
        fetch(apiUrl('notes'))
            .then(r => r.json())
            .then(({ text }) => {
                setText(text);
                lastSaved.current = text;
            })
            .catch(() => setStatus('error'));
    }, []);

    useEffect(() => {
        if (text === lastSaved.current) return;

        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
            setStatus('saving');
            fetch(apiUrl('notes'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            })
                .then(() => {
                    lastSaved.current = text;
                    setStatus('saved');

                    if (hideLabelTimer.current)
                        window.clearTimeout(hideLabelTimer.current);
                    hideLabelTimer.current = window.setTimeout(
                        () => setStatus('idle'),
                        1500
                    );
                })
                .catch(() => setStatus('error'));
        }, 800);

        return () => {
            if (saveTimer.current) window.clearTimeout(saveTimer.current);
        };
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
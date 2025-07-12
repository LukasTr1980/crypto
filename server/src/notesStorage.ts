import fs from 'fs/promises';
import path from 'path';

const NOTES_FILE = path.join(__dirname, '..', 'notes.json');

export async function readNotes(): Promise<string> {
    try {
        const raw = await fs.readFile(NOTES_FILE, 'utf8');
        return JSON.parse(raw).text ?? '';
    } catch (error) {
        return '';
    }
}

export async function writeNotes(text: string) {
    const data = JSON.stringify(
        { text, updatedAt: Date.now() },
        null,
        2
    );
    await fs.writeFile(NOTES_FILE, data, 'utf8');
}
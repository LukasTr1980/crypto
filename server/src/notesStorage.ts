import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(
    process.env.DATA_DIR ?? '/data'
);

const NOTES_FILE =
    process.env.NOTES_FILE || path.join(DATA_DIR , 'notes.json');

export async function readNotes(): Promise<string> {
    try {
        const raw = await fs.readFile(NOTES_FILE, 'utf8');
        return JSON.parse(raw).text ?? '';
    } catch (error) {
        return '';
    }
}

export async function writeNotes(text: string) {
    await fs.mkdir(path.dirname(NOTES_FILE), { recursive: true });

    const data = JSON.stringify(
        { text, updatedAt: Date.now() },
        null,
        2
    );
    await fs.writeFile(NOTES_FILE, data, 'utf8');
}
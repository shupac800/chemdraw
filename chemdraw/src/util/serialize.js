import { Document } from '../model/Document.js';

const STORAGE_KEY = 'chemdraw_document';

export function saveToJSON(doc) {
  return JSON.stringify(doc.toJSON(), null, 2);
}

export function loadFromJSON(jsonString) {
  const data = JSON.parse(jsonString);
  return Document.fromJSON(data);
}

export function saveToLocalStorage(doc) {
  try {
    localStorage.setItem(STORAGE_KEY, saveToJSON(doc));
    return true;
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
    return false;
  }
}

export function loadFromLocalStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return loadFromJSON(data);
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return null;
  }
}

export function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

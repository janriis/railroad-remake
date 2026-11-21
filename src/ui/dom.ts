export const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export const btn = (act: string, label: string, kind = '', disabled = false): string =>
  `<button type="button" class="btn ${kind}" data-act="${act}"${disabled ? ' disabled' : ''}>${label}</button>`;

export const setText = (el: HTMLElement, text: string): void => {
  if (el.textContent !== text) el.textContent = text;
};

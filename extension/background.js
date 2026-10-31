'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Service Worker / Background Script
//  Manifest V3 Compliant
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menu for selected text
  chrome.contextMenus.create({
    id: 'jh-humanize-selection',
    title: '🗣️ Humanize JSON (json-humanized)',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'jh-humanize-selection' && tab && tab.id) {
    const selectedText = info.selectionText || '';
    if (!selectedText.trim()) return;

    try {
      // Send message to content script in the active tab to show the modal
      await chrome.tabs.sendMessage(tab.id, {
        action: 'HUMANIZE_SELECTION',
        text: selectedText
      });
    } catch {
      // If content script was not injected on this tab yet, inject it then send
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['lib/js-yaml.min.js', 'engine.js', 'content.js']
        });
        await chrome.tabs.sendMessage(tab.id, {
          action: 'HUMANIZE_SELECTION',
          text: selectedText
        });
      } catch (err) {
        console.error('Failed to trigger humanize modal:', err);
      }
    }
  }
});

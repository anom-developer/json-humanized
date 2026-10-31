'use strict';

const vscode = require('vscode');
const path = require('path');

// Reference core module
const { humanizeString } = require('../src/index');

function activate(context) {
  // Command: Humanize (English)
  const disposableEn = vscode.commands.registerCommand('json-humanized.humanize', async (uri) => {
    await runHumanize('English', uri);
  });

  // Command: Humanize (Russian)
  const disposableRu = vscode.commands.registerCommand('json-humanized.humanizeRussian', async (uri) => {
    await runHumanize('Russian', uri);
  });

  context.subscriptions.push(disposableEn, disposableRu);
}

async function runHumanize(lang = 'English', uri) {
  const editor = vscode.window.activeTextEditor;
  let text = '';
  let filename = '';

  if (editor) {
    const selection = editor.selection;
    text = selection && !selection.isEmpty ? editor.document.getText(selection) : editor.document.getText();
    filename = path.basename(editor.document.fileName);
  } else if (uri && uri.fsPath) {
    const fs = require('fs');
    text = fs.readFileSync(uri.fsPath, 'utf8');
    filename = path.basename(uri.fsPath);
  }

  if (!text.trim()) {
    vscode.window.showWarningMessage('json-humanized: No text to humanize. Please open a JSON/YAML/TOML file.');
    return;
  }

  try {
    const output = await humanizeString(text, {
      format: 'markdown',
      mode: 'structured',
      lang,
      filename,
    });

    // Open a side-by-side markdown document
    const doc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: output,
    });

    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: true,
    });
  } catch (err) {
    vscode.window.showErrorMessage(`json-humanized error: ${err.message}`);
  }
}

function deactivate() {}

module.exports = { activate, deactivate };

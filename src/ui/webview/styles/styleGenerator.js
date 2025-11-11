/**
 * Style Generator
 * Generates CSS styles for the webview
 * TODO: Extract full styles from original webview.js
 */

function generateStyles() {
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        padding: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        line-height: 1.4;
        overflow-x: hidden;
      }

      /* Tabs */
      .tabs-container {
        display: flex;
        gap: 4px;
        padding: 0 8px;
        background: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-panel-border);
        margin: -8px -8px 8px -8px;
        overflow-x: auto;
        scrollbar-width: thin;
      }
      .tab {
        padding: 8px 12px;
        font-size: 11px;
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--vscode-foreground);
        opacity: 0.6;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .tab:hover {
        opacity: 0.8;
        background: var(--vscode-list-hoverBackground);
      }
      .tab.active {
        opacity: 1;
        border-bottom-color: var(--vscode-focusBorder);
        font-weight: bold;
      }
      .tab-content {
        display: none;
        animation: fadeIn 0.3s;
      }
      .tab-content.active {
        display: block;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Common styles */
      .section {
        margin-bottom: 10px;
      }
      .title {
        font-size: 11px;
        font-weight: bold;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 1px solid var(--vscode-panel-border);
        opacity: 0.8;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .item {
        background: var(--vscode-input-background);
        padding: 8px;
        margin-bottom: 6px;
        border-radius: 4px;
        border-left: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
      }
      .item:hover {
        background: var(--vscode-list-hoverBackground);
      }
      .item.ok {
        border-left-color: #7CFC00;
      }
      .btn {
        width: 100%;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 4px;
        font-size: 10px;
        cursor: pointer;
        border-radius: 3px;
      }
      .btn:hover:not(:disabled) {
        background: var(--vscode-button-hoverBackground);
      }
      .btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* TODO: Add remaining styles from original webview.js */
      /* This is a simplified version for the refactoring task */
    </style>
  `;
}

module.exports = { generateStyles };

// extension.js
var vscode = require("vscode");
var jokes = [
  "\u4E3A\u4EC0\u4E48\u7A0B\u5E8F\u5458\u603B\u662F\u6DF7\u6DC6\u4E07\u5723\u8282\u548C\u5723\u8BDE\u8282\uFF1F\u56E0\u4E3A Oct 31 == Dec 25",
  "\u7A0B\u5E8F\u5458\u7684\u4E09\u5927\u8C0E\u8A00\uFF1A\u8FD9\u4E2Abug\u9A6C\u4E0A\u5C31\u4FEE\u597D\uFF1B\u4EE3\u7801\u5F88\u6E05\u6670\uFF0C\u4E0D\u9700\u8981\u6CE8\u91CA\uFF1B\u6211\u77E5\u9053\u81EA\u5DF1\u5728\u505A\u4EC0\u4E48",
  "\u4E00\u4E2A\u7A0B\u5E8F\u5458\u8D70\u8FDB\u4E00\u5BB6\u9152\u5427\uFF0C\u5BF9\u9152\u4FDD\u8BF4\uFF1A'\u8BF7\u7ED9\u6211\u6765\u4E00\u676F404'\u3002\u9152\u4FDD\u56DE\u7B54\uFF1A'\u627E\u4E0D\u5230\u8FD9\u79CD\u996E\u6599'",
  "\u5982\u4F55\u5224\u65AD\u4E00\u4E2A\u4EBA\u662F\u5426\u4E3A\u7A0B\u5E8F\u5458\uFF1F\u95EE\u4ED6\u4EEC\u6590\u6CE2\u90A3\u5951\u6570\u5217\u7684\u7B2C13\u4E2A\u6570\u662F\u4EC0\u4E48",
  "\u4E3A\u4EC0\u4E48\u7A0B\u5E8F\u5458\u4E0D\u559C\u6B22\u5927\u81EA\u7136\uFF1F\u56E0\u4E3A\u90A3\u91CC\u6709\u592A\u591A\u7684bugs",
  "\u7A0B\u5E8F\u5458\u6700\u5BB3\u6015\u7684\u4E8B\u60C5\u662F\u4EC0\u4E48\uFF1F\u6CE8\u91CA\u6389\u7684\u4EE3\u7801\u6BD4\u5B9E\u9645\u4EE3\u7801\u66F4\u6709\u610F\u4E49",
  "\u7A0B\u5E8F\u5458\u5F97\u77E5\u5973\u670B\u53CB\u6000\u5B55\u540E\u7684\u7B2C\u4E00\u53CD\u5E94\uFF1A'\u8FD9\u4E0D\u53EF\u80FD\uFF01\u6211\u4E00\u76F4\u5728\u4F7F\u7528\u4FDD\u62A4\u6A21\u5F0F\uFF01'",
  "\u6211\u5199\u7684\u4EE3\u7801\u53EA\u6709\u4E24\u4E2A\u4EBA\u80FD\u770B\u61C2\uFF1A\u6211\u548C\u4E0A\u5E1D\u3002\u73B0\u5728\u53EA\u6709\u4E0A\u5E1D\u4E86\u3002"
];
var emojis = ["\u{1F602}", "\u{1F923}", "\u{1F605}", "\u{1F606}", "\u{1F979}", "\u{1F60E}", "\u{1F929}", "\u{1F973}", "\u{1F914}", "\u{1F928}", "\u{1F60F}", "\u{1F643}", "\u{1F609}", "\u{1FAE0}", "\u{1F92F}", "\u{1F9D0}", "\u{1F913}"];
function activate(context) {
  console.log('\u606D\u559C\uFF0C\u60A8\u7684\u6269\u5C55"funny-vscode-extension"\u73B0\u5728\u5DF2\u7ECF\u6FC0\u6D3B\uFF01');
  let showJokeCommand = vscode.commands.registerCommand("funny-vscode-extension.showJoke", function() {
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    vscode.window.showInformationMessage(randomJoke);
  });
  let showEmojiCommand = vscode.commands.registerCommand("funny-vscode-extension.showEmoji", function() {
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    vscode.window.showInformationMessage(`\u4ECA\u5929\u7684\u5FC3\u60C5: ${randomEmoji}`);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const position = editor.selection.active;
      editor.edit((editBuilder) => {
        editBuilder.insert(position, randomEmoji);
      });
    }
  });
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "funny-vscode-extension.showJoke";
  statusBarItem.text = "$(smile) \u7B11\u4E00\u7B11";
  statusBarItem.tooltip = "\u70B9\u51FB\u663E\u793A\u7B11\u8BDD";
  statusBarItem.show();
  context.subscriptions.push(showJokeCommand);
  context.subscriptions.push(showEmojiCommand);
  context.subscriptions.push(statusBarItem);
}
function deactivate() {
}
module.exports = {
  activate,
  deactivate
};
//# sourceMappingURL=main.js.map

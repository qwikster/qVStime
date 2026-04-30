const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('qVStime is active!!');

	const provider = {
		resolveWebviewView: (w) => {
			w.webview.options = { enableScripts: true };
			const htmlpath = vscode.Uri.joinPath(context.extensionUri, "media", "sidebar.html");
			w.webview.html = require("fs").readFileSync(htmlpath.fsPath, "utf-8")
			
			w.webview.onDidReceiveMessage((msg) => {
				if (msg.command === "hello") {
					console.log("hello :3");
					w.webview.postMessage({ command: "response", data: "hi :3 owo" })
				}
			})
		}
	};

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("qvstime.sidebarView", provider)
	);
}

exports.activate = activate;
function deactivate() {}

module.exports = {
	activate,
	deactivate
}

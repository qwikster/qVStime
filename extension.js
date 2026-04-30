const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('qVStime is active!!');

	const provider = {
		resolveWebviewView: (w) => {
			w.webview.options = { enableScripts: true };
			
			w.webview.html = `
				<!DOCTYPE html>
				<html lang="en">
				<body>
					<h3>hi</h3>
					<button id="click">click</button>
					<script>
						const vscode = acquireVsCodeApi();
						document.getElementById("click").addEventListener("click", () => {
							vscode.postMessage({ command: "hello" })	
						})
				</body>
				</html>
			`;
		}
	};

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("qvstime.sidebarView", provider)
	);
}

exports.activate = activate;

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}

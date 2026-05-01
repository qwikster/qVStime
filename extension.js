'use strict';

const vscode = require('vscode');
const fs = require("fs")
const os = require("os")
const path = require("path")
const https = require("https")

function readConfig() {
	const raw = fs.readFileSync(path.join(os.homedir(), ".wakatime.cfg"), "utf8")
	const cfg = {}
	let section = null
	for (const line of raw.split("\n")) {
		const t = line.trim()
		const sec = t.match(/^\[(.+)\]$/)
		if (sec) { section = sec[1]; cfg[section] = {}; continue; }
		if (section && t.includes("=")) {
			const [k, ...rest] = t.split("=")
			cfg[section][k.trim()] = rest.join("=").trim()
		}
	}

	const settings = cfg.settings || {};
	const apiUrl = (settings.api_url || 'https://hackatime.hackclub.com/api/hackatime/v1').replace(/\/$/, '')
	const apiKey = settings.api_key || ""
	const origin = new URL(apiUrl).origin
	return { apiUrl, apiKey, origin }
}

function get(url, apiKey) {
	return new Promise((resolve, reject) => {
		const parsed = new URL(url)
		https.request({
			hostname: parsed.hostname,
			path: parsed.pathname + parsed.search,
			method: "GET",
			headers: {"Authorization": "Bearer " + apiKey, "Accept": "application/json" },
		}, (res) => {
			let body = ""
			res.on("data", c => body += c)
			res.on("end", () => {
				console.log(res.statusCode, url, body);
				try { resolve(JSON.parse(body)) }
				catch { resolve(body) }
			})
		}).on("error", reject).end()
	});
}

function todayStr() { return new Date().toLocaleDateString("en-CA")}

function formatSeconds(s) {
	if (!s) return "0m"
	const h = Math.floor(s / 3600)
	const m = Math.floor((s % 3600) / 60)
	return h > 0 ? `${h}h ${m}m` : `${m}m`
}

async function fetchData(apiUrl, apiKey, origin) {
	const [language, projects, today] = await Promise.all([
		get(`${origin}/api/v1/users/my/stats`, apiKey), // Languages
		get(`${origin}/api/v1/users/my/stats?features=projects`, apiKey), // Projects
		get(`${origin}/api/v1/users/my/stats?features=projects&start_date=${todayStr()}`, apiKey), 
	])

	const d = stats.data || {}
	return {
		today:        formatSeconds(todayHours.total_seconds),
		total:        d.human_readable_total || formatSeconds(d.total_seconds),
		dailyAverage: d.human_readable_daily_average || formatSeconds(d.daily_average),
		projects:     (d.projects || []).slice(0, 5).map(p => ({ name: p.name, time: p.text || formatSeconds(p.total_seconds), pct: p.percent })),
		languages:    (d.laguages || []).slice(0, 5).map(l => ({ name: l.name, time: l.text || formatSeconds(l.total_seconds), pct: l.percent })),
	}
}

function activate(context) {
	console.log('qVStime is active!!');

	let config
	try {
		config = readConfig()
	} catch (e) {
		vscode.window.showErrorMessage(`qVStime: failed to read ~/.wakatime.cfg - ${e.message}`)
		return
	}

	const htmlpath = vscode.Uri.joinPath(context.extensionUri, "media", "sidebar.html");

	const provider = {
		resolveWebviewView: (w) => {
			w.webview.options = { enableScripts: true };
			w.webview.html = fs.readFileSync(htmlpath.fsPath, "utf-8")
			
			const refresh = async () => {
				try {
					const data = await fetchData(config.apiUrl, config.apiKey, config.origin)
					w.webview.postMessage({ command: "data", data })
					console.log(data)
				} catch (e) {
					w.webview.postMessage({ command: "error", message: e.message })
				}
			}

			w.webview.onDidReceiveMessage((msg) => {
				if (msg.command === "ready" || msg.command === "refresh") refresh()
			})

			const timer = setInterval(refresh, 60_000)
			w.onDidDispose(() => clearInterval(timer))
		}
	};

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("qvstime.sidebarView", provider)
	);
}

exports.activate = activate;
function deactivate() {}
module.exports = { activate, deactivate }

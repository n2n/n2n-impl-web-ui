namespace Jhtml {
	export function ready(callback: ReadyCallback, document?: Document) {
		 return getOrCreateContext(document).onReady(callback);
	}
	
	let browser: Browser = null;
	let monitor: Monitor = null;
	
	export function getOrCreateBrowser(): Browser {
		if (browser) return browser;
		
		let context: Context = getOrCreateContext();
	
		if (!context.isJhtml()) return null;
		
		let history = new History();
		browser = new Browser(window, history);
		monitor = Monitor.create(context.document.documentElement, history, false);

		return browser;
	}
	
	export function getOrCreateMonitor(): Monitor {
		getOrCreateBrowser();
		return monitor;
	}
	
	export function getOrCreateContext(document?: Document): Context {
		return Context.from(document || window.document);
	}
	
	export function lookupModel(url: Url|string): Promise<Model> {
		getOrCreateBrowser();
		return monitor.lookupModel(Url.create(url))
	}
	
	window.document.addEventListener("DOMContentLoaded", () => {
		getOrCreateBrowser();
	}, false);
}
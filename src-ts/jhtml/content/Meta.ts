namespace Jhtml {
	
	export class Meta {
		public headElements: Array<Element> = []; 
		public bodyElements: Array<Element> = []; 
		public bodyElement: Element|null = null;
		public containerElement: Element|null = null;
	}
	
    export class MetaState {
    	private _browsable: boolean = false;
    	
    	constructor(private rootElem: Element, private headElem: Element, private bodyElem: Element,
    			private containerElem: Element) {
    		this.markAsUsed(this.headElements);
    		this.markAsUsed(this.bodyElements);
    		
    		let reader = new Util.ElemConfigReader(containerElem);
    		this._browsable = reader.readBoolean("browsable", false);
    	}
    	
    	get browsable(): boolean {
    		return this._browsable;
    	}
    	
    	private markAsUsed(elements: Element[]) {
    		for (let element of elements) {
    			if (element === this.containerElement) continue;
    			
    			this.usedElements.push(element);
    			
    			this.markAsUsed(Util.array(element.children));
    		}
    	}
    	
    	get headElements(): Array<Element> {
    		return Util.array(this.headElem.children);
    	}
    	
    	get bodyElements(): Array<Element> {
    		return Util.array(this.bodyElem.children);
    	}
    	
    	get containerElement(): Element {
    		return this.containerElem;
    	}
    	
		private usedElements: Array<Element> = [];
    	private pendingRemoveElements: Array<Element> = [];
    	private blockedElements: Array<Element> = [];
    	
    	public import(newMeta: Meta, curModelDependent: boolean): LoadObserver {
    		let merger = new Merger(this.rootElem, this.headElem, this.bodyElem,
    				this.containerElem, newMeta.containerElement);
			
    		merger.importInto(newMeta.headElements, this.headElem, Meta.Target.HEAD);
    		merger.importInto(newMeta.bodyElements, this.bodyElem, Meta.Target.BODY);
			
    		if (!curModelDependent) {
    			return merger.loadObserver;
    		}
    		
    		for (let element of merger.processedElements) {
    			this.usedElements.push(element);
    		}
    		
			return merger.loadObserver;
    	}
    	
    	public replaceWith(newMeta: Meta): LoadObserver {
    		let merger = new Merger(this.rootElem, this.headElem, this.bodyElem,
    				this.containerElem, newMeta.containerElement);
    		
			merger.mergeInto(newMeta.headElements, this.headElem, Meta.Target.HEAD);
			merger.mergeInto(newMeta.bodyElements, this.bodyElem, Meta.Target.BODY);
			
			if (newMeta.bodyElement) {
				merger.mergeAttrsInto(newMeta.bodyElement, this.bodyElem);
			}
			
			let removableElements = new Array<Element>();
			let remainingElements = merger.remainingElements;
			let remainingElement;
			while (remainingElement = remainingElements.pop()) {
				if (this.containsBlocked(remainingElement)) continue;
				
				if (-1 == this.usedElements.indexOf(remainingElement)
						&& -1 == this.pendingRemoveElements.indexOf(remainingElement)) {
					this.blockedElements.push(remainingElement);
					continue;
				}
				
				removableElements.push(remainingElement);
			}
			
			this.usedElements = merger.processedElements;
			for (let removableElement of removableElements) {
				if (-1 == this.pendingRemoveElements.indexOf(removableElement)) {
					this.pendingRemoveElements.push(removableElement);
				}
			}
			
			merger.loadObserver.whenLoaded(() => {
				for (let removableElement of removableElements) {
					let i = this.pendingRemoveElements.indexOf(removableElement);
					if (-1 == i) continue;
					
					removableElement.remove();
					this.pendingRemoveElements.splice(i, 1);
				}
			});

			return merger.loadObserver;
		}
    	
    	private containsBlocked(element: Element) {
    		return -1 < this.blockedElements.indexOf(element);
    	}
    }
    
    export namespace Meta {
    	export enum Target {
    		HEAD = 1,
    		BODY = 2
    	}
    }  
    
    export class LoadObserver {
    	private loadCallbacks: Array<() => any> = [];
    	private readyCallback: Array<() => any> = [];
    	
    	constructor() {
    	}
    	
    	public addElement(elem: Element) {
    		let tn: number;
    		let loadCallback = () => {
    			elem.removeEventListener("load", loadCallback);
    			clearTimeout(tn);
				this.unregisterLoadCallback(loadCallback);
			}
    		this.loadCallbacks.push(loadCallback)
			elem.addEventListener("load", loadCallback, false);
    		tn = setTimeout(loadCallback, 5000);
    	}
    	
    	private unregisterLoadCallback(callback: () => any) {
    		this.loadCallbacks.splice(this.loadCallbacks.indexOf(callback), 1);
    		
    		this.checkFire();
    	}
    	
    	public whenLoaded(callback: () => any) {
    		this.readyCallback.push(callback);
    		
    		this.checkFire();
    	}
    	
    	private checkFire() {
    		if (this.loadCallbacks.length > 0) return;
    		
    		let callback: () => any;
    		while(callback = this.readyCallback.shift()) {
    			callback();
    		}
    	}
    }
}
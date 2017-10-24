namespace Jhtml {
	
	export abstract class Content {
    	protected cbr: Util.CallbackRegistry<() => any> = new Util.CallbackRegistry<() => any>();
    	protected attached = false;
    	
		constructor(public elements: Array<Element>, private _model: Model, private detachedElem: Element) {
		}
		
		get model(): Model {
    		return this._model;
    	}
    	
    	on(eventType: Content.EventType, callback: () => any) {
    		this.cbr.onType(eventType, callback);
    	}
    	
    	off(eventType: Content.EventType, callback: () => any) {
    		this.cbr.offType(eventType, callback);
    	}
		
    	get isAttached() {
    		return this.attached;
    	}
    	
    	protected ensureDetached() {
    		if (this.attached) {
    			throw new Error("Element already attached.");
    		}
    	}
		
		attachTo(element: Element) {
    		this.ensureDetached();
    		
    		for (let childElem of Util.array(this.detachedElem.children)) {
    			element.appendChild(childElem);
    		}
    		
    		this.attached = true;
    	} 
		
		detach() {
    		if (!this.attached) return;
    		
    		this.cbr.fireType("detach");
    		
    		for (let childElem of this.elements) {
    			this.detachedElem.appendChild(childElem);
    		}
    		
    		this.attached = false;
    	}
    	
    	dispose() {
    		if (this.attached) {
    			this.detach();
    		}
    		
    		this.cbr.fireType("dispose");
    		
    		this.cbr = null;
    		this.detachedElem.remove();
    		this.detachedElem = null;
    	}
		
	}
	
    export abstract class Panel extends Content {
    	
    	constructor(private _name: string, attachedElem: Element, model: Model) {
    		super(Util.array(attachedElem.children), model, attachedElem.ownerDocument.createElement("template"));
    		this.attached = true;
    	}
    	
    	get name(): string {
    		return this._name;
    	}
    }
    
    export namespace Content {
    	export type EventType = "attached" | "detach" | "dispose";
    }

    export class Container extends Panel {
    	public compElements: { [name: string]: Element } = {};
    	
    	matches(container: Container): boolean {
    		return this.name == container.name 
    				&& JSON.stringify(Object.keys(this.compElements)) == JSON.stringify(Object.keys(container.compElements));
    	}
    }
    
    export class Comp extends Panel {
    }
    
    export class Snippet extends Content {
    	
		public markAttached() {
			this.ensureDetached();
			
			this.attached = true;
			
			this.cbr.fireType("attached");
		}
    }
}
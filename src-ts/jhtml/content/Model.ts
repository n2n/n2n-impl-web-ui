namespace Jhtml {
    
    export class Model {
    	constructor(public meta: Meta) {
    	}
	    
//    	public response: Response|null
    	public container: Container;
    	public comps: { [name: string]: Comp } = {};
    	public snippet: Snippet;
//    	public additionalData: any = {};
    	
    	public isFull(): boolean {
    		return !!this.container;
    	}
    }
    
    export class ModelState {
    	constructor(public metaState: MetaState, public container: Container, public comps: { [name: string]: Comp }) {
    	}
    }
}
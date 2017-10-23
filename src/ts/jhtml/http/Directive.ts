namespace Jhtml {
	
	export interface Directive {
		
		exec(context: Context, history: History, compHandlerReg: CompHandlerReg);
	}
    
    export class ModelDirective implements Directive {
    	constructor(public model: Model) {
    	}
    	
    	exec(context: Context, history: History, compHandlerReg: CompHandlerReg) {
    		context.import(this.model, compHandlerReg);
    	}
    }
    
    export class ReplaceDirective implements Directive {
        constructor(public status: number, public responseText: string, public mimeType: string, public url: Url) {
        }
    	
        exec(context: Context, history: History) {
        	context.replace(this.responseText, this.mimeType, history.currentPage.url.equals(this.url));
        }
    }
    
}
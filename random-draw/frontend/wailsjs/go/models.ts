export namespace main {
	
	export class SamplingResult {
	    array: any[][];
	    csvContentBase64: string;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new SamplingResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.array = source["array"];
	        this.csvContentBase64 = source["csvContentBase64"];
	        this.error = source["error"];
	    }
	}

}


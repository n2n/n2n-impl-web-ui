var Jhtml;
(function (Jhtml) {
    function ready(callback, document) {
        return getOrCreateContext(document).onReady(callback);
    }
    Jhtml.ready = ready;
    let browser = null;
    let monitor = null;
    function getOrCreateBrowser() {
        if (browser)
            return browser;
        let context = getOrCreateContext();
        if (!context.isBrowsable())
            return null;
        let history = new Jhtml.History();
        browser = new Jhtml.Browser(window, history);
        monitor = Jhtml.Monitor.create(context.document.documentElement, history, false);
        return browser;
    }
    Jhtml.getOrCreateBrowser = getOrCreateBrowser;
    function getOrCreateMonitor() {
        getOrCreateBrowser();
        return monitor;
    }
    Jhtml.getOrCreateMonitor = getOrCreateMonitor;
    function getOrCreateContext(document) {
        return Jhtml.Context.from(document || window.document);
    }
    Jhtml.getOrCreateContext = getOrCreateContext;
    function lookupModel(url) {
        getOrCreateBrowser();
        if (monitor) {
            return monitor.lookupModel(Jhtml.Url.create(url));
        }
        return new Promise(resolve => {
            getOrCreateContext().requestor.exec("GET", Jhtml.Url.create(url)).send().then((response) => {
                resolve(response.model);
            });
        });
    }
    Jhtml.lookupModel = lookupModel;
    function request(method, url) {
        return getOrCreateContext().requestor.exec(method, Jhtml.Url.create(url));
    }
    Jhtml.request = request;
    window.document.addEventListener("DOMContentLoaded", () => {
        getOrCreateBrowser();
    }, false);
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Browser {
        constructor(window, _history) {
            this.window = window;
            this._history = _history;
            this.poping = false;
            let entry = _history.push(new Jhtml.Page(Jhtml.Url.create(window.location.href), null));
            _history.onPush((entry) => {
                this.onPush(entry);
            });
            _history.onChanged((evt) => {
                this.onChanged(evt);
            });
            this.window.history.replaceState(this.buildStateObj(entry), "Page", entry.page.url.toString());
            this.window.onpopstate = (evt) => {
                this.onPopstate(evt);
            };
        }
        get history() {
            return this._history;
        }
        onPopstate(evt) {
            let url = Jhtml.Url.create(this.window.location.toString());
            let index = 0;
            if (evt.state && evt.state.jhtmlHistoryIndex !== undefined) {
                index = evt.state.jhtmlHistoryIndex;
            }
            try {
                this.poping = true;
                this.history.go(index, url);
                this.poping = false;
            }
            catch (e) {
                this.window.location.href = url.toString();
            }
        }
        onChanged(evt) {
            if (this.poping || evt.pushed)
                return;
            this.window.history.go(evt.indexDelta);
        }
        onPush(entry) {
            this.window.history.pushState(this.buildStateObj(entry), "Page", entry.page.url.toString());
        }
        buildStateObj(entry) {
            return {
                "jhtmlUrl": entry.page.url.toString(),
                "jhtmlHistoryIndex": entry.index
            };
        }
    }
    Jhtml.Browser = Browser;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class History {
        constructor() {
            this._currentIndex = null;
            this._entries = [];
            this.changeCbr = new Jhtml.Util.CallbackRegistry();
            this.changedCbr = new Jhtml.Util.CallbackRegistry();
            this.pushCbr = new Jhtml.Util.CallbackRegistry();
        }
        get currentIndex() {
            return this._currentIndex;
        }
        get currentEntry() {
            if (this._entries[this._currentIndex]) {
                return this._entries[this._currentIndex];
            }
            return null;
        }
        get currentPage() {
            let entry;
            if (entry = this.currentEntry) {
                return entry.page;
            }
            return null;
        }
        getEntryByIndex(index) {
            if (this._entries[index]) {
                return this._entries[index];
            }
            return null;
        }
        getPageByUrl(url) {
            for (let entry of this._entries) {
                if (!entry.page.url.equals(url))
                    continue;
                return entry.page;
            }
            return null;
        }
        onChange(callback) {
            this.changeCbr.on(callback);
        }
        offChange(callback) {
            this.changeCbr.off(callback);
        }
        onChanged(callback) {
            this.changedCbr.on(callback);
        }
        offChanged(callback) {
            this.changedCbr.off(callback);
        }
        onPush(callback) {
            this.pushCbr.on(callback);
        }
        offPush(callback) {
            this.pushCbr.off(callback);
        }
        go(index, checkUrl) {
            if (!this._entries[index]) {
                throw new Error("Unknown history entry index " + index + ". Check url: " + checkUrl);
            }
            if (checkUrl && !this._entries[index].page.url.equals(checkUrl)) {
                throw new Error("Check url does not match with page of history entry index " + index + " dow: "
                    + checkUrl + " != " + this._entries[index].page.url);
            }
            if (this._currentIndex == index)
                return;
            let evt = { pushed: false, indexDelta: (index - this._currentIndex) };
            this.changeCbr.fire(evt);
            this._currentIndex = index;
            this.changedCbr.fire(evt);
        }
        getFirstIndexOfPage(page) {
            return this._entries.findIndex((entry) => {
                return entry.page === page;
            });
        }
        push(page) {
            let sPage = this.getPageByUrl(page.url);
            if (sPage && sPage !== page) {
                throw new Error("Page with same url already registered.");
            }
            let evt = { pushed: true, indexDelta: 1 };
            this.changeCbr.fire(evt);
            let nextI = (this._currentIndex === null ? 0 : this._currentIndex + 1);
            for (let i = nextI; i < this._entries.length; i++) {
                let iPage = this._entries[i].page;
                if (nextI >= this.getFirstIndexOfPage(iPage))
                    continue;
                iPage.dispose();
            }
            this._entries.splice(nextI);
            this._currentIndex = nextI;
            let entry = new History.Entry(this._currentIndex, page);
            this._entries.push(entry);
            this.pushCbr.fire(entry);
            this.changedCbr.fire(evt);
            return entry;
        }
    }
    Jhtml.History = History;
    (function (History) {
        class Entry {
            constructor(_index, _page) {
                this._index = _index;
                this._page = _page;
                this.scrollPos = 0;
            }
            get index() {
                return this._index;
            }
            get page() {
                return this._page;
            }
        }
        History.Entry = Entry;
    })(History = Jhtml.History || (Jhtml.History = {}));
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Page {
        constructor(_url, promise) {
            this._url = _url;
            this._promise = null;
            this._loaded = false;
            this._config = new Page.Config();
            this.cbr = new Jhtml.Util.CallbackRegistry();
            this.loadUrl = null;
            this.promise = promise;
        }
        get config() {
            return this._config;
        }
        get loaded() {
            return this._loaded;
        }
        get url() {
            return this._url;
        }
        dispose() {
            this.promise = null;
        }
        fire(eventType) {
            this.cbr.fireType(eventType);
        }
        on(eventType, callback) {
            this.cbr.onType(eventType, callback);
        }
        off(eventType, callback) {
            this.cbr.offType(eventType, callback);
        }
        get promise() {
            return this._promise;
        }
        set promise(promise) {
            if (this._promise === promise)
                return;
            this._promise = promise;
            if (!promise) {
                this.fire("disposed");
                return;
            }
            this._loaded = false;
            promise.then(() => {
                this._loaded = true;
            });
            this.fire("promiseAssigned");
        }
        get disposed() {
            return this.promise ? false : true;
        }
    }
    Jhtml.Page = Page;
    (function (Page) {
        class Config {
            constructor() {
                this.frozen = false;
                this.keep = false;
                this.scrollPos = 0;
            }
        }
        Page.Config = Config;
    })(Page = Jhtml.Page || (Jhtml.Page = {}));
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Context {
        constructor(_document) {
            this._document = _document;
            this.compHandlers = {};
            this.readyCbr = new Jhtml.Util.CallbackRegistry();
            this.readyBound = false;
            this.loadObservers = [];
            this._requestor = new Jhtml.Requestor(this);
            this._document.addEventListener("DOMContentLoaded", () => {
                this.readyCbr.fire([this.document.documentElement], {});
            }, false);
        }
        get requestor() {
            return this._requestor;
        }
        get document() {
            return this._document;
        }
        isJhtml() {
            return this.getModelState(false) ? true : false;
        }
        isBrowsable() {
            if (!this.isJhtml())
                return false;
            return this.getModelState(false).metaState.browsable;
        }
        getModelState(required) {
            if (this.modelState) {
                return this.modelState;
            }
            try {
                this.modelState = Jhtml.ModelFactory.createStateFromDocument(this.document);
                if (this.modelState.metaState.browsable) {
                    Jhtml.Ui.Scanner.scan(this.document.documentElement);
                }
            }
            catch (e) {
                if (e instanceof Jhtml.ParseError)
                    return null;
                throw e;
            }
            if (!this.modelState && required) {
                throw new Error("No jhtml context");
            }
            return this.modelState || null;
        }
        replaceModel(newModel, montiorCompHandlers = {}) {
            let boundModelState = this.getModelState(true);
            for (let name in boundModelState.comps) {
                let comp = boundModelState.comps[name];
                if (!(montiorCompHandlers[name] && montiorCompHandlers[name].detachComp(comp))
                    && !(this.compHandlers[name] && this.compHandlers[name].detachComp(comp))) {
                    comp.detach();
                }
            }
            boundModelState.container.detach();
            let loadObserver = boundModelState.metaState.replaceWith(newModel.meta);
            this.registerLoadObserver(loadObserver);
            if (!boundModelState.container.matches(newModel.container)) {
                boundModelState.container = newModel.container;
            }
            boundModelState.container.attachTo(boundModelState.metaState.containerElement, loadObserver);
            for (let name in newModel.comps) {
                let comp = boundModelState.comps[name] = newModel.comps[name];
                if (!(montiorCompHandlers[name] && montiorCompHandlers[name].attachComp(comp, loadObserver))
                    && !(this.compHandlers[name] && this.compHandlers[name].attachComp(comp, loadObserver))) {
                    comp.attachTo(boundModelState.container.compElements[name], loadObserver);
                }
            }
            return loadObserver;
        }
        importMeta(meta) {
            let boundModelState = this.getModelState(true);
            let loadObserver = boundModelState.metaState.import(meta, true);
            this.registerLoadObserver(loadObserver);
            return loadObserver;
        }
        registerLoadObserver(loadObserver) {
            this.loadObservers.push(loadObserver);
            loadObserver.whenLoaded(() => {
                this.loadObservers.splice(this.loadObservers.indexOf(loadObserver), 1);
            });
        }
        registerNewModel(model) {
            let container = model.container;
            if (container) {
                let containerReadyCallback = () => {
                    container.off("attached", containerReadyCallback);
                    container.loadObserver.whenLoaded(() => {
                        this.readyCbr.fire(container.elements, { container: container });
                        this.triggerAndScan(container.elements);
                    });
                };
                container.on("attached", containerReadyCallback);
            }
            for (let comp of Object.values(model.comps)) {
                let compReadyCallback = () => {
                    comp.off("attached", compReadyCallback);
                    comp.loadObserver.whenLoaded(() => {
                        this.readyCbr.fire(comp.elements, { comp: Jhtml.Comp });
                        this.triggerAndScan(comp.elements);
                    });
                };
                comp.on("attached", compReadyCallback);
            }
            let snippet = model.snippet;
            if (snippet) {
                let snippetReadyCallback = () => {
                    snippet.off("attached", snippetReadyCallback);
                    this.importMeta(model.meta).whenLoaded(() => {
                        this.readyCbr.fire(snippet.elements, { snippet: snippet });
                        this.triggerAndScan(snippet.elements);
                    });
                };
                snippet.on("attached", snippetReadyCallback);
            }
        }
        triggerAndScan(elements) {
            let w = window;
            if (w.n2n && w.n2n.dispatch) {
                w.n2n.dispatch.update();
            }
            Jhtml.Ui.Scanner.scanArray(elements);
        }
        replace(text, mimeType, replace) {
            this.document.open(mimeType, replace ? "replace" : null);
            this.document.write(text);
            this.document.close();
        }
        registerCompHandler(compName, compHandler) {
            this.compHandlers[compName] = compHandler;
        }
        unregisterCompHandler(compName) {
            delete this.compHandlers[compName];
        }
        onReady(readyCallback) {
            this.readyCbr.on(readyCallback);
            if ((this._document.readyState === "complete" || this._document.readyState === "interactive")
                && this.loadObservers.length == 0) {
                readyCallback([this.document.documentElement], {});
            }
        }
        offReady(readyCallback) {
            this.readyCbr.off(readyCallback);
        }
        static test(document) {
            let context = Jhtml.Util.getElemData(document.documentElement, Context.KEY);
            if (context instanceof Context) {
                return context;
            }
            return null;
        }
        static from(document) {
            let context = Context.test(document);
            if (context)
                return context;
            Jhtml.Util.bindElemData(document.documentElement, Context.KEY, context = new Context(document));
            return context;
        }
    }
    Context.KEY = "data-jhtml-context";
    Jhtml.Context = Context;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Merger {
        constructor(rootElem, headElem, bodyElem, currentContainerElem, newContainerElem) {
            this.rootElem = rootElem;
            this.headElem = headElem;
            this.bodyElem = bodyElem;
            this.currentContainerElem = currentContainerElem;
            this.newContainerElem = newContainerElem;
            this._loadObserver = new Jhtml.LoadObserver();
            this._processedElements = [];
            this._blockedElements = [];
            this.removableElements = [];
            this.removableAttrs = [];
        }
        get loadObserver() {
            return this._loadObserver;
        }
        get processedElements() {
            return this._processedElements;
        }
        get remainingElements() {
            return this.removableElements.filter(removableElement => !this.containsProcessed(removableElement));
        }
        importInto(newElems, parentElem, target) {
            let importedElems = [];
            let curElems = Jhtml.Util.array(parentElem.children);
            for (let i in newElems) {
                let newElem = newElems[i];
                let importedElem = this.mergeElem(curElems, newElem, target);
                if (importedElem === this.currentContainerElem)
                    continue;
                this.importInto(Jhtml.Util.array(newElem.children), importedElem, target);
                importedElems.push(importedElem);
            }
            for (let i = 0; i < importedElems.length; i++) {
                let importedElem = importedElems[i];
                if (-1 < curElems.indexOf(importedElem)) {
                    continue;
                }
                this.loadObserver.addElement(importedElem);
                parentElem.appendChild(importedElem);
            }
        }
        mergeInto(newElems, parentElem, target) {
            let mergedElems = [];
            let curElems = Jhtml.Util.array(parentElem.children);
            for (let i in newElems) {
                let newElem = newElems[i];
                let mergedElem = this.mergeElem(curElems, newElem, target);
                if (mergedElem === this.currentContainerElem)
                    continue;
                this.mergeInto(Jhtml.Util.array(newElem.children), mergedElem, target);
                mergedElems.push(mergedElem);
            }
            for (let i = 0; i < curElems.length; i++) {
                if (-1 < mergedElems.indexOf(curElems[i]))
                    continue;
                if (!Merger.checkIfUnremovable(curElems[i])) {
                    this.removableElements.push(curElems[i]);
                }
                curElems.splice(i, 1);
                i--;
            }
            let curElem = curElems.shift();
            for (let i = 0; i < mergedElems.length; i++) {
                let mergedElem = mergedElems[i];
                if (mergedElem === curElem) {
                    curElem = curElems.shift();
                    continue;
                }
                this.loadObserver.addElement(mergedElem);
                if (!curElem) {
                    parentElem.appendChild(mergedElem);
                    continue;
                }
                parentElem.insertBefore(mergedElem, curElem);
                let j;
                if (-1 < (j = curElems.indexOf(mergedElem))) {
                    curElems.splice(j, 1);
                }
            }
        }
        mergeElem(preferedElems, newElem, target) {
            if (newElem === this.newContainerElem) {
                if (!this.compareExact(this.currentContainerElem, newElem, false)) {
                    let mergedElem = newElem.cloneNode(false);
                    this.processedElements.push(mergedElem);
                    return mergedElem;
                }
                this.processedElements.push(this.currentContainerElem);
                return this.currentContainerElem;
            }
            if (this.newContainerElem && newElem.contains(this.newContainerElem)) {
                let mergedElem;
                if (mergedElem = this.filterExact(preferedElems, newElem, false)) {
                    this.processedElements.push(mergedElem);
                    return mergedElem;
                }
                return this.cloneNewElem(newElem, false);
            }
            let mergedElem;
            switch (newElem.tagName) {
                case "SCRIPT":
                    if ((mergedElem = this.filter(preferedElems, newElem, ["src", "type"], true, false))
                        || (mergedElem = this.find(newElem, ["src", "type"], true, false))) {
                        this.processedElements.push(mergedElem);
                        return mergedElem;
                    }
                    return this.cloneNewElem(newElem, true);
                case "STYLE":
                case "LINK":
                    if ((mergedElem = this.filterExact(preferedElems, newElem, true))
                        || (mergedElem = this.findExact(newElem, true))) {
                        this.processedElements.push(mergedElem);
                        return mergedElem;
                    }
                    return this.cloneNewElem(newElem, true);
                default:
                    if ((mergedElem = this.filterExact(preferedElems, newElem, true))
                        || (mergedElem = this.findExact(newElem, true, target))) {
                        this.processedElements.push(mergedElem);
                        return mergedElem;
                    }
                    return this.cloneNewElem(newElem, false);
            }
        }
        static checkIfUnremovable(elem) {
            return elem.tagName == "SCRIPT";
        }
        cloneNewElem(newElem, deep) {
            let mergedElem = this.rootElem.ownerDocument.createElement(newElem.tagName);
            for (let name of this.attrNames(newElem)) {
                mergedElem.setAttribute(name, newElem.getAttribute(name));
            }
            if (deep) {
                mergedElem.innerHTML = newElem.innerHTML;
            }
            this.processedElements.push(mergedElem);
            return mergedElem;
        }
        attrNames(elem) {
            let attrNames = [];
            let attrs = elem.attributes;
            for (let i = 0; i < attrs.length; i++) {
                attrNames.push(attrs[i].nodeName);
            }
            return attrNames;
        }
        findExact(matchingElem, checkInner, target = Jhtml.Meta.Target.HEAD | Jhtml.Meta.Target.BODY) {
            return this.find(matchingElem, this.attrNames(matchingElem), checkInner, true, target);
        }
        find(matchingElem, matchingAttrNames, checkInner, checkAttrNum, target = Jhtml.Meta.Target.HEAD | Jhtml.Meta.Target.BODY) {
            let foundElem = null;
            if ((target & Jhtml.Meta.Target.HEAD)
                && (foundElem = this.findIn(this.headElem, matchingElem, matchingAttrNames, checkInner, checkAttrNum))) {
                return foundElem;
            }
            if ((target & Jhtml.Meta.Target.BODY)
                && (foundElem = this.findIn(this.bodyElem, matchingElem, matchingAttrNames, checkInner, checkAttrNum))) {
                return foundElem;
            }
            return null;
        }
        findIn(nodeSelector, matchingElem, matchingAttrNames, checkInner, chekAttrNum) {
            for (let tagElem of Jhtml.Util.find(nodeSelector, matchingElem.tagName)) {
                if (tagElem === this.currentContainerElem || tagElem.contains(this.currentContainerElem)
                    || this.currentContainerElem.contains(tagElem) || this.containsProcessed(tagElem)) {
                    continue;
                }
                if (this.compare(tagElem, matchingElem, matchingAttrNames, checkInner, chekAttrNum)) {
                    return tagElem;
                }
            }
            return null;
        }
        filterExact(elems, matchingElem, checkInner) {
            return this.filter(elems, matchingElem, this.attrNames(matchingElem), checkInner, true);
        }
        containsProcessed(elem) {
            return -1 < this.processedElements.indexOf(elem);
        }
        filter(elems, matchingElem, attrNames, checkInner, checkAttrNum) {
            for (let elem of elems) {
                if (!this.containsProcessed(elem)
                    && this.compare(elem, matchingElem, attrNames, checkInner, checkAttrNum)) {
                    return elem;
                }
            }
        }
        compareExact(elem1, elem2, checkInner) {
            return this.compare(elem1, elem2, this.attrNames(elem1), checkInner, true);
        }
        compare(elem1, elem2, attrNames, checkInner, checkAttrNum) {
            if (elem1.tagName !== elem2.tagName)
                return false;
            for (let attrName of attrNames) {
                if (elem1.getAttribute(attrName) !== elem2.getAttribute(attrName)) {
                    return false;
                }
            }
            if (checkInner && elem1.innerHTML.trim() !== elem2.innerHTML.trim()) {
                return false;
            }
            if (checkAttrNum && elem1.attributes.length != elem2.attributes.length) {
                return false;
            }
            return true;
        }
        mergeAttrsInto(newElem, elem) {
        }
    }
    Jhtml.Merger = Merger;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Meta {
        constructor() {
            this.headElements = [];
            this.bodyElements = [];
            this.bodyElement = null;
            this.containerElement = null;
        }
    }
    Jhtml.Meta = Meta;
    class MetaState {
        constructor(rootElem, headElem, bodyElem, containerElem) {
            this.rootElem = rootElem;
            this.headElem = headElem;
            this.bodyElem = bodyElem;
            this.containerElem = containerElem;
            this._browsable = false;
            this.usedElements = [];
            this.pendingRemoveElements = [];
            this.blockedElements = [];
            this.markAsUsed(this.headElements);
            this.markAsUsed(this.bodyElements);
            let reader = new Jhtml.Util.ElemConfigReader(containerElem);
            this._browsable = reader.readBoolean("browsable", false);
        }
        get browsable() {
            return this._browsable;
        }
        markAsUsed(elements) {
            for (let element of elements) {
                if (element === this.containerElement)
                    continue;
                this.usedElements.push(element);
                this.markAsUsed(Jhtml.Util.array(element.children));
            }
        }
        get headElements() {
            return Jhtml.Util.array(this.headElem.children);
        }
        get bodyElements() {
            return Jhtml.Util.array(this.bodyElem.children);
        }
        get containerElement() {
            return this.containerElem;
        }
        import(newMeta, curModelDependent) {
            let merger = new Jhtml.Merger(this.rootElem, this.headElem, this.bodyElem, this.containerElem, newMeta.containerElement);
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
        replaceWith(newMeta) {
            let merger = new Jhtml.Merger(this.rootElem, this.headElem, this.bodyElem, this.containerElem, newMeta.containerElement);
            merger.mergeInto(newMeta.headElements, this.headElem, Meta.Target.HEAD);
            merger.mergeInto(newMeta.bodyElements, this.bodyElem, Meta.Target.BODY);
            if (newMeta.bodyElement) {
                merger.mergeAttrsInto(newMeta.bodyElement, this.bodyElem);
            }
            let removableElements = new Array();
            let remainingElements = merger.remainingElements;
            let remainingElement;
            while (remainingElement = remainingElements.pop()) {
                if (this.containsBlocked(remainingElement))
                    continue;
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
                    if (-1 == i)
                        continue;
                    removableElement.remove();
                    this.pendingRemoveElements.splice(i, 1);
                }
            });
            return merger.loadObserver;
        }
        containsBlocked(element) {
            return -1 < this.blockedElements.indexOf(element);
        }
    }
    Jhtml.MetaState = MetaState;
    (function (Meta) {
        let Target;
        (function (Target) {
            Target[Target["HEAD"] = 1] = "HEAD";
            Target[Target["BODY"] = 2] = "BODY";
        })(Target = Meta.Target || (Meta.Target = {}));
    })(Meta = Jhtml.Meta || (Jhtml.Meta = {}));
    class LoadObserver {
        constructor() {
            this.loadCallbacks = [];
            this.readyCallback = [];
        }
        addElement(elem) {
            let tn;
            let loadCallback = () => {
                elem.removeEventListener("load", loadCallback);
                clearTimeout(tn);
                this.unregisterLoadCallback(loadCallback);
            };
            this.loadCallbacks.push(loadCallback);
            elem.addEventListener("load", loadCallback, false);
            tn = setTimeout(loadCallback, 5000);
        }
        unregisterLoadCallback(callback) {
            this.loadCallbacks.splice(this.loadCallbacks.indexOf(callback), 1);
            this.checkFire();
        }
        whenLoaded(callback) {
            this.readyCallback.push(callback);
            this.checkFire();
        }
        checkFire() {
            if (this.loadCallbacks.length > 0)
                return;
            let callback;
            while (callback = this.readyCallback.shift()) {
                callback();
            }
        }
    }
    Jhtml.LoadObserver = LoadObserver;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Model {
        constructor(meta) {
            this.meta = meta;
            this.comps = {};
            this.additionalData = {};
        }
        isFull() {
            return !!this.container;
        }
    }
    Jhtml.Model = Model;
    class ModelState {
        constructor(metaState, container, comps) {
            this.metaState = metaState;
            this.container = container;
            this.comps = comps;
        }
    }
    Jhtml.ModelState = ModelState;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class ModelFactory {
        static createFromJsonObj(jsonObj) {
            if (typeof jsonObj.content != "string") {
                throw new Jhtml.ParseError("Missing or invalid property 'content'.");
            }
            let rootElem = document.createElement("html");
            rootElem.innerHTML = jsonObj.content;
            let meta = ModelFactory.buildMeta(rootElem, false);
            ModelFactory.compileMetaElements(meta.headElements, "head", jsonObj);
            ModelFactory.compileMetaElements(meta.bodyElements, "bodyStart", jsonObj);
            ModelFactory.compileMetaElements(meta.bodyElements, "bodyEnd", jsonObj);
            let model = new Jhtml.Model(meta);
            if (meta.containerElement) {
                model.container = ModelFactory.compileContainer(meta.containerElement, model);
                model.comps = ModelFactory.compileComps(model.container, meta.containerElement, model);
                model.container.detach();
                for (let comp of Object.values(model.comps)) {
                    comp.detach();
                }
            }
            else if (jsonObj.content) {
                rootElem = document.createElement("div");
                rootElem.innerHTML = jsonObj.content;
                model.snippet = new Jhtml.Snippet(Jhtml.Util.array(rootElem.children), model, document.createElement("template"));
            }
            if (jsonObj.additional) {
                model.additionalData = jsonObj.additional;
            }
            return model;
        }
        static createStateFromDocument(document) {
            let metaState = new Jhtml.MetaState(document.documentElement, document.head, document.body, ModelFactory.extractContainerElem(document.body, true));
            let container = ModelFactory.compileContainer(metaState.containerElement, null);
            let comps = ModelFactory.compileComps(container, metaState.containerElement, null);
            return new Jhtml.ModelState(metaState, container, comps);
        }
        static createFromHtml(htmlStr, full) {
            let templateElem = document.createElement("html");
            templateElem.innerHTML = htmlStr;
            let model = new Jhtml.Model(ModelFactory.buildMeta(templateElem, true));
            model.container = ModelFactory.compileContainer(model.meta.containerElement, model);
            model.comps = ModelFactory.compileComps(model.container, templateElem, model);
            model.container.detach();
            for (let comp of Object.values(model.comps)) {
                comp.detach();
            }
            return model;
        }
        static extractHeadElem(rootElem, required) {
            let headElem = rootElem.querySelector("head");
            if (headElem || !required) {
                return headElem;
            }
            throw new Jhtml.ParseError("head element missing.");
        }
        static extractBodyElem(rootElem, required) {
            let bodyElem = rootElem.querySelector("body");
            if (bodyElem || !required) {
                return bodyElem;
            }
            throw new Jhtml.ParseError("body element missing.");
        }
        static buildMeta(rootElem, full) {
            let meta = new Jhtml.Meta();
            let elem;
            if ((elem = ModelFactory.extractContainerElem(rootElem, full))) {
                meta.containerElement = elem;
            }
            else {
                return meta;
            }
            if (elem = ModelFactory.extractBodyElem(rootElem, true)) {
                meta.bodyElements = Jhtml.Util.array(elem.children);
            }
            if (elem = ModelFactory.extractHeadElem(rootElem, false)) {
                meta.headElements = Jhtml.Util.array(elem.children);
            }
            return meta;
        }
        static extractContainerElem(rootElem, required) {
            let containerList = Jhtml.Util.find(rootElem, ModelFactory.CONTAINER_SELECTOR);
            if (containerList.length == 0) {
                if (!required)
                    return null;
                throw new Jhtml.ParseError("Jhtml container missing.");
            }
            if (containerList.length > 1) {
                if (!required)
                    return null;
                throw new Jhtml.ParseError("Multiple jhtml container detected.");
            }
            return containerList[0];
        }
        static compileContainer(containerElem, model) {
            return new Jhtml.Container(containerElem.getAttribute(ModelFactory.CONTAINER_ATTR), containerElem, model);
        }
        static compileComps(container, containerElem, model) {
            let comps = {};
            for (let compElem of Jhtml.Util.find(containerElem, ModelFactory.COMP_SELECTOR)) {
                let name = compElem.getAttribute(ModelFactory.COMP_ATTR);
                if (comps[name]) {
                    throw new Jhtml.ParseError("Duplicated comp name: " + name);
                }
                container.compElements[name] = compElem;
                comps[name] = new Jhtml.Comp(name, compElem, model);
            }
            return comps;
        }
        static compileMetaElements(elements, name, jsonObj) {
            if (!(jsonObj[name] instanceof Array)) {
                throw new Jhtml.ParseError("Missing or invalid property '" + name + "'.");
            }
            for (let elemHtml of jsonObj[name]) {
                elements.push(ModelFactory.createElement(elemHtml));
            }
        }
        static createElement(elemHtml) {
            let templateElem = document.createElement("template");
            templateElem.innerHTML = elemHtml;
            return templateElem.content.firstChild;
        }
    }
    ModelFactory.CONTAINER_ATTR = "data-jhtml-container";
    ModelFactory.COMP_ATTR = "data-jhtml-comp";
    ModelFactory.CONTAINER_SELECTOR = "[" + ModelFactory.CONTAINER_ATTR + "]";
    ModelFactory.COMP_SELECTOR = "[" + ModelFactory.COMP_ATTR + "]";
    Jhtml.ModelFactory = ModelFactory;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Monitor {
        constructor(container, history, _pseudo) {
            this.container = container;
            this._pseudo = _pseudo;
            this.active = true;
            this.compHandlers = {};
            this.directiveCbr = new Jhtml.Util.CallbackRegistry();
            this.directiveExecutedCbr = new Jhtml.Util.CallbackRegistry();
            this.pushing = false;
            this.pendingPromise = null;
            this.context = Jhtml.Context.from(container.ownerDocument);
            this.history = history;
            this.history.onChanged(() => {
                this.historyChanged();
            });
        }
        get compHandlerReg() {
            return this.compHandlers;
        }
        get pseudo() {
            return this._pseudo;
        }
        registerCompHandler(compName, compHandler) {
            this.compHandlers[compName] = compHandler;
        }
        unregisterCompHandler(compName) {
            delete this.compHandlers[compName];
        }
        exec(urlExpr, requestConfig) {
            if (this.history.currentEntry) {
                this.history.currentEntry.scrollPos = this.history.currentPage.config.scrollPos = window.pageYOffset;
            }
            let url = Jhtml.Url.create(urlExpr);
            let config = Jhtml.FullRequestConfig.from(requestConfig);
            let page = this.history.getPageByUrl(url);
            if (!page) {
                page = new Jhtml.Page(url, this.context.requestor.lookupDirective(url));
            }
            else if (page.config.frozen) {
                if (page.disposed) {
                    throw new Error("Targed page is frozen and disposed.");
                }
            }
            else if (page.disposed || config.forceReload || !page.config.keep) {
                page.promise = this.context.requestor.lookupDirective(page.loadUrl || url);
            }
            let promise = this.pendingPromise = page.promise;
            if (config.pushToHistory && page !== this.history.currentPage) {
                this.pushing = true;
                this.history.push(page);
                this.pushing = false;
            }
            promise.then((directive) => {
                if (promise !== this.pendingPromise)
                    return;
                this.handleDirective(directive, true, config.usePageScrollPos);
            });
            return promise;
        }
        handleDirective(directive, fresh = true, usePageScrollPos = false) {
            this.triggerDirectiveCallbacks({ directive: directive, new: fresh });
            directive.exec(this);
            if (this.history.currentEntry) {
                window.scroll(0, (usePageScrollPos ? this.history.currentPage.config.scrollPos
                    : this.history.currentEntry.scrollPos));
            }
            this.triggerDirectiveExecutedCallbacks({ directive: directive, new: fresh });
        }
        triggerDirectiveCallbacks(evt) {
            this.directiveCbr.fire(evt);
        }
        onDirective(callback) {
            this.directiveCbr.on(callback);
        }
        offDirective(callback) {
            this.directiveCbr.off(callback);
        }
        triggerDirectiveExecutedCallbacks(evt) {
            this.directiveExecutedCbr.fire(evt);
        }
        onDirectiveExecuted(callback) {
            this.directiveExecutedCbr.on(callback);
        }
        offDirectiveExecuted(callback) {
            this.directiveExecutedCbr.off(callback);
        }
        lookupModel(url) {
            return new Promise(resolve => {
                this.context.requestor.exec("GET", url).send().then((response) => {
                    if (response.model) {
                        resolve(response.model);
                    }
                    else {
                        this.handleDirective(response.directive);
                    }
                });
            });
        }
        historyChanged() {
            if (this.pushing || !this.active)
                return;
            let currentPage = this.history.currentPage;
            if (!currentPage.promise) {
                currentPage.promise = this.context.requestor.lookupDirective(currentPage.url);
            }
            currentPage.promise.then(directive => {
                this.handleDirective(directive);
            });
        }
        static of(element, selfIncluded = true) {
            if (selfIncluded && element.matches("." + Monitor.CSS_CLASS)) {
                return Monitor.test(element);
            }
            if (element = element.closest("." + Monitor.CSS_CLASS)) {
                return Monitor.test(element);
            }
            return null;
        }
        static test(element) {
            let monitor = Jhtml.Util.getElemData(element, Monitor.KEY);
            if (element.classList.contains(Monitor.CSS_CLASS) && monitor instanceof Monitor) {
                return monitor;
            }
            return null;
        }
        static create(container, history, pseudo) {
            let monitor = Monitor.test(container);
            if (monitor) {
                throw new Error("Element is already monitored.");
            }
            container.classList.add(Monitor.CSS_CLASS);
            monitor = new Monitor(container, history, pseudo);
            Jhtml.Util.bindElemData(container, Monitor.KEY, monitor);
            return monitor;
        }
    }
    Monitor.KEY = "jhtml-monitor";
    Monitor.CSS_CLASS = "jhtml-selfmonitored";
    Jhtml.Monitor = Monitor;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Content {
        constructor(elements, _model, detachedElem) {
            this.elements = elements;
            this._model = _model;
            this.detachedElem = detachedElem;
            this.cbr = new Jhtml.Util.CallbackRegistry();
            this.attached = false;
        }
        get model() {
            return this._model;
        }
        fire(eventType) {
            this.cbr.fireType(eventType);
        }
        on(eventType, callback) {
            this.cbr.onType(eventType, callback);
        }
        off(eventType, callback) {
            this.cbr.offType(eventType, callback);
        }
        get isAttached() {
            return this.attached;
        }
        ensureDetached() {
            if (this.attached) {
                throw new Error("Element already attached.");
            }
        }
        attach(element) {
            this.ensureDetached();
            for (let childElem of this.elements) {
                element.appendChild(childElem);
            }
            this.attached = true;
            this.fire("attached");
        }
        detach() {
            if (!this.attached)
                return;
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
            this.fire("dispose");
            this.cbr = null;
            this.detachedElem.remove();
            this.detachedElem = null;
        }
    }
    Jhtml.Content = Content;
    class Panel extends Content {
        constructor(_name, attachedElem, model) {
            super(Jhtml.Util.array(attachedElem.children), model, attachedElem.ownerDocument.createElement("template"));
            this._name = _name;
            this.attached = true;
        }
        get name() {
            return this._name;
        }
        get loadObserver() {
            return this._loadObserver;
        }
        attachTo(element, loadObserver) {
            this._loadObserver = loadObserver;
            this.attach(element);
        }
        detach() {
            this._loadObserver = null;
            super.detach();
        }
    }
    Jhtml.Panel = Panel;
    class Container extends Panel {
        constructor() {
            super(...arguments);
            this.compElements = {};
        }
        matches(container) {
            return this.name == container.name
                && JSON.stringify(Object.keys(this.compElements)) == JSON.stringify(Object.keys(container.compElements));
        }
    }
    Jhtml.Container = Container;
    class Comp extends Panel {
    }
    Jhtml.Comp = Comp;
    class Snippet extends Content {
        markAttached() {
            this.ensureDetached();
            this.attached = true;
            this.cbr.fireType("attached");
        }
        attachTo(element) {
            this.attach(element);
        }
    }
    Jhtml.Snippet = Snippet;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class ParseError extends Error {
    }
    Jhtml.ParseError = ParseError;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class DocumentManager {
    }
    Jhtml.DocumentManager = DocumentManager;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class FullModelDirective {
        constructor(model) {
            this.model = model;
            if (!model.isFull()) {
                throw new Error("Invalid argument. Full model required.");
            }
        }
        getAdditionalData() {
            return this.model.additionalData;
        }
        exec(monitor) {
            if (!monitor.pseudo) {
                monitor.context.replaceModel(this.model, monitor.compHandlerReg);
                return;
            }
            let loadObserver = monitor.context.importMeta(this.model.meta);
            for (let name in this.model.comps) {
                if (!monitor.compHandlerReg[name])
                    continue;
                monitor.compHandlerReg[name].attachComp(this.model.comps[name], loadObserver);
            }
        }
    }
    Jhtml.FullModelDirective = FullModelDirective;
    class ReplaceDirective {
        constructor(status, responseText, mimeType, url) {
            this.status = status;
            this.responseText = responseText;
            this.mimeType = mimeType;
            this.url = url;
        }
        getAdditionalData() {
            return null;
        }
        exec(monitor) {
            monitor.context.replace(this.responseText, this.mimeType, monitor.history.currentPage.url.equals(this.url));
        }
    }
    Jhtml.ReplaceDirective = ReplaceDirective;
    class RedirectDirective {
        constructor(srcUrl, back, targetUrl, requestConfig, additionalData) {
            this.srcUrl = srcUrl;
            this.back = back;
            this.targetUrl = targetUrl;
            this.requestConfig = requestConfig;
            this.additionalData = additionalData;
        }
        getAdditionalData() {
            return this.additionalData;
        }
        exec(monitor) {
            switch (this.back) {
                case RedirectDirective.Type.REFERER:
                    if (!monitor.history.currentPage.url.equals(this.srcUrl)) {
                        return;
                    }
                case RedirectDirective.Type.BACK:
                    if (monitor.history.currentEntry.index > 0) {
                        let entry = monitor.history.getEntryByIndex(monitor.history.currentEntry.index - 1);
                        monitor.exec(entry.page.url, this.requestConfig);
                        monitor.history.currentEntry.scrollPos = entry.scrollPos;
                        return;
                    }
                default:
                    monitor.exec(this.targetUrl, this.requestConfig);
            }
        }
    }
    Jhtml.RedirectDirective = RedirectDirective;
    (function (RedirectDirective) {
        let Type;
        (function (Type) {
            Type[Type["TARGET"] = 0] = "TARGET";
            Type[Type["REFERER"] = 1] = "REFERER";
            Type[Type["BACK"] = 2] = "BACK";
        })(Type = RedirectDirective.Type || (RedirectDirective.Type = {}));
    })(RedirectDirective = Jhtml.RedirectDirective || (Jhtml.RedirectDirective = {}));
    class SnippetDirective {
        constructor(srcUrl, model) {
            this.srcUrl = srcUrl;
            this.model = model;
        }
        getAdditionalData() {
            return this.model.additionalData;
        }
        exec(monitor) {
            throw new Error(this.srcUrl + "; can not exec snippet only directive.");
        }
    }
    Jhtml.SnippetDirective = SnippetDirective;
    class DataDirective {
        constructor(srcUrl, additionalData) {
            this.srcUrl = srcUrl;
            this.additionalData = additionalData;
        }
        getAdditionalData() {
            return this.additionalData;
        }
        exec(monitor) {
            throw new Error(this.srcUrl + "; can not exec data only directive.");
        }
    }
    Jhtml.DataDirective = DataDirective;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Request {
        constructor(requestor, _xhr, _url) {
            this.requestor = requestor;
            this._xhr = _xhr;
            this._url = _url;
        }
        get xhr() {
            return this._xhr;
        }
        get url() {
            return this._url;
        }
        abort() {
            this.xhr.abort();
        }
        send(data) {
            this.xhr.send(data);
            return this.buildPromise();
        }
        buildPromise() {
            return new Promise((resolve) => {
                this.xhr.onreadystatechange = () => {
                    if (this.xhr.readyState != 4)
                        return;
                    switch (this.xhr.status) {
                        case 200:
                            let model;
                            let directive;
                            if (!this.xhr.getResponseHeader("Content-Type").match(/json/)) {
                                model = this.createModelFromHtml(this.xhr.responseText);
                            }
                            else {
                                let jsonObj = this.createJsonObj(this.url, this.xhr.responseText);
                                if (!(directive = this.scanForDirective(this.url, jsonObj))) {
                                    model = this.createModelFromJson(this.url, jsonObj);
                                }
                            }
                            if (model) {
                                directive = model.isFull() ? new Jhtml.FullModelDirective(model) :
                                    new Jhtml.SnippetDirective(this.url, model);
                            }
                            let response = { url: this.url, model: model, directive: directive };
                            if (model) {
                                model.response = response;
                            }
                            resolve(response);
                            break;
                        default:
                            resolve({ url: this.url, directive: new Jhtml.ReplaceDirective(this.xhr.status, this.xhr.responseText, this.xhr.getResponseHeader("Content-Type"), this.url) });
                    }
                };
                this.xhr.onerror = () => {
                    throw new Error("Could not request " + this.url.toString());
                };
            });
        }
        createJsonObj(url, jsonText) {
            try {
                return JSON.parse(jsonText);
            }
            catch (e) {
                throw new Error(url + "; invalid json response: " + e.message);
            }
        }
        scanForDirective(url, jsonObj) {
            switch (jsonObj.directive) {
                case "redirect":
                    return new Jhtml.RedirectDirective(url, Jhtml.RedirectDirective.Type.TARGET, Jhtml.Url.create(jsonObj.location), Jhtml.FullRequestConfig.from(jsonObj.requestConfig), jsonObj.additional);
                case "redirectToReferer":
                    return new Jhtml.RedirectDirective(url, Jhtml.RedirectDirective.Type.REFERER, Jhtml.Url.create(jsonObj.location), Jhtml.FullRequestConfig.from(jsonObj.requestConfig), jsonObj.additional);
                case "redirectBack":
                    return new Jhtml.RedirectDirective(url, Jhtml.RedirectDirective.Type.BACK, Jhtml.Url.create(jsonObj.location), Jhtml.FullRequestConfig.from(jsonObj.requestConfig), jsonObj.additional);
                default:
                    if (!jsonObj.content) {
                        return new Jhtml.DataDirective(url, jsonObj.additional);
                    }
                    return null;
            }
        }
        createModelFromJson(url, jsonObj) {
            try {
                let model = Jhtml.ModelFactory.createFromJsonObj(jsonObj);
                this.requestor.context.registerNewModel(model);
                return model;
            }
            catch (e) {
                if (e instanceof Jhtml.ParseError || e instanceof SyntaxError) {
                    throw new Error(url + "; no or invalid json: " + e.message);
                }
                throw e;
            }
        }
        createModelFromHtml(html) {
            try {
                let model = Jhtml.ModelFactory.createFromHtml(html, true);
                this.requestor.context.registerNewModel(model);
                return model;
            }
            catch (e) {
                throw new Error(this.url + "; invalid jhtml response: " + e.message);
            }
        }
    }
    Jhtml.Request = Request;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class FullRequestConfig {
        constructor() {
            this.forceReload = false;
            this.pushToHistory = true;
            this.usePageScrollPos = false;
        }
        static from(requestConfig) {
            if (requestConfig instanceof FullRequestConfig) {
                return requestConfig;
            }
            let config = new FullRequestConfig();
            if (!requestConfig)
                return config;
            if (requestConfig.forceReload !== undefined) {
                config.forceReload = requestConfig.forceReload;
            }
            if (requestConfig.pushToHistory !== undefined) {
                config.pushToHistory = requestConfig.pushToHistory;
            }
            if (requestConfig.usePageScrollPos !== undefined) {
                config.usePageScrollPos = requestConfig.usePageScrollPos;
            }
            return config;
        }
        static fromElement(element) {
            let reader = new Jhtml.Util.ElemConfigReader(element);
            let config = new FullRequestConfig();
            config.forceReload = reader.readBoolean("force-reload", config.forceReload);
            config.pushToHistory = reader.readBoolean("push-to-history", config.pushToHistory);
            config.usePageScrollPos = reader.readBoolean("use-page-scroll-pos", config.usePageScrollPos);
            return config;
        }
    }
    Jhtml.FullRequestConfig = FullRequestConfig;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Requestor {
        constructor(_context) {
            this._context = _context;
        }
        get context() {
            return this._context;
        }
        lookupDirective(url) {
            return new Promise(resolve => {
                this.exec("GET", url).send().then((result) => {
                    if (result.directive) {
                        resolve(result.directive);
                        return;
                    }
                    throw new Error(url + " provides no jhtml directive.");
                });
            });
        }
        lookupModel(url) {
            return new Promise(resolve => {
                this.exec("GET", url).send().then((result) => {
                    if (result.directive) {
                        resolve(result.model);
                        return;
                    }
                    throw new Error(url + " provides no jhtml model.");
                });
            });
        }
        exec(method, url) {
            let xhr = new XMLHttpRequest();
            xhr.open(method, url.toString(), true);
            xhr.setRequestHeader("Accept", "application/json,text/html");
            return new Jhtml.Request(this, xhr, url);
        }
    }
    Jhtml.Requestor = Requestor;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    class Url {
        constructor(urlStr) {
            this.urlStr = urlStr;
        }
        toString() {
            return this.urlStr;
        }
        equals(url) {
            return this.urlStr == url.urlStr;
        }
        extR(pathExt = null, queryExt = null) {
            let newUrlStr = this.urlStr;
            if (pathExt !== null && pathExt !== undefined) {
                newUrlStr = newUrlStr.replace(/\/+$/, "") + "/" + encodeURI(pathExt);
            }
            if (queryExt !== null || queryExt !== undefined) {
                let parts = [];
                this.compileQueryParts(parts, queryExt, null);
                let queryExtStr = parts.join("&");
                if (newUrlStr.match(/\?/)) {
                    newUrlStr += "&" + queryExtStr;
                }
                else {
                    newUrlStr += "?" + queryExtStr;
                }
            }
            return new Url(newUrlStr);
        }
        compileQueryParts(parts, queryExt, prefix) {
            for (let key in queryExt) {
                let name = null;
                if (prefix) {
                    name = prefix + "[" + key + "]";
                }
                else {
                    name = key;
                }
                let value = queryExt[key];
                if (value === null || value === undefined) {
                    continue;
                }
                if (value instanceof Array || value instanceof Object) {
                    this.compileQueryParts(parts, value, name);
                }
                else {
                    parts.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
                }
            }
        }
        static build(urlExpression) {
            if (urlExpression === null || urlExpression === undefined)
                return null;
            return Url.create(urlExpression);
        }
        static create(urlExpression) {
            if (urlExpression instanceof Url) {
                return urlExpression;
            }
            return new Url(Url.absoluteStr(urlExpression));
        }
        static absoluteStr(urlExpression) {
            if (urlExpression instanceof Url) {
                return urlExpression.toString();
            }
            var urlStr = urlExpression;
            if (!/^(?:\/|[a-z]+:\/\/)/.test(urlStr)) {
                return window.location.toString().replace(/(\/+)?((\?|#).*)?$/, "") + "/" + urlStr;
            }
            if (!/^(?:[a-z]+:)?\/\//.test(urlStr)) {
                return window.location.protocol + "//" + window.location.host + urlStr;
            }
            return urlStr;
        }
    }
    Jhtml.Url = Url;
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    var Ui;
    (function (Ui) {
        class Form {
            constructor(_element) {
                this._element = _element;
                this._observing = false;
                this._config = new Form.Config();
                this.callbackRegistery = new Jhtml.Util.CallbackRegistry();
                this.curRequest = null;
                this.tmpSubmitDirective = null;
                this.controlLockAutoReleaseable = true;
            }
            get element() {
                return this._element;
            }
            get observing() {
                return this._observing;
            }
            get config() {
                return this._config;
            }
            reset() {
                this.element.reset();
            }
            fire(eventType) {
                this.callbackRegistery.fireType(eventType.toString(), this);
            }
            on(eventType, callback) {
                this.callbackRegistery.onType(eventType.toString(), callback);
            }
            off(eventType, callback) {
                this.callbackRegistery.offType(eventType.toString(), callback);
            }
            observe() {
                if (this._observing)
                    return;
                this._observing = true;
                this.element.addEventListener("submit", (evt) => {
                    evt.preventDefault();
                    if (this.config.autoSubmitAllowed) {
                        let submitDirective = this.tmpSubmitDirective;
                        setTimeout(() => {
                            this.submit(submitDirective);
                        });
                    }
                    this.tmpSubmitDirective = null;
                }, false);
                Jhtml.Util.find(this.element, "input[type=submit], button[type=submit]").forEach((elem) => {
                    elem.addEventListener("click", (evt) => {
                        this.tmpSubmitDirective = { button: elem };
                    }, false);
                });
            }
            buildFormData(submitConfig) {
                var formData = new FormData(this.element);
                if (submitConfig && submitConfig.button) {
                    formData.append(submitConfig.button.getAttribute("name"), submitConfig.button.getAttribute("value"));
                }
                return formData;
            }
            block() {
                if (!this.controlLock && this.config.disableControls) {
                    this.disableControls();
                }
            }
            unblock() {
                if (this.controlLock && this.controlLockAutoReleaseable) {
                    this.controlLock.release();
                }
            }
            disableControls(autoReleaseable = true) {
                this.controlLockAutoReleaseable = autoReleaseable;
                if (this.controlLock)
                    return;
                this.controlLock = new ControlLock(this.element);
            }
            enableControls() {
                if (this.controlLock) {
                    this.controlLock.release();
                    this.controlLock = null;
                    this.controlLockAutoReleaseable = true;
                }
            }
            abortSubmit() {
                if (this.curRequest) {
                    var curXhr = this.curRequest;
                    this.curRequest = null;
                    curXhr.abort();
                    this.unblock();
                }
            }
            submit(submitConfig) {
                this.abortSubmit();
                this.fire("submit");
                var url = Jhtml.Url.build(this.config.actionUrl || this.element.getAttribute("action"));
                var formData = this.buildFormData(submitConfig);
                let monitor = Jhtml.Monitor.of(this.element);
                let request = this.curRequest = Jhtml.getOrCreateContext(this.element.ownerDocument).requestor
                    .exec("POST", url);
                request.send(formData).then((response) => {
                    if (this.curRequest !== request)
                        return;
                    if ((!this.config.successResponseHandler || !this.config.successResponseHandler(response))
                        && monitor) {
                        monitor.handleDirective(response.directive);
                    }
                    if (submitConfig && submitConfig.success) {
                        submitConfig.success();
                    }
                    this.unblock();
                    this.fire("submitted");
                }).catch((e) => {
                    if (this.curRequest !== request)
                        return;
                    if (submitConfig && submitConfig.error) {
                        submitConfig.error();
                    }
                    this.unblock();
                    this.fire("submitted");
                });
                this.block();
            }
            static from(element) {
                let form = Jhtml.Util.getElemData(element, Form.KEY);
                if (form instanceof Form) {
                    return form;
                }
                form = new Form(element);
                Jhtml.Util.bindElemData(element, Form.KEY, form);
                form.observe();
                return form;
            }
        }
        Form.KEY = "jhtml-form";
        Ui.Form = Form;
        class ControlLock {
            constructor(containerElem) {
                this.containerElem = containerElem;
                this.lock();
            }
            lock() {
                if (this.controls)
                    return;
                this.controls = Jhtml.Util.find(this.containerElem, "input:not([disabled]), textarea:not([disabled]), button:not([disabled]), select:not([disabled])");
                for (let control of this.controls) {
                    control.setAttribute("disabled", "disabled");
                }
            }
            release() {
                if (!this.controls)
                    return;
                for (let control of this.controls) {
                    control.removeAttribute("disabled");
                }
                this.controls = null;
            }
        }
        (function (Form) {
            class Config {
                constructor() {
                    this.disableControls = true;
                    this.autoSubmitAllowed = true;
                    this.actionUrl = null;
                }
            }
            Form.Config = Config;
        })(Form = Ui.Form || (Ui.Form = {}));
    })(Ui = Jhtml.Ui || (Jhtml.Ui = {}));
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    var Ui;
    (function (Ui) {
        class Link {
            constructor(elem) {
                this.elem = elem;
                this.ecr = new Jhtml.Util.CallbackRegistry();
                this.dcr = new Jhtml.Util.CallbackRegistry();
                this.disabled = false;
                this.requestConfig = Jhtml.FullRequestConfig.fromElement(this.elem);
                elem.addEventListener("click", (evt) => {
                    evt.preventDefault();
                    this.handle();
                    return false;
                });
            }
            handle() {
                if (this.disabled)
                    return;
                let event = new Link.Event();
                this.ecr.fire(event);
                if (!event.execPrevented) {
                    this.exec();
                }
            }
            exec() {
                this.dcr.fire(Jhtml.Monitor.of(this.elem).exec(this.elem.href, this.requestConfig));
            }
            get element() {
                return this.elem;
            }
            dispose() {
                this.elem.remove();
                this.elem = null;
                this.dcr.clear();
            }
            onEvent(callback) {
                this.ecr.on(callback);
            }
            offEvent(callback) {
                this.ecr.off(callback);
            }
            onDirective(callback) {
                this.dcr.on(callback);
            }
            offDirective(callback) {
                this.dcr.off(callback);
            }
            static from(element) {
                let link = Jhtml.Util.getElemData(element, Link.KEY);
                if (link instanceof Link) {
                    return link;
                }
                link = new Link(element);
                Jhtml.Util.bindElemData(element, Link.KEY, link);
                return link;
            }
        }
        Link.KEY = "jhtml-link";
        Ui.Link = Link;
        (function (Link) {
            class Event {
                constructor() {
                    this._execPrevented = false;
                }
                get execPrevented() {
                    return this._execPrevented;
                }
                preventExec() {
                    this._execPrevented = true;
                }
            }
            Link.Event = Event;
        })(Link = Ui.Link || (Ui.Link = {}));
    })(Ui = Jhtml.Ui || (Jhtml.Ui = {}));
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    var Ui;
    (function (Ui) {
        class Scanner {
            static scan(elem) {
                for (let linkElem of Jhtml.Util.findAndSelf(elem, Scanner.A_SELECTOR)) {
                    Ui.Link.from(linkElem);
                }
                for (let fromElem of Jhtml.Util.findAndSelf(elem, Scanner.FORM_SELECTOR)) {
                    Ui.Form.from(fromElem);
                }
            }
            static scanArray(elems) {
                for (let elem of elems) {
                    Scanner.scan(elem);
                }
            }
        }
        Scanner.A_ATTR = "data-jhtml";
        Scanner.A_SELECTOR = "a[" + Scanner.A_ATTR + "]";
        Scanner.FORM_ATTR = "data-jhtml";
        Scanner.FORM_SELECTOR = "form[" + Scanner.FORM_ATTR + "]";
        Ui.Scanner = Scanner;
    })(Ui = Jhtml.Ui || (Jhtml.Ui = {}));
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    var Util;
    (function (Util) {
        class CallbackRegistry {
            constructor() {
                this.callbacks = {};
            }
            on(callback) {
                this.onType("", callback);
            }
            onType(type = "", callback) {
                if (!this.callbacks[type]) {
                    this.callbacks[type] = [];
                }
                if (-1 == this.callbacks[type].indexOf(callback)) {
                    this.callbacks[type].push(callback);
                }
            }
            off(callback) {
                this.offType("", callback);
            }
            offType(type = "", callback) {
                if (!this.callbacks[type])
                    return;
                let i = this.callbacks[type].indexOf(callback);
                this.callbacks[type].splice(i, 1);
            }
            fire(...args) {
                this.fireType("", ...args);
            }
            fireType(type, ...args) {
                if (!this.callbacks[type])
                    return;
                for (let callback of this.callbacks[type]) {
                    callback(...args);
                }
            }
            clear() {
                this.callbacks = {};
            }
        }
        Util.CallbackRegistry = CallbackRegistry;
    })(Util = Jhtml.Util || (Jhtml.Util = {}));
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    var Util;
    (function (Util) {
        function closest(element, selector, selfIncluded) {
            do {
                if (element.matches(selector)) {
                    return element;
                }
            } while (element = element.parentElement);
        }
        Util.closest = closest;
        function getElemData(elem, key) {
            return elem["data-" + key];
        }
        Util.getElemData = getElemData;
        function bindElemData(elem, key, data) {
            elem["data-" + key] = data;
        }
        Util.bindElemData = bindElemData;
        function findAndSelf(element, selector) {
            let foundElems = find(element, selector);
            if (element.matches(selector)) {
                foundElems.unshift(element);
            }
            return foundElems;
        }
        Util.findAndSelf = findAndSelf;
        function find(nodeSelector, selector) {
            let foundElems = [];
            let nodeList = nodeSelector.querySelectorAll(selector);
            for (let i = 0; i < nodeList.length; i++) {
                foundElems.push(nodeList.item(i));
            }
            return foundElems;
        }
        Util.find = find;
        function array(nodeList) {
            let elems = [];
            for (let i = 0; i < nodeList.length; i++) {
                elems.push(nodeList.item(i));
            }
            return elems;
        }
        Util.array = array;
    })(Util = Jhtml.Util || (Jhtml.Util = {}));
})(Jhtml || (Jhtml = {}));
var Jhtml;
(function (Jhtml) {
    var Util;
    (function (Util) {
        class ElemConfigReader {
            constructor(element) {
                this.element = element;
            }
            buildName(key) {
                return "data-jhtml-" + key;
            }
            readBoolean(key, fallback) {
                let value = this.element.getAttribute(this.buildName(key));
                if (value === null) {
                    return fallback;
                }
                switch (value) {
                    case "true":
                    case "TRUE:":
                        return true;
                    case "false":
                    case "FALSE":
                        return false;
                    default:
                        throw new Error("Attribute '" + this.buildName(key) + " of Element " + this.element.tagName
                            + "  must contain a boolean value 'true|false'.");
                }
            }
        }
        Util.ElemConfigReader = ElemConfigReader;
    })(Util = Jhtml.Util || (Jhtml.Util = {}));
})(Jhtml || (Jhtml = {}));
//# sourceMappingURL=jhtml.js.map
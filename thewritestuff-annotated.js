/************************************************
** thewritestuff.js
**
** a self-standing library that monkey-patches
** document.write corss broswer for use after
** page load.  This enables the pushing of 3rd
** party widgets and libraries based on
** document.write after the page load event.
**
** @author: Matthew Story <matt@tablethotels.com>
** @version: 0.9
** @license: BSD (see LICENSE)
** @copyright: 2011, Tablet Inc
************************************************/

/*TODO: comments*/
var Write = function() {
    this.init.apply(this, arguments);
};
Write.prototype = {
    init: function(str, bind) {
        this.options = this.extend({
            register: true
        }, arguments[2]);
        this.str = str;
        this.bind = (!bind || bind == document || bind == window) ? document.body:bind;
        if (this.options.register) {
            Writes.register(this);
        }
    },
    extend: function(obj1, obj2) {
        for (var i in obj2) {
            obj1[i] = obj2[i];
        }
        return obj1;
    }
};
var Writes = {
    writes: [],
    inprocess: [],
    remaining: [],
    work: [],
    workIndex: false,
    workWrite: false,
    waiting: false,
    writing: false,
    scriptTag: /<[Ss][Cc][Rr][Ii][Pp][Tt][^>]*>[\S\s]*?<\/[Ss][Cc][Rr][Ii][Pp][Tt]>/g,
    finishScriptTag: false,
    div: document.createElement('div'),
    waitingToWrite: [],
    register: function(write) {
        if (this.writing) {
            this.inprocess.push(write);
            return;
        } 
        this.writes.push(write);
        this.fire();
    },
    unregister: function(write) {
        var writes = [];
        for (var i=0;i<this.writes.length;i++) {
            if (this.writes[i] != write) {
                writes.push(this.writes[i]);
            }
        }
        this.writes = writes;
    },
    fire: function() {
        if (!this.waiting) {
            window.setTimeout(this.bind(this.write, this), 0);
        }
        this.waiting = true;
    },
    write: function(writes) {
        this.writing = true;
        writes = (writes && writes.constructor == Array) ? writes:this.writes;
        if (this.writeParts(this.uniqueifyWrites(writes))) {
            this.clear();
            this.onFinish();
        }
    },
    uniqueifyWrites: function(writes) {
        var uniqueWrites = [];
        for (var i=0;i<writes.length;i++) {
            var key = this.getKeyFromBind(writes[i].bind, uniqueWrites);
            if (key < 0) {
                uniqueWrites.push(new Write('', writes[i].bind, {register: false}));
                key = uniqueWrites.length-1;
            }
            uniqueWrites[key].str += writes[i].str;
        }
        return uniqueWrites;
    },
    writeParts: function(writes) {
        for(var i=0;i<writes.length;i++) {
            if (!this.writePart(writes[i], writes.slice(i+1) || [])) {
                return false;
            }
        }
        return true;
    },
    writePart: function(write, after) {
        var innerHTML = this.writeAndReplaceScripts(write, after);
        // if writeAndReplaceScripts returns something other than string, write.str
        // has a <script>, and that part of write.str has been appended to the target.
        // with the non-<script> parts stored to this.work and this.remaining.
        // if we get a string back for innerHTML, the document.write is spitting
        // out non-<script> html, like <img>, etc.
        if (!innerHTML && innerHTML.constructor != String) {
            return false;
        }
        else if (innerHTML.constructor == String) {
            this.appendChildren(write.bind, this.arrayify(this.getChildrenFromString(innerHTML)));
        }
        return true;
    },
    writeAndReplaceScripts: function(write, after) {
        var strings = this.splitStringByScripts(write.str);
        // check for any <script> tags in this write's str
        for (var i=0;i<strings.length;i++) {
            // if found ...
            if (strings[i].match(this.scriptTag)) {
                // store list of write.str split by <script> in this.work
                // including the string with <script>
                this.work = strings;
                this.workIndex = i;
                this.workWrite = write;
                this.remaining = after;
                // move to do something with the string with <script> in the target element
                this.appendChildren(write.bind, this.arrayify(this.getChildrenFromString(strings[i])));
                // short-circuit the process started in in fire, then write
                // will be picked up with the children are loaded
                return false;
            }
        }
        return (strings.length) ? strings.join('') : true;
    },
    getChildrenFromString: function(str) {
        // workaround necessary to accommodate IE
        if (str.match(this.scriptTag)) {
            return [this.buildScriptTagFromString(str)];
        }
        this.div.innerHTML = str;
        return this.div.childNodes;
    },
    appendChildren: function(element, children) {
        for (var i=0;i<children.length;i++) {
            if (children[i].tagName == 'SCRIPT') {
                var clone;
                //workaround for IE
                if (!!(window.attachEvent && !window.opera)) {
                    clone = children[i];
                }
                else {
                    clone = children[i].cloneNode(true);
                }
                // workaround for safari
                if (!clone.src && !clone.SRC) {
                    element.appendChild(clone);
                    // when we can't set an event handler, write another <script>
                    // that triggers this.finish
                    element.appendChild((!!(window.attachEvent && !window.opera)) ? this.finishScript() : this.finishScript().cloneNode(true));
                }
                else {
                    if (!!(window.attachEvent && !window.opera)) {
                        this.onReadyStateChangeHandler = this.bind(this.onReadyStateChange, this);
                        Writes.observe(clone, 'readystatechange', this.onReadyStateChangeHandler);
                    }
                    else {
                        Writes.observe(clone, 'load', this.bind(this.finish, this));
                    }
                    element.appendChild(clone);
                }
            }
            else {
                element.appendChild(children[i]);
            }
        }
    },
    // returns a <script> element that will trigger Writes.finish when we can't
    // listen for a load event.
    finishScript: function() {
        if (!!(window.attachEvent && !window.opera)) {
            this.finishScriptTag = false;
        }
        if (!this.finishScriptTag) {
            this.finishScriptTag = document.createElement('script');
            this.finishScriptTag.type = 'text/javascript';
            var innerHTML = 'window.setTimeout(Writes.bind(Writes.finish, Writes), 0);';
            if (!!(window.attachEvent && !window.opera)) {
                this.finishScriptTag.text = innerHTML;
            } else {
                this.finishScriptTag.appendChild(document.createTextNode(innerHTML));
            }
        }
        return this.finishScriptTag; 
    },
    // buildScriptTagFromString and makeKeyValuePairs used to get a list
    // of dom elements to append to the target when str has <script>'s.
    buildScriptTagFromString: function(str) {
        var keyValuePairs = this.makeKeyValuePairs(str);
        var scriptTag = document.createElement('script');
        for (var i in keyValuePairs) {
            scriptTag.setAttribute(i, keyValuePairs[i]);
        }
        var innerHTML = str.replace(/<[Ss][Cc][Rr][Ii][Pp][Tt][^>]*>([\S\s]*?)<\/[Ss][Cc][Rr][Ii][Pp][Tt]>/g, '$1');
        if (innerHTML) {
            if (!!(window.attachEvent && !window.opera)) {
                scriptTag.text = innerHTML;
            } else {
                scriptTag.appendChild(document.createTextNode(innerHTML));
            }
        }
        return scriptTag;
    },
    // makeKeyValuePairs, from <script> attributes
    // {type:"text/javascript", src:"shittyad.js"}
    makeKeyValuePairs: function(str) {
        str = str.replace(/<[Ss][Cc][Rr][Ii][Pp][Tt]([^>]*)>[\S\s]*/g, '$1');
        str = (str && !str.split(' ')) ? [str] : str.split(' ');
        var kvps = {};
        for (var i=0;i<str.length;i++) {
            str[i] = str[i].split('=');
            if (str[i].length == 2) {
                kvps[str[i][0].replace(/^[Ss][Rr][Cc]$/g, 'src')] = str[i][1].replace(/(^\s*['"])|(['"]\s*$)/g, '');
            }
        }
        return kvps;
    },
    finish: function() {
        // this.work is array of document.write strings split on <script>'s
        // this.workIndex is the index of the most recent <script> we encountered
        this.work[this.workIndex] = '';
        // any document.writes in the <script> in this.work[this.workIndex] that
        // was appended in the script that triggered this finish put their strings
        // in this.inprocess. replace this.work[this.workIndex] with these strings.
        for (var i=0;i<this.inprocess.length;i++) {
            this.work[this.workIndex] += this.inprocess[i].str;
        }
        // update the working string of stuff to be written for the original write
        // with everything that's been written so far.
        this.workWrite.str = this.work.join('');
        var remaining = [this.workWrite].concat(this.remaining);
        this.clearInProcess();
        // iterate on the process. iteration stops when this.finish no longer needs
        // to be called because no script was loaded in appendChildren
        this.write(remaining);
    },
    onReadyStateChange: function(event) {
        if (event.srcElement.readyState == 'complete' || event.srcElement.readyState == 'loaded' || event.srcElement.readyState == 'interactive') {
            this.stopObserving(event.srcElement, 'readystatechange', this.onReadyStateChangeHandler);
            this.finish();
        }
    },
    clear: function() {
        this.clearInProcess();
        this.waiting = false;
        this.writing = false;
        this.writes = [];
    },
    clearInProcess: function() {
        this.inprocess = [];
        this.remaining = [];
        this.workWrite = [];
        this.work = [];
        this.workIndex = false;
    },
    onFinish: function() {
        if (Writes.waitingToWrite.length) {
            (Writes.waitingToWrite.shift())();
        }
    },
    onLoad: function() {
        document.write = function(str) {
            new Write(str, this);
        }
        this.onFinish();
    },
    // mildly boring utility
    getKeyFromBind: function(bind, writes) {
        for (var i=0;i<writes.length;i++) {
            if (bind == writes[i].bind) {
                return i;
            }   
        }   
        return -1; 
    },
    splitStringByScripts: function(str) {
        return this.zipper(str.split(this.scriptTag) || [], str.match(this.scriptTag) || []);
    },
    bindWrites: function(writes, bind) {
        for (var i=0;i<writes.length;i++) {
            writes.bind = bind;
        }
        return writes; 
    },
    // utterly boring utility
    bind: function(method, bind) {
        return function() {
            method.apply(bind, arguments);
        }
    },
    zipper: function(arr1, arr2) {
        var arr = [];
        for (var i=0;i<((arr1.length > arr2.length) ? arr1.length:arr2.length);i++) {
            if (i<arr1.length) {
                arr.push(arr1[i]);
            }
            if (i<arr2.length) {
                arr.push(arr2[i]);
            }
        }
        return arr;
    },
    arrayify: function(arresque) {
        var arr = [];
        for (var i=0;i<arresque.length;i++) {
            arr.push(arresque[i]);
        }
        return arr;
    },
    observe: function(elem, eventName, method) {
        if (elem.addEventListener) {
            elem.addEventListener(eventName, method, false);
        } else {
            elem.attachEvent("on" + eventName, method);
        }
    },
    stopObserving: function(elem, eventName, method) {
        if (elem.removeEventListener) {
            elem.removeEventListener(eventName, method, false);      
        } else {
            elem.detachEvent("on" + eventName, method);
        }
    },
    load: function() {
        var imgs = (navigator.userAgent.indexOf('AppleWebKit/') > -1) ? document.getElementsByTagName('img'):[];    
        if (!imgs.length || imgs[imgs.length-1].complete) {
            this.onLoad();
            return;
        }
        window.setTimeout(this.bind(this.load, this), 100);
    }
};
Writes.observe(window, 'load', Writes.bind(Writes.load, Writes));

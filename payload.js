// Optimized Windows derivative of rt25ai/chatgpt-desktop-rtl-rt-ai.
// Original MIT copyright: RT-AI / Roi Itach; see LICENSE and NOTICE.md.
// Project: https://github.com/Prhmrd83/chatgpt-rtl-windows
// Text direction is scoped to prose/labels, never dir/lang on app containers.
// --- RT-AI CODEX RTL PATCH START ---
;(function () {
    "use strict";
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (window.__RT_AI_CODEX_RTL_PATCH__) return;
    window.__RT_AI_CODEX_RTL_PATCH__ = true;
    var VERSION = "0.1.2", STYLE_ID = "rt-ai-codex-rtl-styles";
    var CLS_FLIP = "rt-ai-rtl", CLS_TEXT = "rt-ai-rtl-text", CLS_LTR = "chatgpt-rtl-ltr-text", CLS_NODRAG = "rt-ai-nodrag";
    var FLOW_SEL = "p,li,blockquote,h1,h2,h3,h4,h5,h6,dd,dt,td,th,figcaption,caption,legend";
    var GENERIC_SEL = "div,span,a,label,button,summary,option,[role=tooltip],[role=heading]";
    var BLOCK_SEL = FLOW_SEL + "," + GENERIC_SEL;
    var FLIP_SEL = "ul,ol,blockquote";
    var CODE_SEL = "pre,code,kbd,samp,.cm-editor,.monaco-editor,.shiki,.hljs,[data-language],.katex,.MathJax,mjx-container,.xterm,[role=terminal],[data-terminal],[data-code]";
    var EDITABLE_SEL = '[contenteditable="true"],[contenteditable=""],[contenteditable="plaintext-only"]';
    var INPUT_SEL = 'textarea,input:not([type]),input[type=text],input[type=search]';
    var OWNED_SEL = '.chatgpt-rtl-ltr-run,.chatgpt-rtl-ui-run';
    var TEXT_BUDGET = 4000, WORK_PER_FRAME = 160, MAX_QUEUE = 4000;
    var NODRAG_MAX_TOP = 200, NODRAG_MAX_SCAN = 6000;
    var roots = [], registered = new WeakSet(), shadowCandidates = new Set();
    var queue = [], queued = new Set(), scans = [], scanRoots = new Set(), frame = 0, fullScanPending = false;
    var lastSeen = new WeakMap(), runGroups = new WeakMap(), editorSequence = 0;
    var cmCandidates=new Set(),cmViews=new WeakMap(),cmModulePromise=null,cmActive=0,editorFailures=[];
    var raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (fn) { return window.setTimeout(fn,16); };
    function isRTLChar(code) {
        return (code >= 0x0590 && code <= 0x05ff) ||   // Hebrew
            (code >= 0x0600 && code <= 0x06ff) ||      // Arabic
            (code >= 0x0700 && code <= 0x074f) ||      // Syriac
            (code >= 0x0750 && code <= 0x077f) ||      // Arabic Supplement
            (code >= 0x0780 && code <= 0x07bf) ||      // Thaana
            (code >= 0x08a0 && code <= 0x08ff) ||      // Arabic Extended-A
            (code >= 0xfb1d && code <= 0xfdff) ||      // Hebrew/Arabic presentation
            (code >= 0xfe70 && code <= 0xfeff);        // Arabic presentation-B
    }

    function isLatinChar(code) {
        return (code >= 0x0041 && code <= 0x005a) ||
            (code >= 0x0061 && code <= 0x007a) ||
            (code >= 0x00c0 && code <= 0x024f);
    }

    // First strong character decides what `unicode-bidi: plaintext` will do on
    // its own, so we only need to intervene when it disagrees with the text as
    // a whole.
    function firstStrong(text) {
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            if (isRTLChar(code)) return "rtl";
            if (isLatinChar(code)) return "ltr";
        }
        return null;
    }

    // "ChatGPT הוא כלי מצוין" starts with a Latin product name but is a Hebrew
    // sentence, so plaintext would leave it left-aligned. Decide those by which
    // script actually carries the paragraph. Text that is mostly Latin with a
    // few Hebrew words stays LTR.
    function detectTextDir(text) {
        if (!text) return null;
        var rtl = 0;
        var ltr = 0;
        for (var i = 0; i < text.length; i++) {
            if (!/\p{Letter}/u.test(text[i])) continue;
            var code = text.charCodeAt(i);
            if (isRTLChar(code)) rtl++;
            else if (isLatinChar(code)) ltr++;
        }
        if (rtl === 0) return "ltr";
        return rtl === ltr ? (firstStrong(text) || "ltr") : (rtl > ltr ? "rtl" : "ltr");
    }

    // Text of an element with code spans removed - a Hebrew paragraph that
    // quotes a long snippet of English code is still a Hebrew paragraph.
    function textWithoutCode(el, budget) {
        var out = "";
        var nodes = el.childNodes;
        for (var i = 0; i < nodes.length && out.length < budget; i++) {
            var node = nodes[i];
            if (node.nodeType === 3) {
                out += node.nodeValue || "";
            } else if (node.nodeType === 1 && !matches(node, CODE_SEL)) {
                out += textWithoutCode(node, budget - out.length);
            }
        }
        return out;
    }

    // A list gets its base direction from its items, not from the character
    // count of the whole list: one long English bullet inside an otherwise
    // Hebrew list must not drag the markers back to the left. Ties go to RTL,
    // but only when at least one item really is RTL.
    function listDir(el, fallback) {
        if (el.tagName !== "UL" && el.tagName !== "OL") return fallback;
        var items = el.children;
        var rtl = 0;
        var ltr = 0;
        for (var i = 0; i < items.length; i++) {
            if (items[i].tagName !== "LI") continue;
            var d = detectTextDir(textWithoutCode(items[i], TEXT_BUDGET));
            if (d === "rtl") rtl++;
            else if (d === "ltr") ltr++;
        }
        if (rtl === 0 && ltr === 0) return fallback;
        return rtl >= ltr && rtl > 0 ? "rtl" : "ltr";
    }


    function matches(el, sel) { return !!(el && el.matches && el.matches(sel)); }
    function closest(el, sel) {
        while (el) {
            var found = el.closest && el.closest(sel);
            if (found) return found;
            var root = el.getRootNode && el.getRootNode();
            el = root && root.host;
        }
        return null;
    }
    function isPlainAdapter(el) {
        var host = closest(el,'[data-chatgpt-rtl-plain-editor]');
        return !!host;
    }
    function plainLanguage(el) {
        if(!matches(el,'.cm-editor,.monaco-editor,[data-file-editor]'))return false;
        // The native Markdown tab puts language on .cm-content, not on
        // .cm-editor. Read only explicit metadata from that editor's surface.
        var surface=matches(el,'.cm-editor')?el.querySelector('.cm-content[data-language],.cm-content[data-file-kind]'):null;
        var value=el.getAttribute('data-language')||el.getAttribute('data-file-kind')||(surface&&(surface.getAttribute('data-language')||surface.getAttribute('data-file-kind')))||'';
        return /^(text|plaintext|plain-text|markdown|md|txt)$/.test(value.toLowerCase());
    }
    function protectedCode(el) {
        if(closest(el,'pre,code,kbd,samp,.shiki,.hljs,.katex,.MathJax,mjx-container,.xterm,[role=terminal],[data-terminal],.cm-markdown-code-line,.cm-markdown-table-row'))return true;
        return !!closest(el,CODE_SEL) && !isPlainAdapter(el);
    }
    function excluded(el) { return !!closest(el,'script,style,svg,canvas,math,noscript,'+OWNED_SEL) || protectedCode(el); }
    function styleFor(root,id,css) {
        var style=root.querySelector('#'+id);
        if(!style) {
            style=document.createElement('style');style.id=id;
            var target=root.nodeType===9?(root.head||root.documentElement):root;
            target.insertBefore(style,target.firstChild);
        }
        if(style.textContent!==css)style.textContent=css;
        return style;
    }
    function injectStyles(root) {
        // Only text properties have priority over vendor text-left rules.
        // Flex/grid/container direction is never overridden.
        styleFor(root,STYLE_ID,[
            '@layer rt-ai-rtl {',
            'p,li,blockquote,h1,h2,h3,h4,h5,h6,dd,dt,figcaption,caption,td,th{unicode-bidi:plaintext}',
            'pre,code,kbd,samp,.cm-editor,.monaco-editor,.shiki,.hljs,[data-language],.katex,.MathJax,mjx-container,.xterm,[data-code],.chatgpt-rtl-ltr-run{direction:ltr;unicode-bidi:isolate}',
            'pre,pre code,.cm-editor,.monaco-editor{text-align:left}',
            '.'+CLS_FLIP+'{direction:rtl}',
            '.'+CLS_LTR+'{direction:ltr;unicode-bidi:isolate;text-align:start}',
            '}',
            '.'+CLS_TEXT+'{direction:rtl!important;unicode-bidi:isolate!important;text-align:right!important}',
            '.chatgpt-rtl-ui-run{unicode-bidi:isolate!important;direction:rtl!important}',
            '.chatgpt-rtl-ltr-run{unicode-bidi:isolate!important;direction:ltr!important}',
            '.'+CLS_TEXT+' :is(button,[role=button],input,select){direction:ltr;unicode-bidi:isolate}',
            '.'+CLS_TEXT+' :is(pre,code,kbd,samp,.katex,.MathJax,mjx-container){direction:ltr!important;unicode-bidi:isolate!important}',
            '[data-chatgpt-rtl-plain-editor] :is(.cm-markdown-code-line,.cm-markdown-table-row,.cm-gutters){direction:ltr!important;unicode-bidi:isolate!important;text-align:left!important}',
            '.'+CLS_NODRAG+'{-webkit-app-region:no-drag}'
        ].join('\n'));
    }
    function editorRules(record) {
        if(record.editorsDirty) {
            record.editorsDirty=false;
            // Snapshot candidates once, then classify at most one frame budget.
            // A fresh edit replaces stale work before its stylesheet is committed.
            var blocks='p,div,li,h1,h2,h3,h4,h5,h6,ul,ol,blockquote';
            var nested=EDITABLE_SEL.split(',').map(function(sel){return sel+' :is('+blocks+')';}).join(',');
            record.editorJob={nodes:record.root.querySelectorAll(EDITABLE_SEL+','+INPUT_SEL+','+nested+',[data-line],.cm-line'),index:0,rules:[]};
        }
        var job=record.editorJob;if(!job)return;
        var budget=WORK_PER_FRAME;
        while(job.index<job.nodes.length&&budget-->0) {
            var node=job.nodes[job.index++];
            if(!node.isConnected||protectedCode(node)||closest(node,'svg,script,style'))continue;
            var isEditor=matches(node,EDITABLE_SEL+','+INPUT_SEL);
            var line=isPlainAdapter(node)&&matches(node,'[data-line],.cm-line');
            if(!isEditor&&!line&&!closest(node,EDITABLE_SEL))continue;
            if(!isEditor&&!line&&/flex|grid/.test(window.getComputedStyle(node).display))continue;
            var base=isEditor?node:(closest(node,EDITABLE_SEL)||closest(node,'[data-chatgpt-rtl-plain-editor]'));
            if(!base)continue;
            if(!base.hasAttribute('data-chatgpt-rtl-editor'))base.setAttribute('data-chatgpt-rtl-editor',String(++editorSequence));
            var selector='[data-chatgpt-rtl-editor="'+base.getAttribute('data-chatgpt-rtl-editor')+'"]',parts=[],cursor=node;
            while(cursor!==base&&cursor.parentElement){
                parts.unshift(':nth-child('+(Array.prototype.indexOf.call(cursor.parentElement.children,cursor)+1)+')');cursor=cursor.parentElement;
            }
            // Select model children by their existing positions, with no new
            // attributes or wrappers inside the editable document.
            if(cursor!==base)continue;
            if(parts.length)selector+=' > '+parts.join(' > ');
            var text=matches(node,INPUT_SEL)?node.value:textWithoutCode(node,TEXT_BUDGET);
            var dir=detectTextDir(text)||'ltr';
            job.rules.push(selector+'{direction:'+dir+'!important;unicode-bidi:isolate!important;text-align:'+(dir==='rtl'?'right':'left')+'!important;}');
        }
        if(job.index===job.nodes.length) {
            styleFor(record.root,'chatgpt-rtl-editor-styles',job.rules.join('\n'));
            record.editorJob=null;
        }
    }
    function saveSelection(el) {
        var root=el.getRootNode(),sel=root.getSelection?root.getSelection():window.getSelection();
        if(!sel||!sel.rangeCount||!el.contains(sel.anchorNode)||!el.contains(sel.focusNode))return null;
        function offset(node,pos){var r=document.createRange();r.selectNodeContents(el);r.setEnd(node,pos);return r.toString().length;}
        return {selection:sel,anchor:offset(sel.anchorNode,sel.anchorOffset),focus:offset(sel.focusNode,sel.focusOffset)};
    }
    function restoreSelection(el,saved) {
        if(!saved)return;
        function point(index){var walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),node,last;while((node=walker.nextNode())){last=node;if(index<=node.length)return [node,index];index-=node.length;}return last?[last,last.length]:[el,0];}
        var a=point(saved.anchor),f=point(saved.focus);saved.selection.setBaseAndExtent(a[0],a[1],f[0],f[1]);
    }
    function retire(anchor, restore) {
        var group=runGroups.get(anchor);if(!group)return;
        if(restore)anchor.data=group.logical;
        group.owned.forEach(function(n){if(n.parentNode)n.remove();});runGroups.delete(anchor);
    }
    function restoreOwned(el) {
        var walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[],n;
        while((n=walker.nextNode()))if(runGroups.has(n))nodes.push(n);
        nodes.forEach(function(n){retire(n,n.data===runGroups.get(n).prefix);});
    }
    var token=/(?:https?:\/\/[^\s\u0590-\u08ff]+|[A-Za-z0-9][A-Za-z0-9._@:\/\\?&=#%+*()<>!\-]*(?:[ \t]+(?:[+*\/=<>\-]|[A-Za-z0-9][A-Za-z0-9._@:\/\\?&=#%+*()<>!\-]*))*)/g;
    function installCodeMirror(host) {
        var uri=window.__CHATGPT_RTL_EDITOR_MODULE__;
        if(location.protocol!=='app:'||!/^\/assets\/[a-zA-Z0-9_.-]+\.js$/.test(uri||''))return;
        var content=host.querySelector('.cm-content'),view=content&&content.cmTile&&content.cmTile.view;
        if(!view)return;
        var attached=cmViews.get(view);
        if(attached){if(attached.plain!==plainLanguage(host)){attached.plain=plainLanguage(host);view.dispatch({});}return;}
        if(!plainLanguage(host))return;
        cmViews.set(view,{pending:true,plain:true});
        if(!cmModulePromise)cmModulePromise=import(uri);
        cmModulePromise.then(function(module){
            if(!host.isConnected||!plainLanguage(host)){cmViews.delete(view);return;}
            var values=Object.keys(module).map(function(k){return module[k];});
            var EditorView=values.find(function(v){return v&&v.findFromDOM&&v.bidiIsolatedRanges&&v.perLineTextDirection;});
            var Decoration=values.find(function(v){return v&&v.mark&&v.set&&v.none;});
            var ViewPlugin=values.find(function(v){return v&&v.fromClass&&v.define;});
            var StateEffect=values.find(function(v){return v&&v.appendConfig&&v.reconfigure;});
            var Direction=values.find(function(v){return v&&v.LTR===0&&v.RTL===1;});
            if(!EditorView||!Decoration||!ViewPlugin||!StateEffect||!Direction)throw Error('Unsupported CodeMirror bidi API');
            function decorations(current){
                if(!plainLanguage(host))return Decoration.none;
                var ranges=[],seen=new Set();
                current.visibleRanges.forEach(function(visible){
                    var line=current.state.doc.lineAt(visible.from);
                    while(line.from<=visible.to){
                        if(!seen.has(line.number)&&detectTextDir(line.text.slice(0,TEXT_BUDGET))==='rtl'){
                            seen.add(line.number);
                            var position=current.domAtPos(line.from),element=position.node.nodeType===1?position.node:position.node.parentElement;
                            if(!closest(element,'.cm-markdown-code-line,.cm-markdown-table-row')){
                                Array.from(line.text.slice(0,TEXT_BUDGET).matchAll(token)).forEach(function(m){if(ranges.length<MAX_QUEUE)ranges.push(Decoration.mark({class:'chatgpt-rtl-ltr-run',bidiIsolate:Direction.LTR}).range(line.from+m.index,line.from+m.index+m[0].length));});
                            }
                        }
                        if(line.to>=current.state.doc.length)break;
                        line=current.state.doc.lineAt(line.to+1);
                    }
                });
                return Decoration.set(ranges,true);
            }
            var plugin=ViewPlugin.fromClass(class {
                constructor(current){this.decorations=decorations(current);this.plain=plainLanguage(host);cmActive++;}
                update(update){var plain=plainLanguage(host);if(update.docChanged||update.viewportChanged||plain!==this.plain){this.plain=plain;this.decorations=decorations(update.view);}}
                destroy(){cmActive--;}
            },{decorations:function(value){return value.decorations;},provide:function(extension){return EditorView.bidiIsolatedRanges.of(function(current){var instance=current.plugin(extension);return instance?instance.decorations:Decoration.none;});}});
            // Use the editor's own decoration and bidi APIs. No document
            // transaction or character changes are submitted by the patch.
            view.dispatch({effects:StateEffect.appendConfig.of([EditorView.perLineTextDirection.of(true),plugin])});
            cmViews.set(view,{plain:plainLanguage(host)});view.requestMeasure();
        }).catch(function(error){editorFailures.push(error.message);cmViews.set(view,{failed:true,plain:plainLanguage(host)});console.warn('[ChatGPT RTL Windows] '+error.message);});
    }
    function isolateRuns(el) {
        var walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[],node;
        while((node=walker.nextNode())) {
            if(closest(node.parentElement,CODE_SEL+',.chatgpt-rtl-ltr-run,'+EDITABLE_SEL+',input,select,svg'))continue;
            var ui=closest(node.parentElement,'.chatgpt-rtl-ui-run');
            if(ui&&ui!==el)continue;
            var control=closest(node.parentElement,'button,[role=button]');
            if(control&&!control.contains(el))continue;
            if(runGroups.has(node))continue;
            nodes.push(node);
        }
        nodes.forEach(function(anchor){
            var value=anchor.data,found=Array.from(value.matchAll(token));if(!found.length)return;
            var fragment=document.createDocumentFragment(),owned=[],pos=0,prefix=value.slice(0,found[0].index);
            found.forEach(function(m){
                if(pos>0){var gap=document.createTextNode(value.slice(pos,m.index));owned.push(gap);fragment.appendChild(gap);}
                var span=document.createElement('span');span.className='chatgpt-rtl-ltr-run';span.textContent=m[0];fragment.appendChild(span);owned.push(span);pos=m.index+m[0].length;
            });
            var suffix=document.createTextNode(value.slice(pos));owned.push(suffix);fragment.appendChild(suffix);
            runGroups.set(anchor,{prefix:prefix,logical:value,owned:owned});anchor.data=prefix;anchor.parentNode.insertBefore(fragment,anchor.nextSibling);
        });
    }
    function isolateDirectText(el) {
        Array.from(el.childNodes).forEach(function(anchor){
            if(anchor.nodeType!==3||runGroups.has(anchor)||detectTextDir(anchor.data)!=='rtl')return;
            var value=anchor.data,span=document.createElement('span');span.className='chatgpt-rtl-ui-run';span.textContent=value;
            runGroups.set(anchor,{prefix:'',logical:value,owned:[span]});anchor.data='';anchor.parentNode.insertBefore(span,anchor.nextSibling);
            isolateRuns(span);
        });
    }
    function flowKind(el) {
        var style=window.getComputedStyle(el);
        if(/flex|grid/.test(style.display))return 'layout';
        if(!matches(el,FLOW_SEL+','+GENERIC_SEL))return null;
        // Parent panels containing paragraphs, controls or other blocks cannot
        // receive direction, even if their combined text is mostly RTL.
        if(Array.from(el.children).some(function(child){
            if(matches(child,OWNED_SEL))return false;
            if(matches(child,'svg,img,button,input,select,textarea,'+EDITABLE_SEL)||child.querySelector('svg,button,input,select,textarea,'+EDITABLE_SEL))return true;
            var display=window.getComputedStyle(child).display;
            if(/flex|grid/.test(display))return true;
            return !/^(inline|contents|none)/.test(display);
        }))return 'layout';
        if(matches(el,FLOW_SEL))return 'flow';
        if(!el.textContent.trim())return null;
        return 'flow';
    }
    function applyTo(el) {
        if(excluded(el)||closest(el,EDITABLE_SEL)||isPlainAdapter(el)) {
            if(el.classList.contains(CLS_TEXT)||el.classList.contains(CLS_LTR)||el.classList.contains(CLS_FLIP)) {
                restoreOwned(el);el.classList.remove(CLS_TEXT,CLS_LTR,CLS_FLIP);lastSeen.delete(el);
            }
            return;
        }
        var kind=flowKind(el);
        if(!kind&&!matches(el,FLIP_SEL))return;
        var raw=el.textContent||'',key=kind+'|'+raw;
        var previous=lastSeen.get(el);
        if(previous===key)return;
        if(previous&&previous.slice(0,previous.indexOf('|'))!==kind)restoreOwned(el);
        lastSeen.set(el,key);
        var dir=detectTextDir(textWithoutCode(el,TEXT_BUDGET)||raw.slice(0,TEXT_BUDGET))||'ltr';
        if(kind==='layout') {
            el.classList.remove(CLS_TEXT,CLS_LTR);
            isolateDirectText(el);return;
        }
        if(matches(el,FLIP_SEL))el.classList.toggle(CLS_FLIP,listDir(el,dir)==='rtl');
        if(!kind)return;
        el.classList.toggle(CLS_TEXT,dir==='rtl');
        el.classList.toggle(CLS_LTR,dir==='ltr'&&matches(el,FLOW_SEL));
        var selection=saveSelection(el);
        if(dir==='rtl')isolateRuns(el);else restoreOwned(el);
        restoreSelection(el,selection);
    }
    var lastNoDragScan = 0;
    // Elements already examined. Keeps the steady-state cost near zero: the
    // first pass pays for the whole document, later passes only look at nodes
    // that appeared since. Cleared whenever a forced rescan is requested.
    var seenForDrag = typeof WeakSet === "function" ? new WeakSet() : null;

    function fixPhantomDragRegions() {
        var els;
        try {
            els = document.querySelectorAll("*");
        } catch (err) {
            return 0;
        }

        var marked = 0;
        var limit = Math.min(els.length, NODRAG_MAX_SCAN);
        for (var i = 0; i < limit; i++) {
            var el = els[i];
            if (seenForDrag) {
                if (seenForDrag.has(el)) continue;
                seenForDrag.add(el);
            }
            if (el.classList.contains(CLS_NODRAG)) continue;

            var rect = el.getBoundingClientRect();
            if (rect.top > NODRAG_MAX_TOP || rect.width < 1 || rect.height < 1) continue;

            var cs = window.getComputedStyle(el);
            // An element that cannot receive pointer events cannot be a drag
            // handle either - that is the whole basis for this workaround, so
            // anything interactive is left exactly as the app declared it.
            if (cs.pointerEvents !== "none") continue;

            var region = cs.webkitAppRegion;
            if (region == null) region = cs.getPropertyValue("-webkit-app-region");
            if (region !== "drag") continue;

            el.classList.add(CLS_NODRAG);
            marked++;
        }
        return marked;
    }

    function scheduleNoDragScan(force) {
        var now = Date.now();
        if (!force && now - lastNoDragScan < 400) return;
        lastNoDragScan = now;
        if (force && typeof WeakSet === "function") seenForDrag = new WeakSet();
        return fixPhantomDragRegions();
    }


    function enqueue(el) {
        if(!el||el.nodeType!==1||queued.has(el))return;
        if(queue.length>=MAX_QUEUE){fullScanPending=true;return;}
        queued.add(el);queue.push(el);
    }
    function collect(root) {
        if(!root||!(root.nodeType===1||root.nodeType===11||root.nodeType===9)||scanRoots.has(root))return;
        scanRoots.add(root);
        scans.push({root:root,walker:document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT,{acceptNode:function(el){return (protectedCode(el)&&!plainLanguage(el))||closest(el,EDITABLE_SEL)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}}),first:true});
    }
    function consider(el) {
        if(el.nodeType!==1)return;
        shadowCandidates.add(el);
        if(el.shadowRoot)registerRoot(el.shadowRoot);
        if(el.tagName==='IFRAME') {
            try{if(el.contentDocument&&el.contentDocument.body)registerRoot(el.contentDocument);}catch(e){}
        }
        if(matches(el,'.cm-editor,.monaco-editor,[data-file-editor]')) {
            if(plainLanguage(el))el.setAttribute('data-chatgpt-rtl-plain-editor','true');
            else if(el.hasAttribute('data-chatgpt-rtl-plain-editor'))el.removeAttribute('data-chatgpt-rtl-plain-editor');
            if(matches(el,'.cm-editor')){cmCandidates.add(el);installCodeMirror(el);}
        }
        if(matches(el,BLOCK_SEL+','+FLIP_SEL))enqueue(el);
    }
    function scheduleFlush(){if(!frame)frame=raf(flush);}
    function flush() {
        frame=0;
        if(fullScanPending){fullScanPending=false;roots.forEach(function(r){collect(r.root.nodeType===9?r.root.body:r.root);});}
        var budget=WORK_PER_FRAME;
        while(scans.length&&budget-->0){
            var job=scans[0],el=job.first?job.root:job.walker.nextNode();job.first=false;
            if(!el){scanRoots.delete(job.root);scans.shift();continue;}
            consider(el);
        }
        budget=WORK_PER_FRAME;
        while(queue.length&&budget-->0){var el=queue.shift();queued.delete(el);if(el.isConnected)try{applyTo(el);}catch(e){/* isolate a malformed node */}}
        roots=roots.filter(function(r){if((r.root.host&&!r.root.host.isConnected)||(r.frame&&(!r.frame.isConnected||r.frame.contentDocument!==r.root))){r.observer.disconnect();registered.delete(r.root);return false;}return true;});
        roots.forEach(editorRules);
        scheduleNoDragScan(false);
        if(queue.length||scans.length||fullScanPending||roots.some(function(r){return r.editorJob||r.editorsDirty;}))scheduleFlush();
    }
    function ownedMutation(m) {
        var parent=m.target.nodeType===1?m.target:m.target.parentElement;
        return !!closest(parent,'#'+STYLE_ID+',#chatgpt-rtl-editor-styles,'+OWNED_SEL);
    }
    function cleanupRemoved(node) {
        if(node.nodeType===3){retire(node,false);return;}
        var walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),n;
        while((n=walker.nextNode()))retire(n,false);
    }
    function registerRoot(root) {
        if(registered.has(root))return;registered.add(root);injectStyles(root);
        var record={root:root,observer:null,editorsDirty:true,inputValues:new WeakMap(),frame:root.nodeType===9&&root!==document?root.defaultView.frameElement:null};
        var observer=new MutationObserver(function(mutations){
            mutations.forEach(function(m){
                if(ownedMutation(m))return;
                if(m.type==='attributes') {
                    // Ignore only class changes made solely by this patch.
                    if(m.attributeName==='class') {
                        function clean(v){return (v||'').split(/\s+/).filter(function(c){return c&&![CLS_FLIP,CLS_TEXT,CLS_LTR,CLS_NODRAG].includes(c);}).join(' ');}
                        if(clean(m.oldValue)===clean(m.target.getAttribute('class')))return;
                    }
                    record.editorsDirty=true;
                    if(protectedCode(m.target)||closest(m.target,EDITABLE_SEL)) {
                        restoreOwned(m.target);
                        var marked=[m.target].concat(Array.from(m.target.querySelectorAll('.'+CLS_TEXT+',.'+CLS_LTR+',.'+CLS_FLIP)));
                        marked.forEach(function(el){el.classList.remove(CLS_TEXT,CLS_LTR,CLS_FLIP);lastSeen.delete(el);});
                    }
                    // Editor metadata can live on a descendant .cm-content.
                    // Revisit the owner when the same tab changes file type.
                    var editorHost=closest(m.target,'.cm-editor,.monaco-editor,[data-file-editor]');
                    if(editorHost){consider(editorHost);collect(editorHost);}
                    lastSeen.delete(m.target);enqueue(m.target);collect(m.target);return;
                }
                if(m.type==='characterData') {
                    var group=runGroups.get(m.target);
                    if(group&&m.target.data!==group.prefix)retire(m.target,false);
                    var host=m.target.parentElement;
                    if(closest(host,EDITABLE_SEL)||isPlainAdapter(host))record.editorsDirty=true;
                    if(host){enqueue(host);var owner=closest(host,FLOW_SEL);if(owner)enqueue(owner);}
                    return;
                }
                Array.from(m.removedNodes).forEach(cleanupRemoved);
                record.editorsDirty=true;
                var owner=closest(m.target.nodeType===1?m.target:m.target.parentElement,'.cm-editor,.monaco-editor,[data-file-editor]');
                if(owner)consider(owner);
                Array.from(m.addedNodes).forEach(function(n){if(n.nodeType===1)collect(n);});
                if(m.target.nodeType===1)enqueue(m.target);
            });scheduleFlush();
        });
        observer.observe(root.nodeType===9?(root.body||root.documentElement):root,{childList:true,subtree:true,characterData:true,attributes:true,attributeOldValue:true,attributeFilter:['class','role','contenteditable','type','data-language','data-file-kind']});
        root.addEventListener('input',function(){record.editorsDirty=true;scheduleFlush();},true);
        record.observer=observer;roots.push(record);collect(root.nodeType===9?root.body:root);scheduleFlush();
    }
    function discoverShadows() {
        cmCandidates.forEach(function(host){if(!host.isConnected){cmCandidates.delete(host);return;}installCodeMirror(host);});
        shadowCandidates.forEach(function(el){if(!el.isConnected){shadowCandidates.delete(el);return;}if(el.shadowRoot)registerRoot(el.shadowRoot);if(el.tagName==='IFRAME')try{if(el.contentDocument&&el.contentDocument.body)registerRoot(el.contentDocument);}catch(e){} });
        // React may reset a controlled input via its value property without
        // dispatching input or changing a DOM attribute.
        roots.forEach(function(record){record.root.querySelectorAll(INPUT_SEL).forEach(function(input){if(record.inputValues.get(input)!==input.value){record.inputValues.set(input,input.value);record.editorsDirty=true;scheduleFlush();}});});
    }
    function init() {
        registerRoot(document);scheduleNoDragScan(true);
        window.setInterval(discoverShadows,1200);
        window.addEventListener('resize',function(){scheduleNoDragScan(true);});
        window.__RT_AI_CODEX_RTL_INFO__={version:VERSION,styleId:STYLE_ID,classes:[CLS_FLIP,CLS_TEXT,CLS_NODRAG],rescan:function(){lastSeen=new WeakMap();fullScanPending=true;scheduleFlush();},fixDragRegions:fixPhantomDragRegions};
        window.__CHATGPT_RTL_PATCH__={version:VERSION,upstream:'rt25ai/chatgpt-desktop-rtl-rt-ai',detectTextDir:detectTextDir,coverage:function(){return {roots:roots.length,pending:queue.length+scans.length,editorPending:roots.reduce(function(n,r){return n+(r.editorJob?r.editorJob.nodes.length-r.editorJob.index:0);},0),codeMirrorAdapters:cmActive,editorFailures:editorFailures.slice(),scope:'app-wide accessible text'};}};
        console.info('[ChatGPT RTL Windows] app-wide patch active (v'+VERSION+')');
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})()
// --- RT-AI CODEX RTL PATCH END ---

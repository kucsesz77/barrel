/// <reference path="TOSCA.ts" />
/// <reference path="csar.ts" />
/// <reference path="Analysis.ts" />
/// <reference path="ManagementProtocols.ts" />


module TOSCAAnalysis {
    function toscaString(node: Element, tagName: string, attr: string) {
	var nodes = getToscaElements(node, tagName);
	if (nodes.length != 1)
	    throw "Invalid format";

	var element = <Element> nodes[0];
	return element.getAttribute(attr);
    }

    function toscaMap(node: Element, tagName: string, attr: string) {
	var r:Analysis.Map<string> = {}
	var nodes = getToscaElements(node, tagName);
	for (var i = 0; i < nodes.length; i++) {
	    var element = <HTMLElement> nodes[0];
	    r[element.id] = element.getAttribute(attr);
	}
	
	return r; //function (id: string) { return r[id] };
    }

    function mapSet(a: string[], m:Analysis.Map<string>) {
	var r: Analysis.Set = {};
	for (var i = 0; i < a.length; i++)
	    r[m[a[i]]] = true;
	return r;
    }

    function nodeTemplateToNode(nodeTemplate: Element, types:Analysis.Map<Element>) {
	var capNames = toscaMap(nodeTemplate, "Capability", "name");
	var reqNames = toscaMap(nodeTemplate, "Capability", "name");
	var typeName = nodeTemplate.getAttribute("name").split(':')[1]
	var mProt = new ManagementProtocol.ManagementProtocol(types[typeName]);

	var transitionToOperation = function(t:ManagementProtocol.Transition) {
	    return new Analysis.Operation(t.target, mapSet(t.reqs, reqNames));
	}

	var states:Analysis.Map<Analysis.State> = {};
	var s = mProt.getStates();
	for (var i = 0; i < s.length; i++) {
	    var state = mProt.getState(s[i]);
	    var caps = mapSet(state.getCaps(), capNames);
	    var reqs = mapSet(state.getReqs(), reqNames);
	    var trans = mProt.getOutgoingTransitions(s[i]);
	    var ops:Analysis.Map<Analysis.Operation> = {};
	    for (var j = 0; j < trans.length; j++)
		ops[trans[i].iface + ":" + trans[i].operation] = transitionToOperation(trans[i]);
	    states[s[i]] = new Analysis.State(caps, reqs, ops);
	}

	return new Analysis.Node(states, mProt.getInitialState());
    }

    export function serviceTemplateToApplication(csar: Csar.Csar, serviceTemplate: Element) {
	var nodeTypes = csar.get("NodeType");
	var nodeTemplates = getToscaElements(serviceTemplate, "NodeTemplate");
	var relationships = getToscaElements(serviceTemplate, "RelationshipTemplate");

	var types:Analysis.Map<Element> = {};
	var nodes:Analysis.Map<Analysis.Node> = {};
	var binding:Analysis.Map<string> = {};

	for (var i = 0; i < nodeTypes.length; i++) {
	    var type = <Element> nodeTypes[i].element;
	    types[type.getAttribute("name")] = type;
	}

	for (var i = 0; i < nodeTemplates.length; i++) {
	    var template = <HTMLElement> nodeTemplates[i];
	    nodes[template.id] = nodeTemplateToNode(template, types);
	}

	for (var i = 0; i < relationships.length; i++) {
	    var rel = <Element> relationships[i];
	    var req = toscaString(rel, "SourceElement", "ref");
	    var cap = toscaString(rel, "TargetElement", "ref");
	    binding[req] = cap;
	}

	return new Analysis.Application(nodes, binding);
    }
}
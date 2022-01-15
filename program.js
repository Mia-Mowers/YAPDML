const { jsPDF } = require("jspdf");

const fs = require('fs');

let yapText = fs.readFileSync("input.yap", 'utf8');
let docObject = parseTextToDocumentElements(yapText);
outputToPDF(docObject);

function baseFunctions() {
	return {
		"text": function (input, doc, pdf) {textEl(input, doc, pdf)},
		"pushLine": function (input, doc, pdf) {pushLineEl(input, doc, pdf)},
		"newpage": function (input, doc, pdf) {newpageEl(input, doc, pdf)},
		"set": function (input, doc, pdf) {setData(input, doc, pdf)},
		"get": function (input, doc, pdf) {displayData(input, doc, pdf)},
		"newParagraph": function (input, doc, pdf) {newParagraphEl(input, doc, pdf)}
	}
}

function parseTextToDocObject(inputText) {
	var doc = {
		elements : []
	}
	var el = doc.elements;
	var parseMode = 0;


}

function parseTextToDocumentElements(inputText) {
	var inputYAP = inputText.replaceAll("\t","").trim().split(/(\n)/g);
	inputYAP = filterEl(inputYAP, '');
	inputYAP = combineAbjacentLines(inputYAP);
	inputYAP = removeRepeatAbjacentEl(inputYAP, '\n');
	inputYAP = splitOnEl(inputYAP, "$");
	inputYAP = splitOnEl(inputYAP, "{");
	inputYAP = splitOnEl(inputYAP, "}");
	inputYAP = filterEl(inputYAP, '');

	function filterEl(input, filter) {
		var out = [];
		input.forEach(el => {
			if (el != filter){
				out.push(el);
			}
		});
		return out;
	}
	function removeRepeatAbjacentEl(input, filter) {
		var out = [];
		var oneElAlready = false;
		input.forEach(el => {
			if (el != filter){
				out.push(el);
				oneElAlready = false;
			} else if (oneElAlready != true) {
				out.push(el);
				oneElAlready = true;
			}
		});
		return out;
	}
	function combineAbjacentLines(input) {
		var out = [];
		for (var i = 0; i < input.length; i++) {
			var el = input[i];
			var combined = el;
			while (i + 2 < input.length && el != '\n' && input[i+2] != '\n') {
				i += 2;
				combined += " " + input[i];
			}
			out.push(combined);
		}
		return out;
	}
	function splitOnEl(input, delim) {
		var out = [];
		//var reg = /(\$)/g;
		var reg = new RegExp('(\\'+delim+')','g');
		for (var i = 0; i < input.length; i++) {
			var el = input[i];
			var splitArr = el.split(reg);
			splitArr.forEach(el => {
				out.push(el);
			});
		}
		return out;
	}

	var docObject = {
		functions : baseFunctions(),
		data : {},
		elements : []
	}

	var docEls = docObject.elements;
	var endElBuffer = [];

	for (var i = 0; i < inputYAP.length; i++) {
		var el = inputYAP[i];
		if (el == '\n') {
			docEls.push({
				type : "pushLine"
			});
			docEls.push({
				type : "newParagraph"
			});
		} else if (el == '$') {
			i++;
			var command = "";
			while (inputYAP[i] != "{") {
				command += inputYAP[i];
				i++;
			}
			docEls.push({
				type : command + "Start"
			});
			endElBuffer.push({
				type : command + "End"
			});
		} else if (el == '}') {
			docEls.push(endElBuffer.pop());
		} else {
			docEls.push({
				type : "text",
				content : el
			});
		}
	}

	console.log(docEls);

	return docObject;
}

function outputToPDF(d) {
	const pdf = new jsPDF();

	d.data.margin = (72) * .25;
	d.data.verticalPointer = d.data.margin;
	d.data.horizontalPointer = d.data.margin;
	d.data.lineBuffer = [];
	d.data.largestSizeInBuffer = 0;
	d.data.lineSpacing = 1.35;
	d.data.paragraphSpacing = .2;
	d.data.paralineNumber = 0;

	d.elements.forEach(element => {
		evalElement(element);
	});

	pdf.save("out.pdf");

	function evalElement(el) {
		if (docObject.functions.hasOwnProperty(el.type)) {
			docObject.functions[el.type](el, d, pdf);
		} else {
			console.log(`${el.type} does not exist`);
		}
	}

	function textEl(el, d, pdf) {
		d.data.lineBuffer.push(el);
		d.data.largestSizeInBuffer = Math.max(pdf.getFontSize(), d.data.largestSizeInBuffer)
	}

	function pushLineEl(el, d, pdf) {
		d.data.paralineNumber += 1;
		newLineSpace = d.data.largestSizeInBuffer / (72/25.6);
		if (d.data.paralineNumber != 1) {
			newLineSpace = newLineSpace * d.data.lineSpacing;
		} else {
			newLineSpace = newLineSpace;
		}
		d.data.verticalPointer += newLineSpace;
		d.data.lineBuffer.forEach(buffEl => {
			pdf.text(buffEl.content, d.data.horizontalPointer, d.data.verticalPointer);
			d.data.horizontalPointer += pdf.getTextWidth(buffEl.content);
		});
		d.data.lineBuffer = [];
		d.data.horizontalPointer = d.data.margin;
		d.data.largestSizeInBuffer = d.data.margin;
	}

	function newpageEl(el, d, pdf) {
		d.data.verticalPointer = d.data.margin;
		d.data.horizontalPointer = d.data.margin;
		pdf.addPage();
	}

	function newParagraphEl(el, d, pdf) {
		d.data.lineNumber = 0;
		insertLineSpace(pdf.getFontSize() * d.data.paragraphSpacing);
	}

	function insertLineSpace(d, pdf, amount) {
		d.data.verticalPointer += amount;
	}

	function displayData(el, d, pdf) {
		el.content = data[el.content];
		d.data.lineBuffer.push(el);
	}

	function setData(el, d, pdf) {
		contentSplit = el.content.split("=")
		d.data[contentSplit[0].trim()] = contentSplit[1].trim();
	}

	function scriptEl(el, d, pdf) {
		eval(el.content);
	}

	function scriptEchoEl(el, d, pdf) {
		el.content = String(eval(el.content));
		d.data.lineBuffer.push(el);
	}
}

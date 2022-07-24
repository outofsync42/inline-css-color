const { isSet } = require('util/types');
const vscode = require('vscode');
const Application = require('./lib/application');

require('./lib/functions')();

/**
 * @param {Application} application
 */
var InlineCssColor = function (application) {

	var self = this;

	this.isValidDocType = function () {
		var validDocTypes = ['php', 'html', 'htm']
		return in_array(application.documentType(), validDocTypes);
	}

	//create new types so old ones are not overwritten
	let colorKeyWord = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.keyword'),
	})
	let colorPunctuation = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.punctuation'),
	})
	let colorValueConstant = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.valueConstant'),
	})
	let colorSupportFunction = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.supportFunction'),
	})
	let colorValueNumeric = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.valueNumeric'),
	})
	let colorString = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.string'),
	})

	let linesSet = {};

	let fullSweep = true;

	this.colorLines = function (startLine, endLine, diff) {

		let lines = application.getDocumentLinesInfo();
		diff = isset(diff) ? diff : null;
		//console.log(lines);
		if (fullSweep == false) {
			if (diff===null || diff < 0) {
				let currentIds = [];
				var deleteIds = [];
				for (var i in lines) {
					if (lines[i]['syntax'] == 'html') {
						currentIds[lines[i]['id']] = true;
					}
				}
				for (var i in linesSet) {
					if (isset(currentIds[linesSet[i]['id']]) == false) {
						deleteIds.push(linesSet[i]['id']);
					}
				}

				for (var i in deleteIds) {
					linesSet[deleteIds[i]]['keywords']['decorator'].dispose();
					linesSet[deleteIds[i]]['punctuation']['decorator'].dispose();
					linesSet[deleteIds[i]]['valueConstant']['decorator'].dispose();
					linesSet[deleteIds[i]]['valueNumeric']['decorator'].dispose();
					linesSet[deleteIds[i]]['supportFunction']['decorator'].dispose();
					linesSet[deleteIds[i]]['string']['decorator'].dispose();
					delete linesSet[deleteIds[i]];
				}
			}
		}

		let editor = application.editor();
		let keyWordRanges = [];
		let punctuationRanges = [];
		let supportFunctionRanges = [];
		let valueConstantRanges = [];
		let valueNumericRanges = [];
		let stringRanges = [];

		startLine = is_int(startLine) ? startLine : 0
		endLine = is_int(endLine) ? endLine : lines.length - 1; //inclusive

		for (var i in lines) {
			if (fullSweep || (i >= startLine && i <= endLine)) {
				if (lines[i]['syntax'] == 'html') {

					let id = lines[i]['id'];
					if (fullSweep == false) {
						if (isset(linesSet[id]) == false) {
							linesSet[id] = {
								id: id,
								keywords: {
									decorator: vscode.window.createTextEditorDecorationType({
										color: new vscode.ThemeColor('inline.css.keyword'),
									}),
									range: []
								},
								punctuation: {
									decorator: vscode.window.createTextEditorDecorationType({
										color: new vscode.ThemeColor('inline.css.punctuation'),
									}),
									range: []
								},
								valueConstant: {
									decorator: vscode.window.createTextEditorDecorationType({
										color: new vscode.ThemeColor('inline.css.valueConstant'),
									}),
									range: []
								},
								valueNumeric: {
									decorator: vscode.window.createTextEditorDecorationType({
										color: new vscode.ThemeColor('inline.css.valueNumeric'),
									}),
									range: []
								},
								supportFunction: {
									decorator: vscode.window.createTextEditorDecorationType({
										color: new vscode.ThemeColor('inline.css.supportFunction'),
									}),
									range: []
								},
								string: {
									decorator: vscode.window.createTextEditorDecorationType({
										color: new vscode.ThemeColor('inline.css.string'),
									}),
									range: []
								},
							}
						} else {
							linesSet[id]['keywords']['range'] = [];
							linesSet[id]['punctuation']['range'] = [];
							linesSet[id]['valueConstant']['range'] = [];
							linesSet[id]['valueNumeric']['range'] = [];
							linesSet[id]['supportFunction']['range'] = [];
							linesSet[id]['string']['range'] = [];
						}
					}
					let elements = lines[i]['html']['elements'];
					for (var o in elements) {
						let style = elements[o]['attributes']['style'];
						if (style) {


							let line = style['line'];
							let text = lines[line]['text'];
							let startPos = style['valueStartPos'];
							let endPos = style['valueEndPos'];
							if (startPos === null || endPos === null) {
								continue;
							}

							let x = startPos;
							let numericStart = null;
							let constStart = null;
							let stringStart = null;
							let phpOpen = false;
							let inMatch = false;
							let openQuote = '';
							while (openQuote == '' && x > -1) {
								x--;
								if (text[x] == '"' || text[x] == "'") {
									openQuote = text[x];
								}
							}
							if (x == -1) {
								console.log('error finding opening quote on line ' + line);
								continue;
							}
							x++;
							let openString = openQuote == "'" ? '"' : "'";

							while (x <= endPos && x < text.length) {

								if (text.indexOf(/<\?/, x) === x) {
									phpOpen = true;
								} else if (text.indexOf(/\?>/, x) === x) {
									phpOpen = false;
								}

								if (phpOpen == false) {
									let valueEnd = false;
									let supportFunction = false;
									if (text.indexOf(/:| :|  :/, x) == x) {
										if (constStart) {
											if (fullSweep == false) {
												linesSet[id]['keywords']['range'].push(new vscode.Range(line, constStart, line, x));
											} else {
												keyWordRanges.push(new vscode.Range(line, constStart, line, x));
											}
											inMatch = false;
											constStart = null;
										}
										if (fullSweep == false) {
											linesSet[id]['punctuation']['range'].push(new vscode.Range(line, x, line, x + 1));
										} else {
											punctuationRanges.push(new vscode.Range(line, x, line, x + 1));
										}
									} else if (text.indexOf(/[),=]/, x) == x) {
										if (fullSweep == false) {
											linesSet[id]['punctuation']['range'].push(new vscode.Range(line, x, line, x + 1));
										} else {
											punctuationRanges.push(new vscode.Range(line, x, line, x + 1));
										}
										valueEnd = true;
									} else if (text.indexOf(/[\(]/, x) == x) {
										if (fullSweep == false) {
											linesSet[id]['punctuation']['range'].push(new vscode.Range(line, x, line, x + 1));
										} else {
											punctuationRanges.push(new vscode.Range(line, x, line, x + 1));
										}
										valueEnd = true;
										supportFunction = true;
									} else if (text.indexOf(/[;]/, x) == x) {
										if (fullSweep == false) {
											linesSet[id]['punctuation']['range'].push(new vscode.Range(line, x, line, x + 1));
										} else {
											punctuationRanges.push(new vscode.Range(line, x, line, x + 1));
										}
										valueEnd = true;
									} else if (text.indexOf(/[ ]/, x) == x) {
										valueEnd = true;
									} else if (text.indexOf(openQuote, x) == x) {
										valueEnd = true;
									} else if (inMatch == false && text.indexOf(openString, x) == x) {
										if (stringStart === null) {
											stringStart = x;
											inMatch = true;
										}
									} else if (inMatch == false && text.indexOf(/[0-9#]/, x) == x) {
										if (numericStart === null) {
											numericStart = x;
											inMatch = true;
										}
									} else if (inMatch == false && text.indexOf(/[a-zA-Z]/, x) == x) {
										if (constStart === null) {
											constStart = x;
											inMatch = true
										}
									} else if (inMatch == false && text.indexOf(/[-]/, x) == x && text.indexOf(/[0-9]/, x + 1) == x + 1) {
										if (numericStart === null) {
											numericStart = x;
											inMatch = true;
										}
									} else if (inMatch == false && text.indexOf(/[-]/, x) == x && text.indexOf(/[a-zA-Z]/, x + 1) == x + 1) {
										if (constStart === null) {
											constStart = x;
											inMatch = true;
										}
									}

									if (valueEnd) {
										inMatch = false;
										if (stringStart) {
											if (fullSweep == false) {
												linesSet[id]['string']['range'].push(new vscode.Range(line, stringStart, line, x));
											} else {
												stringRanges.push(new vscode.Range(line, stringStart, line, x));
											}
											stringStart = null;
										}
										if (numericStart) {
											if (fullSweep == false) {
												linesSet[id]['valueNumeric']['range'].push(new vscode.Range(line, numericStart, line, x));
											} else {
												valueNumericRanges.push(new vscode.Range(line, numericStart, line, x));
											}
											numericStart = null;
										}
										if (constStart) {
											if (supportFunction) {
												supportFunction = false;
												if (fullSweep == false) {
													linesSet[id]['supportFunction']['range'].push(new vscode.Range(line, constStart, line, x));
												} else {
													supportFunctionRanges.push(new vscode.Range(line, constStart, line, x));
												}
											} else {
												if (fullSweep == false) {
													linesSet[id]['valueConstant']['range'].push(new vscode.Range(line, constStart, line, x));
												} else {
													valueConstantRanges.push(new vscode.Range(line, constStart, line, x));
												}
											}
											constStart = null;
										}
									}
								}

								x++;
							}

						}
					}
					if (fullSweep == false) {

						

						editor.setDecorations(linesSet[id]['keywords']['decorator'], linesSet[id]['keywords']['range']);
						editor.setDecorations(linesSet[id]['punctuation']['decorator'], linesSet[id]['punctuation']['range']);
						editor.setDecorations(linesSet[id]['valueConstant']['decorator'], linesSet[id]['valueConstant']['range']);
						editor.setDecorations(linesSet[id]['valueNumeric']['decorator'], linesSet[id]['valueNumeric']['range']);
						editor.setDecorations(linesSet[id]['supportFunction']['decorator'], linesSet[id]['supportFunction']['range']);
						editor.setDecorations(linesSet[id]['string']['decorator'], linesSet[id]['string']['range']);
					}
				}
			}
		}

		if (fullSweep == true) {
			if (keyWordRanges.length > 0) {
				editor.setDecorations(colorKeyWord, keyWordRanges);
			}
			if (punctuationRanges.length > 0) {
				editor.setDecorations(colorPunctuation, punctuationRanges);
			}
			if (supportFunctionRanges.length > 0) {
				editor.setDecorations(colorSupportFunction, supportFunctionRanges);
			}
			if (valueConstantRanges.length > 0) {
				editor.setDecorations(colorValueConstant, valueConstantRanges);
			}
			if (valueNumericRanges.length > 0) {
				editor.setDecorations(colorValueNumeric, valueNumericRanges);
			}
			if (stringRanges.length > 0) {
				editor.setDecorations(colorString, stringRanges);
			}
		}
	}

}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	var application = new Application(context);
	//var inlineCssColor = new InlineCssColor(application);
	application.enableDocumentCache(['html', 'php']);

	let controls = {}
	application.on('documentOpen', function () {
		controls[application.document().fileName] = new InlineCssColor(application);
	});

	application.on('documentFocus', function () {
		if (controls[application.document().fileName].isValidDocType()) {
			try {
				controls[application.document().fileName].colorLines();
			} catch (e) {
				console.log(e);
			}
		}
	})
	application.on('documentTextChange', function (e, startLine, endLine, diff) {
		if (controls[application.document().fileName].isValidDocType()) {
			try {
				controls[application.document().fileName].colorLines(startLine, endLine, diff);
			} catch (e) {
				console.log(e);
			}
		}
	})
	application.activate();
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

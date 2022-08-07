const vscode = require('vscode');
const custom = require('./lib/custom.js');
const app = new custom.Application();

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	//INIT
	app.setContext(context);
	app.setValidDocTypes(['html', 'php']);
	app.setDocumentCacheEnabled();

	//CREATE DECORATIONS
	app.editorCreateDecoration('propertyName', { color: new vscode.ThemeColor('inline.css.propertyName') });
	app.editorCreateDecoration('punctuation', { color: new vscode.ThemeColor('inline.css.punctuation') });
	app.editorCreateDecoration('valueNumeric', { color: new vscode.ThemeColor('inline.css.valueNumeric') });
	app.editorCreateDecoration('valueNumericUnit', { color: new vscode.ThemeColor('inline.css.valueNumericUnit') });
	app.editorCreateDecoration('valueConstant', { color: new vscode.ThemeColor('inline.css.valueConstant') });
	app.editorCreateDecoration('supportFunction', { color: new vscode.ThemeColor('inline.css.supportFunction') });
	app.editorCreateDecoration('keywordImportant', { color: new vscode.ThemeColor('inline.css.keywordImportant') });
	app.editorCreateDecoration('string', { color: new vscode.ThemeColor('inline.css.string') });

	//ADD RANGES
	app.addDecorationLineRanges(function (lines, line_x, ranges) {

		if (lines[line_x]['syntax'] !== 'html' || isset(lines[line_x]['html']['elements']) == false) {
			return;
		}

		let elements = lines[line_x]['html']['elements'];

		for (var element_id in elements) {
			let style = elements[element_id]['attributes']['style'];
			if (style) {
				for (var index in style) {

					let line = style[index]['line'];
					let text = lines[line]['text'];

					let start = style[index]['start'];
					let end = style[index]['end'];

					if (start === null || end === null) {
						continue;
					}

					let x = start;
					let propertyNameStart = true;
					let numericStart = null;
					let numericUnitStart = null;
					let constStart = null;
					let stringStart = null;
					let keyWordStart = null;
					let keyWordImportantStart = null;
					let phpOpen = false;
					let inMatch = false;
					while (x <= end) {

						if (text.indexOf(/<\?/, x) === x) {
							phpOpen = true;
						} else if (text.indexOf(/\?>/, x) === x) {
							phpOpen = false;
						}

						if (phpOpen == false) {
							let valueEnd = false;
							let supportFunction = false;
							let propertyName = false;
							if (text.indexOf(/:| :|  :/, x) == x) {
								if (constStart !== null) {
									ranges['propertyName'].push(new vscode.Range(line, constStart, line, x));
									inMatch = false;
									constStart = null;
									propertyNameStart = false;
								}
								ranges['punctuation'].push(new vscode.Range(line, x, line, x + 1));
							} else if (text.indexOf(/[),=]/, x) == x) {
								ranges['punctuation'].push(new vscode.Range(line, x, line, x + 1));
								valueEnd = true;
							} else if (text.indexOf(/[\(]/, x) == x) {
								ranges['punctuation'].push(new vscode.Range(line, x, line, x + 1));
								valueEnd = true;
								supportFunction = true;
							} else if (text.indexOf(/[;]/, x) == x) {
								ranges['punctuation'].push(new vscode.Range(line, x, line, x + 1));
								valueEnd = true;
								propertyNameStart = true;
							} else if (text.indexOf(/[ ]/, x) == x) {
								valueEnd = true;
								if (propertyNameStart) {
									propertyName = true;
								}
							} else if (x == end) {
								valueEnd = true;
								if (propertyNameStart) {
									propertyName = true;
								}
							} else if (inMatch == false && text.indexOf(/['"]/, x) == x) {
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
							} else if (inMatch == false && text.indexOf(/!/, x) == x) {
								if (keyWordStart === null) {
									keyWordStart = x;
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

							if (numericStart !== null && text.indexOf(/[^0-9\(),=; ]/, x) == x) {
								ranges['valueNumeric'].push(new vscode.Range(line, numericStart, line, x));
								numericStart = null;
								numericUnitStart = x;
							}

							if (valueEnd) {
								inMatch = false;
								if(keyWordStart){
									if(text.substring(keyWordStart,x)=="!important"){
										ranges['keywordImportant'].push(new vscode.Range(line, keyWordStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									} else {
										ranges['valueConstant'].push(new vscode.Range(line, keyWordStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									}
									keyWordStart = null;
								}
								if (stringStart) {
									ranges['string'].push(new vscode.Range(line, stringStart, line, x));
									stringStart = null;
								}
								if (numericStart !== null) {
									ranges['valueNumeric'].push(new vscode.Range(line, numericStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									numericStart = null;
								}
								if(numericUnitStart!==null){
									ranges['valueNumericUnit'].push(new vscode.Range(line, numericUnitStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									numericUnitStart = null;
								}
								if(keyWordImportantStart!==null){
									ranges['keywordImportant'].push(new vscode.Range(line, keyWordImportantStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									keyWordImportantStart = null;
								}
								if (constStart !== null) {
									if (supportFunction) {
										supportFunction = false;
										ranges['supportFunction'].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									} else if (propertyName) {
										ranges['propertyName'].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									} else {
										ranges['valueConstant'].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									}
									constStart = null;
								}
							}
						}
						x++;
					}

				}

			}
		}

	});

	//START
	app.activate();
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}


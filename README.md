# About

Inline CSS Color allows you set colors for your inline HTML style="" attributes. With this extension you can set the colors to match your current theme so your inline css will match your theme.
There is no API in the vscode extension to retrieve theme token colors so you will have to do this manually.

# Supported Languages

- HTML
- PHP (Mixed HTML)

# Example

Inline CSS style="" value colors match theme.

![Example](https://raw.githubusercontent.com/outofsync42/inline-css-color/master/images/example1.png)

# Configuration

First you will want you will want get the current the colors for your existing theme. To do this is press "CTRL+Shift+P" and type in "Inspect".
Select "Developer: Inspect Editor Tokens and Scopes"

![Command Palette](https://raw.githubusercontent.com/outofsync42/inline-css-color/master/images/command-palette-inspect.png)

Then click on the text you want to see its token information. Locate the "foreground" property and copy the hex color code

![Token Inspect](https://raw.githubusercontent.com/outofsync42/inline-css-color/master/images/token-color.png)

After getting your colors open your settings.json file and add them to the "workbench.colorCustomizations" object.

![Token Inspect](https://raw.githubusercontent.com/outofsync42/inline-css-color/master/images/settings.png)

```
"workbench.colorCustomizations" : {
		"inline.css.keyword": "#0000ff",
		"inline.css.punctuation": "#fff",
		"inline.css.supportFunction": "#000",
		"inline.css.valueConstant": "#000",
		"inline.css.valueNumeric": "#EE8484",
		"inline.css.string": "#63ECF1",
}
```

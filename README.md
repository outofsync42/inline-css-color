# About

Inline CSS Color allows you set colors for your inline HTML style="" attributes. With this extension you can set the colors to match your current theme to give your code a more unified color look.


# Supported Languages

- HTML
- PHP (Mixed HTML)

# Example

| Before      | After |
| ----------- | ----------- |
|![Example](https://raw.githubusercontent.com/outofsync42/inline-css-color/master/img/example2.png)|![Example](https://raw.githubusercontent.com/outofsync42/inline-css-color/master/img/example1.png)|

There is no API in the vscode extension to retrieve theme token colors so you will have to do this manually.
To achieve this, just set your inline.css color properties to match your theme in the "workbench.colorCustomizations" object in your settings.json file.

![Settings](https://raw.githubusercontent.com/outofsync42/inline-css-color/master/img/settings.png)

If you are not familiar with how to get your theme token colors please follow the configuration section below.

# Configuration

First you will want you will want get the current the colors for your existing theme. To do this is press "CTRL+Shift+P" and type in "Inspect".
Select "Developer: Inspect Editor Tokens and Scopes"

![Command Palette](https://raw.githubusercontent.com/outofsync42/inline-css-color/master/img/command-palette-inspect.png)

Then click on the text you want to see its token information. Locate the "foreground" property and copy the hex color code

![Token Inspect](https://raw.githubusercontent.com/outofsync42/inline-css-color/master/img/token-color.png)

After getting your colors open your settings.json file and add them to the "workbench.colorCustomizations" object.

```json

	"workbench.colorCustomizations": {
		"inline.css.propertyName": "#0000ff",
		"inline.css.punctuation": "#fff",
		"inline.css.supportFunction": "#000",
		"inline.css.valueConstant": "#000",
		"inline.css.valueNumeric": "#EE8484",
		"inline.css.valueNumericUnit": "#EE8484",
		"inline.css.keywordImportant": "#000",
		"inline.css.string": "#63ECF1",
	},
```
If you want something that looks similar to VS Codes default CSS syntax coloring, use the following:

```json

    "workbench.colorCustomizations": {
        "inline.css.propertyName": "#9cdcfe",
        "inline.css.punctuation": "#d4d4d4",
        "inline.css.supportFunction": "#ce9178",
        "inline.css.valueConstant": "#ce9178",
        "inline.css.valueNumeric": "#EE8484",
        "inline.css.valueNumericUnit": "#EE8484",
        "inline.css.keywordImportant": "#ce9178",
        "inline.css.string": "#63ECF1",
    },
```
## Extension Settings

This extension contributes the following commands:

- `inline-css-color.enablePhpStyle`: Enable colorization of style properties found in strings in PHP code.
- `inline-css-color.enableHtmlCommentStyle`: Enable colorization of style properties found in HTML Commented code.

![Settings](https://raw.githubusercontent.com/outofsync42/inline-css-color/master/img/settings2.png)

## License

This extension is licensed under the MIT License.

## Contributing and Support

The extension is developed and maintained by `outofsync42`. If you encounter any issues or have suggestions for improvements, please open an issue on the project's GitHub repository.

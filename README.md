# About

Inline CSS Color allows you set colors for your inline HTML style="" attributes. With this extension you can set the colors to match your current theme so your inline css will match your theme.
There is no API in the vscode extension to retrieve theme token colors so you will have to do this manually.

# Supported Languages

- HTML
- PHP (Mixed HTML)

# Example

Example setting that demonstrates folding effect with "fold-types.php.class" set to false.
```
{
 "fold-types.php.class" : false
}
```
With "fold-types.php.class" set to false, when the "fold-types.fold-all" command is executed, only the functions are folded leaving the class un-collapsed allowing for a faster, intuitive navigation to the code you are trying to find.

![Command Palette](https://raw.githubusercontent.com/outofsync42/fold-types/master/images/fold-type-fol-all.gif)


# Commands

### Fold
<dl>
  <dt><b>fold-types.fold-all</b></dt>
  <dd>Folds all enabled types recursively through out the entire document.</dd>
  <dt><b>fold-types.fold-parent</b></dt>
  <dd>Folds all enabled types recursively through out the parent block only as well as collapsing the parent its self.</dd>
  <dt><b>fold-types.fold-children</b></dt>
  <dd>Folds all enabled types recursively through out the parent block only but leaves the parent block un-collapsed.</dd>
  <dt><b>fold-types.fold-children-all-types</b></dt>
  <dd>Special command to ignore rules and fold all children recursively regardless of type leaving the parent block un-collapsed.</dd>
</dl>

### Unfold

<dl>
  <dt><b>fold-types.unfold-parent</b></dt>
  <dd>Unfolds all types regardless of type inside the parent as well as unfolding the parent is self.</dd>
</dl>

You can and should still use the existing **editor.unfoldAll** command to unfold the entire document.

## How to use
Type "Fold Types" in the command palette to find the commands but its recommended you assign hot keys.

![Command Palette](https://raw.githubusercontent.com/outofsync42/fold-types/master/images/comand-palette.png)

# Configuration Settings

Fold Types comes configured with a few enabled types that I feel to be the most intuitive items to be folded but almost any type can configured to be folded or ignored based on your needs.

### JS

- fold-types.js.class	
- fold-types.js.method <mark>(default enabled)</mark>
- fold-types.js.interface
- fold-types.js.object <mark>(default enabled)</mark>
- fold-types.js.objectFunctionParam ***(Matches objects passed as parameters to functions)***
- fold-types.js.objectObjectParam <mark>(default enabled)</mark> ***(Matches objects inside other objects)***
- fold-types.js.array <mark>(default enabled)</mark>
- fold-types.js.arrayFunctionParam ***(Matches arrays passed as parameters to functions)***
- fold-types.js.arrayObjectParam <mark>(default enabled)</mark> ***(Matches arrays inside other objects)***
- fold-types.js.while
- fold-types.js.if
- fold-types.js.else
- fold-types.js.for
- fold-types.js.switch
- fold-types.js.switchCase <mark>(default enabled)</mark>
- fold-types.js.switchDefault
- fold-types.js.try
- fold-types.js.tryCatch
- fold-types.js.tryFinally
- fold-types.js.comment

### PHP

- fold-types.php.class	
- fold-types.php.method <mark>(default enabled)</mark>
- fold-types.php.interface
- fold-types.php.array <mark>(default enabled)</mark>
- fold-types.php.arrayFunctionParam ***(Matches arrays passed as parameters to functions)***
- fold-types.php.arrayObjectParam <mark>(default enabled)</mark> ***(Matches arrays inside other arrays)***
- fold-types.php.while
- fold-types.php.if
- fold-types.php.else
- fold-types.php.for ***(Includes foreach)***
- fold-types.php.switch
- fold-types.php.switchCase <mark>(default enabled)</mark>
- fold-types.php.switchDefault
- fold-types.php.try
- fold-types.php.tryCatch
- fold-types.php.tryFinally
- fold-types.php.comment

### HTML

Only the most common tags have been included but if there are some that the community wants they can be added later.

- fold-types.html.head
- fold-types.html.body
- fold-types.html.div
- fold-types.html.section
- fold-types.html.ul
- fold-types.html.a
- fold-types.html.select
- fold-types.html.button
- fold-types.html.script
- fold-types.html.style
- fold-types.html.table
- fold-types.html.tableTbody
- fold-types.html.tableThead
- fold-types.html.tableTfoot
- fold-types.html.tableTr <mark>(default enabled)</mark>
- fold-types.html.tableTd <mark>(default enabled)</mark> ***(Includes \<th\>)***
- fold-types.html.comment
- fold-types.html.idAttribute <mark>(default enabled)</mark> ***(Special: Folds any tag that has an id="" attribute set)***

### CSS

- fold-types.css.block <mark>(default enabled)</mark>

### How to configure settings
The easiest way to configure enabled types is to right click on the extension in your extensions list and select "Extension Settings".

![Right Click Extension](https://raw.githubusercontent.com/outofsync42/fold-type/master/images/right-click-extension.png)
![Extension Settings](https://raw.githubusercontent.com/outofsync42/fold-type/master/images/extension-settings.png)
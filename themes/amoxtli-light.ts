import type { ThemeRegistrationRaw } from 'shiki/core'
import baseTheme from 'shiki/themes/snazzy-light.mjs'

const baseSettings = (baseTheme as any).settings ?? (baseTheme as any).tokenColors ?? []

const customLightTheme: ThemeRegistrationRaw = {
  name: 'amoxtli-light',
  type: 'light',
  settings: [
    ...baseSettings,
    {
      name: 'Invalid - Illegal',
      scope: 'invalid.illegal',
      settings: {
        foreground: '#FF5C56',
      },
    },
    {
      name: 'Property names',
      scope: [
        'meta.object-literal.key',
        'meta.object-literal.key constant.character.escape',
        'meta.object-literal string',
        'meta.object-literal string constant.character.escape',
        'support.type.property-name',
        'support.type.property-name constant.character.escape',
      ],
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'Keywords',
      scope: [
        'keyword',
        'storage',
        'meta.class storage.type',
        'keyword.operator.expression.import',
        'keyword.operator.new',
        'keyword.operator.expression.delete',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'Types',
      scope: [
        'support.type',
        'meta.type.annotation entity.name.type',
        'new.expr meta.type.parameters entity.name.type',
        'storage.type.primitive',
        'storage.type.built-in.primitive',
        'meta.function.parameter storage.type',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Annotations',
      scope: [
        'storage.type.annotation',
      ],
      settings: {
        foreground: '#C25193',
      },
    },
    {
      name: 'Units',
      scope: 'keyword.other.unit',
      settings: {
        foreground: '#B1403CCC',
      },
    },
    {
      name: 'Language Constants',
      scope: [
        'constant.language',
        'support.constant',
        'variable.language',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Variables',
      scope: [
        'variable',
        'support.variable',
      ],
      settings: {
        foreground: '#565869',
      },
    },
    {
      name: 'this Variables',
      scope: 'variable.language.this',
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Functions',
      scope: [
        'entity.name.function',
        'support.function',
      ],
      settings: {
        foreground: '#066C9F',
      },
    },
    {
      name: 'Decorators',
      scope: [
        'entity.name.function.decorator',
      ],
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'Classes',
      scope: [
        'meta.class entity.name.type',
        'new.expr entity.name.type',
        'entity.other.inherited-class',
        'support.class',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Preprocessors',
      scope: [
        'keyword.preprocessor.pragma',
        'keyword.control.directive.include',
        'keyword.other.preprocessor',
      ],
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'Exceptions',
      scope: 'entity.name.exception',
      settings: {
        foreground: '#FF5C56',
      },
    },
    {
      name: 'Sections',
      scope: 'entity.name.section',
      settings: {
        // "fontStyle": "underline"
      },
    },
    {
      name: 'Numbers, Characters',
      scope: [
        'constant.numeric',
        // "constant.character",
        // "constant"
      ],
      settings: {
        foreground: '#B1403C',
      },
    },
    {
      name: 'Constants',
      scope: [
        'constant',
        'constant.character',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Strings',
      scope: 'string',
      settings: {
        foreground: '#816100',
      },
    },
    {
      name: 'Strings',
      scope: 'string',
      settings: {
        foreground: '#816100',
      },
    },
    {
      name: 'Strings: Escape Sequences',
      scope: 'constant.character.escape',
      settings: {
        foreground: '#816100',
      },
    },
    {
      name: 'Strings: Regular Expressions',
      scope: [
        'string.regexp',
        'string.regexp constant.character.escape',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Strings: Regular Expressions Punctuation',
      scope: [
        'keyword.operator.quantifier.regexp',
        'keyword.operator.negation.regexp',
        'keyword.operator.or.regexp',
        'string.regexp punctuation',
        'string.regexp keyword',
        'string.regexp keyword.control',
        'string.regexp constant',
        'variable.other.regexp',
      ],
      settings: {
        foreground: '#00A39F',
      },
    },
    {
      name: 'Strings: Regular Expressions Modifier Flags',
      scope: [
        'string.regexp keyword.other',
      ],
      settings: {
        foreground: '#00A39F88',
      },
    },
    {
      name: 'Strings: Symbols',
      scope: 'constant.other.symbol',
      settings: {
        foreground: '#816100',
      },
    },
    {
      name: 'Comments',
      scope: [
        'comment',
        'punctuation.definition.comment',
      ],
      settings: {
        foreground: '#ADB1C2',
      },
    },
    {
      name: 'Comments: Preprocessor',
      scope: 'comment.block.preprocessor',
      settings: {
        fontStyle: '',
        foreground: '#9194A2',
      },
    },
    {
      name: 'DocBlock: Type',
      scope: 'comment.block.documentation entity.name.type',
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'DocBlock: Keyword',
      scope: [
        'comment.block.documentation storage',
        'comment.block.documentation keyword.other',
        'meta.class comment.block.documentation storage.type',
      ],
      settings: {
        foreground: '#9194A2',
      },
    },
    {
      name: 'DocBlock: Variable',
      scope: [
        'comment.block.documentation variable',
      ],
      settings: {
        foreground: '#C25193',
      },
    },
    {
      name: 'Punctuation',
      scope: [
        'punctuation',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'Operators',
      scope: [
        'keyword.operator',
        'keyword.other.arrow',
        'keyword.control.@',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // HTML Overrides
    {
      name: 'HTML: Doctype Declaration',
      scope: [
        'meta.tag.metadata.doctype.html entity.name.tag',
        'meta.tag.metadata.doctype.html entity.other.attribute-name.html',
        'meta.tag.sgml.doctype',
        'meta.tag.sgml.doctype string',
        'meta.tag.sgml.doctype entity.name.tag',
        'meta.tag.sgml punctuation.definition.tag.html',
      ],
      settings: {
        foreground: '#9194A2',
      },
    },
    {
      name: 'HTML: Tags',
      scope: [
        'meta.tag',
        'punctuation.definition.tag.html',
        'punctuation.definition.tag.begin.html',
        'punctuation.definition.tag.end.html',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'HTML: Tag Names',
      scope: ['entity.name.tag'],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'HTML: Attribute Names',
      scope: [
        'meta.tag entity.other.attribute-name',
        'entity.other.attribute-name.html',
      ],
      settings: {
        foreground: '#cb6967',
      },
    },
    {
      name: 'HTML: Entities',
      scope: [
        'constant.character.entity',
        'punctuation.definition.entity',
      ],
      settings: {
        foreground: '#816100',
      },
    },

    // CSS Overrides
    {
      name: 'CSS: Base font color (just to colorize multi-selector commas correctly)',
      scope: [
        'source.css',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'CSS: Selectors',
      scope: [
        'meta.selector',
        'meta.selector entity',
        'meta.selector entity punctuation',
        'source.css entity.name.tag',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'CSS: At-rules',
      scope: [
        'keyword.control.at-rule',
        'keyword.control.at-rule punctuation.definition.keyword',
      ],
      settings: {
        foreground: '#C25193',
      },
    },
    {
      name: 'CSS: Variables',
      scope: 'source.css variable',
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'CSS: Property Names',
      scope: [
        'source.css meta.property-name',
        'source.css support.type.property-name',
      ],
      settings: {
        foreground: '#565869',
      },
    },
    {
      name: 'CSS: Vendored Property Names',
      scope: [
        'source.css support.type.vendored.property-name',
      ],
      settings: {
        foreground: '#565869AA',
      },
    },
    {
      name: 'CSS: Property Values',
      scope: [
        'meta.property-value',
        'support.constant.property-value',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'CSS: Constant',
      scope: [
        'source.css support.constant',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'CSS: Selector punctuation',
      scope: [
        'punctuation.definition.entity.css',
        'keyword.operator.combinator.css',
      ],
      settings: {
        foreground: '#dc70af',
      },
    },
    {
      name: 'CSS: Functions',
      scope: [
        'source.css support.function',
      ],
      settings: {
        foreground: '#066C9F',
      },
    },
    {
      name: 'CSS: Important Keyword',
      scope: 'keyword.other.important',
      settings: {
        foreground: '#238744',
      },
    },

    // Sass Overrides
    {
      name: 'SCSS: Base font color',
      scope: [
        'source.css.scss',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'SCSS: Class names & IDs',
      scope: [
        'source.css.scss entity.other.attribute-name.class.css',
        'source.css.scss entity.other.attribute-name.id.css',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'SCSS: Ampersand',
      scope: [
        'entity.name.tag.reference.scss',
      ],
      settings: {
        foreground: '#C25193',
      },
    },
    {
      name: 'SCSS: Additional at-rules',
      scope: [
        'source.css.scss meta.at-rule keyword',
        'source.css.scss meta.at-rule keyword punctuation',
        'source.css.scss meta.at-rule operator.logical',
        'keyword.control.content.scss',
        'keyword.control.return.scss',
        'keyword.control.return.scss punctuation.definition.keyword',
      ],
      settings: {
        foreground: '#C25193',
      },
    },
    {
      name: 'SCSS: Punctuation',
      scope: [
        'meta.at-rule.mixin.scss',
        'meta.at-rule.include.scss',
        'source.css.scss meta.at-rule.if',
        'source.css.scss meta.at-rule.else',
        'source.css.scss meta.at-rule.each',
        'source.css.scss meta.at-rule variable.parameter',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // Less Overrides
    {
      name: 'Less: Class names',
      scope: [
        'source.css.less entity.other.attribute-name.class.css',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // Stylus Overrides
    {
      name: 'Stylus: Curly Braces',
      scope: 'source.stylus meta.brace.curly.css',
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'Stylus: Selectors',
      scope: [
        'source.stylus entity.other.attribute-name.class',
        'source.stylus entity.other.attribute-name.id',
        'source.stylus entity.name.tag',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'Stylus: Properties',
      scope: [
        'source.stylus support.type.property-name',
      ],
      settings: {
        foreground: '#565869',
      },
    },
    {
      name: 'Stylus: Variables',
      scope: [
        'source.stylus variable',
      ],
      settings: {
        foreground: '#11658F',
      },
    },

    // Markup Overrides
    {
      name: 'Markup: Changed',
      scope: 'markup.changed',
      settings: {
        foreground: '#888888',
      },
    },
    {
      name: 'Markup: Deletion',
      scope: 'markup.deleted',
      settings: {
        foreground: '#888888',
      },
    },
    {
      name: 'Markup: Emphasis',
      scope: 'markup.italic',
      settings: {
        fontStyle: 'italic',
      },
    },
    {
      name: 'Markup: Error',
      scope: 'markup.error',
      settings: {
        foreground: '#FF5C56',
      },
    },
    {
      name: 'Markup: Insertion',
      scope: 'markup.inserted',
      settings: {
        foreground: '#888888',
      },
    },
    {
      name: 'Markup: Link',
      scope: 'meta.link',
      settings: {
        foreground: '#816100',
      },
    },
    {
      name: 'Markup: Link Title',
      scope: 'string.other.link.title.markdown',
      settings: {
        foreground: '#066C9F',
      },
    },
    {
      name: 'Markup: Output',
      scope: [
        'markup.output',
        'markup.raw',
      ],
      settings: {
        foreground: '#999999',
      },
    },
    {
      name: 'Markup: Prompt',
      scope: 'markup.prompt',
      settings: {
        foreground: '#999999',
      },
    },
    {
      name: 'Markup: Heading',
      scope: 'markup.heading',
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Markup: Strong',
      scope: 'markup.bold',
      settings: {
        fontStyle: 'bold',
      },
    },
    {
      name: 'Markup: Traceback',
      scope: 'markup.traceback',
      settings: {
        foreground: '#FF5C56',
      },
    },
    {
      name: 'Markup: Underline',
      scope: 'markup.underline',
      settings: {
        fontStyle: 'underline',
      },
    },
    {
      name: 'Markup Quote',
      scope: 'markup.quote',
      settings: {
        foreground: '#777985',
      },
    },
    {
      name: 'Markup Styling',
      scope: [
        'markup.bold',
        'markup.italic',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Markup Inline',
      scope: 'markup.inline.raw',
      settings: {
        fontStyle: '',
        foreground: '#a2447b',
      },
    },

    // JavaScript Overrides
    {
      name: 'JavaScript: Braces and fat arrow',
      scope: [
        'meta.brace.round',
        'meta.brace.square',
        'storage.type.function.arrow',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'JavaScript: Special import/export entities',
      scope: [
        'constant.language.import-export-all',
        'meta.import keyword.control.default',
      ],
      settings: {
        foreground: '#C25193',
      },
    },
    {
      name: 'JavaScript: Built-in functions',
      scope: [
        'support.function.js',
      ],
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'JavaScript: RegExp',
      scope: 'string.regexp.js',
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'JavaScript: super() call and Node.js \'module\'',
      scope: [
        'variable.language.super',
        'support.type.object.module.js',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // JSX Overrides
    {
      name: 'JSX: Plain text',
      scope: 'meta.jsx.children',
      settings: {
        foreground: '#686968',
      },
    },

    // YAML Overrides
    {
      name: 'YAML: Keys',
      scope: 'entity.name.tag.yaml',
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'YAML: Keys',
      scope: 'variable.other.alias.yaml',
      settings: {
        foreground: '#0C7270',
      },
    },

    // PHP Overrides
    {
      name: 'PHP: Start / End Tags',
      scope: [
        'punctuation.section.embedded.begin.php',
        'punctuation.section.embedded.end.php',
      ],
      settings: {
        foreground: '#75798F',
      },
    },
    {
      name: 'PHP: Use Aliases',
      scope: [
        'meta.use.php entity.other.alias.php',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'PHP: Constructs',
      scope: [
        'source.php support.function.construct',
        'source.php support.function.var',
      ],
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'PHP: Class Syntax',
      scope: [
        'storage.modifier.extends.php',
        'source.php keyword.other',
        'storage.modifier.php',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'PHP: \'function\' keyword before reference-returning method',
      scope: [
        'meta.class.body.php storage.type.php',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'PHP: Types turned pink by previous rule',
      scope: [
        'storage.type.php',
        'meta.class.body.php meta.function-call.php storage.type.php',
        'meta.class.body.php meta.function.php storage.type.php',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'PHP: SQL',
      scope: [
        'source.php keyword.other.DML',
      ],
      settings: {
        foreground: '#D94E4A',
      },
    },
    {
      name: 'PHP: SQL',
      scope: [
        'source.sql.embedded.php keyword.operator',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },

    // Config Files Overrides
    {
      name: 'TOML/INI: Keywords',
      scope: [
        'source.ini keyword',
        'source.toml keyword',
        'source.env variable',
      ],
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'TOML/INI: Headlines',
      scope: [
        'source.ini entity.name.section',
        'source.toml entity.other.attribute-name',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // Go Overrides
    {
      name: 'Go: Types',
      scope: [
        'source.go storage.type',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Go: Imports',
      scope: [
        'keyword.import.go',
        'keyword.package.go',
      ],
      settings: {
        foreground: '#FF5C56',
      },
    },

    // Reason Overrides
    {
      name: 'Reason: Variables',
      scope: [
        'source.reason variable.language string',
      ],
      settings: {
        foreground: '#565869',
      },
    },
    {
      name: 'Reason: Types',
      scope: [
        'source.reason support.type',
        'source.reason constant.language',
        'source.reason constant.language constant.numeric',
        'source.reason support.type string.regexp',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Reason: Operators',
      scope: [
        'source.reason keyword.operator keyword.control',
        'source.reason keyword.control.less',
        'source.reason keyword.control.flow',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'Reason: Regex strings',
      scope: [
        'source.reason string.regexp',
      ],
      settings: {
        foreground: '#816100',
      },
    },
    {
      name: 'Reason: Properties',
      scope: [
        'source.reason support.property-value',
      ],
      settings: {
        foreground: '#11658F',
      },
    },

    // Rust Overrides
    {
      name: 'Rust: Core functions',
      scope: [
        'source.rust support.function.core.rust',
      ],
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'Rust: Types',
      scope: [
        'source.rust storage.type.core.rust',
        'source.rust storage.class.std',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Rust: Entities',
      scope: [
        'source.rust entity.name.type.rust',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },

    // CoffeeScript Overrides
    {
      name: 'CoffeeScript: Function arrows',
      scope: [
        'storage.type.function.coffee',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // C# Overrides
    {
      name: 'C#: Types',
      scope: [
        'keyword.type.cs',
        'storage.type.cs',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'C#: Classes',
      scope: [
        'entity.name.type.namespace.cs',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },

    // Diff Overrides
    {
      name: 'Diff: Headers',
      scope: 'meta.diff.header',
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'Diff: Inserted',
      scope: [
        'markup.inserted.diff',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Diff: Deleted',
      scope: [
        'markup.deleted.diff',
      ],
      settings: {
        foreground: '#FF5C56',
      },
    },
    {
      name: 'Diff: Range',
      scope: [
        'meta.diff.range',
        'meta.diff.index',
        'meta.separator',
      ],
      settings: {
        foreground: '#066C9F',
      },
    },

    // Makefile Overrides
    {
      name: 'Make: Variables',
      scope: 'source.makefile variable',
      settings: {
        foreground: '#11658F',
      },
    },

    // Objective-C Overrides
    {
      name: 'Objective-C: Keywords',
      scope: [
        'keyword.control.protocol-specification.objc',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'Objective-C: Types',
      scope: [
        'meta.parens storage.type.objc',
        'meta.return-type.objc support.class',
        'meta.return-type.objc storage.type.objc',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },

    // SQL Overrides
    {
      name: 'SQL: Keywords',
      scope: [
        'source.sql keyword',
      ],
      settings: {
        foreground: '#11658F',
      },
    },

    // Dockerfile Overrides
    {
      name: 'Docker: Keyword methods',
      scope: [
        'keyword.other.special-method.dockerfile',
      ],
      settings: {
        foreground: '#066C9F',
      },
    },

    // Elixir Overrides
    {
      name: 'Elixir: Symbols',
      scope: 'constant.other.symbol.elixir',
      settings: {
        foreground: '#11658F',
      },
    },

    // Elm Overrides
    {
      name: 'Elm: Symbols',
      scope: [
        'storage.type.elm',
        'support.module.elm',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Elm: Punctuation',
      scope: [
        'source.elm keyword.other',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // Erlang
    {
      name: 'Erlang: Classes',
      scope: [
        'source.erlang entity.name.type.class',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Erlang: Properties',
      scope: [
        'variable.other.field.erlang',
      ],
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'Erlang: Symbols',
      scope: [
        'source.erlang constant.other.symbol',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },

    // Haskell Overrides
    {
      name: 'Haskell: Types',
      scope: [
        'storage.type.haskell',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Haskell: Classes',
      scope: [
        'meta.declaration.class.haskell storage.type.haskell',
        'meta.declaration.instance.haskell storage.type.haskell',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Haskell: Punctuation',
      scope: [
        'meta.preprocessor.haskell',
      ],
      settings: {
        foreground: '#75798F',
      },
    },
    {
      name: 'Haskell: Control keywords',
      scope: [
        'source.haskell keyword.control',
      ],
      settings: {
        // Distinction between regular and control flow keywords
        // doesn't make too much sense in functional languages
        foreground: '#a2447b',
      },
    },

    // Latte Overrides
    {
      name: 'Latte: Punctuation',
      scope: [
        'tag.end.latte',
        'tag.begin.latte',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // Gettext
    {
      name: 'Gettext: Keyword',
      scope: 'source.po keyword.control',
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'Gettext: Source file',
      scope: 'source.po storage.type',
      settings: {
        foreground: '#9194A2',
      },
    },
    {
      name: 'Gettext: Constant',
      scope: 'constant.language.po',
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Gettext: Constant Value',
      scope: 'meta.header.po string',
      settings: {
        foreground: '#FF8380',
      },
    },
    {
      name: 'Gettext: Base Color',
      scope: 'source.po meta.header.po',
      settings: {
        foreground: '#a2447b',
      },
    },

    // OCaml Overrides
    {
      name: 'OCaml: No underlines',
      scope: [
        'source.ocaml markup.underline',
      ],
      settings: {
        fontStyle: '',
      },
    },
    {
      name: 'OCaml: Control keywords',
      scope: [
        'source.ocaml punctuation.definition.tag emphasis',
        'source.ocaml entity.name.class constant.numeric',
        'source.ocaml support.type',
      ],
      settings: {
        // Distinction between regular and control flow keywords
        // doesn't make too much sense in functional languages
        foreground: '#a2447b',
      },
    },
    {
      name: 'OCaml: Punctuation',
      scope: [
        'source.ocaml constant.numeric entity.other.attribute-name',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'OCaml: Comments',
      scope: [
        'source.ocaml comment meta.separator',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'OCaml: Punctuation',
      scope: [
        'source.ocaml support.type strong',
        'source.ocaml keyword.control strong',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'OCaml: Properties',
      scope: [
        'source.ocaml support.constant.property-value',
      ],
      settings: {
        foreground: '#11658F',
      },
    },

    // Scala Overrides
    {
      name: 'Scala: Overrides',
      scope: [
        'source.scala entity.name.class',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Scala: Types',
      scope: [
        'storage.type.scala',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Scala: Properties',
      scope: [
        'variable.parameter.scala',
      ],
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'Scala: Punctuation',
      scope: [
        'meta.bracket.scala',
        'meta.colon.scala',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // Clojure Overrides
    {
      name: 'Clojure: Punctuation',
      scope: [
        'meta.metadata.simple.clojure',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },
    {
      name: 'Clojure: Symbols',
      scope: [
        'meta.metadata.simple.clojure meta.symbol',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },

    // R Overrides
    {
      name: 'R: Punctuation',
      scope: [
        'source.r keyword.other',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // Svelte Overrides
    {
      name: 'Svelte: Control keywords',
      scope: [
        'source.svelte meta.block.ts entity.name.label',
      ],
      settings: {
        foreground: '#11658F',
      },
    },

    // AppleScript Overrides
    {
      name: 'AppleScript: Control keywords',
      scope: [
        'keyword.operator.word.applescript',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // LiveScript Overrides
    {
      name: 'LiveScript: Function calls',
      scope: [
        'meta.function-call.livescript',
      ],
      settings: {
        foreground: '#066C9F',
      },
    },

    // Lua Overrides
    {
      name: 'Lua: Self',
      scope: [
        'variable.language.self.lua',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },

    // Swift Overrides
    {
      name: 'Swift: Classes',
      scope: [
        'entity.name.type.class.swift',
        'meta.inheritance-clause.swift',
        'meta.import.swift entity.name.type',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Swift: String Embeds',
      scope: [
        'source.swift punctuation.section.embedded',
      ],
      settings: {
        foreground: '#B38700',
      },
    },
    {
      name: 'Swift: Parameters',
      scope: [
        'variable.parameter.function.swift entity.name.function.swift',
      ],
      settings: {
        foreground: '#565869',
      },
    },

    // Twig Overrides
    {
      name: 'Twig: Object entities',
      scope: 'meta.function-call.twig',
      settings: {
        foreground: '#565869',
      },
    },

    // Django Overrides
    {
      name: 'Django: Variables',
      scope: 'string.unquoted.tag-string.django',
      settings: {
        foreground: '#565869',
      },
    },
    {
      name: 'Django: Punctuation',
      scope: [
        'entity.tag.tagbraces.django',
        'entity.tag.filter-pipe.django',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // HAML Overrides
    {
      name: 'HAML: Attributes',
      scope: [
        'meta.section.attributes.haml constant.language',
        'meta.section.attributes.plain.haml constant.other.symbol',
      ],
      settings: {
        foreground: '#FF8380',
      },
    },
    {
      name: 'HAML: Prolog',
      scope: [
        'meta.prolog.haml',
      ],
      settings: {
        foreground: '#9194A2',
      },
    },

    // Handlebars Overrides
    {
      name: 'Handlebars: Punctuation',
      scope: [
        'support.constant.handlebars',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // Log Overrides
    {
      name: 'Log: Level',
      scope: 'text.log log.constant',
      settings: {
        foreground: '#C25193',
      },
    },

    // C/C++ Overrides
    {
      name: 'C/C++ Overrides',
      scope: [
        'source.c string constant.other.placeholder',
        'source.cpp string constant.other.placeholder',
      ],
      settings: {
        foreground: '#B38700',
      },
    },

    // Groovy Overrides
    {
      name: 'Groovy: Keys',
      scope: 'constant.other.key.groovy',
      settings: {
        foreground: '#11658F',
      },
    },
    {
      name: 'Groovy: Classes',
      scope: 'storage.type.groovy',
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Groovy: Types',
      scope: 'meta.definition.variable.groovy storage.type.groovy',
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Groovy: Imports',
      scope: 'storage.modifier.import.groovy',
      settings: {
        foreground: '#816100',
      },
    },

    // Pug Overrides
    {
      name: 'Pug: Class names & IDs',
      scope: [
        'entity.other.attribute-name.class.pug',
        'entity.other.attribute-name.id.pug',
      ],
      settings: {
        foreground: '#0C7270',
      },
    },
    {
      name: 'Pug: Punctuation',
      scope: [
        'constant.name.attribute.tag.pug',
      ],
      settings: {
        foreground: '#a2447b',
      },
    },

    // Volar Overrides
    {
      name: 'Volar: <style> tag',
      scope: 'entity.name.tag.style.html',
      settings: {
        foreground: '#0C7270',
      },
    },

    // Wasm Overrides
    {
      name: 'Wasm: Types',
      scope: 'entity.name.type.wasm',
      settings: {
        foreground: '#0C7270',
      },
    },
  ],
  colors: {
    ...(baseTheme as any).colors,
    'editor.background': '#f8fafc',
    'editor.foreground': '#1f2937',
    'editor.lineHighlightBackground': '#f8fafc',
    'editor.lineHighlightBorder': '#efefef',
    'editor.selectionBackground': '#0C727022',

    'editorBracketHighlight.foreground1': '#B1403C',
    'editorBracketHighlight.foreground2': '#066C9F',
    'editorBracketHighlight.foreground3': '#816100',

    'editorLineNumber.activeForeground': '#0C7270',
  },
}

export default customLightTheme

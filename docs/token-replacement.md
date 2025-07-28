# Token Replacement Documentation

dompile provides token replacement primarily for **component parameterization** in DOM mode. This system allows components to accept data through `data-*` attributes and replace placeholders marked with `data-token` attributes.

## Component Token Replacement

### How It Works

Components use `data-token` attributes to mark replaceable content. When included with `<include>` elements, matching `data-*` attributes provide the replacement values.

### Basic Example

**Component: `src/.components/card.html`**
```html
<div class="card">
  <h3 data-token="title">Default Title</h3>
  <p data-token="content">Default content</p>
  <a href="#" data-token="link">Default Link</a>
</div>
```

**Page using component:**
```html
<body data-layout="layouts/default.html">
  <include src="/.components/card.html"
           data-title="My Custom Title"
           data-content="This is custom content for the card"
           data-link="/learn-more">
</body>
```

**Result:**
```html
<div class="card">
  <h3>My Custom Title</h3>
  <p>This is custom content for the card</p>
  <a href="#">/learn-more</a>
</div>
```

### Token Attribute Mapping

- `data-token="fieldname"` in component → replaced by `data-fieldname` value from include
- Token names are case-sensitive and must match exactly
- Missing data attributes leave original content unchanged

## Layout Variable Substitution (Limited)

### Frontmatter Variables in Layouts

**Markdown with frontmatter:**
```markdown
---
title: "My Blog Post" 
author: "Jane Doe"
date: "2024-01-15"
---

# My Blog Post Content
```

**Layout: `src/.layouts/blog.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
</head>
<body>
  <article>
    <h1>{{ title }}</h1>
    <p>By {{ author }} on {{ date }}</p>
    <div class="content">
      {{ content }}
    </div>
  </article>
</body>
</html>
```

### Supported Variables

- `{{ title }}` - From frontmatter or first heading
- `{{ content }}` - Processed markdown content
- `{{ author }}`, `{{ date }}` - Any frontmatter field
- Custom frontmatter fields work with `{{ fieldname }}`

## Limitations

### What's NOT Supported

dompile's token replacement is **intentionally simple**. These advanced features are NOT available:

- **Conditional logic**: `{{#if condition}}` syntax
- **Loops/iteration**: `{{#each items}}` syntax  
- **Filters/pipes**: `{{ title | upper }}` syntax
- **Complex expressions**: `{{ items.length > 0 }}` syntax
- **Built-in functions**: `{{ formatDate() }}` syntax
- **Nested object access**: `{{ author.name }}` syntax

For complex templating needs, generate content at build time or use multiple simple components.

## Integration Examples

### With Components

Token replacement works well with HTML components:

```markdown
---
title: "JavaScript Tutorial"
author: "Jane Doe"
tags: "javascript, tutorial, web development"
---

# {{ title }}

By {{ author }}

Topics: {{ tags }}
```

**Component: `src/components/article-header.html`**
```html
<header class="article-header">
  <h1>{{ title }}</h1>
  <p class="byline">By {{ author }}</p>
  <div class="tags">{{ tags }}</div>
</header>
```

### With Layouts

Combine token replacement with layout systems:

```markdown
---
title: "My Article"
author: "Jane Doe"
date: "2024-01-15"
---

# Article content here...
```

**Layout: `src/.layouts/article.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }} - My Site</title>
</head>
<body>
  <main>
    <h1>{{ title }}</h1>
    <p>By {{ author }} on {{ date }}</p>
    <div class="content">
      {{ content }}
    </div>
  </main>
</body>
</html>
```

## Context and Scope

### Page Context

Variables are scoped to the current page and include:
- Page frontmatter
- Global configuration
- Built-in variables

```markdown
---
title: "Page Title"
local_var: "Page-specific value"
---

{{ title }}      <!-- "Page Title" -->
{{ local_var }}  <!-- "Page-specific value" -->
{{ content }}    <!-- Processed markdown content -->
```

### Include Context

Includes have access to the including page's variables:

**Page: `src/blog/post.md`**
```markdown
---
title: "My Blog Post"
author: "Jane Doe"
---

<!--#include virtual="/.components/post-header.html" -->

# Blog content here
```

**Include: `src/.components/post-header.html`**
```html
<header class="post-header">
  <h1>{{ title }}</h1>
  <p class="author">By {{ author }}</p>
</header>
```

### Layout Context

Layouts receive all page variables plus content:

**Page: `src/about.md`**
```markdown
---
title: "About Us"
layout: default
company: "Acme Corp"
---

# About {{ company }}
```

**Layout: `src/.layouts/default.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }} - {{ company }}</title>
</head>
<body>
  {{ content }}
</body>
</html>
```

## Data Types and Conversion

### Supported Types

| Type | Example | Usage |
|------|---------|-------|
| String | `"Hello World"` | `{{ greeting }}` |
| Number | `42`, `3.14` | `{{ count }}`, `{{ price }}` |
| Boolean | `true`, `false` | `{{#if published}}` |
| Array | `["a", "b", "c"]` | `{{#each items}}` |
| Object | `{name: "value"}` | `{{ obj.name }}` |
| Date | `"2024-01-15"` | `{{ date }}` |

### Type Conversion

Variables are converted as needed:

```markdown
---
count: 42
price: 29.99
published: true
date: "2024-01-15"
---

<!-- Number to string -->
<p>There are {{ count }} items</p>

<!-- Boolean in conditional -->
{{#if published}}
<p>This post is published</p>
{{/if}}

<!-- Date formatting -->
<time>{{ date }}</time>
```

## Security Considerations

### HTML Escaping

By default, variables are HTML-escaped for security:

```markdown
---
user_content: "<script>alert('xss')</script>"
safe_content: "Normal text"
---

<!-- Escaped automatically -->
<p>{{ user_content }}</p>
<!-- Renders as: <p>&lt;script&gt;alert('xss')&lt;/script&gt;</p> -->

<!-- Raw HTML (use carefully) -->
<div>{{{ trusted_html }}}</div>
```

### Input Validation

Validate frontmatter data to prevent issues:

```markdown
---
# Good practices
title: "Valid Title"
count: 42
tags: ["web", "javascript"]

# Potentially problematic
# script_content: "<script>..."  # Avoid inline scripts
# external_url: "javascript:..."  # Validate URLs
---
```

## Performance Optimization

### Variable Caching

Variables are resolved once per page build:

- **Frontmatter**: Parsed once per file
- **Global variables**: Resolved at build start
- **Built-in variables**: Computed once per page

### Build Performance

Optimize token replacement performance:

```html
<!-- Efficient: Simple variable access -->
{{ title }}
{{ author.name }}

<!-- Less efficient: Complex expressions -->
{{ posts | filter: "published" | sort: "date" | first.title }}
```

## Debugging and Troubleshooting

### Common Issues

**Variable not replaced:**
```html
<!-- Check spelling and case -->
{{ titel }}  <!-- Wrong: should be {{ title }} -->

<!-- Check variable exists in frontmatter -->
{{ missing_var }}  <!-- Will render as empty string -->

<!-- Check syntax -->
{ title }  <!-- Wrong: needs double braces {{ title }} -->
```

**Unexpected output:**
```html
<!-- HTML entities -->
{{ content_with_html }}  <!-- May be escaped -->

<!-- Type conversion -->
{{ number_as_string }}  <!-- May need explicit conversion -->
```

### Debug Mode

Enable detailed variable resolution:

```bash
# Show variable resolution steps
DEBUG=1 dompile build

# Check processed output
dompile build --source src --output debug-dist
cat debug-dist/page.html | grep -C 3 "variable-name"
```

### Variable Inspector

Check available variables in templates:

```html
<!-- Debug: List all variables -->
<pre>
{{#each this}}
{{ @key }}: {{ . }}
{{/each}}
</pre>

<!-- Debug: Check specific variable -->
{{#if title}}
Title exists: {{ title }}
{{else}}
Title is missing
{{/if}}
```

## Integration Examples

### Blog System

Complete blog setup with token replacement:

**Post template: `posts/my-post.md`**
```markdown
---
title: "Getting Started with dompile"
author: "Jane Doe"
date: "2024-01-15"
tags: ["tutorial", "static-site"]
excerpt: "Learn how to build static sites with dompile"
reading_time: 5
---

# {{ title }}

{{ excerpt }}

Main content here...
```

**Blog layout: `.layouts/blog.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }} - My Blog</title>
  <meta name="description" content="{{ excerpt }}">
  <meta name="author" content="{{ author }}">
</head>
<body>
  <article>
    <header>
      <h1>{{ title }}</h1>
      <div class="meta">
        <span class="author">By {{ author }}</span>
        <time datetime="{{ date }}">{{ date | date: "MMMM DD, YYYY" }}</time>
        <span class="reading-time">{{ reading_time }} min read</span>
      </div>
    </header>
    
    <div class="content">
      {{ content }}
    </div>
    
    <footer class="tags">
      {{#each tags}}
      <span class="tag">{{ . }}</span>
      {{/each}}
    </footer>
  </article>
</body>
</html>
```

### E-commerce Product Pages

Product page with structured data:

```markdown
---
title: "Widget Pro 3000"
price: 299.99
currency: "USD"
sku: "WIDGET-3000"
in_stock: true
features:
  - "High-quality materials"
  - "1-year warranty"
  - "Free shipping"
specifications:
  weight: "2.5 lbs"
  dimensions: "10x8x3 inches"
  color: "Black"
---

# {{ title }}

Price: {{ currency }} {{ price }}
SKU: {{ sku }}

{{#if in_stock}}
<button class="buy-now">Buy Now</button>
{{else}}
<p class="out-of-stock">Out of Stock</p>
{{/if}}

## Features
{{#each features}}
- {{ . }}
{{/each}}

## Specifications
{{#each specifications}}
**{{ @key }}**: {{ . }}
{{/each}}
```

## See Also

- [Layout System Documentation](layouts-slots-templates.md)
- [Include System Documentation](include-syntax.md)
- [Template Elements in Markdown](template-elements-in-markdown.md)
- [Getting Started Guide](getting-started.md)
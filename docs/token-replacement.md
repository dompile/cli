# Token Replacement Documentation

dompile provides a simple but powerful token replacement system that allows you to insert dynamic content into your templates and pages using `{{ variable }}` syntax.

## Basic Syntax

### Simple Variables

Replace content with variables using double curly braces:

```html
<h1>{{ title }}</h1>
<p>Published on {{ date }} by {{ author }}</p>
<meta name="description" content="{{ description }}">
```

### Case Sensitivity

Variable names are case-sensitive:

```html
{{ title }}    <!-- Different from -->
{{ Title }}    <!-- or -->
{{ TITLE }}
```

### Whitespace Handling

Spaces around variable names are ignored:

```html
{{ title }}      <!-- Same as -->
{{title}}        <!-- and -->
{{  title  }}
```

## Variable Sources

### Frontmatter Variables

YAML frontmatter in markdown files provides the primary source of variables:

```markdown
---
title: "My Blog Post"
author: "Jane Doe"
date: "2024-01-15"
description: "A comprehensive guide to token replacement"
tags: ["tutorial", "documentation"]
custom_field: "Any value you need"
---

# {{ title }}

Written by {{ author }} on {{ date }}.

{{ description }}
```

### Built-in Variables

dompile provides several built-in variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ content }}` | Main content (markdown converted to HTML) | Full article content |
| `{{ title }}` | Page title (from frontmatter or first heading) | "My Blog Post" |
| `{{ excerpt }}` | Page excerpt (from frontmatter or first paragraph) | "A comprehensive guide..." |
| `{{ tableOfContents }}` | Auto-generated table of contents | HTML list of headings |

### Global Variables

Pass global variables to the build process:

```bash
# Command line (future feature)
dompile build --var site_name="My Site" --var year=2024

# Environment variables
SITE_NAME="My Site" YEAR=2024 dompile build
```

### Nested Object Variables

Access nested data from frontmatter:

```markdown
---
author:
  name: "Jane Doe"
  email: "jane@example.com"
  bio: "Tech writer and developer"
site:
  name: "My Blog"
  url: "https://myblog.com"
---

# {{ site.name }}

By {{ author.name }} ({{ author.email }})

{{ author.bio }}
```

## Advanced Features

### Conditional Replacement

Use conditional logic with variables:

```html
<!-- Simple conditional -->
{{#if author}}
<p>By {{ author }}</p>
{{/if}}

<!-- Conditional with else -->
{{#if description}}
<meta name="description" content="{{ description }}">
{{else}}
<meta name="description" content="Default description">
{{/if}}

<!-- Multiple conditions -->
{{#if author}}
  {{#if date}}
  <p>By {{ author }} on {{ date }}</p>
  {{else}}
  <p>By {{ author }}</p>
  {{/if}}
{{/if}}
```

### Array Iteration

Loop through arrays in frontmatter:

```markdown
---
tags: ["javascript", "tutorial", "web development"]
categories: 
  - "Programming"
  - "Frontend"
  - "Tutorials"
related_posts:
  - title: "First Post"
    url: "/posts/first"
  - title: "Second Post"
    url: "/posts/second"
---

<!-- Simple array -->
<div class="tags">
{{#each tags}}
  <span class="tag">{{ . }}</span>
{{/each}}
</div>

<!-- Array of objects -->
<ul class="related">
{{#each related_posts}}
  <li><a href="{{ url }}">{{ title }}</a></li>
{{/each}}
</ul>

<!-- Categories with index -->
<ol class="categories">
{{#each categories}}
  <li class="category-{{ @index }}">{{ . }}</li>
{{/each}}
</ol>
```

### String Operations

Apply transformations to variables:

```html
<!-- Uppercase/lowercase -->
<h1>{{ title | upper }}</h1>
<p>{{ author | lower }}</p>

<!-- Date formatting -->
<time datetime="{{ date }}">{{ date | date: "MMMM DD, YYYY" }}</time>

<!-- String truncation -->
<p>{{ description | truncate: 150 }}</p>

<!-- URL slugification -->
<a href="/posts/{{ title | slug }}">{{ title }}</a>
```

### Default Values

Provide fallback values for missing variables:

```html
<!-- Default value syntax -->
<h1>{{ title | default: "Untitled Post" }}</h1>
<p>By {{ author | default: "Anonymous" }}</p>
<meta name="description" content="{{ description | default: site.description }}">

<!-- Alternative syntax -->
<h1>{{ title || "Untitled Post" }}</h1>
<p>{{ excerpt || "No excerpt available" }}</p>
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
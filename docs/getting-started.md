# Getting Started with unify

This guide will walk you through creating your first unify site and understanding the core concepts.

## Installation

### Global Installation (Recommended)

```bash
npm install -g @unify/cli
```

### Or use with npx

```bash
npx @unify/cli --help
```

## Your First Site

### 1. Create Project Structure

```bash
mkdir my-site
cd my-site

# Create source directory
mkdir -p src/.components src/.layouts
```

### 2. Create a Layout

Create `src/.layouts/default.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
  <meta name="description" content="{{ description }}">
</head>
<body>
  <!--#include virtual="/.components/header.html" -->
  <main>
    {{ content }}
  </main>
  <!--#include virtual="/.components/footer.html" -->
</body>
</html>
```

### 3. Create Components

Create `src/.components/header.html`:

```html
<header>
  <nav>
    <h1>My Site</h1>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about.html">About</a></li>
    </ul>
  </nav>
</header>
```

Create `src/.components/footer.html`:

```html
<footer>
  <p>&copy; 2024 My Site. Built with dompile.</p>
</footer>
```

### 4. Create Pages

Create `src/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Welcome - My Site</title>
</head>
<body>
  <!--#include virtual="/.components/header.html" -->
  <main>
    <h1>Welcome to My Site</h1>
    <p>This is the home page built with dompile.</p>
  </main>
  <!--#include virtual="/.components/footer.html" -->
</body>
</html>
```

Create `src/about.md`:

```markdown
---
title: "About Us"
description: "Learn more about our company"
layout: default
---

# About Us

This page demonstrates markdown with frontmatter and layout integration.

## Features

- Markdown processing with layout
- Frontmatter metadata
- Include processing within markdown

<!--#include virtual="/.components/contact-form.html" -->
```

### 5. Build and Serve

```bash
# Build the site
dompile build

# Start development server
dompile serve
```

Visit `http://localhost:3000` to see your site!

## Core Concepts

### Include System

dompile uses Apache SSI syntax for includes:

- `<!--#include virtual="/path/from/source/root.html" -->`
- `<!--#include file="relative/path.html" -->`

### Layout System


- `{{ title }}` - From frontmatter or page data
- `{{ content }}` - Main content (markdown or HTML)
- `{{ description }}` - SEO description

### File Organization

- **Source directory** (`src/`): Your content and templates
- **Components directory** (`.components/`): Reusable includes
- **Layouts directory** (`.layouts/`): Page templates
- **Output directory** (`dist/`): Generated static site

### Development Workflow

1. **Edit** source files
2. **Auto-rebuild** with file watching
3. **Live reload** in browser
4. **Deploy** static output

## Next Steps

- Read the [Full Documentation](../README.md)
- Explore [Advanced Features](advanced-features.md)
- Check out [Example Projects](../example/)
- Learn about [Docker Deployment](docker-usage.md)

## Common Patterns

### Blog Setup

```
src/
├── .layouts/
│   ├── default.html
│   └── blog-post.html
├── .components/
│   ├── header.html
│   ├── footer.html
│   └── blog-nav.html
├── posts/
│   ├── 2024-01-01-first-post.md
│   └── 2024-01-02-second-post.md
├── index.html
└── blog.html
```

### Multi-page Site

```
src/
├── .layouts/default.html
├── .components/
│   ├── nav.html
│   └── footer.html
├── pages/
│   ├── about.md
│   ├── services.html
│   └── contact.html
├── assets/
│   ├── css/style.css
│   └── images/
└── index.html
```

### Component-based

```
src/
├── .components/
│   ├── hero-section.html
│   ├── feature-card.html
│   ├── testimonial.html
│   └── call-to-action.html
├── pages/
└── index.html
```
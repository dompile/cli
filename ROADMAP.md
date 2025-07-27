# dompile Roadmap

This document outlines the development roadmap for dompile, showing completed features, current work, and future plans.

## ✅ Completed (v0.4)

### Core Features
- **Apache SSI includes** with dependency tracking and circular reference detection
- **Markdown processing** with YAML frontmatter support and layout system
- **Live reload development server** with Server-Sent Events and file watching
- **Incremental builds** with smart dependency tracking and asset optimization
- **Automatic sitemap generation** with SEO optimization
- **Pretty URL support** for clean URLs (about.md → about/index.html)
- **Docker containerization** with Apache, Nginx, and CLI containers

### Advanced Features  
- **DOM Mode**: Modern `<template>` and `<slot>` syntax for component-based templating
- **Template inheritance** with layout composition and slot filling
- **Token replacement** with frontmatter variable substitution
- **Security model** with path traversal prevention and input validation
- **Asset tracking** that only copies referenced files
- **Cross-platform support** for Node.js, Deno, and Bun

### Developer Experience
- **CLI interface** with comprehensive options and help system
- **Error handling** with detailed error messages and suggestions
- **Logging system** with configurable levels and debug mode
- **File watching** with debounced rebuilds and change detection
- **ESM modules** with native ES module support throughout

## ✅ Recent Improvements (v0.4.1)

### Code Quality & Usability
- **Removed automatic head injection** - users now control head content through includes
- **Fixed layout usage logic** - improved conditional layout application
- **Default build command** - CLI now defaults to build when no command specified  
- **Short argument flags** - added `-c` for components and `-l` for layouts
- **Template path resolution** - fixed bugs with slot and include interactions
- **Package.json integration** - automatically uses homepage field for sitemap baseUrl

### Documentation
- **Comprehensive Docker guide** covering all three container types
- **Template elements in markdown** documentation with practical examples
- **Architecture documentation** updates reflecting current implementation
- **API documentation** improvements with better examples

## 🚧 In Progress (v0.5)

### Core Refinements
- **Layout system improvements** - better frontmatter layout selection
- **Slot processing enhancements** - fix remaining template slot issues  
- **Test coverage expansion** - add tests for new features and edge cases
- **Performance optimizations** - profile and optimize build times
- **Error message improvements** - better context and actionable suggestions

### Developer Experience  
- **Enhanced CLI help** - more detailed documentation and examples
- **Better debugging tools** - improved error reporting and troubleshooting
- **Configuration file support** - .dompilerc for project settings
- **Plugin system foundation** - extensibility framework for custom processors

## 🔮 Future (v0.6+)

### SEO and Performance
- **Canonical URL generation** with intelligent link rewriting
- **Enhanced SEO features** including Open Graph and JSON-LD structured data
- **Performance optimization** with asset minification and compression
- **Dead link detection** with broken link reporting and validation
- **Image optimization** with automatic resizing and format conversion

### Advanced Templating
- **Component system** with reusable components and data binding
- **Advanced template inheritance** with layout chaining and composition
- **Conditional rendering** with enhanced logic in templates
- **Data sources** for dynamic content from APIs and databases
- **Internationalization** support for multi-language sites

### Developer Tools
- **IDE extensions** for better development experience
- **Build analytics** with performance insights and optimization suggestions
- **Visual editor** for content management and template design
- **Deploy integrations** with popular hosting platforms
- **Advanced watch mode** with selective rebuilding and intelligent caching

### Enterprise Features
- **Multi-site management** for large organizations
- **Theme system** with shared layouts and components across sites
- **Content validation** with schema checking and lint rules
- **Asset pipeline** with advanced preprocessing and optimization
- **Headless CMS integration** for content management workflows

## 🎯 Version Goals

### v0.5 Goals (Q3 2024)
- Stabilize template and layout systems
- Comprehensive test coverage
- Performance benchmarking and optimization  
- Configuration file support
- Enhanced documentation

### v0.6 Goals (Q4 2024)
- SEO feature complete
- Component system MVP
- Performance optimizations
- IDE extension (VS Code)
- Plugin system architecture

### v0.7 Goals (Q1 2025)
- Visual editor MVP
- Advanced templating features
- Deploy integrations
- Enterprise features planning
- Multi-language support

## 🤝 Contributing to the Roadmap

We welcome community input on our roadmap! Here's how you can contribute:

### Feedback Channels
- **GitHub Issues**: Report bugs, request features, or suggest improvements
- **GitHub Discussions**: Share ideas, ask questions, or discuss architectural decisions
- **Pull Requests**: Contribute code, documentation, or examples

### Priority Guidelines
1. **Stability**: Bug fixes and core feature stability take priority
2. **User Experience**: Developer experience improvements are highly valued
3. **Performance**: Build speed and runtime performance optimizations
4. **Standards**: Following web standards and best practices
5. **Documentation**: Clear, comprehensive documentation for all features

### Feature Request Process
1. **Check existing issues** to avoid duplicates
2. **Describe the use case** and problem being solved
3. **Provide examples** of how the feature would be used
4. **Consider alternatives** and explain why this approach is best
5. **Offer to contribute** if you're able to help implement

## 📊 Success Metrics

We track these metrics to measure our progress:

- **Build Performance**: Sub-second builds for typical sites
- **Developer Experience**: Time from project start to first deploy
- **Stability**: Zero critical bugs in stable releases
- **Adoption**: Growing community and real-world usage
- **Documentation**: Complete coverage of all features

---

*This roadmap is a living document that evolves based on community feedback and changing requirements. Dates are estimates and may shift based on development priorities.*
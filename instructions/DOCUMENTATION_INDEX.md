# Documentation Index

Complete guide to all documentation in this repository.

## 📚 Core Documentation

### [README.md](README.md)
**For:** End users  
**Purpose:** Getting started guide, basic usage, and feature overview  
**Contents:**
- Project overview
- Installation instructions
- Basic usage examples
- Available options and models
- Quick examples

### [.cursor/rules.md](.cursor/rules.md)
**For:** AI coding agents (Cursor, GitHub Copilot, etc.)  
**Purpose:** Comprehensive project guidelines for automated coding assistance  
**Contents:**
- Project architecture and structure
- Development workflows
- Testing procedures
- Common tasks and commands
- Code style and best practices
- External resources

## 🛠️ Development Documentation

### [DEVELOPMENT.md](DEVELOPMENT.md)
**For:** Developers contributing to the project  
**Purpose:** Detailed development guide  
**Contents:**
- First-time setup
- Project structure explanation
- Common development workflows
- Testing strategies
- Troubleshooting during development
- Contributing guidelines
- Future roadmap (server component)

### [QUICKREF.md](QUICKREF.md)
**For:** All users (developers and end users)  
**Purpose:** Quick reference card for common commands and options  
**Contents:**
- Essential commands (one-liners)
- All available options (table)
- Common workflows
- File locations
- Model comparison
- Performance tips
- Error solutions summary

### [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
**For:** All users experiencing issues  
**Purpose:** Comprehensive troubleshooting guide  
**Contents:**
- Docker issues
- Runtime problems
- GPU configuration
- File format issues
- Permission problems
- Performance optimization
- Platform-specific issues
- Debugging tips

## 📦 Component Documentation

### [scripts/README.md](scripts/README.md)
**For:** Developers using helper scripts  
**Purpose:** Documentation for development automation scripts  
**Contents:**
- `check-prerequisites.sh` - System verification
- `validate.sh` - End-to-end testing
- `clean.sh` - Cleanup utilities
- Script usage examples
- Integration with Makefile

### [server/README.md](server/README.md)
**For:** Developers building the web server component  
**Purpose:** Detailed design and implementation guide for the planned server  
**Contents:**
- Architecture design
- API specification
- Socket.IO event design
- Implementation guidelines
- Security considerations
- Testing checklist
- Deployment guide

## 🐛 Issue Templates

### [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md)
**For:** Users reporting bugs  
**Purpose:** Structured bug report template  

### [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md)
**For:** Users suggesting features  
**Purpose:** Structured feature request template  

### [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)
**For:** Contributors submitting code  
**Purpose:** Pull request checklist and description template  

## 📋 Quick Navigation

### I want to...

**Get started quickly**
→ [README.md](README.md) → [QUICKREF.md](QUICKREF.md)

**Develop on this project**
→ [DEVELOPMENT.md](DEVELOPMENT.md) → [.cursor/rules.md](.cursor/rules.md)

**Fix a problem**
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md) → [scripts/README.md](scripts/README.md)

**Build the web server**
→ [server/README.md](server/README.md) → [DEVELOPMENT.md](DEVELOPMENT.md)

**Use helper scripts**
→ [scripts/README.md](scripts/README.md) → [QUICKREF.md](QUICKREF.md)

**Understand the AI agent rules**
→ [.cursor/rules.md](.cursor/rules.md)

**Report a bug**
→ [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md)

**Request a feature**
→ [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md)

**Submit code**
→ [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)

## 📊 Documentation Structure

```
demucs/
├── README.md                          # User guide
├── DEVELOPMENT.md                     # Developer guide
├── QUICKREF.md                        # Quick reference
├── TROUBLESHOOTING.md                 # Problem solving
├── DOCUMENTATION_INDEX.md             # This file
│
├── .cursor/
│   ├── init.md                       # Initial instructions (one-time)
│   └── rules.md                      # AI agent guidelines
│
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md      # PR template
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md             # Bug report template
│       └── feature_request.md        # Feature request template
│
├── scripts/
│   └── README.md                     # Scripts documentation
│
└── server/
    └── README.md                     # Server design guide
```

## 🎯 Documentation by Role

### End User
1. [README.md](README.md) - Start here
2. [QUICKREF.md](QUICKREF.md) - Keep handy
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - When issues arise

### Developer (Human)
1. [DEVELOPMENT.md](DEVELOPMENT.md) - Start here
2. [.cursor/rules.md](.cursor/rules.md) - Understand the architecture
3. [scripts/README.md](scripts/README.md) - Use helper tools
4. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Debug issues
5. [QUICKREF.md](QUICKREF.md) - Quick command reference

### Developer (AI Agent)
1. [.cursor/rules.md](.cursor/rules.md) - Primary guide
2. [DEVELOPMENT.md](DEVELOPMENT.md) - Detailed workflows
3. [server/README.md](server/README.md) - Server implementation guide
4. All other docs as needed

### Contributor
1. [DEVELOPMENT.md](DEVELOPMENT.md) - Understand the project
2. [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) - Submit code
3. [.cursor/rules.md](.cursor/rules.md) - Follow guidelines
4. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Debug your changes

## 🔍 Finding Information

### By Topic

**Installation & Setup**
- [README.md](README.md) - Basic installation
- [DEVELOPMENT.md](DEVELOPMENT.md) - Developer setup
- [scripts/README.md](scripts/README.md) - check-prerequisites.sh

**Usage**
- [README.md](README.md) - Basic usage
- [QUICKREF.md](QUICKREF.md) - All commands and options
- [.cursor/rules.md](.cursor/rules.md) - Detailed workflows

**Configuration**
- [README.md](README.md) - Available options
- [QUICKREF.md](QUICKREF.md) - Options table
- [.cursor/rules.md](.cursor/rules.md) - Makefile details

**Troubleshooting**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - All issues
- [QUICKREF.md](QUICKREF.md) - Quick solutions
- [scripts/README.md](scripts/README.md) - Diagnostic tools

**Architecture**
- [.cursor/rules.md](.cursor/rules.md) - Complete architecture
- [DEVELOPMENT.md](DEVELOPMENT.md) - Code organization
- [server/README.md](server/README.md) - Server design

**Testing**
- [.cursor/rules.md](.cursor/rules.md) - Testing strategy
- [DEVELOPMENT.md](DEVELOPMENT.md) - Testing workflows
- [scripts/README.md](scripts/README.md) - validate.sh

**Contributing**
- [DEVELOPMENT.md](DEVELOPMENT.md) - Guidelines
- [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) - PR checklist
- [.cursor/rules.md](.cursor/rules.md) - Code standards

## 📝 Documentation Standards

All documentation in this repository follows these principles:

1. **Clear Structure:** Headers, lists, code blocks
2. **Examples:** Real, working examples for all commands
3. **Cross-References:** Links to related documentation
4. **Troubleshooting:** Common issues included inline
5. **Version Info:** Last updated dates where relevant
6. **Audience:** Clear indication of target audience
7. **Completeness:** No assumptions about prior knowledge

## 🔄 Keeping Documentation Updated

When making changes:

1. **Code Changes:** Update [.cursor/rules.md](.cursor/rules.md) if architecture changes
2. **New Features:** Update [README.md](README.md) and [QUICKREF.md](QUICKREF.md)
3. **New Scripts:** Update [scripts/README.md](scripts/README.md)
4. **Bug Fixes:** Add to [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if user-facing
5. **API Changes:** Update [server/README.md](server/README.md)
6. **Process Changes:** Update [DEVELOPMENT.md](DEVELOPMENT.md)

## 🌐 External Resources

- [Demucs Official Documentation](https://github.com/adefossez/demucs)
- [Docker Documentation](https://docs.docker.com/)
- [NVIDIA Container Toolkit](https://github.com/NVIDIA/nvidia-container-toolkit)
- [Flask-SocketIO](https://flask-socketio.readthedocs.io/)

## 💡 Tips

- **Print [QUICKREF.md](QUICKREF.md)** and keep it at your desk
- **Bookmark this index** for quick navigation
- **Search across all docs** with: `grep -r "search term" *.md`
- **Use `make help`** to see available commands
- **Run `make check`** before starting work
- **Keep docs open** while working - they're designed as reference material

---

**Questions?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or file an issue using the templates in `.github/ISSUE_TEMPLATE/`

**Last Updated:** 2025-10-26


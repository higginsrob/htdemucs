# Pull Request

## Description

Please include a summary of the changes and which issue is fixed. Include relevant motivation and context.

Fixes # (issue)

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Infrastructure/DevOps change

## Component

- [ ] CLI Tool (`demucs/`)
- [ ] Web Server (`server/`)
- [ ] Build/Deployment (Dockerfile, Makefile)
- [ ] Documentation
- [ ] Development Tools (scripts)

## Testing Checklist

- [ ] `make build` completes without errors
- [ ] `make validate` passes all checks
- [ ] Tested on CPU mode
- [ ] Tested on GPU mode (if applicable)
- [ ] Documentation updated
- [ ] No linter errors

## CLI Tool Checklist (if applicable)

- [ ] Docker image builds successfully
- [ ] Model downloads correctly
- [ ] Audio processing completes
- [ ] All 4 stems are generated
- [ ] Output files are valid audio
- [ ] Volume mounts work correctly

## Server Checklist (if applicable)

- [ ] Server starts without errors
- [ ] Upload endpoint works
- [ ] Socket.IO progress works
- [ ] Download endpoint returns valid zip
- [ ] File cleanup works
- [ ] Multiple concurrent jobs work

## Screenshots (if applicable)

Add screenshots to help explain your changes.

## Additional Notes

Add any other context about the pull request here.

---

**For Reviewers:**
- Check `.cursor/rules.md` for project guidelines
- Run `make check` to verify prerequisites
- Run `make validate` to test end-to-end


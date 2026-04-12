# Changelog

## v2.5.2 (2026-04-12)

c705189 Merge pull request #1 from elixpo/feat/package
d5aeb07 release: v2.5.1
3bbb800 feat: enhance release process with detailed build and publish steps for lixeditor
d09bb85 feat: simplify changelog generation to list recent commits
91e229e updated version patch number
a16a7bf updated the release versions
980ef26 updated the deploy.sh to sync github and npm
fd36ceb updated the chore of the deploy to update npm too
3f02499 fix: update GITHUB_ACCESS_TOKEN description in deploy script
bf06094 feat: update release targets in deploy script to include editor
bafa9ed dummy alterations
8a1a20c feat: add loader configuration for JSX files in ESM and CJS builds
780bdc2 created the  build file and installted esbuild package
83411b7 updated version number patch for the package
dd7d8f7 feat: enhance logout functionality and draft saving mechanism in AuthContext and WritePage
68c039b feat: implement custom link editor popup in BlogEditor
ee0eeb6 feat: add state management for link editor in BlogEditor
dcba07f feat: improve event listener handling for Ctrl+K shortcut in BlogEditor
93eaeb4 feat: enhance link handling in BlogEditor with auto-conversion and Ctrl+K shortcut
16a9219 feat: enhance create link button styling and popover design in BlogEditor

# Changelog

## v2.5.1 (2026-04-12)

3bbb800 feat: enhance release process with detailed build and publish steps for lixeditor
d09bb85 feat: simplify changelog generation to list recent commits
91e229e updated version patch number
a16a7bf updated the release versions
980ef26 updated the deploy.sh to sync github and npm
fd36ceb updated the chore of the deploy to update npm too
3f02499 fix: update GITHUB_ACCESS_TOKEN description in deploy script
bf06094 feat: update release targets in deploy script to include editor
bafa9ed dummy alterations
8a1a20c feat: add loader configuration for JSX files in ESM and CJS builds
780bdc2 created the  build file and installted esbuild package
83411b7 updated version number patch for the package
dd7d8f7 feat: enhance logout functionality and draft saving mechanism in AuthContext and WritePage
68c039b feat: implement custom link editor popup in BlogEditor
ee0eeb6 feat: add state management for link editor in BlogEditor
dcba07f feat: improve event listener handling for Ctrl+K shortcut in BlogEditor
93eaeb4 feat: enhance link handling in BlogEditor with auto-conversion and Ctrl+K shortcut
16a9219 feat: enhance create link button styling and popover design in BlogEditor
037e5dd feat: remove auto-embedding of bare image URLs in BlogEditor and enhance code element styling
0c8bcbe feat: update Blog Image Block styles for improved UI consistency and accessibility

# Changelog

## v2.2.0 (2026-04-12)

### Features
- update release targets in deploy script to include editor
- add loader configuration for JSX files in ESM and CJS builds
- enhance logout functionality and draft saving mechanism in AuthContext and WritePage
- implement custom link editor popup in BlogEditor
- add state management for link editor in BlogEditor
- improve event listener handling for Ctrl+K shortcut in BlogEditor
- enhance link handling in BlogEditor with auto-conversion and Ctrl+K shortcut
- enhance create link button styling and popover design in BlogEditor
- remove auto-embedding of bare image URLs in BlogEditor and enhance code element styling
- update Blog Image Block styles for improved UI consistency and accessibility
- update Blog Image Block styles for improved UI consistency and accessibility
- enhance LinkPreviewTooltip with configurable endpoint and improve BlogImageBlock error handling
- enhance BlogEditor and LixEditor to auto-convert image and link syntax as you type
- refactor BlogImageBlock to improve rendering, upload handling, and embed URL functionality
- enhance BlogEditor to disable spellcheck for inline code elements
- refactor imports to use local LinkPreviewTooltip and custom block components
- add configurable link preview endpoint and export setter function
- enhance BlogImageBlock with improved rendering and styling for image uploads and embeds
- update import for ImageBlock to BlogImageBlock in LixEditor component
- rename package from @lixblogs/editor to @elixpo/lixeditor and update references
- update package-lock.json to include @lixblogs/editor and version bump
- add README and block styles for LixEditor components
- add base styles for LixEditor and link preview tooltip
- add index.js and index.css for core editor components and styles
- add LinkPreviewTooltip and LixEditor components for enhanced link previews
- add ELIXPO_SEARCH_API_KEY to environment config and update AI endpoint requests to use Bearer auth
- update FeedCard and HandlePage image styles for improved layout
- enhance FeedCard styling and add read time display
- enhance TopPickCard with gradient backgrounds and read time display
- add sync command to deploy script for D1 synchronization
- add D1 sync functionality to deploy process
- enhance AI prompts and selection highlighting for improved user experience
- simplify redirect URI handling in authentication flows
- update deploy script and cron worker for consistent naming and conditional deployment
- reorder commands in 'all' option for deploy script
- update OAuth redirect URI handling to be dynamic per request
- add cron configuration and worker for weekly digest emails
- implement email notifications for account actions and add weekly digest cron job
- add email templates for account disable and login alert notifications
- add account status check to prevent login for permanently deleted accounts
- implement account disable and delete functionality with confirmation modals
- enhance OrganizationTab with visibility icons and add UsageMeter component for subscription details
- extend user profile with additional fields and implement profile update functionality
- enhance organization profile management with location, timezone, and contact details
- **AISelectionToolbar.jsx, ai.css, base.css**: enhance AI editing experience with inline diff display and improved color handling
- **base.css**: enhance color handling for BlockNote attributes with inline color and background mappings
- **BlogEditor.jsx, base.css**: enhance AI block styling and ensure consistent height for editor elements
- **prompts.js, BlogEditor.jsx, WritePage.jsx, ai.css, base.css**: enhance AI title handling and improve styling for AI-generated content
- **package.json, package-lock.json**: add framer-motion dependency for enhanced animations
- **prompts.js**: enhance Markdown formatting guidelines for clarity and visual variety in writing prompts
- **prompts.js**: enhance Markdown formatting guidelines for improved clarity and structure
- **AISelectionToolbar, BlogEditor**: prevent default behavior on color and highlight buttons; enforce color styling for AI-generated content
- **AISelectionToolbar, menus.css**: add color and highlight buttons with popover functionality
- **BlogEditor**: hide sparkle cursor after AI content generation and adjust highlight behavior
- **BlogEditor, ai.css**: refine AI cursor behavior and styling for improved visibility and performance
- **BlogEditor, AISelectionToolbar, WritePage, ai.css**: enhance AI context handling and improve UI responsiveness
- enhance image compression utility and improve AI prompt formatting
- **BlogEditor**: reset AI phase to 'idle' after generating content
- **BlogEditor**: add AI phase state management for improved AI interaction
- **BlogEditor, ai.css**: implement fixed AI sparkle star cursor with dynamic positioning and increase cursor sizes
- **BlogEditor, ai.css**: update sparkle star cursor with new styles and positioning
- **BlogEditor**: enhance AI prompt handling for edit mode and improve auto-scroll behavior
- **BlogEditor**: enhance AI block highlighting with immediate glob cursor and smooth scroll to placeholder feat(WritePage): adjust editor container height for better responsiveness
- **BlogEditor, ai.css**: enhance AI block highlighting with animated glob cursor and improved styles
- **BlogPreview, WritePage, base.css**: enhance BlogPreview with cover zoom, position, and user info; add texture background to editor
- **WritePage, base.css**: add cover image toolbar with drag-and-zoom functionality and new styles for toolbar buttons
- **WritePage, base.css**: enhance cover banner with slide-in animation and improve emoji picker styling
- **WritePage, mentions.css**: implement cover upload modal and mention menu styles
- **MentionMenu, OrgMentionInline**: add mention functionality for organizations and enhance mention menu with user, org, and blog search
- enhance AI submission handling with real-time updates and error management
- add AI selection toolbar for enhanced text editing with AI assistance
- implement server-side proxy for Pollinations AI streaming and client-side streaming helper
- add Pollinations AI client with streaming and non-streaming chat completion functions
- remove media item functionality from custom slash menu in BlogEditor
- update placeholder colors in WritePage for improved readability
- update color tokens for improved dark theme readability
- update color scheme for improved dark theme consistency across editor components
- update block specs in BlogEditor to use factory functions for improved schema definition
- add KaTeX overrides and custom block styles for improved equation rendering
- enhance editor with new inline content blocks for mentions, dates, and equations
- add Breadcrumbs block for enhanced navigation in the editor
- add BlockEquation and ButtonBlock components for enhanced editor functionality
- add Table of Contents block to editor with dynamic heading listing
- add katex dependency and update AI command menu for improved functionality
- update routing and links to use '/new-blog' for blog creation
- simplify SubscriptionTab component and update UI for upcoming features
- add Ionicons scripts for enhanced icon support in layout
- enhance StatsPage with user authentication, dynamic charts, and improved layout
- add Stories and StoriesPage components for managing user stories
- add ProfileDropdown component for enhanced user profile interactions and update ProfilePage layout
- implement BlogReader component for dynamic blog page rendering
- enhance layout and styling with custom scrollbar, typography improvements, and new feed card design for better user experience
- update RootLayout component with improved metadata and font loading for enhanced performance
- add custom 404 Not Found page with navigation links for improved user experience
- implement slugid support in WritePage and add BlogReader component for enhanced routing
- enhance WritePage with custom scrollbar styles and update layout for better user experience
- implement emoji picker component and integrate it into WritePage for enhanced user interaction
- add emoji picker functionality to WritePage for enhanced user engagement
- implement auto-save and draft loading for blog editor
- implement blog editing functionality with dynamic slug support and new BlogEditor component
- add OAuth 2.0 integration specification for Elixpo Accounts
featured the script to allow the runtime to expose the backend port
feat : adjusting PFP Upload Controls for Realtime feedback preview
- Add image cropping for blog.elixpo
- Improve callback UI for Google & GitHub OAuth

### Fixes
- update GITHUB_ACCESS_TOKEN description in deploy script
fixed the url resolve for the username and the org name by using @ in the url bar
fixed how the orgs are being shown
fixed table of contnet
fixed the migratin
fixed mermaid render
fixing mermaid render
fix mermaid blocks
fixed text highlight
fix latex render
fixed the detection of the parserf for latex and codeblock
- **WritePage**: update title input to textarea for better UX and auto-resizing style(preview.css): adjust heading font sizes to fixed pixel values for consistency
- **editor.css**: adjust heading font sizes for better readability
- update redirect_uri to use NEXT_PUBLIC_URL for consistency across auth pages
- update redirect URI in OAuth config and add Cloudflare integration functions
fixed root routing my solving the issue of index.html missing
fixed the tsconfig
fixed the extension => .tsx .jsx
fixed the community page
fixed the name spaces of the stylesf folder
fixed intro dir route
fixed dir name
fixed the title name
fixed the caching and the HOT RELOAD issue for the custom bundler
fixing the caching of the .ts encoders
fixed the min and max count for the bio of the user
fixed the name regex for the filter to work
fixed the issue of the existing users case and made the frontend connect with the backend
fixed the issue of the name vs bloom filter check
fixed the working of the slider class
fixing fend of the form
fixed the github login + callback & added oauth app logo
fixed the login issue
- update event listener to use handleCallback function
fixed the issue of the callback for google and github
fixed the github login and made the login worker as a micro service
fixed and made the auth callback work with the cookie session

### Other
- updated the chore of the deploy to update npm too
- dummy alterations
- created the  build file and installted esbuild package
- updated version number patch for the package
- Refactor BlogEditor and BlogPreview components to use LinkPreviewTooltip from @elixpo/lixeditor; import core blocks from the same package. Add new styles for Blog Image Block and menus, enhancing UI consistency and functionality.
- renamed the package to use the @elixpo/lixeditor
- Add @lixblogs/editor as local workspace dependency in package.json
- Add BlockEquation component for rendering LaTeX equations with live preview
- Refactor AI toolbar and CSS styles to simplify structure and improve maintainability
- Refactor code structure and remove redundant sections for improved readability and maintainability
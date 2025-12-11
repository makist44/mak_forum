# Design Guidelines for Arraw Tllelli Forum

## Design Approach
**Reference-Based Design** inspired by cracked.to with modern forum aesthetics, emphasizing information density and community engagement.

## Layout System

**Desktop Three-Column Layout:**
- Left Sidebar (fixed): 280px width for category navigation
- Main Content Area: Flexible, max-width of 1200px
- Right Sidebar (fixed): 320px width for trending posts and stats
- Use Tailwind spacing: Primary units of 2, 3, 4, 6, 8 for consistent rhythm

**Mobile Strategy:**
- Stack to single column
- Categories become collapsible hamburger menu
- Right sidebar content moves to bottom or collapses
- Maintain touch-friendly targets (minimum 44px height)

## Typography Hierarchy

**Font Stack:**
- Primary: Inter or System UI stack for optimal French character rendering
- Monospace: JetBrains Mono for code snippets/usernames

**Text Scales:**
- Forum titles: text-2xl font-bold
- Thread titles: text-lg font-semibold
- Post content: text-base leading-relaxed
- Meta info (dates, user counts): text-sm text-muted
- Sidebar headings: text-xs uppercase tracking-wide font-bold

## Core Components

**Thread List (Dense Display):**
- Compact rows with 4px vertical spacing between threads
- Thread row structure: Icon/status | Title | Meta (author, replies, date) | Last activity
- Sticky posts at top with visual indicator
- Pinned threads differentiated with icon
- Read/unread state indicators

**Category Sidebar:**
- Hierarchical list with nested subcategories
- Active category highlighted
- Unread post badges on category items
- Collapsible sections for category groups
- "Makist" (private section) only visible when approved

**Post Cards:**
- User avatar (48px) aligned top-left
- Username, role badge, post date in header
- Content area with generous line-height (1.6)
- Action footer: Reply, Quote, Report, Like buttons
- Nested replies with 32px left indent per level (max 3 levels)

**Right Sidebar Modules:**
- Forum Stats card: Total threads, posts, members, online users
- Trending Posts: Top 5 posts with engagement metrics
- Recent Activity feed
- Module spacing: 6 units between cards

**Moderation Elements:**
- Admin/mod controls appear inline with subtle styling
- Moderation actions dropdown (sticky, lock, delete, move)
- Ban/warning interface within user profile cards
- Moderation log accessible from admin panel

**Invite-Only Section Indicator:**
- "Request Access" button for non-approved users
- Approval pending state with messaging
- Clear visual distinction for private content

## Navigation & Header

**Top Navigation Bar:**
- Height: 64px
- Logo/Title left-aligned
- Search bar centered (expandable on mobile)
- User profile, notifications, settings right-aligned
- Breadcrumb navigation below main nav on content pages

## Form Components

**Thread Creation:**
- Full-width editor with rich text toolbar
- Category selector dropdown
- Title input (prominent, large text)
- Tags input for filtering
- Preview toggle button

**Login/Registration:**
- Centered card layout (max-width 480px)
- Clear form validation messaging
- Password strength indicator
- "Remember me" checkbox
- TOR user friendly (no reCAPTCHA)

## Responsive Breakpoints
- Mobile: < 768px (single column, hamburger menus)
- Tablet: 768px - 1024px (two column, collapsible sidebars)
- Desktop: > 1024px (full three-column layout)

## Animations
Light, purposeful animations only:
- Smooth sidebar collapse/expand (200ms ease)
- Hover state transitions (100ms)
- Notification badge pulse for new content
- Smooth scroll to anchor links

## Accessibility
- Keyboard navigation for all interactive elements
- Focus indicators on all clickable items
- ARIA labels for icon-only buttons
- Screen reader announcements for new posts/replies
- Semantic HTML5 structure (nav, main, aside, article)

## Images
No hero images required. Forum content is text-first. User avatars and optional thread thumbnails only.